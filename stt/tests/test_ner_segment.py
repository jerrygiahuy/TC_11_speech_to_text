import pytest

from stt import ner_segment


def test_download_rejects_checksum_mismatch(tmp_path, monkeypatch):
    monkeypatch.setattr(ner_segment, 'fetch', lambda url: b'sai')
    with pytest.raises(RuntimeError, match='checksum'):
        ner_segment.download(tmp_path)
    assert not any(p.is_file() for p in tmp_path.rglob('*'))


def test_download_skips_files_already_verified(tmp_path, monkeypatch):
    calls = []
    def fetch(url):
        calls.append(url)
        return next(content for name, content in FAKE.items() if url.endswith(name))
    FAKE = {name.split('/')[-1]: name.encode() for name in ner_segment.FILES}
    monkeypatch.setattr(ner_segment, 'FILES', {name: ner_segment.sha256(name.encode()) for name in ner_segment.FILES})
    monkeypatch.setattr(ner_segment, 'fetch', fetch)
    ner_segment.download(tmp_path)
    assert (tmp_path / 'models' / 'wordsegmenter' / 'vi-vocab').read_bytes() == b'models/wordsegmenter/vi-vocab'
    first = len(calls)
    ner_segment.download(tmp_path)
    assert len(calls) == first


def test_make_segmenter_raises_when_model_missing(tmp_path):
    with pytest.raises(RuntimeError, match='NER_SEGMENTER_MISSING'):
        ner_segment.make_segmenter(tmp_path)
