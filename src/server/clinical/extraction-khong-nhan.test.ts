import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { Transcript } from "@/shared/clinical/types";
import { mockClinicalExtraction, validateClinicalExtraction } from "./extraction";

type Vai = Transcript["segments"][number]["vai_tro"];
const hoiThoai = (vai: Vai, text: string): Transcript => ({
  schema_version: "1.1.0", request_id: randomUUID(), transcript_id: randomUUID(), revision: 1, language: "vi",
  privacy: { trang_thai: "passed", policy_version: "test", processed_at: "2026-11-19T09:00:00+07:00" },
  context: { tuoi_thang: null, gioi_tinh: null, can_nang_kg: null },
  segments: [{ id: "s1", sequence: 1, utterance_ref: null, speaker_id: null, vai_tro: vai, nguon_vai_tro: "bac_si_gan", start_ms: null, end_ms: null, text, is_final: true }],
});
const CUT = /(?:có|nên|và|là|vì|mà|thì|nhưng)$/u;

test("khong_nhan_loi_benh_nhan_khong_bi_cat_ngang_o_cum_chi_bac_si_noi", () => {
  const cau = "đau ngực từ hôm qua, bác sĩ ở viện khác có chẩn đoán trước đây là hẹp mạch vành và tôi lo";
  const out = mockClinicalExtraction(hoiThoai("benh_nhan", cau));
  for (const value of [out.phieu_kham.ly_do_kham, out.phieu_kham.benh_su]) assert.ok(value === null || value === cau, `${value}`);
  assert.equal(out.phieu_kham.chan_doan.length, 0);
});

test("khong_nhan_khong_de_mau_cut_ket_thuc_bang_tu_noi", () => {
  const out = mockClinicalExtraction(hoiThoai("benh_nhan", "tôi đau ngực nên tôi uống paracetamol 500 mg"));
  for (const value of [out.phieu_kham.ly_do_kham, out.phieu_kham.benh_su]) assert.ok(value === null || !CUT.test(value), `${value}`);
});

test("khong_nhan_duoi_ket_qua_cua_benh_nhan_khong_bi_bo_im_lang", () => {
  const cau = "tôi hay hồi hộp, kết quả xét nghiệm lần trước bình thường, không đau ngực";
  const out = mockClinicalExtraction(hoiThoai("benh_nhan", cau));
  assert.equal(out.phieu_kham.ghi_chu_ket_qua, null);
  const giu = out.phieu_kham.benh_su ?? "";
  assert.ok(giu.includes("kết quả xét nghiệm lần trước bình thường"), giu);
  validateClinicalExtraction(out, hoiThoai("benh_nhan", cau));
});

test("khong_nhan_bac_si_van_cat_o_moi_cum", () => {
  const out = mockClinicalExtraction(hoiThoai("bac_si", "khám tim phổi mạch đều chẩn đoán tăng huyết áp hẹn tái khám sau 7 ngày"), { thoi_gian_kham: "2026-11-19T09:00" });
  assert.equal(out.phieu_kham.kham_tim_mach_ho_hap, "mạch đều");
  assert.equal(out.phieu_kham.chan_doan[0]?.mo_ta, "tăng huyết áp");
  assert.equal(out.phieu_kham.hen_tai_kham.ngay_cu_the, "2026-11-26");
});
