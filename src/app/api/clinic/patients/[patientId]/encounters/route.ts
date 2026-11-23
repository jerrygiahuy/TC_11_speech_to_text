// POST /api/clinic/patients/[patientId]/encounters: "Tạo mới phiếu khám" ngoại trú cho bệnh nhân (không theo lịch hẹn).
// Server tự lấy bác sĩ/cơ sở từ actor và danh tính bệnh nhân từ ngữ cảnh; client chỉ gửi mã bệnh nhân.
import { getClinicActor } from "@/server/clinic/demo-actor";
import { handleClinicRequest } from "@/server/clinic/http";
import { createPatientEncounter } from "@/server/clinic/open";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await ctx.params;
  return handleClinicRequest(request, () => createPatientEncounter(getClinicActor(), patientId));
}
