// Nhận dạng giọng nói chạy trên máy bằng Zipformer tiếng Việt (sherpa-onnx). Âm thanh không rời khỏi máy
// và không được lưu: chỉ nằm trong bộ nhớ của phiên đến khi câu được nhận dạng xong.
//
// Model là loại không streaming, nên mỗi phiên làm hai lớp để chữ hiện ra trong lúc nói:
// - Chữ tạm: khi đang có tiếng nói, cứ thêm ~0,4 giây âm thanh thì nhận dạng lại phần câu đang nói dở.
// - Chữ chốt: Silero VAD thấy ngắt nghỉ thì nhận dạng cả câu vừa xong và trả về để đưa vào ô nhập.
import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { OfflineRecognizer, Vad } from "sherpa-onnx-node";
import { ASR_MAX_SECONDS, ASR_SAMPLE_RATE, type AsrKetQua } from "@/shared/api";
import { MODEL_GIONG_NOI, VAD_GIONG_NOI } from "@/shared/model-giong-noi";

// Model Zipformer ~70 MB, dùng chung thư mục với trang /stt (xem src/shared/model-giong-noi.ts)
const GOC = /*turbopackIgnore: true*/ process.cwd();
const tuGoc = (rel: string) => path.join(GOC, ...rel.split("/"));
const M = MODEL_GIONG_NOI;
const FILE = {
  encoder: tuGoc(`${M.thuMuc}/${M.file.encoder}`),
  decoder: tuGoc(`${M.thuMuc}/${M.file.decoder}`),
  joiner: tuGoc(`${M.thuMuc}/${M.file.joiner}`),
  tokens: tuGoc(`${M.thuMuc}/${M.file.tokens}`),
};
const VAD_FILE = tuGoc(VAD_GIONG_NOI);
/** Các file cần có, dạng đường dẫn tương đối tính từ gốc dự án (để hiện cho người dùng) */
const CAN_CO = [
  ...[M.file.encoder, M.file.decoder, M.file.joiner, M.file.tokens].map((f) => `${M.thuMuc}/${f}`),
  VAD_GIONG_NOI,
];
/** Cửa sổ của Silero VAD ở 16 kHz */
const VAD_WINDOW = 512;
/** Một câu dài hơn mức này thì VAD tự cắt, nên chữ tạm cũng chỉ cần nhận dạng tối đa chừng ấy */
const MAX_SEGMENT_SECONDS = 20;
/** Thêm ít nhất chừng này âm thanh mới thì mới nhận dạng lại chữ tạm */
const INTERIM_STEP = 0.4 * ASR_SAMPLE_RATE;
/** Phiên không nhận thêm âm thanh trong khoảng này thì bị xóa */
const IDLE_MS = 60_000;

export function getAsrProvider(): string {
  return process.env.ASR_PROVIDER?.trim() || "zipformer";
}

/** File model còn thiếu, đường dẫn tương đối tính từ gốc dự án; rỗng là đủ */
export function fileModelThieu(): string[] {
  return CAN_CO.filter((rel) => !fs.existsSync(tuGoc(rel)));
}

export function modelSanSang(): boolean {
  return fileModelThieu().length === 0;
}

let recognizer: OfflineRecognizer | null = null;

function getRecognizer(): OfflineRecognizer {
  const thieu = fileModelThieu();
  if (thieu.length) throw new Error(`Chưa có model giọng nói (thiếu ${thieu.join(", ")}). Chạy: npm run tai-model-giong-noi`);
  recognizer ??= new OfflineRecognizer({
    featConfig: { sampleRate: ASR_SAMPLE_RATE, featureDim: 80 },
    modelConfig: { transducer: FILE, tokens: FILE.tokens, numThreads: 2, provider: "cpu", debug: 0 },
    decodingMethod: "greedy_search",
  });
  return recognizer;
}

function decode(samples: Float32Array): string {
  const r = getRecognizer();
  const stream = r.createStream();
  stream.acceptWaveform({ samples, sampleRate: ASR_SAMPLE_RATE });
  r.decode(stream);
  return r.getResult(stream).text.trim();
}

/** Model trả chữ in hoa, không dấu câu: đổi sang chữ thường và viết hoa chữ đầu */
function chuThuong(text: string): string {
  const lower = text.toLocaleLowerCase("vi");
  return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
}

