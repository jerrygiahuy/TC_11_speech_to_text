"use client";

import { useState } from "react";
import { canonicalizeAudioBlob, isCanonicalPcm16Wav } from "@/lib/stt/audio";
import type { KichBanTomTat } from "@/shared/demo-luong/types";
import { FOCUS } from "./hien-thi";
import { MicWav } from "./MicWav";
import type { BenhNhanGia } from "./ThanhTren";

export type Nguon = "micro" | "file" | "kich_ban";
export interface WavSan { blob: Blob; giay: number | null; ten: string }

const NGUON: { id: Nguon; nhan: string }[] = [
  { id: "micro", nhan: "Micro" },
  { id: "file", nhan: "File WAV" },
  { id: "kich_ban", nhan: "Kịch bản mẫu" },
];
const SELECT = `max-w-full min-w-0 rounded-md border border-ef-vien bg-white px-2 py-1 text-[13px] font-medium text-ef-chu disabled:opacity-60 ${FOCUS}`;

/** Chọn nguồn của phiên mới: micro (thu thành WAV), file WAV, hoặc kịch bản mẫu (bỏ qua STT). */
export function NguonPicker({ nguon, onNguon, kichBan, kbId, onKichBan, benhNhan, phan, onPhan, wav, onWav, khoa }: {
  nguon: Nguon; onNguon: (n: Nguon) => void;
  kichBan: KichBanTomTat[]; kbId: string; onKichBan: (id: string) => void; benhNhan: Record<string, BenhNhanGia>;
  phan: number | "tat_ca"; onPhan: (p: number | "tat_ca") => void;
  wav: WavSan | null; onWav: (w: WavSan | null) => void; khoa: boolean;
}) {
  const [loiFile, setLoiFile] = useState<string | null>(null);
  const [micBan, setMicBan] = useState(false);
  const kb = kichBan.find(k => k.id === kbId);

  async function chonFile(file: File | undefined) {
    setLoiFile(null); onWav(null);
    if (!file) return;
    try {
      const blob = file.type ? file : new Blob([file], { type: "audio/wav" });
      const chuan = (await isCanonicalPcm16Wav(blob)) ? blob : await canonicalizeAudioBlob(blob);
      onWav({ blob: chuan, giay: null, ten: file.name });
    } catch { setLoiFile("Không đọc được file này. Chọn file WAV khác."); }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-ef-vien bg-white px-4 py-3">
      <span className="text-[13px] font-semibold text-ef-phu">Nguồn:</span>
      <div role="radiogroup" aria-label="Nguồn phiên ghi âm" className="inline-flex flex-wrap gap-3">
        {NGUON.map(n => (
          <label key={n.id} htmlFor={`nguon-demo-${n.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ef-chu">
            <input id={`nguon-demo-${n.id}`} type="radio" name="nguon-demo" value={n.id} aria-label={n.nhan}
              checked={nguon === n.id} disabled={khoa || micBan} onChange={() => onNguon(n.id)} className="accent-ef-xanh" />
            {n.nhan}
          </label>
        ))}
      </div>
      {nguon === "kich_ban" && (
        <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <select aria-label="Kịch bản mẫu" value={kbId} disabled={khoa} onChange={e => onKichBan(e.target.value)} className={SELECT}>
            {kichBan.map(k => <option key={k.id} value={k.id}>{k.ten} · {benhNhan[k.benh_nhan_id]?.ten ?? k.benh_nhan_id}</option>)}
          </select>
          {kb && kb.phien.length > 0 && (
            <select aria-label="Phần của kịch bản" value={String(phan)} disabled={khoa}
              onChange={e => onPhan(e.target.value === "tat_ca" ? "tat_ca" : Number(e.target.value))} className={SELECT}>
              {kb.phien.map(p => <option key={p} value={p}>Phần {p}</option>)}
              <option value="tat_ca">Cả kịch bản</option>
            </select>
          )}
          <span className="text-xs text-ef-phu">Chữ có sẵn, bỏ qua STT</span>
        </span>
      )}
      {nguon === "micro" && (
        <span className="inline-flex flex-wrap items-center gap-2">
          <MicWav disabled={khoa} onBan={setMicBan} onWav={(blob, giay) => onWav(blob ? { blob, giay, ten: "micro" } : null)} />
          <span className="text-xs text-ef-phu">Chế độ bác sĩ đọc (dictation) · STT chạy trên máy chủ, không lưu âm thanh</span>
        </span>
      )}
      {nguon === "file" && (
        <span className="inline-flex flex-wrap items-center gap-2">
          <input type="file" accept="audio/wav,audio/x-wav,.wav" disabled={khoa} aria-label="Chọn file WAV"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; void chonFile(f); }}
            className="text-[13px] file:mr-2 file:rounded-md file:border file:border-ef-vien file:bg-white file:px-2.5 file:py-1 file:text-[13px] file:font-medium" />
          {loiFile && <span role="alert" className="text-[13px] text-ef-do">{loiFile}</span>}
        </span>
      )}
      {wav && nguon !== "kich_ban" && (
        <span className="text-[13px] font-medium text-on-accent">
          ✓ Sẵn sàng: {wav.ten === "micro" ? `bản thu ${wav.giay ?? 0} giây` : wav.ten}
        </span>
      )}
    </div>
  );
}
