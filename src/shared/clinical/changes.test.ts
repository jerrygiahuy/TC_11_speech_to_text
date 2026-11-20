import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { applyClinicalChanges, proposeClinicalChanges, StaleChangeError } from "./changes";
import { emptyEncounter } from "./schema";
import type { ClinicalExtraction } from "./api";

const fixture = (name: string) => JSON.parse(fs.readFileSync(`docs/task-2/examples/${name}.example.json`, "utf8"));
const now = "2026-11-12T10:00:00+07:00";
const run = (id = "run-1", draft = "ai-output-service"): ClinicalExtraction => ({ run_id: id, draft: fixture(draft), transcript: fixture("transcript-service"), provider: "mock", model: "extractive", prompt_version: "1", created_at: now, input_digest: "digest", duration_ms: 1 });
const base = () => emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now });
let n = 0;
const context = () => ({ now, doctorId: "doctor-demo", newId: () => `decision-${++n}` });

test("change set ids are deterministic and independent of the caller", () => {
  const a = proposeClinicalChanges(base(), run()); const b = proposeClinicalChanges(base(), run());
  assert.deepEqual(a, b);
  assert.ok(a.changes.length > 0);
  assert.equal(new Set(a.changes.map(item => item.id)).size, a.changes.length);
});

test("accepting one change only changes that change; the rest stay untouched", () => {
  const set = proposeClinicalChanges(base(), run("run-2", "ai-output"));
  const field = set.changes.find(item => item.field_path === "/phieu_kham/ly_do_kham")!;
  const result = applyClinicalChanges(base(), set, [field.id], context());
  assert.equal(result.phieu_kham.ly_do_kham, field.after);
  assert.equal(result.phieu_kham.benh_su, base().phieu_kham.benh_su);
  assert.equal(result.change_decisions.length, 1);
  assert.equal(result.change_decisions[0].decision, "accepted");
});

test("AI never overwrites a doctor edit unless the change is selected, and stale base values are refused", () => {
  const set = proposeClinicalChanges(base(), run("run-3", "ai-output"));
  const field = set.changes.find(item => item.field_path === "/phieu_kham/ly_do_kham")!;
  const edited = base(); edited.phieu_kham.ly_do_kham = "Bác sĩ đã sửa";
  assert.equal(applyClinicalChanges(edited, set, [], context(), [field.id]).phieu_kham.ly_do_kham, "Bác sĩ đã sửa");
  assert.throws(() => applyClinicalChanges(edited, set, [field.id], context()), StaleChangeError);
});

test("retrying the same decision is idempotent and decisions never apply to another encounter", () => {
  const set = proposeClinicalChanges(base(), run("run-4", "ai-output"));
  const ids = set.changes.map(item => item.id);
  const first = applyClinicalChanges(base(), set, ids, context());
  const second = applyClinicalChanges(first, set, ids, context());
  assert.deepEqual(second.change_decisions, first.change_decisions);
  const other = emptyEncounter({ id: "enc-2", patientId: "patient-2", doctorId: "doctor-demo", now });
  assert.throws(() => applyClinicalChanges(other, set, ids, context()), StaleChangeError);
  assert.throws(() => applyClinicalChanges(base(), set, ["unknown"], context()), StaleChangeError);
});

test("repeating an existing service mention adds no order; new orders arrive with their group", () => {
  const set = proposeClinicalChanges(base(), run());
  const orders = set.changes.filter(item => item.scope.startsWith("service_order:"));
  assert.ok(orders.length >= 1);
  const applied = applyClinicalChanges(base(), set, orders.map(item => item.id), context());
  assert.equal(applied.chi_dinh.items.length, orders.length);
  assert.ok(applied.chi_dinh.groups.length >= 1);
  const again = proposeClinicalChanges(applied, run("run-5"));
  assert.equal(again.changes.filter(item => item.scope.startsWith("service_order:")).length, 0);
});
