import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { clinicalResponse } from "@/server/clinical/service";
import { getDemoStore } from "@/server/demo-luong/get-store";
import { approveDemoPhieu } from "@/server/demo-luong/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ expected_revision: z.number().int().min(0) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertLocalDemoRequest(request);
    const { id } = await params;
    const text = await request.text();
    if (Buffer.byteLength(text) > 1000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    const { expected_revision } = input.parse(body);
    return Response.json(approveDemoPhieu(getDemoStore(), id, expected_revision), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
