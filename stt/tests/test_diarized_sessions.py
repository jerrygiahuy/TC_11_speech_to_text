from stt.tests.vad_helpers import AllSpeech
from types import SimpleNamespace
from dataclasses import replace

import numpy as np
import pytest

from stt.diarization import Region
from stt.diarized_sessions import SessionStore, SessionError
from stt.tests.test_audio import decode, wav_bytes


class Engine:
    def transcribe(self, audio):
        text = [' TÔI', ' BỊ', ' ĐAU'] if audio.duration_ms <= 5000 else [' TÔI', ' BỊ', ' ĐAU', ' NGỰC', ' BA', ' NGÀY']
        return SimpleNamespace(tokens=text, timestamps=[i * 0.8 for i in range(len(text))], inference_ms=2)


class Diarizer:
    def regions(self, samples, profiles):
        speaker = profiles.identify(np.array([1., 0]))
        return [Region(0, len(samples) / 16000, speaker)]


def store():
    return SessionStore(Engine(), Diarizer(), vad=AllSpeech())


def test_denoising_uses_rolling_context_keeps_raw_speaker_audio_and_retries_once():
    clean_windows, raw_windows = [], []
    class Denoiser:
        def enhance(self, audio):
            clean_windows.append(audio.frame_count)
            return replace(audio, waveform=np.full_like(audio.waveform, 0.125))
    class CleanEngine(Engine):
        def transcribe(self, audio):
            assert np.all(audio.waveform == 0.125)
            return super().transcribe(audio)
    class RawDiarizer(Diarizer):
        def regions(self, samples, profiles):
            raw_windows.append(samples.copy())
            assert not np.all(samples == 0.125)
            return super().regions(samples, profiles)
    subject = SessionStore(CleanEngine(), RawDiarizer(), vad=AllSpeech(), denoiser=Denoiser())
    key = subject.create(denoise=True)['session_id']
    audio = decode(wav_bytes(seconds=5))
    first = subject.process(key, 1, 0, audio)
    assert subject.process(key, 1, 0, audio) == first
    subject.process(key, 2, 80000, audio)
    # Mỗi đoạn chỉ khử nhiễu một lần (đoạn 2 kèm 1 giây ngữ cảnh), không làm lại cả cửa sổ
    assert clean_windows == [80000, 80000 + 16000]
    np.testing.assert_array_equal(raw_windows[0], audio.waveform)
    assert first['denoiser'] == 'deepfilternet3'


def test_denoise_failure_does_not_commit_session_state():
    class Denoiser:
        def enhance(self, audio): raise RuntimeError('DENOISE_FAILED')
    subject = SessionStore(Engine(), Diarizer(), vad=AllSpeech(), denoiser=Denoiser())
    key = subject.create(denoise=True)['session_id']
    with pytest.raises(RuntimeError, match='DENOISE_FAILED'):
        subject.process(key, 1, 0, decode(wav_bytes(seconds=5)))
    assert subject.sessions[key].sequence == 0
    assert subject.sessions[key].total_frames == 0


def test_5_plus_3_seconds_is_redecoded_as_one_8_second_turn():
    subject = store(); session_id = subject.create()['session_id']
    first = subject.process(session_id, 1, 0, decode(wav_bytes(seconds=5)))
    second = subject.process(session_id, 2, 80000, decode(wav_bytes(seconds=3)))
    assert first['replace_from_ms'] == second['replace_from_ms'] == 0
    assert ' '.join(word['text'] for word in second['words']) == 'tôi bị đau ngực ba ngày'
    assert {word['speaker'] for word in second['words']} == {1}
    assert second['audio_ms'] == 8000
    assert subject.finalize(session_id)['final'] is True


def test_retry_is_idempotent_and_out_of_order_or_changed_payload_is_rejected():
    subject = store(); key = subject.create()['session_id']; audio = decode(wav_bytes(seconds=5))
    first = subject.process(key, 1, 0, audio)
    assert subject.process(key, 1, 0, audio) == first
    with pytest.raises(SessionError): subject.process(key, 3, 80000, audio)
    with pytest.raises(SessionError): subject.process(key, 1, 0, decode(wav_bytes(seconds=3)))


