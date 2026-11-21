"""Tải bộ dữ liệu PhoNER_COVID19 (VinAI, NAACL 2021), bản theo từ, để fine-tune lớp NER che PII.

Giấy phép của VinAI: chỉ dùng cho nghiên cứu hoặc giáo dục, không phân phối lại dưới mọi hình thức,
trích dẫn bài NAACL 2021 khi công bố kết quả. Dữ liệu chỉ nằm trong models/ner/ (gitignore).

    .venv-stt\\Scripts\\python -m stt.download_phoner --dong-y-giay-phep
"""
import argparse
import datetime
import hashlib
import json
import os
import sys
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REPO = 'VinAIResearch/PhoNER_COVID19'
COMMIT = '9af190aa76adcfad0a2d14fab9bcab2b252c9c2e'
FILES = {
    'train_word.json': '0686f29542592435b536c350706e280b58440dd23634fc161bc1a0544702a44c',
    'dev_word.json': '64ce7daafe9576fb7a849126e1829c0fb714a29a2e4d6f2a572957996add8377',
    'test_word.json': '5a10741ca499c2232db702f326eae03224f62b72aeadc9437a9fa1683708a2df',
}
DIEU_KHOAN = """Điều khoản của PhoNER_COVID19 (VinAI):
  - chỉ dùng cho mục đích nghiên cứu hoặc giáo dục;
  - không phân phối lại bộ dữ liệu hay một phần của nó, dù nguyên gốc hay đã sửa;
  - trích dẫn bài "COVID-19 Named Entity Recognition for Vietnamese" (NAACL 2021) khi công bố kết quả.
Chạy lại với --dong-y-giay-phep nếu đồng ý."""


def data_dir() -> Path:
    configured = Path(os.environ.get('NER_DATA_DIR', 'models/ner/phoner-covid19'))
    return configured if configured.is_absolute() else PROJECT_ROOT / configured


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description='Tải PhoNER_COVID19 bản theo từ.')
    parser.add_argument('--dir', type=Path, default=None)
    parser.add_argument('--dong-y-giay-phep', action='store_true')
    args = parser.parse_args(argv)
    if not args.dong_y_giay_phep:
        print(DIEU_KHOAN)
        sys.exit(2)
    target = args.dir or data_dir()
    blobs = {}
    for name, expected in FILES.items():
        data = fetch(f'https://raw.githubusercontent.com/{REPO}/{COMMIT}/data/word/{name}')
        if sha256(data) != expected:
            raise RuntimeError(f'PhoNER checksum mismatch: {name}')
        blobs[name] = data
    target.mkdir(parents=True, exist_ok=True)
    for name, data in blobs.items():
        (target / name).write_bytes(data)
    provenance = {'repo': REPO, 'commit': COMMIT, 'sha256': dict(FILES),
                  'tai_luc': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')}
    (target / 'nguon.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'PhoNER_COVID19 sẵn sàng ở {target}')


if __name__ == '__main__':
    main()
