"use client";

import { useEffect, useRef, useState } from "react";
import { canonicalizeAudioBlob } from "@/lib/stt/audio";
import { openContinuousSession, type SttResult, type ContinuousCapture } from "@/lib/stt/continuous";
import { SpeakerSessionClient } from "@/lib/stt/speaker-client";
import { reviseWords, speakerTurns } from "@/lib/stt/speakers";

type Phase = "idle" | "opening" | "recording" | "processing";
type Result = SttResult;
type Health = { ready: boolean; loaded?: boolean; model_id?: string; revision?: string; detail?: string; community_ready?: boolean; vad_ready?: boolean; diarization_ready?: boolean; denoise_ready?: boolean };

const MESSAGES: Record<string, string> = {
  DENOISE_NOT_READY: "DeepFilterNet3 chưa sẵn sàng. Cài runtime và tải model local rồi kiểm tra lại.",
  DENOISE_RUNTIME_MISSING: "Chưa cài runtime DeepFilterNet3. Chạy npm run stt:denoise:setup rồi kiểm tra lại.",
  DENOISE_MODEL_MISSING: "Chưa có model DeepFilterNet3. Chạy npm run stt:denoise:setup rồi kiểm tra lại.",
  DENOISE_INVALID_AUDIO: "Audio đầu vào khử nhiễu không hợp lệ. Thử thu lại hoặc chọn file WAV khác.",
  DENOISE_INVALID_OUTPUT: "WAV sau khử nhiễu không hợp lệ. Xem logs/stt-backend.err.log hoặc tắt khử nhiễu để thử lại.",
  DENOISE_OUTPUT_INVALID: "WAV sau khử nhiễu không hợp lệ. Xem logs/stt-backend.err.log hoặc tắt khử nhiễu để thử lại.",
  DENOISE_MODE_INVALID: "Chế độ khử nhiễu không hợp lệ. Chọn lại Tắt hoặc DeepFilterNet3.",
  DENOISE_MODE_CONFLICT: "Chế độ khử nhiễu của phiên đã thay đổi. Kết thúc và mở phiên mới.",
  DENOISE_FAILED: "Khử nhiễu local thất bại. Kiểm tra logs/stt-backend.err.log hoặc tắt khử nhiễu để thử lại.",
  DENOISE_TIMEOUT: "Khử nhiễu quá thời gian chờ. Thử file ngắn hơn hoặc tắt khử nhiễu.",
  COMMUNITY_NOT_READY: "Community-1 chưa sẵn sàng. Cần cài runtime và tải model local.",
  COMMUNITY_MODEL_MISSING: "Chưa tải model Community-1 vào máy.",
  COMMUNITY_RUNTIME_MISSING: "Chưa cài môi trường Community-1 riêng.",
  COMMUNITY_MEMORY_LOW: "RAM trống chưa đủ để bắt đầu Community-1. Đóng bớt ứng dụng hoặc chọn chế độ ONNX hiện tại.",
  COMMUNITY_FAILED: "Community-1 không xử lý được. Bản thu không được gửi ra ngoài máy.",
  COMMUNITY_TIMEOUT: "Community-1 chưa hoàn tất trong thời gian xử lý cấu hình.",
  STT_VAD_MODEL_MISSING: "Chưa có model Silero VAD. Chạy npm run stt:setup rồi kiểm tra lại.",
  STT_VAD_MODEL_INVALID: "Model Silero VAD không hợp lệ. Chạy lại npm run stt:setup.",
  DIARIZATION_MODEL_MISSING: "Chưa có model phân biệt người nói. Chạy npm run stt:setup rồi kiểm tra lại.",
  STT_SESSION_EXPIRED: "Phiên nhận dạng đã hết hạn. Bắt đầu phiên mới để tiếp tục.",
  STT_CHUNK_CONFLICT: "Không xác nhận được thứ tự âm thanh của phiên. Hãy bắt đầu phiên mới.",
  STT_CHUNK_OUT_OF_ORDER: "Thứ tự đoạn thu bị gián đoạn. Hãy bắt đầu phiên mới.",
  STT_BACKEND_UNAVAILABLE: "Chưa kết nối được STT. Chạy npm run stt:start trong terminal của dự án rồi kiểm tra lại.",
  STT_MODEL_MISSING: "Chưa có model STT đầy đủ. Chạy npm run stt:setup rồi kiểm tra lại.",
  STT_INFERENCE_FAILED: "Model chưa nhận dạng được. Xem chi tiết trong logs/stt-backend.err.log.",
  STT_BACKLOG: "Xử lý chậm hơn tốc độ thu. Phiên đã dừng micro để xử lý nốt các đoạn đang chờ; văn bản đã nhận được vẫn được giữ.",
  STT_HOTWORDS_INVALID: "File config/stt-hotwords.json chưa hợp lệ. Hãy kiểm tra danh sách phrases.",
  STT_BUSY: "Model đang xử lý một bản thu khác. Hãy thử lại sau vài giây.",
  STT_TIMEOUT: "Nhận dạng quá thời gian chờ. Hãy thử đoạn âm thanh ngắn hơn.",
  AUDIO_SILENT: "Bản thu im lặng. Hãy kiểm tra micro và nói lại.",
  VOICE_AUDIO_TYPE_UNSUPPORTED: "Định dạng chưa được hỗ trợ. Hãy thử WAV, MP3, M4A, WebM hoặc Ogg.",
  VOICE_AUDIO_DECODE_FAILED: "Trình duyệt không đọc được file âm thanh này. Hãy thử WAV hoặc MP3.",
  NotAllowedError: "Chưa được cấp quyền micro. Cho phép micro trong trình duyệt rồi thử lại.",
  NotFoundError: "Không tìm thấy micro. Hãy kết nối micro rồi thử lại.",
  NotReadableError: "Không mở được micro. Kiểm tra thiết bị hoặc ứng dụng đang dùng micro.",
  MIC_UNSUPPORTED: "Trình duyệt chưa hỗ trợ ghi âm. Hãy mở bằng Chrome/Edge tại localhost hoặc tải file lên.",
};

