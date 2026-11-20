import "server-only";
// Chỉ ĐỌC: không có hàm nào tạo/sửa/xóa. Validate bằng Zod (Task 1), lỗi store ném ClinicHttpError 500.
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { AppointmentSchema, PatientsFixtureSchema } from "@/shared/clinic/schema";
import type { Encounter } from "@/shared/clinical/types";
import type { Appointment, PatientProfile } from "@/shared/clinic/types";
import { storeError } from "./errors";
import { createClinicalEncounterSource } from "./clinical-source";
import { DEFAULT_CLINIC_DATA_DIR } from "./fixture-source";
import type { ClinicActor, EncounterRef, EncounterSource } from "./ports";

const DirectorySchema = z.object({
  facilities: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
  doctors: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
});
// AppointmentSchema bỏ qua trường `encounter_status` của fixture: lịch không mang trạng thái Encounter.
const AppointmentListSchema = z.array(AppointmentSchema);

export interface ClinicRepository {
  /** Lịch của đúng bác sĩ ở đúng cơ sở. */
  listDoctorAppointments(actor: ClinicActor): Appointment[];
  /** null nếu không tồn tại hoặc ngoài phạm vi bác sĩ/cơ sở. */
  getDoctorAppointment(actor: ClinicActor, appointmentId: string): Appointment | null;
  /** null nếu không tồn tại hoặc thuộc cơ sở khác. Tên chỉ để hiển thị, định danh là `id` chuỗi. */
  getPatient(facilityId: string, patientId: string): PatientProfile | null;
  /** Mọi phiếu đã lưu của bệnh nhân ở cơ sở này (gồm phiếu bác sĩ khác). */
  listPatientEncounters(facilityId: string, patientId: string): EncounterRef[];
  listFacilityEncounters(facilityId: string): EncounterRef[];
  /** Phiếu đầy đủ của đúng bệnh nhân và cơ sở; null nếu không có (kể cả nguồn không hỗ trợ). */
  readEncounter(facilityId: string, patientId: string, encounterId: string): Encounter | null;
  doctorName(doctorId: string): string;
  facilityName(facilityId: string): string;
}

export interface ClinicRepositoryOptions {
  dataDir?: string;
  source?: EncounterSource;
}

function readValidated<S extends z.ZodType>(dir: string, name: string, schema: S): z.output<S> {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
  } catch (e) {
    throw storeError(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw storeError(`${name}: ${parsed.error.message}`);
  return parsed.data;
}

export function createClinicRepository(options: ClinicRepositoryOptions = {}): ClinicRepository {
  const dir = options.dataDir ?? DEFAULT_CLINIC_DATA_DIR;
  const source = options.source ?? createClinicalEncounterSource();
  // Đọc lại mỗi lần gọi: dữ liệu demo nhỏ, và màn đọc luôn thấy fixture mới nhất.
  const appointments = () => readValidated(dir, "appointments.json", AppointmentListSchema);
  const patients = () => readValidated(dir, "patients.json", PatientsFixtureSchema);
  const directory = () => readValidated(dir, "directory-demo.json", DirectorySchema);

  return {
    listDoctorAppointments: (actor) =>
      appointments().filter(
        (a) => a.doctor_id === actor.doctor_id && a.facility_id === actor.facility_id,
      ),
    getDoctorAppointment: (actor, appointmentId) =>
      appointments().find(
        (a) =>
          a.id === appointmentId &&
          a.doctor_id === actor.doctor_id &&
          a.facility_id === actor.facility_id,
      ) ?? null,
    getPatient: (facilityId, patientId) =>
      patients().find((p) => p.id === patientId && p.facility_id === facilityId) ?? null,
    listPatientEncounters: (facilityId, patientId) =>
      source
        .listByFacility(facilityId)
        .filter((e) => e.facility_id === facilityId && e.patient_id === patientId),
    listFacilityEncounters: (facilityId) =>
      source.listByFacility(facilityId).filter((e) => e.facility_id === facilityId),
    readEncounter: (facilityId, patientId, encounterId) => {
      const record = source.read?.(facilityId, encounterId) ?? null;
      return record && record.facility_id === facilityId && record.patient_id === patientId ? record : null;
    },
    doctorName: (doctorId) => directory().doctors.find((d) => d.id === doctorId)?.name ?? doctorId,
    facilityName: (facilityId) =>
      directory().facilities.find((f) => f.id === facilityId)?.name ?? facilityId,
  };
}

let defaultRepository: ClinicRepository | undefined;
export function getClinicRepository(): ClinicRepository {
  return (defaultRepository ??= createClinicRepository());
}

/** Chỉ cho test: thay kho mặc định (route và trang dùng kho này); truyền null để trở về kho thật. */
export function setClinicRepositoryForTest(repo: ClinicRepository | null): void {
  defaultRepository = repo ?? undefined;
}
