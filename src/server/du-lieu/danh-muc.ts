// Ghép danh mục thật (data/tham-khao/, cào bằng npm run cao-du-lieu) với danh mục bệnh viện soạn tay (data/catalog/).
// Mục soạn tay đứng trước, được đánh dấu uu_tien để bước khớp xét trước; mục thật trùng mã thì bị thay.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { normalizeVi } from "@/shared/normalize";
import type { CatalogItem, Catalogs } from "@/shared/types";
import type { Icd10 } from "@/shared/eform/types";

interface DichVuGoc {
  ma: string;
  ten: string;
}

interface ThuocGoc {
  ma: string;
  ten: string;
  hoat_chat: string;
  ham_luong: string;
  dang_bao_che: string;
  het_han_sdk: string;
}

interface IcdGoc {
  ma: string;
  ten: string;
  ma_nhom: string;
  chi_tiet: boolean;
}

function duongDan(...parts: string[]): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...parts);
}

/** Đọc file JSON, nhớ kết quả theo thời điểm sửa file để không phải đọc và xử lý lại 2 MB thuốc mỗi lần gọi */
const boNho = new Map<string, { mtime: number; value: unknown }>();

function docCoNho<T>(files: string[], xuLy: () => T): T {
  const khoa = files.join("|");
  const mtime = files.reduce((tong, file) => tong + (fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0), 0);
  const cu = boNho.get(khoa);
  if (cu && cu.mtime === mtime) return cu.value as T;
  const value = xuLy();
  boNho.set(khoa, { mtime, value });
  return value;
}

function docJson<T>(file: string, macDinh: T): T {
  if (!fs.existsSync(file)) return macDinh;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Bỏ chỗ trống kiểu "--" mà nguồn dùng khi thiếu dữ liệu */
function sach(text: string | undefined): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  return /^[-–\s]*$/.test(value) ? "" : value;
}

const HAM_LUONG = /\d+(?:[.,]\d+)?\s*(?:mcg|µg|mg|g|ml|%|iu|ui)(?:\s*\/\s*(?:\d+(?:[.,]\d+)?\s*)?(?:ml|liều(?: xịt)?|g))?/iu;

/** Hàm lượng ngắn gọn: nguồn hay để trống (khi đó lấy từ hoạt chất) hoặc chép cả câu dài */
function hamLuong(item: ThuocGoc): string {
  const value = sach(item.ham_luong);
  if (value && value.length <= 24) return value;
  const found = (value || sach(item.hoat_chat)).match(HAM_LUONG);
  return found ? found[0] : value.slice(0, 24);
}

/** Ghép mục soạn tay (ưu tiên) với mục thật; mục thật trùng mã với mục soạn tay thì bỏ */
function ghep(soanTay: CatalogItem[], that: CatalogItem[]): CatalogItem[] {
  const daCo = new Set(soanTay.map((item) => item.ma));
  return [...soanTay.map((item) => ({ ...item, uu_tien: true })), ...that.filter((item) => !daCo.has(item.ma))];
}

function dichVuThat(): CatalogItem[] {
  return docJson<DichVuGoc[]>(duongDan("data", "tham-khao", "dich-vu-ky-thuat-tmh.json"), []).map((item) => ({
    ma: item.ma,
    ten: sach(item.ten),
  }));
}

/** Thuốc lưu hành: gộp các số đăng ký trùng tên, hàm lượng, dạng bào chế (giữ số đăng ký còn hạn lâu nhất) */
function thuocThat(): CatalogItem[] {
  const goc = docJson<ThuocGoc[]>(duongDan("data", "tham-khao", "thuoc-luu-hanh-tmh.json"), []);
  const theoKhoa = new Map<string, { item: CatalogItem; hetHan: string }>();
  for (const thuoc of goc) {
    const item: CatalogItem = {
      ma: thuoc.ma,
      ten: sach(thuoc.ten),
      hoat_chat: sach(thuoc.hoat_chat),
      ham_luong: hamLuong(thuoc),
      dang_bao_che: sach(thuoc.dang_bao_che),
    };
    if (!item.ten) continue;
    const khoa = [item.ten, item.ham_luong, item.dang_bao_che].map((text) => normalizeVi(text ?? "")).join("|");
    const cu = theoKhoa.get(khoa);
    const hetHan = sach(thuoc.het_han_sdk);
    if (!cu || hetHan > cu.hetHan) theoKhoa.set(khoa, { item, hetHan });
  }
  return [...theoKhoa.values()].map((entry) => entry.item);
}

export function loadCatalogs(): Catalogs {
  const nguon = {
    "dich-vu": { soanTay: duongDan("data", "catalog", "dich-vu.json"), that: duongDan("data", "tham-khao", "dich-vu-ky-thuat-tmh.json"), doc: dichVuThat },
    thuoc: { soanTay: duongDan("data", "catalog", "thuoc.json"), that: duongDan("data", "tham-khao", "thuoc-luu-hanh-tmh.json"), doc: thuocThat },
  };
  const catalogs: Catalogs = {};
  for (const [ten, { soanTay, that, doc }] of Object.entries(nguon)) {
    catalogs[ten] = docCoNho([soanTay, that], () => ghep(docJson<CatalogItem[]>(soanTay, []), doc()));
  }
  return catalogs;
}

/**
 * ICD10 thật: chỉ giữ mã chi tiết nhất (mã nhóm 3 ký tự có mã con thì bỏ, như EMR bắt chọn mã con).
 * Từ khóa gợi ý (manh, vua) lấy từ data/eform/icd10.json; mã có trong file đó mà nguồn thật không có vẫn giữ.
 */
export function loadIcd10(): Icd10[] {
  const fileThat = duongDan("data", "tham-khao", "icd10-tmh.json");
  const fileTuKhoa = duongDan("data", "eform", "icd10.json");
  return docCoNho([fileThat, fileTuKhoa], () => {
    const that = docJson<IcdGoc[]>(fileThat, []);
    const tuKhoa = docJson<Icd10[]>(fileTuKhoa, []);
    const coMaCon = new Set(that.filter((item) => item.chi_tiet).map((item) => item.ma_nhom));
    const theoMa = new Map(tuKhoa.map((item) => [item.ma, item]));
    const ketQua: Icd10[] = that
      .filter((item) => item.chi_tiet || !coMaCon.has(item.ma))
      .map((item) => ({ ma: item.ma, ten: item.ten, manh: theoMa.get(item.ma)?.manh ?? [], vua: theoMa.get(item.ma)?.vua ?? [] }));
    const daCo = new Set(ketQua.map((item) => item.ma));
    return [...ketQua, ...tuKhoa.filter((item) => !daCo.has(item.ma))];
  });
}
