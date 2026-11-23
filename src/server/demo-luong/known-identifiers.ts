import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { patientKnownIdentifiers } from "@/server/clinical/known-identifiers";
import type { KnownIdentifier } from "@/shared/clinical/pii";
import { ClinicalError } from "@/server/clinical/repository";

const root = process.cwd();
const readJson = (rel: string): unknown => JSON.parse(readFileSync(path.join(root, rel), "utf8"));

interface CaGia { pid: string; ma_luot_kham: string; dang_nhap: string; bac_si_kham: string; bac_si_chinh: string; danh_gia_ban_dau: { gia_tri: string }[] }
interface Directory { doctors: { id: string; name: string }[] }

/** Giá trị định danh đã biết của một bệnh nhân + nhân viên, và cờ đồng ý xử lý AI. Dữ liệu giả. */
export function knownIdentifiersFor(patientId: string): { known: KnownIdentifier[]; consent: { trang_thai: boolean; luc: string | null } } {
  const patient = patientKnownIdentifiers(patientId);
  if (!patient) throw new ClinicalError("Không tìm thấy bệnh nhân demo.", 404);
  const ca = readJson("data/eform/ca-gia.json") as CaGia;
  const dir = readJson("data/clinic/directory-demo.json") as Directory;

  const known: KnownIdentifier[] = [...patient.known];
  if (ca.pid === patientId) known.push({ value: ca.ma_luot_kham, kind: "MÃ_ĐỊNH_DANH" });
  const staff = new Set<string>([ca.bac_si_kham, ca.bac_si_chinh, ...dir.doctors.map((d) => d.name)]);
  for (const g of ca.danh_gia_ban_dau) if (/^ĐD\./.test(g.gia_tri)) staff.add(g.gia_tri.replace(/\s*\(.*\)$/, ""));
  for (const s of staff) known.push({ value: s, kind: "BÁC_SĨ" });

  return { known, consent: patient.consent };
}
