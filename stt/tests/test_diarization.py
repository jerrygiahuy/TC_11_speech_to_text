import numpy as np
import pytest

from stt.diarization import SpeakerProfiles, Region, tokens_to_words, attribute_words


def test_bpe_tokens_become_timed_words_without_losing_word_fragments():
    words = tokens_to_words([' TÔI', ' BỊ', ' AM', 'OX', 'ICILLIN'], [0, 1, 2, 2.2, 2.5], 3)
    assert [word['text'] for word in words] == ['tôi', 'bị', 'amoxicillin']
    assert words[-1]['start_ms'] == 2000
    assert words[-1]['end_ms'] == 3000


def test_lone_space_token_starts_a_new_word():
    # Zipformer 70 MB trả "▁" riêng rồi mới đến "À": không được dính vào từ trước ("sốtà").
    words = tokens_to_words([' SỐT', '▁', 'À', ' BỆNH'], [0, 0.4, 0.5, 1], 2)
    assert [word['text'] for word in words] == ['sốt', 'à', 'bệnh']


def test_profiles_stay_stable_when_local_cluster_order_swaps():
    profiles = SpeakerProfiles()
    a, b = np.array([1., 0, 0]), np.array([0., 1, 0])
    assert profiles.identify(a) == 1
    assert profiles.identify(b) == 2
    assert profiles.identify(b) == 2
    assert profiles.identify(a) == 1
    assert profiles.identify(np.array([0., 0, 1])) is None


def test_words_follow_speaker_changes_inside_one_chunk_and_overlap_is_unknown():
    regions = [Region(0, 2, 1), Region(2, 4, 2), Region(4, 5, 1), Region(4.5, 5, 2)]
    words = tokens_to_words([' A', ' B', ' C', ' D'], [0.5, 2.2, 4.1, 4.6], 5)
    attributed = attribute_words(words, regions)
    assert [word['speaker'] for word in attributed] == [1, 2, 1, None]
    assert attributed[-1]['overlap'] is True


def test_unknown_region_never_inherits_the_previous_speaker():
    words = tokens_to_words([' CHƯA', ' RÕ'], [0, 1], 2)
    output = attribute_words(words, [Region(0, 2, None)])
    assert all(word['speaker'] is None for word in output)


def test_overlap_is_preserved_even_when_both_voices_are_unknown_or_map_to_same_id():
    words = tokens_to_words([' CHÀO'], [0.8], 2)
    for regions in ([Region(0, 2, None), Region(0.5, 1.5, None)],
                    [Region(0, 2, 1, cluster=0), Region(0.5, 1.5, 1, cluster=1)]):
        result = attribute_words(words, regions)[0]
        assert result['speaker'] is None
        assert result['overlap'] is True


def test_words_in_gaps_or_across_sequential_boundary_are_unknown_not_overlap():
    words = [{'text': 'gap', 'start_ms': 1100, 'end_ms': 1200},
             {'text': 'boundary', 'start_ms': 1950, 'end_ms': 2200}]
    result = attribute_words(words, [Region(0, 1, 1), Region(1.5, 2, 1), Region(2, 3, 2)])
    assert [word['speaker'] for word in result] == [None, None]
    assert not any(word['overlap'] for word in result)


def test_profiles_learn_only_confident_matches_and_reject_ambiguous_or_invalid_vectors():
    profiles = SpeakerProfiles()
    assert profiles.identify([1., 0., 0.]) == 1
    assert profiles.identify([0., 1., 0.]) == 2
    original = profiles.vectors[0].copy()
    assert profiles.identify([0.99, 0.1, 0.]) == 1
    assert not np.array_equal(profiles.vectors[0], original)
    before = [v.copy() for v in profiles.vectors]
    assert profiles.identify([1., 1., 0.]) is None
    for embedding in ([[1, 0, 0]], [0., 0.], [float('nan'), 0, 0], [1., 0.]):
        assert profiles.identify(embedding) is None
    for expected, actual in zip(before, profiles.vectors): np.testing.assert_array_equal(expected, actual)


def test_same_window_clusters_cannot_claim_the_same_session_speaker():
    profiles = SpeakerProfiles()
    assert profiles.identify([1., 0.]) == 1
    assert profiles.identify([0.99, 0.01], excluded={1}) is None
    assert len(profiles.vectors) == 1
    assert profiles.identify([0., 1.], excluded={1}) == 2


def test_clean_speech_retains_nonoverlapped_parts_and_clips_bounds():
    from stt.diarization import clean_speech
    samples = np.arange(64000, dtype=np.float32)
    regions = [Region(-1, 4.5, 1, 0), Region(1, 2, 2, 1)]
    result = clean_speech(samples, regions, 0)
    np.testing.assert_array_equal(result, np.concatenate([samples[:16000], samples[32000:]]))


def test_repeated_same_cluster_cannot_inflate_speaker_coverage():
    word = {'text': 'short', 'start_ms': 0, 'end_ms': 160}
    regions = [Region(0, 0.03, 1, cluster=0)] * 4
    result = attribute_words([word], regions)[0]
    assert result['speaker'] is None
    assert result['overlap'] is False


def test_overflowing_embedding_never_enrolls_or_mutates_a_profile():
    profiles = SpeakerProfiles()
    assert profiles.identify([1e38, 1e38]) is None
    assert profiles.vectors == []
    assert profiles.identify([1., 0.]) == 1
    before = profiles.vectors[0].copy()
    assert profiles.identify([1e38, 1e38]) is None
    np.testing.assert_array_equal(profiles.vectors[0], before)
