import { assertLocalDemoRequest } from "@/server/clinical/repository";
import { clinicalResponse } from "@/server/clinical/service";
import { listKichBan } from "@/server/demo-luong/kich-ban";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertLocalDemoRequest(request);
    return Response.json(listKichBan(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
