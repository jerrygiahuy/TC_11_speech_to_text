"use client";

import { useState } from "react";
import { AppointmentRow } from "@/client/clinic/AppointmentRow";
import type { AppointmentItem } from "@/shared/clinic/types";

interface GroupProps {
  title: string;
  items: AppointmentItem[];
  /** Mẫu số N; bỏ trống thì không hiện phân số (khối ca ngày trước). */
  total?: number;
  onOpen: (appointmentId: string) => void;
  note?: string;
  emptyText?: string;
  showDate?: boolean;
}

/** Danh sách thật của một nhóm số liệu. Khung cao cố định; nhiều dòng thì cuộn trong khung, không kéo giãn trang. */
export function EncounterGroup({
  title,
  items,
  total,
  onOpen,
  note,
  emptyText = "Không có ca nào.",
  showDate = false,
}: GroupProps) {
  return (
    <section className="flex min-w-0 flex-col border border-gray-300 bg-white">
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-300 px-3 py-2">
        <h2 className="text-[18px] font-bold text-emr-navy">{title}</h2>
        <span
          className="text-2xl font-bold tabular-nums text-ink"
          aria-label={total === undefined ? `${items.length} ca` : `${items.length} trên ${total}`}
        >
          {total === undefined ? items.length : `${items.length}/${total}`}
        </span>
      </div>
      {note && <p className="border-b border-gray-200 px-3 py-1 text-[11px] text-muted">{note}</p>}
      {items.length === 0 ? (
        <p className="px-3 py-3 text-[13px] text-muted">{emptyText}</p>
      ) : (
        <div className="max-h-[22rem] min-h-0 flex-1 overflow-y-auto overscroll-contain" tabIndex={0} aria-label={`Danh sách ${title}`}>
          {items.map((item) => (
            <AppointmentRow key={item.appointment.id} item={item} onOpen={onOpen} showDate={showDate} />
          ))}
        </div>
      )}
    </section>
  );
}

interface OtherProps {
  cancelled: AppointmentItem[];
  other: AppointmentItem[];
  unknown: AppointmentItem[];
  onOpen: (appointmentId: string) => void;
}

type OtherKey = "cancelled" | "other" | "unknown";

/** Dòng "Ca hủy · Kết thúc khác · Chưa xác định": mỗi mục mở được danh sách riêng. */
export function OtherEncounters({ cancelled, other, unknown, onOpen }: OtherProps) {
  const [open, setOpen] = useState<OtherKey | null>(null);
  const parts: { key: OtherKey; label: string; items: AppointmentItem[] }[] = [
    { key: "cancelled", label: "Ca hủy", items: cancelled },
    { key: "other", label: "Kết thúc khác", items: other },
    { key: "unknown", label: "Chưa xác định", items: unknown },
  ];
  const current = parts.find((p) => p.key === open);
  return (
    <div className="border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-3 py-2 text-[13px]">
        {parts.map((p, i) => (
          <span key={p.key} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="text-muted">
                ·
              </span>
            )}
            <button
              type="button"
              aria-expanded={open === p.key}
              disabled={p.items.length === 0}
              onClick={() => setOpen(open === p.key ? null : p.key)}
              className="rounded-sm px-1.5 py-0.5 text-ink hover:bg-soft disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent aria-expanded:bg-soft aria-expanded:font-semibold"
            >
              {p.label}: <strong className="tabular-nums">{p.items.length}</strong>
            </button>
          </span>
        ))}
        <span className="ml-auto text-[11px] text-muted">
          Các ca này nằm trong tổng N nhưng không thuộc Hoàn thành hay Còn lại.
        </span>
      </div>
      {current && (
        <div className="border-t border-gray-200">
          {current.items.map((item) => (
            <AppointmentRow key={item.appointment.id} item={item} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
