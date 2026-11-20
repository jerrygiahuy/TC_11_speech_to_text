"""Local acoustic diarization + approximate token-time attribution, with session-only IDs."""
from dataclasses import dataclass
import unicodedata

import numpy as np

from stt.download_diarization import ROOT


@dataclass(frozen=True)
class Region:
    start: float
    end: float
    speaker: int | None
    cluster: int | None = None


class SpeakerProfiles:
    def __init__(self):
        self.vectors: list[np.ndarray] = []
        self.observations: list[int] = []

    def identify(self, embedding, *, excluded: set[int] | None = None) -> int | None:
        vector = np.asarray(embedding, dtype=np.float32)
        if vector.ndim != 1 or vector.size == 0 or (self.vectors and vector.shape != self.vectors[0].shape):
            return None
        with np.errstate(over="ignore", invalid="ignore"):
            norm = float(np.linalg.norm(vector))
        if not np.isfinite(vector).all() or not np.isfinite(norm) or norm < 1e-8:
            return None
        vector = vector / norm
        scores = [float(vector @ profile) for profile in self.vectors]
        if scores:
            best = int(np.argmax(scores))
            margin = scores[best] - max((score for i, score in enumerate(scores) if i != best), default=-1)
            if margin < 0.08:
                return None
            if scores[best] >= 0.55:
                if best + 1 in (excluded or set()):
                    return None
                # Learn from confident observations only; bound the weight of any
                # single rolling-window observation rather than replacing the voice.
                if scores[best] >= 0.8 and margin >= 0.15:
                    weight = 1 / min(self.observations[best] + 1, 20)
                    combined = (1 - weight) * self.vectors[best] + weight * vector
                    self.vectors[best] = combined / np.linalg.norm(combined)
                    self.observations[best] += 1
                return best + 1
            # A weak mismatch is not enough evidence to create a new identity.
            if scores[best] >= 0.45:
                return None
        if len(self.vectors) < 2:
            self.vectors.append(vector.copy())
            self.observations.append(1)
            return len(self.vectors)
        return None


def tokens_to_words(tokens, timestamps, duration: float) -> list[dict]:
    if len(tokens) != len(timestamps):
        raise ValueError('STT_TOKEN_TIMESTAMPS_MISSING')
    words = []
    # Model có lúc trả riêng một token dấu cách rồi mới đến chữ ("▁", "À"): token đó vẫn báo bắt đầu từ mới.
    new_word = False
    for index, (token, timestamp) in enumerate(zip(tokens, timestamps)):
        token = token.replace('▁', ' ')
        if not token.strip():
            new_word = True
            continue
        if new_word and not token[0].isspace():
            token = ' ' + token
        new_word = False
        start = max(0, round(float(timestamp) * 1000))
        end = min(round(duration * 1000), start + 800,
                  round(float(timestamps[index + 1]) * 1000) if index + 1 < len(tokens) else round(duration * 1000))
        text = unicodedata.normalize('NFC', token).lower()
        if token[0].isspace() or not words:
            words.append({'text': text.strip(), 'start_ms': start, 'end_ms': max(start, end)})
        else:
            words[-1]['text'] = unicodedata.normalize('NFC', words[-1]['text'] + text)
            words[-1]['end_ms'] = max(start, end)
    return words


def attribute_words(words: list[dict], regions: list[Region]) -> list[dict]:
    output = []
    for word in words:
        # Transducer timestamps are emission estimates, not forced alignment.
        start = word['start_ms'] / 1000
        end = max(start + 0.001, min(word['end_ms'] / 1000, start + 0.16))
        # The estimated end may include a pause or the next turn. Trust at most
        # 160ms near emission; never borrow a voice across a silent gap.
        active = [region for region in regions if region.start < end and region.end > start]
        speakers = {region.speaker for region in active}
        def cluster(region):
            return region.cluster if region.cluster is not None else region.speaker if region.speaker is not None else id(region)
        overlap = any(cluster(a) != cluster(b) and min(a.end, b.end, end) > max(a.start, b.start, start)
                      for i, a in enumerate(active) for b in active[i + 1:])
        # Require most of the trusted interval to be covered, and no conflicting
        # sequential turn. Sequential changes are uncertain, not overlapping speech.
        # Measure the union: duplicate same-cluster segments are not extra speech.
        covered = 0.0
        cursor = start
        for left, right in sorted((max(region.start, start), min(region.end, end)) for region in active):
            covered += max(0.0, right - max(left, cursor))
            cursor = max(cursor, right)
        output.append({**word, 'speaker': next(iter(speakers)) if len(speakers) == 1 and not overlap and covered >= 0.6 * (end-start) else None,
                       'overlap': overlap})
    return output


def clean_speech(samples, regions: list[Region], cluster: int, max_frames: int | None = 6 * 16000) -> np.ndarray:
    """Pool available speech, subtracting overlap rather than dropping a whole turn."""
    intervals = []
    for region in regions:
        if region.cluster != cluster:
            continue
        pieces = [(max(0, round(region.start * 16000)), min(len(samples), round(region.end * 16000)))]
        for other in regions:
            if other.cluster == cluster:
                continue
            left, right = round(other.start * 16000), round(other.end * 16000)
            pieces = [(a, b) for start, end in pieces for a, b in
                      ((start, min(end, left)), (max(start, right), end)) if b > a]
        intervals.extend((a, b) for a, b in pieces if b > a)
    # Merge repeated/adjacent regions so duplicated segmentation cannot overcount.
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]: merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else: merged.append((start, end))
    return np.concatenate([samples[start:end] for start, end in merged])[:max_frames] if merged else np.empty(0, dtype=np.float32)


