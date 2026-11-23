import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SpeakerMode } from "@/shared/clinical/api";
import type { Transcript } from "@/shared/clinical/types";
import { parseTranscript } from "@/shared/clinical/schema";
import {
  aiRouteFor, chePii, PII_POLICY_VERSION,
  type AiRoute, type GateReason, type GateResult, type KnownIdentifier, type NerKetQua, type NerTrangThai, type PiiAuditEntry, type PiiRule,
} from "@/shared/clinical/pii";
import { ClinicalError } from "./repository";

import { hasRestrictedContent } from "@/shared/clinical/data-policy";

export interface PrivacyBinding {
  encounter_id: string;
  recording_session_id: string;
  generation: number;
  content_revision: number;
}

function sameBinding(left: PrivacyBinding | undefined, right: PrivacyBinding | undefined) {
  return left === undefined && right === undefined || Boolean(left && right
    && left.encounter_id === right.encounter_id && left.recording_session_id === right.recording_session_id
    && left.generation === right.generation && left.content_revision === right.content_revision);
}

function checkBinding(entry: Entry, expected: PrivacyBinding | undefined) {
  if (!sameBinding(entry.binding, expected)) throw new ClinicalError("Nội dung thuộc lượt khám hoặc phiên bản khác. Hãy kiểm tra lại.", 409);
}

const TTL_MS = 10 * 60_000;

type Entry = {
  preview: string;
  mode: SpeakerMode;
  expires: number;
  transcriptId: string;
  requestId: string;
  processedAt: string;
  consent: boolean;
  counts: Record<PiiRule, number>;
  autoMasked: GateReason[];
  aiRoute: AiRoute;
  ner: NonNullable<PiiAuditEntry["ner"]>;
  binding?: PrivacyBinding;
};

/**
 * Kết quả che + tự che phần còn sót + chốt chặn R11 + đồng ý R14. Chỉ bị chặn khi tự che xong vẫn còn sót; khi đó không có ticket.
 * `gate.reasons[].excerpt` và `auto_masked[].excerpt` chỉ gửi về màn hình, không ghi đĩa hay log.
 */
export interface PrivacyCheck {
  status: "passed" | "blocked";
  ticket: string | null;
  preview: string;
  counts: Record<PiiRule, number>;
  /** Phần chốt chặn R11 thấy còn sót ở lượt đầu và đã được tự che (rỗng nếu không có). */
  auto_masked: GateResult["reasons"];
  /** Kết quả chốt chặn chạy lại trên bản đã tự che. */
  gate: GateResult;
  ai_route: AiRoute;
  /** Lớp NER ở lượt này (không có nội dung): đã chạy, không chạy (chỉ rule) hay tắt; số đoạn NER đã che thêm. */
  ner: { trang_thai: NerTrangThai; so_doan: number };
  expires_at: string | null;
}

export interface PrivacyCheckInput {
  known: KnownIdentifier[];
  allowlist: ReadonlySet<string>;
  consent: boolean;
  binding?: PrivacyBinding;
  /** Kết quả gọi NER trên đúng văn bản sẽ che (đã trim). Không có: coi như NER tắt. */
  ner?: NerKetQua;
}

