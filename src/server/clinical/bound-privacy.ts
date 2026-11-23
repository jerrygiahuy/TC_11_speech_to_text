import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { ClinicalActor, PrivacyCheckResult, TranscriptBinding } from "@/shared/clinical/api";
import { buildAuditEntry, PII_POLICY_VERSION, type NerKetQua } from "@/shared/clinical/pii";
import { goiNer } from "./ner-client";
import { ClinicalError, ClinicalRepository } from "./repository";
import { resolveEncounterContextForRecord } from "./encounter-context";
import { PrivacyTickets, privacyTickets } from "./privacy";
import { knownIdentifiersForContext } from "./known-identifiers";
import { clinicalAllowlist } from "./pii-allowlist";
import { AUDIT_NOT_CALLED, appendPiiAudit } from "./pii-audit";

export const recordingBindingSchema = z.object({ encounter_id: z.uuid(), recording_session_id: z.uuid(),
  generation: z.number().int().positive(), content_revision: z.number().int().positive() }).strict();
const textSchema = z.string().trim().min(1).max(50_000);
const checkSchema = z.object({ binding: recordingBindingSchema, text: textSchema, mode: z.enum(["conversation", "dictation"]) }).strict();
const repository = new ClinicalRepository();
interface Options { store?: ClinicalRepository; tickets?: PrivacyTickets; auditDirectory?: string; now?: () => string; nerKetQua?: NerKetQua }

/** Recheck server-owned identity and current text revision before every ticket operation. */
export function requireRecordingContext(actor: ClinicalActor, value: TranscriptBinding, store = repository) {
  const binding = recordingBindingSchema.parse(value);
  const record = store.read(binding.encounter_id);
  const context = resolveEncounterContextForRecord(actor, record);
  const session = record.recording_sessions.find(item => item.id === binding.recording_session_id);
  if (!session || session.generation !== binding.generation || session.content_revision !== binding.content_revision) {
    throw new ClinicalError("Phiên hoặc phiên bản nội dung đã thay đổi. Hãy kiểm tra lại lời nói.", 409);
  }
  if (!["dang_kham", "cho_kq_cls"].includes(record.status)) throw new ClinicalError("Lượt khám đã kết thúc, không nhận nội dung mới.", 409);
  if (session.content_state === "discarded") throw new ClinicalError("Nội dung đã được bỏ. Hãy mở phiên bản nội dung mới trước khi kiểm tra.", 409);
  const { known, consent } = knownIdentifiersForContext(context);
  return { binding, record, session, context, known, consent };
}

/**
 * Che + tự che phần còn sót + chốt chặn R11 + đồng ý R14 cho nội dung của một phiên.
 * Chỉ khi tự che xong vẫn còn sót mới bị chặn: ghi một dòng nhật ký R13 (không gọi AI) và không cấp ticket.
 */
export function checkRecordingPrivacy(actor: ClinicalActor, value: unknown, options: Options = {}): PrivacyCheckResult {
  const request = checkSchema.parse(value);
  const source = requireRecordingContext(actor, request.binding, options.store);
  const tickets = options.tickets ?? privacyTickets;
  const result = tickets.check(request.text, request.mode, { known: source.known, allowlist: clinicalAllowlist(), consent: source.consent.trang_thai, binding: source.binding,
    ...(options.nerKetQua ? { ner: options.nerKetQua } : {}) });
  const base = { ...result, auto_masked: result.auto_masked.map(item => ({ ...item })),
    gate: { passed: result.gate.passed, reasons: result.gate.reasons.map(item => ({ ...item })) }, dong_y: { ...source.consent }, binding: source.binding };
  if (result.status === "blocked") {
    appendPiiAudit(source.record.id, buildAuditEntry({
      now: options.now?.() ?? new Date().toISOString(), encounter_id: source.record.id, session_sequence: source.session.sequence,
      policy_version: PII_POLICY_VERSION, counts: result.counts, gate: false, gate_reasons: result.gate.reasons.map(item => item.reason),
      ...(result.auto_masked.length ? { auto_masked: result.auto_masked.map(item => item.reason) } : {}),
      ai_route: result.ai_route, ner: nerAudit(options.nerKetQua, result.ner.so_doan), provider: AUDIT_NOT_CALLED, model: AUDIT_NOT_CALLED,
      clean_sha256: createHash("sha256").update(result.preview).digest("hex"),
    }), options.auditDirectory);
    return base;
  }
  return { ...base, digest: tickets.reviewed(result.ticket!, source.binding).digest };
}

function nerAudit(ner: NerKetQua | undefined, soDoan: number) {
  return ner?.trang_thai === "chay" ? { trang_thai: "chay" as const, model_sha256: ner.model_sha256, so_doan: soDoan } : { trang_thai: ner?.trang_thai ?? ("tat" as const) };
}

/**
 * Như `checkRecordingPrivacy`, nhưng gọi lớp NER local trước khi che (route dùng bản này).
 * Đầu vào sai bị từ chối trước khi gọi NER. NER lỗi hay tắt thì kết quả giống hệt chỉ dùng rule.
 */
export async function checkRecordingPrivacyWithNer(actor: ClinicalActor, value: unknown, options: Omit<Options, "nerKetQua"> & { ner?: typeof goiNer } = {}): Promise<PrivacyCheckResult> {
  const request = checkSchema.parse(value);
  requireRecordingContext(actor, request.binding, options.store);
  const nerKetQua = await (options.ner ?? goiNer)([request.text.trim()]);
  return checkRecordingPrivacy(actor, request, { ...options, nerKetQua });
}
