// Gọi /api/phieu-kham-ngoai-tru từ trình duyệt.
import type { ApiLoi } from "@/shared/api";
import type { BanGhiPhieu, DuLieuPhieu, TomTatPhieu } from "@/shared/phieu-kham-ngoai-tru/types";

const URL_GOC = "/api/phieu-kham-ngoai-tru";

async function goi<T>(url: string, init: RequestInit | undefined, loiMacDinh: string): Promise<T> {
  const phanHoi = await fetch(url, init);
  const data = (await phanHoi.json().catch(() => ({}))) as T | Partial<ApiLoi>;
  if (!phanHoi.ok) throw new Error((data as Partial<ApiLoi>).error ?? loiMacDinh);
  return data as T;
}

const JSON_HEADER = { "Content-Type": "application/json" };

export const dsPhieu = () => goi<TomTatPhieu[]>(URL_GOC, undefined, "Không tải được danh sách phiếu.");
export const docPhieu = (id: string) => goi<BanGhiPhieu>(`${URL_GOC}/${id}`, undefined, "Không mở được phiếu.");
export const taoPhieu = (du_lieu: DuLieuPhieu) =>
  goi<BanGhiPhieu>(URL_GOC, { method: "POST", headers: JSON_HEADER, body: JSON.stringify({ du_lieu }) }, "Không lưu được phiếu.");
export const capNhatPhieu = (id: string, du_lieu: DuLieuPhieu) =>
  goi<BanGhiPhieu>(`${URL_GOC}/${id}`, { method: "PUT", headers: JSON_HEADER, body: JSON.stringify({ du_lieu }) }, "Không lưu được phiếu.");
