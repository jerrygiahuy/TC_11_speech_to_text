// Chọn hành động mở phiếu từ danh sách lịch đủ điều kiện. Danh sách do server lọc; client không tự quyết quyền.
import type { AppointmentItem } from "@/shared/clinic/types";

export type OpenAction =
  | { action: "disabled"; appointmentId: null }
  | { action: "open"; appointmentId: string }
  | { action: "pick"; appointmentId: null };

/** 0 lịch: tắt. 1 lịch: mở thẳng. Nhiều lịch: hỏi. Lịch đã chọn hợp lệ thì mở đúng lịch đó, không đổi sang lịch khác. */
export function chooseAppointment(items: AppointmentItem[], selectedAppointmentId?: string | null): OpenAction {
  if (selectedAppointmentId) {
    const selected = items.find((i) => i.appointment.id === selectedAppointmentId);
    return selected ? { action: "open", appointmentId: selected.appointment.id } : { action: "disabled", appointmentId: null };
  }
  if (items.length === 0) return { action: "disabled", appointmentId: null };
  if (items.length === 1) return { action: "open", appointmentId: items[0].appointment.id };
  return { action: "pick", appointmentId: null };
}

export function openHref(encounterId: string): string {
  return `/?ho_so=${encodeURIComponent(encounterId)}`;
}

const REASON_TEXT = {
  eligible: "",
  cancelled: "Lịch đã hủy nên không mở được phiếu khám.",
  future: "Lịch chưa tới ngày khám nên chưa mở được phiếu.",
  terminal: "Lượt khám đã kết thúc; xem lại trong lịch sử của bệnh nhân.",
  unknown: "Trạng thái lượt khám chưa xác định nên chưa mở được phiếu.",
  no_context: "Lịch này chưa có ngữ cảnh khám mẫu để mở phiếu.",
} as const;

export function openReasonText(reason: AppointmentItem["open_reason"]): string {
  return REASON_TEXT[reason];
}
