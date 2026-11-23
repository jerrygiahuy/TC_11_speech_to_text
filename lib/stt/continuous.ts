import { encodePcm16WavFromChunks } from "./audio";
import { openBrowserMicPipeline, type MicPipeline } from "./microphone";
import { PcmSegmenter, SegmentQueue } from "./session";
import type { SpeakerWord } from "./speakers";

export type SttResult = { transcript: string; inference_ms: number; audio_ms: number; no_speech: boolean; model_id?: string;
  words?: SpeakerWord[]; replace_from_ms?: number; stable_until_ms?: number; final?: boolean; chunk_audio_ms?: number;
  /** Chỉ có ở kết quả chốt phiên xin so giọng: người nói khớp giọng bác sĩ đã đăng ký (null nếu không rõ) */
  voice_match?: { speaker: number | null; scores: (number | null)[] } };
export type ContinuousCapture = { stop(): Promise<void>; cancel(): void };
type Options = {
  transcribe(wav: Blob): Promise<SttResult>;
  onResult(result: SttResult): void;
  onError(error: unknown, sequence?: number): void;
  onElapsed(seconds: number): void;
  onPending(count: number): void;
  onStopping(): void;
  onStopped(): void;
  onFinish?(): Promise<void>;
  onCancel?(): void;
  /** Độ dài tối đa mỗi đoạn gửi đi (mẫu 16 kHz); ngắn hơn thì chữ hiện sớm hơn. Mặc định 5 giây. */
  segmentFrames?: number;
};

export async function openContinuousSession(options: Options, open: () => Promise<MicPipeline> = openBrowserMicPipeline): Promise<ContinuousCapture> {
  const pipeline = await open();
  let cancelled = false;
  let finished: Promise<void> | null = null;
  const overflow: Int16Array[] = [];
  const started = Date.now();
  const timer = setInterval(() => options.onElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
  const queue = new SegmentQueue(async (pcm) => {
    const result = await options.transcribe(encodePcm16WavFromChunks([pcm]));
    if (!cancelled) options.onResult(result);
  }, (error, sequence) => options.onError(error, sequence), 12, options.onPending);
  const segmenter = new PcmSegmenter((pcm) => {
    if (overflow.length) { overflow.push(pcm); return; }
    try { queue.add(pcm); }
    catch (error) {
      // Keep the final overflow segment, stop capture, and drain in order.
      overflow.push(pcm);
      options.onError(error);
      void stop().catch((cause) => options.onError(cause));
    }
  }, options.segmentFrames);
  pipeline.onChunk = (pcm) => { if (!cancelled) segmenter.push(pcm); };
  pipeline.onError = (code) => { options.onError(new Error(code)); void stop().catch((cause) => options.onError(cause)); };

  function stop(): Promise<void> {
    if (finished) return finished;
    options.onStopping();
    clearInterval(timer);
    // Schedule once before flushing, so reentrant final audio cannot start another drain.
    finished = Promise.resolve().then(async () => {
      try { await pipeline.flush(); }
      catch (error) { if (!cancelled) options.onError(error); }
      finally { pipeline.onChunk = null; pipeline.close(); }
      if (cancelled) return;
      segmenter.finish();
      await queue.drain();
      for (const pcm of overflow) {
        if (cancelled) break;
        queue.add(pcm);
        await queue.drain();
      }
      overflow.length = 0;
      if (!cancelled) await options.onFinish?.();
    }).finally(() => { if (!cancelled) options.onStopped(); });
    return finished;
  }

  return {
    stop,
    cancel() {
      cancelled = true;
      clearInterval(timer);
      pipeline.onChunk = null; pipeline.onError = null; pipeline.close();
      queue.cancel(); overflow.length = 0;
      options.onCancel?.();
    },
  };
}

export async function transcribeWav(wav: Blob, signal: AbortSignal): Promise<SttResult> {
  const response = await fetch("/api/stt", {
    method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav, signal,
  });
  const data = await response.json();
  if (!response.ok) {
    if (data.detail === "AUDIO_SILENT") return { transcript: "", no_speech: true, inference_ms: 0, audio_ms: (wav.size - 44) / 32 };
    throw new Error(data.detail || "STT_INFERENCE_FAILED");
  }
  return data;
}
