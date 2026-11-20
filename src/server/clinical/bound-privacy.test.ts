import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { emptyDefinition } from "@/shared/clinical/schema";
import type { RecordingSession } from "@/shared/clinical/types";
import { getDemoClinicalActor, resolveEncounterContext } from "./encounter-context";
import { openEncounter } from "./service";
import { ClinicalError, ClinicalRepository } from "./repository";
import { PrivacyTickets } from "./privacy";
import { checkRecordingPrivacy, checkRecordingPrivacyWithNer, requireRecordingContext } from "./bound-privacy";
import { readFileSync } from "node:fs";
import { PatientsFixtureSchema } from "@/shared/clinic/schema";

function setup() {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "bound-privacy-")));
  const actor = getDemoClinicalActor();
  const opened = openEncounter(resolveEncounterContext(actor, "000123"), store);
  const session = emptyDefinition<RecordingSession>("recordingSession");
  Object.assign(session, { id: randomUUID(), encounter_id: opened.record.id, device_id: "test-device", generation: 1, sequence: 1,
    started_at: "2026-11-14T01:00:00Z", ended_at: "2026-11-14T01:00:01Z", state: "stopped", content_state: "awaiting_review", content_revision: 1 });
  store.update(opened.record.id, opened.record.revision, record => { record.recording_sessions.push(session); return record; }, actor.doctorId, "2026-11-14T01:00:01Z");
  return { store, actor, binding: { encounter_id: opened.record.id, recording_session_id: session.id, generation: 1, content_revision: 1 }, tickets: new PrivacyTickets(), audit: fs.mkdtempSync(path.join(os.tmpdir(), "bound-audit-")) };
}

const readPatients = () => PatientsFixtureSchema.parse(JSON.parse(readFileSync(path.join(process.cwd(), "data/clinic/patients.json"), "utf8")));

test("check uses the patient's family names from the fixture and the record's consent", () => {
  const { store, actor, binding, tickets, audit } = setup(); // mã khám 000123 → GIA-000456, chưa đồng ý
  const relative = readPatients().find(p => p.id === "GIA-000456")!.nguoi_nha![0].ho_ten;
  const r = checkRecordingPrivacy(actor, { binding, text: `BN: Con là ${relative} đưa tôi đi khám, đau ngực.`, mode: "conversation" }, { store, tickets, auditDirectory: audit });
  assert.equal(r.status, "passed"); assert.ok(r.ticket);
  assert.ok(!r.preview.includes(relative));
  assert.equal(r.dong_y.trang_thai, false); assert.equal(r.ai_route, "local_only");
  assert.match(r.digest!, /^[a-f0-9]{64}$/);
  assert.deepEqual(r.binding, binding);
  assert.equal(fs.existsSync(path.join(audit, `${binding.encounter_id}.ndjson`)), false);
});

test("residual name is masked automatically: ticket issued, no blocked audit line, reasons returned for display", () => {
  const { store, actor, binding, tickets, audit } = setup();
  const r = checkRecordingPrivacy(actor, { binding, text: "hôm qua đỗ quốc việt mua thuốc giúp", mode: "conversation" }, { store, tickets, auditDirectory: audit });
  assert.equal(r.status, "passed"); assert.ok(r.ticket); assert.match(r.digest!, /^[a-f0-9]{64}$/);
  assert.ok(!r.preview.includes("quốc việt"));
  assert.deepEqual(r.auto_masked.map(x => x.reason), ["R11c_ten_rieng_con_sot"]);
  assert.equal(fs.existsSync(path.join(audit, `${binding.encounter_id}.ndjson`)), false);
});

