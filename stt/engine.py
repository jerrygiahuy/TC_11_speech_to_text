"""One CPU recognizer, loaded once and shared behind the API's lock."""
import tempfile
from threading import Lock

from stt.model_artifacts import inspect_model, model_directory
from stt.stt import ZipformerAdapter
from stt.terminology import load_hotwords


class LocalEngine:
    def __init__(self):
        self.lock = Lock()
        self._adapter = None
        self._scratch = None

    def status(self):
        return {**inspect_model(model_directory()), "loaded": self._adapter is not None,
                "backend": "sherpa-onnx", "provider": "cpu", "language": "vi"}

    def transcribe(self, audio):
        hotwords = load_hotwords()
        if self._adapter is None:
            status = self.status()
            if not status['ready']:
                raise FileNotFoundError('STT_MODEL_MISSING')
            self._scratch = tempfile.TemporaryDirectory(prefix='zipformer-')
            from pathlib import Path
            try:
                self._adapter = ZipformerAdapter.load(
                    model_path=model_directory(), model_id=status['model_id'],
                    configured_revision=status['revision'], resolved_revision=status['revision'],
                    hotwords_score=1.5, work_dir=Path(self._scratch.name))
            except Exception:
                self._scratch.cleanup()
                self._scratch = None
                raise
        return self._adapter.transcribe(audio, hotwords)

    def close(self):
        self._adapter = None
        if self._scratch:
            self._scratch.cleanup()
            self._scratch = None
