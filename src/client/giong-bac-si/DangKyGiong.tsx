"use client";

import { useEffect, useRef, useState } from "react";
import { encodePcm16WavFromChunks } from "@/lib/stt/audio";
import { openBrowserMicPipeline, type MicPipeline } from "@/lib/stt/microphone";
import { dangKyGiongBacSi, xemGiongBacSi, xoaGiongBacSi } from "@/client/api";
import { MicIcon } from "@/client/chung/mic-ui";
import type { GiongBacSiTrangThai } from "@/shared/api";

/** Đọc khoảng 30 giây là đủ; dưới 10 giây thường không đủ 8 giây lời nói sau khi bỏ khoảng lặng. */
const MUC_TIEU_GIAY = 30;
const TOI_THIEU_GIAY = 10;
const TOI_DA_GIAY = 60;

// Đoạn đọc mẫu: lời khám bệnh giả, giọng đọc gần với khi khám thật.
const DOAN_MAU = [
  "Bệnh nhân nam, sáu mươi hai tuổi, đến khám vì đau ngực trái khi leo cầu thang khoảng hai tuần nay, nghỉ thì đỡ.",
  "Tiếng T1, T2 đều rõ, không âm thổi.",
  "Huyết áp một trăm bốn mươi tám trên tám mươi tám mi li mét thủy ngân, SpO2 chín mươi tám phần trăm.",
  "Kê đơn paracetamol năm trăm miligam, uống một viên một lần, ngày ba lần sau ăn, trong năm ngày.",
  "Bệnh nhân đang dùng Bisoprolol hai phẩy năm mi li gam mỗi ngày một lần.",
];

type Pha = "dang-tai" | "cho" | "mo" | "thu" | "gui";

