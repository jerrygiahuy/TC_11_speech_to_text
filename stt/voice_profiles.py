"""Đặc trưng giọng bác sĩ đã đăng ký, để tự nhận ra giọng bác sĩ trong phiên ghi âm.

Chỉ lưu một vector TitaNet (đặc trưng giọng, dữ liệu sinh trắc học) cho mỗi mã bác sĩ, trên máy chạy
prototype, trong thư mục bị Git bỏ qua. Không lưu âm thanh đăng ký. Bác sĩ xóa được bất cứ lúc nào.
"""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re

import numpy as np

DEFAULT_DIR = Path(__file__).resolve().parent.parent / 'data' / 'giong-bac-si'
_ID = re.compile(r'^[A-Za-z0-9_-]{1,64}$')
MODEL = 'nemo_en_titanet_small'
# Đo trên TitaNet-Small: hai đoạn cùng giọng giống nhau 0,82–0,95; giọng khác nhau tối đa 0,54.
MATCH_MIN = 0.6
MATCH_MARGIN = 0.15
# Lời nói tối thiểu của người đăng ký, và giọng thứ hai không được quá 30% thời lượng người đăng ký.
MIN_SPEECH_SECONDS = 8.0
MAX_OTHER_SPEAKER_RATIO = 0.3


class VoiceProfileError(Exception):
    def __init__(self, code: str, status: int = 400):
        self.code = code
        self.status = status
        super().__init__(code)


def _unit(vector) -> np.ndarray:
    vector = np.asarray(vector, dtype=np.float32)
    norm = float(np.linalg.norm(vector)) if vector.ndim == 1 and vector.size else 0.0
    if not np.isfinite(vector).all() or not np.isfinite(norm) or norm < 1e-8:
        raise VoiceProfileError('VOICE_EMBEDDING_INVALID', 422)
    return vector / norm


class VoiceProfileStore:
    def __init__(self, directory: str | Path | None = None):
        self.directory = Path(directory or os.environ.get('VOICE_PROFILE_DIR') or DEFAULT_DIR)

    def _path(self, doctor_id: str) -> Path:
        if not _ID.fullmatch(doctor_id or ''):
            raise VoiceProfileError('VOICE_ID_INVALID')
        return self.directory / f'{doctor_id}.json'

    def get(self, doctor_id: str) -> dict | None:
        path = self._path(doctor_id)
        if not path.is_file():
            return None
        data = json.loads(path.read_text(encoding='utf-8'))
        if data.get('model') != MODEL:
            return None
        return {**data, 'vector': _unit(data['vector'])}

    def status(self, doctor_id: str) -> dict:
        data = self.get(doctor_id)
        if not data:
            return {'enrolled': False}
        return {'enrolled': True, 'created_at': data['created_at'], 'speech_seconds': data['speech_seconds']}

    def save(self, doctor_id: str, vector, speech_seconds: float) -> dict:
        path = self._path(doctor_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {'model': MODEL, 'vector': [round(float(v), 6) for v in _unit(vector)],
                'speech_seconds': round(float(speech_seconds), 1),
                'created_at': datetime.now(timezone.utc).isoformat(timespec='seconds')}
        tmp = path.with_suffix('.tmp')
        tmp.write_text(json.dumps(data), encoding='utf-8')
        tmp.replace(path)
        return self.status(doctor_id)

    def delete(self, doctor_id: str) -> None:
        self._path(doctor_id).unlink(missing_ok=True)


def match_speaker(enrolled, speaker_vectors: list) -> dict:
    """So giọng đã đăng ký với hồ sơ giọng Người nói 1, 2 của phiên. Chỉ trả speaker khi khớp rõ."""
    target = _unit(enrolled)
    scores = []
    for vector in speaker_vectors:
        try:
            scores.append(round(float(target @ _unit(vector)), 3))
        except VoiceProfileError:
            scores.append(None)
    valid = [(score, index) for index, score in enumerate(scores) if score is not None]
    speaker = None
    if valid:
        best, index = max(valid)
        others = [score for score, other in valid if other != index]
        if best >= MATCH_MIN and best - max(others, default=-1.0) >= MATCH_MARGIN:
            speaker = index + 1
    return {'speaker': speaker, 'scores': scores}
