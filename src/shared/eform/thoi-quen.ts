// Gợi ý theo thói quen của từng bác sĩ: các đơn và chỉ định bác sĩ đã Lưu trước đây, gom theo mã ICD10 chính.
// Server lưu ở data/thoi-quen/<tài khoản>.json (src/server/du-lieu/thoi-quen.ts); ở đây chỉ gom và xếp.
import type { CatalogItem } from "../types";
import type { DongChiDinh, DongThuoc } from "./dien-phieu";
import { chonBoMau, type MauGoiY } from "./goi-y";

type CotChiDinh = Pick<DongChiDinh, "ma" | "ten" | "so_luong" | "ghi_chu">;
type CotThuoc = Pick<
  DongThuoc,
  "ma" | "ten" | "ham_luong" | "duong_dung" | "lieu_moi_lan" | "so_lan_ngay" | "thoi_diem" | "so_ngay" | "ghi_chu"
>;

/** Một lần bác sĩ bấm Lưu: chẩn đoán chính và những gì đã chỉ định, kê */
export interface DonDaKe {
  /** Một lượt mở phiếu là một id; Lưu nhiều lần trong lượt đó thì ghi đè, không đếm thêm */
  id: string;
  thoi_diem: string;
  icd_chinh: string;
  chi_dinh: CotChiDinh[];
  don_thuoc: CotThuoc[];
  loi_dan: string;
}

export const COT_CHI_DINH: (keyof CotChiDinh)[] = ["ma", "ten", "so_luong", "ghi_chu"];
export const COT_THUOC: (keyof CotThuoc)[] = [
  "ma", "ten", "ham_luong", "duong_dung", "lieu_moi_lan", "so_lan_ngay", "thoi_diem", "so_ngay", "ghi_chu",
];

/** Bỏ các cột chỉ dùng trên giao diện (nguồn, ứng viên) trước khi gửi lên lưu */
export function chiGiuCot<T extends object, K extends keyof T>(row: T, cot: K[]): Pick<T, K> {
  return Object.fromEntries(cot.map((k) => [k, row[k]])) as Pick<T, K>;
}

const khoa = (row: { ma: string; ten: string }) => row.ma || row.ten.toLowerCase();

/** Gom các dòng qua nhiều lần kê: đếm số lần, lấy liều của lần gần nhất, xếp dòng hay kê lên trước */
function gom<T extends { ma: string; ten: string }>(cacLan: T[][]): { dong: T[]; soLan: Map<string, number> } {
  const soLan = new Map<string, number>();
  const ganNhat = new Map<string, T>();
  for (const lan of cacLan) {
    for (const row of lan) {
      const k = khoa(row);
      soLan.set(k, (soLan.get(k) ?? 0) + 1);
      if (!ganNhat.has(k)) ganNhat.set(k, row);
    }
  }
  const dong = [...ganNhat.values()].sort((a, b) => (soLan.get(khoa(b)) ?? 0) - (soLan.get(khoa(a)) ?? 0));
  return { dong, soLan };
}

/** Mã đã lưu chỉ giữ khi còn trong danh mục hiện tại; mất mã thì dòng phải xem lại */
function kiemMa(ma: string, danhMuc: CatalogItem[]): { ma: string; nguon: "ai" | "xem" } {
  return ma && danhMuc.some((item) => item.ma === ma) ? { ma, nguon: "ai" } : { ma: "", nguon: "xem" };
}

/**
 * Với mỗi mã ICD đang chọn (theo thứ tự trên phiếu), gom các lần bác sĩ này đã kê cho cùng chẩn đoán chính
 * thành một nhóm gợi ý, đặt trên bộ mẫu chung.
 */
export function goiYThoiQuen(
  maIcd: string[],
  lichSu: DonDaKe[],
  danhMuc: { dichVu: CatalogItem[]; thuoc: CatalogItem[] },
): MauGoiY[] {
  const moiTruoc = lichSu.toSorted((a, b) => b.thoi_diem.localeCompare(a.thoi_diem));
  return maIcd.flatMap((ma) => {
    const cacLan = moiTruoc.filter((don) => don.icd_chinh === ma);
    if (cacLan.length === 0) return [];
    const chiDinh = gom(cacLan.map((don) => don.chi_dinh));
    const thuoc = gom(cacLan.map((don) => don.don_thuoc));
    const soLan = Object.fromEntries([...chiDinh.soLan, ...thuoc.soLan]);
    return [
      {
        id: `thoi-quen:${ma}`,
        ten: "Đơn anh/chị đã kê",
        icd: [ma],
        cuaToi: { tongLan: cacLan.length, soLan },
        loiDan: cacLan.find((don) => don.loi_dan)?.loi_dan ?? "",
        chiDinh: chiDinh.dong.map((row) => ({ ...row, ...kiemMa(row.ma, danhMuc.dichVu), ung_vien: [] })),
        donThuoc: thuoc.dong.map((row) => ({ ...row, ...kiemMa(row.ma, danhMuc.thuoc), ung_vien: [] })),
      },
    ];
  });
}

/** Số lần đã kê một dòng trong nhóm thói quen, dạng "2/3 lần"; không phải nhóm thói quen thì rỗng */
export function soLanDaKe(mau: MauGoiY, row: { ma: string; ten: string }): string {
  if (!mau.cuaToi) return "";
  return `${mau.cuaToi.soLan[khoa(row)] ?? 0}/${mau.cuaToi.tongLan} lần`;
}

/** Dòng kê từ một nửa số lần trở lên thì tích sẵn */
export function hayKe(mau: MauGoiY, row: { ma: string; ten: string }): boolean {
  if (!mau.cuaToi) return false;
  return (mau.cuaToi.soLan[khoa(row)] ?? 0) * 2 >= mau.cuaToi.tongLan;
}

/** Toàn bộ gợi ý cho các mã ICD đang chọn: đơn bác sĩ đã kê trước, rồi bộ mẫu chung */
export function ghepGoiY(
  maIcd: string[],
  data: { goiY: MauGoiY[]; thoiQuen: DonDaKe[]; danhMuc: { dichVu: CatalogItem[]; thuoc: CatalogItem[] } },
): { ma: string; mau: MauGoiY }[] {
  return [
    ...goiYThoiQuen(maIcd, data.thoiQuen, data.danhMuc).map((mau) => ({ ma: mau.icd[0], mau })),
    ...chonBoMau(maIcd, data.goiY),
  ];
}

/** Câu có "kê như mọi khi", "như lần trước", "đơn quen"… thì lấy bộ thuốc, chỉ định hay kê cho chẩn đoán chính */
const LENH_NHU_MOI_KHI = /như (mọi khi|mọi lần|lần trước|thường lệ|thường lần|cũ)|đơn quen|bộ quen/iu;

export function nhuMoiKhi(text: string): boolean {
  return LENH_NHU_MOI_KHI.test(text.normalize("NFC"));
}
