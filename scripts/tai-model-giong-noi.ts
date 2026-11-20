// Tải model nhận dạng giọng nói chạy trên máy (Zipformer tiếng Việt ~70 MB + Silero VAD) về models/.
//   npm run tai-model-giong-noi
// Zipformer lấy từ Hugging Face (csukuangfj/sherpa-onnx-zipformer-vi-int8-2025-04-20, khóa revision), kiểm SHA-256
// rồi ghi provision.json giống bước setup của trang /stt, nên eForm và /stt dùng chung một bộ model.
// Silero VAD lấy từ release công khai của k2-fsa/sherpa-onnx. Thư mục models/ không đưa lên git.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MODEL_GIONG_NOI as M, VAD_GIONG_NOI } from "../src/shared/model-giong-noi";

const HF = `https://huggingface.co/${M.id}/resolve/${M.revision}`;
const VAD_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx";
const GOC = process.cwd();
const tuGoc = (rel: string) => path.join(GOC, ...rel.split("/"));

const sha256 = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function tai(url: string, dich: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Không tải được ${url}: HTTP ${res.status}`);
  const tam = `${dich}.dang-tai`;
  fs.writeFileSync(tam, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tam, dich);
  console.log(`  đã tải ${path.basename(dich)} (${(fs.statSync(dich).size / 1e6).toFixed(1)} MB)`);
}

async function main() {
  const thuMuc = tuGoc(M.thuMuc);
  fs.mkdirSync(thuMuc, { recursive: true });
  console.log(`Model Zipformer: ${M.id} @ ${M.revision.slice(0, 7)} → ${M.thuMuc}`);

  for (const ten of Object.values(M.file)) {
    const dich = path.join(thuMuc, ten);
    const mongDoi = M.sha256[ten];
    if (fs.existsSync(dich) && sha256(dich) === mongDoi) {
      console.log(`  đã có ${ten}, bỏ qua.`);
      continue;
    }
    await tai(`${HF}/${ten}`, dich);
    const thucTe = sha256(dich);
    if (thucTe !== mongDoi) {
      fs.rmSync(dich);
      throw new Error(`SHA-256 của ${ten} không khớp (${thucTe}), đã xóa file vừa tải.`);
    }
  }
  fs.writeFileSync(
    path.join(thuMuc, "provision.json"),
    JSON.stringify({ model_id: M.id, revision: M.revision, sha256: M.sha256 }, null, 2) + "\n",
  );

  const vad = tuGoc(VAD_GIONG_NOI);
  if (fs.existsSync(vad)) console.log("Đã có silero_vad.onnx, bỏ qua.");
  else {
    console.log("Tải silero_vad.onnx…");
    await tai(VAD_URL, vad);
  }

  console.log(`\nCác file trong ${M.thuMuc}:`);
  for (const f of fs.readdirSync(thuMuc)) {
    const p = path.join(thuMuc, f);
    if (fs.statSync(p).isFile()) console.log(`  ${f} (${(fs.statSync(p).size / 1e6).toFixed(1)} MB)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
