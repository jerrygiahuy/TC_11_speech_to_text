// Gọi API đọc lịch khám/bệnh nhân từ trình duyệt. Luôn no-store, hỗ trợ AbortSignal; kiểu lấy từ src/shared.
import type { ApiLoi } from "@/shared/api";
import type {
  AppointmentItem,
  ClinicDate,
  DashboardData,
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
