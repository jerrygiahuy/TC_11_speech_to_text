"use client";

import Link from "next/link";
import { patientHref } from "@/shared/clinic/links";
import type { AppointmentItem } from "@/shared/clinic/types";

const LINK_BTN =
  "inline-block rounded-sm border border-emr-blue bg-white px-3 py-1.5 text-[13px] font-medium text-emr-blue hover:bg-soft";
const DISABLED_BTN =
  "cursor-not-allowed rounded-sm border border-gray-300 bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-muted";

/** Thao tác từ popup lịch hẹn. Nút tạo/mở phiếu chưa khả dụng: chờ nền ca khám nhiều phiên (ưu tiên 1). */
export function AppointmentActions({ item, returnTo }: { item: AppointmentItem; returnTo: string }) {
  const { appointment, patient } = item;
  const href = patientHref(patient.id, appointment.id, returnTo);
  const openable = item.status === "scheduled" || item.status === "in_progress" || item.status === "waiting_results";
  const label = item.encounter_id !== null ? "Mở phiếu khám" : "Tạo phiếu khám";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href} className={LINK_BTN}>
          {item.has_prior_encounter ? "Xem thông tin bệnh nhân" : "Thông tin bệnh nhân"}
        </Link>
        {!item.has_prior_encounter && <span className="text-[13px] text-muted">Chưa có lịch sử khám</span>}
      </div>
      {openable ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled aria-describedby="chu-thich-mo-phieu" className={DISABLED_BTN}>
            {label}
          </button>
          <span id="chu-thich-mo-phieu" className="text-[11px] text-muted">
            Chờ nền ca khám nhiều phiên (ưu tiên 1)
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-muted">Lịch này không mở được phiếu khám mới.</p>
      )}
    </div>
  );
}