test("blocked check writes one audit line without raw text and returns no ticket", () => {
  const { store, actor, binding, audit } = setup();
  // Phần sót không tự che được (giá trị đã biết dính trong một từ): dựng bằng ticket store giả.
  class BlockingTickets extends PrivacyTickets {
    override check(text: string, mode: "conversation" | "dictation", input: Parameters<PrivacyTickets["check"]>[2]) {
      return super.check(text, mode, { ...input, known: [...input.known, { value: "Quyx", kind: "BỆNH_NHÂN" }] });
    }
  }
  const r = checkRecordingPrivacy(actor, { binding, text: "đau quyxa tai", mode: "conversation" }, { store, tickets: new BlockingTickets(), auditDirectory: audit });
  assert.equal(r.status, "blocked"); assert.equal(r.ticket, null); assert.equal(r.digest, undefined);
  const line = fs.readFileSync(path.join(audit, `${binding.encounter_id}.ndjson`), "utf8").trim();
  assert.equal(line.split("\n").length, 1);
  const entry = JSON.parse(line);
  assert.equal(entry.gate, false); assert.equal(entry.provider, "khong_goi"); assert.equal(entry.session_sequence, 1);
  assert.deepEqual(entry.gate_reasons, ["R11a_gia_tri_da_biet"]);
  assert.ok(!line.includes("quyxa"));
});

test("check rejects fake ownership, a missing session and a stale content revision", () => {
  const { store, actor, binding, tickets, audit } = setup();
  const options = { store, tickets, auditDirectory: audit };
  assert.throws(() => requireRecordingContext({ ...actor, doctorId: "other" }, binding, store), (e: unknown) => e instanceof ClinicalError && e.status === 403);
  assert.throws(() => checkRecordingPrivacy(actor, { binding: { ...binding, recording_session_id: randomUUID() }, text: "Đau tai", mode: "conversation" }, options));
  const record = store.read(binding.encounter_id);
  store.update(record.id, record.revision, draft => { draft.recording_sessions[0].content_revision++; return draft; }, actor.doctorId, "2026-11-14T01:00:02Z");
  assert.throws(() => checkRecordingPrivacy(actor, { binding, text: "BS: Họng đỏ.", mode: "dictation" }, options), (e: unknown) => e instanceof ClinicalError && e.status === 409);
  assert.throws(() => checkRecordingPrivacy(actor, { binding, text: "BS: Họng đỏ.", mode: "dictation", consent: true }, options));
});

test("eForm: NER chạy thì che thêm tên rule bỏ sót và trả trạng thái ner", async () => {
  const { store, actor, binding, tickets, audit } = setup();
  const ner = async () => ({ trang_thai: "chay" as const, nguong: 0.5, model_sha256: "a".repeat(64),
    spans: [[{ start: 8, end: 11, nhan: "NAME", diem: 0.9 }]] });
  const r = await checkRecordingPrivacyWithNer(actor, { binding, text: "hôm qua lan đưa bé đi khám", mode: "conversation" }, { store, tickets, auditDirectory: audit, ner });
  assert.equal(r.status, "passed");
  assert.match(r.preview, /\[NGƯỜI_1\]/); assert.ok(!r.preview.includes("lan"));
  assert.deepEqual(r.ner, { trang_thai: "chay", so_doan: 1 });
  assert.deepEqual(tickets.pii(r.ticket!, binding).ner, { trang_thai: "chay", model_sha256: "a".repeat(64), so_doan: 1 });
});

test("eForm: NER không chạy thì bản che giống hệt chỉ dùng rule", async () => {
  const { store, actor, binding, tickets, audit } = setup();
  const text = "hôm qua đỗ quốc việt mua thuốc giúp";
  const r = await checkRecordingPrivacyWithNer(actor, { binding, text, mode: "conversation" }, { store, tickets, auditDirectory: audit, ner: async () => ({ trang_thai: "khong_chay" }) });
  const plain = checkRecordingPrivacy(actor, { binding, text, mode: "conversation" }, { store, tickets: new PrivacyTickets(), auditDirectory: audit });
  assert.equal(r.preview, plain.preview);
  assert.deepEqual(r.ner, { trang_thai: "khong_chay", so_doan: 0 });
  assert.deepEqual(plain.ner, { trang_thai: "tat", so_doan: 0 });
});

test("eForm: lỗi đầu vào vẫn bị từ chối trước khi gọi NER", async () => {
  const { store, actor, binding, tickets, audit } = setup();
  let called = false;
  const ner = async () => { called = true; return { trang_thai: "tat" as const }; };
  await assert.rejects(checkRecordingPrivacyWithNer(actor, { binding, text: "", mode: "conversation" }, { store, tickets, auditDirectory: audit, ner }));
  assert.equal(called, false);
});
