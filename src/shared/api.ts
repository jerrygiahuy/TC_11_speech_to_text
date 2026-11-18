// Hợp đồng giữa giao diện (src/client) và API (src/app/api): kiểu dữ liệu gửi đi, nhận về và các hằng hai bên phải khớp.
// Đổi gì ở đây thì cả route lẫn nơi gọi đều báo lỗi kiểu, không bị lệch âm thầm.
import type { DonDaKe } from "./eform/thoi-quen";
import type { RowMatches } from "./match";
import type { SessionInput, SessionRecord } from "./metrics";
import type { Draft } from "./types";

/** Lỗi mọi API trả về, kèm mã HTTP 4xx/5xx */
export interface ApiLoi {
  error: string;
}

/** POST /api/extract */
export interface ExtractRequest {
  text: string;
  /** Có khi bác sĩ gọi phiếu mẫu kèm chi tiết: text là phần chi tiết, server lấy mẫu theo id */
  mau_id?: string;
}

/** POST /api/extract trả về: nháp đã khớp danh mục và tính tổng số lượng */
export interface PipelineResult {
  draft: Draft;
  matches: RowMatches;
  provider: string;
  duration_ms: number;
}

/** POST /api/sessions nhận SessionInput, trả SessionRecord; GET trả SessionRecord[] */
export type { SessionInput, SessionRecord };

/** Âm thanh gửi lên /api/asr/[id]: PCM 16-bit little-endian, mono, tần số này */
export const ASR_SAMPLE_RATE = 16000;
/** Giới hạn độ dài một phiên nói */
export const ASR_MAX_SECONDS = 600;

/** GET /api/asr */
export interface AsrTrangThai {
  provider: string;
  /** Chỉ true khi provider là zipformer và model đã tải về models/ */
  sanSang: boolean;
}

/** POST /api/asr trả về id phiên */
export interface AsrPhienMoi {
  id: string;
}

/** POST và DELETE /api/asr/[id] */
export interface AsrKetQua {
  /** Câu đã chốt kể từ lần gửi trước, mỗi câu kết thúc bằng dấu chấm */
  chot: string[];
  /** Phần câu đang nói dở, rỗng khi đang im lặng */
  tam: string;
}

/** POST /api/thoi-quen: một lần kê của bác sĩ (thời điểm do server ghi), trả 204 */
export interface LuuThoiQuenRequest {
  tai_khoan: string;
  don: Omit<DonDaKe, "thoi_diem">;
}
