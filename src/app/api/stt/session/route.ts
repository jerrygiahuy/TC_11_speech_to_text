import { proxySttSession } from "@/lib/stt/proxy";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Phiên xin so giọng bác sĩ (eForm gửi X-STT-Voice: bac-si): mã bác sĩ do máy chủ xác định, không lấy từ client.
  const voiceId = request.headers.get("X-STT-Voice") === "bac-si" ? getDemoClinicalActor().doctorId : undefined;
  return proxySttSession(request, undefined, fetch, voiceId);
}
