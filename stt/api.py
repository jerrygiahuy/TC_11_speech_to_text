"""STT-only HTTP service. Start on loopback using scripts/start-stt.ps1."""
from contextlib import asynccontextmanager
from dataclasses import asdict
import logging

from fastapi import FastAPI, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from stt.audio import decode_canonical_wav
from stt.vad import SileroVad, transcribe_speech
from stt.engine import LocalEngine
from stt.errors import VoiceAudioValidationError, VoiceNoSpeechError, VoicePayloadTooLargeError
from stt.diarization import LocalDiarizer, tokens_to_words, attribute_words
from stt.community import CommunityDiarizer
from stt.denoise import DeepFilterDenoiser
from stt.diarized_sessions import SessionStore, SessionError
from stt.voice_profiles import VoiceProfileError, VoiceProfileStore
from stt.ner import LocalNer
from stt.ner_api import create_ner_router

logger = logging.getLogger(__name__)


def create_app(engine=None, diarizer=None, vad=None, community=None, denoiser=None, voices=None, ner=None):
    engine = engine if engine is not None else LocalEngine()
    diarizer = diarizer if diarizer is not None else LocalDiarizer()
    vad = vad if vad is not None else SileroVad()
    community = community if community is not None else CommunityDiarizer()
    denoiser = denoiser if denoiser is not None else DeepFilterDenoiser()
    sessions = SessionStore(engine, diarizer, vad=vad, denoiser=denoiser)
    voices = voices if voices is not None else VoiceProfileStore()
    ner = ner if ner is not None else LocalNer()

    def denoise_mode(request):
        mode = request.headers.get('x-stt-denoise', 'off')
        if mode not in {'off', 'deepfilternet3'}:
            raise HTTPException(400, 'DENOISE_MODE_INVALID')
        return mode == 'deepfilternet3'

    @asynccontextmanager
    async def lifespan(app):
        yield
        if hasattr(engine, 'close'):
            engine.close()
        sessions.sessions.clear()

    app = FastAPI(title='Vietnamese Zipformer STT', lifespan=lifespan)
    app.include_router(create_ner_router(ner))

    @app.get('/health')
    def health():
        return {**engine.status(), 'diarization_ready': diarizer.ready(), 'vad_ready': vad.ready(), 'community_ready': community.ready(), 'denoise_ready': denoiser.ready(), 'ner_ready': ner.ready(), 'max_audio_seconds': None,
                'max_audio_bytes': None}

    @app.post('/sessions')
    def create_session(request: Request):
        denoise = denoise_mode(request)
        voice = None
        if 'x-stt-voice' in request.headers:
            try:
                profile = voices.get(request.headers['x-stt-voice'])
            except VoiceProfileError as error:
                raise HTTPException(error.status, error.code) from None
            voice = profile['vector'] if profile else None
        if denoise and not denoiser.ready():
            raise HTTPException(503, 'DENOISE_NOT_READY')
        if not diarizer.ready():
            raise HTTPException(503, 'DIARIZATION_MODEL_MISSING')
        try:
            created = sessions.create(denoise=denoise, low_latency=request.headers.get('x-stt-latency') == 'low', voice=voice)
            if 'x-stt-voice' in request.headers:
                created['voice'] = 'loaded' if voice is not None else 'missing'
            return created
        except SessionError as error:
            raise HTTPException(error.status, error.code) from None

    @app.get('/voices/{doctor_id}')
    def voice_status(doctor_id: str):
        try:
            return voices.status(doctor_id)
        except VoiceProfileError as error:
            raise HTTPException(error.status, error.code) from None

    def enroll(doctor_id: str, audio):
        if not diarizer.ready():
            raise HTTPException(503, 'DIARIZATION_MODEL_MISSING')
        if not engine.lock.acquire(blocking=False):
            raise HTTPException(429, 'STT_BUSY')
        try:
            vector, seconds = diarizer.enrollment_embedding(audio.waveform)
            return voices.save(doctor_id, vector, seconds)
        except VoiceProfileError as error:
            raise HTTPException(error.status, error.code) from None
        finally:
            engine.lock.release()

    @app.post('/voices/{doctor_id}')
    async def enroll_voice(doctor_id: str, request: Request):
        try:
            voices.status(doctor_id)
        except VoiceProfileError as error:
            raise HTTPException(error.status, error.code) from None
        payload = bytearray()
        async for chunk in request.stream():
            payload.extend(chunk)
        try:
            audio = decode_canonical_wav(bytes(payload), mime_type=request.headers.get('content-type', ''))
        except VoicePayloadTooLargeError as error:
            raise HTTPException(413, error.reason_code) from None
        except VoiceAudioValidationError as error:
            raise HTTPException(400, error.reason_code) from None
        return await run_in_threadpool(enroll, doctor_id, audio)

    @app.delete('/voices/{doctor_id}')
    def delete_voice(doctor_id: str):
        try:
            voices.delete(doctor_id)
        except VoiceProfileError as error:
            raise HTTPException(error.status, error.code) from None
        return {'enrolled': False}

    @app.delete('/sessions/{key}')
    def close_session(key: str):
        sessions.close(key)
        return {'closed': True}

    @app.post('/sessions/{key}/finalize')
    def finalize_session(key: str):
        if not engine.lock.acquire(blocking=False):
            raise HTTPException(429, 'STT_BUSY')
        try:
            return sessions.finalize(key)
        except SessionError as error:
            raise HTTPException(error.status, error.code) from None
        finally:
            engine.lock.release()

    def recognize(audio, session_id=None, sequence=0, start_frame=0, diarize_file=False, file_diarizer="onnx", denoise=False, explicit_mode=None):
        if not engine.lock.acquire(blocking=False):
            raise HTTPException(429, 'STT_BUSY')
        try:
            if session_id:
                return sessions.process(session_id, sequence, start_frame, audio, denoise=explicit_mode)
            if diarize_file and file_diarizer == "community1":
                if not community.ready():
                    raise RuntimeError('COMMUNITY_NOT_READY')
                speech_audio = denoiser.enhance(audio) if denoise else audio
                result = transcribe_speech(engine, vad, speech_audio)
                del speech_audio
                # Release the native recognizer before loading the isolated torch worker.
                if hasattr(engine, 'close'): engine.close()
                regions = community.regions(audio)
                words = attribute_words(tokens_to_words(result.tokens, result.timestamps, audio.duration_ms / 1000), regions)
                return {'words': words, 'transcript': ' '.join(word['text'] for word in words),
                        'replace_from_ms': 0, 'stable_until_ms': audio.duration_ms, 'audio_ms': audio.duration_ms,
                        'inference_ms': result.inference_ms, 'no_speech': not words, 'final': True,
                        'diarizer': 'community1', 'denoiser': 'deepfilternet3' if denoise else 'off'}
            if diarize_file:
                return sessions.file(audio, denoise=denoise)
            result = transcribe_speech(engine, vad, denoiser.enhance(audio) if denoise else audio)
            return {**asdict(result), 'audio_ms': audio.duration_ms, 'no_speech': False,
                    'denoiser': 'deepfilternet3' if denoise else 'off'}
        except VoiceNoSpeechError:
            return {'transcript': '', 'no_speech': True, 'audio_ms': audio.duration_ms,
                    'language': 'vi', 'inference_ms': 0}
        except SessionError as error:
            raise HTTPException(error.status, error.code) from None
        except FileNotFoundError:
            raise HTTPException(503, 'STT_MODEL_MISSING') from None
        except ValueError as error:
            if str(error) == 'STT_HOTWORDS_INVALID':
                raise HTTPException(503, 'STT_HOTWORDS_INVALID') from None
            logger.exception('Local STT inference failed')
            raise HTTPException(503, 'STT_INFERENCE_FAILED') from None
        except HTTPException:
            raise
        except RuntimeError as error:
            if str(error).startswith(('COMMUNITY_', 'DENOISE_')):
                raise HTTPException(503, str(error)) from None
            if str(error) in {'DIARIZATION_MODEL_MISSING', 'DIARIZATION_MODEL_INVALID', 'STT_VAD_MODEL_MISSING', 'STT_VAD_MODEL_INVALID'}:
                raise HTTPException(503, str(error)) from None
            logger.exception('Local STT inference failed')
            raise HTTPException(503, 'STT_INFERENCE_FAILED') from None
        except Exception:
            logger.exception('Local STT load/inference failed')
            raise HTTPException(503, 'STT_INFERENCE_FAILED') from None
        finally:
            engine.lock.release()

    @app.post('/transcribe')
    async def transcribe(request: Request):
        denoise = denoise_mode(request)
        session_id = request.headers.get('x-stt-session')
        file_diarizer = request.headers.get('x-stt-diarizer', 'onnx')
        if file_diarizer not in {'onnx', 'community1'} or (file_diarizer == 'community1' and
                (session_id or request.headers.get('x-stt-diarize') != '1')):
            raise HTTPException(400, 'STT_DIARIZER_INVALID')
        sequence = start_frame = 0
        if session_id:
            try:
                sequence = int(request.headers.get('x-stt-sequence', ''))
                start_frame = int(request.headers.get('x-stt-start-frame', ''))
                if sequence < 1 or start_frame < 0 or start_frame > 2**53:
                    raise ValueError()
            except ValueError:
                raise HTTPException(400, 'STT_CHUNK_METADATA_INVALID') from None
        payload = bytearray()
        async for chunk in request.stream():
            payload.extend(chunk)
        try:
            audio = decode_canonical_wav(bytes(payload),
                                         mime_type=request.headers.get('content-type', ''),
                                         allow_silence=bool(session_id))
        except VoicePayloadTooLargeError as error:
            raise HTTPException(413, error.reason_code) from None
        except VoiceAudioValidationError as error:
            raise HTTPException(400, error.reason_code) from None
        return await run_in_threadpool(recognize, audio, session_id, sequence, start_frame,
                                       request.headers.get('x-stt-diarize') == '1', file_diarizer, denoise,
                                       denoise if 'x-stt-denoise' in request.headers else None)

    return app


app = create_app()
