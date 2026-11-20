import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { emptyEncounter } from "@/shared/clinical/schema";
import { ClinicalError, ClinicalRepository } from "./repository";
import { getDemoClinicalActor, listEncounterContexts } from "./encounter-context";
import { PrivacyTickets } from "./privacy";
import { createRecordingTicketValidator } from "./reviewed-transcripts";
import { createRecordingService } from "./recording-service";

const conflict = (error: unknown) => error instanceof ClinicalError && error.status === 409;
function setup() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "recording-service-"));
  const store = new ClinicalRepository(path.join(directory, "encounters"));
  const actor = getDemoClinicalActor();
  let time = Date.parse("2026-11-14T00:00:00Z");
  const now = () => time;
  const tickets = new PrivacyTickets(now);
  const options = { store, leaseDirectory: path.join(directory, "leases"), tickets: createRecordingTicketValidator(tickets, path.join(directory, "transcripts")), now };
  const service = createRecordingService(options);
  const records = listEncounterContexts(actor).slice(0, 2).map(context => {
    const seed = emptyEncounter({ id: "new", patientId: context.patientId, doctorId: actor.doctorId, now: new Date(time).toISOString() });
    seed.facility_id = actor.facilityId; seed.appointment_id = context.appointmentId;
    return store.create(seed);
  });
  const start = (index = 0, request = "start-1", device = "device-1") => service.startRecording(actor, { encounter_id: records[index].id, expected_revision: store.read(records[index].id).revision, device_id: device, client_request_id: request });
  return { directory, options, service, store, actor, tickets, records, start, advance: (ms: number) => { time += ms; } };
}

test("stopping A1 releases device for B and A2; sessions retain distinct order and persisted replay identity", () => {
  const f = setup(); const a1 = f.start();
  const stop = { encounter_id: a1.record.id, session_id: a1.session.id, lease_token: a1.lease_token, expected_revision: a1.record.revision, reason: "doctor_stop" };
  const stopped = f.service.finalizeRecording(f.actor, stop);
  assert.equal(stopped.record.recording_sessions[0].state, "stopped");
  assert.equal(stopped.record.recording_sessions[0].content_state, "awaiting_review");
  const b = f.start(1, "start-b");
  f.service.finalizeRecording(f.actor, { ...stop, encounter_id: b.record.id, session_id: b.session.id, lease_token: b.lease_token, expected_revision: b.record.revision });
  const a2 = f.start(0, "start-2");
  assert.equal(a2.session.sequence, 2); assert.equal(a2.session.generation, 2);
  assert.notEqual(a2.session.id, a1.session.id);
  const replay = createRecordingService(f.options).startRecording(f.actor, { encounter_id: a1.record.id, expected_revision: 1, device_id: "device-1", client_request_id: "start-1" });
  assert.equal(replay.session.id, a1.session.id); assert.equal(replay.record.revision, a2.record.revision);
  assert.equal(replay.lease_token, a1.lease_token);
  assert.throws(() => f.service.startRecording(f.actor, { encounter_id: a1.record.id, expected_revision: 2, device_id: "device-1", client_request_id: "start-1" }), conflict);
});

test("two tabs and devices cannot own concurrent microphones; heartbeat extends lease at ten seconds", () => {
  const f = setup(); const a = f.start(); const other = createRecordingService(f.options);
  assert.throws(() => f.start(1, "tab-2"), conflict);
  assert.throws(() => f.start(0, "other-device", "device-2"), conflict);
  f.advance(10_000);
  assert.equal(other.heartbeatRecording(f.actor, { encounter_id: a.record.id, session_id: a.session.id, lease_token: a.lease_token }).expires_at, "2026-11-14T00:00:40.000Z");
  f.advance(20_001); assert.throws(() => f.start(1, "before-expiry"), conflict);
  f.advance(10_000); const b = f.start(1, "after-expiry");
  assert.equal(f.store.read(a.record.id).recording_sessions[0].state, "interrupted");
  assert.equal(b.session.state, "recording");
  assert.throws(() => other.heartbeatRecording(f.actor, { encounter_id: a.record.id, session_id: a.session.id, lease_token: a.lease_token }), conflict);
});

test("session and token cannot cross encounters; terminal, revision, ownership and raw text checks are enforced", () => {
  const f = setup(); const a = f.start();
  assert.throws(() => f.service.finalizeRecording(f.actor, { encounter_id: f.records[1].id, session_id: a.session.id, lease_token: a.lease_token, expected_revision: 1, reason: "stop" }), conflict);
  assert.throws(() => f.service.finalizeRecording(f.actor, { encounter_id: a.record.id, session_id: a.session.id, lease_token: a.lease_token, expected_revision: 1, reason: "stop" }), conflict);
  assert.throws(() => f.service.updateRecordingContent(f.actor, { encounter_id: a.record.id, session_id: a.session.id, expected_revision: a.record.revision, content_revision: 0, client_request_id: "raw", action: "invalidate", text: "secret" } as never));
  assert.throws(() => f.service.heartbeatRecording({ ...f.actor, doctorId: "other" }, { encounter_id: a.record.id, session_id: a.session.id, lease_token: a.lease_token }), (e: unknown) => e instanceof ClinicalError && e.status === 403);
  const terminal = f.store.update(f.records[1].id, 1, record => ({ ...record, status: "hoan_thanh_kham" }), f.actor.doctorId, "2026-11-14T00:00:00Z");
  assert.throws(() => f.service.startRecording(f.actor, { encounter_id: terminal.id, expected_revision: terminal.revision, device_id: "free", client_request_id: "terminal" }), conflict);
});

