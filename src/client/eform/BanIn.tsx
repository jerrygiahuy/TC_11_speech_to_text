"use client";

import type { ReactNode } from "react";
import { useEform } from "@/client/eform/EformContext";
import { moTaLieu } from "@/client/eform/DonThuocTab";
import { nhanIcd } from "@/client/eform/IcdField";
import { dongChanDoanIn } from "@/shared/eform/chan-doan-in";
import type { DongChiDinh, DongThuoc } from "@/shared/eform/dien-phieu";

/** "2026-11-09T09:15" → "09/11/2026 09:15"; giá trị lạ thì giữ nguyên */
export function ngayGio(value: string): string {
  const found = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/);
  if (!found) return value;
  return `${found[3]}/${found[2]}/${found[1]}${found[4] ? ` ${found[4]}` : ""}`;
}

/** Chẩn đoán chính: ưu tiên chẩn đoán ra viện, chưa có thì lấy chẩn đoán ban đầu */
export function chanDoanChinh(get: (id: string) => { value: string }) {
  const raVien = get("icd_ra_vien").value || get("mo_ta_ra_vien").value;
  const [nhan, maId, moTaId] = raVien
    ? ["Chẩn đoán ra viện", "icd_ra_vien", "mo_ta_ra_vien"]
    : ["Chẩn đoán ban đầu", "icd_ban_dau", "mo_ta_ban_dau"];
  return { nhan, maId, ma: get(maId).value, moTa: get(moTaId).value };
}

function Muc({ nhan, children }: { nhan: string; children: ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <span className="font-semibold">{nhan}: </span>
      <span className="whitespace-pre-wrap">{children}</span>
    </div>
  );
}

const TH_IN = "border border-black/60 px-1.5 py-0.5 text-left font-semibold";
const TD_IN = "border border-black/60 px-1.5 py-0.5 align-top";

/**
 * Bản in của "In ngay": phiếu khám, chỉ định và đơn thuốc trên khổ A4.
 * Trên màn hình bị ẩn; khi in thì chỉ khối này hiện (phần còn lại của trang có print:hidden).
 */
