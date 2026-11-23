import { z } from "zod";
import { listSessions, saveSession } from "@/server/du-lieu/sessions";

const count = z.number().int().min(0);

const sessionSchema = z.object({
  kieu_nhap: z.enum(["go", "noi"]),
  tu_ca_mau: z.boolean(),
  ca_mau_id: z.string().max(100).nullable(),
  mau_id: z.string().max(100).nullable().default(null),
  provider: z.string().max(50),
  thoi_gian_giay: z.number().min(0),
  so_truong_ai_dien: count,
  so_truong_sua: count,
  so_truong_bo_sung: count,
  so_muc_danh_muc: count,
  so_muc_khop: count,
  so_muc_khong_khop: count,
  so_canh_bao: count,
});

export async function GET() {
  return Response.json(listSessions());
}

export async function POST(request: Request) {
  const parsed = sessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu lượt thử không hợp lệ." }, { status: 400 });
  }
  return Response.json(saveSession(parsed.data), { status: 201 });
}
