// Gọi API lâm sàng từ trình duyệt. Kiểu request/response lấy từ src/shared/clinical nên lệch với route là báo lỗi ngay.
// Mọi hàm ghi đều trả bản hồ sơ mới nhất; nơi gọi phải cập nhật phiên bản (revision) từ kết quả.
import type {
  ClinicalExtraction, ClinicalResponse, EncounterSummary, PrivacyCheckResult, SpeakerMode, TranscriptBinding,
  ApproveClinicalRequest, TransitionClinicalRequest, DecideClinicalChangesRequest,
  StartRecordingRequest, HeartbeatRecordingRequest, FinalizeRecordingRequest, UpdateRecordingContentRequest,
} from "@/shared/clinical/api";
import type { ClinicalChangeSet } from "@/shared/clinical/changes";
import type { EformSnapshot } from "@/shared/clinical/eform";
import type { Encounter, RecordingSession } from "@/shared/clinical/types";

export type { ClinicalResponse } from "@/shared/clinical/api";
export interface AvailableEncounter { appointment_id: string; patient_id: string; patient_name: string }
export interface EncounterList { open: EncounterSummary[]; available: AvailableEncounter[] }
export interface StartedRecording { record: Encounter; session: RecordingSession; lease_token: string }

const DEFAULT_ERROR = "Không xử lý được yêu cầu lâm sàng.";

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(data.error ?? data.message ?? fallback);
  return data;
}

async function post<T>(url: string, body: unknown, fallback = DEFAULT_ERROR, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal });
  return parse<T>(response, fallback);
}

/** Danh sách lượt đang khám/chờ và các mã khám có thể mở. */
export async function listEncounters(signal?: AbortSignal): Promise<EncounterList> {
  return parse<EncounterList>(await fetch("/api/clinical/encounters", { cache: "no-store", signal }), "Không đọc được danh sách lượt khám.");
}

/** Mở hoặc dùng lại hồ sơ của một mã khám; danh tính và dữ liệu bệnh nhân luôn do server quyết định. */
export function openEncounter(appointmentId: string, signal?: AbortSignal): Promise<ClinicalResponse> {
  return post<ClinicalResponse>("/api/clinical/open", { appointment_id: appointmentId }, "Không mở được lượt khám.", signal);
}

export async function docHoSo(id: string, signal?: AbortSignal): Promise<ClinicalResponse> {
  return parse<ClinicalResponse>(await fetch(`/api/clinical/encounters/${encodeURIComponent(id)}`, { cache: "no-store", signal }), "Không đọc được hồ sơ.");
}

export function luuHoSo(snapshot: EformSnapshot, current: { id: string; revision: number }, tomTat: string | null): Promise<ClinicalResponse> {
  return post<ClinicalResponse>("/api/clinical/encounters", { id: current.id, expected_revision: current.revision, snapshot, tom_tat: tomTat }, "Không lưu được phiếu khám và chỉ định.");
}

export function approveScopes(request: ApproveClinicalRequest): Promise<ClinicalResponse> {
  return post<ClinicalResponse>("/api/clinical/approve", request, "Không duyệt được hồ sơ.");
}

export function transitionEncounter(request: TransitionClinicalRequest): Promise<ClinicalResponse> {
  return post<ClinicalResponse>("/api/clinical/transition", request, "Không đổi được trạng thái lượt khám.");
}

export const recordingApi = {
  start: (request: StartRecordingRequest) => post<StartedRecording>("/api/clinical/recording", { action: "start", ...request }, "Không mở được phiên ghi âm."),
  heartbeat: (request: HeartbeatRecordingRequest) => post<{ expires_at: string }>("/api/clinical/recording", { action: "heartbeat", ...request }, "Mất quyền giữ micro."),
  finalize: (request: FinalizeRecordingRequest) => post<ClinicalResponse>("/api/clinical/recording", { action: "finalize", ...request }, "Không chốt được phiên ghi âm."),
  content: ({ action, ...request }: UpdateRecordingContentRequest) => post<ClinicalResponse>("/api/clinical/recording", { action: "content", content_action: action, ...request }, "Không cập nhật được nội dung phiên ghi âm."),
  recover: (deviceId: string) => post<{ ok: true }>("/api/clinical/recording", { action: "recover", device_id: deviceId }, "Không khôi phục được phiên ghi âm."),
};

/** Máy chủ che PII (R1–R8, R10), chạy chốt chặn R11 và đọc cờ đồng ý R14. Bị chặn thì không có ticket. */
export function checkClinicalPrivacy(text: string, mode: SpeakerMode, binding: TranscriptBinding): Promise<PrivacyCheckResult> {
  return post<PrivacyCheckResult>("/api/clinical/privacy", { action: "check", text, mode, binding }, "Không che được thông tin nhận dạng.");
}

export function extractClinicalDraft(ticket: string, binding: TranscriptBinding): Promise<ClinicalExtraction> {
  return post<ClinicalExtraction>("/api/clinical/extract", { ticket, binding }, "Không tạo được bản nháp.");
}

export function proposeChanges(encounterId: string, runId: string): Promise<ClinicalChangeSet> {
  return post<ClinicalChangeSet>("/api/clinical/changes", { action: "propose", encounter_id: encounterId, run_id: runId }, "Không đọc được đề xuất thay đổi.");
}

export function decideChanges(request: DecideClinicalChangesRequest): Promise<ClinicalResponse> {
  return post<ClinicalResponse>("/api/clinical/changes", { action: "decide", ...request }, "Không lưu được quyết định.");
}
