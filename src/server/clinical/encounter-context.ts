import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ClinicalActor, EncounterContext } from "@/shared/clinical/api";
import type { Encounter } from "@/shared/clinical/types";
import { loadEncounterEformData } from "@/server/du-lieu/eform";
import { ClinicalError } from "./repository";

const history = z.object({ ngay: z.string(), bac_si: z.string(), khoa: z.string(), noi_dung: z.string() });
const resultItem = z.object({
  nhom: z.string().optional(), bo_xet_nghiem: z.string().optional(), ten: z.string(), ket_qua: z.string(), tham_chieu: z.string().optional(), don_vi: z.string().optional(),
  thoi_gian: z.string().optional(), nguoi_tra_ket_qua: z.string().optional(), ket_luan: z.string().optional(),
});
const result = z.array(z.object({ ngay: z.string(), muc: z.array(resultItem) }));
const nullableNumber = z.number().nullable();
const medicineHistory = z.object({ ten_thuoc: z.string(), lieu: z.string(), duong_dung: z.string(), ngay: z.string() });
const caSchema = z.object({
  dang_nhap: z.string(), co_so: z.string(), pid: z.string(), ma_luot_kham: z.string(), ho_ten: z.string(), gioi_tinh: z.string(), canh_bao_di_ung: z.string(),
  chinh_sua_cuoi: z.object({ nguoi: z.string(), luc: z.string() }), danh_gia_ban_dau: z.array(z.object({ nhan: z.string(), gia_tri: z.string() })),
  sinh_hieu: z.object({ mach: nullableNumber, nhiet_do: nullableNumber, ha_tam_thu: nullableNumber, ha_tam_truong: nullableNumber, spo2: nullableNumber, nhip_tho: nullableNumber, chieu_cao: nullableNumber, can_nang: nullableNumber, bmi: nullableNumber.default(null) }),
  bac_si_kham: z.string(), phong_kham: z.string(), bac_si_chinh: z.string(), trang_thai: z.string(),
  lich_su: z.object({ tien_su_ban_than: z.array(history), tien_su_gia_dinh: z.array(history), benh_su: z.array(history), di_ung: z.array(z.object({ ngay: z.string(), loai_phieu: z.string(), loai: z.string(), thong_tin: z.string(), nguoi: z.string() })), thuoc: z.array(medicineHistory).default([]) }),
  chan_doan_oh: z.string().default(""),
  xet_nghiem: result, chan_doan_hinh_anh: result, can_lam_sang: result, dong_bo_cls: z.string(), gia_tri: z.record(z.string(), z.string()),
}).passthrough();
const contextSchema = z.object({
  appointment_id: z.string().min(1), patient_id: z.string().min(1), facility_id: z.string().min(1), doctor_id: z.string().min(1), age_months: z.number().int().positive(), ca: caSchema,
});
const fixtureSchema = z.object({ version: z.literal(1), synthetic: z.literal(true), contexts: z.array(contextSchema) });
type ContextRow = z.infer<typeof contextSchema>;

export function validateEncounterContexts(value: unknown) {
  const fixture = fixtureSchema.parse(value);
  const appointments = new Set<string>();
  const patients = new Map<string, string>();
  for (const item of fixture.contexts) {
    const key = JSON.stringify([item.facility_id, item.appointment_id]);
    if (appointments.has(key) || item.ca.pid !== item.patient_id || item.ca.ma_luot_kham !== item.appointment_id || item.ca.dang_nhap !== item.doctor_id) throw new ClinicalError("Ngữ cảnh lượt khám không nhất quán.", 409);
    appointments.add(key);
    const patient = JSON.stringify([item.facility_id, item.patient_id]);
    const identity = JSON.stringify([item.ca.ho_ten, item.ca.gioi_tinh, item.age_months]);
    if (patients.has(patient) && patients.get(patient) !== identity) throw new ClinicalError("Danh tính bệnh nhân không nhất quán.", 409);
    patients.set(patient, identity);
  }
  return fixture;
}

/** Ngữ cảnh của phiếu "khám mới" (không theo lịch hẹn), sinh lúc chạy, nằm cạnh phiếu thật và đã gitignore cùng data/clinical. */
function walkInDir() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "clinical", "walk-in-contexts");
}

