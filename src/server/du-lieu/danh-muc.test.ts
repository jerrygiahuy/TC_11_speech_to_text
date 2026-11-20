// Kiểm tra danh mục soạn tay Tim mạch (data/catalog/, data/eform/icd10.json): đủ mục theo 05 và đều gắn mock.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadCatalogs, loadIcd10 } from "./danh-muc";

const coMock = (item: object) => (item as { mock?: unknown }).mock === true;
const MA_DICH_VU = Array.from({ length: 10 }, (_, i) => `DV-TM-${String(i + 1).padStart(3, "0")}`);
const MA_ICD = ["I10", "R00.2", "R07.4", "R06.0", "E78.5", "Z95.5", "I25.1", "I50.9", "I48.9", "R55", "Z01.8"];

test("dịch vụ: đúng 10 mục DV-TM-001 đến DV-TM-010, đều mock", () => {
  const dv = loadCatalogs()["dich-vu"] ?? [];
  assert.deepEqual(dv.map((item) => item.ma), MA_DICH_VU);
  assert.deepEqual(dv.filter((item) => !coMock(item)).map((item) => item.ma), []);
});

test("thuốc: đúng 9 thuốc đang dùng của bộ ca, đều mock, không còn thuốc TMH", () => {
  const thuoc = loadCatalogs()["thuoc"] ?? [];
  assert.equal(thuoc.length, 9);
  assert.deepEqual(thuoc.filter((item) => !coMock(item)).map((item) => item.ma), []);
  assert.deepEqual(thuoc.filter((item) => /augmentin|otipax/i.test(item.ten)).map((item) => item.ten), []);
});

test("ICD10: đúng 11 mã theo mục 3 của 05, đều mock", () => {
  const icd = loadIcd10();
  assert.deepEqual(icd.map((item) => item.ma).sort(), [...MA_ICD].sort());
  assert.deepEqual(icd.filter((item) => !coMock(item)).map((item) => item.ma), []);
});
