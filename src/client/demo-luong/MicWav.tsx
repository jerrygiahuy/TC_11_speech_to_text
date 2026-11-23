"use client";

import { useEffect, useRef, useState } from "react";
import { encodePcm16WavFromChunks } from "@/lib/stt/audio";
import { openBrowserMicPipeline, type MicPipeline } from "@/lib/stt/microphone";
import { BTN_OUTLINE } from "@/client/eform/fields";

/** Giới hạn một lượt thu để WAV gửi lên dưới 20 MB của API (16 kHz × 2 byte ≈ 1,9 MB/phút). */
const TOI_DA_GIAY = 300;

/**
 * Thu micro thành một file WAV 16 kHz mono (cùng đường ống micro với `DenoisedMic`: `lib/stt/microphone.ts`).
 * `MicButton`/`DenoisedMic` chỉ trả chữ theo từng câu, còn luồng demo cần cả file WAV để máy chủ chạy bước ① STT.
 * Âm thanh chỉ nằm trong bộ nhớ trình duyệt đến khi gửi; máy chủ không lưu (R9).
 */
export function MicWav({ onWav, onBan, disabled }: {
  onWav: (wav: Blob | null, giay: number) => void;
  /** true khi đang mở hoặc đang thu micro (bên ngoài khóa chọn nguồn). */
  onBan?: (ban: boolean) => void;
  disabled?: boolean;
}) {
  const [trangThai, setTrangThai] = useState<"cho" | "mo" | "thu">("cho");
  const [giay, setGiay] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const pipe = useRef<MicPipeline | null>(null);
  const chunks = useRef<Int16Array[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  /** Đã gỡ component: micro mở xong muộn thì đóng ngay, không setState. */
  const daGo = useRef(false);
  const onBanRef = useRef(onBan);
  useEffect(() => { onBanRef.current = onBan; }, [onBan]);
  useEffect(() => {
    daGo.current = false;
    return () => {
      daGo.current = true;
      clearInterval(timer.current);
      pipe.current?.close();
      pipe.current = null;
      onBanRef.current?.(false);
    };
  }, []);

  async function batDau() {
    setLoi(null); setTrangThai("mo"); onWav(null, 0); onBan?.(true);
    try {
      const p = await openBrowserMicPipeline();
      if (daGo.current) { p.close(); return; }
      chunks.current = [];
      p.onChunk = c => chunks.current.push(c);
      p.onError = () => { setLoi("Micro bị ngắt. Thu lại."); void dung(); };
      pipe.current = p;
      const t0 = Date.now();
      setGiay(0);
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setGiay(s);
        if (s >= TOI_DA_GIAY) void dung();
      }, 250);
      setTrangThai("thu");
    } catch (e) {
      if (daGo.current) return;
      onBan?.(false);
      setTrangThai("cho");
      setLoi(e instanceof DOMException && e.name === "NotAllowedError" ? "Trình duyệt chưa được cấp quyền dùng micro." : "Không mở được micro.");
    }
  }

  async function dung() {
    const p = pipe.current;
    if (!p) return;
    pipe.current = null;
    clearInterval(timer.current);
    await p.flush();
    p.close();
    if (daGo.current) return;
    onBan?.(false);
    setTrangThai("cho");
    const total = chunks.current.reduce((n, c) => n + c.length, 0);
    if (total === 0) { setLoi("Chưa thu được âm thanh."); return; }
    onWav(encodePcm16WavFromChunks(chunks.current), Math.round(total / 16000));
    chunks.current = [];
  }

  const clock = `${Math.floor(giay / 60)}:${String(giay % 60).padStart(2, "0")}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" disabled={disabled || trangThai === "mo"} aria-pressed={trangThai === "thu"}
        onClick={() => void (trangThai === "thu" ? dung() : batDau())}
        className={`${BTN_OUTLINE} ${trangThai === "thu" ? "border-ef-do text-ef-do" : ""}`}>
        {trangThai === "thu" ? `⏹ Dừng thu · ${clock}` : trangThai === "mo" ? "Đang mở micro…" : "● Thu âm"}
      </button>
      {loi && <span role="alert" className="text-[13px] text-ef-do">{loi}</span>}
    </span>
  );
}