/** Process-local, bounded bearer tickets. Only redacted text is retained; no disk or cloud I/O. */
export class PrivacyTickets {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now = Date.now, private readonly capacity = 100) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error("Giới hạn bộ nhớ không hợp lệ.");
  }

  private checkText(text: string) {
    if (typeof text !== "string" || !text.trim() || text.length > 50_000) throw new ClinicalError("Nội dung kiểm tra không hợp lệ.", 400);
  }

  private read(ticket: string) {
    const entry = this.entries.get(ticket);
    if (!entry || entry.expires <= this.now()) {
      this.entries.delete(ticket);
      throw new ClinicalError("Phiên kiểm tra không hợp lệ hoặc đã hết hạn. Hãy kiểm tra lại nội dung.", 400);
    }
    return entry;
  }

  private add(entry: Entry): string {
    for (const [key, item] of this.entries) if (item.expires <= this.now()) this.entries.delete(key);
    while (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!);
    const ticket = randomBytes(32).toString("base64url");
    this.entries.set(ticket, entry);
    return ticket;
  }

  /**
   * Bộ pii-auto-2: che R1–R8 (nhãn R10) → chốt chặn R11; còn sót thì tự che phần sót rồi chạy lại R11 → tuyến AI theo R14.
   * Chỉ bản sạch được giữ lại, và chỉ khi lượt chốt chặn cuối cùng qua.
   */
  check(text: string, mode: SpeakerMode, input: PrivacyCheckInput): PrivacyCheck {
    this.checkText(text);
    if (mode !== "conversation" && mode !== "dictation") throw new ClinicalError("Chế độ người nói không hợp lệ.", 400);
    if (hasRestrictedContent(text)) throw new ClinicalError("Dữ liệu cấp 3 không được đưa vào AI.", 403);
    // Bộ che dùng chung với /demo-luong (`chePii`).
    const nerOn = input.ner?.trang_thai === "chay" ? input.ner : null;
    const redacted = chePii(text.trim(), input.known, input.allowlist, nerOn ? { spans: nerOn.spans, nguong: nerOn.nguong } : undefined);
    const ner: Entry["ner"] = nerOn
      ? { trang_thai: "chay", model_sha256: nerOn.model_sha256, so_doan: redacted.ner_chap_nhan }
      : { trang_thai: input.ner?.trang_thai ?? "tat" };
    const clean = redacted.clean.trim();
    this.checkText(clean);
    const { gate, auto_masked: autoMasked } = redacted;
    const aiRoute = aiRouteFor(input.consent);
    const result = { preview: clean, counts: { ...redacted.counts }, auto_masked: autoMasked, gate, ai_route: aiRoute,
      ner: { trang_thai: ner.trang_thai, so_doan: ner.so_doan ?? 0 } };
    if (!gate.passed) return { ...result, status: "blocked", ticket: null, expires_at: null };
    const expires = this.now() + TTL_MS;
    const ticket = this.add({ preview: clean, mode, expires, transcriptId: randomUUID(), requestId: randomUUID(),
      processedAt: new Date(this.now()).toISOString(), consent: input.consent, counts: { ...redacted.counts },
      autoMasked: autoMasked.map(item => item.reason), aiRoute, ner,
      ...(input.binding ? { binding: structuredClone(input.binding) } : {}) });
    return { ...result, status: "passed", ticket, expires_at: new Date(expires).toISOString() };
  }

  /** Dữ liệu cho bằng chứng khử định danh và nhật ký R13 của một ticket đã qua chốt chặn. */
  pii(ticket: string, binding?: PrivacyBinding): { counts: Record<PiiRule, number>; auto_masked: GateReason[]; ai_route: AiRoute; consent: boolean; clean_sha256: string; ner: Entry["ner"] } {
    const entry = this.read(ticket);
    checkBinding(entry, binding);
    return { counts: { ...entry.counts }, auto_masked: [...entry.autoMasked], ai_route: entry.aiRoute, consent: entry.consent, ner: { ...entry.ner },
      clean_sha256: createHash("sha256").update(entry.preview).digest("hex") };
  }

  approved(ticket: string, binding?: PrivacyBinding): Transcript {
    const entry = this.read(ticket);
    checkBinding(entry, binding);
    if (hasRestrictedContent(entry.preview)) throw new ClinicalError("Dữ liệu cấp 3 không được đưa vào AI.", 403);
    // Unlabelled conversation never implies a doctor.
    const chunks = entry.preview.split(/\n+|(?<=[.!?])\s+(?=(?:BS|BN)\s*[:：])/iu).map(text => text.trim()).filter(Boolean);
    const segments = chunks.map((text, index): Transcript["segments"][number] => {
      const label = /^(BS|BN)\s*[:：]\s*/iu.exec(text);
      const role = label ? (label[1].toUpperCase() === "BS" ? "bac_si" : "benh_nhan") : entry.mode === "dictation" ? "bac_si" : "chua_ro";
      return { id: `${entry.transcriptId}-segment-${index + 1}`, sequence: index, utterance_ref: null, speaker_id: null,
        vai_tro: role, nguon_vai_tro: role === "chua_ro" ? "chua_ro" : "bac_si_gan", start_ms: null, end_ms: null,
        text: text.slice(label?.[0].length ?? 0).trim(), is_final: true };
    }).filter(item => item.text.length > 0);
    return parseTranscript({ schema_version: "1.1.0", request_id: entry.requestId, transcript_id: entry.transcriptId,
      revision: 1, language: "vi", privacy: { trang_thai: "passed", policy_version: PII_POLICY_VERSION, processed_at: entry.processedAt },
      context: { tuoi_thang: null, gioi_tinh: null, can_nang_kg: null }, segments,
      ...(entry.binding ? { binding: entry.binding } : {}) });
  }

  /** The digest is computed from the reviewed transcript, never accepted from a client. */
  reviewed(ticket: string, binding: PrivacyBinding): { transcript: Transcript; digest: string } {
    const transcript = this.approved(ticket, binding);
    const digest = createHash("sha256").update(JSON.stringify(transcript)).digest("hex");
    return { transcript, digest };
  }
}

const state = globalThis as typeof globalThis & { clinicalPrivacyTickets?: PrivacyTickets };
export const privacyTickets = state.clinicalPrivacyTickets ??= new PrivacyTickets();
