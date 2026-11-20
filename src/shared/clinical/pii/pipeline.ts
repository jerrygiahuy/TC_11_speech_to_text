import { checkResidualPii, maskResidualPii, type GateResult } from "./gate";
import { locNer } from "./ner";
import { redactPii } from "./redact";
import type { KnownIdentifier, NerSpan, PiiRule, PiiSpan } from "./types";

export interface ChePiiResult {
  /** Bản thô (NFC), các đoạn nối bằng "\n". Không bao giờ ghi đĩa. */
  raw: string;
  /** Vị trí đoạn nhạy cảm R1–R8 trên `raw`. */
  spans: PiiSpan[];
  counts: Record<PiiRule, number>;
  /** Bản đã che từng đoạn (sau R1–R8 và tự che phần còn sót R11). */
  parts: string[];
  /** `parts` nối bằng "\n": bản duy nhất được đưa cho AI khi `gate.passed`. */
  clean: string;
  /** Kết quả chốt chặn R11 lượt cuối. */
  gate: GateResult;
  /** Những gì R11 tự che thêm. `excerpt` chứa chính PII: chỉ hiện cho bác sĩ, không ghi đĩa hay log. */
  auto_masked: GateResult["reasons"];
  /** Số đoạn che do lớp NER thêm (sau khi lọc và cắt phần chồng). 0 khi không có NER. */
  ner_chap_nhan: number;
}

/** Đầu vào NER cho `chePii`: `spans[i]` thuộc đoạn văn thứ i (vị trí trên chuỗi NFC), `nguong` từ meta mô hình. */
export interface ChePiiNer { spans: readonly (readonly NerSpan[])[]; nguong: number }

/**
 * Bộ che PII dùng chung cho mọi luồng (eForm `src/server/clinical/privacy.ts`, `/demo-luong` `src/server/demo-luong/flow.ts`):
 * che R1–R8 từng đoạn → chốt chặn R11 trên toàn văn → còn sót thì tự che từng đoạn rồi kiểm lại.
 * Muốn thử một câu thì gọi hàm này (hoặc `npm run thu-che-pii -- "câu"`), kết quả giống hệt hai trang.
 */
export function chePii(input: string | readonly string[], known: KnownIdentifier[], allowlist: ReadonlySet<string>, ner?: ChePiiNer): ChePiiResult {
  const texts = (typeof input === "string" ? [input] : [...input]).map((t) => t.normalize("NFC"));
  // Số mảng NER phải khớp số đoạn văn; lệch thì bỏ qua NER (che bằng rule như cũ).
  const nerParts = ner && ner.spans.length === texts.length ? ner.spans : null;
  const spans: PiiSpan[] = [];
  const counts = {} as Record<PiiRule, number>;
  let parts: string[] = [];
  let offset = 0;
  for (const [i, text] of texts.entries()) {
    const r = redactPii(text, known, nerParts ? locNer(text, nerParts[i], allowlist, ner!.nguong) : []);
    for (const s of r.spans) spans.push({ ...s, start: s.start + offset, end: s.end + offset });
    for (const [rule, n] of Object.entries(r.counts) as [PiiRule, number][]) counts[rule] = (counts[rule] ?? 0) + n;
    parts.push(r.clean);
    offset += text.length + 1;
  }
  let gate = checkResidualPii(parts.join("\n"), known, allowlist);
  const auto_masked: GateResult["reasons"] = [];
  if (!gate.passed) {
    parts = parts.map((part) => {
      const m = maskResidualPii(part, known, allowlist);
      auto_masked.push(...m.masked);
      return m.clean;
    });
    gate = checkResidualPii(parts.join("\n"), known, allowlist);
  }
  const ner_chap_nhan = spans.filter((s) => s.nguon === "ner").length;
  return { raw: texts.join("\n"), spans, counts, parts, clean: parts.join("\n"), gate, auto_masked, ner_chap_nhan };
}
