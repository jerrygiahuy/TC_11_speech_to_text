import type { Truong } from "./types";

/** Ô AI trả về rỗng ({value:"", nguon:null}) nghĩa là AI không nói gì: không được ghi đè giá trị bác sĩ đã nhập. */
export function ghepAiKhongGhiDe(hienCo: Record<string, Truong>, ai: Record<string, Truong>): Record<string, Truong> {
  const ketQua = { ...hienCo };
  for (const [id, cell] of Object.entries(ai)) {
    if (cell.value.trim() === "" && (hienCo[id]?.value ?? "").trim() !== "") continue;
    ketQua[id] = cell;
  }
  return ketQua;
}
