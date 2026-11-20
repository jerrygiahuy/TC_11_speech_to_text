import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { ClinicalActor, ClinicalResponse } from "@/shared/clinical/api";
import type { Encounter, JsonValue } from "@/shared/clinical/types";
import { approvalScopeForPath, approvalState, requiredApprovalScopes, scopeProjection, serializeApprovalScope, type ApprovalScope, type ApproveClinicalRequest, type TransitionClinicalRequest } from "@/shared/clinical/approvals";
import { projectEform } from "@/shared/clinical/eform";
import { ClinicalError, ClinicalRepository } from "./repository";
import { resolveEncounterContextForRecord } from "./encounter-context";
import { loadClinicalRun } from "./extraction";

const repository = new ClinicalRepository();
const scopeSchema = z.union([z.literal("initial_note"), z.literal("conclusion"), z.literal("summary"), z.string().regex(/^service_order:\S+$/)]);
const approvalSchema = z.object({ id: z.uuid(), expected_revision: z.number().int().positive(), scopes: z.array(scopeSchema).min(1).max(202), acknowledged_issues: z.literal(true) }).strict();
const transitionSchema = z.object({ id: z.uuid(), expected_revision: z.number().int().positive(), action: z.enum(["wait", "resume", "complete"]) }).strict();

function response(actor: ClinicalActor, record: Encounter): ClinicalResponse {
  const context = resolveEncounterContextForRecord(actor, record);
  let latest_ai = null;
  const latest = record.ai_runs.at(-1);
  if (latest) { try { latest_ai = loadClinicalRun(latest.id); } catch { /* Persisted notes remain usable when an old artifact is unavailable. */ } }
  return { record, snapshot: projectEform(record), latest_ai, data: context.data, context };
}

function assertOpen(record: Encounter) {
  if (!["dang_kham", "cho_kq_cls"].includes(record.status)) throw new ClinicalError("Lượt khám đã kết thúc; không thể tiếp tục hoặc duyệt bổ sung.", 409);
}

function validateDiagnoses(record: Encounter, final: boolean) {
  const diagnoses = record.chan_doan.filter(item => (item.noi_dung.giai_doan === "ra_vien") === final && !["loai_tru", "phu_dinh"].includes(item.noi_dung.muc_do_khang_dinh ?? ""));
  if ((!final && !diagnoses.length) || diagnoses.some(item => !item.noi_dung.mo_ta?.trim() || item.noi_dung.giai_doan === "chua_ro" || !item.icd.code?.trim())) throw new ClinicalError("Cần bác sĩ xác định giai đoạn và chọn mã ICD cho chẩn đoán thuộc phạm vi duyệt.", 422);
}

function validateScope(record: Encounter, scope: ApprovalScope) {
  if (scope === "initial_note") {
    if (!record.phieu_kham.ly_do_kham?.trim() || !record.phieu_kham.benh_su?.trim()) throw new ClinicalError("Cần lý do khám và bệnh sử trước khi duyệt.", 422);
    validateDiagnoses(record, false);
    if (record.chi_dinh.de_cap === "chua_de_cap") throw new ClinicalError("Hãy xác nhận có hoặc không chỉ định dịch vụ.", 422);
    return;
  }
  if (scope === "summary") {
    if (!record.tom_tat?.trim()) throw new ClinicalError("Chưa có tóm tắt để duyệt.", 422);
    return;
  }
  if (scope === "conclusion") {
    if (!requiredApprovalScopes(record).includes("conclusion")) throw new ClinicalError("Chưa có kết luận để duyệt.", 422);
    validateDiagnoses(record, true);
    return;
  }
  const item = record.chi_dinh.items.find(item => `service_order:${item.id}` === scope);
  if (!item) throw new ClinicalError("Không tìm thấy chỉ định thuộc phạm vi duyệt.", 422);
  if (!record.chi_dinh.groups.find(group => group.id === item.group_id)?.chan_doan_lich_su_lam_sang?.trim()) throw new ClinicalError("Cần chẩn đoán hoặc lịch sử lâm sàng chung cho chỉ định trước khi duyệt.", 422);
  if (!item.danh_muc.code?.trim() || item.noi_dung.so_luong === null || item.noi_dung.so_luong <= 0) throw new ClinicalError("Cần chọn đúng dịch vụ và nhập số lượng trước khi duyệt.", 422);
  if (item.noi_dung.hanh_dong !== "de_nghi_moi" || item.trang_thai === "da_huy") throw new ClinicalError("Chỉ định hủy hoặc thay thế cần bác sĩ xử lý riêng.", 422);
}

