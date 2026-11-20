from fastapi.testclient import TestClient

from stt.api import create_app
from stt.ner import LocalNer, stitch_windows, windows
from stt.ner_text import bio_spans
from stt.tests.test_api import Engine
from stt.tests.vad_helpers import AllSpeech


class FakeTagger:
    def tag_words(self, words):
        return [('B-NAME', .9) if w == 'nguyễn_thị_lan' else ('O', 1.0) for w in words]


def fake_segment(text):
    return text.replace('nguyễn thị lan', 'nguyễn_thị_lan').split()


META = {'model_sha256': 'x' * 64, 'nguong': 0.5}


def test_ner_endpoint_returns_utf16_offsets(caplog):
    ner = LocalNer(fake_segment, FakeTagger(), META)
    with TestClient(create_app(Engine(), vad=AllSpeech(), ner=ner)) as c:
        r = c.post('/ner', json={'texts': ['😀 chị nguyễn thị lan đau họng']})
    assert r.status_code == 200
    assert r.json() == {'model_sha256': 'x' * 64, 'nguong': 0.5,
                        'ket_qua': [[{'start': 7, 'end': 21, 'nhan': 'NAME', 'diem': 0.9}]]}
    assert 'nguyễn' not in caplog.text


def test_ner_normalizes_nfd_input_before_offsets():
    ner = LocalNer(fake_segment, FakeTagger(), META)
    nfd = 'chị nguyễn thị lan'
    assert ner.tag([nfd]) == [[{'start': 4, 'end': 18, 'nhan': 'NAME', 'diem': 0.9}]]


def test_ner_not_ready_is_503_and_health_reports_it():
    with TestClient(create_app(Engine(), vad=AllSpeech(), ner=LocalNer(model_dir='khong-co'))) as c:
        assert c.post('/ner', json={'texts': ['a']}).json() == {'detail': 'NER_NOT_READY'}
        assert c.get('/health').json()['ner_ready'] is False


def test_rejects_bad_input():
    ner = LocalNer(fake_segment, FakeTagger(), META)
    with TestClient(create_app(Engine(), vad=AllSpeech(), ner=ner)) as c:
        for body in [{}, {'texts': 'a'}, {'texts': [1]}, {'texts': ['a'] * 51}, {'texts': ['a' * 50_001]}]:
            r = c.post('/ner', json=body)
            assert r.status_code == 400 and r.json() == {'detail': 'NER_INPUT_INVALID'}


def test_empty_text_returns_empty_list():
    ner = LocalNer(fake_segment, FakeTagger(), META)
    assert ner.tag(['', '   ']) == [[], []]


def test_windows_cover_all_tokens_with_overlap():
    assert windows(10, 4, 2) == [(0, 4), (2, 6), (4, 8), (6, 10)]
    assert windows(3, 4, 2) == [(0, 3)]


def test_entity_across_window_boundary_is_one_span():
    # Từ nằm trong vùng chồng lấn lấy dự đoán từ cửa sổ mà từ đó xa mép hơn
    tags = stitch_windows([(0, 4), (2, 6)], [[('O', 1.0), ('O', 1.0), ('B-NAME', 1.0), ('I-NAME', 1.0)],
                                             [('B-NAME', 1.0), ('I-NAME', 1.0), ('I-NAME', 1.0), ('O', 1.0)]], 6)
    assert bio_spans([t for t, _ in tags], [s for _, s in tags]) == [(2, 5, 'NAME', 1.0)]
