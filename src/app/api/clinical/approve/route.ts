import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";
import { approveScopes } from "@/server/clinical/approval-service";
import { clinicalResponse } from "@/server/clinical/service";

export const runtime = "nodejs";

/** POST { id, expected_revision, scopes, acknowledged_issues } — duyệt từng phần; mỗi lần duyệt lưu một bản bất biến. */
export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 20_000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    return Response.json(approveScopes(getDemoClinicalActor(), value as never), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
