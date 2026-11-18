// Gọi phiếu mẫu kèm chi tiết ở chế độ mock: thay chỗ trống bằng quy tắc, rồi khớp danh mục như mọi nháp.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadCases, loadCatalogs, loadForms, loadRules, loadVietTat } from "@/server/du-lieu/config";
import type { Draft, Values } from "@/shared/types";
import { runPipeline } from "./pipeline";

const ctx = { forms: loadForms(), catalogs: loadCatalogs(), vietTat: loadVietTat(), rules: loadRules(), cases: loadCases() };
const MAU: Draft = {
  phieu_kham: { benh_su: "Đau tai [phải|trái|2 bên] [số] ngày, sốt [số] độ", loi_dan: "Giữ khô tai" },
  chi_dinh: [{ ten_dich_vu: "Nội soi tai", so_luong: 1 }],
  ke_don: [{ ten_thuoc: "Paracetamol", ham_luong: "500 mg", duong_dung: "Uống", lieu_moi_lan: "1 viên", so_lan_ngay: 3, so_ngay: 3 }],
};

test("mock thay chỗ trống theo chi tiết và vẫn khớp mã", async () => {
  const kq = await runPipeline("tai T, 3n, sốt 38,5", ctx, { provider: "mock", mau: MAU });
  const pk = kq.draft.phieu_kham as Values;
  assert.equal(pk.benh_su, "Đau tai trái 3 ngày, sốt 38,5 độ");
  assert.equal(pk.loi_dan, "Giữ khô tai");
  assert.equal((kq.draft.chi_dinh as Values[])[0].ma_dich_vu, "DV-TMH-003");
  assert.equal((kq.draft.ke_don as Values[])[0].tong_so_luong, 9);
});

test("chi tiết không hiểu thì giữ nguyên chỗ trống", async () => {
  const kq = await runPipeline("đau nhiều về đêm", ctx, { provider: "mock", mau: MAU });
  assert.equal((kq.draft.phieu_kham as Values).benh_su, "Đau tai [phải|trái|2 bên] [số] ngày, sốt [số] độ");
});

test("mẫu gốc không bị sửa", async () => {
  await runPipeline("tai P, 5n", ctx, { provider: "mock", mau: MAU });
  assert.equal((MAU.phieu_kham as Values).benh_su, "Đau tai [phải|trái|2 bên] [số] ngày, sốt [số] độ");
});
