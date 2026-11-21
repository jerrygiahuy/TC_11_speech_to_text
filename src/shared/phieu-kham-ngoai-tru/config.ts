import cauHinhJson from "../../../config/forms/phieu-kham-ngoai-tru.json";
import type { CauHinhPhieu, Truong } from "./types";

/** Config phiếu khám ngoại trú (nguồn sự thật danh sách trường) */
export const CAU_HINH_PHIEU = cauHinhJson as unknown as CauHinhPhieu;

/** Mọi trường theo đúng thứ tự phần → mục → trường */
export function moiTruong(cauHinh: CauHinhPhieu = CAU_HINH_PHIEU): Truong[] {
  return cauHinh.phan.flatMap((p) => p.muc.flatMap((m) => m.truong));
}
