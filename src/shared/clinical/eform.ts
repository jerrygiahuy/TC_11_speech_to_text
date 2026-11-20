import { z } from "zod";
import type { CatalogItem } from "../types";
import type { DongChiDinh } from "../eform/dien-phieu";
import type { Truong } from "../eform/types";
import type { Diagnosis, Encounter, ServiceOrder, Source } from "./types";
import { emptyDefinition, parseEncounter } from "./schema";

const TEXT_FIELDS = {
  ly_do: "ly_do_kham", benh_su: "benh_su", tien_su_ban_than: "tien_su_ban_than",
  tien_su_gia_dinh: "tien_su_gia_dinh", kham_toan_than: "kham_toan_than", kham_chuyen_khoa: "kham_chuyen_khoa",
  kham_tim_mach_ho_hap: "kham_tim_mach_ho_hap", kham_khac: "kham_khac",
  ghi_chu_kq: "ghi_chu_ket_qua", huong_dieu_tri: "huong_dieu_tri", loi_dan: "loi_dan",
} as const;
const IDS = new Set([...Object.keys(TEXT_FIELDS), "thoi_gian_kham", "noi_gioi_thieu", "di_ung", "di_ung_loai", "di_ung_mo_ta", "thuoc_dang_dung", "icd_ban_dau", "mo_ta_ban_dau", "icd_ra_vien", "mo_ta_ra_vien", "icd_kem_theo", "da_xu_ly", "hen_tai_kham", "ngay_tai_kham", "tinh_trang_ra_vien", "bs_uy_quyen", "chuyen_noi_soi", "xn_benh_tat", "xn_bhxh"]);
const STATUS = {
  "Đang khám": "dang_kham", "Chờ KQ CLS": "cho_kq_cls", "Hoàn thành khám": "hoan_thanh_kham",
  "Nhập nội trú": "nhap_noi_tru", "Chuyển cấp cứu": "chuyen_cap_cuu", "Chuyển CSKCB BHYT": "chuyen_cskcb_bhyt", "Không khám": "khong_kham",
} as const;
const OUTCOME = { "Khỏi": "khoi", "Đỡ, giảm": "do_giam", "Chưa thay đổi": "chua_thay_doi", "Nặng hơn": "nang_hon", "Khác": "khac" } as const;
const medicationRow = z.object({ ten: z.string().max(500), ham_luong: z.string().max(500), cach_dung: z.string().max(500) }).strict();
const fieldSchema = z.object({ value: z.string().max(20000), nguon: z.enum(["cu", "ai", "xem", "sua", "bs"]).nullable() }).strict();
const snapshotSchema = z.object({
  chiDinhLyDo: z.string().max(10000).optional(),
  chiDinhDeCap: z.enum(["chua_de_cap", "khong_chi_dinh", "co_chi_dinh"]).optional(),
  /** Danh sách thuốc đang dùng, giữ thứ tự dòng; ghi chú của bảng Excel gộp vào `cach_dung`. */
  thuocDangDung: z.array(medicationRow).max(50).optional(),
  fields: z.record(z.string().refine(key => IDS.has(key), "Trường không thuộc phiếu khám."), fieldSchema),
  chiDinh: z.array(z.object({
    id: z.string().max(100).optional(), ma: z.string().max(200), ten: z.string().trim().min(1).max(1000),
    vi_tri: z.string().max(1000).optional(), ben: z.enum(["phai", "trai", "hai_ben", "khong_ap_dung"]).nullable().optional(),
    so_luong: z.string().max(30), ghi_chu: z.string().max(5000),
    nguon: z.enum(["cu", "ai", "xem", "sua", "bs"]), ung_vien: z.array(z.unknown()).max(100).transform(() => [] as CatalogItem[]), tu_ai: z.boolean().optional(),
  }).strict()).max(200),
  trangThai: z.enum(Object.keys(STATUS) as [keyof typeof STATUS, ...Array<keyof typeof STATUS>]),
}).strict();
export type EformSnapshot = z.infer<typeof snapshotSchema>;
export const parseEformSnapshot = (input: unknown): EformSnapshot => snapshotSchema.parse(input);
const text = (value: string) => value.trim() || null;
const csv = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
const yesNo = (value: string): boolean | null => value === "Có" || value === "NB có" ? true : value === "Không" || value === "NB không có" ? false : null;
const localTime = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 16);
const nguon = (source: Source | undefined): Truong["nguon"] => !source ? "cu" : source.nguon === "ai" ? (["chap_nhan", "da_sua"].includes(source.review.trang_thai) ? "ai" : "xem") : source.nguon === "nhap_tay" ? "bs" : "cu";

