// DTO dùng chung cho dashboard lịch khám (Task 1). Chỉ là kiểu, không import module server.

/** YYYY-MM-DD theo lịch thực, múi giờ cơ sở (Asia/Ho_Chi_Minh). */
export type ClinicDate = string;

export type DisplayStatus =
  | "scheduled"
  | "in_progress"
  | "waiting_results"
  | "completed"
  | "cancelled"
  | "admitted"
  | "emergency_transfer"
  | "facility_transfer"
  | "unknown";

export type InsuranceKind = "bhyt" | "bao_lanh";

export interface InsuranceInfo {
  known: boolean;
  enrolled: boolean | null;
  provider: string | null;
  plan: string | null;
  member_code: string | null;
  valid_from: ClinicDate | null;
  valid_to: ClinicDate | null;
}

export interface PatientProfile {
  id: string;
  facility_id: string;
  full_name: string;
  date_of_birth: ClinicDate | null;
  gender: string | null;
  insurance: Record<InsuranceKind, InsuranceInfo>;
}

export interface Appointment {
  id: string;
  facility_id: string;
  patient_id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string | null;
  content: string;
  scheduling_status: "scheduled" | "cancelled";
}

/** Vì sao lịch mở (hoặc không mở) được phiếu khám; do server quyết định. */
export type OpenReason = "eligible" | "cancelled" | "future" | "terminal" | "unknown" | "no_context";

export interface AppointmentItem {
  appointment: Appointment;
  patient: PatientProfile;
  doctor_name: string;
  encounter_id: string | null;
  status: DisplayStatus;
  has_prior_encounter: boolean;
  /** Mở/tiếp tục được phiếu khám của lịch này; server kiểm lại khi bấm mở. */
  can_open: boolean;
  open_reason: OpenReason;
}

export interface DashboardTotals {
  total: number;
  completed: number;
  remaining: number;
  unfinished: number;
  cancelled: number;
  other: number;
  unknown: number;
}

export interface DashboardData {
  date: ClinicDate;
  timezone: "Asia/Ho_Chi_Minh";
  doctor: { id: string; name: string };
  facility: { id: string; name: string };
  appointments: AppointmentItem[];
  carriedOpenItems: AppointmentItem[];
  totals: DashboardTotals;
  fetchedAt: string;
}

/** Một dòng trong lịch sử khám: chỉ tóm tắt, không chứa transcript hay dữ liệu AI. */
export interface HistorySummary {
  id: string;
  appointment_id: string | null;
  encounter_at: string;
  summary: string;
  doctor_name: string;
  status: DisplayStatus;
}

export interface PatientPageData {
  patient: PatientProfile;
  /** Lịch của bác sĩ đang xem cho bệnh nhân này mà mở/tiếp tục được phiếu (server đã lọc theo chính sách mở phiếu). */
  eligibleAppointments: AppointmentItem[];
  history: HistorySummary[];
  selectedAppointmentId: string | null;
}

export type ApprovalLabelState = "draft" | "approved" | "changed";

/** Phiếu cũ đã chiếu sang dạng chỉ đọc: chỉ có chuỗi hiển thị, không có transcript hay lần chạy AI. */
export interface HistoricalEncounterViewModel {
  id: string;
  appointment_id: string | null;
  revision: number;
  encounter_at: string;
  status: DisplayStatus;
  patient: PatientProfile;
  /** Hồ sơ hiện tại của bệnh nhân, không phải bản chụp lúc khám. */
  identity_source: "current_profile";
  doctor_name: string;
  facility_name: string;
  sections: Array<{ id: string; title: string; rows: Array<{ label: string; value: string }> }>;
  approval: { state: ApprovalLabelState; label: string };
  missingSections: string[];
}
