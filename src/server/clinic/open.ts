import "server-only";
// Mở (hoặc dùng lại) phiếu khám cho một lịch. Chính sách mở lấy từ cùng nơi với danh sách (appointment-context),
// định danh bệnh nhân/bác sĩ/cơ sở lấy từ ngữ cảnh khám của lớp clinical, không bao giờ từ client.
import { createWalkInContext, resolveEncounterContext } from "@/server/clinical/encounter-context";
import { ClinicalError } from "@/server/clinical/repository";
import { openEncounter } from "@/server/clinical/service";
import type { ClinicalResponse, EncounterContext } from "@/shared/clinical/api";
import type { OpenReason } from "@/shared/clinic/types";
import { ClinicHttpError, storeError } from "./errors";
import type { ClinicActor } from "./ports";
import { type ClinicServiceDeps, context, loadAppointment } from "./service";

export interface OpenDeps extends ClinicServiceDeps {
  /** Chỉ cho test. */
  resolveContext?: (actor: ClinicActor, appointmentId: string) => EncounterContext;
  open?: (context: EncounterContext) => ClinicalResponse;
}

const REASON_TEXT: Record<Exclude<OpenReason, "eligible">, string> = {
  cancelled: "Lịch đã hủy nên không mở được phiếu khám.",
  future: "Lịch chưa tới ngày khám nên chưa mở được phiếu.",
  terminal: "Lượt khám đã kết thúc nên không mở lại được phiếu mới.",
  unknown: "Trạng thái lượt khám chưa xác định nên chưa mở được phiếu.",
  no_context: "Lịch này chưa có ngữ cảnh khám mẫu để mở phiếu.",
};

export function openAppointmentEncounter(
  actor: ClinicActor,
  appointmentId: string,
  deps: OpenDeps = {},
): { encounter_id: string; appointment_id: string } {
  // Kiểm lại toàn bộ chính sách ở server, không tin danh sách mà trình duyệt đã nhận trước đó.
  const item = loadAppointment(actor, appointmentId, deps);
  if (!item.can_open) {
    throw new ClinicHttpError(409, REASON_TEXT[item.open_reason as Exclude<OpenReason, "eligible">]);
  }
  try {
    const context = (deps.resolveContext ?? ((a, id) => resolveEncounterContext({ doctorId: a.doctor_id, facilityId: a.facility_id }, id)))(actor, appointmentId);
    if (context.patientId !== item.appointment.patient_id) throw storeError(`Ngữ cảnh ${appointmentId} lệch bệnh nhân của lịch`);
    const response = (deps.open ?? openEncounter)(context);
    return { encounter_id: response.record.id, appointment_id: appointmentId };
  } catch (error) {
    if (error instanceof ClinicalError) {
      if (error.status === 409 || error.status === 403 || error.status === 404) throw new ClinicHttpError(error.status, error.message);
      throw storeError(error.message);
    }
    throw error;
  }
}

/** "Tạo mới phiếu khám": phiếu ngoại trú mới của bệnh nhân, không gắn lịch hẹn. Mỗi lần gọi tạo một phiếu mới. */
export function createPatientEncounter(actor: ClinicActor, patientId: string, deps: ClinicServiceDeps = {}): { encounter_id: string; appointment_id: string } {
  const { repo } = context(deps);
  if (!repo.getPatient(actor.facility_id, patientId)) throw new ClinicHttpError(404, "Không tìm thấy bệnh nhân.");
  try {
    const trusted = createWalkInContext({ doctorId: actor.doctor_id, facilityId: actor.facility_id }, patientId);
    const response = openEncounter(trusted);
    return { encounter_id: response.record.id, appointment_id: trusted.appointmentId };
  } catch (error) {
    if (error instanceof ClinicalError) {
      if (error.status === 409 || error.status === 403 || error.status === 404) throw new ClinicHttpError(error.status, error.message);
      throw storeError(error.message);
    }
    throw error;
  }
}
