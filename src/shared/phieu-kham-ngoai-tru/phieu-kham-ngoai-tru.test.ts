// Kiểm tra bản ghi rỗng, bản ví dụ và schema của phiếu khám ngoại trú (Tim mạch).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CAU_HINH_PHIEU, moiTruong } from "./config";
import { datTheoDuongDan, layTheoDuongDan, saoChep, taoBanGhiRong, taoBanGhiViDu, tinhBmi } from "./du-lieu";
import { kiemTraPhieu } from "./schema";

test("config có đủ 49 trường gốc", () => {
  assert.equal(moiTruong().length, 49);
});

test("bản ghi rỗng có mọi khóa, kể cả khóa lồng và khóa con huyết áp", () => {
  const rong = taoBanGhiRong();
  for (const t of moiTruong()) {
    assert.notEqual(layTheoDuongDan(rong, t.khoa), undefined, `thiếu ${t.khoa}`);
    for (const con of t.khoa_con ?? []) assert.equal(layTheoDuongDan(rong, con), null, `thiếu ${con}`);
  }
  assert.equal(rong.huyet_ap, "");
  assert.equal(rong.huyet_ap_tam_thu, null);
  assert.equal(rong.mach, null);
  assert.deepEqual(rong.chan_doan_kem_theo, []);
  assert.equal(layTheoDuongDan(rong, "chan_doan_ban_dau.ma_icd10"), null);
  assert.equal(layTheoDuongDan(rong, "thong_tin_khac.chuyen_noi_soi"), null);
});

test("get/set theo đường dẫn chấm", () => {
  const d: Record<string, unknown> = {};
  datTheoDuongDan(d, "a.b.c", 5);
  assert.deepEqual(d, { a: { b: { c: 5 } } });
  assert.equal(layTheoDuongDan(d, "a.b.c"), 5);
  assert.equal(layTheoDuongDan(d, "a.x.c"), undefined);
});

test("schema nhận bản rỗng và bản điền ví dụ", () => {
  const rong = kiemTraPhieu(taoBanGhiRong());
  assert.ok(rong.ok, rong.ok ? "" : rong.loi);
  const viDu = kiemTraPhieu(taoBanGhiViDu());
  assert.ok(viDu.ok, viDu.ok ? "" : viDu.loi);
});

test("bản ví dụ có huyết áp tách số và bảng lặp có dòng", () => {
  const d = taoBanGhiViDu();
  assert.equal(d.huyet_ap, "135/80");
  assert.equal(d.huyet_ap_tam_thu, 135);
  assert.equal(d.huyet_ap_tam_truong, 80);
  assert.ok(Array.isArray(d.lich_su_thuoc) && d.lich_su_thuoc.length === 1);
  assert.equal(d.noi_gioi_thieu, "Tự đến");
  assert.equal(d.mach, 80);
});

test("schema từ chối chon_1 ngoài danh sách, số là chuỗi, khóa lạ, thiếu khóa, bảng sai cột", () => {
  const sai = (sua: (d: Record<string, unknown>) => void) => {
    const d = saoChep(taoBanGhiRong());
    sua(d);
    assert.equal(kiemTraPhieu(d).ok, false);
  };
  sai((d) => (d.noi_gioi_thieu = "Khác"));
  sai((d) => (d.mach = "80"));
  sai((d) => (d.khong_co = 1));
  sai((d) => delete d.benh_su);
  sai((d) => (d.mau_cau_da_chon = ["câu lạ"]));
  sai((d) => (d.thuoc_dang_dung = [{ ten_thuoc: "x" }]));
  sai((d) => (d.benh_su = "x".repeat(20001)));
  sai((d) => datTheoDuongDan(d, "thong_tin_khac.xac_nhan_benh_tat", "Có thể"));
  const ok = saoChep(taoBanGhiRong());
  ok.noi_gioi_thieu = "Cơ quan y tế";
  assert.ok(kiemTraPhieu(ok).ok);
});

test("tính BMI 2 chữ số thập phân", () => {
  assert.equal(tinhBmi(158, 58.5), 23.43);
  assert.equal(tinhBmi(null, 58), null);
  assert.equal(tinhBmi(0, 58), null);
});

test("config không bị đổi bởi taoBanGhiViDu", () => {
  const truoc = JSON.stringify(CAU_HINH_PHIEU);
  taoBanGhiViDu();
  assert.equal(JSON.stringify(CAU_HINH_PHIEU), truoc);
});
