"use client";

import { useEffect, useState } from "react";
import { decideChanges, proposeChanges, type ClinicalResponse } from "@/client/clinical-api";
import { BTN_OUTLINE } from "@/client/eform/fields";
import type { ClinicalChange, ClinicalChangeSet } from "@/shared/clinical/changes";
import type { JsonValue } from "@/shared/clinical/types";

type Choice = "accept" | "reject";

const NHAN_PHAM_VI: Record<string, string> = { initial_note: "Phiếu khám ban đầu", conclusion: "Kết luận", summary: "Tóm tắt" };

function scopeLabel(scope: string): string {
  return NHAN_PHAM_VI[scope] ?? (scope.startsWith("service_order:") ? "Chỉ định dịch vụ" : scope);
}

const GIAI_DOAN: Record<string, string> = { ban_dau: "ban đầu", ra_vien: "ra viện", chua_ro: "chưa rõ giai đoạn" };

type Obj = Record<string, JsonValue>;
const asObject = (value: JsonValue | undefined): Obj | null => (value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : null);
const text = (value: JsonValue | undefined): string => (typeof value === "string" || typeof value === "number" ? String(value) : "");

/** Chuỗi ngắn để so sánh cũ/mới. Chẩn đoán và chỉ định hiện bằng lời, không hiện JSON thô; giá trị rỗng là "(trống)". */
export function showValue(value: JsonValue): string {
  if (value === null || value === undefined || value === "") return "(trống)";
  if (typeof value === "string") return value;
  const root = asObject(value);
  const diagnosis = asObject(root?.noi_dung);
  if (root && diagnosis && "giai_doan" in diagnosis) {
    const code = text(asObject(root.icd)?.code);
    return [text(diagnosis.mo_ta) || "(chưa có mô tả)", `chẩn đoán ${GIAI_DOAN[text(diagnosis.giai_doan)] ?? text(diagnosis.giai_doan)}`, code].filter(Boolean).join(" · ");
  }
  const order = asObject(root?.item);
  const mention = asObject(order?.noi_dung);
  if (order && mention && "ten_dich_vu" in mention) {
    const catalog = asObject(order.danh_muc);
    return [text(catalog?.display) || text(mention.ten_dich_vu), `số lượng ${text(mention.so_luong) || "chưa rõ"}`, text(catalog?.code) ? `mã ${text(catalog?.code)}` : "chưa khớp danh mục"].join(" · ");
  }
  return JSON.stringify(value);
}

