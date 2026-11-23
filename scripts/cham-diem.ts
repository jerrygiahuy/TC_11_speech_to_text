// Chấm điểm nháp so với kết quả mong muốn, dùng chung cho npm run eval và npm run eval-mau.
import { normalizeVi } from "@/shared/normalize";
import type { Draft, FieldDef, FieldValue, FormConfig, Values } from "@/shared/types";

/** Ngưỡng giống nhau của văn bản tự do, vì LLM có thể diễn đạt khác đi đôi chút */
const TEXT_SIMILARITY = 0.7;
/** Ngưỡng tên để ghép một dòng kết quả với một dòng mong muốn */
const ROW_SIMILARITY = 0.5;

export type Outcome = "dung" | "sai" | "thieu" | "thua";

export interface Tally {
  dung: number;
  sai: number;
  thieu: number;
  thua: number;
}

export const emptyTally = (): Tally => ({ dung: 0, sai: 0, thieu: 0, thua: 0 });

function isEmpty(value: FieldValue | undefined): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function tokens(text: string): string[] {
  return normalizeVi(text).split(" ").filter(Boolean);
}

function dice(a: string, b: string): number {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (left.size + right.size === 0) return 1;
  const shared = [...left].filter((token) => right.has(token)).length;
  return (2 * shared) / (left.size + right.size);
}

/** Số liệu và bên phải/trái phải trùng khít: chữ giống nhau nhưng sai số vẫn là sai */
function criticalTokensMatch(a: string, b: string): boolean {
  const critical = (text: string) =>
    tokens(text)
      .filter((token) => /\d/.test(token) || token === "phai" || token === "trai")
      .sort()
      .join(" ");
  return critical(a) === critical(b);
}

function sameValue(field: FieldDef, expected: FieldValue, actual: FieldValue): boolean {
  if (field.type === "number") return Number(expected) === Number(actual);
  const left = String(expected);
  const right = String(actual);
  if (field.type === "select" || field.catalog) return normalizeVi(left) === normalizeVi(right);
  return dice(left, right) >= TEXT_SIMILARITY && criticalTokensMatch(left, right);
}

export function score(field: FieldDef, expected: FieldValue | undefined, actual: FieldValue | undefined): Outcome | null {
  const noExpected = isEmpty(expected);
  const noActual = isEmpty(actual);
  if (noExpected && noActual) return null;
  if (noExpected) return "thua";
  if (noActual) return "thieu";
  return sameValue(field, expected as FieldValue, actual as FieldValue) ? "dung" : "sai";
}

/** Ghép từng dòng mong muốn với dòng kết quả có tên giống nhất */
export function alignRows(form: FormConfig, expected: Values[], actual: Values[]) {
  const nameId = form.fields.find((field) => field.name_field)?.name_field ?? form.fields[0].id;
  const unused = new Set(actual.map((_, index) => index));
  const pairs: [Values | null, Values | null][] = [];
  for (const row of expected) {
    let best = -1;
    let bestScore = ROW_SIMILARITY;
    for (const index of unused) {
      const similarity = dice(String(row[nameId] ?? ""), String(actual[index][nameId] ?? ""));
      if (similarity >= bestScore) {
        best = index;
        bestScore = similarity;
      }
    }
    if (best >= 0) unused.delete(best);
    pairs.push([row, best >= 0 ? actual[best] : null]);
  }
  for (const index of unused) pairs.push([null, actual[index]]);
  return pairs;
}

export function accuracy(tally: Tally): string {
  const total = tally.dung + tally.sai + tally.thieu + tally.thua;
  return total === 0 ? "–" : `${((tally.dung / total) * 100).toFixed(1)}%`;
}

export function printTable(title: string, rows: [string, Tally][]) {
  console.log(`\n${title}`);
  const width = Math.max(10, ...rows.map(([name]) => name.length)) + 2;
  console.log(`${"".padEnd(width)}${"Đúng".padStart(7)}${"Sai".padStart(7)}${"Thiếu".padStart(7)}${"Thừa".padStart(7)}${"Chính xác".padStart(11)}`);
  for (const [name, tally] of rows) {
    console.log(
      `${name.padEnd(width)}${String(tally.dung).padStart(7)}${String(tally.sai).padStart(7)}${String(tally.thieu).padStart(7)}${String(tally.thua).padStart(7)}${accuracy(tally).padStart(11)}`,
    );
  }
}

/** Chấm mọi trường của một nháp; ghi(phần, trường, kết quả) cho từng trường có dữ liệu. Trả số dòng thừa */
export function chamNhap(
  forms: FormConfig[],
  expected: Draft,
  actual: Draft,
  ghi: (phan: string, truong: string, ketQua: Outcome) => void,
): number {
  let dongThua = 0;
  const record = (form: FormConfig, want: Values | null, got: Values | null) => {
    for (const field of form.fields) {
      const outcome = score(field, want?.[field.id], got?.[field.id]);
      if (outcome) ghi(form.title, `${form.id}.${field.id}`, outcome);
    }
  };
  for (const form of forms) {
    if (form.mode === "single") {
      record(form, expected[form.id] as Values, actual[form.id] as Values);
      continue;
    }
    for (const [want, got] of alignRows(form, expected[form.id] as Values[], actual[form.id] as Values[])) {
      if (!want) dongThua++;
      record(form, want, got);
    }
  }
  return dongThua;
}
