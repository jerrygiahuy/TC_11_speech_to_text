import type { ChangeDecision, JsonValue } from "./types";
import type { ApprovalScope } from "./approvals";

export type { ChangeDecision } from "./types";
/** IDs derive deterministically from run ID + scope + field path + stable item ID. */
export interface ClinicalChange {
  id: string;
  scope: ApprovalScope;
  item_id: string | null;
  field_path: string;
  before: JsonValue;
  after: JsonValue;
  encounter_id: string;
  recording_session_id: string | null;
  run_id: string;
  segment_ids: string[];
}
export interface ClinicalReconciliationIssue { id: string; field_path: string; reason: string; segment_ids: string[]; item_id: string | null }
export interface ClinicalChangeSet { id: string; encounter_id: string; base_revision: number; run_id: string; changes: ClinicalChange[]; issues: ClinicalReconciliationIssue[] }
export interface DecideClinicalChangesRequest { encounter_id: string; expected_revision: number; run_id: string; accepted_ids: string[]; rejected_ids: string[] }
export interface IntentionalRepeatOrderRequest { expected_revision: number; service_order_id: string; reason: string }
export interface ClinicalDecisionResult { accepted: ChangeDecision[]; rejected: ChangeDecision[] }

import type { ClinicalExtraction } from "./api";
import type { Encounter, ServiceOrder, Source } from "./types";
import { applyAiDraft } from "./apply-ai";
import { approvalScopeForPath } from "./approvals";
import { emptyDefinition, parseEncounter } from "./schema";

