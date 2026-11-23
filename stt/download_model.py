"""Provision only P-018's pinned STT snapshot; never runs during inference."""
import hashlib
import json
import os

# Avoid optional Xet/native transfer and global caches for a self-contained install.
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
from huggingface_hub import snapshot_download

from stt.model_artifacts import (MODEL_FILES, PROJECT_ROOT, ZIPFORMER_CONFIGURED_REVISION,
                                 ZIPFORMER_MODEL_ID, model_directory)


def main():
    destination = model_directory()
    snapshot_download(repo_id=ZIPFORMER_MODEL_ID, revision=ZIPFORMER_CONFIGURED_REVISION,
                      allow_patterns=[*MODEL_FILES, 'README.md', 'test_wavs/*', 'LICENSE*'],
                      local_dir=destination, cache_dir=PROJECT_ROOT / '.cache-stt/huggingface',
                      max_workers=2)
    hashes = {}
    for name in MODEL_FILES:
        path = destination / name
        if not path.is_file() or path.stat().st_size < 100:
            raise RuntimeError(f'Missing or incomplete artifact: {name}')
        hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    (destination / 'provision.json').write_text(json.dumps({
        'model_id': ZIPFORMER_MODEL_ID, 'revision': ZIPFORMER_CONFIGURED_REVISION,
        'sha256': hashes,
    }, indent=2), encoding='utf-8')
    print(f'STT model ready: {destination}')


if __name__ == '__main__':
    main()
