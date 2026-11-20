"""Private worker entrypoint; torch and pyannote stay out of the STT process."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import wave


def _read_wav(path: Path):
    import numpy as np

    with wave.open(str(path), "rb") as source:
        if source.getnchannels() != 1 or source.getframerate() != 16000 or source.getsampwidth() != 2:
            raise ValueError("input WAV must be mono 16 kHz PCM16")
        frames = source.readframes(source.getnframes())
    samples = np.frombuffer(frames, dtype="<i2").astype(np.float32)
    return samples / 32768.0


def _run(model_dir: Path, audio_path: Path, result_path: Path) -> None:
    if not model_dir.is_dir() or not (model_dir / "config.yaml").is_file():
        raise FileNotFoundError("local Community-1 configuration missing")
    os.environ.update({
        "HF_HUB_OFFLINE": "1",
        "HF_HUB_DISABLE_TELEMETRY": "1",
        "PYANNOTE_METRICS_ENABLED": "0",
        "TRANSFORMERS_OFFLINE": "1",
        "OMP_NUM_THREADS": "2",
        "MKL_NUM_THREADS": "2",
    })

    import numpy as np
    import torch
    from pyannote.audio import Pipeline

    torch.set_num_threads(2)
    pipeline = Pipeline.from_pretrained(str(model_dir))
    waveform = _read_wav(audio_path)
    tensor = torch.from_numpy(np.ascontiguousarray(waveform, dtype=np.float32))
    output = pipeline({"waveform": tensor.unsqueeze(0), "sample_rate": 16000})
    diarization = getattr(output, "speaker_diarization", output)
    duration = len(waveform) / 16000

    # Iterate full diarization tracks, not the exclusive view, so simultaneous
    # speakers remain separate overlapping regions.
    segments = []
    for segment, _track, label in diarization.itertracks(yield_label=True):
        start, end = max(0.0, float(segment.start)), min(duration, float(segment.end))
        if end > start:
            segments.append((start, end, label))
    segments.sort(key=lambda item: (item[0], item[1], str(item[2])))
    speaker_ids = {}
    regions = []
    for start, end, label in segments:
        if label not in speaker_ids:
            speaker_ids[label] = len(speaker_ids) + 1
        regions.append({"start": start, "end": end, "speaker": speaker_ids[label]})
    with result_path.open("w", encoding="utf-8") as output:
        json.dump(regions, output, separators=(",", ":"), allow_nan=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--audio", required=True, type=Path)
    parser.add_argument("--result", required=True, type=Path)
    args = parser.parse_args()
    try:
        _run(args.model.resolve(), args.audio.resolve(), args.result.resolve())
        return 0
    except Exception:
        # The parent maps nonzero exit to COMMUNITY_FAILED. Do not log model,
        # token, audio, or exception details from this subprocess.
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
