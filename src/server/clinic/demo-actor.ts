import "server-only";
import { getDemoClinicalActor } from "@/server/clinical/encounter-context";
import type { ClinicActor } from "./ports";

let override: ClinicActor | null = null;

/** Chỉ cho test: đặt actor khác; truyền null để trở về actor thật. */
export function setClinicActorForTest(actor: ClinicActor | null): void {
  override = actor;
}

/** Actor phía server, quy đổi từ actor demo của lớp clinical. Client không được chọn actor. */
export function getClinicActor(): ClinicActor {
  if (override) return override;
  const actor = getDemoClinicalActor();
  return Object.freeze({ doctor_id: actor.doctorId, facility_id: actor.facilityId });
}
