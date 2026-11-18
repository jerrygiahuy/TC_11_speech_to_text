"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ASR_MAX_SECONDS, ASR_SAMPLE_RATE, type ApiLoi, type AsrKetQua, type AsrPhienMoi, type AsrTrangThai } from "@/shared/api";

// Web Speech API chưa có trong kiểu DOM mặc định của TypeScript
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

function getRecognition(): RecognitionConstructor | null {
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

const subscribe = () => () => {};

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
  /** Nhãn khi chưa nghe */
  nhan: string;
}

interface Props {
  onStart: () => void;
  onText: (text: string) => void;
  /** Gọi khi dừng nghe (bác sĩ bấm dừng, hết giờ hoặc lỗi) */
  onStop?: () => void;
  giaoDien?: GiaoDienMic;
}

const MAC_DINH: GiaoDienMic = {
  nut: "w-full rounded border py-2 font-medium disabled:cursor-wait disabled:opacity-70",
  dangNghe: "border-warn bg-warn/10 text-warn-text",
  cho: "border-primary text-primary hover:bg-soft",
  nhan: "🎤 Nói",
};

/** Hỏi server chế độ nhận dạng: zipformer (trên máy) khi ASR_PROVIDER=zipformer và đã có model, còn lại dùng Web Speech */
export function MicButton(props: Props) {
  const [mode, setMode] = useState<"dang-kiem" | "zipformer" | "web">("dang-kiem");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/asr")
      .then((res) => res.json())
      .then((data: AsrTrangThai) => {
        if (!active) return;
        if (data.provider === "zipformer" && data.sanSang) return setMode("zipformer");
        setMode("web");
        if (data.provider === "zipformer") setNote("Chưa có model giọng nói trên máy (npm run tai-model-giong-noi), tạm dùng Web Speech.");
      })
      .catch(() => active && setMode("web"));
    return () => {
      active = false;
    };
  }, []);

  if (mode === "dang-kiem") return null;
  if (mode === "zipformer") return <ZipformerMic {...props} />;
  return (
    <>
      <WebSpeechMic {...props} />
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </>
  );
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
}

type KetQuaPhien = Partial<AsrKetQua & ApiLoi>;

/**
 * Zipformer chạy trên máy: cứ 0,4 giây gửi một mẩu âm thanh lên /api/asr/[id].
 * Server trả chữ tạm (câu đang nói dở, hiện in nghiêng) và câu đã chốt khi bác sĩ ngắt nghỉ (đưa vào ô nhập).
 * Âm thanh không ra khỏi máy chạy prototype và không được lưu.
 */
function ZipformerMic({ onStart, onText, onStop, giaoDien = MAC_DINH }: Props) {
  const [state, setState] = useState<"idle" | "starting" | "recording" | "stopping">("idle");
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

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

  const apply = async (res: Response) => {
    const data = (await res.json()) as KetQuaPhien;
    if (!res.ok) throw new Error(data.error ?? "Không nhận dạng được.");
    for (const cau of data.chot ?? []) onTextRef.current(cau);
    setInterim(data.tam ?? "");
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
      await apply(res);
    });
    rec.queue.catch((e: unknown) => {
      if (recordingRef.current !== rec) return;
      setError(e instanceof Error ? e.message : "Không nhận dạng được.");
      void stop();
    });
  };

  async function stop() {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    setState("stopping");
    flush(rec);
    release(rec);
    try {
      await rec.queue.catch(() => undefined);
      await apply(await fetch(`/api/asr/${rec.id}`, { method: "DELETE" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không nhận dạng được.");
    } finally {
      setInterim("");
      setState("idle");
      setSeconds(0);
      onStop?.();
    }
  }

  async function start() {
    setError(null);
    setState("starting");
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const res = await fetch("/api/asr", { method: "POST" });
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
      const rec: Recording = { id: data.id, ctx, stream, chunks, timer: undefined, queue: Promise.resolve() };
      rec.timer = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        setSeconds(Math.floor(elapsed));
        if (elapsed >= ASR_MAX_SECONDS) void stop();
        else flush(rec);
      }, CHUNK_MS);
      recordingRef.current = rec;
      setState("recording");
      onStart();
    } catch (e) {
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close();
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

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const label = {
    idle: giaoDien.nhan,
    starting: "Đang mở micro…",
    recording: `⏹ Dừng nghe · ${clock}`,
    stopping: "Đang chốt câu cuối…",
  }[state];
  return (
    <div>
      <button
        type="button"
        onClick={state === "recording" ? () => void stop() : () => void start()}
        disabled={state === "starting" || state === "stopping"}
        aria-pressed={state === "recording"}
        className={`${giaoDien.nut} ${state === "recording" ? giaoDien.dangNghe : giaoDien.cho}`}
      >
        {label}
      </button>
      {interim && <p className="mt-1 text-sm text-muted italic">{interim}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-warn-text">
          {error}
        </p>
      )}
    </div>
  );
}

function WebSpeechMic({ onStart, onText, onStop, giaoDien = MAC_DINH }: Props) {
  const supported = useSyncExternalStore(subscribe, () => getRecognition() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const wantListeningRef = useRef(false);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  if (!supported) return null;

  function start() {
    const Constructor = getRecognition();
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onText(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error];
      if (message) {
        wantListeningRef.current = false;
        setError(message);
      }
    };
    recognition.onend = () => {
      // Chrome tự ngắt khi im lặng; bác sĩ chưa bấm dừng thì nghe tiếp
      if (wantListeningRef.current) {
        recognition.start();
      } else {
        setListening(false);
        setInterim("");
        onStop?.();
      }
    };
    recognitionRef.current = recognition;
    wantListeningRef.current = true;
    setError(null);
    setListening(true);
    onStart();
    recognition.start();
  }

  function stop() {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
  }

  return (
    <div>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        className={`${giaoDien.nut} ${listening ? giaoDien.dangNghe : giaoDien.cho}`}
      >
        {listening ? "⏹ Dừng nghe" : giaoDien.nhan}
      </button>
      {interim && <p className="mt-1 text-sm text-muted italic">{interim}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-warn-text">
          {error}
        </p>
      )}
    </div>
  );
}
