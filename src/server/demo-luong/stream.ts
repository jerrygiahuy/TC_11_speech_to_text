import "server-only";
import { ClinicalError } from "@/server/clinical/repository";
import type { DemoErrorEvent, DemoEvent } from "@/shared/demo-luong/types";

export class SttFailure extends Error {}

const ORDER: DemoEvent["buoc"][] = ["stt", "ban_tho", "che", "ai", "luu"];

/** NDJSON: mỗi sự kiện một dòng. Lỗi bất ngờ giữa chừng chỉ phát một dòng `loi` chung, không rò stack trace. */
export function ndjsonStream(events: AsyncGenerator<DemoEvent>, signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let last: DemoEvent["buoc"] | null = null;
  const stop = () => events.return(undefined).then(() => undefined, () => undefined);
  const onAbort = () => { void stop(); };
  signal.addEventListener("abort", onAbort, { once: true });
  const done = () => signal.removeEventListener("abort", onAbort);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await events.next();
        if (next.done) { done(); controller.close(); return; }
        last = next.value.buoc;
        controller.enqueue(encoder.encode(JSON.stringify(next.value) + "\n"));
      } catch (error) {
        done();
        const buoc = error instanceof SttFailure || !last ? "stt" : ORDER[Math.min(ORDER.indexOf(last) + 1, 4)];
        const loi = error instanceof SttFailure || error instanceof ClinicalError ? error.message : "Luồng xử lý bị lỗi.";
        try { controller.enqueue(encoder.encode(JSON.stringify({ buoc, trang_thai: "loi", ms: 0, du_lieu: { loi } }) + "\n")); } catch { /* đã đóng */ }
        try { controller.close(); } catch { /* đã đóng */ }
      }
    },
    cancel() { done(); return stop(); },
  });
}
