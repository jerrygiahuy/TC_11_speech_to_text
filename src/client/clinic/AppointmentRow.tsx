"use client";

import { formatClinicDate, formatClinicTime } from "@/shared/clinic/format";
import { toClinicDate } from "@/shared/clinic/schedule";
import type { AppointmentItem } from "@/shared/clinic/types";
import { StatusBadge } from "./status";

interface Props {
  item: AppointmentItem;
  onOpen: (appointmentId: string) => void;
  /** Hiện cả ngày hẹn (dùng cho ca chưa hoàn tất từ ngày trước). */
  showDate?: boolean;
}

/** Một dòng ca khám: giờ, tên, mã lượt/PID, nội dung ngắn, trạng thái. Là nút nên Enter/Space/click đều mở. */
export function AppointmentRow({ item, onOpen, showDate = false }: Props) {
  const { appointment, patient } = item;
  const time = formatClinicTime(appointment.starts_at);
  const when = showDate ? `${formatClinicDate(toClinicDate(appointment.starts_at)).slice(0, 5)} ${time}` : time;
  return (
    <button
      type="button"
      onClick={() => onOpen(appointment.id)}
      className="grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 border-b border-gray-200 px-3 py-2 text-left last:border-b-0 hover:bg-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emr-blue"
    >
      <span className="text-[13px] font-semibold tabular-nums text-emr-navy">{when}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-ink">{patient.full_name}</span>
        <span className="block truncate text-[11px] text-muted">
          Mã lượt {appointment.id} · PID {patient.id}
        </span>
        <span className="block truncate text-[13px] text-ink">{appointment.content}</span>
      </span>
      <StatusBadge item={item} />
    </button>
  );
}
