import "server-only";
// Dữ liệu và kho dùng cho test: fixture 8 ca ở data/clinic-test, nguồn Encounter giả (không đọc phiếu thật).
import path from "node:path";
import { createFixtureEncounterSource } from "./fixture-source";
import type { ClinicActor } from "./ports";
import { createClinicRepository } from "./repository";

export const TEST_CLINIC_DATA_DIR = path.join(process.cwd(), "data", "clinic-test");
export const TEST_ACTOR: ClinicActor = { doctor_id: "BS01", facility_id: "CS01" };

export function createTestClinicRepository(dataDir: string = TEST_CLINIC_DATA_DIR) {
  return createClinicRepository({ dataDir, source: createFixtureEncounterSource(dataDir) });
}
