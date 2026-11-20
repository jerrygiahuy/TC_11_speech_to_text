import { kiemTraPhieu } from "@/shared/phieu-kham-ngoai-tru/schema";
import { capNhatPhieu, docPhieu, laIdHopLe, xoaPhieu } from "@/server/phieu-kham-ngoai-tru/store";

export const dynamic = "force-dynamic";

type Ngu = { params: Promise<{ id: string }> };

const LOI_ID = () => Response.json({ error: "Mã phiếu không hợp lệ." }, { status: 400 });
const KHONG_THAY = () => Response.json({ error: "Không tìm thấy phiếu." }, { status: 404 });

export async function GET(_request: Request, { params }: Ngu) {
  const { id } = await params;
  if (!laIdHopLe(id)) return LOI_ID();
  const ban_ghi = docPhieu(id);
  return ban_ghi ? Response.json(ban_ghi) : KHONG_THAY();
}

/** Cập nhật toàn bộ `du_lieu` */
export async function PUT(request: Request, { params }: Ngu) {
  const { id } = await params;
  if (!laIdHopLe(id)) return LOI_ID();
  const body = await request.json().catch(() => null);
  const kq = kiemTraPhieu(body && typeof body === "object" && "du_lieu" in body ? (body as { du_lieu: unknown }).du_lieu : body);
  if (!kq.ok) return Response.json({ error: kq.loi }, { status: 400 });
  const ban_ghi = capNhatPhieu(id, kq.du_lieu);
  return ban_ghi ? Response.json(ban_ghi) : KHONG_THAY();
}

export async function DELETE(_request: Request, { params }: Ngu) {
  const { id } = await params;
  if (!laIdHopLe(id)) return LOI_ID();
  return xoaPhieu(id) ? Response.json({ ok: true }) : KHONG_THAY();
}
