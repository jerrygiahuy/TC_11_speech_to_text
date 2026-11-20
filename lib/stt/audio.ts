const TARGET_SAMPLE_RATE = 16_000;
const SUPPORTED_CAPTURE_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
]);

interface DecodedAudio {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

interface DecodeContext {
  decodeAudioData(data: ArrayBuffer): Promise<DecodedAudio>;
  close(): Promise<void>;
}

interface OfflineBuffer {
  copyToChannel(data: Float32Array, channel: number): void;
}

interface OfflineSource {
  buffer: OfflineBuffer | null;
  connect(destination: unknown): void;
  start(when?: number): void;
}

interface OfflineContext {
  destination: unknown;
  createBuffer(channels: number, length: number, sampleRate: number): OfflineBuffer;
  createBufferSource(): OfflineSource;
  startRendering(): Promise<{ getChannelData(channel: number): Float32Array }>;
}

interface BrowserAudioRuntime {
  createDecodeContext(): DecodeContext;
  createOfflineContext(channels: number, length: number, sampleRate: number): OfflineContext;
}

const browserAudioRuntime: BrowserAudioRuntime = {
  createDecodeContext: () => new window.AudioContext(),
  createOfflineContext: (channels, length, sampleRate) =>
    new window.OfflineAudioContext(channels, length, sampleRate),
};

export function downmixChannels(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) {
    return new Float32Array();
  }
  const length = channels[0].length;
  if (channels.some((channel) => channel.length !== length)) {
    throw new Error("VOICE_AUDIO_CHANNEL_LENGTH_MISMATCH");
  }
  const mono = new Float32Array(length);
  for (const channel of channels) {
    for (let index = 0; index < length; index += 1) {
      mono[index] += channel[index] / channels.length;
    }
  }
  return mono;
}

export function targetFrameCount(frameCount: number, sourceSampleRate: number): number {
  if (frameCount <= 0 || sourceSampleRate <= 0) {
    throw new Error("VOICE_AUDIO_EMPTY");
  }
  return Math.max(1, Math.round((frameCount * TARGET_SAMPLE_RATE) / sourceSampleRate));
}

export function floatToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = Math.round(clipped < 0 ? clipped * 32_768 : clipped * 32_767);
  }
  return pcm;
}

export function encodePcm16Wav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): Blob {
  return encodePcm16WavFromChunks([floatToPcm16(samples)], sampleRate);
}

export function encodePcm16WavFromChunks(
  chunks: readonly Int16Array[],
  sampleRate = TARGET_SAMPLE_RATE,
): Blob {
  const frameCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  if (frameCount === 0) {
    throw new Error("VOICE_AUDIO_EMPTY");
  }
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const dataBytes = frameCount * 2;
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  const body = new Int16Array(frameCount);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  if (!isLittleEndian()) {
    const bytes = new DataView(body.buffer);
    for (let index = 0; index < frameCount; index += 1) {
      bytes.setInt16(index * 2, body[index], true);
    }
  }
  return new Blob([header, body.buffer], { type: "audio/wav" });
}

/**
 * Streaming mono resampler to 16 kHz PCM16. Downsampling averages every input
 * window (box filter) so live capture needs no whole-file pass after release.
 */
export class StreamingPcm16Resampler {
  private readonly ratio: number;
  private pending = new Float32Array(0);
  private position = 0;

  constructor(inputSampleRate: number, outputSampleRate = TARGET_SAMPLE_RATE) {
    if (inputSampleRate <= 0 || outputSampleRate <= 0) {
      throw new Error("VOICE_AUDIO_SAMPLE_RATE_INVALID");
    }
    this.ratio = inputSampleRate / outputSampleRate;
  }

  push(input: Float32Array): Int16Array {
    const buffer = new Float32Array(this.pending.length + input.length);
    buffer.set(this.pending, 0);
    buffer.set(input, this.pending.length);
    const output = new Float32Array(Math.ceil(buffer.length / this.ratio) + 1);
    let position = this.position;
    let count = 0;
    if (this.ratio >= 1) {
      while (position + this.ratio <= buffer.length) {
        const start = Math.floor(position);
        const end = Math.max(start + 1, Math.floor(position + this.ratio));
        let sum = 0;
        for (let index = start; index < end; index += 1) sum += buffer[index];
        output[count] = sum / (end - start);
        count += 1;
        position += this.ratio;
      }
    } else {
      while (position + 1 < buffer.length) {
        const index = Math.floor(position);
        const fraction = position - index;
        output[count] = buffer[index] * (1 - fraction) + buffer[index + 1] * fraction;
        count += 1;
        position += this.ratio;
      }
    }
    const consumed = Math.floor(position);
    this.pending = buffer.slice(consumed);
    this.position = position - consumed;
    return floatToPcm16(output.subarray(0, count));
  }
}

export async function isCanonicalPcm16Wav(blob: Blob): Promise<boolean> {
  const mimeType = blob.type.split(";", 1)[0].trim().toLowerCase();
  if ((mimeType !== "audio/wav" && mimeType !== "audio/x-wav") || blob.size <= 44) {
    return false;
  }
  const view = new DataView(await readBlobAsArrayBuffer(blob.slice(0, 44)));
  return (
    readAscii(view, 0, 4) === "RIFF"
    && readAscii(view, 8, 4) === "WAVE"
    && readAscii(view, 12, 4) === "fmt "
    && view.getUint16(20, true) === 1
    && view.getUint16(22, true) === 1
    && view.getUint32(24, true) === TARGET_SAMPLE_RATE
    && view.getUint16(34, true) === 16
    && readAscii(view, 36, 4) === "data"
  );
}

export async function canonicalizeAudioBlob(
  blob: Blob,
  runtime: BrowserAudioRuntime = browserAudioRuntime,
): Promise<Blob> {
  const mimeType = blob.type.split(";", 1)[0].trim().toLowerCase();
  if (!SUPPORTED_CAPTURE_TYPES.has(mimeType)) {
    throw new Error("VOICE_AUDIO_TYPE_UNSUPPORTED");
  }
  if (blob.size === 0) {
    throw new Error("VOICE_AUDIO_EMPTY");
  }

  const decodeContext = runtime.createDecodeContext();
  let decoded: DecodedAudio;
  try {
    decoded = await decodeContext.decodeAudioData(await readBlobAsArrayBuffer(blob));
  } catch {
    throw new Error("VOICE_AUDIO_DECODE_FAILED");
  } finally {
    await decodeContext.close();
  }
  if (decoded.length <= 0 || decoded.numberOfChannels <= 0) {
    throw new Error("VOICE_AUDIO_EMPTY");
  }

  const channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) =>
    decoded.getChannelData(channel),
  );
  const mono = downmixChannels(channels);
  const outputFrames = targetFrameCount(decoded.length, decoded.sampleRate);
  const offline = runtime.createOfflineContext(1, outputFrames, TARGET_SAMPLE_RATE);
  const monoBuffer = offline.createBuffer(1, decoded.length, decoded.sampleRate);
  monoBuffer.copyToChannel(mono, 0);
  const source = offline.createBufferSource();
  source.buffer = monoBuffer;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return encodePcm16Wav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
}

export function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("VOICE_AUDIO_READ_FAILED"));
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error("VOICE_AUDIO_READ_FAILED"));
    reader.readAsArrayBuffer(blob);
  });
}

function readAscii(view: DataView, offset: number, length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
}

function isLittleEndian(): boolean {
  return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
