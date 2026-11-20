"""Editable contextual biasing, re-read between requests; does not alter model weights."""
import json
import os
from pathlib import Path
import unicodedata

from stt.model_artifacts import PROJECT_ROOT


def load_hotwords(path: Path | None = None) -> tuple[str, ...]:
    path = path or Path(os.environ.get('STT_HOTWORDS_FILE', str(PROJECT_ROOT / 'config/stt-hotwords.json')))
    try:
        if path.stat().st_size > 65536:
            raise ValueError()
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        phrases = data['phrases']
        if not isinstance(phrases, list) or len(phrases) > 200:
            raise ValueError()
        normalized = []
        for phrase in phrases:
            if not isinstance(phrase, str) or len(phrase) > 120 or any(char in phrase for char in '/:\n\r\x00'):
                raise ValueError()
            folded = ' '.join(unicodedata.normalize('NFC', phrase).lower().split())
            if folded:
                normalized.append(folded)
        return tuple(dict.fromkeys(normalized))
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise ValueError('STT_HOTWORDS_INVALID') from error
