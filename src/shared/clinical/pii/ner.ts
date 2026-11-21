import { coveredByAllowlist, DEFAULT_CLINICAL_ALLOWLIST } from "./gate";
import { foldVietnamese } from "./redact";
import type { NerChapNhan, NerSpan, PiiLabelKind, PiiRule } from "./types";

/**
 * Loại thực thể PhoNER_COVID19 được dùng để che, và mã rule/nhãn tương ứng. Loại khác (bệnh, triệu chứng, ngày, tuổi,
 * giới tính, nghề, phương tiện) bị bỏ: không che nội dung lâm sàng, ngày/tuổi/giới đã có rule R4/R7.
 */
export const NER_SANG_NHAN: Readonly<Record<string, readonly [PiiRule, PiiLabelKind]>> = {
  NAME: ["R2", "NGƯỜI"],
  LOCATION: ["R3", "ĐỊA_DANH"],
  ORGANIZATION: ["R3", "NƠI_LÀM_VIỆC"],
  PATIENT_ID: ["R6", "MÃ_ĐỊNH_DANH"],
};

/**
 * Lọc đoạn NER trước khi che: bỏ loại không dùng, điểm dưới ngưỡng, vị trí sai, đoạn có dưới 2 chữ cái/chữ số,
 * và đoạn mà mọi token đều nằm trong cụm allowlist lâm sàng (mặc định + của người gọi).
 */
export function locNer(text: string, spans: readonly NerSpan[], allowlist: ReadonlySet<string>, nguong: number): NerChapNhan[] {
  const toks = [...text.normalize("NFC").toLowerCase().matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({ s: m.index!, e: m.index! + m[0].length, f: foldVietnamese(m[0]) }));
  const covered = coveredByAllowlist(toks.map((t) => t.f), new Set([...DEFAULT_CLINICAL_ALLOWLIST, ...[...allowlist].map(foldVietnamese)]));
  const out: NerChapNhan[] = [];
  for (const span of spans) {
    const map = NER_SANG_NHAN[span.nhan];
    if (!map || !(span.diem >= nguong)) continue;
    if (!Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < 0 || span.end > text.length || span.start >= span.end) continue;
    // Cần ≥ 2 chữ cái/chữ số: "P." hay "T" trong ghi tắt là bên phải/trái, không phải tên người.
    if ((text.slice(span.start, span.end).match(/[\p{L}\p{N}]/gu)?.length ?? 0) < 2) continue;
    const inside = toks.map((t, i) => ({ t, i })).filter(({ t }) => t.s < span.end && t.e > span.start);
    if (inside.length > 0 && inside.every(({ i }) => covered[i])) continue;
    out.push({ start: span.start, end: span.end, rule: map[0], kind: map[1] });
  }
  return out;
}
