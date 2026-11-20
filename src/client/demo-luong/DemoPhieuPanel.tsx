"use client";

import { useState } from "react";
import type { ClinicalExtraction } from "@/shared/clinical/api";
import type { DemoFieldSource, DemoPhieu } from "@/shared/demo-luong/types";
import { BTN_CHINH, BTN_OUTLINE } from "@/client/eform/fields";
import { gioVN, type CheDo } from "./hien-thi";

/**
 * Ô văn bản của phiếu, cùng nhãn với eForm (`BaoCaoDialog`, `dien-phieu.ts`). `duong` là field_path của bằng chứng AI.
 * `luon`: luôn hiện kể cả khi trống.
 */
const O_VAN_BAN: { id: string; nhan: string; duong: string; luon?: boolean }[] = [
  { id: "ly_do", nhan: "Lý do đến khám", duong: "/phieu_kham/ly_do_kham", luon: true },
  { id: "benh_su", nhan: "Bệnh sử", duong: "/phieu_kham/benh_su", luon: true },
  { id: "tien_su_ban_than", nhan: "Tiền sử bản thân", duong: "/phieu_kham/tien_su_ban_than" },
  { id: "tien_su_gia_dinh", nhan: "Tiền sử gia đình", duong: "/phieu_kham/tien_su_gia_dinh" },
  { id: "kham_toan_than", nhan: "Khám toàn thân", duong: "/phieu_kham/kham_toan_than" },
  { id: "kham_chuyen_khoa", nhan: "Khám chuyên khoa", duong: "/phieu_kham/kham_chuyen_khoa", luon: true },
  { id: "kham_khac", nhan: "Khám các bộ phận khác", duong: "/phieu_kham/kham_khac" },
  { id: "huong_dieu_tri", nhan: "Hướng điều trị", duong: "/phieu_kham/huong_dieu_tri" },
  { id: "loi_dan", nhan: "Lời dặn & theo dõi", duong: "/phieu_kham/loi_dan" },
];
const BEN: Record<string, string> = { phai: "phải", trai: "trái", hai_ben: "hai bên" };

function NhanNguon({ nguon }: { nguon: DemoFieldSource | undefined }) {
  if (!nguon) return null;
  if (nguon.nguon === "bac_si") return <span className="rounded-full bg-ef-dam/10 px-2 py-px text-[11px] font-semibold text-ef-dam">Bác sĩ sửa</span>;
  return <span className="rounded-full bg-tim-nhat px-2 py-px text-[11px] font-semibold text-tim ring-1 ring-tim-vien">AI · phiên {nguon.phien ?? "?"}</span>;
}

function XungDot({ nguon }: { nguon: DemoFieldSource | undefined }) {
  if (!nguon?.xung_dot) return null;
  return (
    <p className="mt-1 rounded border border-xem/40 bg-xem-nhat px-2 py-1 text-[13px] text-xem">
      ⚠ Phiên {nguon.xung_dot.phien} nói khác: {nguon.xung_dot.gia_tri_ai}
    </p>
  );
}

