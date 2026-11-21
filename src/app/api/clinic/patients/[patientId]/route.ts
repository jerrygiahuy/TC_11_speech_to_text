// GET /api/clinic/patients/[patientId]?appointment_id=: hồ sơ, lịch còn khám được và lịch sử khám của bệnh nhân.
import { getClinicActor } from "@/server/clinic/demo-actor";
import { ClinicHttpError } from "@/server/clinic/errors";
import { handleClinicRequest } from "@/server/clinic/http";
import { loadPatientPage } from "@/server/clinic/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await ctx.params;
  return handleClinicRequest(request, () => {
    const selected = new URL(request.url).searchParams.get("appointment_id");
    if (selected !== null && (selected.length === 0 || selected.length > 100)) {
      throw new ClinicHttpError(400, "appointment_id không hợp lệ.");
    }
    return loadPatientPage(getClinicActor(), patientId, selected ?? undefined);
  });
}
