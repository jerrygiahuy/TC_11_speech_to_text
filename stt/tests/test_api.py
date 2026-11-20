from stt.tests.vad_helpers import AllSpeech
from threading import Lock
from dataclasses import replace
import numpy as np

import pytest
from fastapi.testclient import TestClient

from stt.api import create_app
from stt.contracts import SpeechRecognitionResult
from stt.errors import VoiceNoSpeechError
from stt.tests.test_audio import wav_bytes


class Engine:
    def __init__(self):
        self.calls = 0
        self.error = None
        self.lock = Lock()

    def status(self):
        return {"ready": True, "model_id": "test-model"}

    def transcribe(self, audio):
        self.calls += 1
        if self.error:
            raise self.error
        return SpeechRecognitionResult(audio.utterance_ref, 'xin chào', None, 'vi', 'test-model', 'rev', 'rev', 7)


@pytest.fixture
def service():
    engine = Engine()
    with TestClient(create_app(engine, vad=AllSpeech())) as client:
        yield client, engine


def post(client, data, mime='audio/wav'):
    return client.post('/transcribe', content=data, headers={'Content-Type': mime})


def test_success_returns_transcript_and_timing(service):
    client, engine = service
    response = post(client, wav_bytes(seconds=0.8))
    assert response.status_code == 200
    assert response.json()['transcript'] == 'xin chào'
    assert response.json()['audio_ms'] == 800
    assert response.json()['inference_ms'] == 7
    assert engine.calls == 1


def test_denoise_file_precedes_vad_and_stt_and_default_stays_off():
    events = []
    class Denoiser:
        def ready(self): return True
        def enhance(self, audio):
            events.append('denoise')
            return replace(audio, waveform=np.zeros_like(audio.waveform) + 0.125)
    class Vad:
        def ready(self): return True
        def speech_spans(self, samples):
            events.append('vad')
            assert np.all(samples == 0.125)
            return [(0, len(samples))]
    class CleanEngine(Engine):
        def transcribe(self, audio):
            events.append('stt')
            assert np.all(audio.waveform == 0.125)
            return super().transcribe(audio)
    with TestClient(create_app(CleanEngine(), vad=Vad(), denoiser=Denoiser())) as client:
        response = client.post('/transcribe', content=wav_bytes(), headers={
            'Content-Type': 'audio/wav', 'X-STT-Denoise': 'deepfilternet3'})
        assert response.status_code == 200, response.text
        assert response.json()['denoiser'] == 'deepfilternet3'
        assert events == ['denoise', 'vad', 'stt']
        assert client.get('/health').json()['denoise_ready'] is True
    events.clear()
    with TestClient(create_app(Engine(), vad=AllSpeech(), denoiser=Denoiser())) as client:
        assert post(client, wav_bytes()).status_code == 200
    assert events == []


def test_denoise_invalid_mode_and_failure_are_actionable():
    class Missing:
        def ready(self): return False
        def enhance(self, audio): raise RuntimeError('DENOISE_RUNTIME_MISSING')
    engine = Engine()
    with TestClient(create_app(engine, vad=AllSpeech(), denoiser=Missing())) as client:
        for endpoint in ['/transcribe', '/sessions']:
            response = client.post(endpoint, content=wav_bytes(), headers={
                'Content-Type': 'audio/wav', 'X-STT-Denoise': 'unknown'})
            assert response.status_code == 400
            assert response.json()['detail'] == 'DENOISE_MODE_INVALID'
        response = client.post('/transcribe', content=wav_bytes(), headers={
            'Content-Type': 'audio/wav', 'X-STT-Denoise': 'deepfilternet3'})
        assert response.status_code == 503
        assert response.json()['detail'] == 'DENOISE_RUNTIME_MISSING'
    assert engine.calls == 0


@pytest.mark.parametrize('payload,mime,status,code', [
    (b'bad', 'audio/wav', 400, 'AUDIO_DECODE_FAILED'),
    (wav_bytes(), 'audio/webm', 400, 'AUDIO_MIME_UNSUPPORTED'),
    (wav_bytes(silent=True), 'audio/wav', 400, 'AUDIO_SILENT'),
    (wav_bytes(channels=2), 'audio/wav', 400, 'AUDIO_CHANNELS_UNSUPPORTED'),
    (wav_bytes(sample_rate=44100), 'audio/wav', 400, 'AUDIO_SAMPLE_RATE_UNSUPPORTED'),
])
def test_invalid_audio_never_reaches_model(service, payload, mime, status, code):
    client, engine = service
    response = post(client, payload, mime)
    assert response.status_code == status
    assert response.json()['detail'] == code
    assert engine.calls == 0


def test_model_no_speech_returns_empty_result(service):
    client, engine = service
    engine.error = VoiceNoSpeechError()
    response = post(client, wav_bytes(seconds=0.8))
    assert response.status_code == 200
    assert response.json()['transcript'] == ''
    assert response.json()['no_speech'] is True


def test_concurrent_request_is_bounded(service):
    client, engine = service
    with engine.lock:
        response = post(client, wav_bytes(seconds=0.8))
    assert response.status_code == 429
    assert engine.calls == 0


