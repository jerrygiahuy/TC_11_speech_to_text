"use client";

import { useEffect, useRef, useState } from "react";
import { DenoisedMic } from "./DenoisedMic";
import { GIAO_DIEN_MIC, NoiDungMic } from "./mic-ui";
import { ASR_MAX_SECONDS, ASR_SAMPLE_RATE, type ApiLoi, type AsrKetQua, type AsrPhienMoi, type AsrTrangThai } from "@/shared/api";
import type { RecordingBinding, RecordingHandle } from "@/shared/clinical/recording";

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Trình duyệt chưa được cấp quyền dùng micro.",
  "service-not-allowed": "Trình duyệt chưa được cấp quyền dùng micro.",
  "audio-capture": "Không tìm thấy micro.",
  network: "Không kết nối được dịch vụ nhận giọng nói. Hãy kiểm tra internet hoặc gõ tay.",
};

/** Kiểu nút cho từng trang; không truyền thì dùng kiểu của màn hình làm việc */
export interface GiaoDienMic {
  /** Lớp chung của nút */
  nut: string;
  /** Thêm vào khi đang nghe */
  dangNghe: string;
  /** Thêm vào khi chưa nghe */
  cho: string;
}

export interface MicButtonProps {
  onStart: () => void;
  /** Kèm binding đã chụp lúc bắt đầu thu (nếu có beforeStart): chữ đến muộn vẫn thuộc đúng lượt và phiên đó */
  onText: (text: string, binding?: RecordingBinding) => void;
  /** Gọi khi dừng nghe (bác sĩ bấm dừng, hết giờ hoặc lỗi) */
  onStop?: () => void;
  /** Chữ tạm (câu đang nói dở) cập nhật liên tục; chuỗi rỗng khi hết. Có truyền thì nút không tự hiện chữ tạm bên dưới */
  onInterim?: (text: string) => void;
  /** Gọi ngay trước onStop: người nói khớp giọng bác sĩ đã đăng ký (null: chưa đăng ký hoặc không khớp rõ) */
  onGiongBacSi?: (speaker: number | null) => void;
  /** Giữ chỗ phiên ghi âm trước khi mở micro; lỗi (vd. micro đang dùng ở tab khác) thì không mở micro */
  beforeStart?: () => Promise<RecordingBinding>;
  /** Micro đã thu; handle.stop() chỉ xong sau khi chữ cuối đã đưa vào onText */
  onCaptureReady?: (handle: RecordingHandle, binding: RecordingBinding) => void;
  /** Đã giữ chỗ nhưng không mở được micro: bên ngoài cần chốt phiên đã giữ */
  onCaptureFailed?: (binding: RecordingBinding) => void;
  /** Nút Dừng nhờ bên ngoài điều phối (dừng micro, chốt phiên, lưu). Không truyền thì tự dừng tại chỗ */
  onStopRequest?: () => void;
  giaoDien?: GiaoDienMic;
}


