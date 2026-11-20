import json

import pytest

from stt.terminology import load_hotwords
from stt.engine import LocalEngine
from stt.tests.test_audio import decode, wav_bytes


def test_config_normalizes_deduplicates_and_reloads(tmp_path):
    file = tmp_path / 'hotwords.json'
    file.write_text(json.dumps({'phrases': ['  rung  nhĩ ', 'rung nhĩ', 'apixaban']}), encoding='utf-8')
    assert load_hotwords(file) == ('rung nhĩ', 'apixaban')
    file.write_text('{"phrases": []}', encoding='utf-8')
    assert load_hotwords(file) == ()


@pytest.mark.parametrize('data', [{'phrases': ['bad/phrase']}, {'phrases': [1]}, {'phrases': 'bad'}, {'phrases': ['bad:99']}, {'phrases': ['bad\nphrase']}])
def test_invalid_terminology_does_not_reach_native_decoder(tmp_path, data):
    file = tmp_path / 'hotwords.json'
    file.write_text(json.dumps(data), encoding='utf-8')
    with pytest.raises(ValueError, match='STT_HOTWORDS_INVALID'):
        load_hotwords(file)


def test_engine_forwards_configured_terms_on_each_request(tmp_path, monkeypatch):
    file = tmp_path / 'hotwords.json'
    file.write_text(json.dumps({'phrases': ['rung nhĩ']}), encoding='utf-8')
    monkeypatch.setenv('STT_HOTWORDS_FILE', str(file))
    class Adapter:
        def transcribe(self, audio, hotwords):
            return hotwords
    engine = LocalEngine()
    engine._adapter = Adapter()
    assert engine.transcribe(decode(wav_bytes())) == ('rung nhĩ',)


# Từ vựng mặc định phải là Tim mạch: cụm đã có và cụm mới theo handoff/claude/05 mục 6
CARDIO_HOTWORDS = ['rung nhĩ', 'rung miu', 'tiếng T1 T2', 'âm thổi', 'tĩnh mạch cổ', 'mỏm tim', 'liên sườn V',
                   'rì rào phế nang', 'ran ẩm', 'phù mắt cá chân', 'đánh trống ngực', 'ngất thoáng qua',
                   'apixaban', 'furosemide', 'SpO2', 'NT-proBNP', 'chỉ số ABI', 'nhồi máu cơ tim', 'suy tim']
ENT_HOTWORDS = ['amidan', 'tai mũi họng', 'họng', 'mũi', 'răng', 'viêm xoang', 'nội soi thanh quản']


def test_bundled_hotwords_are_cardiology_not_ent():
    hotwords = load_hotwords()
    for phrase in CARDIO_HOTWORDS:
        assert phrase.lower() in hotwords, phrase
    for phrase in ENT_HOTWORDS:
        assert not any(phrase in term for term in hotwords), phrase
