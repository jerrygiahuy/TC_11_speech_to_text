import hashlib
import io
from dataclasses import dataclass

import numpy as np
import soundfile as sf

from stt.errors import VoiceAudioValidationError, VoicePayloadTooLargeError

CANONICAL_SAMPLE_RATE = 16_000
CANONICAL_CHANNELS = 1
CANONICAL_SUBTYPE = "PCM_16"
WAV_MIME_TYPES = frozenset({"audio/wav", "audio/x-wav"})


@dataclass(frozen=True)
class CanonicalAudio:
    waveform: np.ndarray
    sample_rate: int
    frame_count: int
    duration_ms: int
    utterance_ref: str


def decode_canonical_wav(
    payload: bytes,
    *,
    mime_type: str,
    max_audio_bytes: int | None = None,
    max_audio_seconds: int | None = None,
    allow_silence: bool = False,
) -> CanonicalAudio:
    if max_audio_bytes is not None and len(payload) > max_audio_bytes:
        raise VoicePayloadTooLargeError("AUDIO_TOO_LARGE")
    normalized_mime = mime_type.partition(";")[0].strip().lower()
    if normalized_mime not in WAV_MIME_TYPES:
        raise VoiceAudioValidationError("AUDIO_MIME_UNSUPPORTED")

    try:
        with sf.SoundFile(io.BytesIO(payload)) as source:
            if source.format != "WAV":
                raise VoiceAudioValidationError("AUDIO_FORMAT_UNSUPPORTED")
            if source.channels != CANONICAL_CHANNELS:
                raise VoiceAudioValidationError("AUDIO_CHANNELS_UNSUPPORTED")
            if source.samplerate != CANONICAL_SAMPLE_RATE:
                raise VoiceAudioValidationError("AUDIO_SAMPLE_RATE_UNSUPPORTED")
            if source.subtype != CANONICAL_SUBTYPE:
                raise VoiceAudioValidationError("AUDIO_SUBTYPE_UNSUPPORTED")
            if source.frames <= 0:
                raise VoiceAudioValidationError("AUDIO_EMPTY")
            if max_audio_seconds is not None and source.frames > max_audio_seconds * source.samplerate:
                raise VoiceAudioValidationError("AUDIO_TOO_LONG")
            waveform = source.read(dtype="float32", always_2d=False)
    except VoiceAudioValidationError:
        raise
    except (OSError, RuntimeError, TypeError, ValueError) as exc:
        raise VoiceAudioValidationError("AUDIO_DECODE_FAILED") from exc

    waveform = np.asarray(waveform, dtype=np.float32)
    if waveform.ndim != 1 or waveform.size == 0:
        raise VoiceAudioValidationError("AUDIO_EMPTY")
    if not np.isfinite(waveform).all():
        raise VoiceAudioValidationError("AUDIO_NON_FINITE")
    if not allow_silence and not np.any(waveform):
        raise VoiceAudioValidationError("AUDIO_SILENT")

    waveform.setflags(write=False)
    frame_count = int(waveform.size)
    return CanonicalAudio(
        waveform=waveform,
        sample_rate=CANONICAL_SAMPLE_RATE,
        frame_count=frame_count,
        duration_ms=round(frame_count * 1_000 / CANONICAL_SAMPLE_RATE),
        utterance_ref=f"utterance:{hashlib.sha256(payload).hexdigest()[:24]}",
    )


def contains_speech(
    audio: CanonicalAudio,
    *,
    min_frame_rms: float,
    min_speech_ms: int,
    frame_ms: int = 20,
    max_frame_rms_threshold: float = 0.06,
) -> bool:
    """Cheap energy gate run before STT.

    Whisper-family models invent fluent sentences for silence or cabin noise, so a
    clip without enough loud frames is answered as "no speech" instead of transcribed.
    The threshold adapts to the clip's own noise floor (quietest 20% of frames), capped
    so a clip that is speech from start to end cannot raise the bar above speech itself.
    """
    frame = max(1, audio.sample_rate * frame_ms // 1_000)
    usable = audio.waveform[: audio.waveform.size // frame * frame]
    if usable.size == 0:
        return False
    rms = np.sqrt(np.mean(np.square(usable.reshape(-1, frame), dtype=np.float64), axis=1))
    adaptive = min(float(np.percentile(rms, 20)) * 4, max_frame_rms_threshold)
    threshold = max(min_frame_rms, adaptive)
    speech_ms = int(np.count_nonzero(rms > threshold)) * frame_ms
    return speech_ms >= min_speech_ms