function loadWalkInContexts(): ContextRow[] {
  const dir = walkInDir();
  if (!fs.existsSync(dir)) return [];
  const rows: ContextRow[] = [];
  for (const name of fs.readdirSync(dir).filter(file => file.endsWith(".json")).sort()) {
    const parsed = contextSchema.safeParse(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

function loadContexts(): ContextRow[] {
  const base = validateEncounterContexts(JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "eform", "encounter-contexts.json"), "utf8"))).contexts;
  const taken = new Set(base.map(row => JSON.stringify([row.facility_id, row.appointment_id])));
  return [...base, ...loadWalkInContexts().filter(row => !taken.has(JSON.stringify([row.facility_id, row.appointment_id])))];
}

/**
 * Tạo ngữ cảnh cho một phiếu khám ngoại trú mới của bệnh nhân: lấy danh tính, tiền sử và cận lâm sàng từ ngữ cảnh gần nhất
 * của chính bệnh nhân (cùng cơ sở, cùng bác sĩ), bỏ nội dung lượt cũ, cấp mã lượt riêng. Chỉ dữ liệu giả.
 */
export function createWalkInContext(actor: ClinicalActor, patientId: string): EncounterContext {
  const base = [...loadContexts()].reverse().find(row => row.patient_id === patientId && row.facility_id === actor.facilityId && row.doctor_id === actor.doctorId);
  if (!base) throw new ClinicalError("Chưa có hồ sơ mẫu của bệnh nhân này để tạo phiếu mới.", 409);
  const appointmentId = `LK-NEW-${randomUUID().slice(0, 8).toUpperCase()}`;
  const ca = structuredClone(base.ca);
  ca.ma_luot_kham = appointmentId;
  ca.gia_tri = {};
  ca.trang_thai = "Đang khám";
  const row: ContextRow = { ...base, appointment_id: appointmentId, ca };
  const dir = walkInDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${appointmentId}.json`);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(row, null, 2));
  fs.renameSync(`${file}.tmp`, file);
  return resolveEncounterContext(actor, appointmentId);
}

export function getDemoClinicalActor(): ClinicalActor {
  return { doctorId: "user_bs01", facilityId: "facility-prototype" };
}

/** Tra nhanh định danh của ngữ cảnh theo mã lịch, không dựng dữ liệu phiếu; null nếu cơ sở này không có. */
export function findEncounterContextIdentity(facilityId: string, appointmentId: string): { appointmentId: string; patientId: string; facilityId: string; doctorId: string } | null {
  const item = loadContexts().find(row => row.appointment_id === appointmentId && row.facility_id === facilityId);
  return item ? { appointmentId: item.appointment_id, patientId: item.patient_id, facilityId: item.facility_id, doctorId: item.doctor_id } : null;
}

export function resolveEncounterContext(actor: ClinicalActor, appointmentId: string): EncounterContext {
  const contexts = loadContexts();
  const item = contexts.find(row => row.appointment_id === appointmentId && row.facility_id === actor.facilityId);
  if (!item) {
    if (contexts.some(row => row.appointment_id === appointmentId)) throw new ClinicalError("Không có quyền truy cập lượt khám tại cơ sở này.", 403);
    throw new ClinicalError("Không tìm thấy mã khám.", 404);
  }
  if (item.doctor_id !== actor.doctorId) throw new ClinicalError("Lượt khám không được phân công cho bác sĩ này.", 403);
  return { appointmentId: item.appointment_id, patientId: item.patient_id, facilityId: item.facility_id, doctorId: item.doctor_id, data: loadEncounterEformData(item.ca, item.doctor_id) };
}

/** Metadata stays server-side, outside the model conversation and UI patient fixture shape. */
export function encounterAgeMonths(context: EncounterContext): number {
  const item = loadContexts().find(row => row.facility_id === context.facilityId && row.appointment_id === context.appointmentId && row.patient_id === context.patientId && row.doctor_id === context.doctorId);
  if (!item) throw new ClinicalError("Ngữ cảnh lượt khám không hợp lệ.", 409);
  return item.age_months;
}

export function resolveEncounterContextForRecord(actor: ClinicalActor, record: Encounter): EncounterContext {
  if (record.facility_id !== actor.facilityId || record.examiner_id !== actor.doctorId) throw new ClinicalError("Không có quyền truy cập hồ sơ này.", 403);
  if (!record.appointment_id) throw new ClinicalError("Hồ sơ chưa gắn mã khám.", 409);
  const context = resolveEncounterContext(actor, record.appointment_id);
  if (record.patient_id !== context.patientId) throw new ClinicalError("Hồ sơ không khớp bệnh nhân của mã khám.", 409);
  return context;
}

export function listEncounterContexts(actor: ClinicalActor): EncounterContext[] {
  return loadContexts().filter(row => row.facility_id === actor.facilityId && row.doctor_id === actor.doctorId).map(row => resolveEncounterContext(actor, row.appointment_id));
}
