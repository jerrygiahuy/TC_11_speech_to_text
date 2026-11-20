import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PatientsFixtureSchema } from "@/shared/clinic/schema";
import type { EncounterContext } from "@/shared/clinical/api";
import type { KnownIdentifier } from "@/shared/clinical/pii";

export interface PatientConsent { trang_thai: boolean; luc: string | null }
export interface KnownIdentifiers { known: KnownIdentifier[]; consent: PatientConsent }

const readJson = (rel: string): unknown => JSON.parse(readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), rel), "utf8"));

/** Định danh của một bệnh nhân trong hồ sơ giả (data/clinic/patients.json) và cờ đồng ý xử lý AI (R14). Không có bệnh nhân thì null. */
export function patientKnownIdentifiers(patientId: string): KnownIdentifiers | null {
  const patient = PatientsFixtureSchema.parse(readJson("data/clinic/patients.json")).find((p) => p.id === patientId);
  if (!patient) return null;
  const known: KnownIdentifier[] = [
    { value: patient.full_name, kind: "BỆNH_NHÂN" },
    { value: patient.id, kind: "MÃ_ĐỊNH_DANH" },
  ];
  if (patient.dien_thoai) known.push({ value: patient.dien_thoai, kind: "LIÊN_HỆ" });
  if (patient.dia_chi) known.push({ value: patient.dia_chi, kind: "ĐỊA_DANH" });
  if (patient.noi_lam_viec) known.push({ value: patient.noi_lam_viec, kind: "NƠI_LÀM_VIỆC" });
  for (const n of patient.nguoi_nha ?? []) known.push({ value: n.ho_ten, kind: "NGƯỜI_NHÀ" }, { value: n.dien_thoai, kind: "LIÊN_HỆ" });
  const c = patient.dong_y_xu_ly_ai;
  return { known, consent: { trang_thai: c?.trang_thai ?? false, luc: c?.luc ?? null } };
}

/**
 * Danh sách R1 cho một lượt khám eForm: ngữ cảnh lượt khám + hồ sơ bệnh nhân + danh bạ bác sĩ.
 * Bệnh nhân không có trong hồ sơ thì coi là chưa đồng ý xử lý AI.
 */
export function knownIdentifiersForContext(context: EncounterContext): KnownIdentifiers {
  const patient = patientKnownIdentifiers(context.patientId);
  const ca = context.data.ca;
  const known: KnownIdentifier[] = [
    ...(patient?.known ?? []),
    { value: ca.ho_ten, kind: "BỆNH_NHÂN" },
    { value: ca.pid, kind: "MÃ_ĐỊNH_DANH" },
    { value: ca.ma_luot_kham, kind: "MÃ_ĐỊNH_DANH" },
    { value: ca.dang_nhap, kind: "MÃ_ĐỊNH_DANH" },
    { value: ca.bac_si_kham, kind: "BÁC_SĨ" },
    { value: ca.bac_si_chinh, kind: "BÁC_SĨ" },
    ...ca.lich_su.tien_su_ban_than.map((item) => ({ value: item.bac_si, kind: "BÁC_SĨ" as const })),
    ...ca.lich_su.di_ung.map((item) => ({ value: item.nguoi, kind: "BÁC_SĨ" as const })),
  ];
  const directory = readJson("data/clinic/directory-demo.json") as { doctors: { name: string }[] };
  for (const doctor of directory.doctors) known.push({ value: doctor.name, kind: "BÁC_SĨ" });

  const seen = new Set<string>();
  const unique = known
    .map((k) => ({ ...k, value: (k.value ?? "").trim() }))
    .filter((k) => k.value.length > 0 && !seen.has(`${k.kind}|${k.value}`) && Boolean(seen.add(`${k.kind}|${k.value}`)));
  return { known: unique, consent: patient?.consent ?? { trang_thai: false, luc: null } };
}