/** Full snapshot of the two supported screens; preserves non-UI structured fields in base. */
export function applyEformSnapshot(base: Encounter, input: EformSnapshot, context: { now: string; newId: () => string; services: CatalogItem[]; icd?: { ma: string; ten: string }[] }): Encounter {
  const result = structuredClone(base);
  const note = result.phieu_kham;
  const fields = input.fields;
  const get = (id: string) => fields[id]?.value ?? "";
  const at = (object: unknown, pointer: string): unknown => pointer.split("/").slice(1).reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, object);
  const record = (id: string, pointer: string) => {
    if (JSON.stringify(at(base, pointer)) === JSON.stringify(at(result, pointer))) return;
    result.nguon_du_lieu = result.nguon_du_lieu.filter(item => item.field_path !== pointer && !item.field_path.startsWith(`${pointer}/`) && !pointer.startsWith(`${item.field_path}/`));
    const source = emptyDefinition<Source>("source");
    Object.assign(source, { field_path: pointer, nguon: ["ai", "xem"].includes(fields[id]?.nguon ?? "") ? "ai" : fields[id]?.nguon === "cu" ? "he_thong" : "nhap_tay", source_system: "prototype-eform" });
    result.nguon_du_lieu.push(source);
  };
  for (const [id, key] of Object.entries(TEXT_FIELDS)) if (id in fields) {
    note[key as typeof TEXT_FIELDS[keyof typeof TEXT_FIELDS]] = text(get(id));
    record(id, `/phieu_kham/${key}`);
  }
  if ("thoi_gian_kham" in fields && get("thoi_gian_kham")) {
    const time = get("thoi_gian_kham");
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(time)) throw new Error("Thời gian khám không hợp lệ.");
    result.encounter_at = `${time}:00+07:00`;
  }
  if ("noi_gioi_thieu" in fields) {
    result.referral_source = get("noi_gioi_thieu") === "Tự đến" ? "tu_den" : get("noi_gioi_thieu") === "Cơ quan y tế" ? "co_quan_y_te" : null;
    record("noi_gioi_thieu", "/referral_source");
  }
  if ("da_xu_ly" in fields) { note.da_xu_ly = yesNo(get("da_xu_ly")); record("da_xu_ly", "/phieu_kham/da_xu_ly"); }
  if ("thuoc_dang_dung" in fields) {
    note.co_thuoc_dang_dung = yesNo(get("thuoc_dang_dung"));
    if (note.co_thuoc_dang_dung === false) note.thuoc_dang_dung = [];
    record("thuoc_dang_dung", "/phieu_kham/co_thuoc_dang_dung");
  }
  if (input.thuocDangDung) {
    const old = base.phieu_kham.thuoc_dang_dung;
    note.thuoc_dang_dung = input.thuocDangDung.map((row, index) => ({
      ten: text(row.ten), ham_luong: text(row.ham_luong), cach_dung: text(row.cach_dung),
      trang_thai: old[index] && (old[index].ten ?? "") === row.ten.trim() ? old[index].trang_thai : null,
    }));
    record("thuocDangDung", "/phieu_kham/thuoc_dang_dung");
  }
  if ("di_ung" in fields) {
    note.di_ung.trang_thai = ({ "Có": "co", "Không": "khong", "Không xác định": "khong_xac_dinh" } as const)[get("di_ung")] ?? "chua_de_cap";
    if (note.di_ung.trang_thai !== "co") { note.di_ung.loai = []; note.di_ung.mo_ta = null; }
    record("di_ung", "/phieu_kham/di_ung/trang_thai");
    if (note.di_ung.trang_thai !== "co") {
      record("di_ung", "/phieu_kham/di_ung/loai");
      record("di_ung", "/phieu_kham/di_ung/mo_ta");
    }
  }
  if (note.di_ung.trang_thai === "co") {
    if ("di_ung_loai" in fields) { note.di_ung.loai = csv(get("di_ung_loai")); record("di_ung_loai", "/phieu_kham/di_ung/loai"); }
    if ("di_ung_mo_ta" in fields) { note.di_ung.mo_ta = text(get("di_ung_mo_ta")); record("di_ung_mo_ta", "/phieu_kham/di_ung/mo_ta"); }
  }
  if ("hen_tai_kham" in fields) {
    note.hen_tai_kham.co_hen = yesNo(get("hen_tai_kham"));
    if (note.hen_tai_kham.co_hen === false) note.hen_tai_kham = { co_hen: false, nguyen_van: null, sau_bao_lau: { value: null, unit: null }, ngay_cu_the: null };
    record("hen_tai_kham", "/phieu_kham/hen_tai_kham/co_hen");
  }
  if ("ngay_tai_kham" in fields && note.hen_tai_kham.co_hen !== false) {
    const day = text(get("ngay_tai_kham"));
    if (day && day !== note.hen_tai_kham.ngay_cu_the) { note.hen_tai_kham.nguyen_van = null; note.hen_tai_kham.sau_bao_lau = { value: null, unit: null }; }
    note.hen_tai_kham.ngay_cu_the = day;
    record("ngay_tai_kham", "/phieu_kham/hen_tai_kham/ngay_cu_the");
  }
  if ("tinh_trang_ra_vien" in fields) note.tinh_trang_ra_vien = OUTCOME[get("tinh_trang_ra_vien") as keyof typeof OUTCOME] ?? null;
  for (const id of ["chuyen_noi_soi", "xn_benh_tat", "xn_bhxh"] as const) if (id in fields) { result.thong_tin_khac[id] = yesNo(get(id)); record(id, `/thong_tin_khac/${id}`); }
  // Delegation is not accepted from client fields; session/HIS will own that relation.
  const diagnosis = (stage: "ban_dau" | "ra_vien" | "chua_ro", code: string, description: string, role: "chinh" | "kem_theo" = "chinh") => {
    const previous = result.chan_doan.find(item => item.noi_dung.giai_doan === stage && item.noi_dung.vai_tro === role && (role === "chinh" || item.icd.code === code))
      ?? result.chan_doan.find(item => item.noi_dung.vai_tro === "chua_ro" && (item.noi_dung.giai_doan === stage || item.noi_dung.giai_doan === "chua_ro") && (role === "chinh" || item.noi_dung.mo_ta === text(description)));
    if (previous && previous.noi_dung.giai_doan === stage && (previous.icd.code ?? "") === code && previous.noi_dung.mo_ta === text(description)) return structuredClone(previous);
    const row = previous ? structuredClone(previous) : emptyDefinition<Diagnosis>("diagnosis");
    row.id ||= context.newId();
    row.noi_dung = { giai_doan: stage, vai_tro: role, mo_ta: text(description), muc_do_khang_dinh: previous?.noi_dung.muc_do_khang_dinh ?? "chua_ro" };
    if (!previous || (previous.icd.code ?? "") !== code) {
      const match = context.icd?.find(item => item.ma === code);
      if (code && context.icd && !match) throw new Error("Mã ICD không có trong danh mục.");
      row.icd = { catalog_id: code || null, code_system: code ? "prototype-icd10" : null, code: code || null, display: match?.ten ?? (code ? description : null), catalog_version: null, trang_thai: code ? "bac_si_chon" : "chua_khop", ung_vien_ids: [] };
    }
    row.review = { trang_thai: "chua_duyet", reviewer_id: null, reviewed_at: null };
    return row;
  };
  for (const [stage, codeId, textId] of [["ban_dau", "icd_ban_dau", "mo_ta_ban_dau"], ["ra_vien", "icd_ra_vien", "mo_ta_ra_vien"]] as const) {
    if (!(codeId in fields) && !(textId in fields)) continue;
    const row = (get(codeId) || get(textId)) ? diagnosis(stage, get(codeId), get(textId)) : null;
    // Dòng AI chưa rõ giai đoạn đang hiện ở ô ban đầu thì được thay khi bác sĩ sửa/xóa ô, không để hiện lại.
    const hienTam = stage === "ban_dau" && !result.chan_doan.some(item => item.noi_dung.giai_doan === "ban_dau" && item.noi_dung.vai_tro === "chinh")
      ? result.chan_doan.find(item => item.noi_dung.giai_doan === "chua_ro" && item.noi_dung.vai_tro !== "kem_theo")?.id : undefined;
    result.chan_doan = result.chan_doan.filter(item => item.id !== row?.id && item.id !== hienTam && !(item.noi_dung.giai_doan === stage && item.noi_dung.vai_tro === "chinh"));
    if (row) result.chan_doan.push(row);
  }
  if ("icd_kem_theo" in fields) {
    const rows = [...new Set(csv(get("icd_kem_theo")))].map(code => {
      const existing = result.chan_doan.find(item => item.noi_dung.vai_tro === "kem_theo" && item.icd.code === code);
      if (existing) return structuredClone(existing);
      return diagnosis("chua_ro", code, context.icd?.find(item => item.ma === code)?.ten ?? "", "kem_theo");
    });
    result.chan_doan = result.chan_doan.filter(item => item.noi_dung.vai_tro !== "kem_theo" || !item.icd.code).concat(rows);
  }
  result.status = STATUS[input.trangThai];
  const used = new Set<string>();
  const oldOrders = base.chi_dinh.items;
  result.chi_dinh.items = input.chiDinh.map(row => {
    const previous = oldOrders.find(item => !used.has(item.id) && (row.id ? row.id === item.id : (item.danh_muc.code ?? "") === row.ma && (item.danh_muc.display ?? item.noi_dung.ten_dich_vu) === row.ten));
    if (previous) used.add(previous.id);
    const item = previous ? structuredClone(previous) : emptyDefinition<ServiceOrder>("serviceOrder");
    item.id ||= context.newId();
    let group = result.chi_dinh.groups.find(group => group.id === item.group_id) ?? result.chi_dinh.groups[0];
    if (!group) { group = { id: context.newId(), chan_doan_lich_su_lam_sang: null, room_id: base.room_id, bed_id: base.bed_id, requester_id: base.examiner_id, created_at: context.now }; result.chi_dinh.groups.push(group); }
    item.group_id = group.id;
    const number = row.so_luong.trim() ? Number(row.so_luong.replace(",", ".")) : null;
    if (number !== null && (!Number.isFinite(number) || number <= 0)) throw new Error("Số lượng dịch vụ phải là số dương.");
    const sameSelection = previous && (previous.danh_muc.code ?? "") === row.ma && (previous.danh_muc.display ?? previous.noi_dung.ten_dich_vu) === row.ten;
    const match = row.ma ? context.services.find(service => service.ma === row.ma) : undefined;
    if (row.ma && !match && !sameSelection) throw new Error("Dịch vụ không có trong danh mục.");
    Object.assign(item.noi_dung, { ten_dich_vu: sameSelection ? previous.noi_dung.ten_dich_vu : row.ten, so_luong: number, ghi_chu: text(row.ghi_chu) });
    if (row.vi_tri !== undefined) item.noi_dung.vi_tri = text(row.vi_tri);
    if (row.ben !== undefined) item.noi_dung.ben = row.ben;
    if (!sameSelection) item.danh_muc = { catalog_id: match?.ma ?? null, code_system: match ? "prototype-service" : null, code: match?.ma ?? null, display: match?.ten ?? null, catalog_version: null, trang_thai: match ? "bac_si_chon" : "chua_khop", ung_vien_ids: [] };
    item.chan_doan_ids = item.chan_doan_ids.filter(id => result.chan_doan.some(dx => dx.id === id));
    if (!previous || JSON.stringify({ ...item, review: null }) !== JSON.stringify({ ...previous, review: null })) {
      item.review = { trang_thai: "chua_duyet", reviewer_id: null, reviewed_at: null };
      item.trang_thai = "nhap";
    }
    return item;
  });
  // `co_chi_dinh` được phép chưa có dòng dịch vụ (04, ca 013): giữ nguyên khi bác sĩ chưa thêm dòng; có dòng thì bắt buộc `co_chi_dinh`.
  const deCapYeuCau = input.chiDinhDeCap ?? base.chi_dinh.de_cap;
  result.chi_dinh.de_cap = result.chi_dinh.items.length || deCapYeuCau === "co_chi_dinh" ? "co_chi_dinh" : deCapYeuCau === "khong_chi_dinh" ? "khong_chi_dinh" : "chua_de_cap";
  if (input.chiDinhLyDo !== undefined) {
    const reason = text(input.chiDinhLyDo);
    const currentGroup = result.chi_dinh.groups.at(-1);
    if (currentGroup) {
      currentGroup.chan_doan_lich_su_lam_sang = reason;
      record("clinicalInfo", `/chi_dinh/groups/${result.chi_dinh.groups.indexOf(currentGroup)}/chan_doan_lich_su_lam_sang`);
    }
    if (reason) for (const group of result.chi_dinh.groups) if (!group.chan_doan_lich_su_lam_sang) {
      group.chan_doan_lich_su_lam_sang = reason;
      record("clinicalInfo", `/chi_dinh/groups/${result.chi_dinh.groups.indexOf(group)}/chan_doan_lich_su_lam_sang`);
    }
  }
  // Rebase unchanged row evidence by stable ID; never attach old evidence to an edited/deleted row.
  result.nguon_du_lieu = result.nguon_du_lieu.flatMap(source => {
    const match = /^\/(chi_dinh\/items|chan_doan)\/(\d+)(\/.*)?$/.exec(source.field_path);
    if (!match) return [source];
    const before = match[1] === "chan_doan" ? base.chan_doan : base.chi_dinh.items;
    const after = match[1] === "chan_doan" ? result.chan_doan : result.chi_dinh.items;
    const old = before[Number(match[2])];
    const index = old ? after.findIndex(item => item.id === old.id) : -1;
    if (index < 0 || JSON.stringify(old) !== JSON.stringify(after[index])) return [];
    return [{ ...source, field_path: `/${match[1]}/${index}${match[3] ?? ""}` }];
  });
  result.audit = { ...result.audit, updated_at: context.now, updated_by: base.examiner_id, approved_at: null, approved_by: null };
  return parseEncounter(result);
}