test("content attaches after stop, invalidation rejects stale tickets, discard retains reviewed artifacts and retries do not repeat", () => {
  const f = setup(); const a = f.start();
  const stop = { encounter_id: a.record.id, session_id: a.session.id, lease_token: a.lease_token, expected_revision: a.record.revision, reason: "stop" };
  let record = f.service.finalizeRecording(f.actor, stop).record;
  const base = { encounter_id: record.id, session_id: a.session.id };
  const invalidate = { ...base, expected_revision: record.revision, content_revision: 0, client_request_id: "edit-1", action: "invalidate" as const };
  record = f.service.updateRecordingContent(f.actor, invalidate).record;
  assert.equal(record.recording_sessions[0].content_revision, 1);
  const binding = { encounter_id: record.id, recording_session_id: a.session.id, generation: a.session.generation, content_revision: 1 };
  const preview = f.tickets.check("BS: Họng đỏ.", "dictation", { known: [], allowlist: new Set(), consent: true, binding });
  const attach = { ...base, expected_revision: record.revision, content_revision: 1, client_request_id: "attach-1", action: "attach_reviewed" as const, transcript_ticket: preview.ticket! };
  record = f.service.updateRecordingContent(f.actor, attach).record;
  assert.equal(record.recording_sessions[0].content_state, "reviewed");
  assert.equal(f.service.finalizeRecording(f.actor, stop).record.revision, record.revision);
  record = f.service.updateRecordingContent(f.actor, { ...invalidate, expected_revision: record.revision, content_revision: 1, client_request_id: "edit-2" }).record;
  assert.throws(() => f.service.updateRecordingContent(f.actor, { ...attach, expected_revision: record.revision, content_revision: 2, client_request_id: "stale" }), conflict);
  const discard = { ...base, expected_revision: record.revision, content_revision: 2, client_request_id: "discard-1", action: "discard" as const };
  record = f.service.updateRecordingContent(f.actor, discard).record;
  assert.equal(record.recording_sessions[0].content_state, "discarded");
  assert.equal(record.recording_sessions[0].reviewed_transcripts.length, 1);
  assert.equal(fs.readdirSync(path.join(f.directory, "transcripts")).length, 1);
  assert.equal(createRecordingService(f.options).updateRecordingContent(f.actor, discard).record.revision, record.revision);
  assert.equal(f.service.updateRecordingContent(f.actor, invalidate).record.revision, record.revision);
  assert.throws(() => f.service.updateRecordingContent(f.actor, { ...discard, action: "invalidate" }), conflict);
});

test("crashed reservation and post-metadata publication failures recover only after expiry", () => {
  for (const phase of ["reservation", "metadata"] as const) {
    const f = setup();
    const faulting = createRecordingService({ ...f.options, onWrite: (stage: string) => { if (stage === phase) throw new Error("disk fault"); } });
    assert.throws(() => faulting.startRecording(f.actor, { encounter_id: f.records[0].id, expected_revision: 1, device_id: "device-1", client_request_id: "fault" }), /disk fault/);
    assert.throws(() => f.start(1, "premature"), conflict);
    f.advance(30_001); f.service.recoverInterruptedRecordings(f.actor, "device-1");
    const old = f.store.read(f.records[0].id);
    assert.equal(old.recording_sessions.length, phase === "metadata" ? 1 : 0);
    if (old.recording_sessions.length) assert.equal(old.recording_sessions[0].state, "interrupted");
    assert.equal(f.start(1, "recovered").session.state, "recording");
  }
});

test("retry after a committed finalize write failure releases the device without changing content again", () => {
  const f = setup(); const a = f.start();
  const stop = { encounter_id: a.record.id, session_id: a.session.id, lease_token: a.lease_token, expected_revision: a.record.revision, reason: "stop" };
  const faulting = createRecordingService({ ...f.options, onWrite: stage => { if (stage === "finalized") throw new Error("lease publish fault"); } });
  assert.throws(() => faulting.finalizeRecording(f.actor, stop), /lease publish fault/);
  const revision = f.store.read(a.record.id).revision;
  assert.equal(f.service.finalizeRecording(f.actor, stop).record.revision, revision);
  assert.equal(f.start(1, "after-finalize-retry").session.state, "recording");
});

test("waiting requires an explicit resume before a new recording starts", () => {
  const f = setup(); const a = f.records[0];
  const waiting = f.store.update(a.id, a.revision, record => ({ ...record, status: "cho_kq_cls" }), f.actor.doctorId, "2026-11-14T00:00:00Z");
  assert.throws(() => f.service.startRecording(f.actor, { encounter_id: a.id, expected_revision: waiting.revision, device_id: "device-1", client_request_id: "while-waiting" }), conflict);
  f.store.update(a.id, waiting.revision, record => ({ ...record, status: "dang_kham" }), f.actor.doctorId, "2026-11-14T00:00:01Z");
  assert.equal(f.start(0, "after-resume").session.state, "recording");
});

test("an aged writer lock owned by a live process is never stolen", () => {
  const f = setup(); fs.mkdirSync(f.options.leaseDirectory, { recursive: true });
  const lock = path.join(f.options.leaseDirectory, `${createHash("sha256").update(JSON.stringify("device-1")).digest("hex")}.json.lock`);
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce: "another-writer" }));
  fs.utimesSync(lock, new Date(0), new Date(0)); f.advance(3_600_000);
  assert.throws(() => f.start(), conflict);
  assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).nonce, "another-writer");
  assert.equal(f.store.read(f.records[0].id).recording_sessions.length, 0);
});
