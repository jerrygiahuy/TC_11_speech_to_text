import assert from "node:assert/strict";
import { test } from "node:test";
import type { Draft } from "@/shared/types";
import { buildUserPrompt } from "./prompt";

const MAU: Draft = { phieu_kham: { benh_su: "Đau tai [phải|trái] [số] ngày" }, chi_dinh: [], ke_don: [] };

test("không có mẫu thì prompt như cũ", () => {
  assert.equal(buildUserPrompt("abc"), "<tom_tat>\nabc\n</tom_tat>");
});

test("có mẫu thì kèm <phieu_mau> và JSON mẫu", () => {
  const prompt = buildUserPrompt("tai T, 3n", undefined, MAU);
  assert.ok(prompt.startsWith("<tom_tat>\ntai T, 3n\n</tom_tat>"));
  assert.ok(prompt.includes(`<phieu_mau>\n${JSON.stringify(MAU)}\n</phieu_mau>`));
  assert.ok(prompt.includes("giữ nguyên cả ngoặc"));
});

test("lỗi lần trước vẫn được nối khi có mẫu", () => {
  assert.ok(buildUserPrompt("x", "thiếu trường", MAU).includes("Lần trả lời trước không hợp lệ (thiếu trường)"));
});
