/**
 * Thử bộ che PII dùng chung (`chePii`) trên một câu hoặc file, không cần mở trình duyệt hay ghi âm.
 * Cùng hàm, cùng allowlist với eForm và /demo-luong, nên kết quả giống hệt trên trang.
 *
 *   npm run thu-che-pii -- "tiền sử đái tháo đường rối loạn mỡ máu"
 *   npm run thu-che-pii -- --file temp-1/transcript.txt
 *   npm run thu-che-pii -- --ner "câu"          # thêm lớp NER (cần STT chạy, có mô hình models/ner/)
 *
 * Chỉ in ra màn hình, không ghi file. Văn bản thật chỉ để trong temp-1/ (đã gitignore).
 */
import { readFileSync } from "node:fs";
import { chePii } from "@/shared/clinical/pii";
import { clinicalAllowlist } from "@/server/clinical/pii-allowlist";
import { goiNer } from "@/server/clinical/ner-client";
import { nhanNer } from "@/shared/clinical/pii/nhan";

const all = process.argv.slice(2);
const withNer = all.includes("--ner");
const args = all.filter((a) => a !== "--ner");
const fileAt = args.indexOf("--file");
const text = fileAt >= 0 ? readFileSync(args[fileAt + 1], "utf8") : args.join(" ");
if (!text.trim()) {
  console.error('Cách dùng: npm run thu-che-pii -- "câu cần thử"   hoặc   npm run thu-che-pii -- --file đường/dẫn.txt');
  process.exit(1);
}

async function main() {
  const ner = withNer ? await goiNer([text.trim()], { env: { ...process.env, PII_NER: "on" } }) : null;
  const r = chePii(text.trim(), [], clinicalAllowlist(), ner?.trang_thai === "chay" ? { spans: ner.spans, nguong: ner.nguong } : undefined);
  console.log("Bản đã che:\n" + r.clean + "\n");
  console.log(`R1–R8 che ${r.spans.filter((s) => !s.nguon).length} mục:`);
  for (const s of r.spans.filter((x) => !x.nguon)) console.log(`  ${s.rule} ${s.label.padEnd(18)} ${r.raw.slice(s.start, s.end)}`);
  if (ner) {
    console.log(nhanNer({ trang_thai: ner.trang_thai, so_doan: r.ner_chap_nhan }) + (ner.trang_thai === "chay" ? `, ngưỡng ${ner.nguong}` : ""));
    for (const s of r.spans.filter((x) => x.nguon === "ner")) console.log(`  NER ${s.label.padEnd(18)} ${r.raw.slice(s.start, s.end)}`);
  }
  console.log(`R11 tự che thêm ${r.auto_masked.length} mục:`);
  for (const m of r.auto_masked) console.log(`  ${m.reason} ${m.excerpt}`);
  console.log(`Chặn: ${r.gate.passed ? "không" : "CÓ — " + r.gate.reasons.map((x) => `${x.reason} (${x.excerpt})`).join("; ")}`);
}

void main();
