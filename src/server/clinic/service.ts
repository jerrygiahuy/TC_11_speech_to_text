import "server-only";
// DTO đọc cho dashboard và trang bệnh nhân. Chỉ đọc; mọi kết quả đã lọc theo actor (bác sĩ + cơ sở).
// Lịch/bệnh nhân ngoài phạm vi hoặc không tồn tại đều trả 404 như nhau để không lộ dữ liệu.
import { ClinicDateSchema } from "@/shared/clinic/schema";
import { sortHistory } from "@/shared/clinic/history";
import { projectHistoricalEncounter } from "@/shared/clinic/projection";
import {
  displayStatus,
  selectDayAppointments,
  sortAppointments,
  summarizeAppointments,
} from "@/shared/clinic/schedule";
import type {
  Appointment,
  AppointmentItem,
  ClinicDate,
  DashboardData,
  HistoricalEncounterViewModel,
  HistorySummary,
  PatientPageData,
  PatientProfile,
} from "@/shared/clinic/types";
import { ClinicHttpError, notFound, storeError } from "./errors";
import { clinicalContextLookup, openEligibility } from "./appointment-context";
import type { ClinicActor, ContextLookup, EncounterRef } from "./ports";
import { type ClinicRepository, getClinicRepository } from "./repository";

export interface ClinicServiceDeps {
  repo?: ClinicRepository;
  /** ISO có offset; mặc định đồng hồ hệ thống. Test truyền cố định. */
  now?: () => string;
  /** Tra ngữ cảnh khám; mặc định là ngữ cảnh của lớp clinical. */
  contexts?: ContextLookup;
}

const NO_SUMMARY = "Chưa có tóm tắt";

export function context(deps: ClinicServiceDeps) {
  return {
    repo: deps.repo ?? getClinicRepository(),
    now: deps.now ?? (() => new Date().toISOString()),
    contexts: deps.contexts ?? clinicalContextLookup,
  };
}

function buildItem(
  repo: ClinicRepository,
  actor: ClinicActor,
  appointment: Appointment,
  patient: PatientProfile,
  facilityEncounters: EncounterRef[],
  now: string,
  contexts: ContextLookup,
): AppointmentItem {
  const own = facilityEncounters.find((e) => e.appointment_id === appointment.id);
  // Encounter gắn đúng mã lịch nhưng lệch bệnh nhân/cơ sở/bác sĩ là dữ liệu hỏng: báo lỗi,
  // không gắn nhầm trạng thái và mã phiếu của người khác vào lịch này.
  if (
    own &&
    (own.patient_id !== appointment.patient_id ||
      own.facility_id !== appointment.facility_id ||
      own.doctor_id !== appointment.doctor_id)
  ) {
    throw storeError(`Encounter ${own.id} gắn lịch ${appointment.id} nhưng lệch bệnh nhân, cơ sở hoặc bác sĩ`);
  }
  const status = displayStatus(appointment.scheduling_status, own?.status ?? null);
  return {
    appointment,
    patient,
    doctor_name: repo.doctorName(appointment.doctor_id),
    encounter_id: own?.id ?? null,
    status,
    ...openEligibility(actor, appointment, status, now, contexts),
    // Chỉ phiếu khác của cùng bệnh nhân có giờ khám trước giờ hẹn đang xem mới là "lần khám trước".
    has_prior_encounter: facilityEncounters.some(
      (e) =>
        e.patient_id === appointment.patient_id &&
        e.appointment_id !== appointment.id &&
        Date.parse(e.encounter_at) < Date.parse(appointment.starts_at),
    ),
  };
}

function patientOrThrow(repo: ClinicRepository, actor: ClinicActor, id: string): PatientProfile {
  const p = repo.getPatient(actor.facility_id, id);
  // Lịch trỏ tới bệnh nhân không có trong cơ sở: dữ liệu hỏng, không âm thầm bỏ ca.
  if (!p) throw storeError(`lịch trỏ tới bệnh nhân không có trong cơ sở: ${id}`);
  return p;
}

