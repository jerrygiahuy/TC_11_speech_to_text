import type { ApprovalVersion, Encounter, JsonValue } from "./types";

export type { ApprovalVersion, JsonValue } from "./types";
export type ApprovalScope = "initial_note" | "conclusion" | "summary" | `service_order:${string}`;
export type StoredApprovalScope = ApprovalScope | "legacy";
/** Full immutable clinical record for printing; digest is over the scope projection only. */
export type ApprovalSnapshot = JsonValue;
export interface ApproveClinicalRequest { id: string; expected_revision: number; scopes: ApprovalScope[]; acknowledged_issues: true }
export interface TransitionClinicalRequest { id: string; expected_revision: number; action: "wait" | "resume" | "complete" }
export interface ApprovalState { scope: ApprovalScope; status: "unapproved" | "current" | "changed"; version: ApprovalVersion | null }

const INITIAL_NOTE_FIELDS = ["ly_do_kham", "benh_su", "tien_su_ban_than", "tien_su_gia_dinh", "di_ung", "co_thuoc_dang_dung", "thuoc_dang_dung", "co_pttt", "kham_toan_than", "kham_chuyen_khoa", "kham_khac"] as const;
const CONCLUSION_FIELDS = ["ghi_chu_ket_qua", "da_xu_ly", "huong_dieu_tri", "loi_dan", "hen_tai_kham", "tinh_trang_ra_vien"] as const;
const VITAL_FIELDS = ["mach", "nhiet_do", "ha_tam_thu", "ha_tam_truong", "spo2", "nhip_tho", "chieu_cao", "can_nang", "bmi"];
const OTHER_INFO_FIELDS = ["chuyen_noi_soi", "xn_benh_tat", "xn_bhxh", "xn_me"];
const NESTED_FORM_FIELDS: Record<string, readonly string[]> = { di_ung: ["trang_thai", "loai", "mo_ta"], hen_tai_kham: ["co_hen", "nguyen_van", "sau_bao_lau", "ngay_cu_the"] };
const ORDER_CONTENT_FIELDS = ["noi_dung", "danh_muc", "trang_thai", "group_id", "package_id", "package_version", "thay_the_order_id", "chan_doan_ids", "billing", "intentional_repeat_reason"];
const GROUP_CONTENT_FIELDS = ["chan_doan_lich_su_lam_sang", "room_id", "bed_id"];
const UI_INITIAL = new Set(["ly_do", "benh_su", "tien_su_ban_than", "tien_su_gia_dinh", "noi_gioi_thieu", "di_ung", "di_ung_loai", "di_ung_mo_ta", "thuoc_dang_dung", "co_pttt", "kham_toan_than", "kham_chuyen_khoa", "kham_khac", "icd_ban_dau", "mo_ta_ban_dau", "icd_kem_theo", "giai_doan_kem_theo", "chuyen_noi_soi", "xn_benh_tat", "xn_bhxh", "xn_me"]);
const UI_CONCLUSION = new Set(["ghi_chu_kq", "da_xu_ly", "huong_dieu_tri", "loi_dan", "hen_tai_kham", "ngay_tai_kham", "tinh_trang_ra_vien", "icd_ra_vien", "mo_ta_ra_vien"]);

/** Diagnosis paths must carry their stage; order/group paths must carry the stable order ID.
 * Metadata and unknown fields intentionally fail closed instead of acquiring a fallback scope. */
export function approvalScopeForPath(fieldPath: string, itemId?: string): ApprovalScope {
  const path = fieldPath.startsWith("/") ? fieldPath : `/${fieldPath}`;
  const parts = path.slice(1).split("/");
  if (parts[0] === "fields") return approvalScopeForPath(parts[1], itemId);
  if (parts.length === 1 && UI_INITIAL.has(parts[0])) return "initial_note";
  if (parts.length === 1 && UI_CONCLUSION.has(parts[0])) return "conclusion";
  if (parts[0] === "phieu_kham") {
    const nested = NESTED_FORM_FIELDS[parts[1]];
    const known = parts.length < 3 || (nested?.includes(parts[2]) ?? false);
    if (known && (INITIAL_NOTE_FIELDS as readonly string[]).includes(parts[1])) return "initial_note";
    if (known && (CONCLUSION_FIELDS as readonly string[]).includes(parts[1])) return "conclusion";
  }
  if (parts[0] === "chan_doan") {
    if (parts[1] === "ra_vien") return "conclusion";
    if (["ban_dau", "chua_ro"].includes(parts[1])) return "initial_note";
  }
  if (parts[0] === "chi_dinh") {
    if (parts[1] === "de_cap") return "initial_note";
    const content = parts[1] === "items" ? ORDER_CONTENT_FIELDS : parts[1] === "groups" ? GROUP_CONTENT_FIELDS : undefined;
    // Review, identity and audit fields of an order never carry a clinical approval scope.
    if (content && itemId?.trim() && (parts[3] === undefined || content.includes(parts[3]))) return `service_order:${itemId}`;
  }
  if (parts[0] === "sinh_hieu" && (parts.length === 1 || VITAL_FIELDS.includes(parts[1]))) return "initial_note";
  if (parts[0] === "thong_tin_khac" && (parts.length === 1 || OTHER_INFO_FIELDS.includes(parts[1]))) return "initial_note";
  if (["lich_su", "danh_gia_ban_dau", "referral_source"].includes(parts[0])) return "initial_note";
  if (parts[0] === "ket_qua") return "conclusion";
  if (parts[0] === "tom_tat" || parts[0] === "summary") return "summary";
  throw new Error(`Đường dẫn không có phạm vi duyệt lâm sàng: ${fieldPath}`);
}

