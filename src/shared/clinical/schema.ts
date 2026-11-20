import { z } from "zod";
import common from "../../../config/clinical/common.schema.json";
import encounter from "../../../config/clinical/encounter.schema.json";
import aiOutput from "../../../config/clinical/ai-output.schema.json";
import transcript from "../../../config/clinical/transcript.schema.json";
import type { AiOutput, Encounter, Transcript } from "./types";

export const CLINICAL_SCHEMA_VERSION = "2.0.0" as const;
type JsonSchema = { [key: string]: unknown; properties?: Record<string, JsonSchema>; type?: string | string[]; enum?: unknown[]; anyOf?: JsonSchema[]; items?: JsonSchema; $ref?: string };
const definitions = common.$defs as unknown as Record<string, JsonSchema>;

/** Resolve our acyclic shared definitions before passing schemas to Zod/providers. */
export function resolveClinicalSchema(schema: unknown): JsonSchema {
  if (Array.isArray(schema)) return schema.map(resolveClinicalSchema) as unknown as JsonSchema;
  if (!schema || typeof schema !== "object") return schema as JsonSchema;
  const object = schema as JsonSchema;
  if (object.$ref) {
    if (object.$ref === "common.schema.json#/$defs/jsonValue") return { $ref: "#/$defs/jsonValue" };
    if (object.$ref.startsWith("#/")) return object;
    const name = object.$ref.replace("common.schema.json#/$defs/", "");
    if (!definitions[name]) throw new Error("Tham chiếu schema không hợp lệ.");
    return resolveClinicalSchema(definitions[name]);
  }
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, resolveClinicalSchema(value)]));
}

const validator = <T>(schema: unknown) => z.fromJSONSchema({ ...resolveClinicalSchema(schema), $defs: { jsonValue: resolveClinicalSchema(definitions.jsonValue) } } as Parameters<typeof z.fromJSONSchema>[0]) as z.ZodType<T>;
const encounterValidator = validator<Encounter>(encounter);
const aiValidator = validator<AiOutput>(aiOutput);
const transcriptValidator = validator<Transcript>(transcript);

function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkClinical(note: AiOutput["phieu_kham"] | Encounter["phieu_kham"], services: AiOutput["chi_dinh"] | Encounter["chi_dinh"]) {
  requireValid((services.de_cap === "co_chi_dinh") === (services.items.length > 0), "Trạng thái chỉ định không khớp danh sách dịch vụ.");
  requireValid(note.co_thuoc_dang_dung !== false || note.thuoc_dang_dung.length === 0, "Thông tin thuốc đang dùng mâu thuẫn.");
  requireValid(note.hen_tai_kham.co_hen !== false || (!note.hen_tai_kham.ngay_cu_the && note.hen_tai_kham.sau_bao_lau.value === null), "Thông tin hẹn tái khám mâu thuẫn.");
  requireValid(note.di_ung.trang_thai !== "khong" || (!note.di_ung.mo_ta && note.di_ung.loai.length === 0), "Thông tin dị ứng mâu thuẫn.");
}

function unique(ids: string[], label: string) {
  requireValid(new Set(ids).size === ids.length, `ID ${label} bị trùng.`);
}

export function parseAiOutput(value: unknown): AiOutput {
  const data = aiValidator.parse(value);
  checkClinical(data.phieu_kham, data.chi_dinh);
  return data;
}

export function parseTranscript(value: unknown): Transcript {
  const data = transcriptValidator.parse(value);
  unique(data.segments.map(item => item.id), "đoạn hội thoại");
  unique(data.segments.map(item => String(item.sequence)), "thứ tự đoạn");
  for (const item of data.segments) {
    requireValid(item.start_ms === null || item.end_ms === null || item.start_ms <= item.end_ms, "Thời gian đoạn không hợp lệ.");
  }
  return data;
}

