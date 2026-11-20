"""Reproducible local Silero VAD smoke; no transcription or external audio upload."""
import numpy as np
import soundfile as sf

from stt.model_artifacts import model_directory
from stt.vad import SileroVad


def main():
    samples, sample_rate = sf.read(model_directory() / 'test_wavs/1.wav', dtype='float32')
    if sample_rate != 16000 or samples.ndim != 1:
        raise RuntimeError('VAD_SMOKE_SAMPLE_FORMAT_INVALID')
    detector = SileroVad()
    speech = detector.speech_spans(samples)
    silence = detector.speech_spans(np.zeros(16000, dtype=np.float32))
    noise = detector.speech_spans(np.random.default_rng(1).normal(0, 0.004, 48000).astype(np.float32))
    if not speech or silence or noise:
        raise RuntimeError('VAD_SMOKE_FAILED')
    print(f'Silero VAD smoke passed: speech_spans={len(speech)}, silence_spans=0, noise_spans=0')


if __name__ == '__main__': main()
