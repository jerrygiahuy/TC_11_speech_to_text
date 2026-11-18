import type { AppointmentItem, DisplayStatus } from "@/shared/clinic/types";

// Một nguồn duy nhất cho nhãn và màu trạng thái; màu luôn đi cùng nhãn chữ (không dựa riêng vào màu).
export interface StatusMeta {
  label: string;
  /** Chữ + nền nhạt + viền, đủ tương phản trên nền nhạt. */
  badge: string;
  /** Vạch màu bên trái khối calendar. */
  bar: string;
}

export const STATUS_META: Record<DisplayStatus, StatusMeta> = {
  scheduled: { label: "Chưa khám", badge: "border-gray-400 bg-white text-muted", bar: "border-l-gray-400" },
  in_progress: { label: "Đang khám", badge: "border-emr-blue/50 bg-[#e3f0fa] text-emr-navy", bar: "border-l-emr-blue" },
  waiting_results: { label: "Chờ kết quả CLS", badge: "border-xem/50 bg-xem-nhat text-[#8a4b00]", bar: "border-l-xem" },
  completed: { label: "Hoàn thành", badge: "border-accent/60 bg-[#e0f5f2] text-[#0b6b61]", bar: "border-l-accent" },
  cancelled: { label: "Hủy khám", badge: "border-[#c9302c]/50 bg-[#fdeceb] text-[#a02622]", bar: "border-l-[#c9302c]" },
  admitted: { label: "Nhập viện", badge: "border-emr-navy/50 bg-[#e8edf5] text-ink", bar: "border-l-emr-navy" },
  emergency_transfer: { label: "Chuyển cấp cứu", badge: "border-[#c9302c]/50 bg-[#fff4f3] text-[#a02622]", bar: "border-l-[#a02622]" },
  facility_transfer: { label: "Chuyển cơ sở", badge: "border-primary/50 bg-[#e0eff7] text-[#075a85]", bar: "border-l-primary" },
  unknown: { label: "Chưa xác định", badge: "border-dashed border-gray-500 bg-white text-muted", bar: "border-l-gray-500" },
};

/** Thứ tự và chú giải hiển thị trong StatusLegend. */
export const LEGEND_ORDER: DisplayStatus[] = [
  "scheduled",
  "in_progress",
  "waiting_results",
  "completed",
  "cancelled",
  "admitted",
  "emergency_transfer",
  "facility_transfer",
  "unknown",
];

/** Encounter `khong_kham` cũng map về cancelled; có Encounter thì hiện đúng nhãn "Không khám", không bịa lý do hủy. */
export function statusLabel(item: Pick<AppointmentItem, "status" | "encounter_id">): string {
  if (item.status === "cancelled" && item.encounter_id !== null) return "Không khám";
  return STATUS_META[item.status].label;
}

export function StatusBadge({ item }: { item: Pick<AppointmentItem, "status" | "encounter_id"> }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_META[item.status].badge}`}
    >
      {statusLabel(item)}
    </span>
  );
}
