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
const cardioDraft = (edit: (phieu: Record<string, unknown>) => void = () => {}) => {
  const draft = fixture("ai-output");
  Object.assign(draft.phieu_kham, {
    ly_do_kham: "tái khám tăng huyết áp", benh_su: "Theo dõi huyết áp tại nhà, thỉnh thoảng đau đầu nhẹ, không đau ngực, không khó thở.",
    kham_toan_than: "Tỉnh táo, tiếp xúc tốt", kham_tim_mach_ho_hap: "Mạch quay đều, rõ. Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran.",
    kham_khac: null, di_ung: { trang_thai: "chua_de_cap", loai: [], mo_ta: null }, co_thuoc_dang_dung: null, thuoc_dang_dung: [],
    chan_doan: [{ giai_doan: "ban_dau", vai_tro: "chinh", mo_ta: "Tăng huyết áp độ II", muc_do_khang_dinh: "xac_dinh" }],
    hen_tai_kham: { co_hen: null, nguyen_van: null, sau_bao_lau: { value: null, unit: null }, ngay_cu_the: null },
  });
  edit(draft.phieu_kham);
  draft.can_xem_lai = [];
  return draft;
};
test("thieu_thong_tin_khong_chon_nut_nao", () => {
  const r = run(); r.draft = cardioDraft();
  const patch = aiEformPatch(r, context);
  assert.equal(patch.fields.di_ung.value, "");
  assert.equal(patch.fields.thuoc_dang_dung.value, "");
  assert.equal(patch.fields.hen_tai_kham.value, "");
  assert.equal(patch.thuocDangDung, undefined);
});
test("ra_vien_trong_khi_chi_co_ban_dau", () => {
  const r = run(); r.draft = cardioDraft();
  const patch = aiEformPatch(r, context);
  assert.equal(patch.fields.mo_ta_ban_dau.value, "Tăng huyết áp độ II");
  assert.equal(patch.fields.mo_ta_ra_vien.value, "");
  assert.equal(patch.fields.icd_ra_vien.value, "");
});
test("ai_khong_ghi_de_sinh_hieu", () => {
  const base = emptyEncounter({ id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: context.now });
  base.sinh_hieu.ha_tam_thu = { value: 132, unit: "mmHg" };
  const before = structuredClone(base.sinh_hieu);
  const r = run(); r.draft = cardioDraft();
  r.draft.can_xem_lai = [{ field_path: "/sinh_hieu/ha_tam_thu", loai: "mau_thuan", mo_ta: "Hội thoại đọc huyết áp 150 trên 90, khác số đo của lượt khám.", segment_ids: ["seg-2"] }];
  const result = applyAiDraft(base, r, context);
  assert.deepStrictEqual(result.sinh_hieu, before);
  assert.equal(result.sinh_hieu.ha_tam_thu.value, 132);
});
test("UI patch gom khám tim phổi và thuốc đang dùng, không điền hành chính", () => {
  const r = run();
  r.draft = cardioDraft(phieu => {
    phieu.co_thuoc_dang_dung = true;
    phieu.thuoc_dang_dung = [{ ten: "Bisoprolol", ham_luong: "2,5 mg", cach_dung: "buổi sáng", trang_thai: "dang_dung" }];
    phieu.chan_doan = [{ giai_doan: "ra_vien", vai_tro: "chinh", mo_ta: "Tăng huyết áp vô căn", muc_do_khang_dinh: "xac_dinh" }];
    phieu.hen_tai_kham = { co_hen: true, nguyen_van: "tái khám sau 30 ngày", sau_bao_lau: { value: 30, unit: "ngay" }, ngay_cu_the: null };
  });
  const patch = aiEformPatch(r, context);
  assert.equal(patch.fields.ly_do.value, "tái khám tăng huyết áp");
  assert.equal(patch.fields.kham_tim_mach_ho_hap.nguon, "xem");
  assert.match(patch.fields.kham_tim_mach_ho_hap.value, /T1, T2/);
  assert.equal(patch.fields.kham_chuyen_khoa.value, "");
  assert.equal(patch.fields.thuoc_dang_dung.value, "NB có");
  assert.deepEqual(patch.thuocDangDung, [{ ten: "Bisoprolol", ham_luong: "2,5 mg", cach_dung: "buổi sáng" }]);
  assert.equal(patch.fields.mo_ta_ra_vien.value, "Tăng huyết áp vô căn");
  assert.equal(patch.fields.hen_tai_kham.value, "Có");
  for (const id of ["thoi_gian_kham", "noi_gioi_thieu", "chuyen_noi_soi", "xn_benh_tat", "xn_bhxh", "bs_uy_quyen"]) assert.equal(patch.fields[id], undefined, id);
});
