import assert from "node:assert/strict";
import { test } from "node:test";
import { maIcdTheoTen } from "./icd";

const ICD = [
  { ma: "H66.0", ten: "Viêm tai giữa có mủ cấp tính", manh: [], vua: [] },
  { ma: "J02.9", ten: "Viêm họng cấp tính, không xác định", manh: [], vua: [] },
];

test("tra mã theo đúng tên ICD", () => assert.equal(maIcdTheoTen("Viêm tai giữa có mủ cấp tính", ICD), "H66.0"));
test("không dấu, khác hoa thường vẫn tra được", () => assert.equal(maIcdTheoTen("viem hong cap tinh, khong xac dinh", ICD), "J02.9"));
test("tên không có trong danh mục thì trả rỗng", () => assert.equal(maIcdTheoTen("Viêm tai giữa", ICD), ""));
