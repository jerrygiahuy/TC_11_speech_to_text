// So khớp từ khóa có xét phủ định, dùng chung cho gợi ý ICD10 và gợi ý mẫu câu.
import { normalizeVi } from "../normalize";
import type { QuyTacAi } from "./types";

type PhuDinh = QuyTacAi["phu_dinh"];

/** Số từ được phép xen giữa các từ của từ khóa, ví dụ "chảy mủ vàng tai" vẫn khớp "chảy mủ tai" */
const MAX_TU_XEN = 2;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Chia văn bản thành các vế đã chuẩn hóa, phủ định chỉ có tác dụng trong một vế */
export function chiaVe(text: string, phuDinh: PhuDinh): string[] {
  const ngoaiLe = phuDinh.ngoai_le.map(normalizeVi);
  return text
    .split(/[,;\n]+|\.(?=\s|$)/)
    .map((ve) => ngoaiLe.reduce((current, cum) => current.replaceAll(cum, " "), normalizeVi(ve)))
    .filter((ve) => ve.trim());
}

function coTrongVe(ve: string, tuKhoa: string, tuPhuDinh: Set<string>, cuaSo: number): boolean {
  const parts = normalizeVi(tuKhoa).split(" ").map(escapeRegExp);
  const pattern = new RegExp(`(?<!\\S)${parts.join(`(?:\\s+\\S+){0,${MAX_TU_XEN}}?\\s+`)}(?!\\S)`, "g");
  for (const match of ve.matchAll(pattern)) {
    const before = ve.slice(0, match.index).split(" ").filter(Boolean).slice(-cuaSo);
    const inside = match[0].split(" ");
    if (![...before, ...inside].some((token) => tuPhuDinh.has(token))) return true;
  }
  return false;
}

/** Trả về các từ khóa xuất hiện trong văn bản mà không bị phủ định */
export function timTuKhoa(cacVe: string[], tuKhoa: string[], phuDinh: PhuDinh): string[] {
  const tuPhuDinh = new Set(phuDinh.tu.map(normalizeVi));
  return tuKhoa.filter((item) => cacVe.some((ve) => coTrongVe(ve, item, tuPhuDinh, phuDinh.cua_so)));
}
