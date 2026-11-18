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

export interface AppointmentItem {
  appointment: Appointment;
  patient: PatientProfile;
  doctor_name: string;
  encounter_id: string | null;
  status: DisplayStatus;
  has_prior_encounter: boolean;
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
  /** Lịch của bác sĩ đang xem cho bệnh nhân này mà còn có thể khám (tạm, chờ policy mở phiếu của ưu tiên 1). */
  eligibleAppointments: AppointmentItem[];
  history: HistorySummary[];
  selectedAppointmentId: string | null;
}
