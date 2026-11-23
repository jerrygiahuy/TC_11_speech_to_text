"""Hàm thuần cho lớp NER che PII, dùng chung lúc huấn luyện (stt/ner_train.py) và lúc chạy (stt/ner.py).

Quy ước: một "từ" là chuỗi âm tiết nối bằng `_` (cách VnCoreNLP và PhoNER_COVID19 tách từ); nhãn theo BIO.
"""
import re
import unicodedata
from pathlib import Path
from typing import Callable

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUNCT = set('.,;:!?…"\'()-–—“”‘’[]/')


def _is_punct(word: str) -> bool:
    return bool(word) and all(ch in PUNCT for ch in word)


def stt_style(words: list[str], tags: list[str]) -> tuple[list[str], list[str]]:
    """Bản giống chữ STT: viết thường, bỏ token chỉ gồm dấu câu (cùng nhãn của nó)."""
    kept = [(w.lower(), t) for w, t in zip(words, tags) if not _is_punct(w)]
    return [w for w, _ in kept], [t for _, t in kept]


# Năm dấu thanh (huyền, sắc, ngã, hỏi, nặng) ở dạng tổ hợp NFD.
_TONE_MARKS = frozenset('̣̀́̃̉')


def _syllable_key(syllable: str) -> tuple[str, str]:
    """Khóa so âm tiết không phụ thuộc chỗ đặt dấu thanh ("hòa" và "hoà" như nhau), vẫn phân biệt dấu khác nhau."""
    decomposed = unicodedata.normalize('NFD', syllable.lower())
    base = unicodedata.normalize('NFC', ''.join(ch for ch in decomposed if ch not in _TONE_MARKS))
    return base, ''.join(sorted(ch for ch in decomposed if ch in _TONE_MARKS))


def word_offsets(text: str, words: list[str]) -> list[tuple[int, int]]:
    """Vị trí (code point) của từng từ đã tách trên `text`. Giữa các âm tiết của một từ có thể có ≥ 1 khoảng trắng.

    RDRSegmenter có thể đổi dấu thanh kiểu cũ sang kiểu mới ("hòa" → "hoà"); hai kiểu cùng số ký tự NFC nên so bằng `_syllable_key`.
    """
    out = []
    i = 0
    lower = text.lower()
    for word in words:
        syllables = [s for s in word.split('_') if s] or [word]
        start = None
        for syllable in syllables:
            while i < len(text) and text[i].isspace():
                i += 1
            if _syllable_key(lower[i:i + len(syllable)]) != _syllable_key(syllable):
                raise ValueError('word_offsets: từ không khớp văn bản')
            if start is None:
                start = i
            i += len(syllable)
        out.append((start, i))
    return out


def to_utf16(text: str, offset: int) -> int:
    """Đổi vị trí code point sang đơn vị UTF-16 (chỉ số chuỗi của JS)."""
    return len(text[:offset].encode('utf-16-le')) // 2


def bio_spans(tags: list[str], scores: list[float]) -> list[tuple[int, int, str, float]]:
    """Gộp nhãn BIO thành (từ đầu, từ cuối không gồm, loại, điểm trung bình). `I-X` sau `O`/loại khác coi như `B-X`."""
    spans = []
    current = None
    for i, (tag, score) in enumerate(zip(tags, scores)):
        kind = tag[2:] if tag[:2] in ('B-', 'I-') else None
        if kind and tag.startswith('I-') and current and current[2] == kind:
            current[1] = i + 1
            current[3].append(score)
            continue
        if current:
            spans.append(current)
        current = [i, i + 1, kind, [score]] if kind else None
    if current:
        spans.append(current)
    return [(s, e, k, round(sum(v) / len(v), 6)) for s, e, k, v in spans]


QUOC_GIA = {'hàn_quốc', 'trung_quốc', 'hà_lan', 'thái_lan', 'triều_tiên', 'đài_loan', 'mã_lai', 'phần_lan', 'tân_tây_lan'}


def relabel_full_names(words: list[str], tags: list[str], ho: set[str]) -> list[str]:
    """PhoNER chỉ gắn NAME cho bệnh nhân. Gắn lại B-NAME cho từ đang `O` mà mọi âm tiết viết hoa,
    có ≥ 2 âm tiết và âm tiết đầu là họ Việt (tên bác sĩ, người nhà, quan chức...). Bỏ tên quốc gia."""
    out = list(tags)
    for i, (word, tag) in enumerate(zip(words, tags)):
        syllables = word.split('_')
        if (tag == 'O' and len(syllables) >= 2 and syllables[0].lower() in ho and word.lower() not in QUOC_GIA
                and all(s[:1].isupper() and s[:1].isalpha() for s in syllables)):
            out[i] = 'B-NAME'
    return out


def resegment(words: list[str], tags: list[str], segment: Callable[[str], list[str]]) -> tuple[list[str], list[str]] | None:
    """Tách từ lại bằng `segment` (như lúc chạy) và chiếu nhãn từ âm tiết sang từ mới. Âm tiết không khớp thì trả None."""
    syllables, syllable_tags = [], []
    for word, tag in zip(words, tags):
        parts = word.split('_')
        for j, part in enumerate(parts):
            syllables.append(part)
            syllable_tags.append(tag if j == 0 or tag == 'O' else 'I-' + tag[2:])
    new_words = segment(' '.join(syllables))
    new_tags, k = [], 0
    for word in new_words:
        parts = word.split('_')
        if syllables[k:k + len(parts)] != parts:
            return None
        entity = next((t for t in syllable_tags[k:k + len(parts)] if t != 'O'), 'O')
        new_tags.append(entity)
        k += len(parts)
    if k != len(syllables):
        return None
    return new_words, new_tags


def load_ho_viet(path: Path | None = None) -> set[str]:
    """Đọc danh sách họ HO_VIET từ src/shared/clinical/pii/ho-viet.ts (một nguồn duy nhất cho TS và Python)."""
    source = (path or PROJECT_ROOT / 'src' / 'shared' / 'clinical' / 'pii' / 'ho-viet.ts').read_text(encoding='utf-8')
    block = re.search(r'HO_VIET[^=]*=\s*\[(.*?)\]', source, re.S).group(1)
    return {unicodedata.normalize('NFC', m) for m in re.findall(r'"([^"]+)"', block)}
