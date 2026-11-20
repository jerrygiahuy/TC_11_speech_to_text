import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClinicalResponse, EncounterContext } from "@/shared/clinical/api";
import { ClinicHttpError } from "./errors";
import { openAppointmentEncounter, type OpenDeps } from "./open";
import type { ClinicActor, ContextLookup } from "./ports";
import { createTestClinicRepository } from "./testing";

const actor: ClinicActor = { doctor_id: "BS01", facility_id: "CS01" };
const NOW = () => "2026-11-14T03:00:00.000Z";
const FIXTURE_PATIENT: Record<string, string> = { "LK-000003": "000125", "LK-000005": "000123", "LK-000007": "000125", "LK-000001": "000123", "LK-000010": "000123" };
const contexts: ContextLookup = {
  find: (_a, id) => (FIXTURE_PATIENT[id] ? { appointment_id: id, patient_id: FIXTURE_PATIENT[id], facility_id: "CS01", doctor_id: "BS01" } : null),
};

function deps(extra: Partial<OpenDeps> = {}) {
  const calls: string[] = [];
  const d: OpenDeps = {
    repo: createTestClinicRepository(), now: NOW, contexts,
    resolveContext: (_a, id) => ({ appointmentId: id, patientId: FIXTURE_PATIENT[id], facilityId: "CS01", doctorId: "BS01" }) as EncounterContext,
    open: (context) => { calls.push(context.appointmentId); return { record: { id: "11111111-1111-4111-8111-111111111111" } } as unknown as ClinicalResponse; },
    ...extra,
  };
  return { d, calls };
}
const status = (fn: () => unknown) => { try { fn(); return "ok"; } catch (e) { return e instanceof ClinicHttpError ? e.status : "other"; } };

test("open_returns_record_id_for_eligible_appointment_and_reuses_on_repeat", () => {
  const { d, calls } = deps();
  const a = openAppointmentEncounter(actor, "LK-000003", d);
  const b = openAppointmentEncounter(actor, "LK-000003", d);
  assert.deepEqual(a, { encounter_id: "11111111-1111-4111-8111-111111111111", appointment_id: "LK-000003" });
  assert.deepEqual(a, b);
  assert.deepEqual(calls, ["LK-000003", "LK-000003"]);
});

test("open_rejects_cancelled_future_finished_and_missing_context_without_opening", () => {
  const { d, calls } = deps();
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000007", d)), 409); // hủy
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000010", d)), 409); // ngày mai
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000001", d)), 409); // đã hoàn thành
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000004", d)), 409); // không có ngữ cảnh
  assert.deepEqual(calls, []);
});

test("open_hides_other_doctor_and_facility_appointments", () => {
  const { d, calls } = deps();
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000011", d)), 404);
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000012", d)), 404);
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-999999", d)), 404);
  assert.deepEqual(calls, []);
});

test("open_refuses_context_of_another_patient", () => {
  const { d, calls } = deps({ resolveContext: (_a, id) => ({ appointmentId: id, patientId: "000999", facilityId: "CS01", doctorId: "BS01" }) as EncounterContext });
  assert.equal(status(() => openAppointmentEncounter(actor, "LK-000003", d)), 500);
  assert.deepEqual(calls, []);
});
