import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { saveClinical, clinicalResponse, listOpenEncounters } from "@/server/clinical/service";
import { getDemoClinicalActor, listEncounterContexts } from "@/server/clinical/encounter-context";

export const runtime = "nodejs";

/** Encounters the doctor is examining/waiting on, plus visit codes that can still be opened. */
export async function GET(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const actor = getDemoClinicalActor();
    const available = listEncounterContexts(actor).map(item => ({ appointment_id: item.appointmentId, patient_id: item.patientId, patient_name: item.data.ca.ho_ten }));
    return Response.json({ open: listOpenEncounters(actor), available }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const body = await request.text();
    if (Buffer.byteLength(body) > 200_000) throw new ClinicalError("Hồ sơ quá lớn.", 413);
    let value: unknown;
    try { value = JSON.parse(body); } catch { throw new ClinicalError("JSON không hợp lệ.", 400); }
    return Response.json(saveClinical(value), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return clinicalResponse(error); }
}
