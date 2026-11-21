import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";
import { finalizeRecording, heartbeatRecording, recoverInterruptedRecordings, startRecording, updateRecordingContent } from "@/server/clinical/recording-service";
import { clinicalResponse } from "@/server/clinical/service";

export const runtime = "nodejs";

const action = z.enum(["start", "heartbeat", "finalize", "content", "recover"]);

/**
 * Thin HTTP adapter: every action is re-authorized by the recording service against the server actor.
 * Thao tác "content" có hành động riêng (invalidate | attach_reviewed | discard) gửi trong `content_action`,
 * vì trường `action` ở cấp ngoài đã dùng để chọn thao tác.
 */
export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 4_000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    const { action: name, content_action: contentAction, ...rest } = z.object({ action, content_action: z.enum(["invalidate", "attach_reviewed", "discard"]).optional() }).passthrough().parse(value);
    const payload = name === "content" ? { ...rest, action: contentAction } : rest;
    const actor = getDemoClinicalActor();
    const result = name === "start" ? startRecording(actor, payload as never)
      : name === "heartbeat" ? heartbeatRecording(actor, payload as never)
      : name === "finalize" ? finalizeRecording(actor, payload as never)
      : name === "content" ? updateRecordingContent(actor, payload as never)
      : (recoverInterruptedRecordings(actor, z.string().min(1).max(128).parse((payload as { device_id?: unknown }).device_id)), { ok: true });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
