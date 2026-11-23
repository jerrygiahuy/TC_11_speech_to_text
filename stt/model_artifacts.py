"""STT-only constants from P-018's pinned model manifest."""
import json
import os
from pathlib import Path

ZIPFORMER_MODEL_ID = "csukuangfj/sherpa-onnx-zipformer-vi-int8-2025-04-20"
ZIPFORMER_CONFIGURED_REVISION = "b2745a435379992ad3f299635468db0c34918e1e"
ZIPFORMER_ENCODER = "encoder-epoch-12-avg-8.int8.onnx"
ZIPFORMER_DECODER = "decoder-epoch-12-avg-8.onnx"
ZIPFORMER_JOINER = "joiner-epoch-12-avg-8.int8.onnx"
ZIPFORMER_TOKENS = "tokens.txt"
ZIPFORMER_BPE_MODEL = "bpe.model"
MODEL_FILES = (ZIPFORMER_ENCODER, ZIPFORMER_DECODER, ZIPFORMER_JOINER,
               ZIPFORMER_TOKENS, ZIPFORMER_BPE_MODEL)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def model_directory() -> Path:
    configured = Path(os.environ.get("STT_MODEL_DIR", "models/stt/zipformer-vi"))
    return configured if configured.is_absolute() else PROJECT_ROOT / configured


def inspect_model(path: Path) -> dict:
    missing = [name for name in MODEL_FILES if not (path / name).is_file() or (path / name).stat().st_size < 100]
    try:
        metadata = json.loads((path / "provision.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        metadata = {}
    verified = (metadata.get("model_id") == ZIPFORMER_MODEL_ID
                and metadata.get("revision") == ZIPFORMER_CONFIGURED_REVISION)
    return {"ready": not missing and verified, "missing_files": missing,
            "revision_verified": verified, "model_id": ZIPFORMER_MODEL_ID,
            "revision": ZIPFORMER_CONFIGURED_REVISION}
