import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { emptyDefinition, emptyEncounter } from "@/shared/clinical/schema";
import { applyEformSnapshot, parseEformSnapshot, projectEform } from "@/shared/clinical/eform";
import type { Encounter, History, Result, Source } from "@/shared/clinical/types";
import type { ClinicalActor, ClinicalResponse, EncounterContext, EncounterSummary } from "@/shared/clinical/api";
import { encounterAgeMonths, getDemoClinicalActor, resolveEncounterContext, resolveEncounterContextForRecord } from "./encounter-context";
import { ClinicalError, ClinicalRepository } from "./repository";
import { applyClinicalChanges, proposeClinicalChanges, StaleChangeError, type ClinicalChangeSet } from "@/shared/clinical/changes";
import { loadClinicalRun } from "./extraction";

const repository = new ClinicalRepository();
const LIFECYCLE = new Set<Encounter["status"]>(["cho_kq_cls", "hoan_thanh_kham"]);
const writeSchema = z.object({ id: z.uuid().optional(), expected_revision: z.number().int().positive().optional(), snapshot: z.unknown(), tom_tat: z.string().max(20000).nullable().optional() }).strict();

function seed(context: EncounterContext, now: string): Encounter {
  const { data } = context;
  // Synthetic persona is server-owned. Real sessions/HIS integration is a separate step.
  const base = emptyEncounter({ id: "new", patientId: data.ca.pid, doctorId: data.ca.dang_nhap, now });
  base.appointment_id = context.appointmentId;
  base.facility_id = context.facilityId;
  base.tuoi_thang_tai_kham = encounterAgeMonths(context);
  base.room_id = "prototype-tim-mach-01";
  base.sinh_hieu.source_system = "synthetic-fixture";
  base.sinh_hieu.source_record_id = context.appointmentId;
  const units = { mach: "/min", nhiet_do: "Cel", ha_tam_thu: "mm[Hg]", ha_tam_truong: "mm[Hg]", spo2: "%", nhip_tho: "/min", chieu_cao: "cm", can_nang: "kg" } as const;
  for (const [key, unit] of Object.entries(units)) base.sinh_hieu[key as keyof typeof units] = { value: data.ca.sinh_hieu[key as keyof typeof units], unit };
  const { can_nang, chieu_cao } = data.ca.sinh_hieu;
  if (chieu_cao > 0 && can_nang > 0) base.sinh_hieu.bmi = { value: Math.round(can_nang / ((chieu_cao / 100) ** 2) * 10) / 10, unit: "kg/m2" };
  base.danh_gia_ban_dau = data.ca.danh_gia_ban_dau.map(item => ({ ...item, source_record_id: context.appointmentId }));
  for (const group of ["tien_su_ban_than", "tien_su_gia_dinh", "benh_su"] as const) for (const item of data.ca.lich_su[group]) {
    const row = emptyDefinition<History>("history");
    Object.assign(row, { id: randomUUID(), nhom: group, ngay: toDate(item.ngay), noi_dung: item.noi_dung, source_system: "synthetic-fixture", source_record_id: context.appointmentId });
    base.lich_su.push(row);
  }
  for (const item of data.ca.lich_su.di_ung) {
    const row = emptyDefinition<History>("history");
    Object.assign(row, { id: randomUUID(), nhom: "di_ung", ngay: toDate(item.ngay), noi_dung: item.thong_tin, loai_phieu: item.loai_phieu, loai_di_ung: item.loai, source_system: "synthetic-fixture", source_record_id: context.appointmentId });
    base.lich_su.push(row);
  }
  for (const group of ["xet_nghiem", "chan_doan_hinh_anh", "can_lam_sang"] as const) for (const day of data.ca[group]) for (const item of day.muc) {
    const row = emptyDefinition<Result>("result");
    Object.assign(row, { id: randomUUID(), nhom: group, ten: item.ten, ket_qua_text: item.ket_qua, ngay: toDate(day.ngay), source_system: "synthetic-fixture", source_record_id: context.appointmentId, trang_thai: "chinh_thuc" });
    base.ket_qua.push(row);
  }
  return base;
}

