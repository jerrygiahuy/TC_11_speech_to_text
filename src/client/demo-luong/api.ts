// Gọi API /api/demo-luong từ trình duyệt. Kiểu dùng chung nằm ở src/shared/demo-luong/types.ts.
import type { DemoEvent, DemoPhieu, KichBanTomTat } from "@/shared/demo-luong/types";

async function parse<T>(response: Response, fallback: string): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? fallback);
  return data;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });

export async function listKichBan(signal?: AbortSignal): Promise<KichBanTomTat[]> {
  return parse(await fetch("/api/demo-luong/kich-ban", { cache: "no-store", signal }), "Không đọc được danh sách kịch bản.");
}
export async function taoPhieu(benhNhanId: string): Promise<DemoPhieu> {
  return parse(await fetch("/api/demo-luong/phieu", json("POST", { benh_nhan_id: benhNhanId })), "Không tạo được phiếu demo.");
}
export async function docPhieu(id: string, signal?: AbortSignal): Promise<DemoPhieu> {
  return parse(await fetch(`/api/demo-luong/phieu/${encodeURIComponent(id)}`, { cache: "no-store", signal }), "Không đọc được phiếu demo.");
}
export async function luuBanSua(id: string, expectedRevision: number, fields: Record<string, string>): Promise<DemoPhieu> {
  return parse(await fetch(`/api/demo-luong/phieu/${encodeURIComponent(id)}`, json("PATCH", { expected_revision: expectedRevision, fields })), "Không lưu được bản sửa.");
}
export async function duyetPhieu(id: string, expectedRevision: number): Promise<DemoPhieu> {
  return parse(await fetch(`/api/demo-luong/phieu/${encodeURIComponent(id)}/duyet`, json("POST", { expected_revision: expectedRevision })), "Không duyệt được phiếu demo.");
}
export async function xoaDuLieuDemo(): Promise<void> {
  return parse(await fetch("/api/demo-luong/phieu", { method: "DELETE", cache: "no-store" }), "Không xóa được dữ liệu demo.");
}

/** Chạy luồng 5 bước; mỗi dòng NDJSON của stream gọi `onEvent` một lần. Lỗi trước khi mở stream thì ném Error tiếng Việt. */
export async function streamDemoFlow(
  phieuId: string,
  input: { kichBan: string; phien?: number } | { wav: Blob },
  onEvent: (event: DemoEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const params = new URLSearchParams({ phieu: phieuId });
  let init: RequestInit;
  if ("wav" in input) init = { method: "POST", headers: { "Content-Type": "audio/wav" }, body: input.wav, cache: "no-store", signal };
  else {
    params.set("kich_ban", input.kichBan);
    if (input.phien) params.set("phien", String(input.phien));
    init = { method: "POST", cache: "no-store", signal };
  }
  const response = await fetch(`/api/demo-luong?${params}`, init);
  if (!response.ok) await parse(response, "Không chạy được luồng demo.");
  if (!response.body) throw new Error("Máy chủ không trả luồng dữ liệu. Thử lại.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (line: string) => { if (line.trim()) onEvent(JSON.parse(line) as DemoEvent); };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(flush);
  }
  buffer += decoder.decode();
  flush(buffer);
}