export class StaleChangeError extends Error {
  constructor(message = "Hồ sơ đã thay đổi sau khi AI đề xuất; hãy tải lại để xem đề xuất mới.") { super(message); this.name = "StaleChangeError"; }
}
/** Pure (browser-safe) deterministic 128-bit hash: ids only need to be stable, not secret. */
function digest(value: unknown): string {
  const text = JSON.stringify(value);
  const parts = [0xdeadbeef, 0x41c6ce57, 0x9e3779b9, 0x85ebca6b];
  const hashes = parts.map((seed, lane) => {
    let a = seed, b = seed ^ 0x5bd1e995;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i) + lane; a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return ((a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0"));
  });
  return hashes.join("").slice(0, 64);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const stableId = (run: string, ...parts: string[]) => digest([run, ...parts]).slice(0, 32);
const FORM_FIELDS = ["ly_do_kham", "benh_su", "tien_su_ban_than", "tien_su_gia_dinh", "di_ung", "co_thuoc_dang_dung", "thuoc_dang_dung", "kham_toan_than", "kham_chuyen_khoa", "kham_tim_mach_ho_hap", "kham_khac", "ghi_chu_ket_qua", "da_xu_ly", "huong_dieu_tri", "loi_dan", "hen_tai_kham", "tinh_trang_ra_vien"] as const;

/** Rows created by AI get ids derived from the run, so the server and the browser compute identical change sets. */
function deterministicContext(run: ClinicalExtraction, now: string) {
  let n = 0;
  return { now, services: [] as never[], newId: () => stableId(run.run_id, "row", String(n++)) };
}

export function proposeClinicalChanges(base: Encounter, run: ClinicalExtraction, services: Parameters<typeof applyAiDraft>[2]["services"] = []): ClinicalChangeSet {
  const context = { ...deterministicContext(run, run.created_at), services };
  const applied = applyAiDraft(base, run, context);
  const segments = run.transcript.segments.map(item => item.id);
  const changes: ClinicalChange[] = [];
  const issues: ClinicalReconciliationIssue[] = [];
  const push = (scope: ApprovalScope, itemId: string | null, fieldPath: string, before: JsonValue, after: JsonValue) => {
    if (same(before, after)) return;
    changes.push({ id: stableId(run.run_id, scope, fieldPath, itemId ?? ""), scope, item_id: itemId, field_path: fieldPath, before, after,
      encounter_id: base.id, recording_session_id: run.binding?.recording_session_id ?? null, run_id: run.run_id, segment_ids: segments });
  };
  for (const key of FORM_FIELDS) push(approvalScopeForPath(`/phieu_kham/${key}`), null, `/phieu_kham/${key}`, base.phieu_kham[key] as JsonValue, applied.phieu_kham[key] as JsonValue);
  push("summary", null, "/tom_tat", base.tom_tat, applied.tom_tat);
  push("initial_note", null, "/chi_dinh/de_cap", base.chi_dinh.de_cap, applied.chi_dinh.de_cap);
  const knownDiagnoses = new Set(base.chan_doan.map(item => item.id));
  for (const row of applied.chan_doan) if (!knownDiagnoses.has(row.id)) push(approvalScopeForPath(`/chan_doan/${row.noi_dung.giai_doan}`), row.id, `/chan_doan/${row.id}`, null, row as unknown as JsonValue);
  const knownOrders = new Set(base.chi_dinh.items.map(item => item.id));
  for (const row of applied.chi_dinh.items) {
    if (knownOrders.has(row.id)) continue;
    const group = applied.chi_dinh.groups.find(item => item.id === row.group_id) ?? null;
    push(`service_order:${row.id}`, row.id, `/chi_dinh/items/${row.id}`, null, { item: row, group } as unknown as JsonValue);
    if (!row.danh_muc.code) issues.push({ id: stableId(run.run_id, "issue", row.id), field_path: `/chi_dinh/items/${row.id}`, reason: "Chưa khớp được dịch vụ trong danh mục; cần bác sĩ chọn.", segment_ids: segments, item_id: row.id });
  }
  return { id: stableId(run.run_id, String(base.revision)), encounter_id: base.id, base_revision: base.revision, run_id: run.run_id, changes, issues };
}

export function applyClinicalChanges(base: Encounter, changeSet: ClinicalChangeSet, acceptedIds: string[], context: { now: string; doctorId: string; newId: () => string; run?: ClinicalExtraction }, rejectedIds: string[] = []): Encounter {
  acceptedIds = [...new Set(acceptedIds)]; rejectedIds = [...new Set(rejectedIds)];
  if (changeSet.encounter_id !== base.id) throw new StaleChangeError("Đề xuất không thuộc lượt khám này.");
  const byId = new Map(changeSet.changes.map(item => [item.id, item]));
  for (const id of [...acceptedIds, ...rejectedIds]) if (!byId.has(id)) throw new StaleChangeError("Có thay đổi không thuộc bộ đề xuất.");
  if (acceptedIds.some(id => rejectedIds.includes(id))) throw new StaleChangeError("Một thay đổi không thể vừa chấp nhận vừa từ chối.");
  const result = structuredClone(base);
  const decided = new Set(result.change_decisions.map(item => item.change_id));
  const log = (changeId: string, decision: "accepted" | "rejected") => {
    if (decided.has(changeId)) return;
    result.change_decisions.push({ id: context.newId(), change_set_id: changeSet.id, change_id: changeId, run_id: changeSet.run_id, decision, decided_by: context.doctorId, decided_at: context.now });
  };
  for (const id of acceptedIds) {
    const change = byId.get(id)!;
    if (decided.has(id)) continue; // retry of an already applied decision
    if (change.field_path.startsWith("/phieu_kham/")) {
      const key = change.field_path.split("/")[2] as keyof Encounter["phieu_kham"];
      if (!same(result.phieu_kham[key], change.before)) throw new StaleChangeError();
      (result.phieu_kham as unknown as Record<string, unknown>)[key] = structuredClone(change.after);
    } else if (change.field_path === "/tom_tat" || change.field_path === "/chi_dinh/de_cap") {
      const current = change.field_path === "/tom_tat" ? result.tom_tat : result.chi_dinh.de_cap;
      if (!same(current, change.before)) throw new StaleChangeError();
      if (change.field_path === "/tom_tat") result.tom_tat = change.after as string | null; else result.chi_dinh.de_cap = change.after as Encounter["chi_dinh"]["de_cap"];
    } else if (change.field_path.startsWith("/chan_doan/")) {
      if (result.chan_doan.some(item => item.id === change.item_id)) throw new StaleChangeError();
      result.chan_doan.push(structuredClone(change.after) as unknown as Encounter["chan_doan"][number]);
    } else if (change.field_path.startsWith("/chi_dinh/items/")) {
      if (result.chi_dinh.items.some(item => item.id === change.item_id)) throw new StaleChangeError();
      const { item, group } = change.after as unknown as { item: ServiceOrder; group: Encounter["chi_dinh"]["groups"][number] | null };
      if (group && !result.chi_dinh.groups.some(row => row.id === group.id)) result.chi_dinh.groups.push(structuredClone(group));
      result.chi_dinh.items.push(structuredClone(item));
      result.chi_dinh.de_cap = "co_chi_dinh";
    } else throw new StaleChangeError("Loại thay đổi không được hỗ trợ.");
    log(id, "accepted");
  }
  for (const id of rejectedIds) log(id, "rejected");
  if (acceptedIds.length && context.run && !result.ai_runs.some(item => item.id === context.run!.run_id)) {
    const run = context.run;
    result.ai_runs.push({ id: run.run_id, transcript_id: run.transcript.transcript_id, transcript_revision: run.transcript.revision, model: run.model, prompt_version: run.prompt_version,
      schema_version: run.draft.schema_version, input_digest: run.input_digest, created_at: run.created_at, output_artifact_id: `${run.run_id}.json` });
  }
  if (context.run) for (const id of acceptedIds) {
    if (decided.has(id)) continue;
    const change = byId.get(id)!; const source = emptyDefinition<Source>("source");
    Object.assign(source, { field_path: change.field_path, nguon: "ai", source_system: "clinical-extraction", ai_run_id: change.run_id });
    result.nguon_du_lieu.push(source);
  }
  result.audit.approved_at = null; result.audit.approved_by = null;
  return parseEncounter(result);
}
