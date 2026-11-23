// Kiểu và nhãn dùng chung cho các khối của màn /demo-luong (chỉ hiển thị, không gọi API).
import type { PiiRule } from "@/shared/clinical/pii";
import type { DemoEvent, DemoStep } from "@/shared/demo-luong/types";

export type CheDo = "bac_si" | "ky_thuat";
export type TrangThaiBuoc = "cho" | "dang" | "xong" | "bi_chan" | "loi" | "bo_qua";
export interface BuocView { trang_thai: TrangThaiBuoc; ms: number | null }

/** Sự kiện thành công (hoặc bị chặn) của một bước, đã thu hẹp theo `buoc`. */
export type SuKien<S extends DemoStep> = Extract<DemoEvent, { buoc: S }>;
/** Sự kiện cuối của từng bước trong lượt đang xem. */
export type SuKienLuot = { [S in DemoStep]?: SuKien<S> | Extract<DemoEvent, { trang_thai: "loi" }> };

export const BUOC: { id: DemoStep; so: string; ten: string }[] = [
  { id: "stt", so: "①", ten: "Ghi âm" },
  { id: "ban_tho", so: "②", ten: "Bản chép lời" },
  { id: "che", so: "③", ten: "Bản đã che" },
  { id: "ai", so: "④", ten: "AI phân tích" },
  { id: "luu", so: "⑤", ten: "Phiếu đã lưu" },
];

export const BUOC_TRONG: Record<DemoStep, BuocView> = {
  stt: { trang_thai: "cho", ms: null }, ban_tho: { trang_thai: "cho", ms: null }, che: { trang_thai: "cho", ms: null },
  ai: { trang_thai: "cho", ms: null }, luu: { trang_thai: "cho", ms: null },
};

// Nhãn rule, lý do chặn, mẫu nhãn che và giờ VN nằm ở src/shared/clinical/pii/nhan.ts (dùng chung với eForm).
export { RULES, TEN_RULE, TEN_LY_DO_CHAN, NHAN_CHE, gioVN } from "@/shared/clinical/pii/nhan";

export const RUI_RO_R2 =
  "Chữ từ STT là chữ thường, không dấu câu, nên R2 không dựa vào chữ hoa: R2 dò theo từ điển họ người Việt và từ chỉ người. " +
  "Rủi ro còn lại: tên đứng một mình, không có họ hoặc từ chỉ người phía trước, có thể lọt — chốt chặn R11 là lớp bảo vệ sau.";

export function tongDaChe(counts: Partial<Record<PiiRule, number>> | undefined): number {
  return Object.values(counts ?? {}).reduce((n, v) => n + (v ?? 0), 0);
}

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ef-xanh";
