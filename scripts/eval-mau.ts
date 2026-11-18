// Đo phiếu mẫu theo bệnh đúng sẵn bao nhiêu so với kết quả mong muốn của ca mẫu.
//   npm run eval-mau                      mock: mẫu kèm chi tiết chỉ thay chỗ trống bằng quy tắc, không tốn lượt gọi
//   npm run eval-mau -- --provider=gemini mẫu kèm chi tiết gọi LLM thật (mỗi ca 1 lượt)
// Mức 1: chỉ có mẫu (bác sĩ gõ đúng tên mẫu). Mức 2: mẫu kèm câu chi tiết ngắn (input_mau trong data/cases).
import { loadCases, loadCatalogs, loadForms, loadRules, loadVietTat } from "@/server/du-lieu/config";
import { loadPhieuMau, timMauGoc } from "@/server/du-lieu/phieu-mau";
import { runPipeline } from "@/server/ai/pipeline";
import { fillDraft } from "@/server/ai/schema";
import type { Draft } from "@/shared/types";
import { accuracy, chamNhap, emptyTally, printTable, type Outcome, type Tally } from "./cham-diem";

/** Ô mẫu không điền: tiền sử bác sĩ Copy từ lần khám trước */
const KHONG_TINH = "phieu_kham.tien_su";

interface Muc {
  ten: string;
  phan: Map<string, Tally>;
  truong: Map<string, Tally>;
  tong: Tally;
  tongKhongTienSu: Tally;
}

function taoMuc(ten: string): Muc {
  return { ten, phan: new Map(), truong: new Map(), tong: emptyTally(), tongKhongTienSu: emptyTally() };
}

function ghiMuc(muc: Muc, forms: ReturnType<typeof loadForms>, expected: Draft, actual: Draft) {
  chamNhap(forms, expected, actual, (phan: string, truong: string, kq: Outcome) => {
    for (const [map, khoa] of [[muc.phan, phan], [muc.truong, truong]] as const) {
      const tally = map.get(khoa) ?? emptyTally();
      tally[kq]++;
      map.set(khoa, tally);
    }
    muc.tong[kq]++;
    if (truong !== KHONG_TINH) muc.tongKhongTienSu[kq]++;
  });
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Không có .env.local vẫn chạy được ở chế độ mock
  }
  const provider = process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1] || "mock";
  const forms = loadForms();
  const cases = loadCases();
  const context = { forms, catalogs: loadCatalogs(), vietTat: loadVietTat(), rules: loadRules(), cases };
  const cacMau = new Map(loadPhieuMau().map((mau) => [mau.id, mau]));

  const muc1 = taoMuc("Mức 1: chỉ có mẫu");
  const muc2 = taoMuc(`Mức 2: mẫu kèm chi tiết (${provider})`);
  const khongMau: string[] = [];
  const loi: string[] = [];

  for (const ca of cases) {
    const mau = ca.mau_id ? cacMau.get(ca.mau_id) : undefined;
    const goc = ca.mau_id ? timMauGoc(ca.mau_id) : undefined;
    if (!mau || !goc) {
      khongMau.push(ca.mau_id ? `${ca.id} (không tìm thấy mẫu ${ca.mau_id})` : ca.id);
      continue;
    }
    const expected = fillDraft(ca.expected, forms);
    ghiMuc(muc1, forms, expected, mau.ketQua.draft);
    if (!ca.input_mau) continue;
    try {
      const kq = await runPipeline(ca.input_mau, context, { provider, mau: goc.nhap });
      ghiMuc(muc2, forms, expected, kq.draft);
    } catch (error) {
      loi.push(`${ca.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`Phiếu mẫu so với ca mẫu · ${cases.length - khongMau.length}/${cases.length} ca có mẫu`);
  for (const muc of [muc1, muc2]) {
    console.log(`\n=== ${muc.ten} ===`);
    console.log(`Chính xác chung: ${accuracy(muc.tong)} · không tính tiền sử: ${accuracy(muc.tongKhongTienSu)}`);
    printTable("Theo từng phần", forms.map((form) => [form.title, muc.phan.get(form.title) ?? emptyTally()]));
    printTable("Theo từng trường", [...muc.truong.entries()]);
  }
  if (khongMau.length > 0) console.log(`\nCa chưa có mẫu: ${khongMau.join(", ")}`);
  console.log("\nChính xác = Đúng / (Đúng + Sai + Thiếu + Thừa), cùng cách chấm với npm run eval.");
  console.log(`"Không tính tiền sử": mẫu không điền tiền sử, ô đó bác sĩ Copy từ lần khám trước.`);
  console.log("Ước tính: mẫu và đáp án đều do nhóm soạn; số thật phải đo khi bác sĩ thử.");
  if (loi.length > 0) {
    console.log(`\nCó ${loi.length} lượt lỗi:`);
    loi.forEach((dong) => console.log(`- ${dong}`));
    process.exitCode = 1;
  }
}

main();
