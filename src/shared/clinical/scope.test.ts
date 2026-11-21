import assert from "node:assert/strict";
import { test } from "node:test";
import { clinicalOnlyResult } from "./scope";
import { buildSystemPrompt } from "@/server/ai/prompt";

test("scope boundary strips prescriptions from direct templates and mock fallbacks", () => {
  const result = { draft: { phieu_kham: { benh_su: "Đau ngực" }, chi_dinh: [], ke_don: [{ ten_thuoc: "Thuốc mẫu" }] }, matches: { ke_don: [] }, provider: "mock", duration_ms: 0 };
  assert.deepEqual(clinicalOnlyResult(result).draft, { phieu_kham: { benh_su: "Đau ngực" }, chi_dinh: [] });
  assert.deepEqual(clinicalOnlyResult(result).matches, {});
  assert.ok("ke_don" in result.draft);
});
test("clinical-only prompt explicitly excludes prescription content from free text", () => {
  const prompt = buildSystemPrompt([{ id: "phieu_kham", title: "Phiếu khám", mode: "single", fields: [] }], {});
  assert.match(prompt, /ngoài phạm vi/i);
  assert.match(prompt, /hướng điều trị.*lời dặn/i);
});
