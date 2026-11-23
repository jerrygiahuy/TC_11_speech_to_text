import numpy as np
import pytest
from fastapi.testclient import TestClient

from stt.api import create_app
from stt.tests.test_audio import wav_bytes
from stt.tests.test_session_api import ApiDiarizer, ApiEngine
from stt.tests.vad_helpers import AllSpeech
from stt.voice_profiles import VoiceProfileError, VoiceProfileStore, match_speaker


def test_store_saves_only_unit_vector_and_validates_id(tmp_path):
    store = VoiceProfileStore(tmp_path)
    assert store.status('user_bs01') == {'enrolled': False}
    saved = store.save('user_bs01', [3.0, 4.0], 12.34)
    assert saved['enrolled'] and saved['speech_seconds'] == 12.3
    np.testing.assert_allclose(store.get('user_bs01')['vector'], [0.6, 0.8], atol=1e-6)
    assert sorted(p.name for p in tmp_path.iterdir()) == ['user_bs01.json']
    for bad in ['../x', '', 'a b', 'x' * 65]:
        with pytest.raises(VoiceProfileError, match='VOICE_ID_INVALID'):
            store.status(bad)
    store.delete('user_bs01')
    assert store.status('user_bs01') == {'enrolled': False}


def test_match_requires_clear_similarity_and_margin():
    assert match_speaker([1, 0], [[1, 0], [0, 1]])['speaker'] == 1
    assert match_speaker([0, 1], [[1, 0], [0.1, 1]])['speaker'] == 2
    # Không ai đủ giống
    assert match_speaker([1, 0], [[0.5, 1], [0, 1]])['speaker'] is None
    # Hai giọng đều giống gần bằng nhau: không chọn
    assert match_speaker([1, 0], [[1, 0.1], [1, 0.25]])['speaker'] is None
    assert match_speaker([1, 0], [])['speaker'] is None
    assert match_speaker([1, 0], [[1, 0]])['speaker'] == 1


class EnrollDiarizer(ApiDiarizer):
    def __init__(self, error=None):
        self.error = error
    def enrollment_embedding(self, samples):
        if self.error:
            raise VoiceProfileError(self.error)
        return np.array([1.0, 0.0], dtype=np.float32), 20.0


def test_enroll_then_session_reports_matching_speaker(tmp_path):
    store = VoiceProfileStore(tmp_path)
    with TestClient(create_app(ApiEngine(), EnrollDiarizer(), vad=AllSpeech(), voices=store)) as client:
        assert client.get('/voices/user_bs01').json() == {'enrolled': False}
        enrolled = client.post('/voices/user_bs01', headers={'Content-Type': 'audio/wav'}, content=wav_bytes(seconds=5))
        assert enrolled.status_code == 200 and enrolled.json()['enrolled']
        created = client.post('/sessions', headers={'X-STT-Voice': 'user_bs01'}).json()
        assert created['voice'] == 'loaded'
        key = created['session_id']
        headers = {'Content-Type': 'audio/wav', 'X-STT-Session': key, 'X-STT-Sequence': '1', 'X-STT-Start-Frame': '0'}
        assert client.post('/transcribe', headers=headers, content=wav_bytes(seconds=5)).status_code == 200
        final = client.post(f'/sessions/{key}/finalize').json()
        # Diarizer giả gán giọng [1, 0] cho Người nói 1, trùng giọng đã đăng ký
        assert final['voice_match']['speaker'] == 1
        # Phiên không xin so giọng thì không có voice_match
        plain = client.post('/sessions').json()['session_id']
        assert 'voice_match' not in client.post(f'/sessions/{plain}/finalize').json()
        assert client.post('/sessions', headers={'X-STT-Voice': 'chua_dang_ky'}).json()['voice'] == 'missing'
        assert client.delete('/voices/user_bs01').json() == {'enrolled': False}


def test_enroll_errors_are_actionable(tmp_path):
    store = VoiceProfileStore(tmp_path)
    with TestClient(create_app(ApiEngine(), EnrollDiarizer('VOICE_ENROLL_MULTIPLE_SPEAKERS'), vad=AllSpeech(), voices=store)) as client:
        response = client.post('/voices/user_bs01', headers={'Content-Type': 'audio/wav'}, content=wav_bytes(seconds=5))
        assert response.status_code == 400 and response.json()['detail'] == 'VOICE_ENROLL_MULTIPLE_SPEAKERS'
        assert client.post('/voices/..', headers={'Content-Type': 'audio/wav'}, content=wav_bytes(seconds=5)).status_code in {400, 404}
        assert store.status('user_bs01') == {'enrolled': False}
