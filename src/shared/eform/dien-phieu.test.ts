import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import type { Draft } from "../types";
import { dienPhieu, gopTruongMoi } from "./dien-phieu";
import type { EformData, QuyTacAi, Truong } from "./types";

const quyTac = JSON.parse(fs.readFileSync("data/eform/quy-tac.json", "utf8")) as QuyTacAi;
const DATA = { icd10: [], quyTac } as unknown as EformData;
const TRONG: Truong = { value: "", nguon: null };

function getTu(bang: Record<string, Truong>) {
  return (id: string) => bang[id] ?? TRONG;
}

const nhap = (pk: Record<string, string>): Draft => ({ phieu_kham: pk, chi_dinh: [], ke_don: [] });

test("clinical scope does not copy an initial diagnosis to discharge or fill a prescription", () => {
  const draft = { ...nhap({ chan_doan_chinh: "Tăng huyết áp vô căn" }), ke_don: [{ ten_thuoc: "Amlodipine" }], chi_dinh: [{ ten_dich_vu: "Điện tâm đồ", so_luong: null }] };
  const result = dienPhieu(draft, {}, DATA, getTu({}), { clinicalOnly: true });
  assert.equal(result.truong.mo_ta_ban_dau.value, "Tăng huyết áp vô căn");
  assert.equal(result.truong.mo_ta_ra_vien, undefined);
  assert.deepEqual(result.donThuoc, []);
  assert.equal(result.chiDinh[0].so_luong, "");
});

test("chẩn đoán ban đầu không bao giờ chép sang ra viện, kể cả khi không clinicalOnly", () => {
  const kq = dienPhieu(nhap({ chan_doan_chinh: "Tăng huyết áp vô căn" }), {}, DATA, getTu({}), { icd: "I10" });
  assert.equal(kq.truong.mo_ta_ban_dau.value, "Tăng huyết áp vô căn");
  assert.equal(kq.truong.icd_ban_dau.value, "I10");
  assert.equal(kq.truong.mo_ta_ra_vien, undefined);
  assert.equal(kq.truong.icd_ra_vien, undefined);
});

test("chẩn đoán ra viện chỉ lấy từ chan_doan[] có giai_doan ra_vien", () => {
  const draft = { ...nhap({}), chan_doan: [
    { giai_doan: "ban_dau", vai_tro: "chinh", mo_ta: "Đau ngực cần đánh giá" },
    { giai_doan: "ra_vien", vai_tro: "chinh", mo_ta: "Tăng huyết áp vô căn" },
  ] } as unknown as Draft;
  const kq = dienPhieu(draft, {}, DATA, getTu({}), { icd: "I10" });
  assert.equal(kq.truong.mo_ta_ra_vien.value, "Tăng huyết áp vô căn");
  // M1: mã của phiếu mẫu (`tuyChon.icd`) chỉ dành cho ô ban đầu, ô ra viện không mang mã của chẩn đoán khác.
  assert.equal(kq.truong.icd_ra_vien, undefined);
  const chiBanDau = dienPhieu({ ...nhap({}), chan_doan: [{ giai_doan: "ban_dau", vai_tro: "chinh", mo_ta: "Tăng huyết áp" }] } as unknown as Draft, {}, DATA, getTu({}));
  assert.equal(chiBanDau.truong.mo_ta_ra_vien, undefined);
});

test("câu khám tim phổi đi vào kham_tim_mach_ho_hap, không vào khám chuyên khoa", () => {
  const kq = dienPhieu(nhap({ kham_tim_mach_ho_hap: "Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran" }), {}, DATA, getTu({}));
  assert.equal(kq.truong.kham_tim_mach_ho_hap.value, "Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran");
  assert.equal(kq.truong.kham_chuyen_khoa, undefined);
  assert.equal(kq.daDien.find(m => m.id === "kham_tim_mach_ho_hap")?.nhan, "Khám tim mạch, hô hấp");
});

