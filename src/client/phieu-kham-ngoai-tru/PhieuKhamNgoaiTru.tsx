"use client";

import { useCallback, useEffect, useState } from "react";
import { CAU_HINH_PHIEU } from "@/shared/phieu-kham-ngoai-tru/config";
import { datTheoDuongDan, giaTriRong, layTheoDuongDan, saoChep, taoBanGhiRong, taoBanGhiViDu, tachHuyetAp, tinhBmi } from "@/shared/phieu-kham-ngoai-tru/du-lieu";
import type { DuLieuPhieu, TomTatPhieu, Truong } from "@/shared/phieu-kham-ngoai-tru/types";
import { capNhatPhieu, dsPhieu, docPhieu, taoPhieu } from "./api";
import { Control, NUT_VIEN, O_NHAP } from "./Control";

type TrangThai = { loai: "im" | "ok" | "loi" | "dang"; chu: string };

function gioVi(iso: string) {
  return new Date(iso).toLocaleString("vi-VN");
}

function NhanNhap({ cachNhap }: { cachNhap: Truong["cach_nhap"] }) {
  const chu = cachNhap === "tu_dong" ? "EMR tự điền" : cachNhap === "chi_doc" ? "Chỉ đọc trên EMR" : null;
  return chu ? <span className="ml-2 rounded-full bg-ef-nen px-2 py-px text-[11px] font-normal text-ef-phu ring-1 ring-ef-vien">{chu}</span> : null;
}

function BangLap({ truong, value, onChange }: { truong: Truong; value: unknown; onChange: (v: Record<string, unknown>[]) => void }) {
  const dong = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const cot = truong.cot ?? [];
  const sua = (i: number, khoa: string, v: unknown) => onChange(dong.map((d, j) => (j === i ? { ...d, [khoa]: v } : d)));
  const them = () => onChange([...dong, Object.fromEntries(cot.map((c) => [c.khoa, giaTriRong(c)]))]);
  return (
    <div className="space-y-2">
      {dong.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ef-vien">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {cot.map((c) => (
                  <th key={c.khoa} className="border-b border-ef-vien bg-ef-nen px-3 py-2 text-left text-xs font-semibold text-ef-phu">
                    {c.nhan}
                  </th>
                ))}
                <th className="border-b border-ef-vien bg-ef-nen px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {dong.map((d, i) => (
                <tr key={i}>
                  {cot.map((c) => (
                    <td key={c.khoa} className="min-w-40 border-b border-ef-vien/70 px-2 py-2 align-top">
                      <Control spec={c} name={`${truong.khoa}.${i}.${c.khoa}`} nhan={`${c.nhan} (dòng ${i + 1})`} value={d[c.khoa]} onChange={(v) => sua(i, c.khoa, v)} />
                    </td>
                  ))}
                  <td className="border-b border-ef-vien/70 px-2 py-2 align-top">
                    <button type="button" onClick={() => onChange(dong.filter((_, j) => j !== i))} className={NUT_VIEN}>
                      Xóa dòng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={them} className={NUT_VIEN}>
        + Thêm dòng
      </button>
      {dong.length === 0 && <span className="ml-2 text-[13px] text-ef-phu">Chưa có dòng nào.</span>}
    </div>
  );
}

