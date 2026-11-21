// Mock gợi ý ICD10: chấm điểm theo từ khóa trong bệnh sử và khám lâm sàng.
import { normalizeVi } from "../normalize";
import { chiaVe, timTuKhoa } from "./khop";
import { TIEN_TO_TOM_TAT } from "./tom-tat";
import type { Icd10, QuyTacAi } from "./types";

export interface GoiYIcd {
  item: Icd10;
  /** Từ 0 đến 1, chỉ là điểm khớp từ khóa, không phải xác suất bệnh */
  tinCay: number;
  khop: string[];
}

/** Bỏ chỗ trống [a|b] chưa chọn và đoạn tóm tắt lịch sử: chỉ tính dữ kiện của lần khám này */
export function lamSachNoiDung(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(TIEN_TO_TOM_TAT))
    .join("\n")
    .replace(/\[[^\]]*\]/g, " ");
}

export function goiYIcd(text: string, icd10: Icd10[], quyTac: QuyTacAi, loaiTru: string[] = []): GoiYIcd[] {
  const { icd, phu_dinh: phuDinh } = quyTac;
  const cacVe = chiaVe(lamSachNoiDung(text), phuDinh);
  return icd10
    .filter((item) => !loaiTru.includes(item.ma))
    .map((item) => {
      const manh = timTuKhoa(cacVe, item.manh, phuDinh);
      const vua = timTuKhoa(cacVe, item.vua, phuDinh);
      const diem = manh.length * icd.diem_manh + vua.length * icd.diem_vua;
      return { item, tinCay: Math.min(diem / (diem + icd.he_so), icd.tran_tin_cay), khop: [...manh, ...vua] };
    })
    .filter((goiY) => goiY.khop.length > 0 && goiY.tinCay >= icd.nguong_tin_cay)
    .sort((a, b) => b.tinCay - a.tinCay)
    .slice(0, icd.so_goi_y);
}

/** Mã ICD10 có tên trùng khít (bỏ dấu, không phân biệt hoa thường); dùng cho phiếu mẫu, không có thì trả "" */
export function maIcdTheoTen(ten: string, icd10: Icd10[]): string {
  const can = normalizeVi(ten);
  return icd10.find((item) => normalizeVi(item.ten) === can)?.ma ?? "";
}
