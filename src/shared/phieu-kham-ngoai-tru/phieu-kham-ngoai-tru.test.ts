// Kiểm tra config của phiếu khám ngoại trú (Tim mạch): nguồn danh sách trường cho excelKeys.
import assert from "node:assert/strict";
import { test } from "node:test";
import { moiTruong } from "./config";

test("config có đủ 49 trường gốc", () => {
  assert.equal(moiTruong().length, 49);
});