/** Tên trường dễ đọc cho người dùng; đường dẫn gốc giữ lại ở tooltip. */
function fieldLabel(path: string): string {
  if (path === "/tom_tat") return "Tóm tắt buổi khám";
  if (path.startsWith("/chan_doan/")) return "Chẩn đoán";
  if (path.startsWith("/chi_dinh/items/")) return "Chỉ định dịch vụ";
  return path.replace(/^\/phieu_kham\//, "").replaceAll("_", " ");
}

interface Props {
  encounterId: string;
  runId: string;
  /** Phiên bản mới nhất của hồ sơ lúc bấm lưu quyết định */
  latestRevision: () => number;
  /** Có lý do thì không cho quyết định (vd. phiếu còn thay đổi chưa lưu) */
  blockedReason: string | null;
  onDecided: (response: ClinicalResponse) => void;
}

/**
 * Đề xuất thay đổi của một lần AI tách. Server tự dựng đề xuất từ lần chạy đã lưu; trình duyệt chỉ gửi mã đề xuất được chấp nhận hay từ chối.
 * Ô bác sĩ đã sửa hoặc đã duyệt không bị AI ghi đè nếu bác sĩ không chọn.
 */
export function ClinicalChanges({ encounterId, runId, latestRevision, blockedReason, onDecided }: Props) {
  const [set, setSet] = useState<ClinicalChangeSet | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Nơi gọi đặt key theo mã lần chạy AI nên mỗi lần chạy là một bản mới; hiệu ứng chỉ đọc đề xuất từ server.
  useEffect(() => {
    let current = true;
    proposeChanges(encounterId, runId)
      .then((result) => { if (current) setSet(result); })
      .catch((cause) => { if (current) setError(cause instanceof Error ? cause.message : "Không đọc được đề xuất thay đổi."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [encounterId, runId]);

  const changes = set?.changes ?? [];
  const chosen = Object.keys(choices).filter((id) => changes.some((item) => item.id === id));

  const mark = (id: string, choice: Choice | null) => setChoices((current) => {
    const next = { ...current };
    if (choice) next[id] = choice; else delete next[id];
    return next;
  });
  const markAll = (choice: Choice) => setChoices(Object.fromEntries(changes.map((item) => [item.id, choice])));

  async function save() {
    if (!set || saving || blockedReason || chosen.length === 0) return;
    setSaving(true); setError("");
    try {
      const response = await decideChanges({
        encounter_id: encounterId, expected_revision: latestRevision(), run_id: runId,
        accepted_ids: chosen.filter((id) => choices[id] === "accept"), rejected_ids: chosen.filter((id) => choices[id] === "reject"),
      });
      onDecided(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được quyết định.");
    } finally { setSaving(false); }
  }

  if (loading) return <p role="status" className="text-xs text-ef-phu">Đang đọc đề xuất thay đổi…</p>;
  return (
    <section aria-label="Đề xuất thay đổi" className="space-y-2 rounded-lg border border-tim-vien bg-tim-nhat/40 p-3">
      <h4 className="font-semibold text-ef-chu">Đề xuất thay đổi · bác sĩ chọn từng mục</h4>
      {error && <p role="alert" className="rounded-md bg-ef-do-nhat px-3 py-2 text-xs text-ef-do">{error}</p>}
      {blockedReason && <p role="status" className="text-xs text-ef-phu">{blockedReason}</p>}
      {set && changes.length === 0 && <p className="text-xs text-ef-phu">Không còn đề xuất nào cần quyết định.</p>}
      {changes.length > 1 && (
        <div className="flex gap-2 text-xs">
          <button type="button" className={BTN_OUTLINE} onClick={() => markAll("accept")}>Chấp nhận tất cả</button>
          <button type="button" className={BTN_OUTLINE} onClick={() => markAll("reject")}>Từ chối tất cả</button>
        </div>
      )}
      <ul className="space-y-2">
        {changes.map((change: ClinicalChange) => (
          <li key={change.id} className="rounded border border-ef-vien bg-white p-2 text-xs">
            <p className="font-medium text-ef-chu">{scopeLabel(change.scope)} <span className="font-normal text-ef-phu" title={change.field_path}>· {fieldLabel(change.field_path)}</span></p>
            <p className="text-ef-phu">Hiện có: <span className="whitespace-pre-wrap text-ef-chu">{showValue(change.before)}</span></p>
            <p className="text-ef-phu">AI đề xuất: <span className="whitespace-pre-wrap text-ef-chu">{showValue(change.after)}</span></p>
            <div role="radiogroup" aria-label={`Quyết định cho ${change.field_path}`} className="mt-1 flex gap-3">
              <label className="inline-flex items-center gap-1"><input type="radio" name={change.id} checked={choices[change.id] === "accept"} onChange={() => mark(change.id, "accept")} /> Chấp nhận</label>
              <label className="inline-flex items-center gap-1"><input type="radio" name={change.id} checked={choices[change.id] === "reject"} onChange={() => mark(change.id, "reject")} /> Từ chối</label>
              {choices[change.id] && <button type="button" className="underline" onClick={() => mark(change.id, null)}>Bỏ chọn</button>}
            </div>
          </li>
        ))}
      </ul>
      {set && set.issues.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Cần đối chiếu ({set.issues.length})</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5">{set.issues.map((issue) => <li key={issue.id}>{issue.reason} <span className="text-ef-phu">({fieldLabel(issue.field_path)})</span></li>)}</ul>
        </details>
      )}
      <button type="button" className={`${BTN_OUTLINE} w-full`} disabled={saving || Boolean(blockedReason) || chosen.length === 0} onClick={() => void save()}>
        {saving ? "Đang lưu quyết định…" : `Lưu quyết định (${chosen.length})`}
      </button>
    </section>
  );
}
