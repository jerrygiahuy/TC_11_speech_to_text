"""Tách từ tiếng Việt bằng RDRSegmenter của VnCoreNLP (GPL-3.0), chạy trong tiến trình qua pyjnius.

Không dùng `py_vncorenlp`: hàm tải của nó gọi `wget` (Windows không có) và hàm khởi tạo đổi thư mục
làm việc của cả tiến trình mà không trả lại. Ở đây chỉ tải bộ tách từ (jar + 2 file), ghim commit và mã băm.
"""
import hashlib
import os
import threading
import urllib.request
from pathlib import Path
from typing import Callable

PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMMIT = '62bbc58fe5d113c898eae112656be97dcf50b3a0'
BASE_URL = f'https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/{COMMIT}/'
JAR = 'VnCoreNLP-1.2.jar'
FILES = {
    JAR: '9e2811cdbc2ddfc71d04be5dc36e185c88dcd1ad4d5d69e4ff2e1369dccf7793',
    'models/wordsegmenter/vi-vocab': '0a47c5b55bbce163029d37730a67b9479740388695c29c106c112b815613eaa5',
    'models/wordsegmenter/wordsegmenter.rdr': '9e62f96bd93e37a24f364238e8d8ae986fa5dad6dbc9f4eae622ab3651b7fa06',
}


def model_dir() -> Path:
    configured = Path(os.environ.get('NER_VNCORENLP_DIR', 'models/ner/vncorenlp'))
    return configured if configured.is_absolute() else PROJECT_ROOT / configured


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def download(directory: Path | None = None) -> None:
    root = Path(directory) if directory else model_dir()
    for name, expected in FILES.items():
        target = root / name
        if target.is_file() and sha256(target.read_bytes()) == expected:
            continue
        data = fetch(BASE_URL + name)
        if sha256(data) != expected:
            raise RuntimeError(f'VnCoreNLP checksum mismatch: {name}')
        target.parent.mkdir(parents=True, exist_ok=True)
        partial = target.with_name(target.name + '.partial')
        partial.write_bytes(data)
        partial.replace(target)


def _ready(root: Path) -> bool:
    return all((root / name).is_file() for name in FILES)


_jvm_lock = threading.Lock()


def make_segmenter(directory: Path | None = None, heap: str = '-Xmx512m') -> Callable[[str], list[str]]:
    """Trả hàm tách từ: chuỗi → các từ, âm tiết trong một từ nối bằng `_`. Thiếu mô hình hay Java thì ném RuntimeError."""
    root = Path(directory) if directory else model_dir()
    if not _ready(root):
        raise RuntimeError('NER_SEGMENTER_MISSING')
    with _jvm_lock:
        try:
            import jnius_config
            if not jnius_config.vm_running:
                jnius_config.add_options(heap)
                jnius_config.set_classpath(str(root / JAR))
            from jnius import autoclass
        except Exception as error:  # thiếu JVM / JAVA_HOME
            raise RuntimeError('NER_JAVA_MISSING') from error
        # VnCoreNLP đọc mô hình theo đường dẫn tương đối "models/...": đổi thư mục lúc nạp rồi trả lại ngay.
        cwd = os.getcwd()
        os.chdir(root)
        try:
            model = autoclass('vn.pipeline.VnCoreNLP')(['wseg'])
        finally:
            os.chdir(cwd)
        annotation_class = autoclass('vn.pipeline.Annotation')
        string_class = autoclass('java.lang.String')
    call_lock = threading.Lock()

    def segment(text: str) -> list[str]:
        with call_lock:
            annotation = annotation_class(string_class(text))
            model.annotate(annotation)
            output = annotation.toString()
        words = []
        for line in output.split('\n'):
            if line.strip():
                words.append(line.replace('\t\t', '\t').split('\t')[1])
        return words

    return segment
