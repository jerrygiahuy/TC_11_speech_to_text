import "server-only";
// DTO đọc cho dashboard và trang bệnh nhân. Chỉ đọc; mọi kết quả đã lọc theo actor (bác sĩ + cơ sở).
// Lịch/bệnh nhân ngoài phạm vi hoặc không tồn tại đều trả 404 như nhau để không lộ dữ liệu.
import { ClinicDateSchema } from "@/shared/clinic/schema";
import { sortHistory } from "@/shared/clinic/history";
import {
  displayStatus,
  selectDayAppointments,
  sortAppointments,
  summarizeAppointments,
  toClinicDate,
} from "@/shared/clinic/schedule";
import type {
  Appointment,
  AppointmentItem,
  ClinicDate,
  DashboardData,
  HistorySummary,
  PatientPageData,
  PatientProfile,
} from "@/shared/clinic/types";
import { ClinicHttpError, notFound, storeError } from "./errors";
import type { ClinicActor, EncounterRef } from "./ports";
import { type ClinicRepository, getClinicRepository } from "./repository";

export interface ClinicServiceDeps {
  repo?: ClinicRepository;
  /** ISO có offset; mặc định đồng hồ hệ thống. Test truyền cố định. */
  now?: () => string;
}

const NO_SUMMARY = "Chưa có tóm tắt";

function context(deps: ClinicServiceDeps) {
  return {
    repo: deps.repo ?? getClinicRepository(),
    now: deps.now ?? (() => new Date().toISOString()),
  };
}

function buildItem(
  repo: ClinicRepository,
  actor: ClinicActor,
  appointment: Appointment,
  patient: PatientProfile,
  facilityEncounters: EncounterRef[],
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
  return {
    appointment,
    patient,
    doctor_name: repo.doctorName(appointment.doctor_id),
    encounter_id: own?.id ?? null,
    status: displayStatus(appointment.scheduling_status, own?.status ?? null),
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
  const { repo, now } = context(deps);
  const encounters = repo.listFacilityEncounters(actor.facility_id);
  const items = repo
    .listDoctorAppointments(actor)
    .map((a) => buildItem(repo, actor, a, patientOrThrow(repo, actor, a.patient_id), encounters));
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
  const { repo } = context(deps);
  const appointment = repo.getDoctorAppointment(actor, appointmentId);
  if (!appointment) throw notFound();
  const patient = patientOrThrow(repo, actor, appointment.patient_id);
  return buildItem(repo, actor, appointment, patient, repo.listFacilityEncounters(actor.facility_id));
}

export function loadPatientPage(
  actor: ClinicActor,
  patientId: string,
  selectedAppointmentId?: string,
  deps: ClinicServiceDeps = {},
): PatientPageData {
  const { repo, now } = context(deps);
  const patient = repo.getPatient(actor.facility_id, patientId);
  if (!patient) throw notFound();

  const mine = repo
    .listDoctorAppointments(actor)
    .filter((a) => a.patient_id === patient.id);
  if (selectedAppointmentId !== undefined && !mine.some((a) => a.id === selectedAppointmentId)) {
    throw notFound();
  }

  const encounters = repo.listFacilityEncounters(actor.facility_id);
  const items = mine.map((a) => buildItem(repo, actor, a, patient, encounters));

  // Tạm: lịch còn khám được = chưa hủy/kết thúc và không ở tương lai. Policy mở phiếu thật thuộc ưu tiên 1.
  const today = toClinicDate(now());
  const eligibleAppointments = sortAppointments(
    items.filter(
      (i) =>
        (i.status === "scheduled" || i.status === "in_progress" || i.status === "waiting_results") &&
        toClinicDate(i.appointment.starts_at) <= today,
    ),
  );

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
