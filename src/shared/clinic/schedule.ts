// Phép tính lịch khám: hàm thuần, không I/O, không mutate input, không đọc đồng hồ.
import type {
  Appointment,
  AppointmentItem,
  ClinicDate,
  DashboardTotals,
  DisplayStatus,
} from "./types";
import { NO_INFO } from "./format";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Ho_Chi_Minh = UTC+7 cố định, không DST

const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

function vnDate(iso: string): Date {
  if (!HAS_OFFSET.test(iso)) throw new RangeError(`Timestamp thiếu offset: ${iso}`);
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Timestamp không hợp lệ: ${iso}`);
  // Dịch sang giờ VN rồi đọc bằng getUTC*, không phụ thuộc ICU/Intl.
  return new Date(ms + VN_OFFSET_MS);
}

export function toClinicDate(iso: string): ClinicDate {
  return vnDate(iso).toISOString().slice(0, 10);
}

export function clinicPeriod(iso: string): "morning" | "afternoon" {
  return vnDate(iso).getUTCHours() < 12 ? "morning" : "afternoon";
}

export function displayStatus(
  scheduling: Appointment["scheduling_status"],
  encounterStatus: string | null,
): DisplayStatus {
  if (encounterStatus === null) {
    return scheduling === "cancelled" ? "cancelled" : "scheduled";
  }
  let status: DisplayStatus;
  switch (encounterStatus) {
    case "dang_kham":
      status = "in_progress";
      break;
    case "cho_kq_cls":
      status = "waiting_results";
      break;
    case "hoan_thanh_kham":
      status = "completed";
      break;
    case "khong_kham":
      status = "cancelled";
      break;
    case "nhap_noi_tru":
      status = "admitted";
      break;
    case "chuyen_cap_cuu":
      status = "emergency_transfer";
      break;
    case "chuyen_cskcb_bhyt":
      status = "facility_transfer";
      break;
    default:
      return "unknown";
  }
  // Lịch hủy nhưng Encounter đã bắt đầu/hoàn thành: xung đột, không che ca.
  if (
    scheduling === "cancelled" &&
    (status === "in_progress" || status === "waiting_results" || status === "completed")
  ) {
    return "unknown";
  }
  return status;
}

export function summarizeAppointments(items: AppointmentItem[]): DashboardTotals {
  const t: DashboardTotals = {
    total: items.length,
    completed: 0,
    remaining: 0,
    unfinished: 0,
    cancelled: 0,
    other: 0,
    unknown: 0,
  };
  for (const { status } of items) {
    switch (status) {
      case "completed":
        t.completed++;
        break;
      case "scheduled":
        t.remaining++;
        break;
      case "in_progress":
      case "waiting_results":
        t.remaining++;
        t.unfinished++;
        break;
      case "cancelled":
        t.cancelled++;
        break;
      case "admitted":
      case "emergency_transfer":
      case "facility_transfer":
        t.other++;
        break;
      default:
        t.unknown++;
    }
  }
  return t;
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortAppointments(items: AppointmentItem[]): AppointmentItem[] {
  return [...items].sort((a, b) => {
    const d = Date.parse(a.appointment.starts_at) - Date.parse(b.appointment.starts_at);
    return d !== 0 ? d : cmpStr(a.appointment.id, b.appointment.id);
  });
}


function parseDate(s: ClinicDate): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Tuổi tại `date`. Thiếu/sai/ngày sinh tương lai -> "Chưa có thông tin" (không tuổi âm). */
export function ageAt(dob: ClinicDate | null, date: ClinicDate): string {
  if (dob === null) return NO_INFO;
  const b = parseDate(dob);
  const d = parseDate(date);
  if (!b || !d) return NO_INFO;
  if (dob > date) return NO_INFO;
  let months = (d[0] - b[0]) * 12 + (d[1] - b[1]);
  if (d[2] < b[2]) months--;
  if (months < 12) return `${months} tháng`;
  return `${Math.floor(months / 12)} tuổi`;
}

export function selectDayAppointments(
  items: AppointmentItem[],
  date: ClinicDate,
): { appointments: AppointmentItem[]; carriedOpenItems: AppointmentItem[] } {
  const appointments: AppointmentItem[] = [];
  const carried: AppointmentItem[] = [];
  for (const it of items) {
    const day = toClinicDate(it.appointment.starts_at);
    if (day === date) appointments.push(it);
    else if (
      day < date &&
      (it.status === "in_progress" ||
        it.status === "waiting_results" ||
        // Xung đột lịch hủy + Encounter đang khám: vẫn là việc dở, không được rơi mất.
        (it.status === "unknown" && it.encounter_id !== null))
    ) {
      carried.push(it);
    }
  }
  return {
    appointments: sortAppointments(appointments),
    carriedOpenItems: sortAppointments(carried),
  };
}
