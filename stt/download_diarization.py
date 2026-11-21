"""Pinned official sherpa-onnx speaker artifacts; safe selective archive extraction."""
import hashlib
import json
from pathlib import Path
import tarfile
import urllib.request

from stt.model_artifacts import PROJECT_ROOT

ROOT = PROJECT_ROOT / 'models/diarization'
ASSETS = {
    'segmentation.tar.bz2': ('speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2', '24615ee884c897d9d2ba09bb4d30da6bb1b15e685065962db5b02e76e4996488'),
    'nemo_en_titanet_small.onnx': ('speaker-recongition-models/nemo_en_titanet_small.onnx', 'ad4a1802485d8b34c722d2a9d04249662f2ece5d28a7a039063ca22f515a789e'),
    'test-four-speakers.wav': ('speaker-segmentation-models/0-four-speakers-zh.wav', 'bedf036caed208386c67b4ef4b11f83d74dd0d420b102163a1c33cd09cde7010'),
}


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, (asset, digest) in ASSETS.items():
        target = ROOT / name
        if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            temporary = ROOT / (name + '.partial')
            urllib.request.urlretrieve('https://github.com/k2-fsa/sherpa-onnx/releases/download/' + asset, temporary)
            if hashlib.sha256(temporary.read_bytes()).hexdigest() != digest:
                raise RuntimeError(f'Checksum mismatch: {name}')
            temporary.replace(target)
    with tarfile.open(ROOT / 'segmentation.tar.bz2', 'r:bz2') as archive:
        for name in ['model.onnx', 'LICENSE', 'README.md']:
            member = archive.getmember('sherpa-onnx-pyannote-segmentation-3-0/' + name)
            if not member.isfile() or member.size > 10_000_000:
                raise RuntimeError('Unexpected segmentation archive entry')
            with archive.extractfile(member) as source:
                (ROOT / ('segmentation-' + name)).write_bytes(source.read())
    (ROOT / 'provision.json').write_text(json.dumps({name: digest for name, (_, digest) in ASSETS.items()}, indent=2), encoding='utf-8')
    print(f'Diarization models ready: {ROOT}')


if __name__ == '__main__':
    main()
