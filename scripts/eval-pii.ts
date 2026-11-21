/**
 * Chấm bộ che PII: chỉ rule, so với rule cộng lớp NER (plan NER, Task 9; điều kiện bật ở Task 10).
 *
 *   npm run eval-pii            # chỉ rule
 *   npm run eval-pii -- --ner   # thêm cột rule + NER (cần STT chạy, có mô hình models/ner/phobert-phoner/)
 *
 * Nguồn: data/pii-eval/cau-stt.json (câu giả kiểu STT, không có hồ sơ) và kịch bản /demo-luong
 * (có hồ sơ giả, phai_che / phai_giu). Chỉ in số đếm, không in nội dung đã che hay bỏ sót, trừ khi có --chi-tiet.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chePii, type KnownIdentifier } from "@/shared/clinical/pii";
import { danhGiaMotCau, phanVi } from "@/shared/clinical/pii/danh-gia";
import { clinicalAllowlist } from "@/server/clinical/pii-allowlist";
import { goiNer } from "@/server/clinical/ner-client";
import { demoAllowlist, listKichBan, loadKichBan } from "@/server/demo-luong/kich-ban";
import { knownIdentifiersFor } from "@/server/demo-luong/known-identifiers";

interface Cau { id: string; nguon: "cau-stt" | "kich-ban"; texts: string[]; known: KnownIdentifier[]; allow: ReadonlySet<string>; phai_che: string[]; khong_duoc_che: string[] }
interface Tong { bat_duoc: number; tong_phai_che: number; che_nham: number; tong_khong_duoc_che: number; ms: number[]; ner_khong_chay: number; sot: string[] }

const args = process.argv.slice(2);
const withNer = args.includes("--ner");
const chiTiet = args.includes("--chi-tiet");

function loadCases(): Cau[] {
  const file = JSON.parse(readFileSync(path.join(process.cwd(), "data/pii-eval/cau-stt.json"), "utf8")) as { cau: { id: string; text: string; phai_che: string[]; khong_duoc_che: string[] }[] };
  const allow = clinicalAllowlist();
  const out: Cau[] = file.cau.map((c) => ({ id: c.id, nguon: "cau-stt", texts: [c.text], known: [], allow, phai_che: c.phai_che, khong_duoc_che: c.khong_duoc_che }));
  for (const { id } of listKichBan()) {
    const kb = loadKichBan(id);
    out.push({ id, nguon: "kich-ban", texts: kb.doan.map((d) => d.text), known: knownIdentifiersFor(kb.benh_nhan_id).known, allow: demoAllowlist(),
      phai_che: kb.expected.phai_che, khong_duoc_che: kb.expected.phai_giu });
  }
  return out;
}

async function run(cases: Cau[], ner: boolean): Promise<Record<Cau["nguon"], Tong>> {
  const empty = (): Tong => ({ bat_duoc: 0, tong_phai_che: 0, che_nham: 0, tong_khong_duoc_che: 0, ms: [], ner_khong_chay: 0, sot: [] });
  const tong = { "cau-stt": empty(), "kich-ban": empty() };
  const env = { ...process.env, PII_NER: "on" };
  for (const c of cases) {
    const started = performance.now();
    const kq = ner ? await goiNer(c.texts, { env }) : null;
    const r = chePii(c.texts, c.known, c.allow, kq?.trang_thai === "chay" ? { spans: kq.spans, nguong: kq.nguong } : undefined);
    const t = tong[c.nguon];
    t.ms.push(performance.now() - started);
    if (ner && kq?.trang_thai !== "chay") t.ner_khong_chay++;
    const d = danhGiaMotCau(r.clean, c.phai_che, c.khong_duoc_che);
    t.bat_duoc += d.bat_duoc; t.tong_phai_che += d.tong_phai_che; t.che_nham += d.che_nham; t.tong_khong_duoc_che += c.khong_duoc_che.length;
    if (d.bat_duoc < d.tong_phai_che || d.che_nham > 0) t.sot.push(c.id);
  }
  return tong;
}

function bang(label: string, tong: Record<Cau["nguon"], Tong>) {
  for (const [nguon, t] of Object.entries(tong)) {
    const { p50, p95 } = phanVi(t.ms);
    const tyLe = t.tong_phai_che ? (100 * t.bat_duoc / t.tong_phai_che).toFixed(1) : "—";
    console.log(`${label.padEnd(10)} ${nguon.padEnd(9)} bắt được ${String(t.bat_duoc).padStart(3)}/${String(t.tong_phai_che).padEnd(3)} (${tyLe}%)  che nhầm ${String(t.che_nham).padStart(2)}/${t.tong_khong_duoc_che}  p50 ${p50.toFixed(1)} ms  p95 ${p95.toFixed(1)} ms${t.ner_khong_chay ? `  NER không chạy ${t.ner_khong_chay} lượt` : ""}`);
    if (chiTiet && t.sot.length) console.log(`           còn sót hoặc che nhầm: ${t.sot.join(", ")}`);
  }
}

async function main() {
  const cases = loadCases();
  console.log(`${cases.length} mục (${cases.filter((c) => c.nguon === "cau-stt").length} câu STT giả, ${cases.filter((c) => c.nguon === "kich-ban").length} kịch bản)\n`);
  const rule = await run(cases, false);
  bang("rule", rule);
  if (withNer) {
    const both = await run(cases, true);
    bang("rule+NER", both);
    for (const nguon of ["cau-stt", "kich-ban"] as const) {
      console.log(`chênh lệch ${nguon}: bắt được ${both[nguon].bat_duoc - rule[nguon].bat_duoc >= 0 ? "+" : ""}${both[nguon].bat_duoc - rule[nguon].bat_duoc}, che nhầm ${both[nguon].che_nham - rule[nguon].che_nham >= 0 ? "+" : ""}${both[nguon].che_nham - rule[nguon].che_nham}`);
    }
  }
}

void main();
