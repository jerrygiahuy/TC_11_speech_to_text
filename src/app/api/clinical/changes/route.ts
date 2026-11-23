import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";
import { clinicalResponse, decideClinicalChangesForActor, proposeClinicalChangesForActor } from "@/server/clinical/service";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };

/** POST { action: "propose" | "decide", ... } — the server rebuilds the change set from the stored run, never from client before/after values. */
export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 20_000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    const { action, ...payload } = z.object({ action: z.enum(["propose", "decide"]) }).passthrough().parse(value);
    const actor = getDemoClinicalActor();
    return Response.json(action === "propose" ? proposeClinicalChangesForActor(actor, payload) : decideClinicalChangesForActor(actor, payload), { headers });
  } catch (error) { return clinicalResponse(error); }
}
