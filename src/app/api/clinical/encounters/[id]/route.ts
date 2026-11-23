import { assertLocalDemoRequest } from "@/server/clinical/repository";
import { readClinical, clinicalResponse } from "@/server/clinical/service";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertLocalDemoRequest(request);
    return Response.json(readClinical((await params).id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