export function parseEncounter(value: unknown): Encounter {
  const data = encounterValidator.parse(value);
  checkClinical(data.phieu_kham, data.chi_dinh);
  unique(data.chi_dinh.items.map(item => item.id), "chỉ định");
  unique(data.chi_dinh.groups.map(item => item.id), "nhóm chỉ định");
  unique(data.chan_doan.map(item => item.id), "chẩn đoán");
  unique(data.recording_sessions.map(item => item.id), "phiên ghi âm");
  unique(data.recording_sessions.map(item => String(item.sequence)), "thứ tự phiên ghi âm");
  unique(data.approval_versions.map(item => item.id), "phiên bản duyệt");
  unique(data.change_decisions.map(item => item.id), "quyết định thay đổi");
  const sessions = new Map(data.recording_sessions.map(item => [item.id, item]));
  for (const session of data.recording_sessions) {
    requireValid(session.encounter_id === data.id, "Phiên ghi âm không thuộc hồ sơ.");
    requireValid(session.ended_at === null || Date.parse(session.started_at) <= Date.parse(session.ended_at), "Thời gian phiên ghi âm không hợp lệ.");
    unique(session.reviewed_transcripts.map(item => String(item.content_revision)), "bản chép lời đã duyệt");
    unique(session.requests.map(item => item.request_id), "yêu cầu phiên ghi âm");
    for (const revision of session.reviewed_transcripts) requireValid(revision.content_revision <= session.content_revision, "Bản chép lời vượt phiên bản nội dung.");
    const reviewed = session.reviewed_transcripts.find(item => item.content_revision === session.reviewed_content_revision);
    requireValid(session.reviewed_content_revision === null ? session.reviewed_digest === null : reviewed && reviewed.digest === session.reviewed_digest, "Bản chép lời đã duyệt không khớp.");
    requireValid(session.content_state !== "reviewed" || session.reviewed_content_revision === session.content_revision && reviewed, "Nội dung đã duyệt không khớp phiên bản.");
  }
  for (const source of [...data.nguon_du_lieu, ...data.approval_versions.flatMap(item => item.sources)]) requireValid(!source.recording_session_id || sessions.has(source.recording_session_id), "Nguồn tham chiếu phiên ghi âm không thuộc hồ sơ.");
  for (const run of data.ai_runs) if (run.binding) {
    const session = sessions.get(run.binding.recording_session_id);
    requireValid(run.binding.encounter_id === data.id && session && session.generation === run.binding.generation, "Run tham chiếu phiên ghi âm không thuộc hồ sơ.");
    requireValid(session.reviewed_transcripts.some(item => item.content_revision === run.binding!.content_revision && item.transcript_id === run.transcript_id && item.transcript_revision === run.transcript_revision), "Run không có nguồn bản chép lời đã duyệt.");
  }
  const groups = new Set(data.chi_dinh.groups.map(item => item.id));
  const diagnoses = new Set(data.chan_doan.map(item => item.id));
  for (const item of data.chi_dinh.items) {
    requireValid(item.group_id !== null && groups.has(item.group_id), "Chỉ định không có nhóm hợp lệ.");
    requireValid(item.chan_doan_ids.every(id => diagnoses.has(id)), "Chẩn đoán liên quan không tồn tại.");
  }
  requireValid(!data.thong_tin_khac.chuyen_noi_soi || data.status === "cho_kq_cls", "Chuyển nội soi cần trạng thái Chờ KQ CLS.");
  requireValid(data.audit.approved_at === null || data.audit.approved_by !== null, "Thiếu người duyệt.");
  return data;
}

function empty(schema: JsonSchema): unknown {
  if ("const" in schema) return schema.const;
  if (schema.enum) return schema.enum.includes(null) ? null : schema.enum[0];
  if (schema.anyOf?.some(item => item.type === "null")) return null;
  if (Array.isArray(schema.type) && schema.type.includes("null")) return null;
  if (schema.type === "object") return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, child]) => [key, empty(child)]));
  if (schema.type === "array") return [];
  if (schema.type === "integer" || schema.type === "number") return schema.minimum ?? 0;
  if (schema.type === "boolean") return false;
  return "";
}

export function emptyDefinition<T>(name: keyof typeof common.$defs): T {
  return empty(resolveClinicalSchema(definitions[name])) as T;
}

export function emptyEncounter(context: { id: string; patientId: string; doctorId: string; now: string }): Encounter {
  const data = empty(resolveClinicalSchema(encounter)) as Encounter;
  Object.assign(data, {
    id: context.id, revision: 1, patient_id: context.patientId, facility_id: "facility-prototype",
    department_id: "tim-mach", examiner_id: context.doctorId, primary_doctor_id: context.doctorId,
    encounter_at: context.now,
  });
  data.audit = { created_at: context.now, updated_at: context.now, created_by: context.doctorId, updated_by: context.doctorId, approved_at: null, approved_by: null };
  return parseEncounter(data);
}
