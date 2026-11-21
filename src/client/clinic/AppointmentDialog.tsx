"use client";

import { useEffect, useState } from "react";
import { formatClinicDate, formatClinicDateTime, formatClinicTime } from "@/shared/clinic/format";
import { ageAt, toClinicDate } from "@/shared/clinic/schedule";
import type { AppointmentItem } from "@/shared/clinic/types";
import { getAppointment } from "./api";
import { AppointmentActions } from "./AppointmentActions";
import { ClinicDialog } from "./ClinicDialog";
import { StatusBadge } from "./status";

interface Props {
  appointmentId: string | null;
  returnTo: string;
  onClose: () => void;
}

type Result = { key: string; item: AppointmentItem } | { key: string; error: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 border-b border-gray-200 py-1.5 text-[13px] sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/** Popup lịch hẹn: tải chi tiết no-store, hủy request khi đổi/đóng, có loading, lỗi và thử lại. */
export function AppointmentDialog({ appointmentId, returnTo, onClose }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = appointmentId === null ? null : `${appointmentId}#${attempt}`;

  useEffect(() => {
    if (appointmentId === null || key === null) return;
    const controller = new AbortController();
    getAppointment(appointmentId, controller.signal)
      .then((item) => setResult({ key, item }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key, error: error instanceof Error ? error.message : "Không tải được lịch hẹn." });
      });
    return () => controller.abort();
  }, [appointmentId, key]);

  // Kết quả của lịch/lần thử khác (đến muộn hoặc còn sót) không được hiển thị cho lịch hiện tại.
  const current = result !== null && result.key === key ? result : null;
  const item = current !== null && "item" in current ? current.item : null;
  const error = current !== null && "error" in current ? current.error : null;

  function close() {
    // Tăng (không reset) để mở lại cùng lịch có khóa mới, không hiện kết quả/lỗi cũ.
    setAttempt((n) => n + 1);
    onClose();
  }

  return (
    <ClinicDialog open={appointmentId !== null} title={item ? `Lịch hẹn ${item.appointment.id}` : "Lịch hẹn"} onClose={close}>
      {appointmentId !== null && current === null && (
        <p role="status" className="py-6 text-center text-[13px] text-muted">
          Đang tải lịch hẹn…
        </p>
      )}
      {error !== null && (
        <div role="alert" className="space-y-2 border border-[#c9302c]/50 bg-[#fdeceb] p-3 text-[13px] text-[#a02622]">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-sm border border-gray-300 bg-white px-3 py-1 text-ink hover:bg-soft"
          >
            Thử lại
          </button>
        </div>
      )}
      {item !== null && (
        <div className="space-y-4">
          <dl>
            <Field label="Mã lịch / mã lượt">{item.appointment.id}</Field>
            {item.encounter_id !== null && <Field label="Mã hồ sơ (UUID)">{item.encounter_id}</Field>}
            <Field label="PID">{item.patient.id}</Field>
            <Field label="Họ tên">
              <span className="font-semibold">{item.patient.full_name}</span>
            </Field>
            <Field label="Tuổi">{ageAt(item.patient.date_of_birth, toClinicDate(item.appointment.starts_at))}</Field>
            <Field label="Ngày sinh">
              {item.patient.date_of_birth ? formatClinicDate(item.patient.date_of_birth) : "Chưa có thông tin"}
            </Field>
            <Field label="Giờ hẹn">
              {formatClinicDateTime(item.appointment.starts_at)}
              {item.appointment.ends_at !== null && ` – ${formatClinicTime(item.appointment.ends_at)}`}
            </Field>
            <Field label="Bác sĩ">{item.doctor_name}</Field>
            <Field label="Trạng thái">
              <StatusBadge item={item} />
            </Field>
            <Field label="Nội dung">
              <span className="whitespace-pre-wrap">{item.appointment.content}</span>
            </Field>
          </dl>
          <AppointmentActions item={item} returnTo={returnTo} />
        </div>
      )}
    </ClinicDialog>
  );
}
