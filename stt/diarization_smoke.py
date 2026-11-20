"""Real-model regression: Vietnamese same-speaker 5+3s and a synthetic A/B/A conversation."""
import json
import numpy as np
import soundfile as sf

from stt.audio import CanonicalAudio
from stt.diarization import LocalDiarizer, SpeakerProfiles
from stt.diarized_sessions import SessionStore
from stt.engine import LocalEngine
from stt.model_artifacts import model_directory
from stt.download_diarization import ROOT


def main():
    first, rate = sf.read(model_directory() / 'test_wavs/0.wav', dtype='float32')
    second, _ = sf.read(model_directory() / 'test_wavs/1.wav', dtype='float32')
    eight_seconds = np.tile(first, 3)[:128000]
    diarizer = LocalDiarizer()
    engine = LocalEngine()
    sessions = SessionStore(engine, diarizer)
    key = sessions.create()['session_id']
    try:
        for sequence, (start, end) in enumerate([(0, 80000), (80000, 128000)], 1):
            samples = eight_seconds[start:end]
            result = sessions.process(key, sequence, start, CanonicalAudio(samples, rate, len(samples), round(len(samples) / 16), str(sequence)))
        baseline = engine.transcribe(CanonicalAudio(eight_seconds, rate, 128000, 8000, 'baseline'))
        assert result['transcript'] == baseline.transcript, '5+3s reconstruction differs from one-pass 8s'
        assert {word['speaker'] for word in result['words']} == {1}, 'Same speaker fragmented into multiple IDs'
        print(json.dumps({'check': '5+3=8', 'speaker': 1, 'matches_one_pass': True, 'transcript': result['transcript']}, ensure_ascii=False))
        # Source WAVs are actual Vietnamese recordings; reuse clips to construct known A/B/A order.
        conversation = np.concatenate([eight_seconds, np.zeros(8000, dtype=np.float32), np.tile(second, 2), np.zeros(8000, dtype=np.float32), first])
        sf.write(ROOT / 'test-two-vi.wav', conversation, rate, subtype='PCM_16')
        regions = diarizer.regions(conversation, SpeakerProfiles())
        order = []
        for region in regions:
            if region.speaker and (not order or order[-1] != region.speaker):
                order.append(region.speaker)
        assert order == [1, 2, 1], f'Unexpected speaker order: {order}'
        print(json.dumps({'check': 'Vietnamese A/B/A', 'speaker_order': order,
                          'regions': [{'start': round(region.start, 2), 'end': round(region.end, 2), 'speaker': region.speaker} for region in regions]}))
    finally:
        sessions.close(key)
        engine.close()


if __name__ == '__main__':
    main()
