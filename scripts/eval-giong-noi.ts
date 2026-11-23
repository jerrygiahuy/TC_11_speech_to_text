// Đo nhận dạng giọng nói Zipformer trên các file âm thanh trong data/giong-noi/.
//   npm run eval-giong-noi
// Mỗi file <id ca>[.<nhãn>].wav (16 kHz, mono) được so với câu input_noi của ca đó trong data/cases/,
// hoặc với file .txt cùng tên nếu có. Âm thanh đi qua đúng luồng của ứng dụng (phiên VAD, gửi từng mẩu 0,4 giây).
// In ba nhóm số cho chữ thô của model và chữ sau khi sửa (src/shared/giong-noi/sua-chu.ts):
// - WER: tỉ lệ lỗi từ, so cả dấu, đã đổi số thành chữ ở cả hai phía.
// - Mục danh mục: chạy bộ tách quy tắc trên câu gốc và trên chữ nhận dạng, đếm mã dịch vụ, mã thuốc giữ được.
// Thêm --chi-tiet để in từng câu, --nhan-lai để bỏ chữ thô đã lưu.
// - Số liệu thuốc: số dòng thuốc có liều, số lần/ngày, số ngày trùng với khi tách câu gốc.
// Thêm một dòng "Sửa nhầm": chạy bộ sửa trên chính câu gốc, đếm số từ bị đổi sai (nên bằng 0).
import fs from "node:fs";
import path from "node:path";
import { readWave } from "sherpa-onnx-node";
import { ketThucPhien, guiAmThanh, taoPhien } from "@/server/ai/asr";
import { runPipeline } from "@/server/ai/pipeline";
import { loadCases, loadCatalogs, loadForms, loadRules, loadSuaChu, loadVietTat } from "@/server/du-lieu/config";
import { ASR_SAMPLE_RATE } from "@/shared/api";
import { soThanhChu } from "@/shared/giong-noi/so";
import { suaChu } from "@/shared/giong-noi/sua-chu";
import type { Values } from "@/shared/types";

const THU_MUC = path.join(process.cwd(), "data", "giong-noi");
const MAU = 0.4 * ASR_SAMPLE_RATE;

