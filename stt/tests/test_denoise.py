from pathlib import Path
import subprocess

import numpy as np
import pytest
import soundfile as sf

from stt.audio import CanonicalAudio


def audio(signal):
    waveform = np.asarray(signal, dtype=np.float32)
    return CanonicalAudio(waveform, 16000, len(waveform), round(len(waveform) / 16), "utterance:original")


def runtime(tmp_path):
    # SciPy's first import can run platform detection through subprocess on
    # Windows. Load it before replacing only the native CLI boundary below.
    from scipy.signal import resample_poly  # noqa: F401
    from stt.denoise import DeepFilterDenoiser
    executable = tmp_path / "deep-filter.exe"
    executable.touch()
    return DeepFilterDenoiser(executable)


def test_missing_runtime_fails_closed(tmp_path):
    from stt.denoise import DeepFilterDenoiser, DenoiseError
    denoiser = DeepFilterDenoiser(tmp_path / "missing.exe")
    assert not denoiser.ready()
    with pytest.raises(DenoiseError, match="^DENOISE_NOT_READY$"):
        denoiser.enhance(audio(np.ones(1600) * 0.1))


def test_resampling_preserves_alignment_tail_length_and_identity(tmp_path, monkeypatch):
    """Missing delay padding or wrong resampling ratios shift/drop real speech."""
    denoiser = runtime(tmp_path)
    seen_dirs = []
    def native_process(command, **kwargs):
        source = Path(command[-1])
        seen_dirs.append(source.parent)
        values, rate = sf.read(source, dtype="float32")
        assert rate == 48000
        assert "--compensate-delay" in command
        assert len(values) >= 16003 * 3 + 1440
        assert len(values) % 480 == 0
        output = Path(command[command.index("-o") + 1])
        output.mkdir()
        # Stand-in for native compensation: delay removed but original samples retained.
        sf.write(output / source.name, values[:-1440], 48000, subtype="FLOAT")
        return subprocess.CompletedProcess(command, 0)
    monkeypatch.setattr("stt.denoise.subprocess.run", native_process)
    original = audio(0.2 * np.sin(2 * np.pi * 440 * np.arange(16003) / 16000))
    result = denoiser.enhance(original)
    assert result.sample_rate == 16000
    assert result.frame_count == 16003
    assert result.duration_ms == original.duration_ms
    assert result.utterance_ref == "utterance:original"
    assert result.waveform.dtype == np.float32
    assert not result.waveform.flags.writeable
    np.testing.assert_allclose(result.waveform[50:-50], original.waveform[50:-50], atol=0.001)
    assert abs(result.waveform[-20:]).max() > 0.1
    assert all(not directory.exists() for directory in seen_dirs)


@pytest.mark.parametrize("kind", ["timeout", "exit", "invalid", "missing", "short", "nan"])
def test_native_failures_are_sanitized_and_temporary_audio_removed(tmp_path, monkeypatch, kind):
    from stt.denoise import DenoiseError
    denoiser = runtime(tmp_path)
    directories = []
    monkeypatch.setenv("HF_TOKEN", "secret-token")
    def fail(command, **kwargs):
        directories.append(Path(command[-1]).parent)
        assert "HF_TOKEN" not in kwargs["env"]
        assert kwargs["stdout"] == subprocess.DEVNULL
        assert kwargs["stderr"] == subprocess.DEVNULL
        if kind == "timeout":
            raise subprocess.TimeoutExpired(command, 1, output=b"private speech")
        if kind == "exit":
            raise subprocess.CalledProcessError(1, command, stderr=b"private speech")
        output = Path(command[command.index("-o") + 1])
        output.mkdir()
        destination = output / Path(command[-1]).name
        if kind == "invalid":
            destination.write_bytes(b"not wave")
        elif kind == "short":
            sf.write(destination, np.zeros(10), 48000)
        elif kind == "nan":
            sf.write(destination, np.full(4800, np.nan), 48000, subtype="FLOAT")
        return subprocess.CompletedProcess(command, 0)
    monkeypatch.setattr("stt.denoise.subprocess.run", fail)
    with pytest.raises(DenoiseError) as error:
        denoiser.enhance(audio(np.ones(1600) * 0.1))
    assert str(error.value).startswith("DENOISE_")
    assert "private" not in str(error.value)
    assert "secret" not in str(error.value)
    assert error.value.__suppress_context__
    assert all(not directory.exists() for directory in directories)


@pytest.mark.parametrize("waveform", [np.array([]), np.array([np.nan]), np.ones((10, 2))])
def test_invalid_audio_rejected_before_native_process(tmp_path, waveform):
    from stt.denoise import DenoiseError
    with pytest.raises(DenoiseError, match="DENOISE_INVALID_AUDIO"):
        runtime(tmp_path).enhance(audio(waveform))


def test_native_runtime_smoke_preserves_silent_duration_and_quietens_noise():
    from stt.denoise import DeepFilterDenoiser
    denoiser = DeepFilterDenoiser()
    if not denoiser.ready():
        pytest.skip("Optional native DeepFilterNet executable is not installed")
    signal = np.random.default_rng(7).normal(0, 0.03, 16000).astype(np.float32)
    result = denoiser.enhance(audio(signal))
    assert result.frame_count == 16000
    assert np.isfinite(result.waveform).all()
    assert np.sqrt(np.mean(result.waveform[8000:] ** 2)) < 0.015


def test_long_file_chunk_joins_preserve_samples_and_final_tail(tmp_path, monkeypatch):
    denoiser = runtime(tmp_path)
    lengths = []
    directories = []

    def native_process(command, **kwargs):
        source = Path(command[-1])
        directories.append(source.parent)
        values, rate = sf.read(source, dtype='float32')
        lengths.append(len(values))
        output = Path(command[command.index('-o') + 1])
        output.mkdir()
        sf.write(output / source.name, values[:-1440], rate, subtype='FLOAT')
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr('stt.denoise.subprocess.run', native_process)
    frames = 51 * 16000 + 13
    original = audio(0.2 * np.sin(2 * np.pi * 440 * np.arange(frames) / 16000))
    result = denoiser.enhance(original)
    assert len(lengths) == 3
    assert max(lengths) <= 27 * 48000 + 1440 + 480
    assert result.frame_count == frames
    assert result.utterance_ref == original.utterance_ref
    np.testing.assert_allclose(result.waveform[50:-50], original.waveform[50:-50], atol=0.001)
    assert abs(result.waveform[-20:]).max() > 0.1
    assert all(not directory.exists() for directory in directories)
