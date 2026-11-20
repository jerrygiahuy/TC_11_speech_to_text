import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { applyAiDraft, aiEformPatch } from "./apply-ai";
import { emptyEncounter, parseEncounter } from "./schema";
import type { ClinicalExtraction } from "./api";

const fixture = (name: string) => JSON.parse(fs.readFileSync(`docs/task-2/examples/${name}.example.json`, "utf8"));
let sequence = 0;
const context = { newId: () => `ai-row-${++sequence}`, now: "2026-11-12T10:00:00+07:00", services: [] };
const run = (): ClinicalExtraction => ({ run_id: "run-1", draft: fixture("ai-output-service"), transcript: fixture("transcript-service"), provider: "mock", model: "extractive", prompt_version: "1", created_at: context.now, input_digest: "digest", duration_ms: 1 });
test("AI draft becomes structured notes/services with provenance; retry does not duplicate rows", () => {
  const base = emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: context.now });
  const result = applyAiDraft(base, run(), context);
  assert.equal(result.chi_dinh.items.length, 1);
  assert.equal(result.chi_dinh.items[0].noi_dung.ben, "trai");
  assert.equal(result.ai_runs.length, 1);
  assert.ok(result.nguon_du_lieu.some(item => item.field_path === "/chi_dinh/items/0/noi_dung" && item.ai_run_id === "run-1"));
  const retry = applyAiDraft(result, run(), context);
  assert.deepEqual(retry, result);
  assert.equal("don_thuoc" in result, false);
  parseEncounter(result);
});
test("UI patch does not fill administrative/default/absent fields, retains positive clinical claims", () => {
  const r = run();
  r.draft = fixture("ai-output");
  const patch = aiEformPatch(r, context);
  assert.equal(patch.fields.ly_do.value, "Đau họng");
  assert.equal(patch.fields.icd_ra_vien, undefined);
  assert.equal(patch.fields.thoi_gian_kham, undefined);
  assert.equal(patch.fields.co_pttt, undefined);
  assert.equal(patch.fields.hen_tai_kham.value, "Có");
  assert.equal(patch.fields.kham_chuyen_khoa.nguon, "xem");
});
