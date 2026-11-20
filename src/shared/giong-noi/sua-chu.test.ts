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

// Đợt sửa chữ theo phép đo STT với giọng máy đọc (TTS) giả lập, chưa kiểm với giọng bác sĩ thật
const CA_SUA_CHU: [string, string][] = [
  ["lời dạng ghi nhật ký huyết áp", "lời dặn ghi nhật ký huyết áp"],
  ["phổi trong không gian", "phổi trong không ran"],
  ["tiếng t một t hai đều rõ", "tiếng T1 T2 đều rõ"],
  ["tiếng một thứ hai đều rõ", "tiếng T1 T2 đều rõ"],
  ["huyết áp một trăm bốn mươi tám trên tám mươi tám milimet thủy ngânpor hai chín mươi tám phần trăm", "huyết áp 148 trên 88 mmHg SpO2 98%"],
  ["tám mươi tám dạm limet thủy ngân có hai chín mươi tám phần trăm", "88 mmHg SpO2 98%"],
  ["đang uống amloki năm mi lim mỗi ngày", "đang uống Amlodipine 5 mg mỗi ngày"],
  ["đang uống am lô đi pin năm mi li gam", "đang uống Amlodipine 5 mg"],
  ["tôi dị ứng pensylin đang uống", "tôi dị ứng Penicillin đang uống"],
  ["tôi dị ứng pen xi lin", "tôi dị ứng Penicillin"],
  ["trong không gian rộng", "trong không gian rộng"],
  ["tiếng một", "tiếng một"],
  ["có hai con", "có hai con"],
  ["đi lại nhiều", "đi lại nhiều"],
  ["phản ứng pen xi lin", "phản ứng pen xi lin"],
];

test("sua-chu: bảng thật sửa đúng các lỗi thuật ngữ đã đo và không thay nhầm câu thường", () => {
  for (const [vao, ra] of CA_SUA_CHU) assert.equal(suaChu(vao, bang), ra, vao);
});

test("sua-chu: có tên chuẩn Penicillin", () => {
  assert.ok(bang.tu_chuyen_khoa.some((t) => t.dung === "Penicillin"));
});
