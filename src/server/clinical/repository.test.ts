import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ClinicalRepository, ClinicalError, assertLocalDemoRequest } from "./repository";
import { emptyEncounter } from "@/shared/clinical/schema";
import { createHash, randomUUID } from "node:crypto";

const now = "2026-11-12T10:00:00+07:00";
test("atomic save/read, revision conflict, immutable history and server owned metadata", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-repo-"));
  const repository = new ClinicalRepository(directory);
  const seed = emptyEncounter({ id: "ignored", patientId: "patient-demo", doctorId: "doctor-demo", now });
  const record = repository.create(seed);
  assert.match(record.id, /^[a-f0-9-]{36}$/);
  assert.deepEqual(repository.read(record.id), record);
  const updated = repository.update(record.id, 1, current => {
    current.phieu_kham.benh_su = "Đau ngực phải";
    current.audit.approved_by = "untrusted";
    current.patient_id = "spoofed";
    return current;
  }, "doctor-demo", now);
  assert.equal(updated.revision, 2);
  assert.equal(updated.patient_id, "patient-demo");
  assert.equal(updated.audit.approved_by, null);
  assert.throws(() => repository.update(record.id, 1, value => value, "doctor-demo", now), (error: unknown) => error instanceof ClinicalError && error.status === 409);
  assert.equal(repository.read(record.id).phieu_kham.benh_su, "Đau ngực phải");
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "revisions", `${record.id}-r1.json`), "utf8")).phieu_kham.benh_su, null);
});
test("rejects traversal and invalid payload, missing records give 404", () => {
  const repository = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-repo-")));
  assert.throws(() => repository.read("../../secret"), (error: unknown) => error instanceof ClinicalError && error.status === 400);
  assert.throws(() => repository.read("d55423b5-1782-4e2f-98fc-3474aec69ace"), (error: unknown) => error instanceof ClinicalError && error.status === 404);
  const seed = emptyEncounter({ id: "ignored", patientId: "patient-demo", doctorId: "doctor-demo", now });
  assert.throws(() => repository.create({ ...seed, don_thuoc: [] } as unknown as typeof seed));
});
test("local demo boundary refuses remote and cross-origin writes", () => {
  assert.doesNotThrow(() => assertLocalDemoRequest(new Request("http://localhost:3000/api/clinical", { method: "POST", headers: { origin: "http://localhost:3000" } })));
  assert.throws(() => assertLocalDemoRequest(new Request("https://example.com/api/clinical")));
  assert.throws(() => assertLocalDemoRequest(new Request("http://localhost:3000/api/clinical", { method: "POST", headers: { origin: "https://other.test" } })));
});

test("appointment opening is unique, facility-scoped and preserves terminal records", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-open-"));
  const repository = new ClinicalRepository(directory);
  const seed = emptyEncounter({ id: "ignored", patientId: "patient-demo", doctorId: "doctor-demo", now });
  seed.facility_id = "one"; seed.appointment_id = "000123";
  const [first, second] = await Promise.all([Promise.resolve().then(() => repository.openByAppointment(seed)), Promise.resolve().then(() => repository.openByAppointment(seed))]);
  assert.equal(first.id, second.id);
  assert.equal(second.revision, 1);
  assert.equal(repository.list().length, 1);
  assert.equal(repository.findByAppointment("one", "123"), null);
  const other = repository.openByAppointment({ ...seed, facility_id: "two" });
  assert.notEqual(other.id, first.id);
  assert.throws(() => repository.openByAppointment({ ...seed, patient_id: "different" }), (error: unknown) => error instanceof ClinicalError && error.status === 409);
  const terminal = repository.update(first.id, 1, value => ({ ...value, status: "hoan_thanh_kham" }), "doctor-demo", now);
  assert.deepEqual(repository.openByAppointment(seed), terminal);
  fs.writeFileSync(path.join(directory, `${randomUUID()}.tmp`), "invalid");
  fs.writeFileSync(path.join(directory, "notes.json"), "invalid");
  assert.equal(repository.list().length, 2);
  repository.create(seed);
  assert.throws(() => repository.findByAppointment("one", "000123"), (error: unknown) => error instanceof ClinicalError && error.status === 409);
});

test("held appointment lock rejects safely; retry opens one record and malformed records never hide", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-open-lock-"));
  const repository = new ClinicalRepository(directory);
  const seed = emptyEncounter({ id: "ignored", patientId: "patient-demo", doctorId: "doctor-demo", now });
  seed.facility_id = "one"; seed.appointment_id = "000123";
  const lock = path.join(directory, `.appointment-${createHash("sha256").update(JSON.stringify(["one", "000123"])).digest("hex")}.lock`);
  fs.writeFileSync(lock, "", { flag: "wx" });
  assert.throws(() => repository.openByAppointment(seed), (error: unknown) => error instanceof ClinicalError && error.status === 409);
  fs.unlinkSync(lock);
  const opened = repository.openByAppointment(seed);
  assert.equal(repository.openByAppointment(seed).id, opened.id);
  fs.writeFileSync(path.join(directory, `${randomUUID()}.json`), "broken");
  assert.throws(() => repository.openByAppointment({ ...seed, appointment_id: "next" }));
  assert.equal(fs.existsSync(lock), false);
});
