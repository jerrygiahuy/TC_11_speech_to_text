import json
import os
import struct
import sys
from types import ModuleType, SimpleNamespace
import wave

import numpy as np
import pytest

from stt.community import CommunityDiarizer, CommunityError


def _run_with_regions(regions, observed=None):
    def runner(command, *, env, timeout, **kwargs):
        if observed is not None:
            observed.update(env=env, timeout=timeout, command=command)
            wav_path = command[command.index("--audio") + 1]
            with wave.open(wav_path, "rb") as audio_file:
                observed["wav"] = (audio_file.getframerate(), audio_file.getnchannels(), audio_file.getnframes())
        result_path = command[command.index("--result") + 1]
        with open(result_path, "w", encoding="utf-8") as result:
            json.dump(regions, result)
    return runner


def _local_files(tmp_path):
    model = tmp_path / "model"
    model.mkdir(exist_ok=True)
    (model / "config.yaml").write_text("pipeline: local", encoding="utf-8")
    worker = tmp_path / "python.exe"
    worker.touch()
    return model, worker


def test_adapter_preserves_overlaps_clips_ranges_and_returns_stable_regions(tmp_path):
    observed = {}
    model, worker = _local_files(tmp_path)
    diarizer = CommunityDiarizer(
        model_dir=model, worker_python=worker,
        runner=_run_with_regions([
            {"start": -0.2, "end": 1.2, "speaker": 1},
            {"start": 0.7, "end": 2.5, "speaker": 2},
            {"start": 2.2, "end": 3.0, "speaker": 1},
        ], observed),
        memory_reader=lambda: 8 * 1024**3,
    )

    regions = diarizer.regions(np.zeros(32000, dtype=np.float32))

    assert [(r.start, r.end, r.speaker) for r in regions] == [
        (0.0, 1.2, 1), (0.7, 2.0, 2),
    ]
    assert observed["timeout"] == 1800
    assert observed["env"]["HF_HUB_OFFLINE"] == "1"
    assert observed["env"]["HF_HUB_DISABLE_TELEMETRY"] == "1"
    assert observed["env"]["PYANNOTE_METRICS_ENABLED"] == "0"
    assert not any("TOKEN" in key.upper() for key in observed["env"])
    assert observed["wav"] == (16000, 1, 32000)


def test_timeout_is_configurable_without_an_audio_duration_limit(tmp_path):
    observed = {}
    model, worker = _local_files(tmp_path)
    diarizer = CommunityDiarizer(
        model_dir=model, worker_python=worker,
        timeout_seconds=7200, runner=_run_with_regions([], observed),
        memory_reader=lambda: 8 * 1024**3,
    )

    diarizer.regions(np.zeros(16_000 * 3600, dtype=np.float32))

    assert observed["timeout"] == 7200


def test_missing_local_model_and_worker_have_distinct_safe_error_codes(tmp_path):
    model = tmp_path / "model"
    model.mkdir()
    worker = tmp_path / "community-python.exe"
    diarizer = CommunityDiarizer(model_dir=model, worker_python=worker, runner=lambda *a, **k: None,
                                 memory_reader=lambda: 8 * 1024**3)
    with pytest.raises(CommunityError) as missing_model:
        diarizer.regions(np.zeros(16000, dtype=np.float32))
    assert missing_model.value.reason_code == "COMMUNITY_MODEL_MISSING"

    model.joinpath("config.yaml").write_text("pipeline: local", encoding="utf-8")
    with pytest.raises(CommunityError) as missing_runtime:
        diarizer.regions(np.zeros(16000, dtype=np.float32))
    assert missing_runtime.value.reason_code == "COMMUNITY_RUNTIME_MISSING"


def test_ready_reports_local_model_and_runtime_presence(tmp_path):
    model = tmp_path / "model"
    model.mkdir()
    worker = tmp_path / "python.exe"
    diarizer = CommunityDiarizer(model_dir=model, worker_python=worker)
    assert diarizer.ready() is False
    (model / "config.yaml").write_text("pipeline: local", encoding="utf-8")
    worker.touch()
    assert diarizer.ready() is True


