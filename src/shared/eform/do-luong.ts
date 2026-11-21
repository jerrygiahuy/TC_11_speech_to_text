// Đếm số đo một lượt thử trên trang eForm khi bác sĩ bấm Lưu (gửi lên /api/sessions).
// Chỉ đếm, không lấy nội dung phiếu.
import type { CatalogItem } from "../types";
import type { DongChiDinh, DongThuoc, MucDaDien } from "./dien-phieu";
import { trungDiUng } from "./di-ung";
import type { Truong } from "./types";

type Dong = DongChiDinh | DongThuoc;

const GIU_NGUYEN = new Set(["ai", "xem"]);

export interface SoDemEform {
  so_truong_ai_dien: number;
  so_truong_sua: number;
  so_truong_bo_sung: number;
  so_canh_bao: number;
}

/**
 * Trường phiếu khám: tính các trường trong daDien; bác sĩ sửa thì nguồn thành "sua".
 * Dòng chỉ định, thuốc: mỗi dòng AI thêm là một mục (soDongAi, cộng dồn qua các lần điền).
 * Dòng AI còn trong bảng và chưa sửa là giữ nguyên; dòng đã sửa hoặc đã xóa tính là sửa.
 * Dòng không có cờ tu_ai (bác sĩ thêm, kể cả chọn từ gợi ý theo chẩn đoán) là bổ sung.
 * Cảnh báo: số chỗ còn "cần xem lại" lúc Lưu cộng số thuốc trùng nhóm dị ứng.
 */
export function demLuot(
  fields: Record<string, Truong>,
  daDien: MucDaDien[],
  soDongAi: number,
  chiDinh: DongChiDinh[],
  donThuoc: DongThuoc[],
  thuoc: CatalogItem[],
  diUng: string,
): SoDemEform {
  const dong: Dong[] = [...chiDinh, ...donThuoc];
  const dongAiGiuNguyen = dong.filter((row) => row.tu_ai && GIU_NGUYEN.has(row.nguon)).length;
  const truongSua = daDien.filter((item) => !GIU_NGUYEN.has(fields[item.id]?.nguon ?? "")).length;
  const xem =
    Object.values(fields).filter((f) => f.nguon === "xem").length + dong.filter((row) => row.nguon === "xem").length;
  const diUngTrung = donThuoc.filter((row) =>
    trungDiUng(row.ten, thuoc.find((item) => item.ma === row.ma), diUng),
  ).length;

  return {
    so_truong_ai_dien: daDien.length + soDongAi,
    so_truong_sua: truongSua + soDongAi - dongAiGiuNguyen,
    so_truong_bo_sung:
      Object.values(fields).filter((f) => f.nguon === "bs").length + dong.filter((row) => !row.tu_ai).length,
    so_canh_bao: xem + diUngTrung,
  };
}
