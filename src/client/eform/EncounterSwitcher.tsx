"use client";

import type { AvailableEncounter } from "@/client/clinical-api";
import { BTN_OUTLINE } from "@/client/eform/fields";
import type { EncounterSummary } from "@/shared/clinical/api";

const TRANG_THAI: Record<string, string> = { dang_kham: "Đang khám", cho_kq_cls: "Chờ KQ CLS", hoan_thanh_kham: "Đã hoàn tất" };

interface Props {
  open: EncounterSummary[];
  available: AvailableEncounter[];
  /** Mã khám của lượt đang mở */
  current: { appointmentId: string; patientName: string; status: string } | null;
  busy: boolean;
  onSwitch: (appointmentId: string) => void;
}

/** Thanh chuyển lượt khám theo mã khám. Chuyển lượt luôn đi qua bộ điều phối ghi âm: dừng micro, chốt phiên, rồi mới mở lượt kia. */
export function EncounterSwitcher({ open, available, current, busy, onSwitch }: Props) {
  const rows = [...open];
  if (current && !rows.some((row) => row.appointment_id === current.appointmentId)) {
    rows.unshift({ id: current.appointmentId, appointment_id: current.appointmentId, patient_id: "", patient_name: current.patientName, facility_id: "", status: current.status as EncounterSummary["status"], revision: 0, updated_at: "" });
  }
  const openCodes = new Set(rows.map((row) => row.appointment_id));
  const others = available.filter((item) => !openCodes.has(item.appointment_id));
  return (
    <nav aria-label="Chuyển lượt khám" className="border-b border-ef-vien bg-white px-4 py-2 print:hidden sm:px-6">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-2 text-[13px]">
        <span className="font-semibold text-ef-dam">Lượt khám</span>
        {rows.map((row) => {
          const active = row.appointment_id === current?.appointmentId;
          return (
            <button
              key={row.appointment_id ?? row.id}
              type="button"
              aria-current={active ? "true" : undefined}
              disabled={busy || active || !row.appointment_id}
              onClick={() => row.appointment_id && onSwitch(row.appointment_id)}
              className={`rounded-full border px-3 py-1 text-left focus-visible:outline-2 focus-visible:outline-ef-xanh ${active ? "border-ef-xanh bg-ef-xanh font-semibold text-white" : "border-ef-vien bg-white text-ef-chu hover:border-ef-phu/50 disabled:opacity-60"}`}
            >
              {row.patient_name} · {row.appointment_id} · {TRANG_THAI[row.status] ?? row.status}
            </button>
          );
        })}
        {others.length > 0 && (
          <label className="flex items-center gap-1.5 text-ef-phu">
            Mở mã khám khác
            <select
              aria-label="Mở mã khám khác"
              className={`${BTN_OUTLINE} py-1`}
              disabled={busy}
              value=""
              onChange={(event) => { if (event.target.value) onSwitch(event.target.value); }}
            >
              <option value="">Chọn…</option>
              {others.map((item) => <option key={item.appointment_id} value={item.appointment_id}>{item.patient_name} · {item.appointment_id}</option>)}
            </select>
          </label>
        )}
        {busy && <span role="status" className="text-ef-phu">Đang chuyển lượt…</span>}
      </div>
    </nav>
  );
}
