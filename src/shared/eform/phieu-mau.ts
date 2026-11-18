// Phiếu mẫu theo bệnh (data/eform/phieu-mau.json): nhận ra lệnh gọi mẫu trong câu bác sĩ gõ hoặc nói,
// gợi ý tên mẫu khi đang gõ, và điền chỗ trống [phải|trái], [số] ngày bằng quy tắc (chế độ mock, và sau LLM).
// Mẫu không ghi mã; mã gán ở server bằng src/shared/match.ts (src/server/du-lieu/phieu-mau.ts).
import type { PipelineResult } from "../api";
import { expandAbbreviations, foldKeepLength, normalizeVi } from "../normalize";
import type { Draft, FieldValue, Values, VietTat } from "../types";

/** Một mẫu trong data/eform/phieu-mau.json */
export interface PhieuMauGoc {
  id: string;
  ten: string;
  /** Viết tắt, không dấu, cách gọi khác; so khớp sau normalizeVi */
  bi_danh: string[];
  /** Đúng tên một mã trong data/tham-khao/icd10-tmh.json; mã do code tra, không ghi ở đây */
  icd_ten: string;
  /** Ô "Khám các bộ phận khác" (eForm có, schema LLM không có) */
  kham_khac: string;
  /** Cùng dạng Draft của config/forms: phieu_kham, chi_dinh, ke_don; không có trường mã */
  nhap: Draft;
}

/** Mẫu đã khớp mã ở server, gửi xuống trình duyệt trong EformData.phieuMau */
export interface PhieuMau {
  id: string;
  ten: string;
  bi_danh: string[];
  /** Mã ICD10 tra từ icd_ten, "" nếu không tra được */
  icd: string;
  khamKhac: string;
  /** draft đã khớp mã và tính tổng, provider "mau", duration_ms 0 */
  ketQua: PipelineResult;
}

export type GoiMau =
  | { loai: "mot"; mau: PhieuMau; conLai: string }
  | { loai: "nhieu"; cacMau: PhieuMau[]; conLai: string };

/** Từ đệm đứng sau tên mẫu không tính là chi tiết, để khỏi gọi LLM vô ích */
const TU_DEM = new Set(["nhe", "nha", "a", "u", "ok", "di", "giup", "voi"]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tên mẫu chỉ được nhận khi đứng đầu câu (có thể có "mẫu", "điền mẫu", "theo mẫu" phía trước)
 * hoặc đứng ngay sau chữ "mẫu". Tên bệnh nằm giữa một câu kể bệnh thì không tính.
 */
function timTen(text: string, folded: string, ten: string): number | null {
  const tu = normalizeVi(ten).split(" ").filter(Boolean).map(escapeRegExp);
  if (tu.length === 0) return null;
  const pattern = new RegExp(
    `(?:^[\\s\\p{P}]*(?:(dien\\s+)?(theo\\s+)?(mau)\\s+)?|(?<![a-z0-9])(mau)\\s+)(${tu.join("\\s+")})(?![a-z0-9])`,
    "dgu",
  );
  for (const match of folded.matchAll(pattern)) {
    const viTriMau = match.indices?.[3] ?? match.indices?.[4];
    // "máu" và "mẫu" bỏ dấu đều thành "mau": chỉ nhận khi bác sĩ gõ đúng "mẫu" hoặc gõ không dấu
    if (viTriMau && !["mẫu", "mau"].includes(text.slice(viTriMau[0], viTriMau[1]).toLowerCase())) continue;
    return match.indices![5][1];
  }
  return null;
}

function phanConLai(text: string, cuoi: number): string {
  const conLai = text.slice(cuoi).replace(/^[\s\p{P}]+/u, "").trim();
  const tu = normalizeVi(conLai).split(" ").filter(Boolean);
  return tu.every((t) => TU_DEM.has(t)) ? "" : conLai;
}

export function timPhieuMau(text: string, cacMau: PhieuMau[]): GoiMau | null {
  const goc = text.normalize("NFC");
  const folded = foldKeepLength(goc);
  let dai = 0;
  let khop: { mau: PhieuMau; cuoi: number }[] = [];
  for (const mau of cacMau) {
    for (const ten of [mau.ten, ...mau.bi_danh]) {
      const cuoi = timTen(goc, folded, ten);
      if (cuoi === null) continue;
      const doDai = normalizeVi(ten).length;
      if (doDai > dai) {
        dai = doDai;
        khop = [{ mau, cuoi }];
      } else if (doDai === dai && !khop.some((k) => k.mau.id === mau.id)) {
        khop.push({ mau, cuoi });
      }
    }
  }
  if (khop.length === 0) return null;
  const conLai = phanConLai(goc, khop[0].cuoi);
  return khop.length === 1
    ? { loai: "mot", mau: khop[0].mau, conLai }
    : { loai: "nhieu", cacMau: khop.map((k) => k.mau), conLai };
}

/** Tên mẫu có một từ bắt đầu bằng chữ đang gõ (2–40 ký tự), để bác sĩ biết có mẫu nào */
export function goiYTenMau(text: string, cacMau: PhieuMau[], toiDa = 5): PhieuMau[] {
  const q = normalizeVi(text).replace(/^(dien )?(theo )?mau /, "");
  if (q.length < 2 || q.length > 40) return [];
  return cacMau
    .filter((mau) => [mau.ten, ...mau.bi_danh].some((ten) => ` ${normalizeVi(ten)}`.includes(` ${q}`)))
    .slice(0, toiDa);
}

const CHO_SO = /\[số\](\s+)(ngày|tuần|tháng|giờ|độ|lần|kg)/giu;
const CHO_CHON = /\[([^\]]+)\]/g;
const SO = "(\\d+(?:[.,]\\d+)?)";

