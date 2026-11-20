// Nhãn hiển thị của bộ rule pii-auto-2, dùng chung eForm và /demo-luong (chỉ là chữ, không có logic che).
import type { NerTrangThai, PiiRule } from "./types";

export const RULES: PiiRule[] = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];

export const TEN_RULE: Record<PiiRule, string> = {
  R1: "Giá trị đã biết trong hồ sơ (bệnh nhân, người nhà, nhân viên, nơi làm việc)",
  R2: "Họ tên chưa có trong hồ sơ",
  R3: "Địa danh dưới cấp tỉnh",
  R4: "Mốc ngày gắn với bệnh nhân",
  R5: "Số điện thoại, email, URL",
  R6: "Mã định danh (CCCD, BHYT, PID…)",
  R7: "Thông tin nhạy cảm (quốc tịch, dân tộc…)",
  R8: "Nội dung ngoài phạm vi khám",
};

export const TEN_LY_DO_CHAN: Record<string, string> = {
  R11a_gia_tri_da_biet: "R11a · còn giá trị đã biết trong hồ sơ",
  R11b_day_so_dai: "R11b · còn dãy số dài (≥ 6 chữ số)",
  R11c_ten_rieng_con_sot: "R11c · còn cụm giống tên người",
  R11d_email_url: "R11d · còn email hoặc URL",
};

/** Một dòng trạng thái lớp NER cho eForm và /demo-luong. */
export function nhanNer(ner: { trang_thai: NerTrangThai; so_doan: number }): string {
  if (ner.trang_thai === "chay") return `NER: đã chạy (${ner.so_doan} đoạn)`;
  return ner.trang_thai === "khong_chay" ? "NER: không chạy, chỉ dùng rule" : "NER: tắt";
}

/** Nhãn che trong bản sạch, ví dụ `[BỆNH_NHÂN]`, `[NGƯỜI_1]`. */
export const NHAN_CHE = /\[[^\]\n]+\]/g;

/** "01/11/2026 09:00" theo giờ Việt Nam. */
export function gioVN(iso: string | null | undefined): string {
  if (!iso) return "không rõ thời điểm";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}
