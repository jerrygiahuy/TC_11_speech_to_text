import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { emptyEncounter, parseEncounter } from "./schema";
import { applyEformSnapshot, projectEform, parseEformSnapshot } from "./eform";

const now = "2026-11-12T10:00:00+07:00";
const base = () => emptyEncounter({ id: "enc-test", patientId: "patient-demo", doctorId: "doctor-demo", now });
let sequence = 0;
const context = { now, newId: () => `row-${++sequence}`, services: [{ ma: "DV-1", ten: "Nội soi tai" }] };
test("maps explicit denials separately from unknowns and diagnosis stages separately", () => {
  const e = applyEformSnapshot(base(), parseEformSnapshot({ fields: {
    di_ung: { value: "Không xác định", nguon: "bs" },
    thuoc_dang_dung: { value: "NB không có", nguon: "bs" },
    mo_ta_ban_dau: { value: "Đau tai", nguon: "bs" },
    ly_do: { value: "Đau tai phải", nguon: "bs" },
  }, chiDinh: [], trangThai: "Đang khám" }), context);
  assert.equal(e.phieu_kham.di_ung.trang_thai, "khong_xac_dinh");
  assert.equal(e.phieu_kham.co_thuoc_dang_dung, false);
  assert.equal(e.phieu_kham.co_pttt, null);
  assert.equal(e.chan_doan.length, 1);
  assert.equal(e.chan_doan[0].noi_dung.giai_doan, "ban_dau");
  assert.equal(e.phieu_kham.ly_do_kham, "Đau tai phải");
  parseEncounter(e);
});
test("round trip preserves specialist regions, relative followup and service identifiers", () => {
  const e = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter-service.example.json", "utf8"));
  const snapshot = projectEform(e);
  const restored = applyEformSnapshot(e, snapshot, context);
  assert.deepEqual(restored.phieu_kham.kham_chuyen_khoa, e.phieu_kham.kham_chuyen_khoa);
  assert.equal(restored.chi_dinh.items[0].id, e.chi_dinh.items[0].id);
  assert.equal(restored.chi_dinh.items[0].group_id, e.chi_dinh.items[0].group_id);
  const withFollowup = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  const same = applyEformSnapshot(withFollowup, projectEform(withFollowup), context);
  assert.deepEqual(same.phieu_kham.hen_tai_kham, withFollowup.phieu_kham.hen_tai_kham);
});
test("service quantity is nullable, code must be in hospital catalog, identifiers survive retry", () => {
  const snapshot = parseEformSnapshot({ fields: {}, trangThai: "Đang khám", chiDinh: [
    { ma: "DV-1", ten: "Nội soi tai", so_luong: "", ghi_chu: "Tai phải", nguon: "bs", ung_vien: [] },
  ] });
  const first = applyEformSnapshot(base(), snapshot, context);
  assert.equal(first.chi_dinh.items[0].noi_dung.so_luong, null);
  assert.equal(first.chi_dinh.items[0].danh_muc.code, "DV-1");
  const again = applyEformSnapshot(first, projectEform(first), context);
  assert.equal(again.chi_dinh.items[0].id, first.chi_dinh.items[0].id);
  snapshot.chiDinh[0].ma = "made-up";
  assert.throws(() => applyEformSnapshot(base(), snapshot, context), /danh mục/i);
  snapshot.chiDinh[0].ma = "";
  snapshot.chiDinh[0].so_luong = "hai";
  assert.throws(() => applyEformSnapshot(base(), snapshot, context), /số lượng/i);
});
test("snapshot cannot submit prescription, identity or approval; no date shifts with host timezone", () => {
  assert.throws(() => parseEformSnapshot({ fields: {}, chiDinh: [], trangThai: "Đang khám", donThuoc: [] }));
  assert.throws(() => parseEformSnapshot({ fields: { approved_by: { value: "doctor", nguon: "bs" } }, chiDinh: [], trangThai: "Đang khám" }));
  const e = applyEformSnapshot(base(), parseEformSnapshot({ fields: { thoi_gian_kham: { value: "2026-11-12T00:15", nguon: "bs" } }, chiDinh: [], trangThai: "Đang khám" }), context);
  assert.equal(e.encounter_at, "2026-11-12T00:15:00+07:00");
  assert.equal(projectEform(e).fields.thoi_gian_kham.value, "2026-11-12T00:15");
});