export function loadDashboard(
  actor: ClinicActor,
  date: ClinicDate,
  deps: ClinicServiceDeps = {},
): DashboardData {
  if (!ClinicDateSchema.safeParse(date).success) {
    throw new ClinicHttpError(400, "Ngày phải dạng YYYY-MM-DD và là ngày lịch thực.");
  }
  const { repo, now, contexts } = context(deps);
  const at = now();
  const encounters = repo.listFacilityEncounters(actor.facility_id);
  const items = repo
    .listDoctorAppointments(actor)
    .map((a) => buildItem(repo, actor, a, patientOrThrow(repo, actor, a.patient_id), encounters, at, contexts));
  const { appointments, carriedOpenItems } = selectDayAppointments(items, date);
  return {
    date,
    timezone: "Asia/Ho_Chi_Minh",
    doctor: { id: actor.doctor_id, name: repo.doctorName(actor.doctor_id) },
    facility: { id: actor.facility_id, name: repo.facilityName(actor.facility_id) },
    appointments,
    carriedOpenItems,
    totals: summarizeAppointments(appointments),
    fetchedAt: now(),
  };
}

export function loadAppointment(
  actor: ClinicActor,
  appointmentId: string,
  deps: ClinicServiceDeps = {},
): AppointmentItem {
  const { repo, now, contexts } = context(deps);
  const appointment = repo.getDoctorAppointment(actor, appointmentId);
  if (!appointment) throw notFound();
  const patient = patientOrThrow(repo, actor, appointment.patient_id);
  return buildItem(repo, actor, appointment, patient, repo.listFacilityEncounters(actor.facility_id), now(), contexts);
}

export function loadPatientPage(
  actor: ClinicActor,
  patientId: string,
  selectedAppointmentId?: string,
  deps: ClinicServiceDeps = {},
): PatientPageData {
  const { repo, now, contexts } = context(deps);
  const patient = repo.getPatient(actor.facility_id, patientId);
  if (!patient) throw notFound();

  const mine = repo
    .listDoctorAppointments(actor)
    .filter((a) => a.patient_id === patient.id);
  if (selectedAppointmentId !== undefined && !mine.some((a) => a.id === selectedAppointmentId)) {
    throw notFound();
  }

  const encounters = repo.listFacilityEncounters(actor.facility_id);
  const at = now();
  const items = mine.map((a) => buildItem(repo, actor, a, patient, encounters, at, contexts));
  // Cùng một chính sách mở phiếu với popup lịch hẹn và thao tác mở; client không tự quyết.
  const eligibleAppointments = sortAppointments(items.filter((i) => i.can_open));

  const contentOf = new Map(mine.map((a) => [a.id, a.content]));
  const history: HistorySummary[] = sortHistory(
    repo
      .listPatientEncounters(actor.facility_id, patient.id)
      .filter((e) => selectedAppointmentId === undefined || e.appointment_id !== selectedAppointmentId)
      .map((e) => ({
        id: e.id,
        appointment_id: e.appointment_id,
        encounter_at: e.encounter_at,
        summary:
          e.summary ?? (e.appointment_id ? contentOf.get(e.appointment_id) : undefined) ?? NO_SUMMARY,
        doctor_name: repo.doctorName(e.doctor_id),
        status: displayStatus("scheduled", e.status),
      })),
  );

  return { patient, eligibleAppointments, history, selectedAppointmentId: selectedAppointmentId ?? null };
}

/** Phiếu cũ của đúng bệnh nhân, cùng cơ sở (gồm phiếu của bác sĩ khác), chiếu sang dạng chỉ đọc. Không đổi dữ liệu. */
export function loadHistoricalEncounter(
  actor: ClinicActor,
  patientId: string,
  encounterId: string,
  deps: ClinicServiceDeps = {},
): HistoricalEncounterViewModel {
  const { repo } = context(deps);
  const patient = repo.getPatient(actor.facility_id, patientId);
  if (!patient) throw notFound();
  const record = repo.readEncounter(actor.facility_id, patientId, encounterId);
  if (!record) throw notFound();
  return projectHistoricalEncounter(record, {
    patient,
    doctor_name: repo.doctorName(record.examiner_id),
    facility_name: repo.facilityName(actor.facility_id),
  });
}
