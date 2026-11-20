"use client";

import { isDemoError, type DemoStep } from "@/shared/demo-luong/types";
import { BUOC, FOCUS, TEN_LY_DO_CHAN, type BuocView, type CheDo, type SuKienLuot } from "./hien-thi";

const KHUNG: Record<BuocView["trang_thai"], string> = {
  cho: "border-ef-vien bg-white text-ef-phu",
  dang: "border-ef-xanh bg-ef-xanh-nhat text-ef-dam motion-safe:animate-pulse",
  xong: "border-accent/60 bg-accent/10 text-ef-dam",
  bi_chan: "border-ef-do bg-ef-do-nhat text-ef-do",
  loi: "border-ef-do bg-ef-do-nhat text-ef-do",
  bo_qua: "border-ef-vien bg-ef-nen text-ef-phu",
};

function trangThai(v: BuocView): string {
  const ms = v.ms === null ? "" : ` · ${v.ms} ms`;
  return { cho: "Chờ", dang: "Đang chạy…", xong: `✓ Xong${ms}`, bi_chan: `✕ Bị chặn${ms}`, loi: "✕ Lỗi", bo_qua: "Không gửi AI" }[v.trang_thai];
}

/** Một dòng ghi chú dưới trạng thái của từng ô. */
function ghiChu(id: DemoStep, v: BuocView, ev: SuKienLuot, cheDo: CheDo): string | null {
  const e = ev[id];
  if (e && isDemoError(e)) return e.du_lieu.loi;
  if (id === "stt" && ev.stt?.trang_thai === "xong") return ev.stt.du_lieu.engine === "kich-ban" ? "Kịch bản mẫu, bỏ qua STT" : `STT trên máy (${ev.stt.du_lieu.engine})`;
  if (id === "ban_tho" && ev.ban_tho?.trang_thai === "xong") return `${ev.ban_tho.du_lieu.spans.length} đoạn nhạy cảm`;
  if (id === "che" && ev.che && ev.che.trang_thai !== "loi") {
    if (ev.che.trang_thai === "bi_chan") return ev.che.du_lieu.gate.reasons.map(r => TEN_LY_DO_CHAN[r.reason]?.split(" · ")[0] ?? r.reason).join(", ");
    const tuChe = ev.che.du_lieu.auto_masked?.length ?? 0;
    return tuChe ? `Tự che thêm ${tuChe} mục còn sót, rồi qua chốt chặn R11` : "Qua chốt chặn R11";
  }
  if (id === "ai") {
    if (v.trang_thai === "bo_qua") return "Chưa có gì được gửi";
    const route = ev.che?.trang_thai === "xong" ? ev.che.du_lieu.ai_route : null;
    // local_only: nhãn local là đủ (mock hay không thì kết quả chưa rời máy chủ), không ghép thêm dòng Mock.
    if (route === "local_only") return "Không được gửi AI ngoài — chạy bộ tách local";
    if (cheDo === "ky_thuat" && ev.ai?.trang_thai === "xong" && ev.ai.du_lieu.provider === "mock") return "Mock — chưa rời máy chủ";
    if (ev.ai?.trang_thai === "xong") return "Chỉ nhận bản đã che";
  }
  if (id === "luu" && ev.luu?.trang_thai === "xong") return `Đọc lại từ kho · rev ${ev.luu.du_lieu.phieu.revision}`;
  return null;
}

export function StepRail({ steps, events, cheDo, open, onToggle }: {
  steps: Record<DemoStep, BuocView>; events: SuKienLuot; cheDo: CheDo; open: DemoStep | null; onToggle: (id: DemoStep) => void;
}) {
  return (
    <ol className="grid grid-cols-1 gap-2 md:grid-cols-5 md:gap-3" aria-label="Năm bước của luồng dữ liệu">
      {BUOC.map((b, i) => {
        const v = steps[b.id];
        const note = ghiChu(b.id, v, events, cheDo);
        const noiDung = (
          <>
            <span className="block text-[15px] font-semibold">{b.so} {b.ten}</span>
            <span className="mt-0.5 block text-[13px] font-medium">{trangThai(v)}</span>
            {note && <span className="mt-0.5 block text-xs leading-5 opacity-90">{note}</span>}
          </>
        );
        const lop = `relative block h-full w-full rounded-lg border-2 px-3 py-2 text-left transition-colors ${KHUNG[v.trang_thai]}`;
        return (
          <li key={b.id} className="relative">
            {cheDo === "ky_thuat" ? (
              <button type="button" aria-expanded={open === b.id} onClick={() => onToggle(b.id)}
                className={`${lop} ${FOCUS} hover:shadow-sm ${open === b.id ? "ring-2 ring-ef-xanh/40" : ""}`}>
                {noiDung}
                <span className="mt-1 block text-[11px] font-semibold text-ef-xanh">{open === b.id ? "▲ Ẩn chi tiết" : "▼ Xem chi tiết"}</span>
              </button>
            ) : (
              <div className={lop} aria-live="polite">{noiDung}</div>
            )}
            {i < BUOC.length - 1 && (
              <span aria-hidden className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-ef-phu md:block">▶</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
