// Kiểu tối thiểu cho phần sherpa-onnx-node mà src/server/ai/asr.ts dùng (gói không kèm file .d.ts).
declare module "sherpa-onnx-node" {
  export interface Waveform {
    samples: Float32Array;
    sampleRate: number;
  }

  /** Đọc file WAV (PCM 16-bit), dùng trong script đo */
  export function readWave(file: string): Waveform;

  export class OfflineStream {
    acceptWaveform(wave: Waveform): void;
  }

  export class OfflineRecognizer {
    constructor(config: {
      featConfig: { sampleRate: number; featureDim: number };
      modelConfig: {
        transducer: { encoder: string; decoder: string; joiner: string };
        tokens: string;
        numThreads?: number;
        provider?: string;
        debug?: number;
      };
      decodingMethod?: string;
    });
    createStream(): OfflineStream;
    decode(stream: OfflineStream): void;
    getResult(stream: OfflineStream): { text: string };
  }

  export class Vad {
    constructor(
      config: {
        sileroVad: {
          model: string;
          threshold?: number;
          minSilenceDuration?: number;
          minSpeechDuration?: number;
          windowSize?: number;
          maxSpeechDuration?: number;
        };
        sampleRate: number;
        numThreads?: number;
        provider?: string;
        debug?: number;
      },
      bufferSizeInSeconds: number,
    );
    acceptWaveform(samples: Float32Array): void;
    isEmpty(): boolean;
    isDetected(): boolean;
    front(enableExternalBuffer?: boolean): { start: number; samples: Float32Array };
    pop(): void;
    flush(): void;
  }
}
