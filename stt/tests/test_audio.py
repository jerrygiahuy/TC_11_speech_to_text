import io

import numpy as np
import pytest
import soundfile as sf

from stt.audio import CanonicalAudio, contains_speech, decode_canonical_wav
from stt.errors import VoiceAudioValidationError, VoicePayloadTooLargeError


def wav_bytes(
    *,
    sample_rate: int = 16_000,
    channels: int = 1,
    subtype: str = "PCM_16",
    seconds: float = 0.1,
    silent: bool = False,
) -> bytes:
    frames = int(sample_rate * seconds)
    signal = np.zeros(frames, dtype=np.float32)
    if not silent and frames:
        signal = (0.2 * np.sin(2 * np.pi * 440 * np.arange(frames) / sample_rate)).astype(np.float32)
    if channels == 2:
        signal = np.column_stack((signal, signal))
    output = io.BytesIO()
    sf.write(output, signal, sample_rate, format="WAV", subtype=subtype)
    return output.getvalue()


def decode(payload: bytes, mime_type: str = "audio/wav", **overrides) -> CanonicalAudio:
    return decode_canonical_wav(
        payload,
        mime_type=mime_type,
        max_audio_bytes=overrides.get("max_audio_bytes", 2_000_000),
        max_audio_seconds=overrides.get("max_audio_seconds", 15),
    )


def test_valid_pcm16_mono_16khz_wav_is_normalized():
    audio = decode(wav_bytes())

    assert audio.sample_rate == 16_000
    assert audio.waveform.dtype == np.float32
    assert audio.waveform.ndim == 1
    assert audio.frame_count == 1_600
    assert audio.duration_ms == 100
    assert audio.utterance_ref.startswith("utterance:")
    assert not hasattr(audio, "raw_bytes")


@pytest.mark.parametrize(
    ("payload", "mime_type", "reason_code"),
    [
        (b"not a wave", "audio/wav", "AUDIO_DECODE_FAILED"),
        (wav_bytes(), "audio/webm", "AUDIO_MIME_UNSUPPORTED"),
        (wav_bytes(channels=2), "audio/wav", "AUDIO_CHANNELS_UNSUPPORTED"),
        (wav_bytes(sample_rate=8_000), "audio/wav", "AUDIO_SAMPLE_RATE_UNSUPPORTED"),
        (wav_bytes(subtype="FLOAT"), "audio/wav", "AUDIO_SUBTYPE_UNSUPPORTED"),
        (wav_bytes(seconds=0), "audio/wav", "AUDIO_EMPTY"),
        (wav_bytes(silent=True), "audio/wav", "AUDIO_SILENT"),
    ],
)
def test_invalid_audio_has_bounded_reason(payload, mime_type, reason_code):
    with pytest.raises(VoiceAudioValidationError) as raised:
        decode(payload, mime_type)

    assert raised.value.reason_code == reason_code
    assert len(str(raised.value)) < 80
    assert repr(payload[:8]) not in str(raised.value)


def test_audio_over_duration_is_rejected():
    with pytest.raises(VoiceAudioValidationError) as raised:
        decode(wav_bytes(seconds=1.1), max_audio_seconds=1)

    assert raised.value.reason_code == "AUDIO_TOO_LONG"


def test_audio_over_byte_limit_is_rejected_before_decode():
    payload = wav_bytes()

    with pytest.raises(VoicePayloadTooLargeError) as raised:
        decode(payload, max_audio_bytes=len(payload) - 1)

    assert raised.value.reason_code == "AUDIO_TOO_LARGE"


def test_utterance_reference_is_deterministic_but_opaque():
    payload = wav_bytes()

    first = decode(payload)
    second = decode(payload)

    assert first.utterance_ref == second.utterance_ref
    assert payload.hex() not in first.utterance_ref


def canonical(signal: np.ndarray) -> CanonicalAudio:
    output = io.BytesIO()
    sf.write(output, signal.astype(np.float32), 16_000, format="WAV", subtype="PCM_16")
    return decode_canonical_wav(output.getvalue(), mime_type="audio/wav", max_audio_bytes=2_000_000, max_audio_seconds=15)


def tone(seconds: float, amplitude: float) -> np.ndarray:
    return np.sin(2 * np.pi * 220 * np.arange(int(16_000 * seconds)) / 16_000) * amplitude


def gate(audio: CanonicalAudio) -> bool:
    return contains_speech(audio, min_frame_rms=0.02, min_speech_ms=150)


def test_cabin_noise_without_speech_is_not_sent_to_stt():
    noise = np.random.default_rng(1).normal(0, 0.004, 16_000 * 3)

    assert gate(canonical(noise)) is False


def test_speech_between_pauses_passes_the_gate():
    quiet = np.random.default_rng(2).normal(0, 0.004, 8_000)

    assert gate(canonical(np.concatenate([quiet, tone(0.6, 0.2), quiet]))) is True


def test_speech_filling_the_whole_clip_still_passes():
    assert gate(canonical(tone(0.8, 0.12))) is True


def test_a_short_click_is_not_speech():
    quiet = np.random.default_rng(3).normal(0, 0.004, 16_000)

    assert gate(canonical(np.concatenate([quiet, tone(0.06, 0.3), quiet]))) is False

