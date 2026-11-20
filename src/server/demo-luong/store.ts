import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { applyEformSnapshot, parseEformSnapshot, projectEform, type EformSnapshot } from "@/shared/clinical/eform";
import { chiDinhChuaCoDichVu, THIEU_DICH_VU_KHI_DUYET } from "@/shared/clinical/schema";
import type { Encounter } from "@/shared/clinical/types";
import type { ClinicalActor, EncounterContext } from "@/shared/clinical/api";
import type { CatalogItem } from "@/shared/types";
import type { DemoPhieu } from "@/shared/demo-luong/types";
import { ClinicalError, ClinicalRepository } from "@/server/clinical/repository";
import { getDemoClinicalActor, resolveEncounterContext, validateEncounterContexts } from "@/server/clinical/encounter-context";
import { seedNewEncounter } from "@/server/clinical/service";
import { loadEformData } from "@/server/du-lieu/eform";

/** Kho riêng của màn /demo-luong: hồ sơ, sidecar nguồn ô/phiên/duyệt, lượt AI, nhật ký R13. Chỉ bản đã che. */
export interface DemoStore { root: string; repo: ClinicalRepository }

/** Sidecar `meta/<encounterId>.json`: không bao giờ chứa bản thô. */
export type DemoSidecar = Pick<DemoPhieu, "sources" | "sessions" | "duyet">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Thư mục dữ liệu chạy; `kich-ban/` (kịch bản mẫu được commit) không bao giờ bị xóa. */
const RUNTIME_DIRS = ["encounters", "meta", "runs", "transcripts", "run-index", "audit"];

export function demoStore(root = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "demo-luong")): DemoStore {
  return { root, repo: new ClinicalRepository(path.join(root, "encounters")) };
}

function checkId(id: string) {
  if (!UUID.test(id)) throw new ClinicalError("Mã hồ sơ không hợp lệ.", 400);
}
export function encounterFile(store: DemoStore, id: string): string {
  checkId(id);
  return path.join(store.root, "encounters", `${id}.json`);
}
export function auditFile(store: DemoStore, id: string): string {
  checkId(id);
  return path.join(store.root, "audit", `${id}.ndjson`);
}
function metaFile(store: DemoStore, id: string) {
  checkId(id);
  return path.join(store.root, "meta", `${id}.json`);
}

export function readSidecar(store: DemoStore, id: string): DemoSidecar {
  const file = metaFile(store, id);
  if (!fs.existsSync(file)) return { sources: {}, sessions: [], duyet: null };
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as DemoSidecar;
  return { sources: data.sources ?? {}, sessions: data.sessions ?? [], duyet: data.duyet ?? null };
}

export function writeSidecar(store: DemoStore, id: string, value: DemoSidecar) {
  const file = metaFile(store, id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Ghi từng trường, không spread: trường lạ không lọt vào sidecar.
  const data: DemoSidecar = { sources: value.sources, sessions: value.sessions, duyet: value.duyet };
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  fs.renameSync(temporary, file);
}

let catalog: { services: CatalogItem[]; icd: { ma: string; ten: string }[] } | undefined;
/** Danh mục dịch vụ và ICD cho `applyAiDraft`/`applyEformSnapshot`; mã chỉ gán bởi code khớp danh mục. */
export function demoCatalog() {
  if (!catalog) { const data = loadEformData(); catalog = { services: data.danhMuc.dichVu, icd: data.icd10 }; }
  return catalog;
}

export function fileSha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Đọc lại phiếu từ đĩa (hồ sơ + sidecar). */
export function readDemoPhieu(store: DemoStore, encounterId: string): DemoPhieu {
  const record = store.repo.read(encounterId);
  const meta = readSidecar(store, encounterId);
  return {
    encounter_id: record.id, appointment_id: record.appointment_id ?? "", revision: record.revision, status: record.status,
    duyet: meta.duyet, sessions: meta.sessions, snapshot: projectEform(record), sources: meta.sources,
  };
}

/** Ngữ cảnh fixture gần nhất của bệnh nhân (cùng cơ sở, cùng bác sĩ), chỉ đọc `data/eform/encounter-contexts.json`. */
function baseContextFor(actor: ClinicalActor, patientId: string): EncounterContext {
  const fixture = validateEncounterContexts(JSON.parse(fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "eform", "encounter-contexts.json"), "utf8")));
  const row = [...fixture.contexts].reverse().find(item => item.patient_id === patientId && item.facility_id === actor.facilityId && item.doctor_id === actor.doctorId);
  if (!row) throw new ClinicalError("Chưa có hồ sơ mẫu của bệnh nhân này để tạo phiếu mới.", 409);
  return resolveEncounterContext(actor, row.appointment_id);
}

