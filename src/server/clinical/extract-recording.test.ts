import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { emptyDefinition } from "@/shared/clinical/schema";
import type { RecordingSession } from "@/shared/clinical/types";
import { getDemoClinicalActor, resolveEncounterContext } from "./encounter-context";
import { openEncounter } from "./service";
import { ClinicalRepository } from "./repository";
import { PrivacyTickets } from "./privacy";
import { checkRecordingPrivacy } from "./bound-privacy";
import { extractForRecording } from "./extract-recording";
import { createRecordingTicketValidator } from "./reviewed-transcripts";

function setup(appointment = "LK-GIA-0456", attach = true, text = "BN: Đau ngực 3 ngày.\nBS: Khám thấy phù chân. Chỉ định điện tâm đồ, số lượng 1.") {
  const tmp = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  const store = new ClinicalRepository(tmp("extract-recording"));
  const actor = getDemoClinicalActor();
  const opened = openEncounter(resolveEncounterContext(actor, appointment), store);
  const session = emptyDefinition<RecordingSession>("recordingSession");
  Object.assign(session, { id: randomUUID(), encounter_id: opened.record.id, device_id: "test-device", generation: 1, sequence: 1,
    started_at: "2026-11-17T01:00:00Z", ended_at: "2026-11-17T01:00:01Z", state: "stopped", content_state: "awaiting_review", content_revision: 1 });
  store.update(opened.record.id, opened.record.revision, record => { record.recording_sessions.push(session); return record; }, actor.doctorId, "2026-11-17T01:00:01Z");
  const binding = { encounter_id: opened.record.id, recording_session_id: session.id, generation: 1, content_revision: 1 };
  let time = Date.parse("2026-11-17T10:00:00+07:00");
  const tickets = new PrivacyTickets(() => time);
  const auditDirectory = tmp("extract-audit");
  const runDirectory = tmp("extract-runs");
  const checked = checkRecordingPrivacy(actor, { binding, text, mode: "conversation" }, { store, tickets, auditDirectory });
  assert.equal(checked.status, "passed");
  // Gắn bản chép lời đã kiểm tra vào phiên, giống bước attach_reviewed của recording-service.
  const receipt = createRecordingTicketValidator(tickets, tmp("extract-reviewed")).validate(checked.ticket!, binding);
  const record = store.read(binding.encounter_id);
  if (attach) store.update(record.id, record.revision, draft => {
    const target = draft.recording_sessions[0];
    target.reviewed_transcripts.push({ content_revision: 1, digest: receipt.digest, transcript_id: receipt.transcript_id,
      transcript_revision: receipt.transcript_revision, artifact_id: receipt.artifact_id, reviewed_at: "2026-11-17T01:00:02Z", reviewed_by: actor.doctorId });
    target.reviewed_content_revision = 1; target.reviewed_digest = receipt.digest; target.content_state = "reviewed";
    return draft;
  }, actor.doctorId, "2026-11-17T01:00:02Z");
  const readAudit = () => {
    const file = path.join(auditDirectory, `${binding.encounter_id}.ndjson`);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").map(line => JSON.parse(line)) : [];
  };
  return { actor, store, tickets, binding, ticket: checked.ticket!, auditDirectory, runDirectory, readAudit, advance: (ms: number) => { time += ms; } };
}

test("auto-masked residue reaches the extractor already masked and the audit line lists only reason codes", async () => {
  const f = setup("LK-GIA-0456", true, "BN: Đau ngực 3 ngày.\nBN: hôm qua đỗ quốc việt mua thuốc giúp.\nBS: Khám thấy phù chân.");
  const run = await extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory });
  assert.ok(!JSON.stringify(run.transcript).includes("quốc việt"));
  assert.ok(run.transcript.segments.some(s => s.text.includes("[NGƯỜI_KHÁC]")));
  const lines = f.readAudit();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].gate, true);
  assert.deepEqual(lines[0].auto_masked, ["R11c_ten_rieng_con_sot"]);
  assert.ok(!JSON.stringify(lines[0]).includes("quốc việt"));
});

test("extraction records provider mock and one passed audit line; env provider cannot change it", async () => {
  const f = setup();
  const before = process.env.CLINICAL_LLM_PROVIDER;
  process.env.CLINICAL_LLM_PROVIDER = "gemini";
  try {
    const run = await extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory });
    assert.equal(run.provider, "mock");
    assert.deepEqual(run.binding, f.binding);
    assert.equal(run.transcript.privacy.policy_version, "pii-auto-2");
    const lines = f.readAudit();
    assert.equal(lines.length, 1);
    assert.equal(lines[0].gate, true);
    assert.deepEqual(lines[0].gate_reasons, []);
    assert.equal(lines[0].provider, "mock");
    assert.equal(lines[0].ai_route, "external_allowed");
    assert.equal(lines[0].session_sequence, 1);
    assert.equal(lines[0].clean_sha256, f.tickets.pii(f.ticket, f.binding).clean_sha256);
    assert.ok(!JSON.stringify(lines[0]).includes("phù chân"));
  } finally {
    if (before === undefined) delete process.env.CLINICAL_LLM_PROVIDER; else process.env.CLINICAL_LLM_PROVIDER = before;
  }
});

test("patient without consent still runs the local extractor and logs a local_only route", async () => {
  const f = setup("000123");
  await extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory });
  assert.equal(f.readAudit()[0].ai_route, "local_only");
});

test("expired ticket fails before AI and writes no audit line", async () => {
  const f = setup();
  f.advance(11 * 60_000);
  await assert.rejects(extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory }), /hết hạn/i);
  assert.equal(f.readAudit().length, 0);
  assert.equal(fs.readdirSync(f.runDirectory).length, 0);
});

test("transcript not yet attached to the session is refused with 409 and no audit", async () => {
  const f = setup("LK-GIA-0456", false);
  await assert.rejects(extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory }), /lưu bản chép lời/);
  assert.equal(f.readAudit().length, 0);
});

test("luong_that_doi_chieu_sinh_hieu_luot_kham: huyết áp đọc khác sinh hiệu lượt khám thì có cờ mau_thuan, sinh hiệu encounter không đổi", async () => {
  const f = setup("LK-GIA-0456", true, "BN: Tôi hồi hộp từng lúc.\nBS: Huyết áp 150 trên 90. Chỉ định điện tim thường, số lượng 1.");
  const before = f.store.read(f.binding.encounter_id);
  assert.equal(before.sinh_hieu.ha_tam_thu?.value, 148);
  const run = await extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory });
  const flags = run.draft.can_xem_lai.filter(item => item.loai === "mau_thuan");
  assert.ok(flags.some(item => item.field_path === "/sinh_hieu/ha_tam_thu"), JSON.stringify(run.draft.can_xem_lai));
  assert.ok(flags.some(item => item.field_path === "/sinh_hieu/ha_tam_truong"));
  assert.deepEqual(f.store.read(f.binding.encounter_id).sinh_hieu, before.sinh_hieu);
});

test("luong_that_cung_huyet_ap_khong_co_co_mau_thuan", async () => {
  const f = setup("LK-GIA-0456", true, "BN: Tôi hồi hộp từng lúc.\nBS: Huyết áp 148 trên 88.");
  const run = await extractForRecording(f.actor, f.ticket, f.binding, { store: f.store, tickets: f.tickets, runDirectory: f.runDirectory, auditDirectory: f.auditDirectory });
  assert.equal(run.draft.can_xem_lai.some(item => item.loai === "mau_thuan"), false);
});
