"""Lớp NER che PII lúc chạy: tách từ (VnCoreNLP) → gắn nhãn (PhoBERT ONNX int8) → đoạn theo vị trí UTF-16 trên chuỗi NFC.

Không bao giờ log nội dung văn bản. Thiếu mô hình hay Java thì `ready()` là False, dịch vụ STT vẫn chạy bình thường.
"""
import json
import logging
import os
import threading
import unicodedata
from pathlib import Path
from typing import Callable, Protocol

from stt.ner_text import bio_spans, to_utf16, word_offsets

logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def model_dir() -> Path:
    configured = Path(os.environ.get('NER_MODEL_DIR', 'models/ner/phobert-phoner'))
    return configured if configured.is_absolute() else PROJECT_ROOT / configured


class WordTagger(Protocol):
    def tag_words(self, words: list[str]) -> list[tuple[str, float]]: ...


def windows(n: int, size: int, stride: int) -> list[tuple[int, int]]:
    """Cửa sổ [start, end) phủ n phần tử, mỗi cửa sổ dài tối đa `size`, hai cửa sổ liền nhau chồng `stride` phần tử."""
    if n <= size:
        return [(0, n)]
    out, start, step = [], 0, size - stride
    while True:
        end = min(start + size, n)
        out.append((start, end))
        if end == n:
            return out
        start += step


def stitch_windows(wins: list[tuple[int, int]], per_window: list[list[tuple[str, float]]], n: int) -> list[tuple[str, float]]:
    """Ghép dự đoán các cửa sổ: mỗi từ lấy dự đoán từ cửa sổ mà nó nằm xa mép nhất."""
    out = []
    for i in range(n):
        best, best_margin = ('O', 1.0), -1
        for (start, end), tags in zip(wins, per_window):
            if start <= i < end:
                margin = min(i - start, end - 1 - i)
                if margin > best_margin:
                    best, best_margin = tags[i - start], margin
        out.append(best)
    return out


class OnnxWordTagger:
    """PhoBERT ONNX int8: subword đầu của mỗi từ quyết định nhãn của từ. Câu dài chia cửa sổ theo từ."""

    def __init__(self, directory: Path):
        import numpy as np
        import onnxruntime
        from tokenizers import Tokenizer
        self._np = np
        meta = json.loads((directory / 'meta.json').read_text(encoding='utf-8'))
        self.labels = json.loads((directory / 'labels.json').read_text(encoding='utf-8'))
        self.max_len = int(meta.get('max_len', 256))
        self.tokenizer = Tokenizer.from_file(str(directory / 'tokenizer.json'))
        self.bos, self.eos, self.unk = (self.tokenizer.token_to_id(t) for t in ('<s>', '</s>', '<unk>'))
        # tokenizer.json có nhiều token hơn mô hình: id vượt vocab_size là <unk> (giống lúc huấn luyện, stt/ner_train.py).
        self.vocab_size = int(meta.get('vocab_size', 64001))
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = max(1, (os.cpu_count() or 4) // 2)
        self.session = onnxruntime.InferenceSession(str(directory / 'model.int8.onnx'), options, providers=['CPUExecutionProvider'])
        self.window_words = max(8, (self.max_len - 2) // 2)
        self.stride_words = max(2, self.window_words // 4)
        self._lock = threading.Lock()

    def _tag_window(self, words: list[str]) -> list[tuple[str, float]]:
        np = self._np
        ids, first = [self.bos], []
        for word in words:
            pieces = [i if i < self.vocab_size else self.unk
                      for i in (self.tokenizer.encode(word, add_special_tokens=False).ids or [self.unk])]
            if len(ids) + len(pieces) + 1 > self.max_len:
                break
            first.append(len(ids))
            ids += pieces
        ids.append(self.eos)
        array = np.array([ids], dtype=np.int64)
        with self._lock:
            logits = self.session.run(['logits'], {'input_ids': array, 'attention_mask': np.ones_like(array)})[0][0]
        exp = np.exp(logits - logits.max(-1, keepdims=True))
        probs = exp / exp.sum(-1, keepdims=True)
        out = [(self.labels[int(probs[p].argmax())], float(probs[p].max())) for p in first]
        return out + [('O', 1.0)] * (len(words) - len(out))  # từ bị cắt vì quá max_len

    def tag_words(self, words: list[str]) -> list[tuple[str, float]]:
        wins = windows(len(words), self.window_words, self.stride_words)
        return stitch_windows(wins, [self._tag_window(words[s:e]) for s, e in wins], len(words))


MODEL_FILES = ('meta.json', 'labels.json', 'tokenizer.json', 'model.int8.onnx')


class NerNotReady(RuntimeError):
    pass


class LocalNer:
    """Nạp mô hình lúc gọi `tag` lần đầu (không làm chậm khởi động STT). `ready()` chỉ kiểm file, không nạp."""

    def __init__(self, segment: Callable[[str], list[str]] | None = None, tagger: WordTagger | None = None,
                 meta: dict | None = None, model_dir: Path | str | None = None):
        self._segment, self._tagger, self._meta = segment, tagger, meta
        self._dir = Path(model_dir) if model_dir else globals()['model_dir']()
        self._failed = False
        self._lock = threading.Lock()

    def _loaded(self) -> bool:
        return self._segment is not None and self._tagger is not None and self._meta is not None

    def _ensure(self) -> None:
        with self._lock:
            if self._loaded() or self._failed:
                return
            try:
                meta = json.loads((self._dir / 'meta.json').read_text(encoding='utf-8'))
                tagger = OnnxWordTagger(self._dir)
                from stt.ner_segment import make_segmenter
                segment = make_segmenter()
            except Exception as error:  # thiếu mô hình, Java hay thư viện: NER không chạy, STT vẫn chạy
                logger.info('NER không sẵn sàng: %s', type(error).__name__)
                self._failed = True
                return
            self._segment, self._tagger, self._meta = segment, tagger, meta

    def ready(self) -> bool:
        if self._loaded():
            return True
        return not self._failed and all((self._dir / name).is_file() for name in MODEL_FILES)

    def meta(self) -> dict:
        return {'model_sha256': self._meta['model_sha256'], 'nguong': self._meta['nguong']}

    def tag(self, texts: list[str]) -> list[list[dict]]:
        self._ensure()
        if not self._loaded():
            raise NerNotReady('NER_NOT_READY')
        out = []
        for raw in texts:
            text = unicodedata.normalize('NFC', raw)
            if not text.strip():
                out.append([])
                continue
            words = self._segment(text)
            offsets = word_offsets(text, words)
            tagged = self._tagger.tag_words(words)
            spans = []
            for start, end, kind, score in bio_spans([t for t, _ in tagged], [s for _, s in tagged]):
                a, b = offsets[start][0], offsets[end - 1][1]
                spans.append({'start': to_utf16(text, a), 'end': to_utf16(text, b), 'nhan': kind, 'diem': round(score, 4)})
            out.append(spans)
        return out
