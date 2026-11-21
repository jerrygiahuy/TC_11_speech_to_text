from stt.ner_train import build_examples, collect_labels, entity_pr, pick_threshold, word_pieces


ROWS = [{'words': ['Ông', 'Nguyễn_Văn_An', ',', 'ở', 'Hà_Nội', '.'], 'tags': ['O', 'O', 'O', 'O', 'B-LOCATION', 'O']}]


def test_build_examples_relabels_and_adds_resegmented_stt_copy():
    segment = lambda text: ['ông', 'nguyễn_văn', 'an', 'ở', 'hà_nội']
    goc, stt = build_examples(ROWS, {'nguyễn', 'hà'}, segment)
    assert goc == [{'words': ROWS[0]['words'], 'tags': ['O', 'B-NAME', 'O', 'O', 'B-LOCATION', 'O']}]
    assert stt == [{'words': ['ông', 'nguyễn_văn', 'an', 'ở', 'hà_nội'], 'tags': ['O', 'B-NAME', 'I-NAME', 'O', 'B-LOCATION']}]


def test_build_examples_keeps_stt_style_when_resegment_fails():
    _, stt = build_examples(ROWS, {'nguyễn'}, lambda text: ['khác'])
    assert stt[0]['words'] == ['ông', 'nguyễn_văn_an', 'ở', 'hà_nội']


def test_collect_labels_puts_o_first():
    assert collect_labels([{'tags': ['B-NAME', 'O', 'I-NAME']}]) == ['O', 'B-NAME', 'I-NAME']


def test_word_pieces_labels_only_first_subword_and_truncates():
    encode = lambda word: [10, 11] if word == 'nguyễn_văn' else [12]
    ids, labels, first = word_pieces(['ông', 'nguyễn_văn', 'an'], [0, 1, 2], encode, bos=0, eos=2, max_len=5)
    assert ids == [0, 12, 10, 11, 2] and labels == [-100, 0, 1, -100, -100] and first == [1, 2]


def test_entity_pr_and_threshold_only_count_kept_types():
    gold = [[(0, 1, 'NAME'), (2, 3, 'DATE')]]
    pred = [[(0, 1, 'NAME', 0.9), (4, 5, 'LOCATION', 0.4), (2, 3, 'DATE', 0.99)]]
    assert entity_pr(gold, pred, 0.5) == (1.0, 1.0)
    assert entity_pr(gold, pred, 0.3) == (0.5, 1.0)
    assert pick_threshold(gold, pred, min_precision=0.85) == 0.5
