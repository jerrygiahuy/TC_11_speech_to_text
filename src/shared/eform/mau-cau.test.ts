import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { chenMauCau, docThuVienTimMach } from "./mau-cau";
import { dongChanDoanIn } from "./chan-doan-in";

const thuVien = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "cardiology", "exam-library.json"), "utf8"));

test("thu_vien_tim_mach", () => {
  const data = docThuVienTimMach(thuVien);
  assert.equal(data.theoVung.tim_mach_ho_hap.length, 13);
  assert.equal(data.theoVung.toan_than.length, 7);
});

test("chen_mau_cau: ô rỗng thành các dòng gạch đầu dòng", () => {
  assert.equal(chenMauCau("", ["Lồng ngực cân đối hai bên", "Phổi trong, không ran"]), "- Lồng ngực cân đối hai bên\n- Phổi trong, không ran");
});

test("chen_mau_cau: ô đã có chữ thì nối thêm dòng mới, không ghi đè", () => {
  assert.equal(chenMauCau("Tỉnh táo", ["Niêm mạc hồng"]), "Tỉnh táo\n- Niêm mạc hồng");
  assert.equal(chenMauCau("Tỉnh táo\n", ["Niêm mạc hồng"]), "Tỉnh táo\n- Niêm mạc hồng");
  assert.equal(chenMauCau("Tỉnh táo", []), "Tỉnh táo");
});

const gia = (values: Record<string, string>) => (id: string) => ({ value: values[id] ?? "" });

test("dongChanDoanIn: chỉ có ban đầu thì đúng một dòng", () => {
  const rows = dongChanDoanIn(gia({ icd_ban_dau: "I10", mo_ta_ban_dau: "Tăng huyết áp" }), (ma) => ma);
  assert.deepEqual(rows, [{ nhan: "Chẩn đoán ban đầu", noiDung: "I10. Tăng huyết áp" }]);
});

test("dongChanDoanIn: có cả hai thì in riêng hai dòng, ban đầu trước", () => {
  const rows = dongChanDoanIn(gia({ mo_ta_ban_dau: "Đau ngực", icd_ra_vien: "I20", mo_ta_ra_vien: "Đau thắt ngực" }), (ma) => ma);
  assert.deepEqual(rows.map((row) => row.nhan), ["Chẩn đoán ban đầu", "Chẩn đoán ra viện"]);
  assert.equal(rows[1].noiDung, "I20. Đau thắt ngực");
});

test("dongChanDoanIn: trống cả hai thì không có dòng nào", () => {
  assert.deepEqual(dongChanDoanIn(gia({}), (ma) => ma), []);
});

import { ghepAiKhongGhiDe } from "./ghep-ai";

test("ghep_ai: ô AI rỗng không ghi đè giá trị bác sĩ đã gõ", () => {
  const ra = ghepAiKhongGhiDe(
    { di_ung: { value: "Không", nguon: "bs" }, benh_su: { value: "", nguon: null } },
    { di_ung: { value: "", nguon: null }, benh_su: { value: "Đau ngực", nguon: "ai" } },
  );
  assert.deepEqual(ra.di_ung, { value: "Không", nguon: "bs" });
  assert.equal(ra.benh_su.value, "Đau ngực");
});
