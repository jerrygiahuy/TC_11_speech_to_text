"use client";

import { useEffect, useRef, useState } from "react";
import { openContinuousSession, type ContinuousCapture, type SttResult } from "@/lib/stt/continuous";
import { SpeakerSessionClient } from "@/lib/stt/speaker-client";
import { reviseWords, type SpeakerWord } from "@/lib/stt/speakers";
import { ghepTheoNguoiNoi } from "@/shared/clinical/vai-tro-nguoi-noi";
import type { RecordingBinding } from "@/shared/clinical/recording";
import type { MicButtonProps } from "./MicButton";
import { GIAO_DIEN_MIC, NoiDungMic } from "./mic-ui";

const ERRORS: Record<string, string> = {
  DENOISE_NOT_READY: "DeepFilterNet3 chưa sẵn sàng. Cài runtime và tải model local rồi thử lại.",
  DENOISE_RUNTIME_MISSING: "Chưa có runtime DeepFilterNet3. Chạy npm run stt:denoise:setup rồi thử lại.",
  DENOISE_MODEL_MISSING: "Chưa có model DeepFilterNet3. Chạy npm run stt:denoise:setup rồi thử lại.",
  DENOISE_INVALID_AUDIO: "Audio đầu vào khử nhiễu không hợp lệ. Thử thu lại hoặc chọn file WAV khác.",
  DENOISE_INVALID_OUTPUT: "WAV sau khử nhiễu không hợp lệ. Xem logs/stt-backend.err.log hoặc tắt khử nhiễu để thử lại.",
  DENOISE_OUTPUT_INVALID: "WAV sau khử nhiễu không hợp lệ. Xem logs/stt-backend.err.log hoặc tắt khử nhiễu để thử lại.",
  DENOISE_MODE_INVALID: "Chế độ khử nhiễu không hợp lệ. Chọn lại Tắt hoặc DeepFilterNet3.",
  DENOISE_MODE_CONFLICT: "Chế độ khử nhiễu của phiên đã thay đổi. Kết thúc và mở phiên mới.",
  DENOISE_FAILED: "Khử nhiễu thất bại. Xem logs/stt-backend.err.log hoặc tắt khử nhiễu để thử lại.",
  DENOISE_TIMEOUT: "Khử nhiễu quá thời gian chờ. Dừng phiên và thử lại.",
  STT_BACKEND_UNAVAILABLE: "Chưa kết nối được STT local. Chạy npm run stt:start rồi thử lại.",
  STT_MODEL_MISSING: "Chưa có model STT. Chạy npm run stt:setup rồi thử lại.",
  STT_VAD_MODEL_MISSING: "Chưa có model VAD. Chạy npm run stt:setup rồi thử lại.",
  DIARIZATION_MODEL_MISSING: "Chưa có model phân biệt người nói. Chạy npm run stt:setup rồi thử lại.",
  STT_BACKLOG: "Xử lý chậm hơn tốc độ thu; micro đã dừng để xử lý các đoạn còn lại.",
  NotAllowedError: "Trình duyệt chưa được cấp quyền dùng micro.",
  NotFoundError: "Không tìm thấy micro. Kết nối micro rồi thử lại.",
};

const SEGMENT_FRAMES = 40000;

function describe(error: unknown) {
  const code = error instanceof DOMException ? error.name : error instanceof Error ? error.message : "";
  return ERRORS[code] || `Không nhận dạng được${code ? ` (${code})` : ""}. Thử lại hoặc tắt khử nhiễu.`;
}