class LocalDiarizer:
    def __init__(self):
        self._model = None
        self._extractor = None

    def ready(self):
        return all((ROOT / name).is_file() for name in ('segmentation-model.onnx', 'nemo_en_titanet_small.onnx'))

    def _load(self):
        if self._model is not None:
            return
        if not self.ready():
            raise RuntimeError('DIARIZATION_MODEL_MISSING')
        import sherpa_onnx as sherpa
        embedding = sherpa.SpeakerEmbeddingExtractorConfig(model=str(ROOT / 'nemo_en_titanet_small.onnx'), num_threads=2, provider='cpu')
        config = sherpa.OfflineSpeakerDiarizationConfig(
            segmentation=sherpa.OfflineSpeakerSegmentationModelConfig(
                pyannote=sherpa.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(ROOT / 'segmentation-model.onnx'), window_shift_ratio=0.5),
                num_threads=2, provider='cpu'), embedding=embedding,
            clustering=sherpa.FastClusteringConfig(num_clusters=-1, threshold=0.5),
            min_duration_on=0.2, min_duration_off=0.3)
        if not config.validate():
            raise RuntimeError('DIARIZATION_MODEL_INVALID')
        self._model = sherpa.OfflineSpeakerDiarization(config)
        self._extractor = sherpa.SpeakerEmbeddingExtractor(embedding)

    def enrollment_embedding(self, samples) -> tuple[np.ndarray, float]:
        """Đặc trưng giọng của người đọc đoạn đăng ký: lấy giọng nói nhiều nhất, trung bình embedding từng khúc 6 giây."""
        from stt.voice_profiles import MAX_OTHER_SPEAKER_RATIO, MIN_SPEECH_SECONDS, VoiceProfileError
        self._load()
        samples = np.asarray(samples, dtype=np.float32)
        segments = [Region(max(0, r.start), min(len(samples) / 16000, r.end), None, r.speaker)
                    for r in self._model.process(samples).sort_by_start_time()]
        durations: dict[int, float] = {}
        for region in segments:
            durations[region.cluster] = durations.get(region.cluster, 0.0) + max(0.0, region.end - region.start)
        if not durations:
            raise VoiceProfileError('VOICE_ENROLL_NO_SPEECH')
        main = max(durations, key=durations.get)
        if any(seconds > durations[main] * MAX_OTHER_SPEAKER_RATIO for cluster, seconds in durations.items() if cluster != main):
            raise VoiceProfileError('VOICE_ENROLL_MULTIPLE_SPEAKERS')
        speech = clean_speech(samples, segments, main, max_frames=None)
        if len(speech) < MIN_SPEECH_SECONDS * 16000:
            raise VoiceProfileError('VOICE_ENROLL_TOO_SHORT')
        vectors = []
        for start in range(0, len(speech) - 3 * 16000 + 1, 6 * 16000):
            stream = self._extractor.create_stream()
            stream.accept_waveform(16000, speech[start:start + 6 * 16000])
            stream.input_finished()
            if self._extractor.is_ready(stream):
                vector = np.asarray(self._extractor.compute(stream), dtype=np.float32)
                vectors.append(vector / np.linalg.norm(vector))
        if not vectors:
            raise VoiceProfileError('VOICE_ENROLL_TOO_SHORT')
        mean = np.mean(vectors, axis=0)
        return mean / np.linalg.norm(mean), len(speech) / 16000

    def regions(self, samples, profiles: SpeakerProfiles) -> list[Region]:
        self._load()
        if len(samples) < 8000:
            return []
        segments = self._model.process(np.asarray(samples, dtype=np.float32)).sort_by_start_time()
        duration = len(samples) / 16000
        segments = [Region(max(0, region.start), min(duration, region.end), None, region.speaker)
                    for region in segments if min(duration, region.end) > max(0, region.start)]
        mapping = {}
        # Stable first-occurrence ordering preserves the session's initial IDs.
        for cluster in dict.fromkeys(region.cluster for region in segments):
            clean = clean_speech(samples, segments, cluster)
            mapping[cluster] = None
            if len(clean) >= 12800:
                stream = self._extractor.create_stream()
                stream.accept_waveform(16000, clean)
                stream.input_finished()
                if self._extractor.is_ready(stream):
                    # Different local clusters may be fragments of the same voice.
                    # They must not share an identity when active simultaneously.
                    excluded = {mapping[other.cluster] for region in segments if region.cluster == cluster
                                for other in segments if other.cluster in mapping and other.cluster != cluster
                                and min(region.end, other.end) > max(region.start, other.start)
                                and mapping[other.cluster] is not None}
                    mapping[cluster] = profiles.identify(self._extractor.compute(stream), excluded=excluded)
        return [Region(region.start, region.end, mapping[region.cluster], region.cluster) for region in segments]
