// GET /api/clinic/dashboard?date=YYYY-MM-DD: lịch khám của bác sĩ demo trong ngày (mặc định hôm nay theo giờ Việt Nam).
import { ClinicDateSchema } from "@/shared/clinic/schema";
import { toClinicDate } from "@/shared/clinic/schedule";
import { demoActor } from "@/server/clinic/demo-actor";
import { ClinicHttpError } from "@/server/clinic/errors";
import { handleClinicRequest } from "@/server/clinic/http";
import { loadDashboard } from "@/server/clinic/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleClinicRequest(request, () => {
    const raw = new URL(request.url).searchParams.get("date");
    const date = raw === null ? toClinicDate(new Date().toISOString()) : raw;
    if (!ClinicDateSchema.safeParse(date).success) {
      throw new ClinicHttpError(400, "Ngày phải dạng YYYY-MM-DD và là ngày lịch thực.");
    }
    return loadDashboard(demoActor, date);
  });
}
