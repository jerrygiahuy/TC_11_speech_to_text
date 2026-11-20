"""Silero ONNX speech spans; keep original time coordinates through ASR."""
from dataclasses import replace
from types import SimpleNamespace
import os
from pathlib import Path

import numpy as np

from stt.audio import CanonicalAudio
from stt.errors import VoiceNoSpeechError
from stt.model_artifacts import PROJECT_ROOT


def model_path():
    return Path(os.environ.get('STT_VAD_MODEL', str(PROJECT_ROOT / 'models/vad/silero_vad.onnx')))


class SileroVad:
    def __init__(self): self._detector = None

    def ready(self): return model_path().is_file()

    def speech_spans(self, samples):
        if self._detector is None:
            if not self.ready(): raise RuntimeError('STT_VAD_MODEL_MISSING')
            import sherpa_onnx as sherpa
            config = sherpa.VadModelConfig()
            config.silero_vad.model = str(model_path())
            config.silero_vad.threshold = 0.5
            config.silero_vad.min_silence_duration = 0.35
            config.silero_vad.min_speech_duration = 0.15
            config.silero_vad.max_speech_duration = 15
            config.sample_rate = 16000
            config.num_threads = 1
            if not config.validate(): raise RuntimeError('STT_VAD_MODEL_INVALID')
            try: self._detector = sherpa.VoiceActivityDetector(config, buffer_size_in_seconds=30)
            except Exception: raise RuntimeError('STT_VAD_MODEL_INVALID') from None
        detector = self._detector
        detector.reset()
        spans = []
        def drain():
            while not detector.empty():
                segment = detector.front
                # Keep 120ms context on either side to protect quiet word boundaries.
                spans.append((max(0, segment.start - 1920), min(len(samples), segment.start + len(segment.samples) + 1920)))
                detector.pop()
        for start in range(0, len(samples), 512):
            window = samples[start:start + 512]
            if len(window) < 512: window = np.pad(window, (0, 512 - len(window)))
            detector.accept_waveform(window)
            drain()
        detector.flush(); drain()
        merged = []
        for start, end in spans:
            if start >= end: continue
            if merged and start <= merged[-1][1] and max(end, merged[-1][1]) - merged[-1][0] <= 16 * 16000: merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
            else:
                # Forced max-duration cuts must not duplicate context words.
                if merged: start = max(start, merged[-1][1])
                if end > start: merged.append((start, end))
        return merged


def transcribe_speech(engine, detector, audio):
    results = []; tokens = []; timestamps = []; transcripts = []; inference_ms = 0
    for start, end in detector.speech_spans(audio.waveform):
        part = CanonicalAudio(audio.waveform[start:end], audio.sample_rate, end-start,
                              round((end-start)*1000/audio.sample_rate), f'{audio.utterance_ref}:{start}:{end}')
        try: result = engine.transcribe(part)
        except VoiceNoSpeechError: continue
        results.append(result)
        transcripts.append(getattr(result, 'transcript', ''))
        tokens.extend(result.tokens)
        timestamps.extend(float(t) + start/audio.sample_rate for t in result.timestamps)
        inference_ms += result.inference_ms
    if not results: raise VoiceNoSpeechError()
    changes = dict(utterance_ref=audio.utterance_ref, transcript=' '.join(t for t in transcripts if t),
                   tokens=tuple(tokens), timestamps=tuple(timestamps), inference_ms=inference_ms)
    if hasattr(results[0], '__dataclass_fields__'): return replace(results[0], **changes)
    return SimpleNamespace(**{**vars(results[0]), **changes})