/** Only local Zipformer is allowed for medical audio; fail closed without cloud fallback. */
export function MicButton(props: MicButtonProps) {
  const [mode, setMode] = useState<"dang-kiem" | "zipformer" | "blocked">("dang-kiem");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/asr")
      .then((res) => res.json())
      .then((data: AsrTrangThai) => {
        if (!active) return;
        if (data.provider === "zipformer" && data.sanSang) return setMode("zipformer");
        setMode("blocked");
        setNote(data.provider === "zipformer"
          ? `Máy chủ chưa thấy model giọng nói ở ${data.thuMucModel}`
            + (data.thieu?.length ? ` (thiếu ${data.thieu.join(", ")})` : "")
            + ". Chạy npm run tai-model-giong-noi ở thư mục dự án đang chạy server, hoặc gõ tay."
          : "Chính sách dữ liệu y tế chỉ cho phép nhận dạng trên máy. Đặt ASR_PROVIDER=zipformer hoặc gõ tay.");
      })
      .catch(() => {
        if (!active) return;
        setMode("blocked");
        setNote("Không kiểm tra được nhận dạng trên máy. Hãy thử lại hoặc gõ tay.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (mode === "dang-kiem") return null;
  if (mode === "zipformer") return <ZipformerMic {...props} />;
  return <p role="status" className="mt-1 text-xs text-muted">{note}</p>;
}

/** Cứ chừng này mili giây gửi một mẩu âm thanh lên server */
const CHUNK_MS = 400;
// AudioWorklet chỉ chuyển từng khối mẫu âm thanh về luồng chính
const WORKLET = `class GhiAm extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor("ghi-am", GhiAm);`;

/** Gộp các khối, hạ về 16 kHz nếu cần (nội suy tuyến tính) và đổi sang PCM 16-bit */
function toPcm16(chunks: Float32Array[], fromRate: number): Int16Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    input.set(c, offset);
    offset += c.length;
  }
  const ratio = fromRate / ASR_SAMPLE_RATE;
  const out = new Int16Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const v = input[j] + ((input[j + 1] ?? input[j]) - input[j]) * (pos - j);
    const clamped = Math.max(-1, Math.min(1, v));
    out[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }
  return out;
}

interface Recording {
  id: string;
  ctx: AudioContext;
  stream: MediaStream;
  chunks: Float32Array[];
  timer: ReturnType<typeof setInterval> | undefined;
  /** Các mẩu gửi lần lượt theo thứ tự */
  queue: Promise<void>;
  binding?: RecordingBinding;
  stopping?: Promise<void>;
}

type KetQuaPhien = Partial<AsrKetQua & ApiLoi>;

/**
 * Zipformer chạy trên máy: cứ 0,4 giây gửi một mẩu âm thanh lên /api/asr/[id].
 * Server trả chữ tạm (câu đang nói dở, hiện in nghiêng) và câu đã chốt khi bác sĩ ngắt nghỉ (đưa vào ô nhập).
 * Âm thanh không ra khỏi máy chạy prototype và không được lưu.
 */
function ZipformerMic({ onStart, onText, onStop, onInterim, onGiongBacSi, beforeStart, onCaptureReady, onCaptureFailed, onStopRequest, giaoDien = GIAO_DIEN_MIC }: MicButtonProps) {
  // Khử nhiễu luôn bật (không hiện lựa chọn cho bác sĩ); chỉ chạy đường không khử nhiễu khi không có STT backend
  const denoise = true;
  const [state, setState] = useState<"idle" | "starting" | "recording" | "stopping">("idle");
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const stoppingRef = useRef<Recording | null>(null);
  const onTextRef = useRef(onText);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onTextRef.current = onText;
    onInterimRef.current = onInterim;
  }, [onText, onInterim]);

  const release = (rec: Recording) => {
    clearInterval(rec.timer);
    rec.stream.getTracks().forEach((track) => track.stop());
    void rec.ctx.close();
  };

  useEffect(
    () => () => {
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        release(rec);
        void fetch(`/api/asr/${rec.id}`, { method: "DELETE" });
      }
    },
    [],
  );

  const apply = async (res: Response, rec: Recording) => {
    const data = (await res.json()) as KetQuaPhien;
    if (!res.ok) throw new Error(data.error ?? "Không nhận dạng được.");
    for (const cau of data.chot ?? []) onTextRef.current(cau, rec.binding);
    setInterim(data.tam ?? "");
    onInterimRef.current?.(data.tam ?? "");
  };

  /** Lấy các khối đã thu, đưa vào hàng đợi gửi lên server */
  const flush = (rec: Recording) => {
    if (rec.chunks.length === 0) return;
    const pcm = toPcm16(rec.chunks.splice(0), rec.ctx.sampleRate);
    rec.queue = rec.queue.then(async () => {
      const res = await fetch(`/api/asr/${rec.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: pcm.buffer as ArrayBuffer,
      });
      await apply(res, rec);
    });
    rec.queue.catch((e: unknown) => {
      if (recordingRef.current !== rec) return;
      setError(e instanceof Error ? e.message : "Không nhận dạng được.");
      void stop().catch(() => undefined);
    });
  };

  /** Gọi lại khi đang dừng thì trả đúng lần dừng đó, để bên ngoài chỉ tiếp tục sau khi chữ cuối đã được giao. */
  function stop(): Promise<void> {
    const rec = recordingRef.current ?? stoppingRef.current;
    if (!rec) return Promise.resolve();
    if (rec.stopping) return rec.stopping;
    recordingRef.current = null;
    stoppingRef.current = rec;
    setState("stopping");
    flush(rec);
    release(rec);
    rec.stopping = (async () => {
      let failure: unknown = null;
      try {
        await rec.queue.catch(() => undefined);
        await apply(await fetch(`/api/asr/${rec.id}`, { method: "DELETE" }), rec);
      } catch (e) {
        failure = e;
        setError(e instanceof Error ? e.message : "Không nhận dạng được.");
      } finally {
        stoppingRef.current = null;
        setInterim("");
        onInterimRef.current?.("");
        setState("idle");
        setSeconds(0);
        onStop?.();
      }
      // Lỗi chốt câu cuối phải để bên điều phối giữ phiên lại và thử lại, không được coi là đã lưu.
      if (failure) throw failure;
    })();
    return rec.stopping;
  }

  async function start() {
    setError(null);
    setState("starting");
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let binding: RecordingBinding | undefined;
    try {
      // Giữ chỗ phiên trước: tab khác đang dùng micro này thì báo lỗi và không mở micro.
      binding = await beforeStart?.();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const res = await fetch("/api/asr", { method: "POST", headers: { "X-Clinical-Consent": "true" } });
      const data = (await res.json()) as Partial<AsrPhienMoi & ApiLoi>;
      if (!res.ok || !data.id) throw new Error(data.error ?? "Không mở được nhận dạng giọng nói.");

      // Chrome tự chuyển micro về 16 kHz; trình duyệt nào không cho thì toPcm16 hạ mẫu
      try {
        ctx = new AudioContext({ sampleRate: ASR_SAMPLE_RATE });
      } catch {
        ctx = new AudioContext();
      }
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "ghi-am");
      const chunks: Float32Array[] = [];
      node.port.onmessage = (event: MessageEvent<Float32Array>) => chunks.push(event.data);
      ctx.createMediaStreamSource(stream).connect(node);
      // Nối ra loa để trình duyệt chạy worklet; worklet không ghi gì ra đầu ra nên không có tiếng
      node.connect(ctx.destination);

      const startedAt = Date.now();
      const rec: Recording = { id: data.id, ctx, stream, chunks, timer: undefined, queue: Promise.resolve(), binding };
      rec.timer = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        setSeconds(Math.floor(elapsed));
        if (elapsed >= ASR_MAX_SECONDS) void (onStopRequest ? Promise.resolve(onStopRequest()) : stop()).catch(() => undefined);
        else flush(rec);
      }, CHUNK_MS);
      recordingRef.current = rec;
      setState("recording");
      onStart();
      if (binding) onCaptureReady?.({ stop, cancel: () => { void stop().catch(() => undefined); } }, binding);
    } catch (e) {
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close();
      if (binding) onCaptureFailed?.(binding);
      setState("idle");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? ERROR_MESSAGES["not-allowed"]
          : e instanceof Error
            ? e.message
            : "Không mở được micro.",
      );
    }
  }

  if (denoise) return <DenoisedMic onStart={onStart} onText={onText} onStop={onStop} onInterim={onInterim} onGiongBacSi={onGiongBacSi} beforeStart={beforeStart} onCaptureReady={onCaptureReady} onCaptureFailed={onCaptureFailed} onStopRequest={onStopRequest} giaoDien={giaoDien} />;

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const pha = ({ idle: "idle", starting: "opening", recording: "recording", stopping: "processing" } as const)[state];
  // Đồng ý xử lý âm thanh y tế mặc định đã có (gửi kèm X-Clinical-Consent), không hỏi lại bằng ô đánh dấu.
  return (
    <div>
      <button
        type="button"
        onClick={state === "recording" ? () => (onStopRequest ? onStopRequest() : void stop().catch(() => undefined)) : () => void start()}
        disabled={state === "starting" || state === "stopping"}
        aria-pressed={state === "recording"}
        className={`${giaoDien.nut} ${state === "recording" ? giaoDien.dangNghe : giaoDien.cho}`}
      >
        <NoiDungMic pha={pha} clock={clock} />
      </button>
      {interim && !onInterim && <p className="mt-1 text-sm text-muted italic">{interim}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-warn-text">
          {error}
        </p>
      )}
    </div>
  );
}

