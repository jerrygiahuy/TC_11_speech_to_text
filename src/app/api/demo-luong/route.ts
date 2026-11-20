import { assertLocalDemoRequest, ClinicalError } from "@/server/clinical/repository";
import { clinicalResponse } from "@/server/clinical/service";
import { runDemoFlow } from "@/server/demo-luong/flow";
import { getDemoStore } from "@/server/demo-luong/get-store";
import { loadKichBan } from "@/server/demo-luong/kich-ban";
import { readDemoPhieu } from "@/server/demo-luong/store";
import { ndjsonStream, SttFailure } from "@/server/demo-luong/stream";
import { proxyStt } from "@/lib/stt/proxy";
import { loadSuaChu } from "@/server/du-lieu/config";
import { suaChu } from "@/shared/giong-noi/sua-chu";
import type { DemoSource } from "@/shared/demo-luong/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_AUDIO = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function transcribe(wav: Uint8Array) {
  const response = await proxyStt(new Request("http://localhost/api/stt", { method: "POST", headers: { "content-type": "audio/wav" }, body: Buffer.from(wav) }));
  const data = await response.json().catch(() => null) as { transcript?: string; text?: string; audio_ms?: number; engine?: string } | null;
  if (!response.ok || !data) throw new SttFailure("Không nhận dạng được giọng nói. Kiểm tra dịch vụ STT rồi thử lại.");
  // Sửa chữ như eForm ("thai" → "tai", "ba mươi tám" → "38"): số đọc bằng chữ để nguyên dễ bị chốt R11c nhầm là tên
  const tho = (data.transcript ?? data.text ?? "").trim();
  const text = tho ? suaChu(tho, loadSuaChu()) : "";
  return { text, engine: data.engine ?? "stt", audio_ms: typeof data.audio_ms === "number" ? data.audio_ms : null };
}

/** Đọc body theo từng đoạn, dừng ngay khi vượt giới hạn (kể cả không có Content-Length). */
async function readBounded(request: Request): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_AUDIO) { await reader.cancel().catch(() => undefined); throw new ClinicalError("Âm thanh quá lớn (tối đa 20 MB).", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  try {
    assertLocalDemoRequest(request);
    const url = new URL(request.url);
    const phieu = url.searchParams.get("phieu") ?? "";
    if (!UUID.test(phieu)) throw new ClinicalError("Mã phiếu không hợp lệ.", 400);
    const store = getDemoStore();
    readDemoPhieu(store, phieu);
    const kichBan = url.searchParams.get("kich_ban");
    let source: DemoSource;
    let audio: Uint8Array | undefined;
    if (kichBan !== null) {
      const kb = loadKichBan(kichBan);
      if (kb.benh_nhan_id !== store.repo.read(phieu).patient_id) throw new ClinicalError("Kịch bản thuộc bệnh nhân khác với phiếu đang mở.", 409);
      const rawPhien = url.searchParams.get("phien");
      let phien: number | undefined;
      if (rawPhien !== null) {
        if (!/^[12]$/.test(rawPhien)) throw new ClinicalError("Phiên phải là 1 hoặc 2.", 400);
        phien = Number(rawPhien);
        if (!kb.doan.some(d => d.phien === phien)) throw new ClinicalError("Kịch bản không có phiên này.", 404);
      }
      source = { kind: "kich_ban", id: kichBan, ...(phien ? { phien } : {}) };
    } else {
      if (!/^audio\/(x-)?wav(?:;|$)/i.test(request.headers.get("content-type") ?? "")) throw new ClinicalError("Cần chọn kịch bản hoặc gửi âm thanh WAV.", 400);
      if (Number(request.headers.get("content-length") ?? 0) > MAX_AUDIO) throw new ClinicalError("Âm thanh quá lớn (tối đa 20 MB).", 413);
      audio = await readBounded(request);
      if (!audio.length) throw new ClinicalError("Âm thanh trống.", 400);
      source = { kind: "audio" };
    }
    const events = runDemoFlow(store, { encounterId: phieu, source, audio, transcribe: audio ? transcribe : undefined });
    return new Response(ndjsonStream(events, request.signal), {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) { return clinicalResponse(error); }
}
