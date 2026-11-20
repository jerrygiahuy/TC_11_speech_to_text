// Bộ tách bằng quy tắc: đơn giản, chỉ lấy lại đúng phần chữ bác sĩ đã nói, không suy diễn.
// Từ khóa nhận diện từng phần nằm trong config/forms/*.json (mock_keywords).
import { findExact } from "@/shared/match";
import { expandAbbreviations, foldKeepLength, normalizeVi } from "@/shared/normalize";
import type { Catalogs, Draft, FormConfig, Values, VietTat } from "@/shared/types";

const FILLERS = /(^|[\s.,;])(?:ừm|ừ|ờ|à|ậm)(?=[\s,.;]|$),?/giu;
const LEADING_CONNECTORS = /^(?:[\s:,.\-]|là\s|thì\s|thấy\s)+/iu;
const TRAILING_PUNCTUATION = /[\s,.;:]+$/u;

interface Target {
  formId: string;
  fieldId?: string;
  keywords: string[];
}

interface Hit {
  target: Target;
  start: number;
  end: number;
}

function findKeyword(folded: string, keyword: string): { start: number; end: number; atStart: boolean }[] {
  const hits = [];
  let from = 0;
  while (true) {
    const start = folded.indexOf(keyword, from);
    if (start < 0) break;
    const end = start + keyword.length;
    const boundaryBefore = start === 0 || !/[a-z0-9]/.test(folded[start - 1]);
    const boundaryAfter = end === folded.length || !/[a-z0-9]/.test(folded[end]);
    if (boundaryBefore && boundaryAfter) {
      const atStart = /(^|[.;\n])\s*$/.test(folded.slice(0, start));
      hits.push({ start, end, atStart });
    }
    from = start + 1;
  }
  return hits;
}

/** Ưu tiên từ khóa đứng đầu câu; nếu không có thì lấy vị trí xuất hiện đầu tiên */
function locate(folded: string, target: Target, vietTat: VietTat): Hit | null {
  const hits = target.keywords.flatMap((keyword) =>
    findKeyword(folded, foldKeepLength(expandAbbreviations(keyword, vietTat))),
  );
  if (hits.length === 0) return null;
  hits.sort((a, b) => Number(b.atStart) - Number(a.atStart) || a.start - b.start || b.end - a.end);
  return { target, start: hits[0].start, end: hits[0].end };
}

function clean(text: string): string {
  return text.replace(LEADING_CONNECTORS, "").replace(TRAILING_PUNCTUATION, "").trim();
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseServices(segment: string): Values[] {
  const rows: Values[] = [];
  for (const raw of segment.split(/[,;+]|\s+và\s+/iu)) {
    const part = clean(raw);
    if (!part) continue;
    const spokenNote = part.match(/^ghi chú\s+(.+)$/iu);
    if (spokenNote) {
      if (rows.length > 0) rows[rows.length - 1].ghi_chu = capitalize(spokenNote[1]);
      continue;
    }
    const note = part.match(/\(([^)]+)\)/);
    const quantity = part.match(/(\d+)\s*lần\s*$/iu);
    const name = part
      .replace(/\([^)]*\)/, "")
      .replace(/\d+\s*lần\s*$/iu, "")
      .trim();
    if (name) {
      rows.push({
        ten_dich_vu: name,
        so_luong: quantity ? Number(quantity[1]) : null,
        ghi_chu: note ? capitalize(note[1]) : null,
      });
    }
  }
  return rows;
}

const ROUTES: [RegExp, string][] = [
  [/\buống\b/iu, "Uống"],
  [/ngậm dưới lưỡi/iu, "Ngậm dưới lưỡi"],
  [/\btiêm\b/iu, "Tiêm"],
];

const TIMING =
  /(trước ăn sáng(?: \d+ phút)?|sau ăn sáng|sau ăn|trước ăn|buổi sáng|buổi tối|khi sốt(?: trên [\d,.]+ độ)?|khi đau(?: hoặc sốt)?)|(?<=\d\s*lần\s*\/\s*ngày\s)(sáng|tối)/iu;

