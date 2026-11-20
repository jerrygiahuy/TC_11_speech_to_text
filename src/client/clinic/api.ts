// Gọi API đọc lịch khám/bệnh nhân từ trình duyệt. Luôn no-store, hỗ trợ AbortSignal; kiểu lấy từ src/shared.
import type { ApiLoi } from "@/shared/api";
import type {
  AppointmentItem,
  ClinicDate,
  DashboardData,
  HistoricalEncounterViewModel,
  PatientPageData,
} from "@/shared/clinic/types";

async function getJson<T>(url: string, signal: AbortSignal | undefined, loiMacDinh: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    const loi = (await response.json().catch(() => ({}))) as Partial<ApiLoi>;
    throw new Error(loi.error ?? loiMacDinh);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Máy chủ trả dữ liệu không đọc được. Vui lòng thử lại.");
  }
}

export function getDashboard(date: ClinicDate, signal?: AbortSignal): Promise<DashboardData> {
  return getJson(
    `/api/clinic/dashboard?date=${encodeURIComponent(date)}`,
    signal,
    "Không tải được lịch khám.",
  );
}

export function getAppointment(id: string, signal?: AbortSignal): Promise<AppointmentItem> {
  return getJson(
    `/api/clinic/appointments/${encodeURIComponent(id)}`,
    signal,
    "Không tải được lịch hẹn.",
  );
}

export function getPatient(
  id: string,
  appointmentId?: string,
  signal?: AbortSignal,
): Promise<PatientPageData> {
  const query = appointmentId === undefined ? "" : `?appointment_id=${encodeURIComponent(appointmentId)}`;
  return getJson(
    `/api/clinic/patients/${encodeURIComponent(id)}${query}`,
    signal,
    "Không tải được hồ sơ bệnh nhân.",
  );
}

export function getHistoricalEncounter(
  patientId: string,
  encounterId: string,
  signal?: AbortSignal,
): Promise<HistoricalEncounterViewModel> {
  return getJson(
    `/api/clinic/patients/${encodeURIComponent(patientId)}/encounters/${encodeURIComponent(encounterId)}`,
    signal,
    "Không tải được phiếu khám.",
  );
}

/** Mở hoặc dùng lại phiếu của lịch. Server quyết định quyền và danh tính; client chỉ gửi mã lịch. */
export async function openAppointment(appointmentId: string): Promise<{ encounter_id: string; appointment_id: string }> {
  const response = await fetch(`/api/clinic/appointments/${encodeURIComponent(appointmentId)}/open`, {
    method: "POST",
    cache: "no-store",
  });
  if (!response.ok) {
    const loi = (await response.json().catch(() => ({}))) as Partial<ApiLoi>;
    throw new Error(loi.error ?? "Không mở được phiếu khám.");
  }
  try {
    return (await response.json()) as { encounter_id: string; appointment_id: string };
  } catch {
    throw new Error("Máy chủ trả dữ liệu không đọc được. Vui lòng thử lại.");
  }
}

/** "Tạo mới phiếu khám": tạo phiếu ngoại trú mới của bệnh nhân. Server tự lấy bác sĩ/cơ sở; client chỉ gửi mã bệnh nhân. */
export async function createEncounter(patientId: string): Promise<{ encounter_id: string; appointment_id: string }> {
  const response = await fetch(`/api/clinic/patients/${encodeURIComponent(patientId)}/encounters`, {
    method: "POST",
    cache: "no-store",
  });
  if (!response.ok) {
    const loi = (await response.json().catch(() => ({}))) as Partial<ApiLoi>;
    throw new Error(loi.error ?? "Không tạo được phiếu khám.");
  }
  try {
    return (await response.json()) as { encounter_id: string; appointment_id: string };
  } catch {
    throw new Error("Máy chủ trả dữ liệu không đọc được. Vui lòng thử lại.");
  }
}