export function BanIn({ chiDinh, donThuoc, trangThai, summary, followUpText, duyet }: { chiDinh: DongChiDinh[]; donThuoc: DongThuoc[]; trangThai: string; summary?: string; followUpText?: string; duyet?: string }) {
  const { data, get, thuoc } = useEform();
  const { ca } = data;
  const sh = ca.sinh_hieu;
  const bmi = sh.chieu_cao && sh.can_nang ? (sh.can_nang / (sh.chieu_cao / 100) ** 2).toFixed(1) : "";
  const v = (id: string) => get(id).value.trim();
  const thuocIn = v("thuoc_dang_dung") === "NB không có"
    ? "Không có"
    : thuoc.map((row) => [row.ten, row.ham_luong, row.cach_dung].map((x) => x.trim()).filter(Boolean).join(" – ")).filter(Boolean).join("; ");
  const diUng = v("di_ung") === "Có" ? [v("di_ung_loai"), v("di_ung_mo_ta")].filter(Boolean).join(": ") || "Có" : v("di_ung");

  const truong: { nhan: string; noiDung: string }[] = [
    { nhan: "Tóm tắt buổi khám", noiDung: summary ?? "" },
    { nhan: "Lý do đến khám", noiDung: v("ly_do") },
    { nhan: "Bệnh sử", noiDung: v("benh_su") },
    { nhan: "Tiền sử bản thân", noiDung: v("tien_su_ban_than") },
    { nhan: "Tiền sử gia đình", noiDung: v("tien_su_gia_dinh") },
    { nhan: "Tiền sử dị ứng", noiDung: diUng },
    { nhan: "Thuốc đang dùng", noiDung: thuocIn },
    { nhan: "Khám toàn thân", noiDung: v("kham_toan_than") },
    { nhan: "Khám chuyên khoa", noiDung: v("kham_chuyen_khoa") },
    { nhan: "Khám tim mạch, hô hấp", noiDung: v("kham_tim_mach_ho_hap") },
    { nhan: "Khám các bộ phận khác", noiDung: v("kham_khac") },
    { nhan: "Xét nghiệm, thăm dò chính", noiDung: v("ghi_chu_kq") },
    ...dongChanDoanIn(get, (ma) => nhanIcd(ma, data.icd10)),
    { nhan: "Chẩn đoán kèm theo", noiDung: nhanIcd(v("icd_kem_theo"), data.icd10) },
    { nhan: "Hướng điều trị", noiDung: v("huong_dieu_tri") },
    { nhan: "Lời dặn & theo dõi", noiDung: v("loi_dan") },
    { nhan: "Hẹn tái khám", noiDung: v("hen_tai_kham") === "Có" ? ngayGio(v("ngay_tai_kham")) || followUpText || "Có" : v("hen_tai_kham") },
    { nhan: "Tình trạng ra viện", noiDung: v("tinh_trang_ra_vien") },
  ].filter((item) => item.noiDung);

  return (
    <div className="hidden bg-white text-[11pt] leading-snug text-black print:block">
      <div className="flex items-start justify-between gap-4 border-b border-black pb-2">
        <div>
          <div className="font-bold">VINMEC – Bệnh án điện tử</div>
          <div>{ca.co_so}</div>
          <div>{ca.phong_kham}</div>
        </div>
        <div className="rounded border border-black px-2 py-1 text-center text-[9pt] font-semibold">
          DỮ LIỆU GIẢ – BẢN MÔ PHỎNG
          <br />
          không dùng cho lâm sàng
        </div>
      </div>

      <h1 className="my-3 text-center text-[15pt] font-bold">PHIẾU KHÁM NGOẠI TRÚ</h1>
      {duyet && <p className="mb-2 text-center text-[9pt]">{duyet}</p>}

      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
        <Muc nhan="Họ tên">{ca.ho_ten}</Muc>
        <Muc nhan="Giới tính">{ca.gioi_tinh}</Muc>
        <Muc nhan="PID">{ca.pid}</Muc>
        <Muc nhan="Mã lượt khám">{ca.ma_luot_kham}</Muc>
        <Muc nhan="Thời gian khám">{ngayGio(v("thoi_gian_kham"))}</Muc>
        <Muc nhan="Trạng thái">{trangThai}</Muc>
      </div>
      {ca.canh_bao_di_ung && <p className="mt-1 font-bold">⚠ Cảnh báo dị ứng: {ca.canh_bao_di_ung}</p>}
      <p className="mt-1">
        <span className="font-semibold">Sinh hiệu: </span>
        {[
          sh.mach !== null && `Mạch ${sh.mach} l/ph`,
          sh.nhiet_do !== null && `Nhiệt độ ${sh.nhiet_do} °C`,
          sh.ha_tam_thu !== null && sh.ha_tam_truong !== null && `HA ${sh.ha_tam_thu}/${sh.ha_tam_truong} mmHg`,
          sh.spo2 !== null && `SpO2 ${sh.spo2}%`,
          sh.nhip_tho !== null && `Nhịp thở ${sh.nhip_tho} l/ph`,
          sh.chieu_cao !== null && `Cao ${sh.chieu_cao} cm`,
          sh.can_nang !== null && `Nặng ${sh.can_nang} kg`,
          bmi && `BMI ${bmi}`,
        ]
          .filter(Boolean)
          .join(" · ") || "chưa đo"}
      </p>

      <div className="mt-3 space-y-1.5">
        {truong.map((item) => (
          <Muc key={item.nhan} nhan={item.nhan}>
            {item.noiDung}
          </Muc>
        ))}
      </div>

      {chiDinh.length > 0 && (
        <div className="mt-4 break-inside-avoid">
          <h2 className="mb-1 font-bold">CHỈ ĐỊNH DỊCH VỤ</h2>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr>
                <th className={`${TH_IN} w-8`}>STT</th>
                <th className={TH_IN}>Mã</th>
                <th className={TH_IN}>Tên dịch vụ</th>
                <th className={`${TH_IN} w-12`}>SL</th>
                <th className={TH_IN}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {chiDinh.map((row, i) => (
                <tr key={`${row.ma}-${row.ten}`}>
                  <td className={TD_IN}>{i + 1}</td>
                  <td className={`${TD_IN} whitespace-nowrap`}>{row.ma}</td>
                  <td className={TD_IN}>{row.ten}</td>
                  <td className={TD_IN}>{row.so_luong}</td>
                  <td className={TD_IN}>{[row.vi_tri, row.ben ? ({ phai: "Phải", trai: "Trái", hai_ben: "Hai bên", khong_ap_dung: "" })[row.ben] : "", row.ghi_chu].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {donThuoc.length > 0 && (
        <div className="mt-4 break-inside-avoid">
          <h2 className="mb-1 font-bold">ĐƠN THUỐC</h2>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr>
                <th className={`${TH_IN} w-8`}>STT</th>
                <th className={TH_IN}>Tên thuốc</th>
                <th className={TH_IN}>Cách dùng</th>
              </tr>
            </thead>
            <tbody>
              {donThuoc.map((row, i) => (
                <tr key={`${row.ma}-${row.ten}`}>
                  <td className={TD_IN}>{i + 1}</td>
                  <td className={TD_IN}>{row.ten}</td>
                  <td className={TD_IN}>{moTaLieu(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 flex justify-end break-inside-avoid">
        <div className="w-56 text-center">
          <div>Bác sĩ khám</div>
          <div className="h-14" />
          <div className="font-semibold">{ca.bac_si_kham}</div>
        </div>
      </div>
    </div>
  );
}
