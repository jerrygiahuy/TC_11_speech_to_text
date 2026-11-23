import { proxySttVoice } from "@/lib/stt/proxy";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mã bác sĩ lấy từ actor phía máy chủ; client không chọn được giọng của người khác.
const doctorId = () => getDemoClinicalActor().doctorId;

export async function GET(request: Request) {
  return proxySttVoice(request, doctorId());
}

export async function POST(request: Request) {
  return proxySttVoice(request, doctorId());
}

export async function DELETE(request: Request) {
  return proxySttVoice(request, doctorId());
}