class PhienNhanDang {
  private vad = new Vad(
    {
      sileroVad: {
        model: VAD_FILE,
        threshold: 0.5,
        minSilenceDuration: 0.5,
        minSpeechDuration: 0.25,
        windowSize: VAD_WINDOW,
        maxSpeechDuration: MAX_SEGMENT_SECONDS,
      },
      sampleRate: ASR_SAMPLE_RATE,
      numThreads: 1,
      provider: "cpu",
      debug: 0,
    },
    MAX_SEGMENT_SECONDS + 10,
  );
  /** Âm thanh từ cuối câu đã chốt gần nhất, để nhận dạng chữ tạm */
  private conLai: Float32Array = new Float32Array(0);
  /** Vị trí tuyệt đối (số mẫu) của mẫu đầu tiên trong conLai */
  private batDau = 0;
  /** Mẫu chưa đủ một cửa sổ VAD */
  private du: Float32Array = new Float32Array(0);
  private tong = 0;
  private tamLuc = 0;
  private tam = "";
  lanCuoi = Date.now();

  private them(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  private layCauChot(): string[] {
    const chot: string[] = [];
    while (!this.vad.isEmpty()) {
      const doan = this.vad.front(false);
      const text = decode(doan.samples);
      if (text) chot.push(`${chuThuong(text)}.`);
      // Bỏ phần âm thanh đã chốt khỏi bộ đệm chữ tạm
      const ketThuc = doan.start + doan.samples.length;
      if (ketThuc > this.batDau) {
        this.conLai = this.conLai.slice(Math.min(ketThuc - this.batDau, this.conLai.length));
        this.batDau = ketThuc;
      }
      this.vad.pop();
      this.tam = "";
      this.tamLuc = this.tong;
    }
    return chot;
  }

  nhan(samples: Float32Array): AsrKetQua {
    this.lanCuoi = Date.now();
    if (this.tong + samples.length > ASR_SAMPLE_RATE * ASR_MAX_SECONDS) {
      throw new Error(`Phiên nói dài quá ${ASR_MAX_SECONDS / 60} phút.`);
    }
    this.tong += samples.length;
    this.conLai = this.them(this.conLai, samples);
    // Chỉ giữ tối đa một câu dài nhất cho chữ tạm
    const toiDa = MAX_SEGMENT_SECONDS * ASR_SAMPLE_RATE;
    if (this.conLai.length > toiDa) {
      this.batDau += this.conLai.length - toiDa;
      this.conLai = this.conLai.slice(this.conLai.length - toiDa);
    }

    const buf = this.them(this.du, samples);
    const chot: string[] = [];
    let i = 0;
    for (; i + VAD_WINDOW <= buf.length; i += VAD_WINDOW) {
      this.vad.acceptWaveform(buf.subarray(i, i + VAD_WINDOW));
      chot.push(...this.layCauChot());
    }
    this.du = buf.slice(i);

    if (!this.vad.isDetected()) this.tam = "";
    else if (this.tong - this.tamLuc >= INTERIM_STEP) {
      this.tamLuc = this.tong;
      this.tam = chuThuong(decode(this.conLai));
    }
    return { chot, tam: this.tam };
  }

  ketThuc(): AsrKetQua {
    if (this.du.length > 0) this.vad.acceptWaveform(this.du);
    this.du = new Float32Array(0);
    this.vad.flush();
    return { chot: this.layCauChot(), tam: "" };
  }
}

// Giữ qua các lần nạp lại module khi chạy dev
const g = globalThis as unknown as { phienAsr?: Map<string, PhienNhanDang> };
const PHIEN = (g.phienAsr ??= new Map<string, PhienNhanDang>());

function donPhienCu() {
  const now = Date.now();
  for (const [id, phien] of PHIEN) if (now - phien.lanCuoi > IDLE_MS) PHIEN.delete(id);
}

export function taoPhien(): string {
  donPhienCu();
  getRecognizer();
  const id = randomUUID();
  PHIEN.set(id, new PhienNhanDang());
  return id;
}

export function guiAmThanh(id: string, samples: Float32Array): AsrKetQua | null {
  return PHIEN.get(id)?.nhan(samples) ?? null;
}

export function ketThucPhien(id: string): AsrKetQua | null {
  const phien = PHIEN.get(id);
  if (!phien) return null;
  PHIEN.delete(id);
  return phien.ketThuc();
}
