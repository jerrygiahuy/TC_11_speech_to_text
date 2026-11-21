"use client";

import Link from "next/link";
import { patientHref } from "@/shared/clinic/links";
import type { AppointmentItem } from "@/shared/clinic/types";
import { openReasonText } from "./open-appointment";
import { OpenAppointmentButton } from "./OpenAppointmentButton";

const LINK_BTN =
  "inline-block rounded-sm border border-emr-blue bg-white px-3 py-1.5 text-[13px] font-medium text-emr-blue hover:bg-soft";

/** Thao tác từ popup lịch hẹn. Server đã quyết định `can_open`; lý do không mở được hiện bằng chữ. */
export function AppointmentActions({ item, returnTo }: { item: AppointmentItem; returnTo: string }) {
  const { appointment, patient } = item;
  const href = patientHref(patient.id, appointment.id, returnTo);
  const label = item.encounter_id !== null ? "Tiếp tục phiếu khám" : "Mở phiếu khám";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href} className={LINK_BTN}>
          {item.has_prior_encounter ? "Xem thông tin bệnh nhân" : "Thông tin bệnh nhân"}
        </Link>
        {!item.has_prior_encounter && <span className="text-[13px] text-muted">Chưa có lịch sử khám</span>}
      </div>
      {item.can_open ? (
        <OpenAppointmentButton appointmentId={appointment.id} label={label} />
      ) : (
        <p className="text-[11px] text-muted">{openReasonText(item.open_reason)}</p>
      )}
    </div>
  );
}
