// Tải model nhận dạng giọng nói chạy trên máy (Zipformer tiếng Việt + Silero VAD) về models/.
//   npm run tai-model-giong-noi
// Model lấy từ release công khai của k2-fsa/sherpa-onnx. Thư mục models/ không đưa lên git.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const NGUON = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models";
const ASR = "sherpa-onnx-zipformer-vi-30M-int8-2026-02-09";
const THU_MUC = path.join(process.cwd(), "models");

async function tai(url: string, dich: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Không tải được ${url}: HTTP ${res.status}`);
  fs.writeFileSync(dich, Buffer.from(await res.arrayBuffer()));
  console.log(`  đã tải ${path.basename(dich)} (${(fs.statSync(dich).size / 1e6).toFixed(1)} MB)`);
}

async function main() {
  fs.mkdirSync(THU_MUC, { recursive: true });

  if (fs.existsSync(path.join(THU_MUC, ASR, "tokens.txt"))) {
    console.log(`Đã có ${ASR}, bỏ qua.`);
  } else {
    console.log(`Tải ${ASR}…`);
    const nen = path.join(THU_MUC, `${ASR}.tar.bz2`);
    if (!fs.existsSync(nen)) await tai(`${NGUON}/${ASR}.tar.bz2`, nen);
    // tar có sẵn trên Windows 10+, macOS và Linux. Dùng tên tương đối: GNU tar (Git Bash) hiểu "D:\..." là máy từ xa
    execFileSync("tar", ["-xjf", path.basename(nen)], { cwd: THU_MUC, stdio: "inherit" });
    fs.rmSync(nen);
  }

  const vad = path.join(THU_MUC, "silero_vad.onnx");
  if (fs.existsSync(vad)) console.log("Đã có silero_vad.onnx, bỏ qua.");
  else {
    console.log("Tải silero_vad.onnx…");
    await tai(`${NGUON}/silero_vad.onnx`, vad);
  }

  console.log("\nCác file trong", path.join("models", ASR) + ":");
  for (const f of fs.readdirSync(path.join(THU_MUC, ASR))) console.log("  " + f);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