def test_session_audio_and_cached_words_are_bounded_and_sessions_are_isolated():
    subject = store(); a = subject.create()['session_id']; b = subject.create()['session_id']
    for index in range(12): subject.process(a, index + 1, index * 80000, decode(wav_bytes(seconds=5)))
    assert len(subject.sessions[a].samples) <= 25 * 16000
    assert subject.sessions[a].total_frames == 60 * 16000
    assert subject.sessions[b].total_frames == 0
    subject.close(a)
    with pytest.raises(SessionError): subject.finalize(a)


def test_model_failure_does_not_advance_sequence_or_audio():
    subject = store(); key = subject.create()['session_id']
    def fail(_audio): raise RuntimeError('inference failed')
    subject.engine.transcribe = fail
    with pytest.raises(RuntimeError): subject.process(key, 1, 0, decode(wav_bytes(seconds=5)))
    assert subject.sessions[key].total_frames == 0
    assert subject.sessions[key].sequence == 0


@pytest.mark.parametrize('old_time,new_time', [(5.05, 4.95), (4.95, 5.05)])
def test_timestamp_drift_across_freeze_boundary_never_drops_or_duplicates_word(old_time, new_time):
    subject = store(); key = subject.create()['session_id']
    calls = 0
    def transcribe(audio):
        nonlocal calls
        calls += 1
        if calls < 3:
            return SimpleNamespace(tokens=[], timestamps=[], inference_ms=0)
        return SimpleNamespace(tokens=[' TRƯỚC', ' MỐC', ' SAU'], timestamps=[3, old_time if calls == 3 else new_time, 7], inference_ms=1)
    subject.engine.transcribe = transcribe
    for sequence in range(1, 4):
        first = subject.process(key, sequence, (sequence - 1) * 80000, decode(wav_bytes(seconds=5)))
    second = subject.process(key, 4, 240000, decode(wav_bytes(seconds=5)))
    merged = [word for word in first['words'] if word['start_ms'] < second['replace_from_ms']] + second['words']
    assert [word['text'] for word in merged] == ['trước', 'mốc', 'sau']


def test_session_capacity_expiry_and_chunk_bounds():
    import time
    subject = SessionStore(Engine(), Diarizer(), max_sessions=1, vad=AllSpeech())
    key = subject.create()['session_id']
    with pytest.raises(SessionError, match='STT_SESSIONS_FULL'): subject.create()
    with pytest.raises(SessionError, match='STT_CHUNK_TOO_LONG'):
        subject.process(key, 1, 0, decode(wav_bytes(seconds=6)))
    subject.sessions[key].touched = time.monotonic() - 601
    replacement = subject.create()['session_id']
    assert replacement != key
    with pytest.raises(SessionError, match='STT_SESSION_EXPIRED'): subject.finalize(key)


def test_failed_diarization_does_not_poison_session_speaker_profiles():
    subject = store(); key = subject.create()['session_id']
    audio = decode(wav_bytes(seconds=5))
    subject.process(key, 1, 0, audio)
    before = subject.sessions[key].profiles.vectors[0].copy()
    original = subject.diarizer.regions
    def fail(samples, profiles):
        profiles.vectors[0][:] = 0
        raise RuntimeError('diarization failed')
    subject.diarizer.regions = fail
    with pytest.raises(RuntimeError, match='diarization failed'):
        subject.process(key, 2, 80000, audio)
    np.testing.assert_array_equal(subject.sessions[key].profiles.vectors[0], before)
    assert subject.sessions[key].sequence == 1
    subject.diarizer.regions = original
    retry = subject.process(key, 2, 80000, audio)
    assert {word['speaker'] for word in retry['words']} == {1}


def test_low_latency_session_uses_short_window_and_earlier_commit():
    subject = store()
    created = subject.create(low_latency=True)
    key = created['session_id']
    assert created['revision_ms'] == 6000
    for sequence in range(1, 5):
        response = subject.process(key, sequence, (sequence - 1) * 80000, decode(wav_bytes(seconds=5)))
    assert len(subject.sessions[key].samples) == 15 * 16000
    assert response['stable_until_ms'] == 20000 - 6000
    assert subject.create()['revision_ms'] == 10000
