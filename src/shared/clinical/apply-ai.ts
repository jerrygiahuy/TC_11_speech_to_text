import type { ClinicalExtraction } from "./api";
import type { Encounter, Diagnosis, ServiceOrder, Source } from "./types";
import { emptyDefinition, emptyEncounter, parseAiOutput, parseEncounter } from "./schema";
import { projectEform } from "./eform";
import type { CatalogItem } from "../types";
import { matchCatalog } from "../match";
import type { DongChiDinh } from "../eform/dien-phieu";
import type { Truong } from "../eform/types";

/** `icd`: danh mục ICD để gán mã cho chẩn đoán AI qua `matchCatalog` (không truyền thì chẩn đoán AI không có mã). */
interface Context { newId: () => string; now: string; services: CatalogItem[]; icd?: { ma: string; ten: string; manh?: string[] }[] }
const normalized = (value: string | null) => (value ?? "").trim().normalize("NFC").toLocaleLowerCase("vi");

/** Null/absent mentions never erase already collected data. */
function mergeMention(base: unknown, incoming: unknown): unknown {
  if (incoming === null || incoming === "chua_de_cap") return base;
  if (Array.isArray(incoming)) return incoming.length ? structuredClone(incoming) : base;
  if (incoming && typeof incoming === "object") {
    const result = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(incoming)) result[key] = mergeMention(result[key], value);
    return result;
  }
  return incoming;
}

export function applyAiDraft(base: Encounter, run: ClinicalExtraction, context: Context): Encounter {
  if (base.ai_runs.some(item => item.id === run.run_id)) return structuredClone(base);
  const draft = parseAiOutput(run.draft);
  const result = structuredClone(base);
  const { chan_doan, ...notes } = draft.phieu_kham;
  result.phieu_kham = mergeMention(result.phieu_kham, notes) as Encounter["phieu_kham"];
  if (result.phieu_kham.co_thuoc_dang_dung === false) result.phieu_kham.thuoc_dang_dung = [];
  if (result.phieu_kham.di_ung.trang_thai === "khong") { result.phieu_kham.di_ung.loai = []; result.phieu_kham.di_ung.mo_ta = null; }
  if (result.phieu_kham.hen_tai_kham.co_hen === false) result.phieu_kham.hen_tai_kham = { co_hen: false, ngay_cu_the: null, nguyen_van: null, sau_bao_lau: { value: null, unit: null } };
  if (draft.tom_tat !== null) result.tom_tat = draft.tom_tat;
  const diagnosisPaths: string[] = [];
  for (const mention of chan_doan) {
    let index = result.chan_doan.findIndex(row => row.noi_dung.giai_doan === mention.giai_doan && row.noi_dung.vai_tro === mention.vai_tro && normalized(row.noi_dung.mo_ta) === normalized(mention.mo_ta));
    if (index < 0) {
      const row = emptyDefinition<Diagnosis>("diagnosis");
      row.id = context.newId(); row.noi_dung = structuredClone(mention);
      // Mã ICD chỉ do code khớp danh mục gán (quy tắc 3), chỉ khi khớp chắc một mã; mơ hồ hoặc không khớp thì để trống, bác sĩ chọn.
      if (context.icd?.length && mention.mo_ta) {
        const match = matchCatalog(mention.mo_ta, null, context.icd.map(item => ({ ma: item.ma, ten: item.ten, ten_khac: item.manh })), {});
        if (match.status === "khop" && match.item) row.icd = { catalog_id: match.item.ma, code_system: "prototype-icd10", code: match.item.ma, display: match.item.ten, catalog_version: null, trang_thai: "khop_mot", ung_vien_ids: [] };
      }
      result.chan_doan.push(row); index = result.chan_doan.length - 1;
    }
    diagnosisPaths.push(`/chan_doan/${index}/noi_dung`);
  }
  const servicePaths: string[] = [];
  let group = result.chi_dinh.groups.find(item => item.id === `run-${run.run_id}`);
  if (draft.chi_dinh.items.length && !group) {
    group = { id: `run-${run.run_id}`, chan_doan_lich_su_lam_sang: draft.chi_dinh.chan_doan_lich_su_lam_sang, room_id: result.room_id, bed_id: result.bed_id, created_at: context.now, requester_id: result.examiner_id };
    result.chi_dinh.groups.push(group);
  }
  for (const mention of draft.chi_dinh.items) {
    let index = result.chi_dinh.items.findIndex(row => JSON.stringify(row.noi_dung) === JSON.stringify(mention));
    if (index < 0) {
      const row = emptyDefinition<ServiceOrder>("serviceOrder");
      row.id = context.newId(); row.noi_dung = structuredClone(mention); row.group_id = group!.id;
      row.requester_id = result.examiner_id; row.requested_at = context.now;
      const match = matchCatalog(mention.ten_dich_vu ?? "", null, context.services, {});
      if (match.status === "khop" && match.item) {
        row.danh_muc = { catalog_id: match.item.ma, code_system: "prototype-service", code: match.item.ma, display: match.item.ten, catalog_version: null, trang_thai: "khop_mot", ung_vien_ids: [] };
      } else row.danh_muc.ung_vien_ids = match.candidates.map(item => item.ma);
      result.chi_dinh.items.push(row); index = result.chi_dinh.items.length - 1;
    }
    servicePaths.push(`/chi_dinh/items/${index}/noi_dung`);
  }
  if (result.chi_dinh.items.length) result.chi_dinh.de_cap = "co_chi_dinh";
  else if (draft.chi_dinh.de_cap !== "chua_de_cap") result.chi_dinh.de_cap = draft.chi_dinh.de_cap;

  const mapPaths = (pointer: string): string[] => {
    const diagnosis = /^\/phieu_kham\/chan_doan\/(\d+)(.*)$/.exec(pointer);
    if (diagnosis) return diagnosisPaths[Number(diagnosis[1])] ? [diagnosisPaths[Number(diagnosis[1])] + diagnosis[2]] : [];
    if (pointer === "/phieu_kham/chan_doan") return diagnosisPaths;
    const service = /^\/chi_dinh\/items\/(\d+)(.*)$/.exec(pointer);
    if (service) return servicePaths[Number(service[1])] ? [servicePaths[Number(service[1])] + service[2]] : [];
    if (pointer === "/chi_dinh" || pointer === "/chi_dinh/items") return servicePaths;
    if (pointer === "/chi_dinh/chan_doan_lich_su_lam_sang") return group ? [`/chi_dinh/groups/${result.chi_dinh.groups.indexOf(group)}/chan_doan_lich_su_lam_sang`] : [];
    return [pointer];
  };
  draft.bang_chung.forEach((evidence, index) => {
    for (const pointer of mapPaths(evidence.field_path)) {
      const source = emptyDefinition<Source>("source");
      Object.assign(source, { field_path: pointer, nguon: "ai", source_system: "clinical-extraction", ai_run_id: run.run_id, evidence_indexes: [index] });
      result.nguon_du_lieu.push(source);
    }
  });
  result.ai_runs.push({ id: run.run_id, transcript_id: run.transcript.transcript_id, transcript_revision: run.transcript.revision, model: run.model, prompt_version: run.prompt_version, schema_version: draft.schema_version, input_digest: run.input_digest, created_at: run.created_at, output_artifact_id: `${run.run_id}.json` });
  result.audit.approved_at = null; result.audit.approved_by = null;
  return parseEncounter(result);
}

