/** Continuous mono PCM16 segmentation. No session duration limit or microphone restarts. */
export class PcmSegmenter {
  private chunks: Int16Array[] = [];
  private frames = 0;
  private silentFrames = 0;
  /** maxFrames: cắt đoạn khi dài tới chừng này mẫu dù chưa ngắt nghỉ (mặc định 5 giây, tối đa 80000). */
  constructor(private readonly emit: (pcm: Int16Array) => void, private readonly maxFrames = 80000) {}

  push(input: Int16Array) {
    // Ten-millisecond analysis frames; split on a pause after at least one second.
    for (let offset = 0; offset < input.length;) {
      const frame = input.slice(offset, offset + Math.min(160, this.maxFrames - this.frames));
      offset += frame.length;
      let power = 0;
      for (const sample of frame) power += (sample / 32768) ** 2;
      this.silentFrames = Math.sqrt(power / frame.length) < 0.008 ? this.silentFrames + frame.length : 0;
      this.chunks.push(frame);
      this.frames += frame.length;
      if ((this.frames >= 16000 && this.silentFrames >= 9600) || this.frames >= this.maxFrames) this.finish();
    }
  }

  finish() {
    if (!this.frames) return;
    const pcm = new Int16Array(this.frames);
    let offset = 0;
    for (const chunk of this.chunks) { pcm.set(chunk, offset); offset += chunk.length; }
    this.chunks = []; this.frames = 0; this.silentFrames = 0;
    this.emit(pcm);
  }
}

/** Ordered inference with bounded audio memory, cancellation, and observable failures. */
export class SegmentQueue {
  private jobs: { pcm: Int16Array; sequence: number }[] = [];
  private running = false;
  private cancelled = false;
  private sequence = 0;
  private waiters: (() => void)[] = [];
  constructor(
    private readonly process: (pcm: Int16Array, sequence: number) => Promise<void>,
    private readonly onError: (error: unknown, sequence: number) => void,
    private readonly limit = 12,
    private readonly onPending: (pending: number) => void = () => {},
  ) {}
  get pending() { return this.jobs.length + Number(this.running); }
  add(pcm: Int16Array) {
    if (this.cancelled) return;
    if (this.pending >= this.limit) throw new Error("STT_BACKLOG");
    this.jobs.push({ pcm, sequence: ++this.sequence });
    void this.pump();
    this.onPending(this.pending);
  }
  cancel() { this.cancelled = true; this.jobs = []; this.onPending(this.pending); }
  drain(): Promise<void> {
    return this.pending ? new Promise((resolve) => this.waiters.push(resolve)) : Promise.resolve();
  }
  private async pump() {
    if (this.running) return;
    this.running = true;
    while (this.jobs.length && !this.cancelled) {
      const job = this.jobs.shift()!;
      try { await this.process(job.pcm, job.sequence); }
      catch (error) { if (!this.cancelled) this.onError(error, job.sequence); }
      this.onPending(this.pending);
    }
    this.running = false;
    this.onPending(0);
    for (const resolve of this.waiters.splice(0)) resolve();
  }
}
