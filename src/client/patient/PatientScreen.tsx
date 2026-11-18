import Link from "next/link";
import { formatGender, formatOptionalClinicDate } from "@/shared/clinic/format";
import { ageAt } from "@/shared/clinic/schedule";
import type { ClinicDate, PatientPageData } from "@/shared/clinic/types";
import { EncounterHistory } from "./EncounterHistory";
import { InsuranceSummary } from "./InsuranceSummary";

interface Props {
  data: PatientPageData;
  /** Đường dẫn quay về dashboard (đã qua kiểm tra an toàn), giữ ngày/view. */
  returnTo: string;
  /** Ngày đối chiếu tuổi và hạn bảo hiểm: ngày hẹn đang chọn, không thì hôm nay. */
  referenceDate: ClinicDate;
}

const CREATE_NOTE_ID = "create-note";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function PatientScreen({ data, returnTo, referenceDate }: Props) {
  const { patient, eligibleAppointments, history } = data;
  const canCreate = eligibleAppointments.length > 0;
  const createNote = canCreate
    ? "Chờ nền ca khám nhiều phiên (ưu tiên 1)"
    : "Chưa có lịch khám để tạo phiếu";

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
      <Link href={returnTo} className="inline-block text-[13px] text-primary hover:underline">
        ← Về dashboard
      </Link>

      <section aria-labelledby="patient-name" className="rounded border border-gray-300 bg-white p-4">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 id="patient-name" className="break-words text-lg font-semibold">
              {patient.full_name}
            </h1>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <Field label="PID" value={patient.id} />
              <Field label="Ngày sinh" value={formatOptionalClinicDate(patient.date_of_birth)} />
              <Field label="Tuổi" value={ageAt(patient.date_of_birth, referenceDate)} />
              <Field label="Giới tính" value={formatGender(patient.gender)} />
            </dl>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <button
              type="button"
              disabled
              aria-describedby={CREATE_NOTE_ID}
              className="cursor-not-allowed rounded bg-gray-200 px-4 py-2 text-[13px] font-semibold text-muted"
            >
              Tạo phiếu khám
            </button>
            <p id={CREATE_NOTE_ID} className="text-xs text-muted">
              {createNote}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="insurance-title" className="space-y-2">
        <h2 id="insurance-title" className="text-lg font-semibold">
          Bảo hiểm
        </h2>
        <InsuranceSummary patient={patient} today={referenceDate} />
      </section>

      <EncounterHistory items={history} />
    </main>
  );
}
