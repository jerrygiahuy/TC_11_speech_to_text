// Tạo file âm thanh mẫu cho data/giong-noi/ bằng giọng đọc tiếng Việt có sẵn của Windows ("Microsoft An").
//   npm run tao-am-thanh-mau
// Mỗi ca trong data/cases/ được đọc câu input_noi thành <id>.tts.wav. Tên thuốc được đổi sang cách bác sĩ đọc
// (cách đọc đầu tiên trong config/sua-chu-giong-noi.json), vì giọng máy đọc tên tiếng Anh theo kiểu khác hẳn người. Giọng máy đọc rõ và đều hơn người thật,
// nên điểm đo trên các file này chỉ là mốc so sánh giữa các lần sửa, không phải độ chính xác thật.
// Chỉ chạy được trên Windows 10 trở lên có gói giọng nói tiếng Việt (Cài đặt > Thời gian và ngôn ngữ > Giọng nói).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCases, loadSuaChu } from "@/server/du-lieu/config";

const THU_MUC = path.join(process.cwd(), "data", "giong-noi");

function main() {
  if (process.platform !== "win32") {
    console.error("Script này dùng giọng đọc của Windows, chỉ chạy được trên Windows.");
    process.exit(1);
  }
  fs.mkdirSync(THU_MUC, { recursive: true });
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), "tts-"));
  const ghiDe = process.argv.includes("--ghi-de");
  // Tên dài trước, để "Methylprednisolon" không bị thay mất phần "Prednisolon"
  const tenThuoc = loadSuaChu().tu_chuyen_khoa.toSorted((a, b) => b.dung.length - a.dung.length);
  const docNhuBacSi = (text: string) =>
    tenThuoc.reduce((out, tu) => out.replace(new RegExp(`(?<!\\p{L})${tu.dung}(?!\\p{L})`, "giu"), tu.doc[0]), text);
  try {
    for (const ca of loadCases()) {
      const dich = path.join(THU_MUC, `${ca.id}.tts.wav`);
      if (fs.existsSync(dich) && !ghiDe) {
        console.log(`Đã có ${path.basename(dich)}, bỏ qua (thêm --ghi-de để tạo lại).`);
        continue;
      }
      const vanBan = path.join(tam, `${ca.id}.txt`);
      fs.writeFileSync(vanBan, docNhuBacSi(ca.input_noi), "utf8");
      execFileSync(
        "powershell",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join("scripts", "tts-windows.ps1"), "-TextFile", vanBan, "-OutFile", dich],
        { stdio: ["ignore", "ignore", "inherit"] },
      );
      console.log(`  ${path.basename(dich)} (${(fs.statSync(dich).size / 1e6).toFixed(1)} MB)`);
    }
  } finally {
    fs.rmSync(tam, { recursive: true, force: true });
  }
}

main();
