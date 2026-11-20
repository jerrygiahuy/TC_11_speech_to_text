import json

import pytest

from stt.terminology import load_hotwords
from stt.engine import LocalEngine
from stt.tests.test_audio import decode, wav_bytes


def test_config_normalizes_deduplicates_and_reloads(tmp_path):
    file = tmp_path / 'hotwords.json'
    file.write_text(json.dumps({'phrases': ['  tai  mũi họng ', 'tai mũi họng', 'amoxicillin']}), encoding='utf-8')
    assert load_hotwords(file) == ('tai mũi họng', 'amoxicillin')
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
    file.write_text(json.dumps({'phrases': ['viêm xoang']}), encoding='utf-8')
    monkeypatch.setenv('STT_HOTWORDS_FILE', str(file))
    class Adapter:
        def transcribe(self, audio, hotwords):
            return hotwords
    engine = LocalEngine()
    engine._adapter = Adapter()
    assert engine.transcribe(decode(wav_bytes())) == ('viêm xoang',)
