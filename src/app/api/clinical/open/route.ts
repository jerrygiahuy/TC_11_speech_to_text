import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { getDemoClinicalActor, resolveEncounterContext } from "@/server/clinical/encounter-context";
import { clinicalResponse, openEncounter } from "@/server/clinical/service";

export const runtime = "nodejs";

/** Opens (or reuses) the encounter for a visit code. Identity and patient data always come from the server context. */
export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 1000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    const { appointment_id } = z.object({ appointment_id: z.string().trim().min(1).max(64) }).strict().parse(value);
    return Response.json(openEncounter(resolveEncounterContext(getDemoClinicalActor(), appointment_id)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
