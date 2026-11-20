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
  const draft = { ...nhap({ chan_doan_chinh: "Viêm tai giữa" }), ke_don: [{ ten_thuoc: "Thuốc mẫu" }], chi_dinh: [{ ten_dich_vu: "Nội soi tai", so_luong: null }] };
  const result = dienPhieu(draft, {}, DATA, getTu({}), { clinicalOnly: true });
  assert.equal(result.truong.mo_ta_ban_dau.value, "Viêm tai giữa");
  assert.equal(result.truong.mo_ta_ra_vien, undefined);
  assert.deepEqual(result.donThuoc, []);
  assert.equal(result.chiDinh[0].so_luong, "");
});

test("chiOTrong giữ ô có dữ liệu cũ", () => {
  const kq = dienPhieu(nhap({ ly_do_kham: "Đau tai trái" }), {}, DATA, getTu({ ly_do: { value: "Đau tai", nguon: "cu" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.ly_do, undefined);
  assert.deepEqual(kq.boQua, ["Lý do đến khám"]);
});

test("không chiOTrong thì vẫn ghi đè ô 'cu' như cũ", () => {
  const kq = dienPhieu(nhap({ ly_do_kham: "Đau tai trái" }), {}, DATA, getTu({ ly_do: { value: "Đau tai", nguon: "cu" } }));
  assert.equal(kq.truong.ly_do?.value, "Đau tai trái");
});

test("icd truyền vào thay cho goiYIcd", () => {
  const kq = dienPhieu(nhap({ chan_doan_chinh: "Viêm tai giữa cấp tai phải" }), {}, DATA, getTu({}), { icd: "H66.0" });
  assert.deepEqual(kq.truong.icd_ra_vien, { value: "H66.0", nguon: "xem" });
  assert.deepEqual(kq.truong.icd_ban_dau, { value: "H66.0", nguon: "xem" });
});

test("chỗ trống làm ô thành 'xem'", () => {
  const kq = dienPhieu(nhap({ benh_su: "Đau tai [phải|trái] 3 ngày", loi_dan: "Giữ khô tai" }), {}, DATA, getTu({}));
  assert.equal(kq.truong.benh_su?.nguon, "xem");
  assert.equal(kq.truong.loi_dan?.nguon, "ai");
});

test("gọi lần hai chỉ điền ô còn trống", () => {
  const kq = dienPhieu(nhap({ benh_su: "Mẫu mới", loi_dan: "Giữ khô tai" }), {}, DATA, getTu({ benh_su: { value: "Lần trước", nguon: "ai" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.benh_su, undefined);
  assert.equal(kq.truong.loi_dan?.value, "Giữ khô tai");
});

test("hẹn tái khám 'Không' mặc định vẫn được mẫu điền", () => {
  const kq = dienPhieu(
    nhap({ hen_tai_kham: "Sau 7 ngày" }),
    {},
    DATA,
    getTu({ hen_tai_kham: { value: "Không", nguon: "cu" }, thoi_gian_kham: { value: "2026-11-09T09:15", nguon: "cu" } }),
    { chiOTrong: true },
  );
  assert.equal(kq.truong.hen_tai_kham?.value, "Có");
  assert.equal(kq.truong.ngay_tai_kham?.value, "2026-11-16");
});

test("hẹn tái khám bác sĩ đã chọn thì giữ", () => {
  const kq = dienPhieu(nhap({ hen_tai_kham: "Sau 7 ngày" }), {}, DATA, getTu({ hen_tai_kham: { value: "Không", nguon: "bs" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.hen_tai_kham, undefined);
});

test("ô đã đúng giá trị mẫu thì không tính là vừa điền", () => {
  const kq = dienPhieu(nhap({ hen_tai_kham: "Sau 7 ngày" }), {}, DATA, getTu({ hen_tai_kham: { value: "Có", nguon: "ai" }, ngay_tai_kham: { value: "2026-11-16", nguon: "ai" } }), {
    chiOTrong: true,
  });
  assert.equal(kq.truong.hen_tai_kham, undefined);
  assert.deepEqual(kq.daDien.map((m) => m.id), []);
});

test("gopTruongMoi bỏ ô bị sửa trong lúc chờ AI", () => {
  const luc: Record<string, Truong> = { huong_dieu_tri: TRONG, loi_dan: TRONG };
  const bsGo: Truong = { value: "Theo dõi", nguon: "bs" };
  const hienTai = { ...luc, huong_dieu_tri: bsGo };
  const moi = { huong_dieu_tri: { value: "Điều trị nội khoa", nguon: "ai" as const }, loi_dan: { value: "Giữ khô tai", nguon: "ai" as const } };
  const ra = gopTruongMoi(hienTai, luc, moi);
  assert.equal(ra.huong_dieu_tri, bsGo);
  assert.equal(ra.loi_dan.value, "Giữ khô tai");
});
