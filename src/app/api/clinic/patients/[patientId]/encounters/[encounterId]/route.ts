// GET /api/clinic/patients/[patientId]/encounters/[encounterId]: một phiếu cũ của bệnh nhân, chỉ đọc.
// Trả bản đã chiếu (không có transcript hay lần chạy AI); bệnh nhân/phiếu của người khác trả 404 như nhau.
import { getClinicActor } from "@/server/clinic/demo-actor";
import { handleClinicRequest } from "@/server/clinic/http";
import { loadHistoricalEncounter } from "@/server/clinic/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ patientId: string; encounterId: string }> },
) {
  const { patientId, encounterId } = await ctx.params;
  return handleClinicRequest(request, () => loadHistoricalEncounter(getClinicActor(), patientId, encounterId));
}
