import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PrivacyTickets } from "./privacy";
import { extractClinical, loadClinicalRun } from "./extraction";
import { ClinicalError } from "./repository";

test("bound extraction persists its source and rejects a mismatched source before cache reuse", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bound-extraction-"));
  const binding = { encounter_id: "enc-a", recording_session_id: "session-a", generation: 1, content_revision: 1 };
  const tickets = new PrivacyTickets();
  const preview = tickets.check("BS: Khám thấy phù chân.", "dictation", { known: [], allowlist: new Set(), consent: true, binding });
  const options = { directory, provider: "mock", binding, approvedTranscript: (ticket: string) => tickets.approved(ticket, binding) };
  const result = await extractClinical(preview.ticket!, options);
  assert.deepEqual(result.binding, binding);
  assert.deepEqual(loadClinicalRun(result.run_id, directory).binding, binding);
  await assert.rejects(() => extractClinical(preview.ticket!, { ...options, binding: { ...binding, encounter_id: "enc-b" } }),
    (error: unknown) => error instanceof ClinicalError && error.status === 409);
  await assert.rejects(() => extractClinical(preview.ticket!, { ...options, binding: { ...binding, content_revision: 2 } }),
    (error: unknown) => error instanceof ClinicalError && error.status === 409);
  assert.equal((await extractClinical(preview.ticket!, options)).run_id, result.run_id);
});

test("stored run binding must agree with its immutable transcript", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bound-run-"));
  const binding = { encounter_id: "enc-a", recording_session_id: "session-a", generation: 1, content_revision: 1 };
  const tickets = new PrivacyTickets();
  const preview = tickets.check("BS: Tim đều.", "dictation", { known: [], allowlist: new Set(), consent: true, binding });
  const result = await extractClinical(preview.ticket!, { directory, provider: "mock", binding,
    approvedTranscript: ticket => tickets.approved(ticket, binding) });
  const file = path.join(directory, "runs", `${result.run_id}.json`);
  assert.deepEqual(loadClinicalRun(result.run_id, directory).binding, binding);
  const stored = JSON.parse(fs.readFileSync(file, "utf8"));
  stored.binding = { ...binding, recording_session_id: "session-b" };
  fs.writeFileSync(file, JSON.stringify(stored));
  assert.throws(() => loadClinicalRun(result.run_id, directory));
});
