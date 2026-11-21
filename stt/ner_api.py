"""Router `POST /ner` cho lớp NER che PII. Gắn vào stt/api.py (cùng tiến trình STT)."""
from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from stt.ner import LocalNer, NerNotReady

MAX_TEXTS = 50
MAX_CHARS = 50_000


def create_ner_router(ner: LocalNer) -> APIRouter:
    router = APIRouter()

    @router.post('/ner')
    async def tag(request: Request):
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(400, 'NER_INPUT_INVALID') from None
        texts = body.get('texts') if isinstance(body, dict) else None
        if (not isinstance(texts, list) or len(texts) > MAX_TEXTS
                or not all(isinstance(t, str) and len(t) <= MAX_CHARS for t in texts)):
            raise HTTPException(400, 'NER_INPUT_INVALID')
        if not ner.ready():
            raise HTTPException(503, 'NER_NOT_READY')
        try:
            ket_qua = await run_in_threadpool(ner.tag, texts)
        except NerNotReady:
            raise HTTPException(503, 'NER_NOT_READY') from None
        return {**ner.meta(), 'ket_qua': ket_qua}

    return router
