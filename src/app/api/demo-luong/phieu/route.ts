import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { clinicalResponse } from "@/server/clinical/service";
import { getDemoStore } from "@/server/demo-luong/get-store";
import { createDemoPhieu, resetDemoData } from "@/server/demo-luong/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ benh_nhan_id: z.string().min(1).max(40) }).strict();

export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const text = await request.text();
    if (Buffer.byteLength(text) > 1000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    const { benh_nhan_id } = input.parse(body);
    return Response.json(createDemoPhieu(getDemoStore(), benh_nhan_id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    assertLocalDemoRequest(request);
    resetDemoData(getDemoStore());
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
