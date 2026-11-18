// Chuẩn hóa tiếng Việt và bung từ viết tắt. Không dùng API của Node, chạy được cả ở trình duyệt.
import type { VietTat } from "./types";

const COMBINING_MARKS = /[̀-ͯ]/g;

export function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Bỏ dấu, chữ thường, gộp khoảng trắng; dùng để so khớp */
export function normalizeVi(text: string): string {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9%.+/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bỏ dấu và chữ thường nhưng giữ nguyên độ dài, để vị trí tìm được ứng với văn bản gốc */
export function foldKeepLength(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const folded = stripDiacritics(text[i]).toLowerCase();
    result += folded.length === 1 ? folded : text[i];
  }
  return result;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bung từ viết tắt theo config/viet-tat.json.
 * Khóa một chữ cái phân biệt hoa thường và phải đứng riêng thành từ, nên không làm hỏng từ khác.
 * Riêng khóa chữ thường được phép dính sau số: 5n, 2v.
 */
export function expandAbbreviations(text: string, table: VietTat): string {
  let result = text.normalize("NFC");
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const value = table[key];
    const single = key.length === 1;
    const flags = single ? "gu" : "giu";
    const token = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(key)}(?![\\p{L}\\p{N}])`, flags);
    result = result.replace(token, value);
    if (single && key === key.toLowerCase()) {
      const afterNumber = new RegExp(`(?<=\\d)${escapeRegExp(key)}(?![\\p{L}\\p{N}])`, "gu");
      result = result.replace(afterNumber, ` ${value}`);
    }
  }
  return result;
}
