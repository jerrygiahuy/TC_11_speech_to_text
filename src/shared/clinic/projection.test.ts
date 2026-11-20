import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseEncounter } from "../clinical/schema";
import { projectHistoricalEncounter } from "./projection";
import type { PatientProfile } from "./types";

const patient: PatientProfile = {
  id: "GIA-000123", facility_id: "facility-prototype", full_name: "Nguyễn Thị Giả", date_of_birth: "1978-03-10", gender: "nữ",
  insurance: {
    bhyt: { known: false, enrolled: null, provider: null, plan: null, member_code: null, valid_from: null, valid_to: null },
    bao_lanh: { known: false, enrolled: null, provider: null, plan: null, member_code: null, valid_from: null, valid_to: null },
  },
};
const ctx = { patient, doctor_name: "BS. B", facility_name: "Cơ sở mô phỏng" };
const load = (n: number) =>
  parseEncounter(JSON.parse(readFileSync(path.join(process.cwd(), "data", "clinic", "history", `7a1c0001-0000-4000-8000-00000000000${n}.json`), "utf8")));

test("projection_has_every_saved_clinical_part_and_no_ai_or_transcript", () => {
  const vm = projectHistoricalEncounter(load(1), ctx);
  const byId = Object.fromEntries(vm.sections.map((s) => [s.id, s.rows]));
  assert.deepEqual(byId["ly-do"].map((r) => r.value), ["Ngạt mũi, hắt hơi buổi sáng", "Ngạt mũi từng đợt 2 tuần, hắt hơi nhiều, không sốt."]);
  assert.match(byId["chan-doan"][0].value, /J30\.4 Viêm mũi dị ứng \(Xác định\)/);
  assert.equal(byId["chi-dinh"][0].label, "Nội soi mũi");
  assert.match(byId["chi-dinh"][0].value, /SL 1/);
  assert.match(byId["ket-luan"].map((r) => r.value).join("|"), /tái khám sau 4 tuần/);
  assert.equal(vm.identity_source, "current_profile");
  assert.equal(vm.status, "completed");
  const text = JSON.stringify(vm);
  assert.doesNotMatch(text, /transcript|ai_runs|nguon_du_lieu|recording_sessions/i);
});

test("projection_reports_missing_sections_and_draft_without_inventing_data", () => {
  const vm = projectHistoricalEncounter(load(2), ctx);
  assert.ok(vm.missingSections.includes("Chỉ định"));
  assert.ok(vm.missingSections.includes("Kết quả cận lâm sàng"));
  assert.ok(!vm.sections.some((s) => s.id === "chi-dinh"));
  assert.deepEqual(vm.approval, { state: "draft", label: "Bản nháp" });
  // Không có đơn thuốc trong phiếu nên không được dựng mục thuốc từ nơi khác.
  assert.doesNotMatch(JSON.stringify(vm), /đơn thuốc/i);
});

test("projection_maps_waiting_status", () => {
  assert.equal(projectHistoricalEncounter(load(4), ctx).status, "waiting_results");
});