export function DemoPhieuPanel({ phieu, cheDo, thaoTac, banChay, onLuu, onDuyet, dangGhi, onDangSua }: {
  phieu: DemoPhieu | null;
  cheDo: CheDo;
  thaoTac: number;
  /** Lượt AI theo số phiên (chỉ những phiên chạy trong lúc mở trang): lấy câu nguồn và cờ cần kiểm tra. */
  banChay: Record<number, ClinicalExtraction>;
  onLuu: (fields: Record<string, string>) => Promise<boolean>;
  onDuyet: () => Promise<boolean>;
  dangGhi: boolean;
  /** Báo màn hình đang mở bản sửa: khi đó không cho ghi phiên mới (phiên mới đổi giá trị dưới tay bác sĩ). */
  onDangSua: (dangSua: boolean) => void;
}) {
  // `goc`: giá trị lúc bấm Sửa. Chỉ gửi ô bác sĩ thật sự đổi so với lúc đó, không so với phiếu hiện tại.
  const [ban, setBan] = useState<{ goc: Record<string, string>; nhap: Record<string, string> } | null>(null);
  const nhap = ban?.nhap ?? null;
  const datBan = (v: typeof ban) => { setBan(v); onDangSua(v !== null); };
  const [dangLuu, setDangLuu] = useState(false);
  const [bao, setBao] = useState<string | null>(null);
  const chu = cheDo === "bac_si" ? "text-[16px] leading-7" : "text-sm leading-6";

  if (!phieu) {
    return (
      <section className="rounded-lg border border-ef-vien bg-white px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ef-dam">Phiếu khám (đọc lại từ kho)</h2>
        <p className="mt-2 text-sm text-ef-phu">Đang mở phiếu…</p>
      </section>
    );
  }
  const f = phieu.snapshot.fields;
  const val = (id: string) => f[id]?.value ?? "";
  const cauNguon = (id: string, duong: string) => {
    const s = phieu.sources[id];
    const run = s?.nguon === "ai" && s.phien ? banChay[s.phien] : undefined;
    const ev = run?.draft.bang_chung.find(b => b.field_path === duong || b.field_path.startsWith(`${duong}/`));
    return ev && s?.phien ? { phien: s.phien, text: ev.trich_doan } : null;
  };
  const canKiemTra = Object.entries(banChay).flatMap(([seq, run]) => run.draft.can_xem_lai.map(issue => ({ seq: Number(seq), ...issue })));

  async function luu() {
    if (!ban || !phieu) return;
    const doi = Object.fromEntries(Object.entries(ban.nhap).filter(([id, v]) => v !== ban.goc[id]));
    if (!Object.keys(doi).length) { setBao("Chưa có ô nào được sửa."); return; }
    setDangLuu(true); setBao(null);
    const ok = await onLuu(doi);
    setDangLuu(false);
    if (ok) datBan(null);
  }
  async function duyet() {
    setDangLuu(true); setBao(null);
    await onDuyet();
    setDangLuu(false);
  }

  const hien = O_VAN_BAN.filter(o => o.luon || val(o.id) || nhap);
  const khoa = dangLuu || dangGhi;
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-ef-vien bg-white">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ef-vien px-4 py-2.5">
        <h2 className="text-[15px] font-semibold text-ef-dam">Phiếu khám (đọc lại từ kho)</h2>
        <span className="text-xs text-ef-phu">rev {phieu.revision} · {phieu.appointment_id}</span>
      </header>
      <div className="flex-1 space-y-3 px-4 py-3">
        <p className={`rounded px-2 py-1 text-[13px] font-semibold ${phieu.duyet ? "bg-accent/15 text-on-accent" : "bg-xem-nhat text-xem"}`}>
          {phieu.duyet ? `✓ Đã duyệt lúc ${gioVN(phieu.duyet.luc)} · ${phieu.duyet.boi}` : "Nháp — AI điền sẵn, chờ bác sĩ duyệt"}
        </p>
        {hien.map(o => {
          const nguon = phieu.sources[o.id];
          const cau = cauNguon(o.id, o.duong);
          return (
            <div key={o.id}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-semibold text-ef-chu">{o.nhan}</span>
                <NhanNguon nguon={nguon} />
                {f[o.id]?.nguon === "xem" && <span className="rounded-full bg-xem-nhat px-2 py-px text-[11px] font-semibold text-xem ring-1 ring-xem/40">⚠ cần xem lại</span>}
              </div>
              {nhap ? (
                <textarea
                  aria-label={o.nhan}
                  value={nhap[o.id] ?? ""}
                  onChange={e => ban && datBan({ goc: ban.goc, nhap: { ...ban.nhap, [o.id]: e.target.value } })}
                  rows={o.id === "kham_chuyen_khoa" || o.id === "benh_su" ? 3 : 2}
                  className="mt-1 w-full rounded-md border border-ef-vien bg-white px-3 py-2 text-sm leading-6 text-ef-chu outline-none focus:border-ef-xanh focus:ring-2 focus:ring-ef-xanh/20"
                />
              ) : (
                <p className={`mt-0.5 whitespace-pre-wrap break-words ${chu} ${val(o.id) ? "text-ef-chu" : "text-ef-phu"}`}>{val(o.id) || "—"}</p>
              )}
              {cau && !nhap && <p className="mt-0.5 text-xs text-ef-phu">Câu nguồn (phiên {cau.phien}): “{cau.text}”</p>}
              <XungDot nguon={nguon} />
            </div>
          );
        })}
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold text-ef-chu">Chẩn đoán ban đầu</span>
            <NhanNguon nguon={phieu.sources.mo_ta_ban_dau ?? phieu.sources.icd_ban_dau} />
          </div>
          <p className={`mt-0.5 ${chu} ${val("mo_ta_ban_dau") || val("icd_ban_dau") ? "text-ef-chu" : "text-ef-phu"}`}>
            {val("icd_ban_dau") && <span className="mr-1.5 rounded bg-ef-nen px-1.5 py-px font-mono text-[13px] text-ef-dam">{val("icd_ban_dau")}</span>}
            {val("mo_ta_ban_dau") || (val("icd_ban_dau") ? "" : "— (AI không tự chẩn đoán; bác sĩ ghi)")}
          </p>
          <XungDot nguon={phieu.sources.mo_ta_ban_dau} />
        </div>
        <div>
          <span className="text-[13px] font-semibold text-ef-chu">Chỉ định</span>
          {phieu.snapshot.chiDinh.length === 0 ? (
            <p className={`mt-0.5 ${chu} text-ef-phu`}>—</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {phieu.snapshot.chiDinh.map((d, i) => (
                <li key={d.id ?? i} className={`flex flex-wrap items-center gap-1.5 ${chu} text-ef-chu`}>
                  <span>{d.ten}{d.ben && BEN[d.ben] ? ` · ${BEN[d.ben]}` : ""}</span>
                  {d.ma ? <span className="rounded bg-ef-nen px-1.5 py-px font-mono text-[12px] text-ef-dam" title="Mã gán bởi bộ khớp danh mục">{d.ma}</span>
                    : <span className="rounded-full bg-xem-nhat px-2 py-px text-[11px] font-semibold text-xem">chưa khớp danh mục</span>}
                  {d.nguon === "xem" && <span className="rounded-full bg-xem-nhat px-2 py-px text-[11px] font-semibold text-xem ring-1 ring-xem/40">⚠ cần xem lại</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {canKiemTra.length > 0 && (
          <div className="rounded border border-xem/40 bg-xem-nhat px-3 py-2 text-[13px] text-xem">
            <p className="font-semibold">Cờ cần kiểm tra</p>
            <ul className="mt-0.5 list-inside list-disc">
              {canKiemTra.map((c, i) => <li key={i}>Phiên {c.seq} · {c.field_path === "/phieu_kham/chan_doan" ? "Chẩn đoán" : c.field_path}: {c.mo_ta}</li>)}
            </ul>
          </div>
        )}
      </div>
      <footer className="space-y-2 border-t border-ef-vien px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {nhap ? (
            <>
              <button type="button" className={BTN_OUTLINE} onClick={() => { datBan(null); setBao(null); }} disabled={khoa}>Hủy</button>
              <button type="button" className={BTN_OUTLINE} onClick={() => void luu()} disabled={khoa}>{dangLuu ? "Đang lưu…" : "Lưu bản sửa"}</button>
            </>
          ) : (
            <button type="button" className={BTN_OUTLINE} disabled={khoa}
              onClick={() => { setBao(null); const goc = Object.fromEntries(O_VAN_BAN.map(o => [o.id, val(o.id)])); datBan({ goc, nhap: { ...goc } }); }}>
              Sửa
            </button>
          )}
          <button type="button" className={BTN_CHINH} onClick={() => void duyet()}
            disabled={khoa || !!nhap || !!phieu.duyet || phieu.sessions.length === 0}
            title={phieu.sessions.length === 0 ? "Chưa có phiên nào để duyệt" : phieu.duyet ? "Phiếu đã duyệt" : undefined}>
            {phieu.duyet ? "Đã duyệt" : "Duyệt"}
          </button>
          <span className="ml-auto text-xs text-ef-phu">rev {phieu.revision}</span>
        </div>
        {bao && <p role="status" className="text-[13px] text-xem">{bao}</p>}
        <p className={`font-semibold text-ef-dam ${cheDo === "bac_si" ? "text-[15px]" : "text-[13px]"}`}>
          Bác sĩ thao tác: {thaoTac} lần (duyệt phiếu)
        </p>
      </footer>
    </section>
  );
}
