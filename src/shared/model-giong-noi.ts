// Model nhận dạng giọng nói chạy trên máy, dùng chung cho eForm (/api/asr), trang /stt (Python) và lệnh
// `npm run tai-model-giong-noi`. Khớp với stt/model_artifacts.py: đổi model thì sửa cả hai nơi.
// Gốc: zzasdf/viet_iter3_pseudo_label (~70 nghìn giờ dữ liệu), bản int8 của sherpa-onnx, encoder ~70 MB.

export const MODEL_GIONG_NOI = {
  id: "csukuangfj/sherpa-onnx-zipformer-vi-int8-2025-04-20",
  revision: "b2745a435379992ad3f299635468db0c34918e1e",
  /** Thư mục tính từ gốc dự án */
  thuMuc: "models/stt/zipformer-vi",
  file: {
    encoder: "encoder-epoch-12-avg-8.int8.onnx",
    decoder: "decoder-epoch-12-avg-8.onnx",
    joiner: "joiner-epoch-12-avg-8.int8.onnx",
    tokens: "tokens.txt",
    bpe: "bpe.model",
  },
  /** SHA-256 lúc tải, giống provision.json do bước setup của /stt ghi */
  sha256: {
    "encoder-epoch-12-avg-8.int8.onnx": "b3abdef7a660fea7faf5e076b3c7613b0fc98406707103784d018189bb522124",
    "decoder-epoch-12-avg-8.onnx": "d1d27cca84c824a8acf5ce6edf0f2c0880cfe295d2e69b95134de1707e1d9998",
    "joiner-epoch-12-avg-8.int8.onnx": "38ec49e1c18e4feb0cad4de13e25c83a866cf56f4a66f22e8ff579d591a69a46",
    "tokens.txt": "f536d03c2e95ebd2930cf0abec88e823bd17d3c1933da7ae6a82db3b80605e15",
    "bpe.model": "289dbb44527c13c419ae3a4d8ce6a349f01a97f8777e69934a77e3692d2f10db",
  } as Record<string, string>,
} as const;

/** Silero VAD (chốt câu), tính từ gốc dự án */
export const VAD_GIONG_NOI = "models/silero_vad.onnx";
