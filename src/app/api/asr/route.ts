// Nhận dạng giọng nói trên máy (Zipformer).
// GET: cho trình duyệt biết đang dùng chế độ nào. POST: mở một phiên nói, trả về id phiên.
// Gửi âm thanh và kết thúc phiên ở /api/asr/[id].
import { fileModelThieu, getAsrProvider, taoPhien } from "@/server/ai/asr";
import type { AsrPhienMoi, AsrTrangThai } from "@/shared/api";
import { MODEL_GIONG_NOI } from "@/shared/model-giong-noi";

export const runtime = "nodejs";

export function GET() {
  const provider = getAsrProvider();
  const thieu = provider === "zipformer" ? fileModelThieu() : [];
  return Response.json({
    provider,
    sanSang: provider === "zipformer" && thieu.length === 0,
    thuMucModel: MODEL_GIONG_NOI.thuMuc,
    thieu,
  } satisfies AsrTrangThai);
}

export function POST(request: Request) {
  if (request.headers.get("X-Clinical-Consent") !== "true") {
    return Response.json({ error: "Cần sự đồng ý xử lý âm thanh y tế nội bộ trước khi mở phiên." }, { status: 403 });
  }
  if (getAsrProvider() !== "zipformer") {
    return Response.json({ error: "Chính sách dữ liệu y tế chỉ cho phép nhận dạng trên máy (ASR_PROVIDER=zipformer)." }, { status: 403 });
  }
  try {
    return Response.json({ id: taoPhien() } satisfies AsrPhienMoi);
  } catch (error) {
    console.error("Lỗi mở phiên nhận dạng giọng nói:", error);
    const detail = error instanceof Error ? error.message : "Không rõ nguyên nhân";
    return Response.json({ error: `Không mở được nhận dạng giọng nói: ${detail}` }, { status: 500 });
  }
}
