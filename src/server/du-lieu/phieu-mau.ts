// Nạp phiếu mẫu theo bệnh (data/eform/phieu-mau.json) và gán mã một lần khi nạp trang:
// chỉ định, thuốc qua src/shared/match.ts; ICD10 tra theo tên (icd_ten). Mẫu không ghi mã.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { fillDraft } from "@/server/ai/schema";
import { maIcdTheoTen } from "@/shared/eform/icd";
import type { PhieuMau, PhieuMauGoc } from "@/shared/eform/phieu-mau";
import { applyCatalogMatch } from "@/shared/match";
import { applyTotals } from "@/shared/validate";
import { loadCatalogs, loadForms, loadRules, loadVietTat } from "./config";
import { loadIcd10 } from "./danh-muc";

export function loadPhieuMauGoc(): PhieuMauGoc[] {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "eform", "phieu-mau.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { mau: PhieuMauGoc[] }).mau;
}

export function timMauGoc(id: string): PhieuMauGoc | undefined {
  return loadPhieuMauGoc().find((mau) => mau.id === id);
}

export function loadPhieuMau(): PhieuMau[] {
  const forms = loadForms();
  const catalogs = loadCatalogs();
  const vietTat = loadVietTat();
  const rules = loadRules();
  const icd10 = loadIcd10();
  return loadPhieuMauGoc().map((goc) => {
    const draft = fillDraft(structuredClone(goc.nhap), forms);
    const matches = applyCatalogMatch(draft, forms, catalogs, vietTat);
    applyTotals(draft, rules);
    return {
      id: goc.id,
      ten: goc.ten,
      bi_danh: goc.bi_danh,
      icd: maIcdTheoTen(goc.icd_ten, icd10),
      khamKhac: goc.kham_khac,
      ketQua: { draft, matches, provider: "mau", duration_ms: 0 },
    };
  });
}
