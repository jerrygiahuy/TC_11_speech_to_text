from types import SimpleNamespace
import unicodedata

import pytest

from stt.stt import ZipformerAdapter
from stt.errors import VoiceNoSpeechError
from stt.hotwords import to_sherpa_hotwords
from stt.tests.test_audio import decode, wav_bytes


class Recognizer:
    def __init__(self, text):
        self.text = text
        self.hotwords = None

    def create_stream(self, **kwargs):
        self.hotwords = kwargs.get('hotwords')
        return SimpleNamespace(result=SimpleNamespace(text=self.text), accept_waveform=lambda *args: None)

    def decode_stream(self, stream):
        pass


def adapter(recognizer):
    return ZipformerAdapter(recognizer=recognizer, model_id='zipformer',
                            configured_revision='pinned', resolved_revision='pinned')


def test_transcript_is_nfc_lowercase_with_model_provenance():
    result = adapter(Recognizer(unicodedata.normalize('NFD', ' XIN CHÀO '))).transcribe(decode(wav_bytes()))
    assert result.transcript == 'xin chào'
    assert result.confidence is None
    assert result.configured_revision == 'pinned'
    assert result.inference_ms >= 0


def test_empty_transcript_is_no_speech():
    with pytest.raises(VoiceNoSpeechError):
        adapter(Recognizer('  ')).transcribe(decode(wav_bytes()))


def test_only_explicit_hotwords_are_forwarded():
    recognizer = Recognizer('xin chào')
    adapter(recognizer).transcribe(decode(wav_bytes()), ('  bệnh   án ', 'rung nhĩ'))
    assert recognizer.hotwords == 'BỆNH ÁN/RUNG NHĨ'
    adapter(recognizer).transcribe(decode(wav_bytes()))
    assert recognizer.hotwords is None
    assert to_sherpa_hotwords(('bad/injection', ' ')) == ''
