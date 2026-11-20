import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildAuditEntry, PII_POLICY_VERSION, type PiiAuditEntry } from "@/shared/clinical/pii";
import { AUDIT_NOT_CALLED, appendPiiAudit } from "./pii-audit";

const NOW = "2026-11-17T10:00:00.000Z";
const base: Omit<PiiAuditEntry, "at"> = {
  encounter_id: randomUUID(), session_sequence: 1, policy_version: PII_POLICY_VERSION,
  counts: { R1: 1, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0 }, gate: false, gate_reasons: ["R11c_ten_rieng_con_sot"],
  ai_route: "local_only", provider: AUDIT_NOT_CALLED, model: AUDIT_NOT_CALLED, clean_sha256: "a".repeat(64),
};

test("audit appends one line per entry and never keeps raw text fields", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-audit-"));
  const id = randomUUID();
  appendPiiAudit(id, { ...buildAuditEntry({ ...base, now: NOW }), raw: "Trần Văn Mô Phỏng" } as PiiAuditEntry, dir);
  appendPiiAudit(id, buildAuditEntry({ ...base, gate: true, gate_reasons: [], now: NOW }), dir);
  const lines = fs.readFileSync(path.join(dir, `${id}.ndjson`), "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  assert.ok(!lines[0].includes("Trần Văn Mô Phỏng"));
  assert.equal(JSON.parse(lines[0]).provider, "khong_goi");
  assert.equal(JSON.parse(lines[1]).gate, true);
});

test("audit refuses an encounter id that is not a UUID", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-audit-"));
  assert.throws(() => appendPiiAudit("../x", buildAuditEntry({ ...base, now: NOW }), dir), /không hợp lệ/);
  assert.deepEqual(fs.readdirSync(dir), []);
});