/** Stable text only is committed to clinical inputs; the revisable tail stays in the preview. */
export function DenoisedMic({ onStart, onText, onStop, onInterim, onGiongBacSi, beforeStart, onCaptureReady, onCaptureFailed, onStopRequest, giaoDien = GIAO_DIEN_MIC }: MicButtonProps) {
  const [phase, setPhase] = useState<"idle" | "opening" | "recording" | "processing">("idle");
  const [error, setError] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const capture = useRef<ContinuousCapture | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const callbacks = useRef({ onStart, onText, onStop, onInterim, onGiongBacSi });
  useEffect(() => { callbacks.current = { onStart, onText, onStop, onInterim, onGiongBacSi }; }, [onStart, onText, onStop, onInterim, onGiongBacSi]);
  /** Chữ tạm vừa hiện dưới nút (nếu cần) vừa báo ra ngoài để đưa lên ô nhập */
  const showInterim = (text: string) => { setInterim(text); callbacks.current.onInterim?.(text); };
  /** Lần dừng đang chạy: gọi lại thì trả đúng promise đó, để bên ngoài chỉ tiếp tục sau khi chữ cuối đã được giao. */
  const stopping = useRef<Promise<void> | null>(null);
  useEffect(() => () => {
    generation.current++;
    capture.current?.cancel();
    request.current?.abort();
  }, []);

  async function start() {
    if (busy.current) return;
    busy.current = true;
    const current = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    setPhase("opening"); setError(""); showInterim(""); setSeconds(0);
    let session: SpeakerSessionClient | null = null;
    let binding: RecordingBinding | undefined;
    let started = false;
    let settled = false;
    let words: SpeakerWord[] = [];
    let emittedUntil = 0;
    let lastSpeaker: number | null | undefined;
    const active = () => current === generation.current;
    const settle = () => {
      if (!active() || settled) return;
      settled = true;
      capture.current = null; request.current = null; busy.current = false;
      setPhase("idle"); showInterim("");
      if (started) callbacks.current.onStop?.();
    };
    const accept = (part: SttResult) => {
      if (!active()) return;
      words = reviseWords(words, { replace_from_ms: part.replace_from_ms ?? 0, words: part.words ?? [] });
      const boundary = part.final ? Infinity : (part.stable_until_ms ?? 0);
      const committed = words.filter((word) => word.start_ms >= emittedUntil && word.start_ms < boundary);
      // Chữ theo lượt kèm nhãn tạm "Người nói N:"; dừng ghi thì TroLyAi đổi nhãn thành BS/BN theo nội dung.
      if (committed.length) {
        const ghep = ghepTheoNguoiNoi(committed, lastSpeaker);
        lastSpeaker = ghep.cuoi;
        callbacks.current.onText(ghep.text, binding);
      }
      // The server replaces words by start_ms; using end_ms would lose words crossing the boundary.
      emittedUntil = Math.max(emittedUntil, boundary);
      words = words.filter((word) => word.start_ms >= boundary);
      showInterim(ghepTheoNguoiNoi(words, lastSpeaker).text);
    };
    try {
      // Giữ chỗ phiên trước khi mở micro; lỗi giữ chỗ (tab khác đang dùng micro) thì không thu.
      binding = await beforeStart?.();
      const healthResponse = await fetch("/api/stt", { cache: "no-store", signal: controller.signal });
      const health = await healthResponse.json();
      if (!healthResponse.ok) throw new Error(health.detail || "STT_BACKEND_UNAVAILABLE");
      if (!health.ready) throw new Error(health.detail || "STT_MODEL_MISSING");
      if (!health.denoise_ready) throw new Error("DENOISE_NOT_READY");
      if (!health.vad_ready) throw new Error("STT_VAD_MODEL_MISSING");
      if (!health.diarization_ready) throw new Error("DIARIZATION_MODEL_MISSING");
      session = await SpeakerSessionClient.create(controller.signal, fetch, "deepfilternet3", true, true);
      if (!active()) { await session.close(); return; }
      const backend = session;
      const recording = await openContinuousSession({
        transcribe: (wav) => backend.transcribe(wav),
        onResult: accept,
        // Đoạn tối đa 2,5 giây thay vì 5 giây: chữ hiện sớm hơn khi bác sĩ nói liền không ngắt.
        segmentFrames: SEGMENT_FRAMES,
        onElapsed: (elapsed) => { if (active()) setSeconds(elapsed); },
        onPending: () => {},
        onStopping: () => { if (active()) setPhase("processing"); },
        onStopped: settle,
        onError: (cause, sequence) => {
          if (!active()) return;
          setError(describe(cause));
          if (sequence) {
            capture.current?.cancel(); controller.abort(); void backend.close();
            settle(); generation.current++;
          }
        },
        onFinish: async () => {
          const ket = await backend.finish();
          accept(ket);
          if (active()) callbacks.current.onGiongBacSi?.(ket.voice_match?.speaker ?? null);
        },
        onCancel: () => { void backend.close(); },
      });
      if (!active()) { recording.cancel(); return; }
      capture.current = recording;
      started = true;
      setPhase("recording"); callbacks.current.onStart();
      if (binding) onCaptureReady?.({ stop: () => stopCapture(), cancel: () => { capture.current?.cancel(); } }, binding);
    } catch (cause) {
      capture.current?.cancel(); controller.abort();
      await session?.close();
      if (binding) onCaptureFailed?.(binding);
      if (active()) { setError(describe(cause)); settle(); }
    }
  }

  function stopCapture(): Promise<void> {
    if (stopping.current) return stopping.current;
    const recording = capture.current;
    if (!recording) return Promise.resolve();
    stopping.current = (async () => {
      try { await recording.stop(); }
      catch (cause) { setError(describe(cause)); recording.cancel(); throw cause; }
      finally { stopping.current = null; }
    })();
    return stopping.current;
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  // Đồng ý xử lý âm thanh y tế mặc định đã có, không hỏi lại bằng ô đánh dấu.
  return <div>
    <button type="button" disabled={phase === "opening" || phase === "processing"}
      aria-pressed={phase === "recording"} onClick={() => phase === "recording" ? (onStopRequest ? onStopRequest() : void stopCapture().catch(() => undefined)) : void start()}
      className={`${giaoDien.nut} ${phase === "recording" ? giaoDien.dangNghe : giaoDien.cho}`}>
      <NoiDungMic pha={phase} clock={clock} />
    </button>
    {interim && !onInterim && <p className="mt-1 text-sm text-muted italic">{interim}</p>}
    {error && <p role="alert" className="mt-1 text-sm text-warn-text">{error}</p>}
  </div>;
}
