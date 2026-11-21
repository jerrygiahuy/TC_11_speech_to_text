// Lưu các đơn bác sĩ đã kê, mỗi tài khoản một file data/thoi-quen/<tài khoản>.json, để gợi ý theo thói quen.
// Chỉ dùng với dữ liệu giả: file nằm trên máy chạy prototype và không đưa lên git.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DonDaKe } from "@/shared/eform/thoi-quen";

const THU_MUC = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "thoi-quen");
/** Mỗi tài khoản chỉ giữ chừng này lần gần nhất */
const TOI_DA = 200;
/** Tên tài khoản dùng làm tên file, nên chỉ nhận chữ, số, gạch dưới, gạch ngang */
export const MAU_TAI_KHOAN = /^[A-Za-z0-9_-]{1,40}$/;

function file(taiKhoan: string): string {
  if (!MAU_TAI_KHOAN.test(taiKhoan)) throw new Error("Tên tài khoản không hợp lệ.");
  return path.join(THU_MUC, `${taiKhoan}.json`);
}

export function docThoiQuen(taiKhoan: string): DonDaKe[] {
  const f = file(taiKhoan);
  if (!fs.existsSync(f)) return [];
  return JSON.parse(fs.readFileSync(f, "utf8")) as DonDaKe[];
}

/** Thêm một lần kê; cùng id (cùng một lượt mở phiếu) thì ghi đè lần trước */
export function luuThoiQuen(taiKhoan: string, don: DonDaKe): void {
  const ds = [don, ...docThoiQuen(taiKhoan).filter((cu) => cu.id !== don.id)].slice(0, TOI_DA);
  fs.mkdirSync(THU_MUC, { recursive: true });
  fs.writeFileSync(file(taiKhoan), JSON.stringify(ds, null, 2));
}
