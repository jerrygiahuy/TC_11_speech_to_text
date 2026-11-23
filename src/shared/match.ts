// Khớp tên dịch vụ/thuốc với danh mục. Mã chỉ đến từ đây, không bao giờ do LLM sinh ra.
import Fuse from "fuse.js";
import { expandAbbreviations, normalizeVi } from "./normalize";
import type { CatalogItem, Catalogs, Draft, FormConfig, Values, VietTat } from "./types";

/** Điểm Fuse: 0 là khớp hoàn toàn. Từ ngưỡng này trở xuống được coi là chắc chắn */
const CONFIDENT_SCORE = 0.15;
/** Trên ngưỡng này thì không coi là ứng viên nữa */
const MAX_SCORE = 0.4;
/** Tỉ lệ độ dài tối thiểu giữa chuỗi tìm và tên khớp để được tự gán mã */
const MIN_COVERAGE = 0.6;
const UNSURE_NAME = "Tên chưa chắc chắn, cần chọn lại";

export type MatchStatus = "khop" | "mo_ho" | "khong_khop";

export interface MatchResult {
  status: MatchStatus;
  item: CatalogItem | null;
  reason?: string;
  candidates: CatalogItem[];
}

/** Mỗi tên gọi là một bản ghi riêng: Fuse gộp nhiều khóa theo trọng số sẽ làm sai lệch điểm */
interface IndexedTerm {
  item: CatalogItem;
  term: string;
  /** Tên chính hoặc tên khác; hoạt chất và mã chỉ dùng để tìm, không đủ để tự gán mã */
  isName: boolean;
}

interface CatalogIndex {
  terms: IndexedTerm[];
  fuse: Fuse<IndexedTerm>;
}

const indexCache = new WeakMap<CatalogItem[], CatalogIndex>();

function getIndex(catalog: CatalogItem[]): CatalogIndex {
  const cached = indexCache.get(catalog);
  if (cached) return cached;
  const terms = catalog.flatMap((item) => [
    ...[item.ten, ...(item.ten_khac ?? [])].map((text) => ({ item, term: normalizeVi(text), isName: true })),
    ...[item.hoat_chat ?? "", item.ma].filter(Boolean).map((text) => ({ item, term: normalizeVi(text), isName: false })),
  ]);
  const fuse = new Fuse(terms, {
    keys: ["term"],
    includeScore: true,
    threshold: MAX_SCORE,
    ignoreLocation: true,
    ignoreFieldNorm: true,
  });
  const index = { terms, fuse };
  indexCache.set(catalog, index);
  return index;
}

function toQuery(text: string, vietTat: VietTat): string {
  return normalizeVi(expandAbbreviations(text, vietTat));
}

/** Các mục có tên hoặc tên khác trùng khít với chuỗi tìm */
export function findExact(name: string, catalog: CatalogItem[], vietTat: VietTat): CatalogItem[] {
  const query = toQuery(name, vietTat);
  if (!query) return [];
  const items = getIndex(catalog)
    .terms.filter((entry) => entry.isName && entry.term === query)
    .map((entry) => entry.item);
  return [...new Set(items)];
}

export interface ScoredItem {
  item: CatalogItem;
  score: number;
  /** Tên gần khớp với chuỗi tìm; nhiều mục cùng gần khớp nghĩa là chuỗi tìm còn mơ hồ */
  closeName: boolean;
  /** Đủ tin cậy để tự gán mã */
  confident: boolean;
}

/** Tìm mờ trong danh mục, dùng cho ô chọn mã và cho bước khớp tự động */
export function searchCatalog(
  query: string,
  catalog: CatalogItem[],
  vietTat: VietTat,
  limit = 8,
): ScoredItem[] {
  const normalized = toQuery(query, vietTat);
  if (!normalized) {
    return catalog.slice(0, limit).map((item) => ({ item, score: 1, closeName: false, confident: false }));
  }
  const results: ScoredItem[] = findExact(query, catalog, vietTat).map((item) => ({
    item,
    score: 0,
    closeName: true,
    confident: true,
  }));
  const seen = new Set(results.map((entry) => entry.item.ma));
  for (const { item: entry, score = 1 } of getIndex(catalog).fuse.search(normalized)) {
    if (seen.has(entry.item.ma)) continue;
    seen.add(entry.item.ma);
    const closeName = entry.isName && score <= CONFIDENT_SCORE;
    // Chuỗi tìm quá ngắn so với tên khớp (như "alpha" so với "alpha choay") chỉ được gợi ý
    const coverage = normalized.length / entry.term.length;
    results.push({ item: entry.item, score, closeName, confident: closeName && coverage >= MIN_COVERAGE });
  }
  return results.slice(0, limit);
}

