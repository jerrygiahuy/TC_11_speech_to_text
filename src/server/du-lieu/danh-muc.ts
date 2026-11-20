// Danh mục Tim mạch dùng trong eForm: dịch vụ và thuốc (data/catalog/), ICD10 (data/eform/icd10.json).
// Hiện chỉ có danh mục soạn tay (mock, mỗi mục có "mock": true); chưa có danh mục thật của Tim mạch nên không ghép nguồn nào khác.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { CatalogItem, Catalogs } from "@/shared/types";
import type { Icd10 } from "@/shared/eform/types";

function duongDan(...parts: string[]): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts);
}

function docJson<T>(file: string, macDinh: T): T {
  if (!fs.existsSync(file)) return macDinh;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Danh mục soạn tay: giữ nguyên trường mock, đánh dấu uu_tien để bước khớp xét trước */
export function loadCatalogs(): Catalogs {
  const nguon: Record<string, string> = { "dich-vu": "dich-vu.json", thuoc: "thuoc.json" };
  return Object.fromEntries(
    Object.entries(nguon).map(([ten, file]) => [
      ten,
      docJson<CatalogItem[]>(duongDan("data", "catalog", file), []).map((item) => ({ ...item, uu_tien: true })),
    ]),
  );
}

/** ICD10 Tim mạch soạn tay, kèm từ khóa gợi ý (manh, vua) */
export function loadIcd10(): Icd10[] {
  return docJson<Icd10[]>(duongDan("data", "eform", "icd10.json"), []);
}
