// Một phiên nói. POST: thân là PCM 16-bit little-endian, mono, 16 kHz (một mẩu ~0,4 giây),
// trả về câu đã chốt và chữ tạm. DELETE: kết thúc phiên, trả về câu cuối.
import { guiAmThanh, ketThucPhien } from "@/server/ai/asr";
import { ASR_SAMPLE_RATE } from "@/shared/api";

export const runtime = "nodejs";

/** Một mẩu gửi lên không quá 10 giây âm thanh */
const MAX_BYTES = ASR_SAMPLE_RATE * 2 * 10;
const HET_PHIEN = { error: "Phiên nói đã hết hạn hoặc server vừa khởi động lại. Bấm Nói để bắt đầu lại." };

function loi(error: unknown) {
  console.error("Lỗi nhận dạng giọng nói:", error);
  const detail = error instanceof Error ? error.message : "Không rõ nguyên nhân";
  return Response.json({ error: `Không nhận dạng được: ${detail}` }, { status: 500 });
}

export async function POST(request: Request, ctx: RouteContext<"/api/asr/[id]">) {
  const { id } = await ctx.params;
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) return Response.json({ error: "Mẩu âm thanh quá lớn." }, { status: 413 });

  const soMau = Math.floor(buffer.byteLength / 2);
  const pcm = new Int16Array(buffer, 0, soMau);
  const samples = new Float32Array(soMau);
  for (let i = 0; i < soMau; i++) samples[i] = pcm[i] / 32768;

  try {
    const ketQua = guiAmThanh(id, samples);
    return ketQua ? Response.json(ketQua) : Response.json(HET_PHIEN, { status: 404 });
  } catch (error) {
    return loi(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/asr/[id]">) {
  const { id } = await ctx.params;
  try {
    const ketQua = ketThucPhien(id);
    return ketQua ? Response.json(ketQua) : Response.json(HET_PHIEN, { status: 404 });
  } catch (error) {
    return loi(error);
  }
}