function sourceScope(record: Encounter, path: string): ApprovalScope[] {
  const diagnosis = /^\/chan_doan\/(\d+)(\/.*)?$/.exec(path);
  if (diagnosis) {
    const item = record.chan_doan[Number(diagnosis[1])];
    return item ? [approvalScopeForPath(`/chan_doan/${item.noi_dung.giai_doan}${diagnosis[2] ?? ""}`)] : [];
  }
  const row = /^\/chi_dinh\/(items|groups)\/(\d+)(\/.*)?$/.exec(path);
  if (row) {
    const items = row[1] === "items" ? record.chi_dinh.items.slice(Number(row[2]), Number(row[2]) + 1) : record.chi_dinh.items.filter(item => item.group_id === record.chi_dinh.groups[Number(row[2])]?.id);
    return items.map(item => approvalScopeForPath(path, item.id));
  }
  try { return [approvalScopeForPath(path)]; } catch { return []; }
}

export function approveScopes(actor: ClinicalActor, value: ApproveClinicalRequest, store = repository): ClinicalResponse {
  const request = approvalSchema.parse(value);
  resolveEncounterContextForRecord(actor, store.read(request.id));
  const now = new Date().toISOString();
  const scopes = [...new Set(request.scopes)] as ApprovalScope[];
  const record = store.update(request.id, request.expected_revision, draft => {
    resolveEncounterContextForRecord(actor, draft); assertOpen(draft);
    for (const scope of scopes) validateScope(draft, scope);
    const review = { trang_thai: "chap_nhan", reviewer_id: actor.doctorId, reviewed_at: now } as const;
    for (const item of draft.chan_doan) if (scopes.includes(item.noi_dung.giai_doan === "ra_vien" ? "conclusion" : "initial_note")) item.review = { ...review };
    for (const item of draft.chi_dinh.items) if (scopes.includes(`service_order:${item.id}`)) { item.review = { ...review }; item.trang_thai = "da_xac_nhan"; }
    for (const source of draft.nguon_du_lieu) if (sourceScope(draft, source.field_path).some(scope => scopes.includes(scope))) source.review = { ...review };
    const snapshot = structuredClone(draft);
    snapshot.approval_versions = [];
    for (const scope of scopes) draft.approval_versions.push({
      id: randomUUID(), scope, snapshot: structuredClone(snapshot) as unknown as JsonValue,
      digest: createHash("sha256").update(serializeApprovalScope(scopeProjection(draft, scope))).digest("hex"),
      approved_by: actor.doctorId, approved_at: now,
      sources: structuredClone(draft.nguon_du_lieu.filter(source => sourceScope(draft, source.field_path).includes(scope))),
    });
    return draft;
  }, actor.doctorId, now);
  return response(actor, record);
}

export function transitionEncounter(actor: ClinicalActor, value: TransitionClinicalRequest, store = repository): ClinicalResponse {
  const request = transitionSchema.parse(value);
  resolveEncounterContextForRecord(actor, store.read(request.id));
  const now = new Date().toISOString();
  const record = store.update(request.id, request.expected_revision, draft => {
    resolveEncounterContextForRecord(actor, draft); assertOpen(draft);
    if (request.action === "resume") {
      if (draft.status !== "cho_kq_cls") throw new ClinicalError("Chỉ tiếp tục lượt khám đang chờ kết quả.", 409);
      draft.status = "dang_kham"; return draft;
    }
    if (draft.recording_sessions.some(item => ["opening", "recording", "finalizing"].includes(item.state) || item.content_state === "awaiting_review")) throw new ClinicalError("Cần dừng ghi âm và xử lý nội dung chưa kiểm tra trước khi chuyển trạng thái.", 409);
    if (request.action === "wait") {
      if (draft.status !== "dang_kham") throw new ClinicalError("Lượt khám đã ở trạng thái chờ kết quả.", 409);
      draft.status = "cho_kq_cls"; return draft;
    }
    const required = requiredApprovalScopes(draft);
    for (const scope of required) validateScope(draft, scope);
    if (required.some(scope => approvalState(draft, scope) !== "current")) throw new ClinicalError("Cần duyệt các phần hiện tại trước khi hoàn tất lượt khám.", 422);
    draft.status = "hoan_thanh_kham";
    return draft;
  }, actor.doctorId, now);
  return response(actor, record);
}
