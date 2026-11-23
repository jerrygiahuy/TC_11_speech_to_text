// Ghi một lần kê đơn của bác sĩ (khi bấm Lưu trên eForm) để lần sau gợi ý theo thói quen.
import { z } from "zod";
import { luuThoiQuen, MAU_TAI_KHOAN } from "@/server/du-lieu/thoi-quen";
import type { LuuThoiQuenRequest } from "@/shared/api";

const chu = (max: number) => z.string().max(max);

const schema = z.object({
  tai_khoan: z.string().regex(MAU_TAI_KHOAN),
  don: z.object({
    id: z.string().uuid(),
    icd_chinh: chu(20).min(1),
    chi_dinh: z.array(z.object({ ma: chu(50), ten: chu(300), so_luong: chu(20), ghi_chu: chu(300) })).max(50),
    don_thuoc: z
      .array(
        z.object({
          ma: chu(50),
          ten: chu(300),
          ham_luong: chu(100),
          duong_dung: chu(50),
          lieu_moi_lan: chu(50),
          so_lan_ngay: chu(20),
          thoi_diem: chu(100),
          so_ngay: chu(20),
          ghi_chu: chu(300),
        }),
      )
      .max(50),
    loi_dan: chu(2000),
  }),
}) satisfies z.ZodType<LuuThoiQuenRequest>;

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu đơn đã kê không hợp lệ." }, { status: 400 });
  }
  const { tai_khoan, don } = parsed.data;
  // Thời điểm do server ghi
  luuThoiQuen(tai_khoan, { ...don, thoi_diem: new Date().toISOString() });
  return new Response(null, { status: 204 });
}