def test_low_memory_fails_before_starting_worker(tmp_path):
    model = tmp_path / "model"
    model.mkdir()
    (model / "config.yaml").write_text("pipeline: local", encoding="utf-8")
    worker = tmp_path / "python.exe"
    worker.touch()
    diarizer = CommunityDiarizer(
        model_dir=model, worker_python=worker, runner=lambda *a, **k: pytest.fail("worker started"),
        memory_reader=lambda: 3 * 1024**3,
    )

    with pytest.raises(CommunityError) as error:
        diarizer.regions(np.zeros(16000, dtype=np.float32))

    assert error.value.reason_code == "COMMUNITY_MEMORY_LOW"


@pytest.mark.parametrize("payload", [
    {"regions": []},
    [{"start": 0, "end": 1, "speaker": "speaker_1"}],
    [{"start": float("nan"), "end": 1, "speaker": 1}],
    [{"start": 0.8, "end": 0.2, "speaker": 1}],
    [{"start": 0, "end": 1, "speaker": -1}],
])
def test_malformed_worker_shapes_and_ranges_fail_safely(tmp_path, payload):
    model = tmp_path / "model"
    model.mkdir()
    (model / "config.yaml").write_text("pipeline: local", encoding="utf-8")
    worker = tmp_path / "python.exe"
    worker.touch()
    diarizer = CommunityDiarizer(
        model_dir=model, worker_python=worker, runner=_run_with_regions(payload),
        memory_reader=lambda: 8 * 1024**3,
    )

    with pytest.raises(CommunityError) as error:
        diarizer.regions(np.zeros(16000, dtype=np.float32))

    assert error.value.reason_code == "COMMUNITY_FAILED"


def test_worker_failure_never_exposes_exception_text(tmp_path):
    model = tmp_path / "model"
    model.mkdir()
    (model / "config.yaml").write_text("pipeline: local", encoding="utf-8")
    worker = tmp_path / "python.exe"
    worker.touch()
    def fail(*args, **kwargs):
        raise RuntimeError("secret token or private audio text")
    diarizer = CommunityDiarizer(
        model_dir=model, worker_python=worker, runner=fail,
        memory_reader=lambda: 8 * 1024**3,
    )

    with pytest.raises(CommunityError) as error:
        diarizer.regions(np.zeros(16000, dtype=np.float32))

    assert error.value.reason_code == "COMMUNITY_FAILED"
    assert "secret" not in str(error.value)


def test_worker_reads_full_diarization_from_pyannote_output_and_keeps_overlaps(tmp_path, monkeypatch):
    import stt.community_worker as worker

    model, _ = _local_files(tmp_path)
    audio = tmp_path / "audio.wav"
    with wave.open(str(audio), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(16000)
        target.writeframes(struct.pack("<h", 0) * 32000)
    result = tmp_path / "regions.json"
    seen = {}

    class Tensor:
        def unsqueeze(self, dimension):
            seen["dimension"] = dimension
            return self

    class Annotation:
        def itertracks(self, *, yield_label):
            assert yield_label is True
            yield SimpleNamespace(start=0.0, end=1.5), "track-a", "alice"
            yield SimpleNamespace(start=0.5, end=2.0), "track-b", "bob"

    torch = ModuleType("torch")
    torch.set_num_threads = lambda count: seen.update(threads=count)
    torch.from_numpy = lambda samples: Tensor()
    pyannote = ModuleType("pyannote")
    pyannote.__path__ = []
    audio_module = ModuleType("pyannote.audio")

    class Pipeline:
        @classmethod
        def from_pretrained(cls, path):
            assert os.environ["HF_HUB_OFFLINE"] == "1"
            assert os.environ["HF_HUB_DISABLE_TELEMETRY"] == "1"
            assert os.environ["PYANNOTE_METRICS_ENABLED"] == "0"
            seen["model"] = path
            return cls()

        def __call__(self, payload):
            seen["payload"] = payload
            return SimpleNamespace(speaker_diarization=Annotation())

    audio_module.Pipeline = Pipeline
    monkeypatch.setitem(sys.modules, "torch", torch)
    monkeypatch.setitem(sys.modules, "pyannote", pyannote)
    monkeypatch.setitem(sys.modules, "pyannote.audio", audio_module)

    worker._run(model, audio, result)

    assert seen["threads"] == 2
    assert seen["dimension"] == 0
    assert seen["payload"]["sample_rate"] == 16000
    assert "waveform" in seen["payload"]
    assert json.loads(result.read_text(encoding="utf-8")) == [
        {"start": 0.0, "end": 1.5, "speaker": 1},
        {"start": 0.5, "end": 2.0, "speaker": 2},
    ]

