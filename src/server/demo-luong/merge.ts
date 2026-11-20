import type { EformSnapshot } from "@/shared/clinical/eform";
import type { DemoFieldSource, DemoPhieu } from "@/shared/demo-luong/types";

/**
 * Ghép kết quả một phiên ghi âm vào phiếu (thiết kế mục 12).
 * - Ô bác sĩ đã sửa giữ giá trị `before`; AI nói khác (không rỗng) thì gắn `xung_dot` của phiên này.
 * - Ô khác đổi giá trị thì nguồn thành "AI · phiên `sequence`"; không đổi thì giữ nguồn cũ.
 * Giá trị rỗng/"chưa đề cập" không xóa dữ liệu phiên trước: việc đó do `applyAiDraft` lo trước khi chiếu ra `after`.
 */
export function mergeSession(phieu: DemoPhieu, before: EformSnapshot, after: EformSnapshot, sequence: number): Pick<DemoPhieu, "snapshot" | "sources"> {
  const sources: Record<string, DemoFieldSource> = structuredClone(phieu.sources);
  const snapshot: EformSnapshot = structuredClone(after);
  for (const [key, field] of Object.entries(after.fields)) {
    const old = before.fields[key] ?? { value: "", nguon: null };
    const source = sources[key];
    if (source?.nguon === "bac_si") {
      snapshot.fields[key] = structuredClone(old);
      if (field.value !== old.value && field.value.trim() !== "") sources[key] = { ...source, xung_dot: { phien: sequence, gia_tri_ai: field.value } };
    } else if (field.value !== old.value) {
      sources[key] = { nguon: "ai", phien: sequence };
    }
  }
  return { snapshot, sources };
}
