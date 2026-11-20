// Gọi API của server từ trình duyệt. Kiểu dữ liệu lấy từ src/shared/api.ts nên lệch với route là báo lỗi ngay.
// Nhận dạng giọng nói (/api/asr) gọi trong MicButton vì gắn chặt với vòng thu âm.
import type { ApiLoi, ExtractRequest, GiongBacSiTrangThai, LuuThoiQuenRequest, PipelineResult, SessionInput, SessionRecord } from "@/shared/api";

async function postJson<T>(url: string, body: unknown, loiMacDinh: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as T | Partial<ApiLoi>;
  if (!response.ok) throw new Error((data as Partial<ApiLoi>).error ?? loiMacDinh);
  return data as T;
}

/** AI tách văn bản thành nháp Phiếu khám và Chỉ định (dùng LLM_PROVIDER của server).
 * Có mauId thì text là phần chi tiết bác sĩ nói thêm sau tên mẫu, AI thay chỗ trống trong mẫu đó */
export function goiAiDienNhap(text: string, loiMacDinh = "Không gọi được AI.", mauId?: string): Promise<PipelineResult> {
  const body: ExtractRequest = mauId ? { text, mau_id: mauId } : { text };
  return postJson<PipelineResult>("/api/extract", body, loiMacDinh);
}

/** Lưu số đo một lượt thử vào data/sessions/ */
export function luuLuotThu(session: SessionInput): Promise<SessionRecord> {
  return postJson<SessionRecord>("/api/sessions", session, "Không lưu được lượt thử.");
}

/** Ghi đơn bác sĩ vừa Lưu vào data/thoi-quen/, để lần sau gợi ý theo thói quen */
export function luuThoiQuen(body: LuuThoiQuenRequest): Promise<void> {
  return postJson<void>("/api/thoi-quen", body, "Không lưu được đơn đã kê.");
}

const LOI_GIONG: Record<string, string> = {
  VOICE_ENROLL_TOO_SHORT: "Chưa đủ lời nói (cần ít nhất 8 giây giọng của bạn). Đọc lại chậm và đủ đoạn mẫu.",
  VOICE_ENROLL_MULTIPLE_SPEAKERS: "Bản thu có giọng người khác. Thu lại ở chỗ yên tĩnh, chỉ mình bạn đọc.",
  VOICE_ENROLL_NO_SPEECH: "Không nghe thấy lời nói. Kiểm tra micro rồi thu lại.",
  VOICE_EMBEDDING_INVALID: "Không tạo được đặc trưng giọng. Thu lại.",
  DIARIZATION_MODEL_MISSING: "Chưa có model phân biệt người nói. Chạy npm run stt:setup rồi thử lại.",
  STT_BACKEND_UNAVAILABLE: "Chưa kết nối được STT trên máy. Chạy npm run stt:start rồi thử lại.",
  STT_BUSY: "Máy đang nhận dạng giọng nói ở nơi khác. Đợi xong rồi thử lại.",
  AUDIO_SILENT: "Bản thu im lặng. Kiểm tra micro rồi thu lại.",
};

async function goiGiong(init: RequestInit): Promise<GiongBacSiTrangThai> {
  const response = await fetch("/api/stt/giong-bac-si", { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const ma = String((data as { detail?: string }).detail ?? "");
    throw new Error(LOI_GIONG[ma] ?? `Không xử lý được giọng${ma ? ` (${ma})` : ""}.`);
  }
  return data as GiongBacSiTrangThai;
}

/** Xem bác sĩ đang đăng nhập đã đăng ký giọng chưa */
export const xemGiongBacSi = () => goiGiong({ method: "GET" });
/** Gửi bản thu WAV 16 kHz để tạo đặc trưng giọng; máy chủ không lưu âm thanh */
export const dangKyGiongBacSi = (wav: Blob) => goiGiong({ method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav });
/** Xóa đặc trưng giọng đã đăng ký */
export const xoaGiongBacSi = () => goiGiong({ method: "DELETE" });
