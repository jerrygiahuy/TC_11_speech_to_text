import { StatusBadge } from "@/client/clinic/status";
import { formatClinicDateTimeLenient } from "@/shared/clinic/format";
import type { HistoricalEncounterViewModel } from "@/shared/clinic/types";

const APPROVAL_STYLE = {
  approved: "border-accent/60 bg-[#e0f5f2] text-[#0b6b61]",
  changed: "border-xem/50 bg-xem-nhat text-[#8a4b00]",
  draft: "border-gray-400 bg-white text-muted",
} as const;

/** Phiếu cũ chỉ đọc: không có ô nhập, micro, AI hay nút lưu/duyệt. Không dựng EformScreen. */
export function HistoricalEncounterView({ value }: { value: HistoricalEncounterViewModel }) {
  return (
    <article className="space-y-4">
      <header className="space-y-1 text-[13px]">
        <p className="font-semibold">
          {value.patient.full_name} · PID {value.patient.id}
        </p>
        <p className="text-muted">
          {formatClinicDateTimeLenient(value.encounter_at)}
          {value.appointment_id !== null && <> · Mã lượt {value.appointment_id}</>} · {value.doctor_name} · {value.facility_name}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <StatusBadge item={{ status: value.status, encounter_id: null }} />
          <span className={`inline-block rounded-sm border px-2 py-0.5 text-[11px] ${APPROVAL_STYLE[value.approval.state]}`}>
            {value.approval.label}
          </span>
        </p>
        <p className="text-[11px] text-muted">
          Họ tên và PID lấy từ hồ sơ hiện tại của bệnh nhân, không phải bản chụp lúc khám.
        </p>
      </header>

      {value.sections.map((section) => (
        <section key={section.id} aria-labelledby={`hs-${section.id}`} className="space-y-1">
          <h3 id={`hs-${section.id}`} className="text-[15px] font-semibold text-emr-navy">
            {section.title}
          </h3>
          <dl>
            {section.rows.map((row, index) => (
              <div
                key={`${row.label}-${index}`}
                className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 border-b border-gray-200 py-1.5 text-[13px] sm:grid-cols-[11rem_minmax(0,1fr)]"
              >
                <dt className="text-muted">{row.label}</dt>
                <dd className="min-w-0 whitespace-pre-wrap break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {value.missingSections.length > 0 && (
        <p className="rounded border border-gray-300 bg-soft p-2 text-[12px] text-muted">
          Phiếu này chưa có dữ liệu cho: {value.missingSections.join("; ")}.
        </p>
      )}
    </article>
  );
}
