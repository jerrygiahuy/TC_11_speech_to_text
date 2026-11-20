import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";
import { transitionEncounter } from "@/server/clinical/approval-service";
import { clinicalResponse } from "@/server/clinical/service";

export const runtime = "nodejs";

/** POST { id, expected_revision, action: "wait" | "resume" | "complete" } — đổi trạng thái lượt khám, tách khỏi việc duyệt. */
export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 1_000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    return Response.json(transitionEncounter(getDemoClinicalActor(), value as never), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
