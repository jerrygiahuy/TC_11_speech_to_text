"""Bounded rolling-session state and timestamp revisions; no transcript/audio persistence."""
import copy
from dataclasses import dataclass, field
from threading import RLock
from time import monotonic
from uuid import uuid4

import numpy as np

from stt.audio import CanonicalAudio
from stt.vad import SileroVad, transcribe_speech
from stt.diarization import SpeakerProfiles, tokens_to_words, attribute_words
from stt.errors import VoiceNoSpeechError
from stt.voice_profiles import match_speaker

WINDOW_FRAMES = 25 * 16000
# Lấy 1 giây âm thanh thô liền trước đoạn mới làm ngữ cảnh khi khử nhiễu, để mối nối đoạn không bị rạn.
DENOISE_CONTEXT = 16000
REVISION_MS = 10000
# Phiên độ trễ thấp (eForm, X-STT-Latency: low): nhận dạng lại cửa sổ 15 giây và chốt chữ cũ hơn 6 giây,
# để mỗi đoạn xử lý nhanh hơn thời gian nói (không ứ đọng khi dừng) và chữ chốt vào ô nhập sớm hơn.
LOW_LATENCY_WINDOW_FRAMES = 15 * 16000
LOW_LATENCY_REVISION_MS = 6000


def reconcile_tail(previous: list[dict], incoming: list[dict], cursor: int) -> list[dict]:
    """Align bounded text/time context across the frozen/provisional boundary.

    Emission times move on re-decode. Filtering both sides by time independently
    drops a 5.05s word revised to 4.95s (or duplicates the reverse). Anchor the
    replacement after the aligned frozen words instead, preserving repetitions.
    """
    old = [word for word in previous if cursor - 4000 <= word['start_ms'] <= cursor + 2000]
    new = [(index, word) for index, word in enumerate(incoming) if cursor - 5500 <= word['start_ms'] <= cursor + 3500]
    if not any(word['start_ms'] < cursor for word in old):
        return [word for word in incoming if word['start_ms'] >= cursor]
    n, m = len(old), len(new)
    cost = [[0.0] * (m + 1) for _ in range(n + 1)]
    step = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): cost[i][0], step[i][0] = i * 0.7, 1
    for j in range(1, m + 1): cost[0][j], step[0][j] = j * 0.7, 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            distance = abs(old[i - 1]['start_ms'] - new[j - 1][1]['start_ms'])
            match = (0 if old[i - 1]['text'] == new[j - 1][1]['text'] else 0.9) + distance / 7500 if distance <= 1500 else 1000
            choices = (cost[i - 1][j - 1] + match, cost[i - 1][j] + 0.7, cost[i][j - 1] + 0.7)
            step[i][j] = min(range(3), key=choices.__getitem__)
            cost[i][j] = choices[step[i][j]]
    boundary = -1
    i, j = n, m
    while i or j:
        action = step[i][j]
        if action == 0:
            if old[i - 1]['start_ms'] < cursor:
                boundary = max(boundary, new[j - 1][0])
            i -= 1; j -= 1
        elif action == 1: i -= 1
        else: j -= 1
    return incoming[boundary + 1:] if boundary >= 0 else [word for word in incoming if word['start_ms'] >= cursor]


class SessionError(Exception):
    def __init__(self, code: str, status: int = 409):
        self.code = code
        self.status = status
        super().__init__(code)


@dataclass
class Session:
    denoise: bool = False
    window_frames: int = WINDOW_FRAMES
    revision_ms: int = REVISION_MS
    # Đặc trưng giọng bác sĩ đã đăng ký (nếu có): chốt phiên thì so với hồ sơ giọng Người nói 1/2
    voice: np.ndarray | None = None
    samples: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=np.float32))
    # Âm thanh đã khử nhiễu, cùng độ dài và mốc thời gian với samples; mỗi đoạn chỉ khử nhiễu một lần.
    clean: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=np.float32))
    profiles: SpeakerProfiles = field(default_factory=SpeakerProfiles)
    total_frames: int = 0
    sequence: int = 0
    stable_until_ms: int = 0
    last_ref: str = ''
    last_start: int = 0
    response: dict | None = None
    finalized: bool = False
    previous_words: list[dict] = field(default_factory=list)
    touched: float = field(default_factory=monotonic)


