// Đường dẫn nội bộ giữa dashboard và hồ sơ bệnh nhân. Hàm thuần.
import type { ClinicDate } from "./types";

export type DashboardView = "list" | "calendar";

const DEFAULT_RETURN = "/dashboard";

/**
 * Chỉ nhận đường nội bộ: bắt đầu bằng một dấu "/", không "//", không "\", không ký tự điều khiển/khoảng trắng,
 * và khi phân giải vẫn cùng origin. Còn lại trả về `fallback`.
 */
export function safeReturnTo(raw: string | null | undefined, fallback: string = DEFAULT_RETURN): string {
  if (typeof raw !== "string" || raw === "") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes(String.fromCharCode(92))) return fallback;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c <= 0x20 || c === 0x7f) return fallback;
  }
  // Dạng mã hóa của "//" ở đầu vẫn là đường nội bộ nhưng dễ bị hiểu nhầm: từ chối cho chắc.
  if (/^\/%(2f|5c)/i.test(raw)) return fallback;
  try {
    const base = "http://internal.invalid";
    if (new URL(raw, base).origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return raw;
}

export function dashboardHref(date: ClinicDate, view: DashboardView): string {
  return `/dashboard?date=${encodeURIComponent(date)}&view=${view}`;
}

/** Link sang hồ sơ bệnh nhân; PID là chuỗi giữ số 0 đầu, không dùng tên làm định danh. */
export function patientHref(patientId: string, appointmentId: string, returnTo: string): string {
  return (
    `/benh-nhan/${encodeURIComponent(patientId)}` +
    `?appointment_id=${encodeURIComponent(appointmentId)}` +
    `&return_to=${encodeURIComponent(safeReturnTo(returnTo))}`
  );
}