function pick<T extends object, K extends keyof T>(value: T, keys: readonly K[]) {
  return Object.fromEntries(keys.map(key => [key, value[key]]));
}

function diagnoses(record: Encounter, final: boolean) {
  return record.chan_doan.filter(item => (item.noi_dung.giai_doan === "ra_vien") === final)
    .map(item => ({ id: item.id, noi_dung: item.noi_dung, icd: pick(item.icd, ["catalog_id", "code_system", "code", "display", "catalog_version"]) }));
}

/** Clinical data only. In particular reviews, lifecycle state and recording/audit times are absent. */
export function scopeProjection(record: Encounter, scope: ApprovalScope): JsonValue {
  if (scope === "summary") return record.tom_tat;
  if (scope === "initial_note") return {
    note: pick(record.phieu_kham, INITIAL_NOTE_FIELDS), diagnoses: diagnoses(record, false),
    referral_source: record.referral_source, thong_tin_khac: record.thong_tin_khac,
    vitals: pick(record.sinh_hieu, ["mach", "nhiet_do", "ha_tam_thu", "ha_tam_truong", "spo2", "nhip_tho", "chieu_cao", "can_nang", "bmi"]),
    history: record.lich_su.map(item => pick(item, ["id", "nhom", "ngay", "loai_phieu", "loai_di_ung", "noi_dung", "copied_to_path"])),
    initial_assessments: record.danh_gia_ban_dau.map(item => pick(item, ["nhan", "gia_tri"])),
    service_mention: record.chi_dinh.de_cap,
  } as JsonValue;
  if (scope === "conclusion") return {
    note: pick(record.phieu_kham, CONCLUSION_FIELDS), diagnoses: diagnoses(record, true),
    results: record.ket_qua.map(item => pick(item, ["id", "service_order_id", "nhom", "ten", "ket_qua_text", "gia_tri", "khoang_tham_chieu", "co_bat_thuong", "tai_lieu_ids", "ngay"])),
  } as JsonValue;
  if (!scope.startsWith("service_order:") || !scope.slice(14)) throw new Error("Phạm vi duyệt không hợp lệ.");
  const item = record.chi_dinh.items.find(item => item.id === scope.slice(14));
  if (!item) return null;
  const group = record.chi_dinh.groups.find(group => group.id === item.group_id);
  return {
    ...pick(item, ["id", "noi_dung", "group_id", "package_id", "package_version", "thay_the_order_id", "chan_doan_ids"]),
    intentional_repeat_reason: item.intentional_repeat_reason ?? null,
    catalog: pick(item.danh_muc, ["catalog_id", "code_system", "code", "display", "catalog_version"]),
    group: group ? pick(group, ["id", "chan_doan_lich_su_lam_sang", "room_id", "bed_id", "requester_id"]) : null,
    billing: pick(item.billing, ["don_gia", "thanh_tien", "chon_bhyt"]),
  } as JsonValue;
}

/** Canonical JSON shared by browser equality and server SHA-256. Object key order is irrelevant. */
export function serializeApprovalScope(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(serializeApprovalScope).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${serializeApprovalScope(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function approvalState(record: Encounter, scope: ApprovalScope): "unapproved" | "current" | "changed" {
  const version = record.approval_versions.findLast(item => item.scope === scope);
  if (!version) return "unapproved";
  try {
    const current = scopeProjection(record, scope);
    if (scope.startsWith("service_order:") && current === null) return "changed";
    return serializeApprovalScope(scopeProjection(version.snapshot as unknown as Encounter, scope)) === serializeApprovalScope(current) ? "current" : "changed";
  } catch { return "changed"; }
}

function meaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(meaningful);
  if (typeof value === "object") return Object.values(value).some(meaningful);
  return true;
}

export function requiredApprovalScopes(record: Encounter): ApprovalScope[] {
  const scopes: ApprovalScope[] = ["initial_note", ...record.chi_dinh.items.map(item => `service_order:${item.id}` as ApprovalScope)];
  if (meaningful(pick(record.phieu_kham, CONCLUSION_FIELDS)) || diagnoses(record, true).length) scopes.push("conclusion");
  if (meaningful(record.tom_tat)) scopes.push("summary");
  return scopes;
}

/** Compatibility badge for the entire current clinical content; never used to certify a scope. */
export function approvalAuditCompatibility(record: Encounter): Pick<Encounter["audit"], "approved_at" | "approved_by"> {
  const required = requiredApprovalScopes(record);
  if (required.every(scope => approvalState(record, scope) === "current")) {
    const latest = record.approval_versions.findLast(item => required.includes(item.scope as ApprovalScope));
    return { approved_at: latest?.approved_at ?? null, approved_by: latest?.approved_by ?? null };
  }
  const legacy = record.approval_versions.findLast(item => item.scope === "legacy");
  if (legacy) {
    try {
      const old = legacy.snapshot as unknown as Encounter;
      const scopes = [...new Set([...required, ...requiredApprovalScopes(old)])];
      if (scopes.every(scope => serializeApprovalScope(scopeProjection(old, scope)) === serializeApprovalScope(scopeProjection(record, scope)))) return { approved_at: legacy.approved_at, approved_by: legacy.approved_by };
    } catch { /* Invalid legacy snapshots cannot provide a current badge. */ }
  }
  return { approved_at: null, approved_by: null };
}
