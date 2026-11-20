import "server-only";
import type { ClinicalActor, ClinicalExtraction, TranscriptBinding } from "@/shared/clinical/api";
import { buildAuditEntry, PII_POLICY_VERSION } from "@/shared/clinical/pii";
import { requireRecordingContext } from "./bound-privacy";
import { contextFromVitals, extractClinical } from "./extraction";
import { appendPiiAudit } from "./pii-audit";
import { PrivacyTickets, privacyTickets } from "./privacy";
import { ClinicalError, ClinicalRepository } from "./repository";

interface Options { store?: ClinicalRepository; tickets?: PrivacyTickets; runDirectory?: string; auditDirectory?: string }

/**
 * Tạo bản nháp từ bản đã qua chốt chặn R11 của một phiên. Bằng chứng khử định danh (R11 + R14) do máy chủ dựng từ ticket,
 * không nhận từ request. Chưa có adapter AI ngoài nên provider cố định là bộ tách trên máy (`mock`).
 * Chỉ ghi nhật ký R13 sau khi tạo được bản nháp; lỗi trước đó (ticket hết hạn, sai phiên) không ghi gì.
 */
export async function extractForRecording(actor: ClinicalActor, ticket: string, binding: TranscriptBinding, options: Options = {}): Promise<ClinicalExtraction> {
  const tickets = options.tickets ?? privacyTickets;
  const source = requireRecordingContext(actor, binding, options.store);
  const reviewed = tickets.reviewed(ticket, binding);
  if (source.session.reviewed_content_revision !== binding.content_revision || source.session.reviewed_digest !== reviewed.digest) {
    throw new ClinicalError("Cần lưu bản chép lời đã kiểm tra trước khi tạo bản nháp.", 409);
  }
  const pii = tickets.pii(ticket, binding);
  const run = await extractClinical(ticket, {
    binding, provider: "mock", directory: options.runDirectory, context: contextFromVitals(source.record.sinh_hieu, source.record.encounter_at),
    approvedTranscript: value => tickets.approved(value, binding),
    deidentification: { policy_version: PII_POLICY_VERSION, gate_passed: true, consent: pii.consent },
  });
  appendPiiAudit(source.record.id, buildAuditEntry({
    now: new Date().toISOString(), encounter_id: source.record.id, session_sequence: source.session.sequence,
    policy_version: PII_POLICY_VERSION, counts: pii.counts, gate: true, gate_reasons: [],
    ...(pii.auto_masked.length ? { auto_masked: pii.auto_masked } : {}), ai_route: pii.ai_route, ner: pii.ner,
    provider: run.provider, model: run.model, clean_sha256: pii.clean_sha256,
  }), options.auditDirectory);
  return run;
}
