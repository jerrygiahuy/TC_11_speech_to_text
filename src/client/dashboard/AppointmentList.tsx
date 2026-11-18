"use client";

import { AppointmentRow } from "@/client/clinic/AppointmentRow";
import { splitByPeriod } from "@/shared/clinic/layout";
import type { AppointmentItem } from "@/shared/clinic/types";

interface Props {
  items: AppointmentItem[];
  onOpen: (appointmentId: string) => void;
}

function Period({ title, items, onOpen }: { title: string; items: AppointmentItem[]; onOpen: (id: string) => void }) {
  return (
    <section aria-label={title} className="border border-gray-300 bg-white">
      <h3 className="flex items-baseline justify-between border-b border-gray-300 bg-emr-navy px-3 py-1 text-[13px] font-bold text-white">
        {title}
        <span className="tabular-nums">{items.length} lịch</span>
      </h3>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-[13px] text-muted">Không có lịch.</p>
      ) : (
        items.map((item) => <AppointmentRow key={item.appointment.id} item={item} onOpen={onOpen} />)
      )}
    </section>
  );
}

/** Mọi lịch của ngày, chia Sáng [00:00,12:00) và Chiều [12:00,24:00) theo giờ cơ sở, giờ tăng dần. */
export function AppointmentList({ items, onOpen }: Props) {
  const { morning, afternoon } = splitByPeriod(items);
  return (
    <div className="space-y-3">
      <Period title="Buổi sáng" items={morning} onOpen={onOpen} />
      <Period title="Buổi chiều" items={afternoon} onOpen={onOpen} />
    </div>
  );
}