class SessionStore:
    def __init__(self, engine, diarizer, *, max_sessions=8, ttl_seconds=600, vad=None, denoiser=None):
        self.vad = vad if vad is not None else SileroVad()
        self.denoiser = denoiser
        self.engine = engine
        self.diarizer = diarizer
        self.sessions: dict[str, Session] = {}
        self.max_sessions = max_sessions
        self.ttl_seconds = ttl_seconds
        self.lock = RLock()

    def _prune(self):
        now = monotonic()
        for key in list(self.sessions):
            if now - self.sessions[key].touched > self.ttl_seconds:
                del self.sessions[key]

    def create(self, *, denoise=False, low_latency=False, voice=None):
        with self.lock:
            self._prune()
            if len(self.sessions) >= self.max_sessions:
                raise SessionError('STT_SESSIONS_FULL', 503)
            key = str(uuid4())
            session = Session(denoise=denoise, voice=voice)
            if low_latency:
                session.window_frames, session.revision_ms = LOW_LATENCY_WINDOW_FRAMES, LOW_LATENCY_REVISION_MS
            self.sessions[key] = session
            return {'session_id': key, 'max_speakers': 2, 'revision_ms': session.revision_ms,
                    'denoiser': 'deepfilternet3' if denoise else 'off'}

    def _get(self, key):
        self._prune()
        if key not in self.sessions:
            raise SessionError('STT_SESSION_EXPIRED', 404)
        return self.sessions[key]

    def close(self, key):
        with self.lock:
            self.sessions.pop(key, None)

    def process(self, key: str, sequence: int, start_frame: int, audio: CanonicalAudio, *, denoise=None):
        if audio.frame_count > 80000:
            raise SessionError('STT_CHUNK_TOO_LONG', 400)
        with self.lock:
            original = self._get(key)
            if denoise is not None and denoise != original.denoise:
                raise SessionError('DENOISE_MODE_CONFLICT', 409)
            if sequence == original.sequence and original.response:
                if audio.utterance_ref != original.last_ref or start_frame != original.last_start:
                    raise SessionError('STT_CHUNK_CONFLICT')
                original.touched = monotonic()
                return copy.deepcopy(original.response)
            if original.finalized:
                raise SessionError('STT_SESSION_FINISHED')
            if sequence != original.sequence + 1 or start_frame != original.total_frames:
                raise SessionError('STT_CHUNK_OUT_OF_ORDER')
            state = copy.deepcopy(original)
        # Caller serializes native inference with the existing engine lock. Commit only on success.
        started = monotonic()
        context = state.samples[-DENOISE_CONTEXT:]
        state.samples = np.concatenate((state.samples, audio.waveform))[-state.window_frames:]
        state.total_frames += audio.frame_count
        offset_ms = round((state.total_frames - len(state.samples)) / 16)
        duration_ms = round(len(state.samples) / 16)
        window = CanonicalAudio(state.samples, 16000, len(state.samples), duration_ms, f'{key}:{sequence}')
        words = []
        inference_ms = 0
        try:
            if state.denoise and self.denoiser is None:
                raise RuntimeError('DENOISE_NOT_READY')
            if state.denoise:
                # Chỉ khử nhiễu đoạn mới (kèm ngữ cảnh), không làm lại cả cửa sổ 25 giây mỗi lần.
                joined = np.concatenate((context, audio.waveform))
                enhanced = self.denoiser.enhance(CanonicalAudio(
                    joined, 16000, len(joined), round(len(joined) / 16), f'{key}:{sequence}:denoise'))
                state.clean = np.concatenate((state.clean, enhanced.waveform[len(context):]))[-state.window_frames:]
                speech_window = CanonicalAudio(state.clean, 16000, len(state.clean), duration_ms, f'{key}:{sequence}')
            else:
                speech_window = window
            result = transcribe_speech(self.engine, self.vad, speech_window)
            regions = self.diarizer.regions(state.samples, state.profiles)
            inference_ms = result.inference_ms
            words = attribute_words(tokens_to_words(result.tokens, result.timestamps, len(state.samples) / 16000), regions)
        except VoiceNoSpeechError:
            pass
        for word in words:
            word['start_ms'] += offset_ms
            word['end_ms'] += offset_ms
        replace_from = state.stable_until_ms
        words = reconcile_tail(state.previous_words, words, replace_from)
        state.previous_words = [word for word in state.previous_words if offset_ms <= word['start_ms'] < replace_from] + copy.deepcopy(words)
        total_ms = round(state.total_frames / 16)
        state.stable_until_ms = max(replace_from, total_ms - state.revision_ms)
        response = {
            'session_id': key, 'sequence': sequence, 'replace_from_ms': replace_from,
            'stable_until_ms': state.stable_until_ms, 'words': words,
            'transcript': ' '.join(word['text'] for word in words), 'no_speech': not words,
            'audio_ms': total_ms, 'chunk_audio_ms': audio.duration_ms, 'inference_ms': inference_ms,
            'processing_ms': round((monotonic() - started) * 1000), 'final': False,
            'denoiser': 'deepfilternet3' if state.denoise else 'off',
        }
        state.sequence = sequence
        state.last_ref = audio.utterance_ref
        state.last_start = start_frame
        state.response = copy.deepcopy(response)
        state.touched = monotonic()
        with self.lock:
            if self.sessions.get(key) is not original:
                raise SessionError('STT_SESSION_CHANGED')
            self.sessions[key] = state
        return response

    def finalize(self, key):
        with self.lock:
            state = self._get(key)
            if state.response is None:
                state.response = {'session_id': key, 'sequence': 0, 'words': [], 'transcript': '', 'no_speech': True,
                                  'replace_from_ms': 0, 'audio_ms': 0, 'inference_ms': 0}
            state.response = {**state.response, 'final': True, 'stable_until_ms': round(state.total_frames / 16)}
            if state.voice is not None:
                state.response['voice_match'] = match_speaker(state.voice, state.profiles.vectors)
            state.finalized = True
            state.samples = np.empty(0, dtype=np.float32)
            state.clean = np.empty(0, dtype=np.float32)
            state.previous_words = []
            state.profiles = SpeakerProfiles()
            state.touched = monotonic()
            return copy.deepcopy(state.response)

    def file(self, audio: CanonicalAudio, *, denoise=False):
        key = self.create(denoise=denoise)['session_id']
        words = []
        total_inference = 0
        try:
            for sequence, start in enumerate(range(0, audio.frame_count, 80000), 1):
                samples = audio.waveform[start:start + 80000]
                part = CanonicalAudio(samples, 16000, len(samples), round(len(samples) / 16), f'{audio.utterance_ref}:{sequence}')
                response = self.process(key, sequence, start, part)
                words = [word for word in words if word['start_ms'] < response['replace_from_ms']] + response['words']
                total_inference += response['inference_ms']
            result = self.finalize(key)
            return {**result, 'replace_from_ms': 0, 'words': words, 'transcript': ' '.join(word['text'] for word in words),
                    'no_speech': not words, 'inference_ms': total_inference}
        finally:
            self.close(key)
