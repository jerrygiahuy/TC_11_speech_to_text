// Kiểm tra thuốc trùng nhóm dị ứng ghi trên header. Dùng chung cho đơn thuốc và gợi ý theo chẩn đoán.
import { normalizeVi } from "../normalize";
import type { CatalogItem } from "../types";

/** Nhóm dị ứng → hoạt chất cùng nhóm. Chỉ là ví dụ minh họa, không phải danh sách lâm sàng. */
const NHOM_DI_UNG: Record<string, string[]> = {
  penicillin: ["penicillin", "amoxicillin", "ampicillin", "augmentin"],
};

export function trungDiUng(ten: string, item: CatalogItem | undefined, diUng: string): boolean {
  if (!diUng) return false;
  const nhom = NHOM_DI_UNG[normalizeVi(diUng)] ?? [normalizeVi(diUng)];
  const chuoi = normalizeVi(`${ten} ${item?.hoat_chat ?? ""}`);
  return nhom.some((chat) => chuoi.includes(chat));
}