test("unchanged fields preserve AI provenance and accompanying diagnoses keep their stage", () => {
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  record.chan_doan[0].noi_dung.vai_tro = "kem_theo";
  record.chan_doan[0].icd.code = "J00";
  record.chan_doan[0].icd.display = "Mô tả cũ";
  const original = record.nguon_du_lieu.find((item: { field_path: string }) => item.field_path === "/phieu_kham/ly_do_kham");
  const saved = applyEformSnapshot(record, projectEform(record), context);
  assert.deepEqual(saved.nguon_du_lieu.find(item => item.field_path === "/phieu_kham/ly_do_kham"), original);
  assert.equal(saved.chan_doan[0].noi_dung.giai_doan, "ban_dau");
});

test("no-op save preserves original service wording, catalog snapshots and row evidence", () => {
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter-service.example.json", "utf8"));
  const service = record.chi_dinh.items[0];
  service.noi_dung.ten_dich_vu = "Nội soi tai phải";
  service.danh_muc = { catalog_id: "hospital-service-id", code_system: "hospital-service", code: "DV-1", display: "Nội soi tai", catalog_version: "2026", trang_thai: "khop_mot", ung_vien_ids: [] };
  const saved = applyEformSnapshot(record, projectEform(record), context);
  assert.deepEqual(saved.chi_dinh.items, record.chi_dinh.items);
  assert.deepEqual(saved.nguon_du_lieu.filter(item => item.field_path.startsWith("/chi_dinh/items/")), record.nguon_du_lieu.filter((item: { field_path: string }) => item.field_path.startsWith("/chi_dinh/items/")));
  const primary = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  primary.chan_doan[0].noi_dung.vai_tro = "chinh";
  primary.chan_doan[0].icd = { ...service.danh_muc, catalog_id: "icd-j00", code_system: "ICD-10", code: "J00", display: "Tên ICD" };
  const unchanged = applyEformSnapshot(primary, projectEform(primary), context);
  assert.deepEqual(unchanged.chan_doan, primary.chan_doan);
});

test("no-op save preserves evidence on a previously approved service", () => {
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter-service.example.json", "utf8"));
  record.chi_dinh.items[0].review = { trang_thai: "chap_nhan", reviewer_id: "doctor-demo-001", reviewed_at: context.now };
  record.chi_dinh.items[0].trang_thai = "da_xac_nhan";
  const saved = applyEformSnapshot(record, projectEform(record), context);
  assert.deepEqual(saved.chi_dinh.items[0].review, record.chi_dinh.items[0].review);
  assert.deepEqual(saved.nguon_du_lieu.filter(item => item.field_path.startsWith("/chi_dinh/items/")), record.nguon_du_lieu.filter((item: { field_path: string }) => item.field_path.startsWith("/chi_dinh/items/")));
});

test("approved AI source displays as reviewed on projection, unapproved remains flagged", () => {
  const record = JSON.parse(fs.readFileSync("docs/task-2/examples/encounter.example.json", "utf8"));
  assert.equal(projectEform(record).fields.ly_do.nguon, "xem");
  for (const source of record.nguon_du_lieu) source.review = { trang_thai: "chap_nhan", reviewer_id: "doctor-demo-001", reviewed_at: context.now };
  assert.equal(projectEform(record).fields.ly_do.nguon, "ai");
});

test("bác sĩ chọn mã ICD cho chẩn đoán AI chưa rõ vai trò thì thay đúng dòng đang hiện, không để lại dòng thừa không mã", () => {
  const withAi = applyEformSnapshot(base(), parseEformSnapshot({ fields: { mo_ta_ban_dau: { value: "viêm họng cấp", nguon: "bs" } }, chiDinh: [], trangThai: "Đang khám" }), context);
  withAi.chan_doan[0].noi_dung.vai_tro = "chua_ro"; // dòng do AI đề xuất
  const shown = projectEform(withAi);
  assert.equal(shown.fields.mo_ta_ban_dau.value, "viêm họng cấp");
  const chosen = applyEformSnapshot(withAi, parseEformSnapshot({ fields: { ...shown.fields, icd_ban_dau: { value: "J02.9", nguon: "bs" }, mo_ta_ban_dau: { value: "Viêm họng cấp tính, không xác định", nguon: "bs" } }, chiDinh: [], trangThai: "Đang khám" }), { ...context, icd: [{ ma: "J02.9", ten: "Viêm họng cấp tính, không xác định" }] });
  assert.equal(chosen.chan_doan.length, 1);
  assert.equal(chosen.chan_doan[0].icd.code, "J02.9");
});