interface Strength {
  value: number;
  unit: string;
}

function parseStrength(text: string): Strength | null {
  const found = normalizeVi(text).match(/(\d+(?:\.\d+)?)\s*(mcg|mg|g|ml|%)/);
  if (!found) return null;
  const value = Number(found[1]);
  const unit = found[2];
  if (unit === "g") return { value: value * 1000, unit: "mg" };
  if (unit === "mcg") return { value: value / 1000, unit: "mg" };
  return { value, unit };
}

function sameStrength(a: string, b: string): boolean {
  const left = parseStrength(a);
  const right = parseStrength(b);
  if (left && right) return left.value === right.value && left.unit === right.unit;
  return normalizeVi(a) === normalizeVi(b);
}

/** Tách hàm lượng khi nó bị viết liền trong tên, ví dụ "Amoxicillin 250mg" */
function splitStrength(name: string): { name: string; strength: string } {
  const found = name.match(/\s*(\d+(?:[.,]\d+)?\s*(?:mcg|mg|g|ml|%))\s*$/i);
  if (!found || found.index === undefined) return { name, strength: "" };
  return { name: name.slice(0, found.index), strength: found[1] };
}

const uuTienCache = new WeakMap<CatalogItem[], CatalogItem[]>();

/** Phần danh mục bệnh viện (uu_tien) của một danh mục, nhớ lại để không lọc lại mỗi lần khớp */
function phanUuTien(catalog: CatalogItem[]): CatalogItem[] {
  const cached = uuTienCache.get(catalog);
  if (cached) return cached;
  const items = catalog.filter((item) => item.uu_tien);
  uuTienCache.set(catalog, items);
  return items;
}

/**
 * Khớp hai tầng: danh mục bệnh viện và cả danh mục thật (hàng nghìn thuốc trùng tên khác hãng).
 * Thứ tự tin: trùng tên ở danh mục bệnh viện, trùng tên ở danh mục thật, rồi mới đến tìm mờ (bệnh viện trước).
 * Không tầng nào chắc thì trả ứng viên của cả hai, tầng có trùng tên đứng trước.
 */
export function matchCatalog(
  name: string | null | undefined,
  strength: string | null | undefined,
  catalog: CatalogItem[],
  vietTat: VietTat,
): MatchResult {
  const uuTien = phanUuTien(catalog);
  if (uuTien.length === 0 || uuTien.length === catalog.length) return strip(matchIn(name, strength, catalog, vietTat));
  // Trùng tên đứng trước tìm mờ; cùng loại thì danh mục bệnh viện trước (sort giữ nguyên thứ tự khi bằng nhau)
  const [dau, sau] = [matchIn(name, strength, uuTien, vietTat), matchIn(name, strength, catalog, vietTat)].sort(
    (a, b) => Number(b.exact) - Number(a.exact),
  );
  if (dau.status === "khop") return strip(dau);
  if (sau.status === "khop" || dau.status === "khong_khop") return strip(sau);
  const candidates = [...dau.candidates, ...sau.candidates.filter((item) => !dau.candidates.includes(item))];
  return { ...strip(dau), candidates: candidates.slice(0, 6) };
}

/** Kết quả khớp trong một danh mục, kèm cờ cho biết tên có trùng khít không */
type InnerResult = MatchResult & { exact: boolean };

function strip(result: InnerResult): MatchResult {
  const { status, item, reason, candidates } = result;
  return reason === undefined ? { status, item, candidates } : { status, item, reason, candidates };
}