/** Số sau "sốt" mà đứng trước đơn vị thời gian ("sốt 2 ngày") thì không phải nhiệt độ */
const KHONG_PHAI_NHIET = "(?!\\s*(?:ngay|n|tuan|thang|gio)(?![a-z]))";
const THAN_NHIET = { thap: 35, cao: 42 };

/** Số đầu tiên đứng ngay trước đơn vị (riêng "độ" nhận cả số sau "sốt"), giữ nguyên cách viết của bác sĩ */
function timSo(chiTiet: string, folded: string, donVi: string): string | null {
  const truocDonVi = new RegExp(`${SO}\\s*${foldKeepLength(donVi)}(?![a-z])`).exec(folded);
  const sauSot = donVi === "độ" ? new RegExp(`(?<![a-z])sot\\s+${SO}${KHONG_PHAI_NHIET}`).exec(folded) : null;
  const found = truocDonVi ?? sauSot;
  if (!found) return null;
  const start = found.index + found[0].indexOf(found[1]);
  const so = chiTiet.slice(start, start + found[1].length);
  if (donVi === "độ") {
    const nhiet = Number(so.replace(",", "."));
    if (nhiet < THAN_NHIET.thap || nhiet > THAN_NHIET.cao) return null;
  }
  return so;
}

/** Từ đứng trước "phải/trái" cho biết đó là bên cơ thể, không phải động từ "phải" */
const NGU_CANH_BEN = new Set(["tai", "mui", "ben", "hong", "amidan", "amydan", "hach", "ma", "nhi", "thanh"]);

/** Lựa chọn có trong chi tiết. "phải/trái" chỉ tính khi đứng sau từ chỉ vị trí hoặc đứng riêng một vế ("tai T", "…, phải, …") */
function coLuaChon(luaChon: string, toanBo: string, cacVe: string[]): boolean {
  const chon = normalizeVi(luaChon);
  if (chon !== "phai" && chon !== "trai") return toanBo.includes(` ${chon} `);
  return cacVe.some((ve) => {
    const tu = ve.split(" ");
    return ve === chon || tu.some((t, i) => t === chon && i > 0 && NGU_CANH_BEN.has(tu[i - 1]));
  });
}

/** "hai bên" và "2 bên" là một */
const chuanBen = (text: string) => text.replace(/(^| )hai ben(?= |$)/g, "$12 ben");

export function dienChoTrong(text: string, chiTiet: string, vietTat: VietTat): string {
  const day = expandAbbreviations(chiTiet, vietTat);
  const folded = foldKeepLength(day);
  const toanBo = ` ${chuanBen(normalizeVi(day))} `;
  const cacVe = day
    .split(/[,;.\n]+/)
    .map((ve) => chuanBen(normalizeVi(ve)))
    .filter(Boolean);
  return text
    .replace(CHO_SO, (cho, cach: string, donVi: string) => {
      const so = timSo(day, folded, donVi.toLowerCase());
      return so ? `${so}${cach}${donVi}` : cho;
    })
    .replace(CHO_CHON, (cho, noiDung: string) => {
      // [số] chưa tìm được số thì giữ nguyên; chỉ chỗ có lựa chọn a|b mới được chọn
      if (!noiDung.includes("|")) return cho;
      const chon = noiDung.split("|").filter((luaChon) => coLuaChon(luaChon, toanBo, cacVe));
      return chon.length === 1 ? chon[0] : cho;
    });
}

function dienGiaTri(value: FieldValue, chiTiet: string, vietTat: VietTat): FieldValue {
  return typeof value === "string" ? dienChoTrong(value, chiTiet, vietTat) : value;
}

function dienValues(values: Values, chiTiet: string, vietTat: VietTat): Values {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, dienGiaTri(v, chiTiet, vietTat)]));
}

/** Điền chỗ trống ở mọi trường chữ của mẫu; trả bản mới, không sửa mẫu gốc */
export function dienChoTrongNhap(nhap: Draft, chiTiet: string, vietTat: VietTat): Draft {
  return Object.fromEntries(
    Object.entries(nhap).map(([form, value]) => [
      form,
      Array.isArray(value) ? value.map((row) => dienValues(row, chiTiet, vietTat)) : dienValues(value, chiTiet, vietTat),
    ]),
  );
}

/** Gọi AI lỗi (quá tải, hết lượt): vẫn điền theo mẫu, chỗ trống thay bằng quy tắc; mã đã khớp sẵn giữ nguyên */
export function ketQuaTheoQuyTac(mau: PhieuMau, chiTiet: string, vietTat: VietTat): PipelineResult {
  return { ...mau.ketQua, draft: dienChoTrongNhap(mau.ketQua.draft, chiTiet, vietTat) };
}

/** Mã ICD của mẫu chỉ dùng khi chẩn đoán vẫn là bệnh của mẫu; LLM đã đổi chẩn đoán thì để gợi ý theo từ khóa */
export function icdTheoMau(mau: PhieuMau, draft: Draft): string | undefined {
  if (!mau.icd) return undefined;
  const goc = (mau.ketQua.draft.phieu_kham as Values | undefined)?.chan_doan_chinh;
  const moi = (draft.phieu_kham as Values | undefined)?.chan_doan_chinh;
  const coSo = normalizeVi(String(goc ?? "").replace(/\[[^\]]*\]/g, " "));
  const hienTai = normalizeVi(String(moi ?? ""));
  return !hienTai || !coSo || hienTai.includes(coSo) ? mau.icd : undefined;
}
