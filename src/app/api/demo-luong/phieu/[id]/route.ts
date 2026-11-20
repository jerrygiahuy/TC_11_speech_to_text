import { z } from "zod";
import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { clinicalResponse } from "@/server/clinical/service";
import { getDemoStore } from "@/server/demo-luong/get-store";
import { readDemoPhieu, saveDoctorEdit } from "@/server/demo-luong/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ expected_revision: z.number().int().min(0), fields: z.record(z.string().max(100), z.string().max(5000)) }).strict();
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    assertLocalDemoRequest(request);
    const { id } = await params;
    return Response.json(readDemoPhieu(getDemoStore(), id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertLocalDemoRequest(request);
    const { id } = await params;
    const text = await request.text();
    if (Buffer.byteLength(text) > 200_000) throw new ClinicalError("Yêu cầu quá lớn.", 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    const { expected_revision, fields } = input.parse(body);
    return Response.json(saveDoctorEdit(getDemoStore(), id, expected_revision, fields), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
