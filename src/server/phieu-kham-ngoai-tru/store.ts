// Lưu phiếu khám ngoại trú thành file JSON: data/phieu-kham-ngoai-tru/<id>.json (ghi nguyên tử).
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CAU_HINH_PHIEU } from "@/shared/phieu-kham-ngoai-tru/config";
import { layTheoDuongDan } from "@/shared/phieu-kham-ngoai-tru/du-lieu";
import type { BanGhiPhieu, DuLieuPhieu, TomTatPhieu } from "@/shared/phieu-kham-ngoai-tru/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thư mục lưu: biến môi trường PHIEU_KHAM_DIR (dùng cho test) hoặc data/phieu-kham-ngoai-tru */
export function thuMucLuu(): string {
  return process.env.PHIEU_KHAM_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "phieu-kham-ngoai-tru");
}

export function laIdHopLe(id: string): boolean {
  return UUID.test(id);
}

function duongDanFile(id: string, thuMuc: string): string {
  if (!laIdHopLe(id)) throw new Error("Mã phiếu không hợp lệ.");
  return path.join(thuMuc, `${id.toLowerCase()}.json`);
}

function ghiNguyenTu(file: string, noiDung: string): void {
  const tam = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tam, noiDung);
    fs.renameSync(tam, file);
  } catch (e) {
    fs.rmSync(tam, { force: true });
    throw e;
  }
}

/** Tạo phiếu mới; `du_lieu` đã được kiểm tra bằng schema ở nơi gọi */
export function taoPhieu(du_lieu: DuLieuPhieu, thuMuc: string = thuMucLuu()): BanGhiPhieu {
  const bay_gio = new Date().toISOString();
  const ban_ghi: BanGhiPhieu = {
    id: randomUUID(),
    tao_luc: bay_gio,
    cap_nhat_luc: bay_gio,
    phien_ban_config: CAU_HINH_PHIEU.phien_ban,
    du_lieu,
  };
  fs.mkdirSync(thuMuc, { recursive: true });
  ghiNguyenTu(duongDanFile(ban_ghi.id, thuMuc), JSON.stringify(ban_ghi, null, 2));
  return ban_ghi;
}

/** Đọc một phiếu; không có file thì null; id sai dạng thì ném lỗi */
export function docPhieu(id: string, thuMuc: string = thuMucLuu()): BanGhiPhieu | null {
  const file = duongDanFile(id, thuMuc);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as BanGhiPhieu;
}

/** Thay toàn bộ `du_lieu`, giữ id và tao_luc; không có phiếu thì null */
export function capNhatPhieu(id: string, du_lieu: DuLieuPhieu, thuMuc: string = thuMucLuu()): BanGhiPhieu | null {
  const cu = docPhieu(id, thuMuc);
  if (!cu) return null;
  const moi: BanGhiPhieu = { ...cu, cap_nhat_luc: new Date().toISOString(), phien_ban_config: CAU_HINH_PHIEU.phien_ban, du_lieu };
  ghiNguyenTu(duongDanFile(id, thuMuc), JSON.stringify(moi, null, 2));
  return moi;
}

export function xoaPhieu(id: string, thuMuc: string = thuMucLuu()): boolean {
  const file = duongDanFile(id, thuMuc);
  if (!fs.existsSync(file)) return false;
  fs.rmSync(file);
  return true;
}

/** Danh sách tóm tắt, cập nhật gần nhất lên đầu; bỏ qua file hỏng */
export function lietKePhieu(thuMuc: string = thuMucLuu()): TomTatPhieu[] {
  if (!fs.existsSync(thuMuc)) return [];
  const ds: TomTatPhieu[] = [];
  for (const ten of fs.readdirSync(thuMuc)) {
    const id = ten.endsWith(".json") ? ten.slice(0, -5) : "";
    if (!laIdHopLe(id)) continue;
    try {
      const b = JSON.parse(fs.readFileSync(path.join(thuMuc, ten), "utf8")) as BanGhiPhieu;
      const chuoi = (khoa: string) => {
        const v = layTheoDuongDan(b.du_lieu, khoa);
        return typeof v === "string" ? v : "";
      };
      ds.push({ id: b.id, cap_nhat_luc: b.cap_nhat_luc, ly_do_kham: chuoi("ly_do_kham"), chan_doan_ban_dau_mo_ta: chuoi("chan_doan_ban_dau.mo_ta") });
    } catch {
      // file hỏng: bỏ qua, không làm hỏng cả danh sách
    }
  }
  return ds.sort((a, b) => b.cap_nhat_luc.localeCompare(a.cap_nhat_luc));
}
