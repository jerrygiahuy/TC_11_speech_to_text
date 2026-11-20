"""Optional, local CPU DeepFilterNet3 preprocessing through the official Rust CLI.

The native release embeds DFN3 weights and uses tract, without PyTorch or CUDA.
Input and output keep the canonical 16 kHz timeline. Audio exists in a private
temporary directory only while a bounded chunk is being processed.
"""

import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile

import numpy as np
import soundfile as sf

from stt.audio import CanonicalAudio


DEFAULT_EXECUTABLE = Path(__file__).resolve().parent.parent / "models" / "denoise" / "deep-filter.exe"
_NATIVE_RATE = 48_000
_HOP = 480
# Official v0.5.6 DFN3: fft_size-hop_size + lookahead*hop_size = 1440.
# --compensate-delay trims this prefix but does not flush the tail itself.
_DELAY = 1440
_CHILD_ENV_KEYS = {"SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "TMPDIR", "SYSTEMDRIVE"}


class DenoiseError(RuntimeError):
    def __init__(self, reason_code: str):
        self.reason_code = reason_code
        super().__init__(reason_code)


class DeepFilterDenoiser:
    def __init__(
        self,
        executable: str | Path | None = None,
        *,
        timeout_seconds: float = 120.0,
        chunk_seconds: float = 25.0,
    ):
        self.executable = Path(executable or os.environ.get("DENOISE_EXECUTABLE") or DEFAULT_EXECUTABLE).resolve()
        if not np.isfinite(timeout_seconds) or timeout_seconds <= 0:
            raise ValueError("DENOISE_INVALID_TIMEOUT")
        if not np.isfinite(chunk_seconds) or not 1 <= chunk_seconds <= 30:
            raise ValueError("DENOISE_INVALID_CHUNK_SIZE")
        self.timeout_seconds = timeout_seconds
        self.chunk_frames = int(chunk_seconds * 16_000)

    def ready(self) -> bool:
        return self.executable.is_file() and importlib.util.find_spec("scipy") is not None

    def enhance(self, audio: CanonicalAudio) -> CanonicalAudio:
        waveform = np.asarray(audio.waveform)
        if (
            audio.sample_rate != 16_000
            or waveform.ndim != 1
            or waveform.size == 0
            or waveform.size != audio.frame_count
            or not np.isfinite(waveform).all()
        ):
            raise DenoiseError("DENOISE_INVALID_AUDIO")
        if not self.ready():
            raise DenoiseError("DENOISE_NOT_READY")
        result = np.empty(audio.frame_count, dtype=np.float32)
        # A second of real neighboring audio lets each independent native model
        # settle at file chunk boundaries. Keep only each chunk's central region.
        context = 16_000
        for start in range(0, audio.frame_count, self.chunk_frames):
            end = min(start + self.chunk_frames, audio.frame_count)
            left = max(0, start - context)
            right = min(audio.frame_count, end + context)
            enhanced = self._enhance_chunk(waveform[left:right])
            result[start:end] = enhanced[start - left : end - left]
        result.setflags(write=False)
        return CanonicalAudio(
            waveform=result,
            sample_rate=audio.sample_rate,
            frame_count=audio.frame_count,
            duration_ms=audio.duration_ms,
            utterance_ref=audio.utterance_ref,
        )

    def _enhance_chunk(self, waveform: np.ndarray) -> np.ndarray:
        try:
            from scipy.signal import resample_poly

            upsampled = resample_poly(waveform.astype(np.float32), 3, 1)
            padded_size = ((len(upsampled) + _DELAY + _HOP - 1) // _HOP) * _HOP
            padded = np.pad(upsampled, (0, padded_size - len(upsampled)))
            with tempfile.TemporaryDirectory(prefix="local-denoise-") as directory:
                source = Path(directory) / "input.wav"
                output = Path(directory) / "out"
                sf.write(source, padded, _NATIVE_RATE, subtype="PCM_16")
                # No model credentials, proxy tokens, or application secrets are
                # inherited. Native inference never needs a network connection.
                child_env = {key: value for key, value in os.environ.items() if key.upper() in _CHILD_ENV_KEYS}
                child_env["RUST_LOG"] = "off"
                subprocess.run(
                    [str(self.executable), "--compensate-delay", "-o", str(output), str(source)],
                    check=True,
                    timeout=self.timeout_seconds,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    env=child_env,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                with sf.SoundFile(output / source.name) as enhanced_file:
                    if (
                        enhanced_file.samplerate != _NATIVE_RATE
                        or enhanced_file.channels != 1
                        or enhanced_file.frames < len(upsampled)
                        or enhanced_file.frames > padded_size
                    ):
                        raise DenoiseError("DENOISE_INVALID_OUTPUT") from None
                    enhanced = enhanced_file.read(dtype="float32")
                if not np.isfinite(enhanced).all():
                    raise DenoiseError("DENOISE_INVALID_OUTPUT") from None
                # Trim native flush samples before antialiasing back to 16 kHz.
                restored = resample_poly(enhanced[: len(upsampled)], 1, 3)[: len(waveform)]
                if len(restored) != len(waveform) or not np.isfinite(restored).all():
                    raise DenoiseError("DENOISE_INVALID_OUTPUT") from None
                return np.clip(restored, -1, 1).astype(np.float32)
        except DenoiseError:
            raise
        except subprocess.TimeoutExpired:
            raise DenoiseError("DENOISE_TIMEOUT") from None
        except ImportError:
            raise DenoiseError("DENOISE_NOT_READY") from None
        except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
            raise DenoiseError("DENOISE_FAILED") from None
