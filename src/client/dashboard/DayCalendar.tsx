"use client";

import { useEffect, useState } from "react";
import { STATUS_META, statusLabel } from "@/client/clinic/status";
import { formatClinicTime, minutesOfClinicDay } from "@/shared/clinic/format";
import { DEFAULT_BLOCK_MINUTES, layoutDay } from "@/shared/clinic/layout";
import { toClinicDate } from "@/shared/clinic/schedule";
import type { AppointmentItem, ClinicDate } from "@/shared/clinic/types";

const HOUR_PX = 64;

interface Props {
  items: AppointmentItem[];
  date: ClinicDate;
  onOpen: (appointmentId: string) => void;
}

/** Lịch một ngày theo trục giờ. Mọi lịch đều có khối; lịch trùng giờ xếp cạnh nhau. */
export function DayCalendar({ items, date, onOpen }: Props) {
  const layout = layoutDay(items);
  // Đồng hồ chỉ đọc sau khi mount để tránh lệch hydrate; chỉ dùng khi xem đúng ngày hôm nay.
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const firstMin = layout.startHour * 60;
  const hours = Array.from({ length: layout.endHour - layout.startHour }, (_, i) => layout.startHour + i);
  const px = (min: number) => ((min - firstMin) / 60) * HOUR_PX;
  const nowMin = now !== null && toClinicDate(now) === date ? minutesOfClinicDay(now) : -1;
  const nowVisible = now !== null && nowMin >= firstMin && nowMin <= layout.endHour * 60;

  return (
    <div className="border border-gray-300 bg-white">
      <div
        className="relative mb-2 ml-12 mr-2 mt-3"
        style={{ height: (layout.endHour - layout.startHour) * HOUR_PX }}
      >
        {hours.map((h) => (
          <div
            key={h}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-gray-200"
            style={{ top: (h - layout.startHour) * HOUR_PX }}
          >
            <span className="absolute -left-11 -top-2 w-9 text-right text-[11px] tabular-nums text-muted">
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
        {layout.blocks.map((b) => {
          const { appointment, patient } = b.item;
          const label = `${formatClinicTime(appointment.starts_at)} ${patient.full_name}, mã lượt ${appointment.id}, ${statusLabel(b.item)}`;
          const meta = STATUS_META[b.item.status];
          return (
            <button
              key={appointment.id}
              type="button"
              aria-label={label}
              title={`${label}. ${appointment.content}`}
              data-estimated={b.estimated ? "true" : undefined}
              onClick={() => onOpen(appointment.id)}
              className={`absolute overflow-hidden rounded-sm border border-l-4 px-1.5 py-0.5 text-left text-[12px] leading-tight hover:brightness-95 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-emr-blue data-[estimated=true]:border-b-dashed ${meta.badge} ${meta.bar}`}
              style={{
                top: px(b.startMin),
                height: Math.max(px(b.endMin) - px(b.startMin) - 2, 18),
                left: `calc(${(b.col / b.cols) * 100}% + 1px)`,
                width: `calc(${100 / b.cols}% - 2px)`,
              }}
            >
              <span className="block truncate font-semibold">
                <span className="tabular-nums">{formatClinicTime(appointment.starts_at)}</span> {patient.full_name}
              </span>
              <span className="block truncate text-[11px]">
                {appointment.id} · {statusLabel(b.item)}
              </span>
            </button>
          );
        })}
        {nowVisible && now !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-[#c9302c]"
            style={{ top: px(nowMin) }}
          >
            <span className="absolute -top-2.5 right-0 rounded-sm bg-[#c9302c] px-1 text-[11px] font-semibold text-white">
              Bây giờ {formatClinicTime(now)}
            </span>
          </div>
        )}
        {items.length === 0 && (
          <p className="absolute inset-x-0 top-4 text-center text-[13px] text-muted">Không có lịch trong ngày.</p>
        )}
      </div>
      {layout.hasEstimated && (
        <p className="border-t border-gray-200 px-3 py-1.5 text-[11px] text-muted">
          Lịch không có giờ kết thúc được vẽ dài {DEFAULT_BLOCK_MINUTES} phút (viền dưới nét đứt). Đây chỉ là độ dài hiển
          thị, không phải thời lượng khám.
        </p>
      )}
      {layout.blocks.some((b) => b.cols > 1) && (
        <p className="border-t border-gray-200 px-3 py-1.5 text-[11px] text-muted">
          Các lịch trùng giờ được xếp cạnh nhau; mỗi khối đều mở được.
        </p>
      )}
    </div>
  );
}
