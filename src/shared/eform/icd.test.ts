import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { goiYIcd, maIcdTheoTen } from "./icd";
import type { Icd10, QuyTacAi } from "./types";

const docFile = <T>(file: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "data", "eform", file), "utf8")) as T;
const ICD10 = docFile<Icd10[]>("icd10.json");
const QUY_TAC = docFile<QuyTacAi>("quy-tac.json");
const MA_TIM_MACH = ["I10", "R00.2", "R07.4", "R06.0", "E78.5", "Z95.5", "I25.1", "I50.9", "I48.9", "R55", "Z01.8"];

test("bộ ICD10 Tim mạch đúng 11 mã theo mục 3 của 05", () => {
  assert.deepEqual(ICD10.map((item) => item.ma).sort(), [...MA_TIM_MACH].sort());
});
test("mỗi mã có từ khóa mạnh và từ khóa vừa", () => {
  assert.deepEqual(ICD10.filter((item) => item.manh.length === 0 || item.vua.length === 0).map((item) => item.ma), []);
});
test("tăng huyết áp: I10 đứng đầu gợi ý", () => assert.equal(goiYIcd("tái khám tăng huyết áp", ICD10, QUY_TAC)[0]?.item.ma, "I10"));
test("đau họng không có gợi ý trong bộ Tim mạch", () => assert.deepEqual(goiYIcd("đau họng 2 ngày, sốt", ICD10, QUY_TAC), []));
test("tra mã I10 theo tên đầy đủ trong danh mục mock", () =>
  assert.equal(maIcdTheoTen("Bệnh tăng huyết áp vô căn (nguyên phát)", ICD10), "I10"));

const ICD = [
  { ma: "H66.0", ten: "Viêm tai giữa có mủ cấp tính", manh: [], vua: [] },
  { ma: "J02.9", ten: "Viêm họng cấp tính, không xác định", manh: [], vua: [] },
];

test("tra mã theo đúng tên ICD", () => assert.equal(maIcdTheoTen("Viêm tai giữa có mủ cấp tính", ICD), "H66.0"));
test("không dấu, khác hoa thường vẫn tra được", () => assert.equal(maIcdTheoTen("viem hong cap tinh, khong xac dinh", ICD), "J02.9"));
test("tên không có trong danh mục thì trả rỗng", () => assert.equal(maIcdTheoTen("Viêm tai giữa", ICD), ""));
