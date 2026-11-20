// Bộ tách quy tắc với config thật: từ khóa khám tim mạch không được cướp chữ của bệnh sử.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { loadCatalogs, loadForms, loadVietTat } from "@/server/du-lieu/config";
import type { Values } from "@/shared/types";
import { ruleExtract } from "./rules";

const forms = loadForms();
const catalogs = loadCatalogs();
const vietTat = loadVietTat();
const phieu = (text: string) => ruleExtract(text, forms, catalogs, vietTat)["phieu_kham"] as Values;

test("tu_khoa_tim_khong_cuop_benh_su: 'tim đập nhanh' trong bệnh sử không vào ô khám tim mạch", () => {
  const pk = phieu("Bệnh sử: hồi hộp, tim đập nhanh hai tuần.");
  assert.equal(pk.benh_su, "Hồi hộp, tim đập nhanh hai tuần");
  assert.equal(pk.kham_tim_mach_ho_hap ?? null, null);
});

test("tu_khoa_tim_khong_cuop_benh_su: 'Điện tim' cuối bệnh sử vẫn thuộc bệnh sử", () => {
  const pk = phieu("Bệnh sử: khó thở. Điện tim nhịp xoang.");
  assert.equal(pk.benh_su, "Khó thở. Điện tim nhịp xoang");
  assert.equal(pk.kham_tim_mach_ho_hap ?? null, null);
});

test("kham_tim_vao_o_kham_tim_mach_khong_vao_kham_chuyen_khoa", () => {
  const pk = phieu("Khám tim: T1 T2 đều.");
  assert.equal(pk.kham_tim_mach_ho_hap, "T1 T2 đều");
  assert.equal(pk.kham_chuyen_khoa ?? null, null);
  const day = phieu("Khám tim phổi: tiếng tim rõ, phổi trong. Khám chuyên khoa: bụng mềm.");
  assert.equal(day.kham_tim_mach_ho_hap, "Tiếng tim rõ, phổi trong");
  assert.equal(day.kham_chuyen_khoa, "Bụng mềm");
});

test("tien_su_tach_gia_dinh_di_ung_thuoc_sinh_hieu: ca SYN-CARDIO-013", () => {
  const dong = fs.readFileSync("data/cardiology/synthetic-cases.jsonl", "utf8").split("\n").find(row => row.includes('"SYN-CARDIO-013"'));
  const text = JSON.parse(dong!).conversation_text as string;
  const pk = phieu(text);
  assert.ok(String(pk.tien_su).length > 0);
  assert.match(String(pk.tien_su), /lipid/iu);
  for (const tu of ["gia đình", "Dị ứng", "Thuốc đang dùng", "Sinh hiệu", "Atorvastatin", "huyết áp"]) assert.ok(!String(pk.tien_su).includes(tu), `tiền sử bản thân còn "${tu}": ${pk.tien_su}`);
  assert.ok(String(pk.tien_su_gia_dinh).length > 0);
  assert.ok(!/(?:Dị ứng|Thuốc đang dùng|Sinh hiệu)/u.test(String(pk.tien_su_gia_dinh)), String(pk.tien_su_gia_dinh));
  // Điểm dừng không lọt vào bản nháp.
  assert.ok(!Object.keys(pk).some(khoa => khoa.startsWith("diem_dung")));
});