function ngayGio(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function DangKyGiong() {
  const [trangThai, setTrangThai] = useState<GiongBacSiTrangThai | null>(null);
  const [pha, setPha] = useState<Pha>("dang-tai");
  const [giay, setGiay] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const pipe = useRef<MicPipeline | null>(null);
  const chunks = useRef<Int16Array[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    let conDung = true;
    xemGiongBacSi()
      .then((s) => { if (conDung) { setTrangThai(s); setPha("cho"); } })
      .catch((e: unknown) => { if (conDung) { setLoi(e instanceof Error ? e.message : "Không kiểm tra được."); setPha("cho"); } });
    return () => {
      conDung = false;
      clearInterval(timer.current);
      pipe.current?.close();
    };
  }, []);

  async function batDau() {
    setLoi(null); setThongBao(null); setPha("mo"); setGiay(0);
    try {
      const p = await openBrowserMicPipeline();
      chunks.current = [];
      p.onChunk = (c) => chunks.current.push(c);
      p.onError = () => { setLoi("Micro bị ngắt. Thu lại."); void dung(); };
      pipe.current = p;
      const t0 = Date.now();
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setGiay(s);
        if (s >= TOI_DA_GIAY) void dung();
      }, 250);
      setPha("thu");
    } catch (e) {
      setPha("cho");
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
    const tong = chunks.current.reduce((n, c) => n + c.length, 0);
    const wav = encodePcm16WavFromChunks(chunks.current);
    chunks.current = [];
    if (tong < TOI_THIEU_GIAY * 16000) {
      setPha("cho");
      setLoi(`Bản thu mới ${Math.round(tong / 16000)} giây. Hãy đọc hết đoạn mẫu (khoảng ${MUC_TIEU_GIAY} giây) rồi mới dừng.`);
      return;
    }
    setPha("gui");
    try {
      const s = await dangKyGiongBacSi(wav);
      setTrangThai(s);
      setThongBao(`Đã lưu giọng của bạn (${s.speech_seconds ?? "?"} giây lời nói). Từ lần ghi âm tới trên eForm, máy sẽ tự nhận ra giọng bác sĩ.`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đăng ký được giọng.");
    } finally {
      setPha("cho");
    }
  }

  async function xoa() {
    setLoi(null); setThongBao(null);
    try {
      setTrangThai(await xoaGiongBacSi());
      setThongBao("Đã xóa giọng đã đăng ký. eForm quay về chỉ đoán vai theo nội dung lời nói.");
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không xóa được.");
    }
  }

  const daDangKy = trangThai?.enrolled === true;
  const tiLe = Math.min(1, giay / MUC_TIEU_GIAY);
  const clock = `${Math.floor(giay / 60)}:${String(giay % 60).padStart(2, "0")}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Đăng ký giọng bác sĩ</h2>
        <p className="mt-1 text-sm text-muted">
          Đăng ký một lần. Khi ghi âm buổi khám trên eForm, máy so giọng trong bản ghi với giọng bạn đã đăng ký để gắn nhãn
          <strong className="font-semibold text-ink"> BS</strong>, giọng còn lại là <strong className="font-semibold text-ink">BN</strong>.
          Chưa đăng ký thì máy chỉ đoán theo nội dung lời nói.
        </p>
      </div>

      <section aria-label="Trạng thái" className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${daDangKy ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}>
        <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-full ${daDangKy ? "bg-emerald-600 text-white" : "bg-gray-100 text-muted"}`}>
          {daDangKy ? "✓" : <MicIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{pha === "dang-tai" ? "Đang kiểm tra…" : daDangKy ? "Đã đăng ký giọng" : "Chưa đăng ký giọng"}</p>
          {daDangKy && <p className="text-sm text-muted">Lúc {ngayGio(trangThai?.created_at)} · {trangThai?.speech_seconds} giây lời nói</p>}
        </div>
        {daDangKy && (
          <button type="button" onClick={() => void xoa()} disabled={pha !== "cho"}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-ink hover:bg-gray-50 disabled:opacity-50">
            Xóa giọng đã đăng ký
          </button>
        )}
      </section>

      <section aria-label="Thu giọng" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
          <li>Ngồi chỗ yên tĩnh, chỉ mình bạn nói.</li>
          <li>Bấm <strong>Bắt đầu thu</strong>, đọc đoạn dưới đây bằng giọng khám bệnh bình thường (khoảng {MUC_TIEU_GIAY} giây).</li>
          <li>Đọc xong bấm <strong>Dừng và lưu</strong>.</li>
        </ol>

        <blockquote className={`space-y-2 rounded-md border-l-4 px-4 py-3 text-[15px] leading-7 text-ink ${pha === "thu" ? "border-primary bg-primary/5" : "border-gray-300 bg-gray-50"}`}>
          {DOAN_MAU.map((cau) => <p key={cau}>{cau}</p>)}
        </blockquote>

        <button type="button" disabled={pha === "dang-tai" || pha === "mo" || pha === "gui"} aria-pressed={pha === "thu"}
          onClick={() => void (pha === "thu" ? dung() : batDau())}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-white shadow-sm transition disabled:cursor-wait disabled:opacity-80 ${pha === "thu" ? "bg-ef-do hover:brightness-110" : "bg-primary hover:brightness-110"}`}>
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/40">
            {pha === "thu" && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
            <MicIcon />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tabular-nums">
              {pha === "thu" ? `Đang thu · ${clock}` : pha === "mo" ? "Đang mở micro…" : pha === "gui" ? "Đang tạo đặc trưng giọng…" : daDangKy ? "Đăng ký lại" : "Bắt đầu thu"}
            </span>
            <span className="block text-xs text-white/80">
              {pha === "thu" ? (giay < MUC_TIEU_GIAY ? "Đọc hết đoạn mẫu rồi bấm để dừng và lưu" : "Đủ rồi, bấm để dừng và lưu") : "Khoảng 30 giây"}
            </span>
          </span>
        </button>
        {pha === "thu" && (
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full transition-[width] duration-300 ${tiLe >= 1 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${tiLe * 100}%` }} />
          </div>
        )}
        {loi && <p role="alert" className="rounded-md bg-ef-do-nhat px-3 py-2 text-sm text-ef-do">{loi}</p>}
        {thongBao && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{thongBao}</p>}
      </section>

      <p className="text-xs text-muted">
        Chỉ lưu đặc trưng giọng (một dãy số) trên máy chạy prototype, trong thư mục <code>data/giong-bac-si/</code>, không lưu âm thanh và không gửi ra ngoài.
        Đặc trưng giọng là dữ liệu sinh trắc học: chỉ đăng ký giọng của chính bạn, và xóa khi không dùng nữa.
      </p>
    </main>
  );
}