function parseDrug(line: string, catalogs: Catalogs, vietTat: VietTat): Values | null {
  const strength = line.match(/(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|%)(?![\p{L}])/iu);
  const dose = line.match(/(\d+(?:[.,/]\d+)?)\s*(viên|gói|xịt|giọt|ml|ống)(\s+mỗi bên)?/iu);
  const times = line.match(/(?:x\s*|ngày\s+)(\d+)\s*lần|(\d+)\s*lần\s*\/\s*ngày/iu);
  const days = line.match(/(\d+)\s*ngày(?!\s*nay)/iu);
  const timing = line.match(TIMING);
  const route = ROUTES.find(([pattern]) => pattern.test(line))?.[1] ?? null;

  const firstNumber = line.search(/\d/);
  const beforeNumber = firstNumber >= 0 ? line.slice(0, firstNumber) : line;
  let name = clean(beforeNumber.split(",")[0]).replace(/\s+(?:uống|trái|phải)\s*$/iu, "");
  if (findExact(name, catalogs["thuoc"] ?? [], vietTat).length === 0) {
    name = name.replace(/\s+(?:uống|ngậm dưới lưỡi|ngậm|tiêm)(?:\s+(?:trái|phải))?\s*$/iu, "").trim();
  }
  if (!name) return null;

  return {
    ten_thuoc: name,
    ham_luong: strength ? `${strength[1]} ${strength[2].toLowerCase()}` : null,
    duong_dung: route,
    lieu_moi_lan: dose ? `${dose[1]} ${dose[2].toLowerCase()}${dose[3] ?? ""}` : null,
    so_lan_ngay: times ? Number(times[1] ?? times[2]) : null,
    thoi_diem: timing ? capitalize(timing[0]) : null,
    so_ngay: days ? Number(days[1]) : null,
  };
}

export function ruleExtract(
  input: string,
  forms: FormConfig[],
  catalogs: Catalogs,
  vietTat: VietTat,
): Partial<Draft> {
  const text = expandAbbreviations(input, vietTat).replace(FILLERS, "$1");
  const folded = foldKeepLength(text);

  const targets: Target[] = forms.flatMap((form) =>
    form.mode === "rows"
      ? [{ formId: form.id, keywords: form.mock_keywords ?? [] }]
      : form.fields
          // Trường không ai_fill nhưng có từ khóa là "điểm dừng": cắt đoạn trước đó, nội dung bị bỏ.
          .filter((field) => field.mock_keywords?.length)
          .map((field) => ({ formId: form.id, fieldId: field.id, keywords: field.mock_keywords ?? [] })),
  );

  const located = targets
    .map((target) => locate(folded, target, vietTat))
    .filter((hit): hit is Hit => hit !== null)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  // Bỏ các từ khóa nằm lồng trong từ khóa khác, ví dụ "chẩn đoán" trong "chẩn đoán kèm theo"
  const hits = located.filter(
    (hit, index) => !located.some((other, i) => i !== index && other.start <= hit.start && other.end >= hit.end && other.end - other.start > hit.end - hit.start),
  );

  const draft: Draft = {};
  for (const form of forms) draft[form.id] = form.mode === "rows" ? [] : {};

  hits.forEach((hit, index) => {
    const segment = text.slice(hit.end, hits[index + 1]?.start ?? text.length);
    const form = forms.find((f) => f.id === hit.target.formId);
    if (!form) return;
    if (hit.target.fieldId) {
      if (!form.fields.find((field) => field.id === hit.target.fieldId)?.ai_fill) return;
      (draft[form.id] as Values)[hit.target.fieldId] = capitalize(clean(segment)) || null;
    } else if (form.fields.some((field) => field.catalog === "thuoc")) {
      draft[form.id] = segment
        .split(/[;\n]|\.(?=\s|$)/)
        .map((line) => parseDrug(clean(line), catalogs, vietTat))
        .filter((row): row is Values => row !== null);
    } else {
      draft[form.id] = parseServices(segment);
    }
  });

  return draft;
}

/** So khớp cả câu để nhận ra ca mẫu, bỏ qua khác biệt về dấu, hoa thường, khoảng trắng */
export function isSameText(a: string, b: string): boolean {
  return normalizeVi(a) === normalizeVi(b);
}