function matchIn(
  name: string | null | undefined,
  strength: string | null | undefined,
  catalog: CatalogItem[],
  vietTat: VietTat,
): InnerResult {
  const raw = (name ?? "").trim();
  const exact = raw !== "" && (findExact(raw, catalog, vietTat).length > 0 || findExact(splitStrength(raw).name, catalog, vietTat).length > 0);
  return { ...matchPool(name, strength, catalog, vietTat), exact };
}

function matchPool(
  name: string | null | undefined,
  strength: string | null | undefined,
  catalog: CatalogItem[],
  vietTat: VietTat,
): MatchResult {
  const raw = (name ?? "").trim();
  if (!raw) return { status: "khong_khop", item: null, candidates: [] };

  let wantedStrength = (strength ?? "").trim();
  let searchName = raw;
  let pool = findExact(raw, catalog, vietTat);
  if (pool.length === 0) {
    const split = splitStrength(raw);
    if (split.strength) {
      searchName = split.name;
      wantedStrength = wantedStrength || split.strength;
      pool = findExact(searchName, catalog, vietTat);
    }
  }

  let trusted = new Set(pool);
  if (pool.length === 0) {
    if (toQuery(searchName, vietTat).length < 3) {
      return { status: "khong_khop", item: null, reason: "Không có trong danh mục", candidates: [] };
    }
    const scored = searchCatalog(searchName, catalog, vietTat, 12);
    const close = scored.filter((entry) => entry.closeName);
    if (close.length === 0) {
      const near = scored.slice(0, 5);
      return near.length > 0
        ? { status: "mo_ho", item: null, reason: UNSURE_NAME, candidates: near.map((e) => e.item) }
        : { status: "khong_khop", item: null, reason: "Không có trong danh mục", candidates: [] };
    }
    pool = close.map((entry) => entry.item);
    trusted = new Set(close.filter((entry) => entry.confident).map((entry) => entry.item));
  }

  const accept = (item: CatalogItem): MatchResult =>
    trusted.has(item)
      ? { status: "khop", item, candidates: [] }
      : { status: "mo_ho", item: null, reason: UNSURE_NAME, candidates: [item] };

  if (wantedStrength) {
    const same = pool.filter((item) => !item.ham_luong || sameStrength(item.ham_luong, wantedStrength));
    if (same.length === 1) return accept(same[0]);
    if (same.length === 0) {
      return { status: "mo_ho", item: null, reason: "Hàm lượng này không có trong danh mục", candidates: pool.slice(0, 6) };
    }
    return { status: "mo_ho", item: null, reason: "Có nhiều mục phù hợp, cần chọn", candidates: same.slice(0, 6) };
  }

  if (pool.length === 1) return accept(pool[0]);
  const reason = pool.some((item) => item.ham_luong)
    ? "Chưa rõ hàm lượng, cần chọn"
    : "Có nhiều mục phù hợp, cần chọn";
  return { status: "mo_ho", item: null, reason, candidates: pool.slice(0, 6) };
}

export type RowMatches = Record<string, MatchResult[]>;

function matchRow(row: Values, form: FormConfig, catalogs: Catalogs, vietTat: VietTat): MatchResult | null {
  const codeField = form.fields.find((field) => field.catalog);
  if (!codeField?.catalog || !codeField.name_field) return null;
  const strengthField = codeField.strength_field;
  const result = matchCatalog(
    row[codeField.name_field] as string | null,
    strengthField ? (row[strengthField] as string | null) : null,
    catalogs[codeField.catalog] ?? [],
    vietTat,
  );
  row[codeField.id] = result.item?.ma ?? null;
  if (result.item) {
    row[codeField.name_field] = result.item.ten;
    if (strengthField && result.item.ham_luong) row[strengthField] = result.item.ham_luong;
  }
  return result;
}

/** Gán mã cho mọi dòng có trường danh mục; sửa trực tiếp trên draft */
export function applyCatalogMatch(
  draft: Draft,
  forms: FormConfig[],
  catalogs: Catalogs,
  vietTat: VietTat,
): RowMatches {
  const matches: RowMatches = {};
  for (const form of forms) {
    if (form.mode !== "rows") continue;
    matches[form.id] = (draft[form.id] as Values[]).map(
      (row) => matchRow(row, form, catalogs, vietTat) ?? { status: "khop", item: null, candidates: [] },
    );
  }
  return matches;
}
