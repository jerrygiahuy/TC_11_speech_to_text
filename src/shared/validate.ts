// Tính tổng số lượng thuốc theo liều, số lần/ngày và số ngày (config/canh-bao.json).
import { normalizeVi } from "./normalize";
import type { Draft, Values, WarningRules } from "./types";

function parseDose(text: string): { amount: number; unit: string } | null {
  const found = text.trim().replace(",", ".").match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?\s*([\p{L}]+)/u);
  if (!found) return null;
  const amount = found[2] ? Number(found[1]) / Number(found[2]) : Number(found[1]);
  return amount > 0 ? { amount, unit: found[3] } : null;
}

/** Tổng = liều × số lần/ngày × số ngày, chỉ với thuốc đếm được; làm tròn lên */
export function computeTotal(row: Values, rules: WarningRules): number | null {
  const config = rules.tinh_tong;
  const dose = parseDose(String(row[config.truong_lieu] ?? ""));
  const times = Number(row[config.truong_so_lan]);
  const days = Number(row[config.truong_so_ngay]);
  if (!dose || !(times > 0) || !(days > 0)) return null;
  const countable = config.don_vi_dem.map(normalizeVi);
  if (!countable.includes(normalizeVi(dose.unit))) return null;
  return Math.ceil(dose.amount * times * days);
}

export function applyTotals(draft: Draft, rules: WarningRules): void {
  const rows = draft[rules.tinh_tong.form] as Values[] | undefined;
  for (const row of rows ?? []) {
    row[rules.tinh_tong.truong_tong] = computeTotal(row, rules);
  }
}
