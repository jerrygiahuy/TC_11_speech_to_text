"""Explicit setup-only download: never processes audio or sends clinical data."""
import hashlib
import json
import os
from pathlib import Path

REPO = 'pyannote/speaker-diarization-community-1'


def main():
    from huggingface_hub import HfApi, get_token, snapshot_download
    if not get_token():
        raise SystemExit('COMMUNITY_ACCESS_REQUIRED: accept model conditions on Hugging Face and authenticate locally with hf auth login. Never paste tokens into chat.')
    target = Path(os.environ.get('STT_COMMUNITY_MODEL_DIR', 'models/community-1')).resolve()
    try:
        # Resolve a concrete revision once and record checksums for installed artifacts.
        revision = HfApi().model_info(REPO).sha
        snapshot_download(REPO, revision=revision, local_dir=target)
    except Exception:
        raise SystemExit('COMMUNITY_DOWNLOAD_FAILED: check model access and local Hugging Face authentication.') from None
    hashes = {str(p.relative_to(target)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in target.rglob('*') if p.is_file() and '.cache' not in p.parts and p.name != 'provision.json'}
    (target / 'provision.json').write_text(json.dumps({'repo': REPO, 'revision': revision, 'sha256': hashes}, indent=2), encoding='utf-8')
    print('Community-1 weights downloaded locally. No audio was uploaded.')


if __name__ == '__main__': main()
