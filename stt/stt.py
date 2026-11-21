import unicodedata
from pathlib import Path
from time import perf_counter
from typing import Any, Protocol

from stt.audio import CanonicalAudio
from stt.contracts import SpeechRecognitionResult
from stt.errors import VoiceNoSpeechError
from stt.model_artifacts import (
    ZIPFORMER_BPE_MODEL,
    ZIPFORMER_DECODER,
    ZIPFORMER_ENCODER,
    ZIPFORMER_JOINER,
    ZIPFORMER_TOKENS,
)
from stt.hotwords import COMMAND_HOTWORDS, to_sherpa_hotwords, write_hotwords_file


class SpeechToTextAdapter(Protocol):
    def transcribe(self, audio: CanonicalAudio, hotwords: tuple[str, ...] = ()) -> SpeechRecognitionResult: ...


class ZipformerAdapter:
    def __init__(
        self,
        *,
        recognizer: Any,
        model_id: str,
        configured_revision: str,
        resolved_revision: str | None,
    ) -> None:
        self._recognizer = recognizer
        self._model_id = model_id
        self._configured_revision = configured_revision
        self._resolved_revision = resolved_revision

    @classmethod
    def load(
        cls,
        *,
        model_path: Path,
        model_id: str,
        configured_revision: str,
        resolved_revision: str | None,
        hotwords_score: float,
        work_dir: Path,
    ) -> "ZipformerAdapter":
        import sherpa_onnx

        # Hotwords are encoded with the BPE vocabulary, which the model ships only as bpe.model.
        # Both generated files go to the worker's scratch directory so the artifact stays pristine.
        bpe_vocab = work_dir / "bpe.vocab"
        _export_bpe_vocab(model_path / ZIPFORMER_BPE_MODEL, bpe_vocab)
        hotwords_file = work_dir / "hotwords.txt"
        write_hotwords_file(COMMAND_HOTWORDS, hotwords_file)
        recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=str(model_path / ZIPFORMER_ENCODER),
            decoder=str(model_path / ZIPFORMER_DECODER),
            joiner=str(model_path / ZIPFORMER_JOINER),
            tokens=str(model_path / ZIPFORMER_TOKENS),
            num_threads=2,
            sample_rate=16_000,
            feature_dim=80,
            decoding_method="modified_beam_search",
            hotwords_file=str(hotwords_file),
            hotwords_score=hotwords_score,
            modeling_unit="bpe",
            bpe_vocab=str(bpe_vocab),
            provider="cpu",
        )
        return cls(
            recognizer=recognizer,
            model_id=model_id,
            configured_revision=configured_revision,
            resolved_revision=resolved_revision,
        )

    def transcribe(self, audio: CanonicalAudio, hotwords: tuple[str, ...] = ()) -> SpeechRecognitionResult:
        started_at = perf_counter()
        turn_hotwords = to_sherpa_hotwords(hotwords)
        stream = (
            self._recognizer.create_stream(hotwords=turn_hotwords)
            if turn_hotwords
            else self._recognizer.create_stream()
        )
        stream.accept_waveform(audio.sample_rate, audio.waveform)
        self._recognizer.decode_stream(stream)
        # The model spells in upper case; the rest of the pipeline reads and repeats lower case.
        transcript = unicodedata.normalize("NFC", stream.result.text).lower().strip()
        if not transcript:
            raise VoiceNoSpeechError()
        return SpeechRecognitionResult(
            utterance_ref=audio.utterance_ref,
            transcript=transcript,
            confidence=None,
            language="vi",
            model_id=self._model_id,
            configured_revision=self._configured_revision,
            resolved_revision=self._resolved_revision,
            inference_ms=max(0, round((perf_counter() - started_at) * 1_000)),
            tokens=tuple(getattr(stream.result, 'tokens', ())),
            timestamps=tuple(getattr(stream.result, 'timestamps', ())),
        )


def _export_bpe_vocab(bpe_model: Path, destination: Path) -> None:
    import sentencepiece

    processor = sentencepiece.SentencePieceProcessor()
    processor.load(str(bpe_model))
    lines = (
        f"{processor.id_to_piece(piece_id)}\t{processor.get_score(piece_id)}\n"
        for piece_id in range(processor.get_piece_size())
    )
    destination.write_text("".join(lines), encoding="utf-8")
