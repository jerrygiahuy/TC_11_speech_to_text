"""Run real-model inference on the downloaded upstream test WAVs or a given WAV."""
import argparse
from dataclasses import asdict
import io
import json

import numpy as np
import soundfile as sf

from stt.audio import decode_canonical_wav
from stt.engine import LocalEngine
from stt.model_artifacts import model_directory


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('wav', nargs='?')
    options = parser.parse_args()
    from pathlib import Path
    files = [Path(options.wav)] if options.wav else sorted((model_directory() / 'test_wavs').glob('*.wav'))
    if not files:
        raise SystemExit('No sample WAVs. Run python -m stt.download_model first.')
    engine = LocalEngine()
    try:
        for file in files:
            samples, rate = sf.read(file, dtype='float32', always_2d=True)
            samples = samples.mean(axis=1)
            if rate != 16_000:
                samples = np.interp(np.arange(round(len(samples) * 16_000 / rate)) * rate / 16_000,
                                    np.arange(len(samples)), samples)
            output = io.BytesIO()
            sf.write(output, samples, 16_000, format='WAV', subtype='PCM_16')
            audio = decode_canonical_wav(output.getvalue(), mime_type='audio/wav',
                                         max_audio_bytes=964096, max_audio_seconds=30)
            result = engine.transcribe(audio)
            print(json.dumps({'file': file.name, **asdict(result), 'audio_ms': audio.duration_ms}, ensure_ascii=False))
    finally:
        engine.close()


if __name__ == '__main__':
    main()
