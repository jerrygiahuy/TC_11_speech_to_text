import type { AiOutput, Encounter, Transcript } from "./types";
import type { EformData } from "../eform/types";
import type { ClinicalChangeSet } from "./changes";
import type { TranscriptBinding } from "./recording";
import type { EformSnapshot } from "./eform";
import type { AiRoute, GateReason, NerTrangThai, PiiRule } from "./pii";

export type { TranscriptBinding } from "./recording";
export type { StartRecordingRequest, HeartbeatRecordingRequest, FinalizeRecordingRequest, UpdateRecordingContentRequest } from "./recording";
export type { ApproveClinicalRequest, TransitionClinicalRequest } from "./approvals";
export type { DecideClinicalChangesRequest } from "./changes";
export interface ClinicalActor { doctorId: string; facilityId: string }
export interface EncounterContext { appointmentId: string; patientId: string; facilityId: string; doctorId: string; data: EformData }
export interface EncounterSummary { id: string; appointment_id: string | null; patient_id: string; patient_name: string; facility_id: string; status: Encounter["status"]; revision: number; updated_at: string }
export interface ClinicalRecordResponse { record: Encounter; snapshot: EformSnapshot; latest_ai?: ClinicalExtraction | null; data: EformData; context: EncounterContext; change_sets?: ClinicalChangeSet[] }
export type ClinicalResponse = ClinicalRecordResponse;
export interface RecordingResponse extends ClinicalRecordResponse { recording_session_id: string; replayed: boolean }
export interface OpenEncounterRequest { appointment_id: string }
export interface PrivacyReviewRequest { text: string; mode: SpeakerMode; binding: TranscriptBinding }

export type SpeakerMode = "conversation" | "dictation";
/**
 * Kết quả che PII (pii-auto-2): R1–R8 che, R10 nhãn, R11 chốt chặn, R14 đồng ý. Chốt chặn thấy còn sót thì máy chủ tự che phần đó
 * (`auto_masked`) rồi kiểm lại. Chỉ khi tự che xong vẫn còn sót mới bị chặn: `ticket` là null và không gửi AI.
 */
export interface PrivacyCheckResult {
  status: "passed" | "blocked";
  ticket: string | null;
  /** Bản đã che (bản sạch), gồm cả phần tự che thêm. */
  preview: string;
  counts: Record<PiiRule, number>;
  /** Phần còn sót đã được tự che. `excerpt` là chính phần đó: chỉ để hiện cho bác sĩ, không ghi đĩa hay log. */
  auto_masked: { reason: GateReason; excerpt: string }[];
  /** Chốt chặn chạy lại trên bản đã tự che. `excerpt` có thể chứa phần còn sót: chỉ để hiện cho bác sĩ, không ghi đĩa hay log. */
  gate: { passed: boolean; reasons: { reason: GateReason; excerpt: string }[] };
  ai_route: AiRoute;
  /** Lớp NER ở lượt này, không có nội dung: đã chạy / không chạy (chỉ rule) / tắt, và số đoạn NER đã che thêm. */
  ner: { trang_thai: NerTrangThai; so_doan: number };
  dong_y: { trang_thai: boolean; luc: string | null };
  expires_at: string | null;
  binding: TranscriptBinding;
  digest?: string;
}

export interface ClinicalExtraction {
  run_id: string;
  draft: AiOutput;
  transcript: Transcript;
  provider: string;
  model: string;
  prompt_version: string;
  created_at: string;
  input_digest: string;
  duration_ms: number;
  /** Absent only on legacy immutable runs. */
  binding?: TranscriptBinding;
}
