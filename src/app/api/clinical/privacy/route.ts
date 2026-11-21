import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { checkRecordingPrivacyWithNer, recordingBindingSchema } from "@/server/clinical/bound-privacy";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";

export const runtime = "nodejs";

const text = z.string().min(1).max(50_000).refine(value => value.trim().length > 0);
const input = z.object({ action: z.literal("check"), text, mode: z.enum(["conversation", "dictation"]), binding: recordingBindingSchema }).strict();
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const body = await request.text();
    if (Buffer.byteLength(body) > 400_000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    const { text: content, mode, binding } = input.parse(JSON.parse(body));
    const result = await checkRecordingPrivacyWithNer(getDemoClinicalActor(), { text: content, mode, binding });
    return Response.json(result, { headers });
  } catch (error) {
    // Never echo input, Zod issues, provider errors, or raw transcript to responses/logs.
    const status = error instanceof ClinicalError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500;
    return Response.json({ error: status === 403 ? "Nguồn yêu cầu không hợp lệ." : "Không thể kiểm tra nội dung. Hãy kiểm tra dữ liệu và thử lại." }, { status, headers });
  }
}
