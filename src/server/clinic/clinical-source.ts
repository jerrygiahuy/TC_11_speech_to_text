import "server-only";
// Nguồn Encounter thật: đọc các phiếu đã lưu của lớp clinical (data/clinical/encounters) cùng bộ phiếu cũ giả
// trong data/clinic/history (cùng định dạng, tạo bằng `npm run tao-du-lieu-tim-mach`). Chỉ đọc.
import path from "node:path";
import type { Encounter } from "@/shared/clinical/types";
import { ClinicalRepository } from "@/server/clinical/repository";
import type { EncounterRef, EncounterSource } from "./ports";

export const DEFAULT_HISTORY_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "clinic", "history");

function toRef(record: Encounter): EncounterRef {
  return {
    id: record.id,
    appointment_id: record.appointment_id ?? null,
    patient_id: record.patient_id,
    facility_id: record.facility_id,
    doctor_id: record.examiner_id,
    encounter_at: record.encounter_at,
    status: record.status,
    summary: record.tom_tat?.trim() || null,
  };
}

export function createClinicalEncounterSource(
  live: ClinicalRepository = new ClinicalRepository(),
  history: ClinicalRepository = new ClinicalRepository(DEFAULT_HISTORY_DIR),
): EncounterSource {
  // Phiếu đang khám (live) ưu tiên hơn bản lưu cùng id; hai nguồn không trùng id trong thực tế.
  const all = (facilityId: string): Encounter[] => {
    const seen = new Set<string>();
    const rows: Encounter[] = [];
    for (const record of [...live.list(), ...history.list()]) {
      if (record.facility_id !== facilityId || seen.has(record.id)) continue;
      seen.add(record.id);
      rows.push(record);
    }
    return rows;
  };
  return {
    listByFacility: (facilityId) => all(facilityId).map(toRef),
    read: (facilityId, encounterId) => all(facilityId).find((record) => record.id === encounterId) ?? null,
  };
}
