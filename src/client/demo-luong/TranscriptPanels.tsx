"use client";

import type { ReactNode } from "react";
import type { GateReason, GateResult, PiiRule, PiiSpan } from "@/shared/clinical/pii";
import { NHAN_CHE, TEN_LY_DO_CHAN, tongDaChe, type CheDo } from "./hien-thi";

export interface BanThoView { raw: string; spans: PiiSpan[]; mode: "conversation" | "dictation" }
/** `tuChe`: phần còn sót đã tự che; lượt vừa chạy có cả đoạn chữ, phiên đọc lại từ kho chỉ có mã lý do. */
export interface BanSachView { clean: string; counts: Partial<Record<PiiRule, number>>; gate: GateResult | null; tuChe: { reason: GateReason; excerpt?: string }[] }

/** Bản thô: tô đỏ các đoạn nhạy cảm, rê chuột thấy mã rule. */
function ToDo({ raw, spans }: Pick<BanThoView, "raw" | "spans">) {
  const parts: ReactNode[] = [];
  let at = 0;
  [...spans].sort((a, b) => a.start - b.start).forEach((s, i) => {
    if (s.start < at) return;
    if (s.start > at) parts.push(raw.slice(at, s.start));
    parts.push(
      <mark key={i} title={`${s.rule} → ${s.label}`} className="cursor-help rounded bg-ef-do-nhat px-0.5 font-medium text-ef-do ring-1 ring-ef-do/30">
        {raw.slice(s.start, s.end)}
        <span className="sr-only"> ({s.rule}, thay bằng {s.label})</span>
      </mark>,
    );
    at = s.end;
  });
  parts.push(raw.slice(at));
  return <>{parts}</>;
}

/** Bản đã che: nhãn `[…]` hiện xanh, có hiệu ứng đỏ → xanh khi vừa che xong. */
function ToXanh({ clean }: { clean: string }) {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const m of clean.matchAll(NHAN_CHE)) {
    if (m.index > at) parts.push(clean.slice(at, m.index));
    parts.push(
      <span key={m.index} className="rounded bg-accent/15 px-0.5 font-semibold text-on-accent ring-1 ring-accent/40 motion-safe:animate-[demo-do-sang-xanh_1s_ease-out]">
        {m[0]}
      </span>,
    );
    at = m.index + m[0].length;
  }
  parts.push(clean.slice(at));
  return <>{parts}</>;
}

function Cot({ tieuDe, phu, children, chan }: { tieuDe: string; phu?: ReactNode; children: ReactNode; chan?: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-ef-vien bg-white">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ef-vien px-4 py-2.5">
        <h2 className="text-[15px] font-semibold text-ef-dam">{tieuDe}</h2>
        {phu}
      </header>
      <div className="flex-1 px-4 py-3">{children}</div>
      {chan && <footer className="border-t border-ef-vien px-4 py-2 text-[13px]">{chan}</footer>}
    </section>
  );
}

const TRONG = "text-sm text-ef-phu";

export function BanThoPanel({ data, ghiChu, cheDo }: { data: BanThoView | null; ghiChu?: string; cheDo: CheDo }) {
  const chu = cheDo === "bac_si" ? "text-[17px] leading-8" : "text-sm leading-7";
  return (
    <Cot
      tieuDe="Bản thô"
      phu={<span className="text-xs text-ef-phu">Chỉ trong bộ nhớ trình duyệt · không ghi đĩa</span>}
      chan={data && <span className="text-ef-phu">{data.spans.length} đoạn nhạy cảm (tô đỏ) · rê chuột để xem mã rule</span>}
    >
      {data ? (
        <p className={`whitespace-pre-wrap break-words text-ef-chu ${chu}`}><ToDo raw={data.raw} spans={data.spans} /></p>
      ) : (
        <p className={TRONG}>{ghiChu ?? "Chưa có lượt ghi nào. Chọn nguồn rồi bấm “▶ Ghi phiên mới”."}</p>
      )}
    </Cot>
  );
}

export function BanSachPanel({ data, animKey, cheDo }: { data: BanSachView | null; animKey: string; cheDo: CheDo }) {
  const chu = cheDo === "bac_si" ? "text-[17px] leading-8" : "text-sm leading-7";
  const chan = data?.gate && !data.gate.passed;
  return (
    <Cot
      tieuDe="Bản đã che"
      phu={<span className="text-xs text-ef-phu">Chỉ bản này được đưa cho AI</span>}
      chan={data && (
        <div className="space-y-1">
          <p className={chan ? "font-semibold text-ef-do" : "font-semibold text-ef-dam"}>
            Đã che {tongDaChe(data.counts)} mục{data.tuChe.length > 0 && ` · Tự che thêm ${data.tuChe.length}`} · Chặn: {chan ? "có" : "không"}
          </p>
          {data.tuChe.length > 0 && (
            <ul className="list-inside list-disc text-ef-phu">
              {data.tuChe.map((r, i) => <li key={i}>{TEN_LY_DO_CHAN[r.reason] ?? r.reason}{r.excerpt ? <>: <code className="break-all rounded bg-ef-nen px-1">{r.excerpt}</code></> : null} → đã tự che</li>)}
            </ul>
          )}
          {chan && (
            <ul className="list-inside list-disc text-ef-do">
              {data.gate!.reasons.map((r, i) => <li key={i}>{TEN_LY_DO_CHAN[r.reason] ?? r.reason}</li>)}
            </ul>
          )}
        </div>
      )}
    >
      {data ? (
        <p key={animKey} className={`whitespace-pre-wrap break-words text-ef-chu ${chu}`}><ToXanh clean={data.clean} /></p>
      ) : (
        <p className={TRONG}>Bản đã che hiện ở đây sau bước ③.</p>
      )}
    </Cot>
  );
}
