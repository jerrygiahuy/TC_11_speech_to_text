// Gọi API của server từ trình duyệt. Kiểu dữ liệu lấy từ src/shared/api.ts nên lệch với route là báo lỗi ngay.
// Nhận dạng giọng nói (/api/asr) gọi trong MicButton vì gắn chặt với vòng thu âm.
import type { ApiLoi, ExtractRequest, LuuThoiQuenRequest, PipelineResult, SessionInput, SessionRecord } from "@/shared/api";

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

/** AI tách văn bản thành nháp Phiếu khám, Chỉ định, Đơn thuốc (dùng LLM_PROVIDER của server).
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
