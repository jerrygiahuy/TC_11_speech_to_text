// POST /api/clinic/appointments/[appointmentId]/open: mở hoặc dùng lại phiếu khám của lịch.
// Server kiểm lại quyền và chính sách mở; thành công trả mã hồ sơ để trình duyệt chuyển sang eForm.
import { getClinicActor } from "@/server/clinic/demo-actor";
import { handleClinicRequest } from "@/server/clinic/http";
import { openAppointmentEncounter } from "@/server/clinic/open";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await ctx.params;
  return handleClinicRequest(request, () => openAppointmentEncounter(getClinicActor(), appointmentId));
}
