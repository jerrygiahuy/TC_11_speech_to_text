import { formatOptionalClinicDate, NO_INFO } from "@/shared/clinic/format";
import type { ClinicDate, InsuranceInfo, InsuranceKind, PatientProfile } from "@/shared/clinic/types";

const KINDS: { kind: InsuranceKind; title: string }[] = [
  { kind: "bhyt", title: "BHYT" },
  { kind: "bao_lanh", title: "Bảo hiểm bảo lãnh" },
];

type Tone = "ok" | "none" | "unknown";

/** Phân biệt ba trạng thái; null/known=false không bao giờ thành "Không tham gia". */
function classify(info: InsuranceInfo): Tone {
  if (!info.known || info.enrolled === null) return "unknown";
  return info.enrolled ? "ok" : "none";
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[13px]">{value ?? NO_INFO}</dd>
    </div>
  );
}

function InsuranceBlock({ title, info, today }: { title: string; info: InsuranceInfo; today: ClinicDate }) {
  const tone = classify(info);
  const expired = tone === "ok" && info.valid_to !== null && info.valid_to < today;
  const unit = [info.provider, info.plan].filter(Boolean).join(" · ") || null;
  const range =
    info.valid_from === null && info.valid_to === null
      ? null
      : `${info.valid_from ? formatOptionalClinicDate(info.valid_from) : "?"} – ${info.valid_to ? formatOptionalClinicDate(info.valid_to) : "?"}`;

  return (
    <section aria-label={title} className="rounded border border-gray-300 bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {tone === "ok" && !expired && (
          <span className="rounded border border-accent/50 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-[color-mix(in_srgb,var(--accent)_55%,black)]">
            Có tham gia
          </span>
        )}
        {expired && (
          <span className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
            Hết hạn
          </span>
        )}
      </div>
      {tone === "none" && <p className="text-[13px]">Không tham gia</p>}
      {tone === "unknown" && <p className="text-[13px] text-muted">{NO_INFO}</p>}
      {tone === "ok" && (
        <dl className="space-y-1">
          <Row label="Đơn vị / gói" value={unit} />
          <Row label="Mã thẻ / HĐ" value={info.member_code} />
          <Row label="Hiệu lực" value={range} />
        </dl>
      )}
    </section>
  );
}

/** Hai khối bảo hiểm độc lập. `today` là ngày đối chiếu hạn (ngày hẹn nếu có, không thì hôm nay). */
export function InsuranceSummary({ patient, today }: { patient: PatientProfile; today: ClinicDate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {KINDS.map(({ kind, title }) => (
        <InsuranceBlock key={kind} title={title} info={patient.insurance[kind]} today={today} />
      ))}
    </div>
  );
}
