// GET /api/clinic/appointments/[appointmentId]: một lịch hẹn của bác sĩ demo (ngoài phạm vi: 404).
import { demoActor } from "@/server/clinic/demo-actor";
import { handleClinicRequest } from "@/server/clinic/http";
import { loadAppointment } from "@/server/clinic/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await ctx.params;
  return handleClinicRequest(request, () => loadAppointment(demoActor, appointmentId));
}
