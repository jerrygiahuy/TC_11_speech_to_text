// Kiểm tra dữ liệu data/eform/phieu-mau.json: mỗi mẫu tra được mã ICD10, mọi chỉ định và thuốc khớp chắc danh mục.
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeVi } from "@/shared/normalize";
import type { Values } from "@/shared/types";
import { loadIcd10 } from "./danh-muc";
import { loadPhieuMau, loadPhieuMauGoc, timMauGoc } from "./phieu-mau";

const SO_MAU = 10;
const O_PHIEU = [
  "ly_do_kham",
  "benh_su",
  "kham_toan_than",
  "kham_tim_mach_ho_hap",
  "chan_doan_chinh",
  "huong_dieu_tri",
  "loi_dan",
  "hen_tai_kham",
];
const TRUONG_SO = ["so_luong", "so_lan_ngay", "so_ngay"];
const TRUONG_MA = ["ma_dich_vu", "ma_thuoc", "tong_so_luong"];

const goc = loadPhieuMauGoc();
const daKhop = loadPhieuMau();

test(`có đúng ${SO_MAU} mẫu, id không trùng`, () => {
  assert.equal(goc.length, SO_MAU, `có ${goc.length} mẫu`);
  assert.equal(new Set(goc.map((m) => m.id)).size, goc.length);
});

test("mọi icd_ten có trong icd10.json (khớp đúng tên)", () => {
  const tenIcd = new Set(loadIcd10().map((item) => item.ten));
  assert.deepEqual(goc.filter((m) => !tenIcd.has(m.icd_ten)).map((m) => `${m.id}: "${m.icd_ten}"`), []);
});

test("mỗi mẫu gắn mock: true", () => {
  assert.deepEqual(goc.filter((m) => (m as { mock?: unknown }).mock !== true).map((m) => m.id), []);
});

test("tìm mẫu gốc theo id", () => {
  assert.equal(timMauGoc(goc[0].id)?.ten, goc[0].ten);
  assert.equal(timMauGoc("khong-co"), undefined);
});

test("mỗi mẫu tra được mã ICD10 từ icd_ten", () => {
  const thieu = daKhop.filter((m) => !m.icd).map((m) => `${m.id}: "${goc.find((g) => g.id === m.id)?.icd_ten}"`);
  assert.deepEqual(thieu, []);
});

test("mỗi chỉ định và thuốc khớp chắc danh mục", () => {
  const loi: string[] = [];
  for (const mau of daKhop) {
    for (const [form, cot] of [["chi_dinh", "ten_dich_vu"], ["ke_don", "ten_thuoc"]] as const) {
      const rows = mau.ketQua.draft[form] as Values[];
      (mau.ketQua.matches[form] ?? []).forEach((khop, i) => {
        if (khop.status !== "khop") loi.push(`${mau.id} › ${rows[i][cot]}: ${khop.status}`);
      });
    }
  }
  assert.deepEqual(loi, []);
});

test("đủ 8 ô phiếu khám, khám bộ phận khác; khám tim phổi không nằm ở khám chuyên khoa; không kèm chỉ định (02)", () => {
  const loi: string[] = [];
  for (const mau of goc) {
    const pk = (mau.nhap.phieu_kham ?? {}) as Values;
    for (const o of O_PHIEU) if (!String(pk[o] ?? "").trim()) loi.push(`${mau.id} thiếu ${o}`);
    if (!mau.kham_khac.trim()) loi.push(`${mau.id} thiếu kham_khac`);
    // 02: khám tim phổi thuộc ô Khám tim mạch, hô hấp; ca mẫu không có chỉ định nên phiếu mẫu cũng không điền chỉ định.
    if (String(pk.kham_chuyen_khoa ?? "").trim()) loi.push(`${mau.id} đặt khám tim phổi vào kham_chuyen_khoa`);
    if (((mau.nhap.chi_dinh as Values[] | undefined) ?? []).length > 0) loi.push(`${mau.id} có chỉ định, expected theo 02 để rỗng`);
  }
  assert.deepEqual(loi, []);
});

test("tên gọi không trùng giữa các mẫu", () => {
  const cuaAi = new Map<string, string>();
  const trung: string[] = [];
  for (const mau of goc) {
    for (const ten of new Set([mau.ten, ...mau.bi_danh].map(normalizeVi))) {
      const da = cuaAi.get(ten);
      if (da && da !== mau.id) trung.push(`"${ten}": ${da}, ${mau.id}`);
      cuaAi.set(ten, mau.id);
    }
  }
  assert.deepEqual(trung, []);
});

test("trường số không có chỗ trống, mẫu không chứa trường mã", () => {
  const loi: string[] = [];
  for (const mau of goc) {
    const rows = [...((mau.nhap.chi_dinh as Values[]) ?? []), ...((mau.nhap.ke_don as Values[]) ?? [])];
    for (const row of rows) {
      for (const k of TRUONG_SO) if (row[k] !== undefined && row[k] !== null && typeof row[k] !== "number") loi.push(`${mau.id} › ${k}`);
      for (const k of TRUONG_MA) if (k in row) loi.push(`${mau.id} có ${k}`);
    }
  }
  assert.deepEqual(loi, []);
});
