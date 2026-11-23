import "server-only";
// Chính sách mở phiếu cho một lịch: một nơi quyết định cho cả danh sách (can_open) lẫn thao tác mở.
// Ngữ cảnh khám của lớp clinical là nguồn chủ sở hữu bệnh nhân/bác sĩ/cơ sở; lịch lệch ngữ cảnh là dữ liệu hỏng.
import { findEncounterContextIdentity } from "@/server/clinical/encounter-context";
import { toClinicDate } from "@/shared/clinic/schedule";
import type { Appointment, DisplayStatus, OpenReason } from "@/shared/clinic/types";
import { storeError } from "./errors";
import type { ClinicActor, ContextLookup } from "./ports";

export const clinicalContextLookup: ContextLookup = {
  find(actor, appointmentId) {
    const found = findEncounterContextIdentity(actor.facility_id, appointmentId);
    return found
      ? { appointment_id: found.appointmentId, patient_id: found.patientId, facility_id: found.facilityId, doctor_id: found.doctorId }
      : null;
  },
};

const OPEN_STATUSES: DisplayStatus[] = ["scheduled", "in_progress", "waiting_results"];

/** Quyết định mở được hay không. `now` là ISO có offset; ca chờ kết quả từ hôm trước vẫn tiếp tục được. */
export function openEligibility(
  actor: ClinicActor,
  appointment: Appointment,
  status: DisplayStatus,
  now: string,
  contexts: ContextLookup,
): { can_open: boolean; open_reason: OpenReason } {
  const result = (open_reason: OpenReason) => ({ can_open: open_reason === "eligible", open_reason });
  if (status === "cancelled") return result("cancelled");
  if (status === "unknown") return result("unknown");
  if (!OPEN_STATUSES.includes(status)) return result("terminal");
  if (toClinicDate(appointment.starts_at) > toClinicDate(now)) return result("future");
  const meta = contexts.find(actor, appointment.id);
  if (!meta) return result("no_context");
  if (
    meta.patient_id !== appointment.patient_id ||
    meta.doctor_id !== appointment.doctor_id ||
    meta.facility_id !== appointment.facility_id
  ) {
    throw storeError(`Lịch ${appointment.id} lệch ngữ cảnh khám về bệnh nhân, bác sĩ hoặc cơ sở`);
  }
  return result("eligible");
}
