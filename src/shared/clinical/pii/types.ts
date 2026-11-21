/** Phiên bản bộ rule che PII tự động. Đổi rule thì tăng số. */
export const PII_POLICY_VERSION = "pii-auto-2";

export type PiiRule = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";

export type PiiLabelKind =
  | "BỆNH_NHÂN" | "NGƯỜI_NHÀ" | "BÁC_SĨ" | "NƠI_LÀM_VIỆC" | "NGƯỜI" | "ĐỊA_DANH" | "NGÀY" | "LIÊN_HỆ"
  | "MÃ_ĐỊNH_DANH" | "THÔNG_TIN_NHẠY_CẢM" | "NỘI_DUNG_NGOÀI_KHÁM" | "TUỔI" | "GIỚI_TÍNH";

/** Giá trị định danh đã biết từ hồ sơ (tên bệnh nhân, người nhà, số điện thoại...). */
export interface KnownIdentifier {
  value: string;
  kind: "BỆNH_NHÂN" | "NGƯỜI_NHÀ" | "BÁC_SĨ" | "NƠI_LÀM_VIỆC" | "MÃ_ĐỊNH_DANH" | "LIÊN_HỆ" | "ĐỊA_DANH";
}

/** start/end tính trên bản thô. `nguon: "ner"`: đoạn do lớp NER thêm (không có nghĩa là rule). */
export interface PiiSpan { rule: PiiRule; kind: PiiLabelKind; start: number; end: number; label: string; nguon?: "ner" }

/** Một đoạn do dịch vụ NER (`POST /ner`) trả về: vị trí UTF-16 trên chuỗi NFC, `nhan` là loại thực thể PhoNER. */
export interface NerSpan { start: number; end: number; nhan: string; diem: number }

/** Lớp NER ở một lượt: đã chạy, không chạy được (lỗi, quá giờ, thiếu mô hình: chỉ dùng rule), hay tắt (`PII_NER` khác `on`). */
export type NerTrangThai = "chay" | "khong_chay" | "tat";

/** Kết quả gọi dịch vụ NER phía máy chủ. `spans[i]` thuộc văn bản thứ i đã gửi. */
export type NerKetQua =
  | { trang_thai: "chay"; spans: NerSpan[][]; nguong: number; model_sha256: string }
  | { trang_thai: "khong_chay" | "tat" };

/** Đoạn NER đã qua bộ lọc `locNer`, sẵn sàng đưa vào `redactPii`. */
export interface NerChapNhan { start: number; end: number; rule: PiiRule; kind: PiiLabelKind }

export interface RedactionResult { raw: string; clean: string; spans: PiiSpan[]; counts: Record<PiiRule, number> }