export function PhieuKhamNgoaiTru() {
  const [duLieu, setDuLieu] = useState<DuLieuPhieu>(() => taoBanGhiRong());
  const [id, setId] = useState<string | null>(null);
  const [danhSach, setDanhSach] = useState<TomTatPhieu[]>([]);
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: "im", chu: "Phiếu mới, chưa lưu." });

  const taiDanhSach = useCallback(async () => {
    try {
      setDanhSach(await dsPhieu());
    } catch (e) {
      setTrangThai({ loai: "loi", chu: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp danh sách phiếu đã lưu khi mở trang
    void taiDanhSach();
  }, [taiDanhSach]);

  const dat = (khoa: string, v: unknown) =>
    setDuLieu((cu) => {
      const moi = saoChep(cu);
      datTheoDuongDan(moi, khoa, v);
      if (khoa === "chieu_cao" || khoa === "can_nang") {
        const bmi = tinhBmi(moi.chieu_cao, moi.can_nang);
        if (bmi !== null) moi.bmi = bmi;
      }
      return moi;
    });

  const datHuyetAp = (truong: Truong, chuoi: string) =>
    setDuLieu((cu) => {
      const moi = saoChep(cu);
      datTheoDuongDan(moi, truong.khoa, chuoi);
      const { tamThu, tamTruong } = tachHuyetAp(chuoi);
      const [a, b] = truong.khoa_con ?? [];
      if (a) datTheoDuongDan(moi, a, tamThu);
      if (b) datTheoDuongDan(moi, b, tamTruong);
      return moi;
    });

  const phieuMoi = () => {
    setDuLieu(taoBanGhiRong());
    setId(null);
    setTrangThai({ loai: "im", chu: "Phiếu mới, chưa lưu." });
  };

  const mo = async (maPhieu: string) => {
    if (!maPhieu) return;
    setTrangThai({ loai: "dang", chu: "Đang mở phiếu…" });
    try {
      const b = await docPhieu(maPhieu);
      // Trộn lên bản rỗng: phiếu lưu bằng phiên bản config cũ vẫn có đủ khóa mới
      const moi = taoBanGhiRong();
      for (const t of CAU_HINH_PHIEU.phan.flatMap((p) => p.muc.flatMap((m) => m.truong))) {
        for (const k of [t.khoa, ...(t.khoa_con ?? [])]) {
          const v = layTheoDuongDan(b.du_lieu, k);
          if (v !== undefined) datTheoDuongDan(moi, k, v);
        }
      }
      setDuLieu(moi);
      setId(b.id);
      setTrangThai({ loai: "ok", chu: `Đã mở phiếu, lưu lúc ${gioVi(b.cap_nhat_luc)}.` });
    } catch (e) {
      setTrangThai({ loai: "loi", chu: (e as Error).message });
    }
  };

  const luu = async () => {
    setTrangThai({ loai: "dang", chu: "Đang lưu…" });
    try {
      const b = id ? await capNhatPhieu(id, duLieu) : await taoPhieu(duLieu);
      setId(b.id);
      setTrangThai({ loai: "ok", chu: `Đã lưu lúc ${gioVi(b.cap_nhat_luc)}.` });
      void taiDanhSach();
    } catch (e) {
      setTrangThai({ loai: "loi", chu: `Lưu lỗi: ${(e as Error).message}` });
    }
  };

  const dienViDu = () => {
    setDuLieu(taoBanGhiViDu());
    setTrangThai({ loai: "im", chu: "Đã điền ví dụ (dữ liệu bịa), chưa lưu." });
  };

  const mauChu = { im: "text-ef-phu", ok: "text-green-700", loi: "text-ef-do", dang: "text-ef-phu" }[trangThai.loai];

  return (
    <main className="min-h-0 flex-1 bg-ef-nen">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-ef-vien bg-white px-4 py-2.5">
        <h2 className="mr-2 text-[15px] font-semibold text-ef-dam">Phiếu khám ngoại trú (Tim mạch)</h2>
        <select aria-label="Phiếu đã lưu" value={id ?? ""} onChange={(e) => void mo(e.target.value)} className={`${O_NHAP} !w-auto max-w-sm !py-1`}>
          <option value="">{danhSach.length ? "Mở phiếu đã lưu…" : "Chưa có phiếu đã lưu"}</option>
          {danhSach.map((p) => (
            <option key={p.id} value={p.id}>
              {gioVi(p.cap_nhat_luc)} – {p.ly_do_kham.slice(0, 40) || p.chan_doan_ban_dau_mo_ta.slice(0, 40) || p.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <button type="button" onClick={phieuMoi} className={NUT_VIEN}>
          Phiếu mới
        </button>
        <button type="button" onClick={dienViDu} className={NUT_VIEN}>
          Điền ví dụ
        </button>
        <button type="button" onClick={() => void luu()} disabled={trangThai.loai === "dang"} className="rounded-md bg-ef-xanh px-4 py-1.5 text-sm font-semibold text-white hover:bg-ef-dam disabled:opacity-50">
          Lưu
        </button>
        <span role="status" className={`text-[13px] ${mauChu}`}>
          {trangThai.chu}
        </span>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-4">
        {CAU_HINH_PHIEU.phan.map((phan) => (
          <div key={phan.tieu_de} className="space-y-4">
            <h2 className="text-base font-bold text-ef-dam">{phan.tieu_de}</h2>
            {phan.muc.map((muc, mi) => (
              <section key={`${muc.tieu_de}-${mi}`} className="rounded-lg border border-ef-vien bg-white">
                <h3 className="flex flex-wrap items-center gap-2 border-b border-ef-vien px-5 py-3 text-[15px] font-semibold text-ef-dam">
                  {muc.tieu_de}
                  {(muc.nut ?? []).map((n) => (
                    <button key={n} type="button" disabled className={NUT_VIEN}>
                      {n}
                    </button>
                  ))}
                </h3>
                <div className="space-y-5 p-5">
                  {muc.truong.map((t) => (
                    <div key={t.khoa}>
                      <div className="mb-1 flex flex-wrap items-center text-[13px] font-medium text-ef-chu">
                        {t.nhan}
                        <NhanNhap cachNhap={t.cach_nhap} />
                        {(t.nut ?? []).map((n) => (
                          <button key={n} type="button" disabled className={`${NUT_VIEN} ml-2 !px-2 !py-0.5 !text-[11px]`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      {t.kieu === "bang_lap" ? (
                        <BangLap truong={t} value={layTheoDuongDan(duLieu, t.khoa)} onChange={(v) => dat(t.khoa, v)} />
                      ) : t.khoa_con ? (
                        <div className="space-y-1">
                          <input
                            aria-label={t.nhan}
                            value={String(layTheoDuongDan(duLieu, t.khoa) ?? "")}
                            placeholder={t.vi_du}
                            onChange={(e) => datHuyetAp(t, e.target.value)}
                            className={O_NHAP}
                          />
                          <p className="text-xs text-ef-phu">
                            Tách: tâm thu {String(layTheoDuongDan(duLieu, t.khoa_con[0]) ?? "–")}, tâm trương {String(layTheoDuongDan(duLieu, t.khoa_con[1]) ?? "–")}
                          </p>
                        </div>
                      ) : (
                        <Control spec={t} name={t.khoa} nhan={t.nhan} value={layTheoDuongDan(duLieu, t.khoa)} onChange={(v) => dat(t.khoa, v)} />
                      )}
                      {t.dinh_dang && t.kieu !== "ngay_gio" && <p className="mt-1 text-xs text-ef-phu">{t.dinh_dang}</p>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