/**
 * Gói điền nháp cho eForm: chỉ chứa ô AI có nói. Ô AI không nhắc tới không có mặt trong gói, nên nơi nhận không thể
 * xóa nhầm chữ bác sĩ đã nhập; "chưa chọn" của nút chọn (khác "Không") kiểm bằng `projectEform`.
 * Trường hành chính và sinh hiệu không bao giờ nằm trong gói.
 */
export function aiEformPatch(run: ClinicalExtraction, context: Context): { fields: Record<string, Truong>; thuocDangDung?: NonNullable<ReturnType<typeof projectEform>["thuocDangDung"]>; chiDinh: DongChiDinh[] } {
  const base = emptyEncounter({ id: "preview", patientId: "preview", doctorId: "preview", now: context.now });
  const projection = projectEform(applyAiDraft(base, run, context));
  const excluded = new Set(["thoi_gian_kham", "noi_gioi_thieu", "bs_uy_quyen", "chuyen_noi_soi", "xn_benh_tat", "xn_bhxh"]);
  return {
    fields: Object.fromEntries(Object.entries(projection.fields).filter(([id, field]) => !excluded.has(id) && field.value !== "").map(([id, field]) => [id, { value: field.value, nguon: "xem" as const }])),
    ...(projection.thuocDangDung?.length ? { thuocDangDung: projection.thuocDangDung } : {}),
    chiDinh: projection.chiDinh.map(row => ({ ...row, id: undefined, nguon: "xem" })),
  };
}
