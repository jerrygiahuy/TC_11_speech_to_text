// Kiểm tra lưu/đọc phiếu khám ngoại trú ra file JSON: lưu rồi đọc lại phải khớp từng trường.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { moiTruong } from "@/shared/phieu-kham-ngoai-tru/config";
import { layTheoDuongDan, saoChep, taoBanGhiRong, taoBanGhiViDu } from "@/shared/phieu-kham-ngoai-tru/du-lieu";
import { kiemTraPhieu } from "@/shared/phieu-kham-ngoai-tru/schema";
import { capNhatPhieu, docPhieu, lietKePhieu, taoPhieu, xoaPhieu } from "./store";

const thuMucTam = () => fs.mkdtempSync(path.join(os.tmpdir(), "phieu-kham-"));

test("lưu rồi đọc lại khớp 100% từng trường (bản ví dụ), cả trên đĩa", () => {
  const dir = thuMucTam();
  const goc = taoBanGhiViDu();
  const luu = taoPhieu(goc, dir);
  const doc = docPhieu(luu.id, dir);
  assert.ok(doc);
  assert.deepEqual(doc.du_lieu, goc);
  for (const t of moiTruong()) {
    assert.deepEqual(layTheoDuongDan(doc.du_lieu, t.khoa), layTheoDuongDan(goc, t.khoa), t.khoa);
    for (const con of t.khoa_con ?? []) assert.deepEqual(layTheoDuongDan(doc.du_lieu, con), layTheoDuongDan(goc, con), con);
  }
  const tuDia = JSON.parse(fs.readFileSync(path.join(dir, `${luu.id}.json`), "utf8"));
  assert.deepEqual(tuDia.du_lieu, goc);
  assert.deepEqual(Object.keys(tuDia).sort(), ["cap_nhat_luc", "du_lieu", "id", "phien_ban_config", "tao_luc"]);
  assert.ok(kiemTraPhieu(doc.du_lieu).ok);
  assert.deepEqual(fs.readdirSync(dir), [`${luu.id}.json`], "không để file tạm");
});

test("bản rỗng và cập nhật: PUT thay toàn bộ du_lieu, giữ id và tao_luc", () => {
  const dir = thuMucTam();
  const luu = taoPhieu(taoBanGhiRong(), dir);
  assert.deepEqual(docPhieu(luu.id, dir)?.du_lieu, taoBanGhiRong());
  const moi = saoChep(taoBanGhiViDu());
  moi.ly_do_kham = "Đã sửa";
  const capNhat = capNhatPhieu(luu.id, moi, dir);
  assert.ok(capNhat);
  assert.equal(capNhat.id, luu.id);
  assert.equal(capNhat.tao_luc, luu.tao_luc);
  assert.equal(docPhieu(luu.id, dir)?.du_lieu.ly_do_kham, "Đã sửa");
  assert.equal(capNhatPhieu("00000000-0000-4000-8000-000000000000", moi, dir), null);
});

test("liệt kê tóm tắt và xóa", () => {
  const dir = thuMucTam();
  const d = taoBanGhiViDu();
  const a = taoPhieu(d, dir);
  fs.writeFileSync(path.join(dir, "hong.json"), "{");
  const ds = lietKePhieu(dir);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].id, a.id);
  assert.equal(ds[0].ly_do_kham, d.ly_do_kham);
  assert.equal(ds[0].chan_doan_ban_dau_mo_ta, (d.chan_doan_ban_dau as { mo_ta: string }).mo_ta);
  assert.equal(xoaPhieu(a.id, dir), true);
  assert.equal(docPhieu(a.id, dir), null);
  assert.equal(xoaPhieu(a.id, dir), false);
});

test("id không phải UUID bị từ chối (chặn path traversal)", () => {
  const dir = thuMucTam();
  for (const id of ["../x", "..%2Fx", "abc", "", "../../etc/passwd", "00000000-0000-4000-8000-000000000000/../x"]) {
    assert.throws(() => docPhieu(id, dir), /không hợp lệ/);
    assert.throws(() => capNhatPhieu(id, {}, dir), /không hợp lệ/);
    assert.throws(() => xoaPhieu(id, dir), /không hợp lệ/);
  }
});
