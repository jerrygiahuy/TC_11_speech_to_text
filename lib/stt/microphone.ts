// Adapted from P-018 frontend/src/features/voice/audio-input.ts.
import { StreamingPcm16Resampler } from "./audio";
const INPUT_SAMPLE_RATE = 16000;
const MIC_CONSTRAINTS: MediaStreamConstraints = { audio: {channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true} };
const PROCESSOR_NAME = "ivi-pcm-input";
const FLUSH_TIMEOUT_MS = 250;

// Runs on the audio rendering thread: downmix to mono and post fixed-size batches so
// the main thread resamples continuously. "flush" posts the partial batch and keeps
// running, so several recordings can share one microphone pipeline.
const WORKLET_SOURCE = `
class PcmInputProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.batchSize = (options.processorOptions && options.processorOptions.batchSize) || 2048;
    this.buffer = new Float32Array(this.batchSize);
    this.filled = 0;
    this.port.onmessage = (event) => {
      if (!event.data || event.data.type !== "flush") return;
      const samples = this.buffer.slice(0, this.filled);
      this.filled = 0;
      this.port.postMessage({ type: "flushed", id: event.data.id, samples }, [samples.buffer]);
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const frames = input[0].length;
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      for (let channel = 0; channel < input.length; channel += 1) sum += input[channel][frame];
      this.buffer[this.filled] = sum / input.length;
      this.filled += 1;
      if (this.filled === this.batchSize) {
        const samples = this.buffer;
        this.port.postMessage({ type: "samples", samples }, [samples.buffer]);
        this.buffer = new Float32Array(this.batchSize);
        this.filled = 0;
      }
    }
    return true;
  }
}
registerProcessor("${PROCESSOR_NAME}", PcmInputProcessor);
`;

export interface MicPipeline {
  onChunk: ((chunk: Int16Array) => void) | null;
  onError: ((code: string) => void) | null;
  flush(): Promise<void>;
  close(): void;
}

export async function openBrowserMicPipeline(): Promise<MicPipeline> {
  const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
  let context: AudioContext;
  try { context = new AudioContext({ latencyHint: "interactive" }); }
  catch (error) { stream.getTracks().forEach((track) => track.stop()); throw error; }
  let source: MediaStreamAudioSourceNode | null = null;
  let node: AudioWorkletNode | null = null;
  let sink: GainNode | null = null;

  const close = () => {
    if (node) node.port.onmessage = null;
    source?.disconnect();
    node?.disconnect();
    sink?.disconnect();
    if (node) node.onprocessorerror = null;
    for (const track of stream.getTracks()) { track.onended = null; track.stop(); }
    void context.close().catch(() => undefined);
  };

  try {
    const moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "text/javascript" }));
    try {
      await context.audioWorklet.addModule(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
    if (context.state === "suspended") await context.resume();
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { batchSize: 2048 },
    });
    // A silent sink keeps the graph pulled in browsers that skip unconnected nodes.
    sink = context.createGain();
    sink.gain.value = 0;
    source.connect(node);
    node.connect(sink);
    sink.connect(context.destination);
  } catch {
    close();
    throw new Error("CAPTURE_FAILED");
  }

  const port = node.port;
  const resampler = new StreamingPcm16Resampler(context.sampleRate, INPUT_SAMPLE_RATE);
  const pendingFlushes = new Map<number, () => void>();
  let flushId = 0;

  const pipeline: MicPipeline = {
    onChunk: null,
    onError: null,
    flush() {
      return new Promise<void>((resolve) => {
        flushId += 1;
        const id = flushId;
        const timeout = setTimeout(() => {
          pendingFlushes.delete(id);
          resolve();
        }, FLUSH_TIMEOUT_MS);
        pendingFlushes.set(id, () => {
          clearTimeout(timeout);
          resolve();
        });
        port.postMessage({ type: "flush", id });
      });
    },
    close,
  };

  port.onmessage = (event: MessageEvent<{ type: string; id?: number; samples?: Float32Array }>) => {
    const { type, id, samples } = event.data;
    if (samples) {
      const pcm = resampler.push(samples);
      if (pcm.length > 0) pipeline.onChunk?.(pcm);
    }
    if (type === "flushed" && id !== undefined) {
      pendingFlushes.get(id)?.();
      pendingFlushes.delete(id);
    }
  };
  node.onprocessorerror = () => pipeline.onError?.("CAPTURE_FAILED");
  for (const track of stream.getAudioTracks()) {
    track.onended = () => pipeline.onError?.("CAPTURE_FAILED");
  }

  return pipeline;
}

