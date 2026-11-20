"""Optional isolated CPU adapter for a locally stored Community-1 pipeline."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from threading import Lock
import wave

import numpy as np

from stt.diarization import Region


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_DIR = ROOT / "models" / "community-1"
DEFAULT_TIMEOUT_SECONDS = 1800
DEFAULT_MIN_AVAILABLE_BYTES = 4 * 1024**3


class CommunityError(RuntimeError):
    """A safe, stable error code for the optional local diarizer."""

    def __init__(self, reason_code: str):
        self.reason_code = reason_code
        super().__init__(reason_code)


def available_memory_bytes() -> int | None:
    """Return available physical memory using only the standard library."""
    if os.name == "nt":
        import ctypes

        class MemoryStatusEx(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]
        status = MemoryStatusEx()
        status.dwLength = ctypes.sizeof(status)
        if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
            return None
        return int(status.ullAvailPhys)
    try:
        return int(os.sysconf("SC_AVPHYS_PAGES") * os.sysconf("SC_PAGE_SIZE"))
    except (AttributeError, OSError, ValueError):
        return None


def _default_worker_python() -> Path:
    if os.name == "nt":
        return ROOT / ".venv-community" / "Scripts" / "python.exe"
    return ROOT / ".venv-community" / "bin" / "python"


def _configured_bytes(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default
    return value if value >= 0 else default


class CommunityDiarizer:
    """Run Community-1 in its own offline, CPU-only Python environment."""

    def __init__(self, *, model_dir: str | os.PathLike | None = None,
                 worker_python: str | os.PathLike | None = None, timeout_seconds: int | None = None,
                 min_available_bytes: int | None = None, runner=None, memory_reader=None):
        configured_model = model_dir if model_dir is not None else os.environ.get("STT_COMMUNITY_MODEL_DIR", DEFAULT_MODEL_DIR)
        self.model_dir = Path(configured_model).expanduser().resolve()
        self.worker_python = Path(worker_python).expanduser().resolve() if worker_python else _default_worker_python().resolve()
        self.timeout_seconds = timeout_seconds if timeout_seconds is not None else _configured_bytes(
            "STT_COMMUNITY_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS)
        self.min_available_bytes = min_available_bytes if min_available_bytes is not None else _configured_bytes(
            "STT_COMMUNITY_MIN_AVAILABLE_BYTES", DEFAULT_MIN_AVAILABLE_BYTES)
        self._runner = runner if runner is not None else subprocess.run
        self._memory_reader = memory_reader if memory_reader is not None else available_memory_bytes
        self._lock = Lock()

    def ready(self) -> bool:
        """Return whether the local model and the isolated Python runtime exist."""
        return (self.model_dir.is_dir() and (self.model_dir / "config.yaml").is_file()
                and self.worker_python.is_file())

    def _check_available(self) -> None:
        if not self.model_dir.is_dir() or not (self.model_dir / "config.yaml").is_file():
            raise CommunityError("COMMUNITY_MODEL_MISSING")
        if not self.worker_python.is_file():
            raise CommunityError("COMMUNITY_RUNTIME_MISSING")
        available = self._memory_reader()
        if available is not None and available < self.min_available_bytes:
            raise CommunityError("COMMUNITY_MEMORY_LOW")

    def check_available(self) -> None:
        """Raise a safe setup or memory code when Community-1 cannot run."""
        self._check_available()

    @staticmethod
    def _write_wav(path: Path, samples: np.ndarray) -> None:
        pcm = np.clip(samples, -1.0, 1.0)
        pcm = (pcm * 32767).astype("<i2", copy=False)
        with wave.open(str(path), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(16000)
            output.writeframes(pcm.tobytes())

    @staticmethod
    def _parse_regions(path: Path, duration: float) -> list[Region]:
        try:
            with path.open("r", encoding="utf-8") as source:
                payload = json.load(source)
            if not isinstance(payload, list):
                raise ValueError("invalid regions")
            regions = []
            for item in payload:
                if not isinstance(item, dict) or not {"start", "end", "speaker"} <= item.keys():
                    raise ValueError("invalid region shape")
                start, end, speaker = item["start"], item["end"], item["speaker"]
                if isinstance(start, bool) or isinstance(end, bool) or not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
                    raise ValueError("invalid region time")
                if isinstance(speaker, bool) or not isinstance(speaker, int) or speaker < 1:
                    raise ValueError("invalid speaker id")
                if not math.isfinite(start) or not math.isfinite(end) or end <= start:
                    raise ValueError("invalid region range")
                clipped_start = max(0.0, min(duration, float(start)))
                clipped_end = max(0.0, min(duration, float(end)))
                if clipped_end > clipped_start:
                    regions.append(Region(clipped_start, clipped_end, speaker))
            return sorted(regions, key=lambda region: (region.start, region.end, region.speaker))
        except (OSError, UnicodeError, json.JSONDecodeError, TypeError, ValueError) as exc:
            raise CommunityError("COMMUNITY_FAILED") from None

    def regions(self, audio) -> list[Region]:
        """Diarize one complete canonical 16 kHz mono waveform."""
        samples = getattr(audio, "waveform", audio)
        try:
            samples = np.asarray(samples, dtype=np.float32)
            if samples.ndim != 1 or samples.size == 0 or not np.isfinite(samples).all():
                raise ValueError
        except (TypeError, ValueError):
            raise CommunityError("COMMUNITY_FAILED") from None
        duration = samples.size / 16000
        self._check_available()
        with self._lock:
            try:
                with tempfile.TemporaryDirectory(prefix="stt-community-") as temp_dir:
                    temp = Path(temp_dir)
                    audio_path = temp / "audio.wav"
                    result_path = temp / "regions.json"
                    self._write_wav(audio_path, samples)
                    command = [str(self.worker_python), str(Path(__file__).with_name("community_worker.py")),
                               "--model", str(self.model_dir), "--audio", str(audio_path),
                               "--result", str(result_path)]
                    env = {key: value for key, value in os.environ.items() if "TOKEN" not in key.upper()}
                    env.update({"HF_HUB_OFFLINE": "1", "HF_HUB_DISABLE_TELEMETRY": "1",
                                "PYANNOTE_METRICS_ENABLED": "0", "TRANSFORMERS_OFFLINE": "1",
                                "OMP_NUM_THREADS": "2", "MKL_NUM_THREADS": "2"})
                    self._runner(command, check=True, timeout=self.timeout_seconds, env=env,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL, cwd=str(ROOT))
                    return self._parse_regions(result_path, duration)
            except CommunityError:
                raise
            except Exception:
                raise CommunityError("COMMUNITY_FAILED") from None
