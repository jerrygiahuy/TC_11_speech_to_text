import { kiemTraPhieu } from "@/shared/phieu-kham-ngoai-tru/schema";
import { lietKePhieu, taoPhieu } from "@/server/phieu-kham-ngoai-tru/store";

export const dynamic = "force-dynamic";

/** Danh sách tóm tắt các phiếu đã lưu */
export async function GET() {
  return Response.json(lietKePhieu());
}

/** Tạo phiếu mới; body là `du_lieu` đầy đủ (hoặc `{ du_lieu }`) */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kq = kiemTraPhieu(body && typeof body === "object" && "du_lieu" in body ? (body as { du_lieu: unknown }).du_lieu : body);
  if (!kq.ok) return Response.json({ error: kq.loi }, { status: 400 });
  return Response.json(taoPhieu(kq.du_lieu), { status: 201 });
}
