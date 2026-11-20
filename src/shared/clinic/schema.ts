import { z } from "zod";

/** Kiểm ngày lịch thực: từ chối 2026-02-30. */
function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

export const ClinicDateSchema = z
  .string()
  .refine(isRealDate, "Ngày phải dạng YYYY-MM-DD và là ngày lịch thực");

/** Timestamp ISO bắt buộc có offset (Z hoặc ±hh:mm). */
export const TimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    "Timestamp phải có offset múi giờ",
  )
  .refine((s) => !Number.isNaN(Date.parse(s)), "Timestamp không hợp lệ");

export const DisplayStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "waiting_results",
  "completed",
  "cancelled",
  "admitted",
  "emergency_transfer",
  "facility_transfer",
  "unknown",
]);

export const InsuranceInfoSchema = z.object({
  known: z.boolean(),
  enrolled: z.boolean().nullable(),
  provider: z.string().nullable(),
  plan: z.string().nullable(),
  member_code: z.string().nullable(),
  valid_from: ClinicDateSchema.nullable(),
  valid_to: ClinicDateSchema.nullable(),
});

export const PatientProfileSchema = z.object({
  id: z.string().min(1),
  facility_id: z.string().min(1),
  full_name: z.string().min(1),
  date_of_birth: ClinicDateSchema.nullable(),
  gender: z.string().nullable(),
  insurance: z.object({ bhyt: InsuranceInfoSchema, bao_lanh: InsuranceInfoSchema }),
  /** Trường giả phục vụ demo luồng che PII; tùy chọn để fixture cũ vẫn hợp lệ. */
  dong_y_xu_ly_ai: z.object({ trang_thai: z.boolean(), luc: z.string() }).optional(),
  nguoi_nha: z.array(z.object({ ho_ten: z.string(), quan_he: z.string(), dien_thoai: z.string() })).optional(),
  noi_lam_viec: z.string().optional(),
  dia_chi: z.string().optional(),
  dien_thoai: z.string().optional(),
});

export const AppointmentSchema = z.object({
  id: z.string().min(1),
  facility_id: z.string().min(1),
  patient_id: z.string().min(1),
  doctor_id: z.string().min(1),
  starts_at: TimestampSchema,
  ends_at: TimestampSchema.nullable(),
  content: z.string(),
  scheduling_status: z.enum(["scheduled", "cancelled"]),
});

/**
 * Dòng fixture lịch: Appointment kèm `encounter_status` (trạng thái Encounter giả,
 * vì nhánh này chưa có module Encounter). null = chưa có Encounter.
 */
export const AppointmentFixtureRowSchema = AppointmentSchema.extend({
  encounter_status: z.string().nullable(),
});

export const PatientsFixtureSchema = z.array(PatientProfileSchema);
export const AppointmentsFixtureSchema = z.array(AppointmentFixtureRowSchema);
