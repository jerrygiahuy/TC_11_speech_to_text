import "server-only";
// ADAPTER DEMO của EncounterSource: dựng EncounterRef giả từ `encounter_status` trong fixture lịch
// và từ data/clinic/encounters-demo.json (lượt khám cũ giả). Thay bằng adapter đọc Encounter thật của ưu tiên 1.
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { AppointmentsFixtureSchema, TimestampSchema } from "@/shared/clinic/schema";
import { storeError } from "./errors";
import type { EncounterRef, EncounterSource } from "./ports";

export const DEFAULT_CLINIC_DATA_DIR = path.join(process.cwd(), "data", "clinic");

const DemoEncounterSchema = z.object({
  id: z.string().min(1),
  appointment_id: z.string().min(1).nullable(),
  patient_id: z.string().min(1),
  facility_id: z.string().min(1),
  doctor_id: z.string().min(1),
  encounter_at: TimestampSchema,
  status: z.string().min(1),
  summary: z.string().nullable(),
});
const DemoEncountersSchema = z.array(DemoEncounterSchema);

function readJson(dir: string, name: string): unknown {
  try {
    return JSON.parse(readFileSync(path.join(dir, name), "utf8"));
  } catch (e) {
    throw storeError(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function createFixtureEncounterSource(dataDir: string = DEFAULT_CLINIC_DATA_DIR): EncounterSource {
  return {
    listByFacility(facilityId: string): EncounterRef[] {
      const rows = AppointmentsFixtureSchema.safeParse(readJson(dataDir, "appointments.json"));
      const demo = DemoEncountersSchema.safeParse(readJson(dataDir, "encounters-demo.json"));
      if (!rows.success) throw storeError(`appointments.json: ${rows.error.message}`);
      if (!demo.success) throw storeError(`encounters-demo.json: ${demo.error.message}`);

      const fromAppointments: EncounterRef[] = rows.data
        .filter((r) => r.facility_id === facilityId && r.encounter_status !== null)
        .map((r) => ({
          id: `enc-${r.id}`,
          appointment_id: r.id,
          patient_id: r.patient_id,
          facility_id: r.facility_id,
          doctor_id: r.doctor_id,
          encounter_at: r.starts_at,
          status: r.encounter_status as string,
          summary: null,
        }));
      const older = demo.data.filter((e) => e.facility_id === facilityId);
      return [...fromAppointments, ...older];
    },
  };
}
