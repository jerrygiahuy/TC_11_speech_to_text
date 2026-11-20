from dataclasses import dataclass


@dataclass(frozen=True)
class SpeechRecognitionResult:
    utterance_ref: str
    transcript: str
    confidence: float | None
    language: str
    model_id: str
    configured_revision: str
    resolved_revision: str | None
    inference_ms: int
    tokens: tuple[str, ...] = ()
    timestamps: tuple[float, ...] = ()