function errorMessage(error: unknown) {
  const code = error instanceof DOMException ? error.name : error instanceof Error ? error.message : "";
  if (code === "TimeoutError" || code === "AbortError") return MESSAGES.STT_TIMEOUT;
  return MESSAGES[code] || `Không xử lý được âm thanh${code ? ` (${code})` : ""}. Hãy thử lại.`;
}

export function SttExperiment() {
  const [denoise, setDenoise] = useState<"off" | "deepfilternet3">("off");
  const [fileDiarizer, setFileDiarizer] = useState("onnx");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(0);
  const capture = useRef<ContinuousCapture | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);

  function acceptPart(part: Result) {
    setCopied(false);
    setResult((previous) => {
      if (part.words && part.replace_from_ms !== undefined) {
        const words = reviseWords(previous?.words || [], { replace_from_ms: part.replace_from_ms, words: part.words });
        return { ...part, words, no_speech: words.length === 0,
          transcript: speakerTurns(words).map((turn) => `${turn.overlap ? "Nói chồng" : turn.speaker ? `Người nói ${turn.speaker}` : "Chưa rõ người nói"}: ${turn.text}`).join("\n"),
          inference_ms: (previous?.inference_ms || 0) + (part.final && previous ? 0 : part.inference_ms),
        };
      }
      return part;
    });
  }

  async function checkHealth(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/stt", { cache: "no-store", signal });
      const data = await response.json();
      if (!signal?.aborted) setHealth(data);
    } catch {
      if (!signal?.aborted) setHealth({ ready: false, detail: "STT_BACKEND_UNAVAILABLE" });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    // Subscribe to an external fetch; state updates occur when it settles.
    fetch("/api/stt", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (!controller.signal.aborted) setHealth(data); })
      .catch(() => { if (!controller.signal.aborted) setHealth({ ready: false, detail: "STT_BACKEND_UNAVAILABLE" }); });
    return () => {
      controller.abort();
      generation.current += 1;
      capture.current?.cancel();
      request.current?.abort();
    };
  }, []);

  async function recognize(blob: Blob, current: number) {
    if (current !== generation.current) return;
    setPhase("processing");
    const controller = new AbortController();
    request.current = controller;
    try {
      const wav = await canonicalizeAudioBlob(blob);
      if (current !== generation.current) return;
      const response = await fetch("/api/stt", {
        method: "POST", headers: { "Content-Type": "audio/wav", "X-STT-Diarize": "1", "X-STT-Diarizer": fileDiarizer, "X-STT-Denoise": denoise }, body: wav, signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "STT_INFERENCE_FAILED");
      if (current === generation.current) {
        acceptPart(data);
        void checkHealth();
      }
    } catch (cause) {
      if (current === generation.current) setError(controller.signal.aborted ? MESSAGES.STT_TIMEOUT : errorMessage(cause));
    } finally {
      if (current === generation.current) {
        request.current = null;
        busy.current = false;
        setPhase("idle"); setConsent(false);
      }
    }
  }

  async function stopSession() {
    const active = capture.current;
    if (!active) return;
    setPhase("processing");
    try { await active.stop(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally {
      if (capture.current === active) {
        capture.current = null; busy.current = false; setPhase("idle"); setConsent(false);
      }
    }
  }

  async function start() {
    if (busy.current || !consent) return;
    busy.current = true;
    const current = ++generation.current;
    setError(""); setResult(null); setCopied(false); setSeconds(0); setPending(0); setSource("Phiên micro"); setPhase("opening");
    const controller = new AbortController();
    request.current = controller;
    let speakerSession: SpeakerSessionClient | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") throw new Error("MIC_UNSUPPORTED");
      speakerSession = await SpeakerSessionClient.create(controller.signal, fetch, denoise);
      const session = speakerSession;
      if (current !== generation.current) { await session.close(); return; }
      const active = await openContinuousSession({
        transcribe: (wav) => session.transcribe(wav),
        onResult: (part) => {
          if (current !== generation.current) return;
          acceptPart(part);
        },
        onError: (cause, sequence) => {
          if (current !== generation.current) return;
          setError(errorMessage(cause) + (sequence ? ` Phiên đã dừng ở đoạn ${sequence}; các đoạn chưa nhận dạng không được đưa vào bản chép.` : ""));
          if (sequence) {
            generation.current += 1;
            capture.current?.cancel(); controller.abort();
            capture.current = null; request.current = null; busy.current = false; setPhase("idle"); setConsent(false); setPending(0);
          }
        },
        onElapsed: (elapsed) => { if (current === generation.current) setSeconds(elapsed); },
        onPending: (count) => { if (current === generation.current) setPending(count); },
        onStopping: () => { if (current === generation.current) setPhase("processing"); },
        onStopped: () => {
          if (current === generation.current) {
            capture.current = null; request.current = null; busy.current = false; setPhase("idle"); setConsent(false);
          }
        },
        onFinish: async () => {
          const final = await session.finish();
          if (current === generation.current) acceptPart(final);
        },
        onCancel: () => { void session.close(); },
      });
      if (current !== generation.current) { active.cancel(); return; }
      capture.current = active;
      setPhase("recording");
    } catch (cause) {
      controller.abort();
      await speakerSession?.close();
      if (current === generation.current) { setError(errorMessage(cause)); busy.current = false; setPhase("idle"); setConsent(false); }
    }
  }

  function upload(file?: File) {
    if (!file || busy.current || !consent) return;
    busy.current = true;
    setError(""); setResult(null); setCopied(false); setSource(file.name);
    const mime = file.type || ({ wav: "audio/wav", mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", webm: "audio/webm", flac: "audio/flac" }[file.name.split(".").pop()?.toLowerCase() || ""]);
    void recognize(file.type ? file : new Blob([file], { type: mime || "application/octet-stream" }), ++generation.current);
  }

  const idle = phase === "idle";
  const denoiseReady = denoise === "off" || health?.denoise_ready === true;
  const ready = denoiseReady && health?.ready === true && health?.diarization_ready === true && health?.vad_ready === true;
  const fileReady = denoiseReady && health?.ready === true && health?.vad_ready === true
    && (fileDiarizer === "community1" ? health?.community_ready === true : health?.diarization_ready === true);
  const turns = result?.words ? speakerTurns(result.words) : [];
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8">
      <div>
        <p className="mb-2 text-sm font-semibold text-primary">PHÒNG THỬ ÂM THANH</p>
        <h2 className="text-3xl font-semibold">Speech-to-text tiếng Việt</h2>
        <p className="mt-3 text-muted">Thu liên tục một phiên hội thoại hoặc chọn file để thử Zipformer INT8 từ P-018. Model chạy trên CPU của máy này.</p>
      </div>
      <section aria-label="Trạng thái model" className="rounded-lg border border-primary/20 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="font-medium">{health === null ? "Đang kiểm tra dịch vụ…" : ready ? "● Model sẵn sàng" : "○ Dịch vụ chưa sẵn sàng"}</p>
          <button type="button" onClick={() => void checkHealth()} className="rounded border px-3 py-1.5 text-sm hover:bg-soft">Kiểm tra lại</button>
        </div>
        <p className="mt-2 break-all text-sm text-muted">Zipformer · sherpa-onnx · tiếng Việt · CPU · phiên micro không giới hạn thời gian</p>
        {health?.revision && <p className="mt-1 break-all text-xs text-muted">Revision: {health.revision} · {health.loaded ? "Đã nạp vào RAM" : "Nạp model trong lượt đầu"}</p>}
        {health && !ready && denoiseReady && <p className="mt-3 text-sm text-warn-text">{MESSAGES[health.detail || (health.ready ? (health.vad_ready !== true ? "STT_VAD_MODEL_MISSING" : "DIARIZATION_MODEL_MISSING") : "STT_MODEL_MISSING")] || MESSAGES.STT_BACKEND_UNAVAILABLE}</p>}
      </section>
      <section aria-label="Âm thanh đầu vào" className="space-y-4 rounded-lg border border-primary/20 bg-white p-5">
        <h3 className="text-lg font-semibold">1. Chọn âm thanh</h3>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={!idle} onChange={(event) => setConsent(event.target.checked)} />Tôi đồng ý xử lý audio và transcript trên máy trong phiên này. Dữ liệu bệnh án không gửi tới AI bên ngoài.</label>
        <label className="block text-sm">Khử nhiễu cho file và micro
          <select value={denoise} disabled={!idle} onChange={(event) => setDenoise(event.target.value as "off" | "deepfilternet3")} className="ml-2 rounded border p-1">
            <option value="off">Tắt (mặc định)</option>
            <option value="deepfilternet3">DeepFilterNet3 local</option>
          </select>
        </label>
        {denoise !== "off" && <p role="status" className="text-xs text-muted">Khử nhiễu trên máy trước nhận dạng; dùng WAV tạm cục bộ và xóa sau xử lý. {!health?.denoise_ready && MESSAGES.DENOISE_NOT_READY}</p>}
        <label className="block text-sm">Phân tách người nói cho file tải lên
          <select value={fileDiarizer} disabled={!idle} onChange={(event) => setFileDiarizer(event.target.value)} className="ml-2 rounded border p-1">
            <option value="onnx">ONNX hiện tại</option>
            <option value="community1">Community-1 local (hậu xử lý)</option>
          </select>
        </label>
        {fileDiarizer === "community1" && <p className="text-xs text-muted">Chỉ áp dụng file tải lên; chạy CPU sau Zipformer. Community-1 phân tách người nói, không khử nhiễu. Có ghi file tạm cục bộ và xóa sau xử lý. {!health?.community_ready && "Chưa sẵn sàng: cần cài runtime và tải weights."}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={phase === "opening" || phase === "processing" || (idle && (!ready || !consent))}
            onClick={() => phase === "recording" ? void stopSession() : void start()}
            aria-pressed={phase === "recording"}
            className="min-w-48 rounded bg-primary px-5 py-3 font-medium text-white disabled:opacity-50">
            {phase === "recording" ? "Kết thúc phiên" : phase === "opening" ? "Đang mở micro…" : phase === "processing" ? "Đang nhận dạng…" : "Bắt đầu phiên micro"}
          </button>
          <label className="block text-sm">Hoặc tải file âm thanh
            <input type="file" accept=".wav,.mp3,.m4a,.webm,.ogg,.flac,audio/*" disabled={!idle || !fileReady || !consent}
              className="mt-1 block max-w-full text-sm file:mr-3 file:rounded file:border file:bg-soft file:px-3 file:py-2 disabled:opacity-50"
              onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
        </div>
        <p aria-live="polite" className="text-sm text-muted">{phase === "recording" ? `Đang thu ${Math.floor(seconds / 60)} phút ${seconds % 60} giây · ${pending} đoạn đang xử lý/chờ. Văn bản cập nhật trong lúc thu.` : "Micro mở liên tục đến khi kết thúc. Tách đoạn ở khoảng nghỉ hoặc tối đa 5 giây để trả text dần. File tải lên không giới hạn dung lượng hoặc thời lượng."}</p>
        <p className="text-xs text-muted">Micro cần quyền trình duyệt; mở bằng localhost hoặc HTTPS. Khi tắt khử nhiễu, ONNX xử lý audio trong bộ nhớ. DeepFilterNet3 và Community-1 dùng WAV tạm cục bộ và xóa sau xử lý; không lưu lịch sử bản thu.</p>
      </section>
      {phase === "processing" && <p role="status" className="text-sm text-primary">Đã dừng thu. Đang xử lý nốt {pending} đoạn còn lại…</p>}
      {error && <p role="alert" className="rounded border border-warn bg-white p-4 text-warn-text">{error}</p>}
      <p className="text-sm text-muted">Phân biệt tối đa 2 giọng trong phiên; nhãn không tự xác định vai bác sĩ/bệnh nhân. Text và nhãn giọng gần cuối có thể được sửa khi có thêm ngữ cảnh. Thuật ngữ: config/stt-hotwords.json.</p>
      <section aria-label="Kết quả nhận dạng" className="space-y-4 rounded-lg border border-primary/20 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">2. Văn bản nhận dạng</h3>
          <button type="button" disabled={!result?.transcript} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
            onClick={async () => {
              if (!result) return;
              const json = JSON.stringify({
                language: "vi",
                source,
                audio_ms: result.audio_ms,
                final: result.final === true,
                transcript: result.transcript,
                turns,
                words: result.words || [],
              }, null, 2);
              try {
                await navigator.clipboard.writeText(json);
                setCopied(true);
              } catch {
                setError("Không sao chép JSON tự động được. Hãy kiểm tra quyền clipboard của trình duyệt rồi thử lại.");
              }
            }}>
            {copied ? "Đã sao chép JSON" : "Sao chép JSON"}
          </button>
        </div>
        <div aria-live="polite" className="min-h-40 space-y-3 whitespace-pre-wrap rounded bg-soft p-4 leading-8">
          {turns.length ? turns.map((turn, index) => (
            <div key={`${turn.start_ms}-${index}`} className="rounded border border-primary/15 bg-white p-3">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
                <strong className="text-primary">{turn.overlap ? "Nói chồng — cần kiểm tra" : turn.speaker ? `Người nói ${turn.speaker}` : "Chưa rõ người nói"}</strong>
                <span>{(turn.start_ms / 1000).toFixed(1)}–{(turn.end_ms / 1000).toFixed(1)}s{!result?.final && turn.end_ms > (result?.stable_until_ms || 0) ? " · đang cập nhật" : ""}</span>
              </div>
              <p>{turn.text}</p>
            </div>
          )) : result?.no_speech ? "Không phát hiện lời nói. Hãy thử nói rõ hơn hoặc kiểm tra micro." : result?.transcript || (phase === "recording" || phase === "processing" ? "Đang nghe / xử lý, văn bản sẽ xuất hiện dần…" : "Kết quả sẽ xuất hiện ở đây trong lúc bạn nói.")}
        </div>
        {result && <p className="text-sm text-muted">Nguồn: {source} · Âm thanh: {(result.audio_ms / 1000).toFixed(2)} giây · Tổng suy luận: {result.inference_ms} ms</p>}
      </section>
    </main>
  );
}