export function projectEform(record: Encounter): EformSnapshot {
  const fields: Record<string, Truong> = {};
  const set = (id: string, value: string | null, path = `/phieu_kham/${id}`) => {
    const sources = record.nguon_du_lieu.filter(item => item.field_path === path || path.startsWith(`${item.field_path}/`) || item.field_path.startsWith(`${path}/`));
    const source = sources.find(item => item.nguon === "ai" && item.review.trang_thai === "chua_duyet") ?? sources.find(item => item.field_path === path) ?? sources[0];
    fields[id] = { value: value ?? "", nguon: value ? nguon(source) : null };
  };
  const note = record.phieu_kham;
  for (const [id, key] of Object.entries(TEXT_FIELDS)) set(id, note[key as typeof TEXT_FIELDS[keyof typeof TEXT_FIELDS]], `/phieu_kham/${key}`);
  set("thoi_gian_kham", localTime(record.encounter_at));
  set("noi_gioi_thieu", record.referral_source === "tu_den" ? "Tự đến" : record.referral_source === "co_quan_y_te" ? "Cơ quan y tế" : null, "/referral_source");
  set("di_ung", ({ co: "Có", khong: "Không", khong_xac_dinh: "Không xác định", chua_de_cap: "" })[note.di_ung.trang_thai]);
  set("di_ung_loai", note.di_ung.loai.join(","), "/phieu_kham/di_ung/loai"); set("di_ung_mo_ta", note.di_ung.mo_ta, "/phieu_kham/di_ung/mo_ta");
  const boolText = (value: boolean | null) => value === null ? "" : value ? "Có" : "Không";
  set("da_xu_ly", boolText(note.da_xu_ly));
  set("thuoc_dang_dung", note.co_thuoc_dang_dung === null ? null : note.co_thuoc_dang_dung ? "NB có" : "NB không có", "/phieu_kham/co_thuoc_dang_dung");
  set("hen_tai_kham", boolText(note.hen_tai_kham.co_hen)); set("ngay_tai_kham", note.hen_tai_kham.ngay_cu_the, "/phieu_kham/hen_tai_kham/ngay_cu_the");
  set("tinh_trang_ra_vien", Object.entries(OUTCOME).find(([, value]) => value === note.tinh_trang_ra_vien)?.[0] ?? null);
  for (const id of ["chuyen_noi_soi", "xn_benh_tat", "xn_bhxh"] as const) set(id, boolText(record.thong_tin_khac[id]), `/thong_tin_khac/${id}`);
  for (const [stage, codeId, textId] of [["ban_dau", "icd_ban_dau", "mo_ta_ban_dau"], ["ra_vien", "icd_ra_vien", "mo_ta_ra_vien"]] as const) {
    // Chẩn đoán AI chưa rõ giai đoạn (giai_doan = chua_ro) chỉ hiện ở ô ban đầu, tuyệt đối không chép sang ra viện.
    const dx = record.chan_doan.find(item => item.noi_dung.giai_doan === stage && item.noi_dung.vai_tro === "chinh")
      ?? record.chan_doan.find(item => item.noi_dung.giai_doan === stage && item.noi_dung.vai_tro === "chua_ro")
      ?? (stage === "ban_dau" ? record.chan_doan.find(item => item.noi_dung.giai_doan === "chua_ro" && item.noi_dung.vai_tro !== "kem_theo") : undefined);
    set(codeId, dx?.icd.code ?? null); set(textId, dx?.noi_dung.mo_ta ?? null);
  }
  set("icd_kem_theo", record.chan_doan.filter(item => item.noi_dung.vai_tro === "kem_theo").map(item => item.icd.code).filter(Boolean).join(","));
  const rows: DongChiDinh[] = record.chi_dinh.items.map(item => ({ id: item.id, ma: item.danh_muc.code ?? "", ten: item.danh_muc.display ?? item.noi_dung.ten_dich_vu ?? "Dịch vụ chưa có tên", vi_tri: item.noi_dung.vi_tri ?? "", ben: item.noi_dung.ben, so_luong: item.noi_dung.so_luong === null ? "" : String(item.noi_dung.so_luong), ghi_chu: item.noi_dung.ghi_chu ?? "", nguon: item.review.trang_thai === "chua_duyet" ? "xem" : "bs", ung_vien: [] }));
  const thuocDangDung = note.thuoc_dang_dung.map(item => ({ ten: item.ten ?? "", ham_luong: item.ham_luong ?? "", cach_dung: item.cach_dung ?? "" }));
  return parseEformSnapshot({ fields, thuocDangDung, chiDinh: rows, chiDinhLyDo: record.chi_dinh.groups.at(-1)?.chan_doan_lich_su_lam_sang ?? "", chiDinhDeCap: record.chi_dinh.de_cap, trangThai: Object.entries(STATUS).find(([, value]) => value === record.status)?.[0] ?? "Đang khám" });
}
