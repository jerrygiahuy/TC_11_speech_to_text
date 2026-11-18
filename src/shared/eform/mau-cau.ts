// Mock gợi ý mẫu câu khám TMH theo lý do khám. Chỗ [a|b] do bác sĩ chọn, AI không tự điền kết quả khám.
import { chiaVe, timTuKhoa } from "./khop";
import type { MauCauData, QuyTacAi, VungKham } from "./types";

export const VUNG_KHAM: { id: VungKham; nhan: string }[] = [
  { id: "tai", nhan: "Tai" },
  { id: "mui", nhan: "Mũi" },
  { id: "vom", nhan: "Vòm" },
  { id: "hong", nhan: "Họng" },
];

export interface MauGoiY {
  text: string;
  theoLyDo: boolean;
}

export interface KetQuaMauCau {
  nhomKhop: string[];
  theoVung: Record<VungKham, MauGoiY[]>;
}

export type PhanMau = { kieu: "chu"; text: string } | { kieu: "cho"; luaChon: string[]; goc: string };

export function goiYMauCau(lyDo: string, data: MauCauData, phuDinh: QuyTacAi["phu_dinh"]): KetQuaMauCau {
  const cacVe = chiaVe(lyDo, phuDinh);
  const khop = data.nhom.filter((nhom) => timTuKhoa(cacVe, nhom.tu_khoa, phuDinh).length > 0);
  const lietKe = (vung: VungKham): MauGoiY[] => {
    const theoLyDo = khop.flatMap((nhom) => nhom.mau[vung] ?? []);
    // Vùng chưa có mẫu riêng thì dùng mẫu chung, để bác sĩ vẫn khám đủ 4 vùng
    if (theoLyDo.length > 0) return theoLyDo.map((text) => ({ text, theoLyDo: true }));
    return (data.mac_dinh[vung] ?? []).map((text) => ({ text, theoLyDo: false }));
  };
  return {
    nhomKhop: khop.map((nhom) => nhom.ten),
    theoVung: { tai: lietKe("tai"), mui: lietKe("mui"), vom: lietKe("vom"), hong: lietKe("hong") },
  };
}

export function tachMau(text: string): PhanMau[] {
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("[")
        ? { kieu: "cho" as const, luaChon: part.slice(1, -1).split("|"), goc: part }
        : { kieu: "chu" as const, text: part },
    );
}

/** Số chỗ [a|b] bác sĩ chưa chọn */
export function demChoTrong(text: string): number {
  return text.match(/\[[^\]]*\]/g)?.length ?? 0;
}