test("chiOTrong giữ ô có dữ liệu cũ", () => {
  const kq = dienPhieu(nhap({ ly_do_kham: "Đau ngực trái" }), {}, DATA, getTu({ ly_do: { value: "Đau ngực", nguon: "cu" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.ly_do, undefined);
  assert.deepEqual(kq.boQua, ["Lý do đến khám"]);
});

test("không chiOTrong thì vẫn ghi đè ô 'cu' như cũ", () => {
  const kq = dienPhieu(nhap({ ly_do_kham: "Đau ngực trái" }), {}, DATA, getTu({ ly_do: { value: "Đau ngực", nguon: "cu" } }));
  assert.equal(kq.truong.ly_do?.value, "Đau ngực trái");
});

test("icd truyền vào thay cho goiYIcd", () => {
  const kq = dienPhieu(nhap({ chan_doan_chinh: "Tăng huyết áp vô căn" }), {}, DATA, getTu({}), { icd: "I10" });
  assert.equal(kq.truong.icd_ra_vien, undefined);
  assert.deepEqual(kq.truong.icd_ban_dau, { value: "I10", nguon: "xem" });
});

test("chỗ trống làm ô thành 'xem'", () => {
  const kq = dienPhieu(nhap({ benh_su: "Đau ngực [khi gắng sức|khi nghỉ] 3 ngày", loi_dan: "Ghi nhật ký huyết áp" }), {}, DATA, getTu({}));
  assert.equal(kq.truong.benh_su?.nguon, "xem");
  assert.equal(kq.truong.loi_dan?.nguon, "ai");
});

test("gọi lần hai chỉ điền ô còn trống", () => {
  const kq = dienPhieu(nhap({ benh_su: "Mẫu mới", loi_dan: "Ghi nhật ký huyết áp" }), {}, DATA, getTu({ benh_su: { value: "Lần trước", nguon: "ai" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.benh_su, undefined);
  assert.equal(kq.truong.loi_dan?.value, "Ghi nhật ký huyết áp");
});

test("hẹn tái khám không còn mặc định Không: ô trống được điền, ô đã có chữ thì giữ", () => {
  const draft = nhap({ hen_tai_kham: "Sau 30 ngày" });
  const tg = { thoi_gian_kham: { value: "2026-11-09T09:15", nguon: "cu" as const } };
  const trong = dienPhieu(draft, {}, DATA, getTu(tg), { chiOTrong: true });
  assert.equal(trong.truong.hen_tai_kham?.value, "Có");
  assert.equal(trong.truong.ngay_tai_kham?.value, "2026-12-09");
  const giu = dienPhieu(draft, {}, DATA, getTu({ ...tg, hen_tai_kham: { value: "Không", nguon: "cu" } }), { chiOTrong: true });
  assert.equal(giu.truong.hen_tai_kham, undefined);
  assert.deepEqual(giu.boQua, ["Hẹn tái khám"]);
});

test("hẹn tái khám bác sĩ đã chọn thì giữ", () => {
  const kq = dienPhieu(nhap({ hen_tai_kham: "Sau 30 ngày" }), {}, DATA, getTu({ hen_tai_kham: { value: "Không", nguon: "bs" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.hen_tai_kham, undefined);
});

test("ô đã đúng giá trị mẫu thì không tính là vừa điền", () => {
  const kq = dienPhieu(nhap({ hen_tai_kham: "Sau 30 ngày" }), {}, DATA, getTu({ hen_tai_kham: { value: "Có", nguon: "ai" }, ngay_tai_kham: { value: "2026-12-09", nguon: "ai" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.hen_tai_kham, undefined);
  assert.deepEqual(kq.daDien.map((m) => m.id), []);
});

test("gopTruongMoi bỏ ô bị sửa trong lúc chờ AI", () => {
  const luc: Record<string, Truong> = { huong_dieu_tri: TRONG, loi_dan: TRONG };
  const bsGo: Truong = { value: "Theo dõi", nguon: "bs" };
  const hienTai = { ...luc, huong_dieu_tri: bsGo };
  const moi = { huong_dieu_tri: { value: "Điều trị nội khoa", nguon: "ai" as const }, loi_dan: { value: "Ghi nhật ký huyết áp", nguon: "ai" as const } };
  const ra = gopTruongMoi(hienTai, luc, moi);
  assert.equal(ra.huong_dieu_tri, bsGo);
  assert.equal(ra.loi_dan.value, "Ghi nhật ký huyết áp");
});
