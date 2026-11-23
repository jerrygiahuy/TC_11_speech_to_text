import type { AiRoute, GateReason, GateResult } from "./gate";
import type { NerTrangThai, PII_POLICY_VERSION, PiiRule } from "./types";

/** R13: nhật ký mỗi lượt gửi AI. Không chứa bản thô hay bản sạch, chỉ số đếm và dấu băm. */
export interface PiiAuditEntry {
  at: string;
  encounter_id: string;
  session_sequence: number;
  policy_version: typeof PII_POLICY_VERSION;
  counts: Record<PiiRule, number>;
  gate: GateResult["passed"];
  gate_reasons: GateReason[];
  /** Mã lý do R11 của phần còn sót đã được tự che trước khi qua chốt chặn (eForm). Không có trường này nghĩa là không phải tự che gì. */
  auto_masked?: GateReason[];
  ai_route: AiRoute;
  /** Lớp NER ở lượt này. Không có trường này: nhật ký từ trước khi có NER. Không chứa nội dung. */
  ner?: { trang_thai: NerTrangThai; model_sha256?: string; so_doan?: number };
  provider: string;
  model: string;
  /** Máy chủ băm sẵn bản sạch (node:crypto), module này không băm. */
  clean_sha256: string;
}

export function buildAuditEntry(input: Omit<PiiAuditEntry, "at"> & { now: string }): PiiAuditEntry {
  // Sao chép từng trường, không spread: trường lạ (ví dụ `raw`) không bao giờ lọt vào nhật ký.
  return {
    at: input.now,
    encounter_id: input.encounter_id,
    session_sequence: input.session_sequence,
    policy_version: input.policy_version,
    counts: { ...input.counts },
    gate: input.gate,
    gate_reasons: [...input.gate_reasons],
    ...(input.auto_masked ? { auto_masked: [...input.auto_masked] } : {}),
    ai_route: input.ai_route,
    ...(input.ner ? { ner: {
      trang_thai: input.ner.trang_thai,
      ...(input.ner.model_sha256 !== undefined ? { model_sha256: input.ner.model_sha256 } : {}),
      ...(input.ner.so_doan !== undefined ? { so_doan: input.ner.so_doan } : {}),
    } } : {}),
    provider: input.provider,
    model: input.model,
    clean_sha256: input.clean_sha256,
  };
}
