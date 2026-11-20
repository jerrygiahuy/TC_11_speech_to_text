// Schema zod sinh động từ config để kiểm tra bản ghi phiếu.
import { z, type ZodType } from "zod";
import { CAU_HINH_PHIEU } from "./config";
import type { CauHinhPhieu, Cot, Truong } from "./types";

const DO_DAI_NGAN = 500;
const DO_DAI_DAI = 20000;

function schemaMotO(t: Truong | Cot): ZodType {
  const cho = t.gia_tri_cho_phep;
  switch (t.kieu) {
    case "so":
      return z.number().finite().nullable();
    case "chu_ngan":
    case "ngay_gio":
      return z.string().max(DO_DAI_NGAN);
    case "chu_dai":
      return z.string().max(DO_DAI_DAI);
    case "chon_1":
      return cho && cho.length > 0 ? z.enum(cho as [string, ...string[]]).nullable() : z.string().max(DO_DAI_NGAN).nullable();
    case "chon_nhieu": {
      const phanTu = cho && cho.length > 0 ? z.enum(cho as [string, ...string[]]) : z.string().max(DO_DAI_NGAN);
      return z.array(phanTu).max(200);
    }
    case "bang_lap": {
      const cot = (t as Truong).cot ?? [];
      const dong: Record<string, ZodType> = {};
      for (const c of cot) dong[c.khoa] = schemaMotO(c);
      return z.array(z.object(dong).strict()).max(1000);
    }
  }
}

/** Schema cả phiếu: object lồng theo khóa chấm, mọi khóa bắt buộc có mặt, khóa lạ bị từ chối */
export function taoSchemaPhieu(cauHinh: CauHinhPhieu = CAU_HINH_PHIEU): ZodType<Record<string, unknown>> {
  // Dựng cây các nhánh trước, rồi biến thành z.object lồng
  type Cay = { [k: string]: Cay | ZodType };
  const goc: Cay = {};
  const dat = (khoa: string, schema: ZodType) => {
    const buoc = khoa.split(".");
    let cur = goc;
    for (const b of buoc.slice(0, -1)) {
      if (!cur[b]) cur[b] = {};
      cur = cur[b] as Cay;
    }
    cur[buoc[buoc.length - 1]] = schema;
  };
  for (const p of cauHinh.phan)
    for (const m of p.muc)
      for (const t of m.truong) {
        dat(t.khoa, schemaMotO(t));
        for (const con of t.khoa_con ?? []) dat(con, z.number().finite().nullable());
      }
  const dung = (cay: Cay): ZodType => {
    const shape: Record<string, ZodType> = {};
    for (const [k, v] of Object.entries(cay)) shape[k] = v instanceof z.ZodType ? v : dung(v as Cay);
    return z.object(shape).strict();
  };
  return dung(goc) as ZodType<Record<string, unknown>>;
}

export const schemaPhieu = taoSchemaPhieu();

export type KetQuaKiemTra = { ok: true; du_lieu: Record<string, unknown> } | { ok: false; loi: string };

/** Kiểm tra bản ghi; lỗi trả câu tiếng Việt kèm đường dẫn trường đầu tiên sai */
export function kiemTraPhieu(du_lieu: unknown): KetQuaKiemTra {
  const kq = schemaPhieu.safeParse(du_lieu);
  if (kq.success) return { ok: true, du_lieu: kq.data };
  const loi = kq.error.issues[0];
  const duongDan = loi.path.join(".");
  return { ok: false, loi: `Dữ liệu phiếu không hợp lệ${duongDan ? ` ở "${duongDan}"` : ""}.` };
}
