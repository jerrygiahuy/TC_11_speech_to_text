"""Pinned Silero ONNX artifact from the official sherpa-onnx release."""
import hashlib
import urllib.request
from stt.vad import model_path

URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx'
SHA256 = '9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6'


def main():
    target = model_path()
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == SHA256:
        print('Silero VAD ready'); return
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.partial')
    urllib.request.urlretrieve(URL, temporary)
    if hashlib.sha256(temporary.read_bytes()).hexdigest() != SHA256:
        temporary.unlink(missing_ok=True)
        raise RuntimeError('VAD checksum mismatch')
    temporary.replace(target)
    print('Silero VAD ready')


if __name__ == '__main__': main()