/**
 * Phiếu khám mới (không theo lịch hẹn) cho bệnh nhân giả, mã lượt `LK-DEMO-xxxxxxxx`.
 * Không ghi ngữ cảnh walk-in vào `data/clinical/`: mọi thứ nằm trong kho demo, "Xóa dữ liệu demo" xóa sạch.
 */
export function createDemoPhieu(store: DemoStore, patientId: string): DemoPhieu {
  const actor = getDemoClinicalActor();
  const seed = seedNewEncounter(baseContextFor(actor, patientId), `LK-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`);
  const record = store.repo.openByAppointment(seed);
  writeSidecar(store, record.id, { sources: {}, sessions: [], duyet: null });
  return readDemoPhieu(store, record.id);
}

/** Áp các ô bác sĩ nhập lên hồ sơ, chỉ đụng tới đúng các ô đó (giữ chỉ định, trạng thái). */
export function applyDoctorFields(record: Encounter, fields: Record<string, string>, now: string): Encounter {
  const current = projectEform(record);
  for (const key of Object.keys(fields)) if (!(key in current.fields)) throw new ClinicalError("Ô không thuộc phiếu khám.", 400);
  let input: EformSnapshot;
  try {
    input = parseEformSnapshot({
      fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value, nguon: "bs" }])),
      chiDinh: current.chiDinh, chiDinhDeCap: current.chiDinhDeCap, trangThai: current.trangThai,
    });
  } catch (error) {
    if (error instanceof ZodError) throw new ClinicalError("Giá trị ô không hợp lệ.", 400);
    throw error;
  }
  const { services, icd } = demoCatalog();
  try { return applyEformSnapshot(record, input, { now, newId: randomUUID, services, icd }); }
  catch (error) {
    if (error instanceof ClinicalError) throw error;
    throw new ClinicalError(error instanceof Error ? error.message : "Không lưu được bản sửa.", 400);
  }
}

/** Bác sĩ lưu bản sửa: revision mới, các ô thành "Bác sĩ sửa", phiếu đã duyệt quay về nháp. */
export function saveDoctorEdit(store: DemoStore, encounterId: string, expectedRevision: number, fields: Record<string, string>): DemoPhieu {
  if (!fields || typeof fields !== "object" || !Object.keys(fields).length) throw new ClinicalError("Chưa có ô nào được sửa.", 400);
  for (const value of Object.values(fields)) if (typeof value !== "string") throw new ClinicalError("Giá trị ô không hợp lệ.", 400);
  const actor = getDemoClinicalActor();
  const now = new Date().toISOString();
  store.repo.update(encounterId, expectedRevision, record => applyDoctorFields(record, fields, now), actor.doctorId, now);
  const meta = readSidecar(store, encounterId);
  for (const key of Object.keys(fields)) meta.sources[key] = { nguon: "bac_si", phien: null };
  writeSidecar(store, encounterId, { ...meta, duyet: null });
  return readDemoPhieu(store, encounterId);
}

/** Duyệt bằng persona demo (không qua bộ duyệt clinical): ghi người/thời gian duyệt. */
export function approveDemoPhieu(store: DemoStore, encounterId: string, expectedRevision: number): DemoPhieu {
  const actor = getDemoClinicalActor();
  const now = new Date().toISOString();
  store.repo.update(encounterId, expectedRevision, record => {
    if (chiDinhChuaCoDichVu(record.chi_dinh)) throw new ClinicalError(THIEU_DICH_VU_KHI_DUYET, 422);
    return record;
  }, actor.doctorId, now, true);
  writeSidecar(store, encounterId, { ...readSidecar(store, encounterId), duyet: { luc: now, boi: actor.doctorId } });
  return readDemoPhieu(store, encounterId);
}

/** "Xóa dữ liệu demo": xóa mọi dữ liệu chạy, giữ `kich-ban/`. */
export function resetDemoData(store: DemoStore): void {
  for (const dir of RUNTIME_DIRS) fs.rmSync(path.join(store.root, dir), { recursive: true, force: true });
}
