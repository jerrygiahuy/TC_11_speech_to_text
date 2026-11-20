"""Thử một lần (Task 1 plan NER): onnxruntime + tokenizers + bộ tách từ VnCoreNLP có ở chung tiến trình
với sherpa-onnx (Zipformer) được không, và tốn thêm bao nhiêu RAM.

Kết luận ngày 18/11/2026: xem docs/CHANGELOG.md mục "Task 1 NER".

    .venv-stt\\Scripts\\python -m stt.ner_probe
"""
import ctypes
import ctypes.wintypes
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def rss_mb() -> float:
    if sys.platform != 'win32':
        import resource
        return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024

    class Counters(ctypes.Structure):
        _fields_ = [('cb', ctypes.wintypes.DWORD), ('PageFaultCount', ctypes.wintypes.DWORD),
                    ('PeakWorkingSetSize', ctypes.c_size_t), ('WorkingSetSize', ctypes.c_size_t),
                    ('QuotaPeakPagedPoolUsage', ctypes.c_size_t), ('QuotaPagedPoolUsage', ctypes.c_size_t),
                    ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t), ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
                    ('PagefileUsage', ctypes.c_size_t), ('PeakPagefileUsage', ctypes.c_size_t)]
    counters = Counters()
    counters.cb = ctypes.sizeof(Counters)
    psapi = ctypes.WinDLL('psapi')
    kernel = ctypes.WinDLL('kernel32')
    kernel.GetCurrentProcess.restype = ctypes.wintypes.HANDLE
    psapi.GetProcessMemoryInfo.argtypes = [ctypes.wintypes.HANDLE, ctypes.POINTER(Counters), ctypes.wintypes.DWORD]
    psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb)
    return counters.WorkingSetSize / 2**20


def step(label: str, start: float) -> None:
    print(f'{label:<40} RSS {rss_mb():7.1f} MB  (+{rss_mb() - start:6.1f})', flush=True)


def main() -> None:
    from stt.audio import decode_canonical_wav
    from stt.engine import LocalEngine
    from stt.model_artifacts import model_directory
    from stt import ner_segment

    base = rss_mb()
    step('bắt đầu', base)
    engine = LocalEngine()
    wav = sorted((model_directory() / 'test_wavs').glob('*.wav'))[0]
    result = engine.transcribe(decode_canonical_wav(wav.read_bytes(), mime_type='audio/wav'))
    after_stt = rss_mb()
    step(f'Zipformer đã nạp ({len(result.transcript)} ký tự)', base)

    ner_segment.download()
    segment = ner_segment.make_segmenter()
    words = segment('chị nguyễn thị lan ở thủ đức đau họng')
    step('VnCoreNLP wseg đã nạp', base)
    print('   ', ' '.join(words))

    import onnxruntime
    import tokenizers  # noqa: F401
    session = onnxruntime.InferenceSession(str(PROJECT_ROOT / 'models' / 'silero_vad.onnx'), providers=['CPUExecutionProvider'])
    step(f'onnxruntime {onnxruntime.__version__} ({len(session.get_inputs())} input)', base)

    again = engine.transcribe(decode_canonical_wav(wav.read_bytes(), mime_type='audio/wav'))
    assert again.transcript == result.transcript, 'Zipformer cho kết quả khác sau khi nạp onnxruntime'
    step('Zipformer chạy lại sau onnxruntime: OK', base)
    print(f'Thêm cho NER (ngoài Zipformer): {rss_mb() - after_stt:.1f} MB')


if __name__ == '__main__':
    main()
