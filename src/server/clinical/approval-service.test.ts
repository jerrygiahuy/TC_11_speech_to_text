import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { Encounter, Diagnosis, RecordingSession } from "@/shared/clinical/types";
import { emptyDefinition } from "@/shared/clinical/schema";
import { ClinicalError, ClinicalRepository } from "./repository";
import { getDemoClinicalActor, resolveEncounterContext } from "./encounter-context";

function setup() {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-scopes-")));
  const actor = getDemoClinicalActor(); const context = resolveEncounterContext(actor, "LK-GIA-0456");
  const record: Encounter = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter-service.example.json", "utf8"));
  Object.assign(record, { patient_id: context.patientId, appointment_id: context.appointmentId, facility_id: context.facilityId, examiner_id: actor.doctorId, primary_doctor_id: actor.doctorId, ai_runs: [], tom_tat: null });
  record.phieu_kham.ly_do_kham = "Đau ngực"; record.phieu_kham.benh_su = "Đau ngực ba ngày";
  const dx = emptyDefinition<Diagnosis>("diagnosis");
  Object.assign(dx, { id: "dx-initial", noi_dung: { giai_doan: "ban_dau", vai_tro: "chinh", mo_ta: "Đau ngực nghi do tim", muc_do_khang_dinh: "nghi_ngo" } });
  dx.icd.code = "R07.4"; record.chan_doan = [dx];
  record.chi_dinh.groups[0].chan_doan_lich_su_lam_sang = "Đau ngực";
  record.chi_dinh.items[0].danh_muc.code = "service-demo";
  return { actor, store, record: store.create(record) };
}
async function service() {
  assert.ok(fs.existsSync("src/server/clinical/approval-service.ts"), "scope approval service must exist");
  return import("./approval-service");
}
const status = (value: number) => (error: unknown) => error instanceof ClinicalError && error.status === value;
function session(record: Encounter): RecordingSession {
  return { id: "session-1", encounter_id: record.id, sequence: 1, device_id: "device", generation: 1, started_at: "2026-11-14T01:00:00Z", ended_at: null, state: "recording", stop_reason: null, content_state: "empty", content_revision: 0, reviewed_content_revision: null, reviewed_digest: null, reviewed_transcripts: [], requests: [], discarded_at: null, discarded_by: null };
}

test("approval appends immutable full snapshots, stays open and preserves unrelated scopes", async () => {
  const { approveScopes } = await service(); const { actor, store, record } = setup();
  const approved = approveScopes(actor, { id: record.id, expected_revision: 1, scopes: ["initial_note", "service_order:svc-demo-001"], acknowledged_issues: true }, store);
  assert.equal(approved.record.status, "dang_kham"); assert.equal(approved.record.revision, 2);
  assert.equal(approved.context.patientId, record.patient_id); assert.equal(approved.data.ca.pid, record.patient_id);
  assert.equal(approved.record.approval_versions.length, 2);
  for (const version of approved.record.approval_versions) {
    assert.match(version.digest, /^[a-f0-9]{64}$/); assert.equal(version.approved_by, actor.doctorId);
    const snapshot = version.snapshot as unknown as Encounter;
    assert.equal(snapshot.patient_id, record.patient_id); assert.deepEqual(snapshot.approval_versions, []);
  }
  const history = structuredClone(approved.record.approval_versions);
  const edited = store.update(record.id, 2, draft => { draft.phieu_kham.loi_dan = "Tái khám khi đau tăng"; return draft; }, actor.doctorId, new Date().toISOString());
  const conclusion = approveScopes(actor, { id: record.id, expected_revision: edited.revision, scopes: ["conclusion"], acknowledged_issues: true }, store);
  assert.deepEqual(conclusion.record.approval_versions.slice(0, 2), history);
  assert.equal(conclusion.record.approval_versions.length, 3);
  assert.deepEqual((conclusion.record.approval_versions[2].snapshot as unknown as Encounter).approval_versions, []);
});

test("scope validation approves orders independently and rejects incomplete selected sections atomically", async () => {
  const { approveScopes } = await service(); const { actor, store, record } = setup();
  const edited = store.update(record.id, 1, draft => { draft.phieu_kham.benh_su = null; return draft; }, actor.doctorId, new Date().toISOString());
  const order = approveScopes(actor, { id: record.id, expected_revision: edited.revision, scopes: ["service_order:svc-demo-001"], acknowledged_issues: true }, store);
  assert.equal(order.record.approval_versions.length, 1);
  assert.throws(() => approveScopes(actor, { id: record.id, expected_revision: order.record.revision, scopes: ["initial_note", "service_order:svc-demo-001"], acknowledged_issues: true }, store), status(422));
  assert.equal(store.read(record.id).revision, order.record.revision);
  assert.throws(() => approveScopes(actor, { id: record.id, expected_revision: order.record.revision, scopes: ["service_order:missing"], acknowledged_issues: true }, store), status(422));
});