function toDate(day: string): string | null {
  const match = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(day);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export function readClinicalForActor(actor: ClinicalActor, id: string, store = repository): ClinicalResponse {
  const record = store.read(id);
  const context = resolveEncounterContextForRecord(actor, record);
  const latest = record.ai_runs.at(-1);
  let latest_ai = null;
  if (latest) { try { latest_ai = loadClinicalRun(latest.id); } catch { /* Saved note still opens if an older artifact is unavailable. */ } }
  return { record, snapshot: projectEform(record), latest_ai, context, data: context.data };
}

export function readClinical(id: string, store = repository): ClinicalResponse {
  return readClinicalForActor(getDemoClinicalActor(), id, store);
}

export function openEncounter(context: EncounterContext, store = repository): ClinicalResponse {
  // Re-resolve server fixture; a caller cannot smuggle identity or patient content in a context object.
  const trusted = resolveEncounterContext({ doctorId: context.doctorId, facilityId: context.facilityId }, context.appointmentId);
  if (trusted.patientId !== context.patientId) throw new ClinicalError("Ngữ cảnh không khớp bệnh nhân của mã khám.", 409);
  const now = new Date().toISOString();
  const snapshot = parseEformSnapshot({ fields: Object.fromEntries(Object.entries(trusted.data.ca.gia_tri).map(([key, value]) => [key, { value, nguon: "cu" }])), chiDinh: [], trangThai: trusted.data.ca.trang_thai });
  const initial = applyEformSnapshot(seed(trusted, now), snapshot, { now, newId: randomUUID, services: trusted.data.danhMuc.dichVu, icd: trusted.data.icd10 });
  const record = store.openByAppointment(initial);
  return readClinicalForActor({ doctorId: trusted.doctorId, facilityId: trusted.facilityId }, record.id, store);
}

/**
 * Hồ sơ mới (không theo lịch hẹn) cho kho riêng như /demo-luong: dựng như `openEncounter` từ ngữ cảnh fixture đã kiểm,
 * gắn mã lượt mới `appointmentId`, không ghi ngữ cảnh walk-in ra đĩa. Người gọi tự lưu bằng `repo.openByAppointment`.
 */
export function seedNewEncounter(context: EncounterContext, appointmentId: string): Encounter {
  const trusted = resolveEncounterContext({ doctorId: context.doctorId, facilityId: context.facilityId }, context.appointmentId);
  if (trusted.patientId !== context.patientId) throw new ClinicalError("Ngữ cảnh không khớp bệnh nhân của mã khám.", 409);
  const now = new Date().toISOString();
  const base = seed(trusted, now);
  // Mọi chỗ seed ghi mã lượt nguồn đều trỏ sang mã lượt mới, như phiếu "Tạo mới phiếu khám".
  base.appointment_id = appointmentId;
  base.sinh_hieu.source_record_id = appointmentId;
  base.danh_gia_ban_dau = base.danh_gia_ban_dau.map(item => ({ ...item, source_record_id: appointmentId }));
  for (const row of [...base.lich_su, ...base.ket_qua]) row.source_record_id = appointmentId;
  const snapshot = parseEformSnapshot({ fields: {}, chiDinh: [], trangThai: "Đang khám" });
  return applyEformSnapshot(base, snapshot, { now, newId: randomUUID, services: trusted.data.danhMuc.dichVu, icd: trusted.data.icd10 });
}

export function listOpenEncounters(actor: ClinicalActor, store = repository): EncounterSummary[] {
  const rows: EncounterSummary[] = [];
  for (const record of store.list()) {
    if (record.facility_id !== actor.facilityId || record.examiner_id !== actor.doctorId || !["dang_kham", "cho_kq_cls"].includes(record.status)) continue;
    const context = resolveEncounterContextForRecord(actor, record);
    rows.push({ id: record.id, appointment_id: record.appointment_id, patient_id: record.patient_id, patient_name: context.data.ca.ho_ten, facility_id: context.facilityId, status: record.status, revision: record.revision, updated_at: record.audit.updated_at });
  }
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
}

export function saveClinical(value: unknown, store = repository): ClinicalResponse {
  return saveClinicalForActor(getDemoClinicalActor(), value, store);
}

export function saveClinicalForActor(actor: ClinicalActor, value: unknown, store = repository): ClinicalResponse {
  const request = writeSchema.parse(value);
  if (Boolean(request.id) !== Boolean(request.expected_revision)) throw new ClinicalError("Thiếu mã hoặc phiên bản hồ sơ.", 400);
  const snapshot = parseEformSnapshot(request.snapshot);
  const encounterContext = request.id ? resolveEncounterContextForRecord(actor, store.read(request.id)) : resolveEncounterContext(actor, "LK-GIA-0456");
  if (!request.id) {
    const existing = store.findByAppointment(encounterContext.facilityId, encounterContext.appointmentId);
    if (existing) {
      resolveEncounterContextForRecord(actor, existing);
      return { record: existing, snapshot: projectEform(existing), context: encounterContext, data: encounterContext.data };
    }
  }
  const data = encounterContext.data;
  const now = new Date().toISOString();
  const context = { now, newId: randomUUID, services: data.danhMuc.dichVu, icd: data.icd10 };
  const apply = (base: Encounter) => {
    const record = applyEformSnapshot(base, snapshot, context);
    // Chờ kết quả, tiếp tục và hoàn tất chỉ đổi qua /api/clinical/transition (có kiểm tra duyệt và phiên ghi âm), không đổi bằng lưu phiếu.
    if (record.status !== base.status && (LIFECYCLE.has(record.status) || LIFECYCLE.has(base.status))) record.status = base.status;
    if (request.tom_tat !== undefined) {
      if (record.tom_tat !== request.tom_tat) {
        record.nguon_du_lieu = record.nguon_du_lieu.filter(item => item.field_path !== "/tom_tat");
        const source = emptyDefinition<Source>("source");
        Object.assign(source, { field_path: "/tom_tat", nguon: "nhap_tay", source_system: "prototype-eform" });
        record.nguon_du_lieu.push(source);
      }
      record.tom_tat = request.tom_tat?.trim() || null;
    }
    return record;
  };
  let record: Encounter;
  if (request.id) {
    record = store.update(request.id, request.expected_revision!, base => {
      resolveEncounterContextForRecord(actor, base);
      return apply(base);
    }, actor.doctorId, now);
  } else {
    record = store.openByAppointment(apply(seed(encounterContext, now)));
  }
  resolveEncounterContextForRecord(actor, record);
  return { record, snapshot: projectEform(record), context: encounterContext, data };
}

const proposeSchema = z.object({ encounter_id: z.uuid(), run_id: z.uuid() }).strict();
const decideSchema = z.object({ encounter_id: z.uuid(), expected_revision: z.number().int().positive(), run_id: z.uuid(), accepted_ids: z.array(z.string().min(1).max(64)).max(200), rejected_ids: z.array(z.string().min(1).max(64)).max(200) }).strict();

/** A run opens only inside the encounter it was bound to; legacy unbound runs only where the record already references them. */
function runForEncounter(record: Encounter, runId: string, getRun: typeof loadClinicalRun) {
  const referenced = record.ai_runs.some(item => item.id === runId);
  const run = getRun(runId);
  if (run.binding ? run.binding.encounter_id !== record.id : !referenced) throw new ClinicalError("Kết quả AI không thuộc lượt khám này.", 403);
  return run;
}

export function proposeClinicalChangesForActor(actor: ClinicalActor, value: unknown, store = repository, getRun = loadClinicalRun): ClinicalChangeSet {
  const request = proposeSchema.parse(value);
  const { record, data } = readClinicalForActor(actor, request.encounter_id, store);
  const run = runForEncounter(record, request.run_id, getRun);
  const decided = new Set(record.change_decisions.filter(item => item.run_id === run.run_id).map(item => item.change_id));
  const set = proposeClinicalChanges(record, run, data.danhMuc.dichVu);
  return { ...set, changes: set.changes.filter(item => !decided.has(item.id)) };
}

export function decideClinicalChangesForActor(actor: ClinicalActor, value: unknown, store = repository, getRun = loadClinicalRun): ClinicalResponse {
  const request = decideSchema.parse(value);
  const current = readClinicalForActor(actor, request.encounter_id, store);
  const run = runForEncounter(current.record, request.run_id, getRun);
  const now = new Date().toISOString();
  const previous = new Set(current.record.change_decisions.filter(item => item.run_id === run.run_id).map(item => item.change_id));
  const accepted = request.accepted_ids.filter(id => !previous.has(id)); const rejected = request.rejected_ids.filter(id => !previous.has(id));
  if (!accepted.length && !rejected.length) return current; // exact retry of a committed decision
  try {
    const record = store.update(request.encounter_id, request.expected_revision, base => {
      resolveEncounterContextForRecord(actor, base);
      const set = proposeClinicalChanges(base, run, current.data.danhMuc.dichVu);
      return applyClinicalChanges(base, set, accepted, { now, doctorId: actor.doctorId, newId: randomUUID, run }, rejected);
    }, actor.doctorId, now);
    return { record, snapshot: projectEform(record), context: current.context, data: current.data };
  } catch (error) {
    if (error instanceof StaleChangeError) throw new ClinicalError(error.message, 409);
    throw error;
  }
}

export function approveClinical(value: unknown, store = repository): ClinicalResponse {
  return approveClinicalForActor(getDemoClinicalActor(), value, store);
}

export function approveClinicalForActor(actor: ClinicalActor, value: unknown, store = repository): ClinicalResponse {
  const request = z.object({ id: z.uuid(), expected_revision: z.number().int().positive(), acknowledged_issues: z.literal(true) }).strict().parse(value);
  const { record: current, context, data } = readClinicalForActor(actor, request.id, store);
  const now = new Date().toISOString();
  const record = store.update(request.id, request.expected_revision, draft => {
    resolveEncounterContextForRecord(actor, draft);
    if (!draft.phieu_kham.ly_do_kham?.trim() || !draft.phieu_kham.benh_su?.trim()) throw new ClinicalError("Cần lý do khám và bệnh sử trước khi duyệt.", 422);
    const diagnoses = draft.chan_doan.filter(item => item.noi_dung.mo_ta && !["loai_tru", "phu_dinh"].includes(item.noi_dung.muc_do_khang_dinh ?? ""));
    if (!diagnoses.length || diagnoses.some(item => item.noi_dung.giai_doan === "chua_ro" || !item.icd.code)) throw new ClinicalError("Cần bác sĩ xác định giai đoạn và chọn mã ICD cho chẩn đoán trước khi duyệt.", 422);
    if (draft.chi_dinh.de_cap === "chua_de_cap") throw new ClinicalError("Hãy xác nhận có hoặc không chỉ định dịch vụ.", 422);
    for (const item of draft.chi_dinh.items) {
      if (!draft.chi_dinh.groups.find(group => group.id === item.group_id)?.chan_doan_lich_su_lam_sang?.trim()) throw new ClinicalError("Cần chẩn đoán hoặc lịch sử lâm sàng chung cho chỉ định trước khi duyệt.", 422);
      if (!item.danh_muc.code || item.noi_dung.so_luong === null) throw new ClinicalError("Cần chọn đúng dịch vụ và nhập số lượng trước khi duyệt.", 422);
      if (item.noi_dung.hanh_dong !== "de_nghi_moi") throw new ClinicalError("Chỉ định hủy hoặc thay thế cần bác sĩ xử lý riêng; hãy chỉnh danh sách trước khi duyệt.", 422);
      item.review = { trang_thai: "chap_nhan", reviewer_id: current.examiner_id, reviewed_at: now };
      item.trang_thai = "da_xac_nhan";
    }
    for (const item of draft.chan_doan) item.review = { trang_thai: "chap_nhan", reviewer_id: current.examiner_id, reviewed_at: now };
    for (const source of draft.nguon_du_lieu) source.review = { trang_thai: "chap_nhan", reviewer_id: current.examiner_id, reviewed_at: now };
    return draft;
  }, current.examiner_id, now, true);
  return { record, snapshot: projectEform(record), context, data };
}

export function clinicalResponse(error: unknown): Response {
  if (error instanceof ClinicalError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return Response.json({ error: "Dữ liệu không đúng cấu trúc phiếu khám/chỉ định. Hãy kiểm tra các trường nhập." }, { status: 400 });
  // Never return/log patient content or full filesystem paths in validation/provider errors.
  return Response.json({ error: "Không lưu hoặc đọc được hồ sơ. Kiểm tra dữ liệu, số lượng, danh mục và trạng thái nội soi rồi thử lại." }, { status: 422 });
}
