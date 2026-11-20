// Thư viện câu khám Tim mạch (data/cardiology/exam-library.json). Bác sĩ tick câu rồi chèn vào ô khám, AI không tự điền kết quả khám.
import type { MauCauData, VungKham } from "./types";

export const VUNG_KHAM: { id: VungKham; nhan: string; truong: string }[] = [
  { id: "toan_than", nhan: "Khám toàn thân", truong: "kham_toan_than" },
  { id: "tim_mach_ho_hap", nhan: "Khám tim mạch, hô hấp", truong: "kham_tim_mach_ho_hap" },
];

/** Đọc exam-library.json: GENERAL thành toàn thân, CARDIO_RESP thành tim mạch, hô hấp */
export function docThuVienTimMach(json: { sections?: Record<string, string[]> }): MauCauData {
  const sections = json.sections ?? {};
  return { theoVung: { toan_than: [...(sections.GENERAL ?? [])], tim_mach_ho_hap: [...(sections.CARDIO_RESP ?? [])] } };
}

/** Chèn các câu đã tick thành dòng "- …" cuối ô; ô đã có chữ thì nối thêm dòng mới, không ghi đè */
export function chenMauCau(hienCo: string, cau: string[]): string {
  if (cau.length === 0) return hienCo;
  const them = cau.map((item) => `- ${item}`).join("\n");
  const goc = hienCo.replace(/\s+$/, "");
  return goc ? `${goc}\n${them}` : them;
}

/** Số chỗ [a|b] bác sĩ chưa chọn */
export function demChoTrong(text: string): number {
  return text.match(/\[[^\]]*\]/g)?.length ?? 0;
}