test("wait needs no definitive diagnosis and resume only accepts waiting encounters", async () => {
  const { transitionEncounter } = await service(); const { actor, store, record } = setup();
  const waiting = transitionEncounter(actor, { id: record.id, expected_revision: 1, action: "wait" }, store);
  assert.equal(waiting.record.status, "cho_kq_cls");
  const resumed = transitionEncounter(actor, { id: record.id, expected_revision: 2, action: "resume" }, store);
  assert.equal(resumed.record.status, "dang_kham");
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: 3, action: "resume" }, store), status(409));
});

test("complete rejects all active session states, pending review and unapproved current sections", async () => {
  const { transitionEncounter, approveScopes } = await service();
  for (const state of ["opening", "recording", "finalizing"] as const) {
    const { actor, store, record } = setup();
    store.update(record.id, 1, draft => { draft.recording_sessions = [{ ...session(draft), state }]; return draft; }, actor.doctorId, new Date().toISOString());
    assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: 2, action: "complete" }, store), status(409));
  }
  const { actor, store, record } = setup();
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: 1, action: "complete" }, store), status(422));
  const approved = approveScopes(actor, { id: record.id, expected_revision: 1, scopes: ["initial_note", "service_order:svc-demo-001"], acknowledged_issues: true }, store);
  const pending = store.update(record.id, approved.record.revision, draft => { draft.recording_sessions = [{ ...session(draft), state: "stopped", ended_at: "2026-11-14T01:01:00Z", content_state: "awaiting_review", content_revision: 1 }]; return draft; }, actor.doctorId, new Date().toISOString());
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: pending.revision, action: "complete" }, store), status(409));
  const reviewed = store.update(record.id, pending.revision, draft => { draft.recording_sessions[0].content_state = "discarded"; draft.phieu_kham.loi_dan = "Lời dặn mới"; return draft; }, actor.doctorId, new Date().toISOString());
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: reviewed.revision, action: "complete" }, store), status(422));
  const final = approveScopes(actor, { id: record.id, expected_revision: reviewed.revision, scopes: ["conclusion"], acknowledged_issues: true }, store);
  const completed = transitionEncounter(actor, { id: record.id, expected_revision: final.record.revision, action: "complete" }, store);
  assert.equal(completed.record.status, "hoan_thanh_kham");
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: completed.record.revision, action: "resume" }, store), status(409));
  assert.throws(() => approveScopes(actor, { id: record.id, expected_revision: completed.record.revision, scopes: ["initial_note"], acknowledged_issues: true }, store), status(409));
});

test("approval and transition reject foreign actors, stale revisions and unknown request fields", async () => {
  const { approveScopes, transitionEncounter } = await service(); const { actor, store, record } = setup();
  const request = { id: record.id, expected_revision: 1, scopes: ["initial_note"] as const, acknowledged_issues: true as const };
  for (const foreign of [{ ...actor, doctorId: "foreign" }, { ...actor, facilityId: "foreign" }]) {
    assert.throws(() => approveScopes(foreign, { ...request, scopes: [...request.scopes] }, store), status(403));
    assert.throws(() => transitionEncounter(foreign, { id: record.id, expected_revision: 1, action: "wait" }, store), status(403));
  }
  assert.throws(() => approveScopes(actor, { ...request, expected_revision: 99, scopes: [...request.scopes] }, store), status(409));
  assert.throws(() => approveScopes(actor, { ...request, scopes: [...request.scopes], patient_id: "spoof" } as never, store));
  assert.equal(store.read(record.id).revision, 1);
});

test("completion rejects changed approved note and requires meaningful summary approval", async () => {
  const { approveScopes, transitionEncounter } = await service(); const { actor, store, record } = setup();
  const approved = approveScopes(actor, { id: record.id, expected_revision: 1, scopes: ["initial_note", "service_order:svc-demo-001"], acknowledged_issues: true }, store);
  const history = structuredClone(approved.record.approval_versions);
  const changed = store.update(record.id, approved.record.revision, draft => { draft.phieu_kham.benh_su = "Bệnh sử đã sửa"; return draft; }, actor.doctorId, new Date().toISOString());
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: changed.revision, action: "complete" }, store), status(422));
  const renewed = approveScopes(actor, { id: record.id, expected_revision: changed.revision, scopes: ["initial_note"], acknowledged_issues: true }, store);
  const summary = store.update(record.id, renewed.record.revision, draft => { draft.tom_tat = "Tóm tắt mới"; return draft; }, actor.doctorId, new Date().toISOString());
  assert.throws(() => transitionEncounter(actor, { id: record.id, expected_revision: summary.revision, action: "complete" }, store), status(422));
  const final = approveScopes(actor, { id: record.id, expected_revision: summary.revision, scopes: ["summary"], acknowledged_issues: true }, store);
  const completed = transitionEncounter(actor, { id: record.id, expected_revision: final.record.revision, action: "complete" }, store);
  assert.equal(completed.record.status, "hoan_thanh_kham");
  assert.deepEqual(completed.record.approval_versions.slice(0, 2), history);
});
