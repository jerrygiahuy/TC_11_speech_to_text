// Chia nhóm và dựng bố cục calendar một ngày. Hàm thuần, không đọc đồng hồ.
import { minutesOfClinicDay } from "./format";
import { clinicPeriod, sortAppointments } from "./schedule";
import type { AppointmentItem } from "./types";

export interface GroupedAppointments {
  completed: AppointmentItem[];
  remaining: AppointmentItem[];
  /** Tập con của remaining (đang khám + chờ kết quả), không cộng với remaining. */
  unfinished: AppointmentItem[];
  cancelled: AppointmentItem[];
  other: AppointmentItem[];
  unknown: AppointmentItem[];
}

/** Cùng quy tắc nhóm với summarizeAppointments, nhưng trả danh sách thật. Giữ thứ tự đầu vào. */
export function groupAppointments(items: AppointmentItem[]): GroupedAppointments {
  const g: GroupedAppointments = { completed: [], remaining: [], unfinished: [], cancelled: [], other: [], unknown: [] };
  for (const it of items) {
    switch (it.status) {
      case "completed":
        g.completed.push(it);
        break;
      case "scheduled":
        g.remaining.push(it);
        break;
      case "in_progress":
      case "waiting_results":
        g.remaining.push(it);
        g.unfinished.push(it);
        break;
      case "cancelled":
        g.cancelled.push(it);
        break;
      case "admitted":
      case "emergency_transfer":
      case "facility_transfer":
        g.other.push(it);
        break;
      default:
        g.unknown.push(it);
    }
  }
  return g;
}

/** Sáng [00:00,12:00) và Chiều [12:00,24:00) theo giờ cơ sở; mỗi buổi sắp giờ tăng dần, trùng giờ thì mã tăng dần. */
export function splitByPeriod(items: AppointmentItem[]): { morning: AppointmentItem[]; afternoon: AppointmentItem[] } {
  const sorted = sortAppointments(items);
  return {
    morning: sorted.filter((i) => clinicPeriod(i.appointment.starts_at) === "morning"),
    afternoon: sorted.filter((i) => clinicPeriod(i.appointment.starts_at) === "afternoon"),
  };
}

export const DEFAULT_BLOCK_MINUTES = 30;
/** Độ dài vẽ tối thiểu để khối đủ chữ; ca ngắn hơn vẫn chiếm chỗ này khi xét trùng giờ, không đè khối kế tiếp. */
export const MIN_BLOCK_MINUTES = 20;
const MIN_START_HOUR = 7;
const MIN_END_HOUR = 18;

export interface CalendarBlock {
  item: AppointmentItem;
  startMin: number;
  endMin: number;
  /** true khi ends_at null: 30 phút chỉ là độ dài vẽ. */
  estimated: boolean;
  col: number;
  cols: number;
}

export interface DayLayout {
  startHour: number;
  endHour: number;
  blocks: CalendarBlock[];
  hasEstimated: boolean;
}

export function layoutDay(items: AppointmentItem[]): DayLayout {
  const raw = sortAppointments(items).map((item) => {
    const startMin = minutesOfClinicDay(item.appointment.starts_at);
    const endsAt = item.appointment.ends_at;
    let endMin = startMin + DEFAULT_BLOCK_MINUTES;
    let estimated = true;
    if (endsAt !== null) {
      const real = startMin + Math.round((Date.parse(endsAt) - Date.parse(item.appointment.starts_at)) / 60000);
      if (real > startMin) {
        endMin = real;
        estimated = false;
      }
    }
    return { item, startMin, endMin: Math.min(Math.max(endMin, startMin + MIN_BLOCK_MINUTES), 24 * 60), estimated };
  });

  // Cụm trùng giờ: các lịch nối tiếp nhau về thời gian; trong cụm gán cột đầu tiên còn trống.
  const blocks: CalendarBlock[] = [];
  let cluster: CalendarBlock[] = [];
  let clusterEnd = -1;
  let colEnds: number[] = [];
  const flush = () => {
    for (const b of cluster) b.cols = colEnds.length;
    blocks.push(...cluster);
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };
  for (const r of raw) {
    if (cluster.length > 0 && r.startMin >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= r.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(r.endMin);
    } else {
      colEnds[col] = r.endMin;
    }
    clusterEnd = Math.max(clusterEnd, r.endMin);
    cluster.push({ ...r, col, cols: 1 });
  }
  flush();

  const minStart = blocks.length ? Math.min(...blocks.map((b) => b.startMin)) : Infinity;
  const maxEnd = blocks.length ? Math.max(...blocks.map((b) => b.endMin)) : -Infinity;
  return {
    startHour: Math.min(MIN_START_HOUR, Math.floor(minStart / 60)),
    endHour: Math.max(MIN_END_HOUR, Math.ceil(maxEnd / 60)),
    blocks,
    hasEstimated: blocks.some((b) => b.estimated),
  };
}