/** Chữ thường, bỏ dấu câu, số thành chữ; giữ dấu thanh vì sai dấu là sai từ */
function tachTu(text: string): string[] {
  return soThanhChu(text.normalize("NFC").toLocaleLowerCase("vi"))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Khoảng cách chỉnh sửa giữa hai dãy từ */
function khoangCach(a: string[], b: string[]): number {
  let truoc = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const hien = [i];
    for (let j = 1; j <= b.length; j++) {
      hien[j] = Math.min(truoc[j] + 1, hien[j - 1] + 1, truoc[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    truoc = hien;
  }
  return truoc[b.length];
}

/**
 * Chữ thô được lưu cạnh file âm thanh (<tên>.tho.json) để chỉnh bảng sửa chữ rồi chạy lại cho nhanh.
 * Đổi file .wav thì tự nhận dạng lại; đổi cấu hình model hay VAD thì thêm --nhan-lai.
 */
function nhanDangCoLuu(file: string, nhanLai: boolean): string[] {
  const luu = file.replace(/\.wav$/, ".tho.json");
  const mtime = fs.statSync(file).mtimeMs;
  if (!nhanLai && fs.existsSync(luu)) {
    const cu = JSON.parse(fs.readFileSync(luu, "utf8")) as { mtime: number; cau: string[] };
    if (cu.mtime === mtime) return cu.cau;
  }
  const cau = nhanDang(file);
  fs.writeFileSync(luu, JSON.stringify({ mtime, cau }, null, 1));
  return cau;
}

function nhanDang(file: string): string[] {
  const wave = readWave(file);
  if (wave.sampleRate !== ASR_SAMPLE_RATE) throw new Error(`${path.basename(file)}: cần ${ASR_SAMPLE_RATE} Hz, file là ${wave.sampleRate} Hz`);
  const id = taoPhien();
  const cau: string[] = [];
  for (let i = 0; i < wave.samples.length; i += MAU) {
    cau.push(...(guiAmThanh(id, wave.samples.subarray(i, i + MAU))?.chot ?? []));
  }
  cau.push(...(ketThucPhien(id)?.chot ?? []));
  return cau;
}

const ma = (rows: Values[], key: string) => rows.map((row) => String(row[key] ?? "")).filter(Boolean);
const lieu = (row: Values) => [row.lieu_moi_lan, row.so_lan_ngay, row.so_ngay].map((v) => String(v ?? "")).join("|");

interface Diem {
  loi: number;
  tu: number;
  maGiu: number;
  maTong: number;
  lieuGiu: number;
  lieuTong: number;
}

const DIEM_RONG = (): Diem => ({ loi: 0, tu: 0, maGiu: 0, maTong: 0, lieuGiu: 0, lieuTong: 0 });

async function main() {
  const files = fs.existsSync(THU_MUC) ? fs.readdirSync(THU_MUC).filter((f) => f.endsWith(".wav")).sort() : [];
  if (files.length === 0) {
    console.error("Chưa có file .wav trong data/giong-noi/. Chạy npm run tao-am-thanh-mau hoặc tự ghi âm, xem data/giong-noi/README.md.");
    process.exit(1);
  }
  const cases = loadCases();
  const ctx = { forms: loadForms(), catalogs: loadCatalogs(), vietTat: loadVietTat(), rules: loadRules(), cases };
  const bang = loadSuaChu();
  const chiTiet = process.argv.includes("--chi-tiet");
  const nhanLai = process.argv.includes("--nhan-lai");

  const tong = { tho: DIEM_RONG(), sua: DIEM_RONG() };
  const dong: string[] = [];
  let suaNham = 0;

  for (const file of files) {
    const ten = file.replace(/\.wav$/, "");
    const txt = path.join(THU_MUC, `${ten}.txt`);
    const ca = cases.find((item) => ten === item.id || ten.startsWith(`${item.id}.`) || ten.startsWith(`${item.id}-`));
    const goc = fs.existsSync(txt) ? fs.readFileSync(txt, "utf8") : ca?.input_noi;
    if (!goc) {
      console.warn(`Bỏ qua ${file}: không tìm thấy ca hay file .txt cùng tên.`);
      continue;
    }

    const cau = nhanDangCoLuu(path.join(THU_MUC, file), nhanLai);
    const ban = { tho: cau.join(" "), sua: cau.map((c) => suaChu(c, bang)).join(" ") };
    const tuGoc = tachTu(goc);
    const gocSua = goc.split(/(?<=[.?!])\s+/).map((c) => suaChu(c, bang)).join(" ");
    const nham = khoangCach(tuGoc, tachTu(gocSua));
    suaNham += nham;
    if (nham > 0 && chiTiet) console.log(`\n[sửa nhầm câu gốc] ${ten}: ${gocSua}`);
    const ketQuaGoc = await runPipeline(goc, ctx, { provider: "mock", ruleOnly: true });
    const maGoc = [...ma(ketQuaGoc.draft.chi_dinh as Values[], "ma_dich_vu"), ...ma(ketQuaGoc.draft.ke_don as Values[], "ma_thuoc")];
    const lieuGoc = new Map((ketQuaGoc.draft.ke_don as Values[]).filter((r) => r.ma_thuoc).map((r) => [String(r.ma_thuoc), lieu(r)]));

    const cot: string[] = [];
    for (const kieu of ["tho", "sua"] as const) {
      const kq = await runPipeline(ban[kieu], ctx, { provider: "mock", ruleOnly: true });
      const thuoc = kq.draft.ke_don as Values[];
      const maMoi = new Set([...ma(kq.draft.chi_dinh as Values[], "ma_dich_vu"), ...ma(thuoc, "ma_thuoc")]);
      const d: Diem = {
        loi: khoangCach(tuGoc, tachTu(ban[kieu])),
        tu: tuGoc.length,
        maGiu: maGoc.filter((m) => maMoi.has(m)).length,
        maTong: maGoc.length,
        lieuGiu: thuoc.filter((r) => r.ma_thuoc && lieuGoc.get(String(r.ma_thuoc)) === lieu(r)).length,
        lieuTong: lieuGoc.size,
      };
      for (const k of Object.keys(d) as (keyof Diem)[]) tong[kieu][k] += d[k];
      cot.push(`${((d.loi / d.tu) * 100).toFixed(1).padStart(6)}% ${`${d.maGiu}/${d.maTong}`.padStart(6)} ${`${d.lieuGiu}/${d.lieuTong}`.padStart(6)}`);
    }
    dong.push(`${ten.padEnd(22)}${cot.join("   ")}`);
    if (chiTiet) {
      console.log(`\n── ${ten}\nGỐC : ${goc}\nTHÔ : ${ban.tho}\nSỬA : ${ban.sua}`);
    }
  }

  const tieuDe = `${"WER".padStart(7)} ${"Mã".padStart(6)} ${"Liều".padStart(6)}`;
  console.log(`\n${"".padEnd(22)}${"── Chữ thô ──".padEnd(24)}   ── Sau khi sửa ──`);
  console.log(`${"File".padEnd(22)}${tieuDe}   ${tieuDe}`);
  for (const d of dong) console.log(d);
  const tomTat = (d: Diem) =>
    `${((d.loi / d.tu) * 100).toFixed(1).padStart(6)}% ${`${d.maGiu}/${d.maTong}`.padStart(6)} ${`${d.lieuGiu}/${d.lieuTong}`.padStart(6)}`;
  console.log(`${"Tổng".padEnd(22)}${tomTat(tong.tho)}   ${tomTat(tong.sua)}`);
  console.log(`Sửa nhầm trên câu gốc: ${suaNham} từ`);
  console.log("\nMã: mã dịch vụ, mã thuốc giữ được so với tách câu gốc. Liều: dòng thuốc có liều, số lần/ngày, số ngày trùng câu gốc.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
