import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { expandAbbreviations } from "../normalize";
import { suaChu, type BangSuaChu } from "./sua-chu";
import type { VietTat } from "../types";

const docJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "config", file), "utf8")) as T;

const bang = docJson<BangSuaChu>("sua-chu-giong-noi.json");
const vietTat = docJson<VietTat>("viet-tat.json");

// Tên thuốc của bộ ca Tim mạch (handoff/claude/05 mục 5)
const THUOC_BO_CA = ["Amlodipine", "Atorvastatin", "Rosuvastatin", "Aspirin", "Bisoprolol", "Furosemide", "Apixaban", "Losartan"];

test("sua-chu: có tên chuẩn của thuốc trong bộ ca Tim mạch", () => {
  const dung = bang.tu_chuyen_khoa.map((t) => t.dung);
  for (const ten of THUOC_BO_CA) assert.ok(dung.includes(ten), ten);
});

test("sua-chu: dấu hiệu kê đơn có chữ uống", () => {
  assert.ok(bang.dau_hieu_thuoc.includes("uống"));
});

test("sua-chu: sửa đúng tên thuốc Bisoprolol khi bác sĩ đọc", () => {
  assert.equal(suaChu("bệnh nhân đang dùng bi sô prô lôl hai phẩy năm mi li gam", bang), "bệnh nhân đang dùng Bisoprolol 2,5 mg");
});

test("viet-tat: ĐTĐ là đái tháo đường, ECG là điện tâm đồ", () => {
  assert.equal(expandAbbreviations("ĐTĐ", vietTat), "đái tháo đường");
  assert.equal(expandAbbreviations("ECG", vietTat), "điện tâm đồ");
  assert.equal(expandAbbreviations("THA", vietTat), "tăng huyết áp");
  assert.equal(expandAbbreviations("HA", vietTat), "huyết áp");
});

test("viet-tat: khóa viết tắt của Tai Mũi Họng không còn trong config", () => {
  for (const khoa of ["VTG", "VTN", "VMX", "TMH"]) assert.ok(!(khoa in vietTat), khoa);
});