def test_missing_model_is_actionable(tmp_path, monkeypatch):
    monkeypatch.setenv('STT_MODEL_DIR', str(tmp_path))
    with TestClient(create_app(vad=AllSpeech())) as client:
        assert client.get('/health').json()['ready'] is False
        response = post(client, wav_bytes(seconds=0.8))
        assert response.status_code == 503
        assert response.json()['detail'] == 'STT_MODEL_MISSING'


@pytest.mark.parametrize('seconds', [31, 660])
def test_upload_has_no_duration_or_size_cap(service, seconds):
    client, engine = service
    payload = wav_bytes(seconds=seconds)
    if seconds == 660:
        assert len(payload) > 20 * 1024 * 1024
    response = post(client, payload)
    assert response.status_code == 200
    assert response.json()['audio_ms'] == seconds * 1000
    assert engine.calls == 1
    health = client.get('/health').json()
    assert health['max_audio_seconds'] is None
    assert health['max_audio_bytes'] is None



def test_community_file_runs_sequentially_and_preserves_word_timeline():
    from stt.diarization import Region
    events = []
    class FileEngine(Engine):
        def transcribe(self, audio):
            events.append('stt')
            return SpeechRecognitionResult(audio.utterance_ref, 'xin chào', None, 'vi', 'test', 'r', 'r', 2,
                                           ('▁xin', '▁chào'), (0.1, 0.5))
        def close(self): events.append('release_stt')
    class Community:
        def ready(self): return True
        def regions(self, audio):
            events.append('community')
            return [Region(0, 0.4, 1, 0), Region(0.4, 0.8, 2, 1)]
    from stt.tests.vad_helpers import AllSpeech
    with TestClient(create_app(FileEngine(), vad=AllSpeech(), community=Community())) as client:
        response = client.post('/transcribe', content=wav_bytes(seconds=0.8), headers={
            'Content-Type': 'audio/wav', 'X-STT-Diarize': '1', 'X-STT-Diarizer': 'community1'})
        assert response.status_code == 200
        result = response.json()
        assert [word['speaker'] for word in result['words']] == [1, 2]
        assert [word['start_ms'] for word in result['words']] == [100, 500]
        assert result['diarizer'] == 'community1'
        assert events[:3] == ['stt', 'release_stt', 'community']


def test_community_cannot_be_selected_for_live_session_or_unknown_mode(service):
    client, engine = service
    for mode, session in [('cloud', None), ('community1', 'live')]:
        headers = {'Content-Type': 'audio/wav', 'X-STT-Diarize': '1', 'X-STT-Diarizer': mode}
        if session: headers['X-STT-Session'] = session
        response = client.post('/transcribe', content=wav_bytes(), headers=headers)
        assert response.status_code == 400
    assert engine.calls == 0


def test_denoised_community_file_keeps_original_audio_and_sequential_processing():
    from stt.diarization import Region
    from stt.tests.test_audio import decode

    payload = wav_bytes(seconds=0.8)
    original = decode(payload)
    events = []

    class Denoiser:
        def ready(self): return True
        def enhance(self, audio):
            events.append('denoise')
            np.testing.assert_array_equal(audio.waveform, original.waveform)
            return replace(audio, waveform=np.full_like(audio.waveform, 0.125))

    class Vad:
        def ready(self): return True
        def speech_spans(self, samples):
            events.append('vad')
            assert np.all(samples == 0.125)
            return [(0, len(samples))]

    class FileEngine(Engine):
        def transcribe(self, audio):
            events.append('stt')
            assert np.all(audio.waveform == 0.125)
            return SpeechRecognitionResult(audio.utterance_ref, 'xin chào', None, 'vi', 'test', 'r', 'r', 2,
                                           ('▁xin', '▁chào'), (0.1, 0.5))
        def close(self): events.append('release_stt')

    class Community:
        def ready(self): return True
        def regions(self, audio):
            events.append('community')
            np.testing.assert_array_equal(audio.waveform, original.waveform)
            assert audio.utterance_ref == original.utterance_ref
            return [Region(0, 0.8, 1)]

    with TestClient(create_app(FileEngine(), vad=Vad(), community=Community(), denoiser=Denoiser())) as client:
        response = client.post('/transcribe', content=payload, headers={
            'Content-Type': 'audio/wav', 'X-STT-Diarize': '1',
            'X-STT-Diarizer': 'community1', 'X-STT-Denoise': 'deepfilternet3'})
        assert response.status_code == 200, response.text
        assert response.json()['denoiser'] == 'deepfilternet3'
        assert [word['start_ms'] for word in response.json()['words']] == [100, 500]
        assert events == ['denoise', 'vad', 'stt', 'release_stt', 'community']


def test_missing_denoiser_rejects_session_before_allocating_state():
    from stt.tests.test_session_api import ApiDiarizer

    class Missing:
        def ready(self): return False
        def enhance(self, audio): raise AssertionError('must not start inference')

    with TestClient(create_app(Engine(), ApiDiarizer(), vad=AllSpeech(), denoiser=Missing())) as client:
        response = client.post('/sessions', headers={'X-STT-Denoise': 'deepfilternet3'})
        assert response.status_code == 503
        assert response.json()['detail'] == 'DENOISE_NOT_READY'
        assert client.post('/sessions').status_code == 200
