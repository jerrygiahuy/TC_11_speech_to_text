import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ClinicHttpError } from "./errors";
import type { ClinicActor, EncounterSource } from "./ports";
import { createClinicRepository } from "./repository";

const actor: ClinicActor = { doctor_id: "BS01", facility_id: "CS01" };
const dataDir = path.join(process.cwd(), "data", "clinic");

function snapshot(): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dataDir).map((f) => [f, readFileSync(path.join(dataDir, f), "utf8")]),
  );
}

test("repository_filters_by_doctor_and_facility", () => {
  const repo = createClinicRepository();
  const ids = repo.listDoctorAppointments(actor).map((a) => a.id);
  assert.ok(ids.includes("LK-000001"));
  assert.ok(!ids.includes("LK-000011"), "lịch bác sĩ khác không được lọt vào");
  assert.ok(!ids.includes("LK-000012"), "lịch cơ sở khác không được lọt vào");
  assert.equal(repo.getDoctorAppointment(actor, "LK-000011"), null);
  assert.equal(repo.getDoctorAppointment(actor, "LK-000012"), null);
  assert.equal(repo.getDoctorAppointment(actor, "LK-000001")?.patient_id, "000123");
});

test("repository_patient_scoped_to_facility_and_keeps_leading_zero", () => {
  const repo = createClinicRepository();
  assert.equal(repo.getPatient("CS01", "000123")?.id, "000123");
  assert.equal(repo.getPatient("CS01", "000127"), null);
  assert.equal(repo.getPatient("CS01", "123"), null, "không ép PID thành số");
  assert.equal(repo.getPatient("CS01", "999999"), null);
});

test("repository_joins_encounters_by_facility_including_other_doctors", () => {
  const repo = createClinicRepository();
  const refs = repo.listPatientEncounters("CS01", "000123");
  const ids = refs.map((r) => r.id).sort();
  assert.deepEqual(ids, [
    "enc-LK-000001",
    "enc-LK-000005",
    "enc-demo-000123-a",
    "enc-demo-000123-b",
  ]);
  assert.ok(refs.some((r) => r.doctor_id === "BS02"), "gồm phiếu bác sĩ khác cùng cơ sở");
  assert.deepEqual(repo.listPatientEncounters("CS01", "000127"), []);
  assert.deepEqual(
    repo.listFacilityEncounters("CS02").map((r) => r.id),
    ["enc-demo-000127-a"],
  );
});

test("repository_encounter_ref_ids_are_stable", () => {
  const a = createClinicRepository().listFacilityEncounters("CS01").map((r) => r.id);
  const b = createClinicRepository().listFacilityEncounters("CS01").map((r) => r.id);
  assert.deepEqual(a, b);
});

test("repository_store_error_is_error_not_empty", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "clinic-"));
  cpSync(dataDir, tmp, { recursive: true });
  writeFileSync(path.join(tmp, "appointments.json"), '[{"id":"x"}]');
  const repo = createClinicRepository({ dataDir: tmp });
  assert.throws(
    () => repo.listDoctorAppointments(actor),
    (e: unknown) => e instanceof ClinicHttpError && e.status === 500,
  );
  writeFileSync(path.join(tmp, "patients.json"), "{không phải json");
  assert.throws(
    () => repo.getPatient("CS01", "000123"),
    (e: unknown) => e instanceof ClinicHttpError && e.status === 500,
  );
});

test("repository_reading_never_writes", () => {
  const before = snapshot();
  const repo = createClinicRepository();
  repo.listDoctorAppointments(actor);
  repo.getPatient("CS01", "000123");
  repo.listPatientEncounters("CS01", "000123");
  repo.listFacilityEncounters("CS01");
  assert.deepEqual(snapshot(), before);
});

test("repository_uses_injected_source_only_via_port", () => {
  let calls = 0;
  const source: EncounterSource = {
    listByFacility(facilityId) {
      calls++;
      return [
        {
          id: "enc-x",
          appointment_id: "LK-000001",
          patient_id: "000123",
          facility_id: facilityId,
          doctor_id: "BS01",
          encounter_at: "2026-11-14T08:00:00+07:00",
          status: "dang_kham",
          summary: null,
        },
      ];
    },
  };
  const repo = createClinicRepository({ source });
  assert.deepEqual(repo.listPatientEncounters("CS01", "000123").map((r) => r.id), ["enc-x"]);
  assert.equal(calls, 1);
});
