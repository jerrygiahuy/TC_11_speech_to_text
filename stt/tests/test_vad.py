import pytest

from stt.contracts import SpeechRecognitionResult
from stt.errors import VoiceNoSpeechError
from stt.tests.test_audio import decode, wav_bytes
from stt.vad import transcribe_speech


class Detector:
    def __init__(self, spans): self.spans = spans
    def speech_spans(self, samples): return self.spans


class Engine:
    def __init__(self): self.lengths = []
    def transcribe(self, audio):
        self.lengths.append(audio.frame_count)
        return SpeechRecognitionResult(audio.utterance_ref, 'xin', None, 'vi', 'test', 'r', 'r', 2,
                                       ('▁xin',), (0.1,))


def test_only_speech_is_decoded_and_original_timestamps_are_preserved():
    audio = decode(wav_bytes(seconds=5)); engine = Engine()
    result = transcribe_speech(engine, Detector([(16000, 32000), (48000, 64000)]), audio)
    assert engine.lengths == [16000, 16000]
    assert result.transcript == 'xin xin'
    assert result.timestamps == (1.1, 3.1)
    assert result.utterance_ref == audio.utterance_ref
    assert result.inference_ms == 4


def test_no_speech_skips_recognizer():
    engine = Engine()
    with pytest.raises(VoiceNoSpeechError):
        transcribe_speech(engine, Detector([]), decode(wav_bytes(seconds=1)))
    assert engine.lengths == []


def test_missing_vad_model_is_actionable(tmp_path, monkeypatch):
    from stt.vad import SileroVad
    monkeypatch.setenv('STT_VAD_MODEL', str(tmp_path / 'missing.onnx'))
    detector = SileroVad()
    assert detector.ready() is False
    with pytest.raises(RuntimeError, match='STT_VAD_MODEL_MISSING'):
        detector.speech_spans(decode(wav_bytes()).waveform)
