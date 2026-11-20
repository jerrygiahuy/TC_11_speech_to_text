// Tạo bản ghi rỗng, đọc/ghi theo đường dẫn chấm, tính BMI, đổ ví dụ từ config.
import { CAU_HINH_PHIEU, moiTruong } from "./config";
import type { CauHinhPhieu, Cot, DuLieuPhieu, Truong } from "./types";

type Mo = Pick<Truong | Cot, "kieu" | "gia_tri_cho_phep">;

/** Giá trị rỗng theo kiểu: số/chọn 1 là null, chữ là "", chọn nhiều và bảng lặp là [] */
export function giaTriRong(truong: Pick<Truong | Cot, "kieu">): number | string | null | unknown[] {
  switch (truong.kieu) {
    case "so":
    case "chon_1":
      return null;
    case "chon_nhieu":
    case "bang_lap":
      return [];
    default:
      return "";
  }
}

/** Đọc giá trị theo đường dẫn chấm; không có thì undefined */
export function layTheoDuongDan(du_lieu: DuLieuPhieu, duongDan: string): unknown {
  let hienTai: unknown = du_lieu;
  for (const buoc of duongDan.split(".")) {
    if (hienTai === null || typeof hienTai !== "object") return undefined;
    hienTai = (hienTai as Record<string, unknown>)[buoc];
  }
  return hienTai;
}

/** Ghi giá trị theo đường dẫn chấm, tạo object trung gian khi thiếu. Sửa trực tiếp `du_lieu`. */
export function datTheoDuongDan(du_lieu: DuLieuPhieu, duongDan: string, giaTri: unknown): void {
  const buoc = duongDan.split(".");
  let hienTai = du_lieu;
  for (const b of buoc.slice(0, -1)) {
    const tiep = hienTai[b];
    if (tiep === null || typeof tiep !== "object" || Array.isArray(tiep)) hienTai[b] = {};
    hienTai = hienTai[b] as DuLieuPhieu;
  }
  hienTai[buoc[buoc.length - 1]] = giaTri;
}

/** Bản ghi rỗng: mọi khóa (kể cả khóa con huyết áp) đều có mặt */
export function taoBanGhiRong(cauHinh: CauHinhPhieu = CAU_HINH_PHIEU): DuLieuPhieu {
  const du_lieu: DuLieuPhieu = {};
  for (const t of moiTruong(cauHinh)) {
    datTheoDuongDan(du_lieu, t.khoa, giaTriRong(t));
    for (const con of t.khoa_con ?? []) datTheoDuongDan(du_lieu, con, null);
  }
  return du_lieu;
}

/** Bản sao sâu (dữ liệu chỉ gồm JSON) */
export function saoChep<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** BMI = cân nặng / (chiều cao m)^2, làm tròn 2 chữ số; thiếu hoặc không hợp lệ thì null */
export function tinhBmi(chieuCaoCm: unknown, canNangKg: unknown): number | null {
  if (typeof chieuCaoCm !== "number" || typeof canNangKg !== "number") return null;
  if (!(chieuCaoCm > 0) || !(canNangKg > 0)) return null;
  const m = chieuCaoCm / 100;
  return Math.round((canNangKg / (m * m)) * 100) / 100;
}

/** Tách "135/80" thành hai số; sai dạng thì cả hai null */
export function tachHuyetAp(chuoi: string): { tamThu: number | null; tamTruong: number | null } {
  const kq = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(chuoi);
  return kq ? { tamThu: Number(kq[1]), tamTruong: Number(kq[2]) } : { tamThu: null, tamTruong: null };
}

// Ví dụ trong Excel có chỗ là chú thích trong ngoặc, vd "(tên đăng nhập)": không phải giá trị
const LA_CHU_THICH = (s: string) => /^\([\s\S]*\)$/.test(s.trim());

function viDuChoMotO(t: Mo & { vi_du?: string }): unknown {
  const vd = t.vi_du;
  const rong = giaTriRong(t);
  if (vd === undefined || LA_CHU_THICH(vd)) return rong;
  const cho = t.gia_tri_cho_phep;
  switch (t.kieu) {
    case "so": {
      const n = Number(vd.replace(",", "."));
      return vd.trim() !== "" && Number.isFinite(n) ? n : null;
    }
    case "chon_1":
      if (cho) return cho.includes(vd) ? vd : null;
      return vd.trim() === "" ? null : vd;
    case "chon_nhieu": {
      const phan = vd.split(";").map((s) => s.trim()).filter(Boolean);
      return cho ? phan.filter((p) => cho.includes(p)) : phan;
    }
    default:
      return vd;
  }
}

/** Bản "điền ví dụ": đổ `vi_du` của config vào các trường, chỉ giá trị hợp lệ; bảng lặp có 1 dòng ví dụ */
export function taoBanGhiViDu(cauHinh: CauHinhPhieu = CAU_HINH_PHIEU): DuLieuPhieu {
  const du_lieu = taoBanGhiRong(cauHinh);
  for (const t of moiTruong(cauHinh)) {
    if (t.kieu === "bang_lap") {
      const dong: Record<string, unknown> = {};
      for (const c of t.cot ?? []) dong[c.khoa] = viDuChoMotO(c);
      const coGiaTri = (t.cot ?? []).some((c) => dong[c.khoa] !== giaTriRong(c) && !(Array.isArray(dong[c.khoa]) && (dong[c.khoa] as unknown[]).length === 0));
      datTheoDuongDan(du_lieu, t.khoa, coGiaTri ? [dong] : []);
      continue;
    }
    datTheoDuongDan(du_lieu, t.khoa, viDuChoMotO(t));
    if (t.khoa === "huyet_ap" && typeof t.vi_du === "string") {
      const { tamThu, tamTruong } = tachHuyetAp(t.vi_du);
      const [a, b] = t.khoa_con ?? [];
      if (a) datTheoDuongDan(du_lieu, a, tamThu);
      if (b) datTheoDuongDan(du_lieu, b, tamTruong);
    }
  }
  return du_lieu;
}
