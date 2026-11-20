"""P-018 hotword encoding; application-specific command bias removed."""
import re
import unicodedata
from collections.abc import Iterable
from pathlib import Path

COMMAND_HOTWORDS: tuple[str, ...] = ()


def _sherpa_phrase(phrase: str) -> str:
    # The model's BPE tokens are upper case, and "/" separates phrases in a stream's hotwords.
    folded = re.sub(r"\s+", " ", unicodedata.normalize("NFC", phrase)).strip().upper()
    return "" if "/" in folded else folded


def _sherpa_phrases(phrases: Iterable[str]) -> list[str]:
    return [folded for folded in map(_sherpa_phrase, phrases) if folded]


def to_sherpa_hotwords(phrases: Iterable[str]) -> str:
    return "/".join(_sherpa_phrases(phrases))


def write_hotwords_file(phrases: Iterable[str], path: Path) -> None:
    path.write_text("".join(f"{phrase}\n" for phrase in _sherpa_phrases(phrases)), encoding="utf-8")
