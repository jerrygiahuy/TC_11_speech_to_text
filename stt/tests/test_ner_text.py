import pytest

from stt.ner_text import bio_spans, load_ho_viet, relabel_full_names, resegment, stt_style, to_utf16, word_offsets


def test_stt_style_lowercases_and_drops_punct():
    assert stt_style(['Bệnh_nhân', 'Nguyễn_Văn_A', ',', 'ở', 'Hà_Nội', '.'],
                     ['O', 'B-NAME', 'O', 'O', 'B-LOCATION', 'O']) == (
        ['bệnh_nhân', 'nguyễn_văn_a', 'ở', 'hà_nội'], ['O', 'B-NAME', 'O', 'B-LOCATION'])


def test_word_offsets_maps_underscored_words_back():
    text = 'chị  nguyễn thị lan,ở thủ đức'
    assert word_offsets(text, ['chị', 'nguyễn_thị_lan', ',', 'ở', 'thủ_đức']) == [(0, 3), (5, 19), (19, 20), (20, 21), (22, 29)]


def test_word_offsets_raises_on_mismatch():
    with pytest.raises(ValueError):
        word_offsets('đau ngực', ['đau', 'tim'])


def test_word_offsets_accepts_moved_tone_mark():
    # RDRSegmenter đổi dấu thanh kiểu cũ sang kiểu mới: "hòa" → "hoà", "thủy" → "thuỷ".
    text = 'bệnh viện hòa bình, thủy nguyên'
    assert word_offsets(text, ['bệnh_viện', 'hoà_bình', ',', 'thuỷ_nguyên']) == [(0, 9), (10, 18), (18, 19), (20, 31)]


def test_word_offsets_still_rejects_other_tone():
    with pytest.raises(ValueError):
        word_offsets('hòa bình', ['hoá_bình'])


def test_to_utf16_counts_astral_as_two():
    assert to_utf16('😀 lan', 2) == 3


def test_bio_spans_merges_and_tolerates_orphan_i():
    assert bio_spans(['O', 'B-NAME', 'I-NAME', 'O', 'I-LOCATION'], [1, 1.0, 0.5, 1, 0.75]) == [(1, 3, 'NAME', 0.75), (4, 5, 'LOCATION', 0.75)]


def test_relabel_full_names_only_capitalized_words_starting_with_surname():
    ho = {'nguyễn', 'hà', 'trần'}
    words = ['ông', 'Nguyễn_Trung_Nguyên', 'ở', 'Hà_Nội', 'gặp', 'Bộ_Y_tế', 'và', 'Trần', 'người_bệnh']
    tags = ['O', 'O', 'O', 'B-LOCATION', 'O', 'B-ORGANIZATION', 'O', 'O', 'O']
    assert relabel_full_names(words, tags, ho) == ['O', 'B-NAME', 'O', 'B-LOCATION', 'O', 'B-ORGANIZATION', 'O', 'O', 'O']


def test_relabel_full_names_skips_country_names():
    ho = {'hàn', 'hà', 'trung'}
    assert relabel_full_names(['người', 'Hàn_Quốc', 'Hà_Lan', 'Trung_Quốc'], ['O'] * 4, ho) == ['O'] * 4


def test_resegment_projects_labels_onto_new_words():
    # bộ tách từ viết thường ra "nguyễn_thị lan" thay vì "nguyễn_thị_lan"
    segment = lambda text: ['chị', 'nguyễn_thị', 'lan', 'ở', 'thủ_đức']
    assert resegment(['chị', 'nguyễn_thị_lan', 'ở', 'thủ_đức'], ['O', 'B-NAME', 'O', 'B-LOCATION'], segment) == (
        ['chị', 'nguyễn_thị', 'lan', 'ở', 'thủ_đức'], ['O', 'B-NAME', 'I-NAME', 'O', 'B-LOCATION'])


def test_resegment_returns_none_when_syllables_differ():
    assert resegment(['đau', 'ngực'], ['O', 'O'], lambda text: ['đau_ngực_x']) is None


def test_load_ho_viet_reads_project_list():
    ho = load_ho_viet()
    assert {'nguyễn', 'trần', 'lê'} <= ho and len(ho) > 100
