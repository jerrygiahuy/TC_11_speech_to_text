import assert from "node:assert/strict";
import { test } from "node:test";
import { CAU_HINH_PHIEU } from "../phieu-kham-ngoai-tru/config";
import { EXCEL_MAP, excelKeys } from "./excel-coverage";
import { emptyEncounter } from "./schema";
import { caSchema, listEncounterContexts, getDemoClinicalActor } from "@/server/clinical/encounter-context";

const ctx = { id: "enc-1", patientId: "patient-demo", doctorId: "doctor-demo", now: "2026-11-20T10:00:00+07:00" };

function docPointer(root: unknown, pointer: string): unknown {
  let value = root;
  for (const part of pointer.split("/").slice(1)) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  }
  return value;
}

test("moi_truong_excel_co_trong_map", () => {
  const keys = excelKeys(CAU_HINH_PHIEU);
  assert.ok(keys.length > 0);
  assert.equal(new Set(keys).size, keys.length, "khóa Excel không trùng");
  const missing = keys.filter(key => !(key in EXCEL_MAP));
  assert.deepEqual(missing, [], "mọi trường/cột Excel phải có trong EXCEL_MAP");
  const extra = Object.keys(EXCEL_MAP).filter(key => !keys.includes(key));
  assert.deepEqual(extra, [], "EXCEL_MAP không có khóa thừa so với Excel");
});

test("excel_dem_dung_49_truong_41_cot", () => {
  const keys = excelKeys(CAU_HINH_PHIEU);
  assert.equal(keys.filter(key => !key.includes("[].")).length, 49);
  assert.equal(keys.filter(key => key.includes("[].")).length, 41);
});

test("duong_encounter_ton_tai", () => {
  const encounter = emptyEncounter(ctx);
  const entries = Object.entries(EXCEL_MAP).filter(([, item]) => item.noi === "encounter");
  assert.ok(entries.length > 0);
  for (const [key, item] of entries) assert.notEqual(docPointer(encounter, item.duong), undefined, `${key} -> ${item.duong}`);
});

test("phieu_kham_khong_co_truong_ngoai_schema", () => {
  const text = JSON.stringify(emptyEncounter(ctx).phieu_kham);
  for (const word of ["co_pttt"]) assert.ok(!text.includes(`"${word}"`), `còn "${word}"`);
  assert.ok(!("xn_me" in emptyEncounter(ctx).thong_tin_khac));
});

test("phieu_kham_2_0_co_dung_cac_khoa_tim_mach", () => {
  const note = emptyEncounter(ctx).phieu_kham;
  assert.deepEqual(Object.keys(note).sort(), [
    "benh_su", "co_thuoc_dang_dung", "da_xu_ly", "di_ung", "ghi_chu_ket_qua", "hen_tai_kham", "huong_dieu_tri",
    "kham_chuyen_khoa", "kham_khac", "kham_tim_mach_ho_hap", "kham_toan_than", "loi_dan", "ly_do_kham",
    "thuoc_dang_dung", "tien_su_ban_than", "tien_su_gia_dinh", "tinh_trang_ra_vien",
  ]);
  assert.equal(note.kham_tim_mach_ho_hap, null);
  assert.equal(note.kham_chuyen_khoa, null);
});

/** Đi theo `duong` ("a.b[].c") trong khuôn zod của CaGia; trả về null nếu đường không có trong khuôn. */
function theoKhuon(duong: string): unknown | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mo = (schema: any): any => {
    let current = schema;
    while (current?.def?.innerType) current = current.def.innerType;
    return current;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schema: any = caSchema;
  for (const part of duong.split(".")) {
    const mang = part.endsWith("[]");
    const key = mang ? part.slice(0, -2) : part;
    schema = mo(schema)?.def?.shape?.[key];
    if (!schema) return null;
    if (mang) { schema = mo(schema)?.def?.element; if (!schema) return null; }
  }
  return schema;
}

test("duong_ngu_canh_ton_tai", () => {
  const entries = Object.entries(EXCEL_MAP).filter(([, item]) => item.noi === "ngu_canh");
  assert.ok(entries.length > 0);
  for (const [key, item] of entries) {
    for (const duong of [item.duong, ...(item.cung_voi ?? [])]) assert.notEqual(theoKhuon(duong), null, `${key} -> ${duong} không có trong khuôn CaGia`);
  }
  // Có số liệu thật trong fixture cho các đường đầu bảng (không chỉ đúng khuôn).
  const ca = listEncounterContexts(getDemoClinicalActor())[0].data.ca;
  for (const duong of ["sinh_hieu.ha_tam_thu", "sinh_hieu.ha_tam_truong", "lich_su.tien_su_ban_than", "lich_su.di_ung", "can_lam_sang", "xet_nghiem"]) {
    let value: unknown = ca;
    for (const part of duong.split(".")) value = value === null || typeof value !== "object" ? undefined : (value as Record<string, unknown>)[part];
    assert.notEqual(value, undefined, duong);
  }
  assert.deepEqual(EXCEL_MAP["huyet_ap"].cung_voi, ["sinh_hieu.ha_tam_truong"]);
});

test("cot_bang_lap_khong_gia_vo_encounter_luu_du", () => {
  // Cột của bảng lịch sử/kết quả không được khai là "encounter có": seed chỉ chép một phần cột (service.ts).
  const sai = Object.entries(EXCEL_MAP).filter(([key, item]) => key.includes("[].") && item.noi === "encounter" && !key.startsWith("thuoc_dang_dung[]."));
  assert.deepEqual(sai.map(([key]) => key), []);
});
