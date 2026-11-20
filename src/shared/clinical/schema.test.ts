import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { parseEncounter, parseAiOutput, parseTranscript, emptyEncounter, CLINICAL_SCHEMA_VERSION } from "./schema";

const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(`docs/task-2/examples/${name}.example.json`), "utf8"));
test("runtime parses canonical record, AI and transcript fixtures", () => {
  for (const name of ["encounter", "encounter-service"]) assert.deepEqual(parseEncounter(fixture(name)), fixture(name));
  for (const suffix of ["", "-unknown-speaker", "-service"]) {
    assert.deepEqual(parseAiOutput(fixture(`ai-output${suffix}`)), fixture(`ai-output${suffix}`));
    assert.deepEqual(parseTranscript(fixture(`transcript${suffix}`)), fixture(`transcript${suffix}`));
  }
});
test("strictly refuses prescription keys, including nested and empty fields", () => {
  assert.throws(() => parseEncounter({ ...fixture("encounter"), don_thuoc: { items: [] } }));
  const ai = fixture("ai-output");
  ai.phieu_kham.ke_don = [];
  assert.throws(() => parseAiOutput(ai));
});
test("checks service group references, positive quantities, unique ids and mention state", () => {
  const record = fixture("encounter-service");
  record.chi_dinh.items[0].group_id = "missing";
  assert.throws(() => parseEncounter(record), /nhóm/i);
  const negative = fixture("encounter-service");
  negative.chi_dinh.items[0].noi_dung.so_luong = 0;
  assert.throws(() => parseEncounter(negative));
  const duplicate = fixture("encounter-service");
  duplicate.chi_dinh.items.push(structuredClone(duplicate.chi_dinh.items[0]));
  assert.throws(() => parseEncounter(duplicate), /trùng/i);
  const ai = fixture("ai-output-service");
  ai.chi_dinh.de_cap = "khong_chi_dinh";
  assert.throws(() => parseAiOutput(ai), /chỉ định/i);
});
test("empty encounter uses null, preserves uncertainty and is an unapproved draft", () => {
  const e = emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: "2026-11-12T10:00:00+07:00" });
  assert.equal(e.phieu_kham.co_thuoc_dang_dung, null);
  assert.equal(e.phieu_kham.di_ung.trang_thai, "chua_de_cap");
  assert.equal(e.chi_dinh.de_cap, "chua_de_cap");
  assert.equal(e.audit.approved_by, null);
  assert.equal(e.revision, 1);
  assert.equal(e.sinh_hieu.can_nang.value, null);
  parseEncounter(e);
});

test("encounter 2.0 stores recording metadata and immutable reviewed revisions", () => {
  const e = emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: "2026-11-12T10:00:00+07:00" });
  assert.equal(e.schema_version, "2.0.0");
  assert.equal(CLINICAL_SCHEMA_VERSION, "2.0.0");
  assert.deepEqual(e.recording_sessions, []);
  assert.deepEqual(e.approval_versions, []);
  assert.deepEqual(e.change_decisions, []);
});

const recording = () => ({
  id: "session-1", encounter_id: "enc-1", sequence: 1, device_id: "device-1", generation: 1,
  started_at: "2026-11-12T10:00:00+07:00", ended_at: "2026-11-12T10:01:00+07:00", state: "stopped",
  stop_reason: "manual", content_state: "empty", content_revision: 0, reviewed_content_revision: null,
  reviewed_digest: null, reviewed_transcripts: [], requests: [], discarded_at: null, discarded_by: null,
});
test("encounter rejects duplicate sessions, reversed time, and foreign source sessions", () => {
  const e = emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: "2026-11-12T10:00:00+07:00" });
  const valid = { ...e, schema_version: "2.0.0", recording_sessions: [recording()] };
  assert.doesNotThrow(() => parseEncounter(valid));
  assert.throws(() => parseEncounter({ ...valid, recording_sessions: [recording(), recording()] }), /trùng/i);
  assert.throws(() => parseEncounter({ ...valid, recording_sessions: [{ ...recording(), ended_at: "2026-11-12T09:59:00+07:00" }] }), /thời gian/i);
  const source = fixture("encounter").nguon_du_lieu[0];
  assert.throws(() => parseEncounter({ ...valid, nguon_du_lieu: [{ ...source, recording_session_id: "foreign-session" }] }), /phiên/i);
});

test("approval snapshots accept nested JSON and reject executable or undefined values", () => {
  const e = emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: "2026-11-12T10:00:00+07:00" });
  const approval = { id: "approval-1", scope: "legacy", digest: "digest", approved_by: "doctor-demo", approved_at: "2026-11-12T10:00:00+07:00", sources: [], snapshot: { nested: [null, true, 4, { value: "reviewed" }] } };
  assert.doesNotThrow(() => parseEncounter({ ...e, approval_versions: [approval] }));
  for (const invalid of [undefined, () => "text", Infinity]) {
    assert.throws(() => parseEncounter({ ...e, approval_versions: [{ ...approval, snapshot: { invalid } }] }));
  }
});

test("legacy 1.1 transcript and AI contracts retain compatibility alongside bound transcript metadata", () => {
  const legacy = fixture("transcript");
  assert.equal(parseTranscript(legacy).schema_version, "1.1.0");
  assert.equal(parseAiOutput(fixture("ai-output")).schema_version, "2.0.0");
  const binding = { encounter_id: "enc-1", recording_session_id: "session-1", generation: 1, content_revision: 1 };
  assert.deepEqual(parseTranscript({ ...legacy, binding }).binding, binding);
  assert.throws(() => parseTranscript({ ...legacy, binding: { ...binding, encounter_id: undefined } }));
});

test("chỉ định: co_chi_dinh được phép chưa có dịch vụ (04, ca 013), có dịch vụ thì bắt buộc co_chi_dinh", () => {
  const rong = fixture("encounter-service");
  rong.chi_dinh.items = [];
  rong.chi_dinh.de_cap = "co_chi_dinh";
  assert.equal(parseEncounter(rong).chi_dinh.de_cap, "co_chi_dinh");
  for (const de_cap of ["chua_de_cap", "khong_chi_dinh"]) {
    const sai = fixture("encounter-service");
    sai.chi_dinh.de_cap = de_cap;
    assert.throws(() => parseEncounter(sai), /chỉ định/i);
  }
  const ai = fixture("ai-output-service");
  ai.chi_dinh.items = [];
  ai.chi_dinh.de_cap = "co_chi_dinh";
  assert.equal(parseAiOutput(ai).chi_dinh.items.length, 0);
});
