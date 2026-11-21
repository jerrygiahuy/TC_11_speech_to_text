import { foldVietnamese } from "./redact";

/** Token dạng gấp (bỏ dấu, chữ thường), ngăn bởi ký tự không phải chữ/số; nhãn `[NGƯỜI_1]` thành "nguoi 1". */
const tokens = (text: string) => ` ${(foldVietnamese(text).match(/[\p{L}\p{N}]+/gu) ?? []).join(" ")} `;
const conNguyen = (clean: string, phrase: string) => {
  const p = tokens(phrase);
  return p.trim().length > 0 && tokens(clean).includes(p);
};

/**
 * Chấm một câu cho `npm run eval-pii`: mục `phai_che` "bắt được" khi không còn nguyên (theo ranh giới từ, dạng gấp)
 * trong bản đã che; mục `khong_duoc_che` bị "che nhầm" khi không còn nguyên trong bản đã che.
 */
export function danhGiaMotCau(clean: string, phaiChe: readonly string[], khongDuocChe: readonly string[]): { bat_duoc: number; tong_phai_che: number; che_nham: number } {
  return {
    bat_duoc: phaiChe.filter((p) => !conNguyen(clean, p)).length,
    tong_phai_che: phaiChe.length,
    che_nham: khongDuocChe.filter((p) => !conNguyen(clean, p)).length,
  };
}

/** p50/p95 theo hạng gần nhất. */
export function phanVi(values: readonly number[]): { p50: number; p95: number } {
  if (values.length === 0) return { p50: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)];
  return { p50: at(0.5), p95: at(0.95) };
}
