"use client";

import { useState } from "react";
import { MO_PHONG, useEform } from "@/client/eform/EformContext";
import {
  BTN_OUTLINE,
  FieldLabel,
  NHOM,
  RADIO,
  RadioField,
  TD,
  TH,
  anchorId,
  ReadonlyItem,
  Section,
  SourceBadge,
  TextBox,
  ThuVienButton,
  inputClass,
} from "@/client/eform/fields";
import { IcdField, IcdMultiField } from "@/client/eform/IcdField";
import { LichSuBlock, LichSuThuoc } from "@/client/eform/LichSuBlock";
import { MauCauPanel } from "@/client/eform/MauCauPanel";
import type { DongThuocDangDung, KetQuaTheoNgay, VungKham } from "@/shared/eform/types";

const CO_KHONG = ["Có", "Không"];
/**
 * Bảng "Thông tin khai thác" (lịch sử tiền sử, bệnh sử, dị ứng các lần khám trước, kèm Copy và ✨ AI tóm tắt).
 * Tạm ẩn để buổi thử tập trung vào phần AI điền phiếu; đổi thành true là hiện lại, code giữ nguyên.
 */
const HIEN_THONG_TIN_KHAI_THAC = false;

function KetQuaGroup({ title, items, extra }: { title: string; items: KetQuaTheoNgay[]; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ef-chu">{title}</span>
        {items.length > 0 && <SourceBadge nguon="cu" />}
        {extra}
      </div>
      {items.length === 0 && <p className="text-[13px] text-ef-phu">Chưa có kết quả.</p>}
      <div className="space-y-1">
        {items.map((group) => (
          <details key={group.ngay} className="rounded-md border border-ef-vien bg-white px-3 py-1.5 text-[13px]">
            <summary className="cursor-pointer font-medium tabular-nums">{group.ngay}</summary>
            <ul className="mt-1 space-y-0.5">
              {group.muc.map((item) => (
                <li key={item.ten}>
                  <span className="text-ef-phu">{item.ten}:</span> {item.ket_qua}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

function DateField({ id, label, type }: { id: string; label: string; type: "date" | "datetime-local" }) {
  const { get, edit } = useEform();
  const field = get(id);
  return (
    <label id={anchorId(id)} className="block scroll-mt-44">
      <span className="mb-1 block">
        <FieldLabel id={id} label={label} nguon={field.nguon} />
      </span>
      <input type={type} value={field.value} onChange={(e) => edit(id, e.target.value)} className={inputClass(field.nguon)} />
    </label>
  );
}

/** Ô khám có nút "Mở thư viện tham khảo": tick câu trong hộp chọn rồi chèn vào ô */
function OKhamCoThuVien({ id, label, vung }: { id: string; label: string; vung: VungKham }) {
  const [open, setOpen] = useState(false);
  return (
    <TextBox
      id={id}
      label={label}
      rows={4}
      actions={
        <button type="button" className={BTN_OUTLINE} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          Mở thư viện tham khảo
        </button>
      }
    >
      {open && <MauCauPanel vung={vung} onDong={() => setOpen(false)} />}
    </TextBox>
  );
}

const TRONG_THUOC: DongThuocDangDung = { ten: "", ham_luong: "", cach_dung: "" };

/** Thuốc đang dùng: hỏi có hay không (chưa hỏi thì không nút nào được chọn), có thì nhập danh sách thuốc */
function ThuocDangDung() {
  const { get, edit, thuoc, datThuoc } = useEform();
  const co = get("thuoc_dang_dung").value === "NB có";
  const khong = get("thuoc_dang_dung").value === "NB không có";
  const sua = (index: number, khoa: keyof DongThuocDangDung, value: string) =>
    datThuoc(thuoc.map((row, i) => (i === index ? { ...row, [khoa]: value } : row)));
  const chon = (value: string) => {
    edit("thuoc_dang_dung", value);
    if (value === "NB không có") datThuoc([]);
  };
  return (
    <div className="space-y-2">
      <fieldset id={anchorId("thuoc_dang_dung")} className="scroll-mt-44">
        <legend className="mb-1">
          <FieldLabel id="thuoc_dang_dung" label="Thuốc hiện đang dùng (Bao gồm cả thuốc kê đơn và không kê đơn)" nguon={get("thuoc_dang_dung").nguon} />
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {[["NB không có", "NB không có thuốc đang dùng"], ["NB có", "NB có thuốc đang dùng"]].map(([option, nhan]) => (
            <label key={option} className={RADIO}>
              <input type="radio" name="thuoc_dang_dung" checked={get("thuoc_dang_dung").value === option} onChange={() => chon(option)} className="accent-ef-xanh" />
              {nhan}
            </label>
          ))}
        </div>
      </fieldset>
      {!khong && (
        <div className="space-y-2" aria-label="Danh sách thuốc đang dùng">
          {thuoc.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-ef-vien bg-white p-2 md:grid-cols-[2fr_1fr_2fr_auto]">
              <input aria-label={`Tên thuốc ${index + 1}`} placeholder="Tên thuốc" value={row.ten} onChange={(e) => sua(index, "ten", e.target.value)} className={inputClass(null)} />
              <input aria-label={`Hàm lượng ${index + 1}`} placeholder="Hàm lượng" value={row.ham_luong} onChange={(e) => sua(index, "ham_luong", e.target.value)} className={inputClass(null)} />
              <input aria-label={`Cách dùng ${index + 1}`} placeholder="Cách dùng, ghi chú" value={row.cach_dung} onChange={(e) => sua(index, "cach_dung", e.target.value)} className={inputClass(null)} />
              <button type="button" className={BTN_OUTLINE} onClick={() => datThuoc(thuoc.filter((_, i) => i !== index))}>
                Xóa
              </button>
            </div>
          ))}
          <button type="button" className={BTN_OUTLINE} onClick={() => { datThuoc([...thuoc, { ...TRONG_THUOC }]); if (!co) edit("thuoc_dang_dung", "NB có"); }}>
            + Thêm thuốc
          </button>
          {co && thuoc.length === 0 && <p className="text-xs text-xem">⚠ Đã chọn NB có thuốc đang dùng nhưng danh sách còn trống.</p>}
        </div>
      )}
      {HIEN_THONG_TIN_KHAI_THAC && (
        <LichSuThuoc
          onCopy={(row) => {
            datThuoc([...thuoc, { ten: row.ten_thuoc, ham_luong: row.lieu, cach_dung: row.duong_dung }]);
            if (!co) edit("thuoc_dang_dung", "NB có");
          }}
        />
      )}
    </div>
  );
}

function DanhGiaChung() {
  const { data, get, edit, append, notify } = useEform();
  const { ca, tuyChon } = data;
  const diUng = get("di_ung");
  const loaiDiUng = get("di_ung_loai");
  const dangChon = loaiDiUng.value ? loaiDiUng.value.split(",") : [];

  const toggleLoai = (loai: string) => {
    const next = dangChon.includes(loai) ? dangChon.filter((item) => item !== loai) : [...dangChon, loai];
    edit("di_ung_loai", next.join(","));
  };

  return (
    <Section title="1. Đánh giá chung">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DateField id="thoi_gian_kham" label="Thời gian khám" type="datetime-local" />
        <ReadonlyItem label="Bác sĩ khám" value={ca.bac_si_kham} />
        <ReadonlyItem label="Phòng khám" value={ca.phong_kham} />
        <RadioField id="noi_gioi_thieu" label="Nơi giới thiệu" options={["Cơ quan y tế", "Tự đến"]} />
      </div>

      <TextBox id="ly_do" label="Lý do đến khám" bcyt />

      <TextBox id="tien_su_ban_than" label="Tiền sử bản thân">
        {HIEN_THONG_TIN_KHAI_THAC && (
          <LichSuBlock targetId="tien_su_ban_than" targetLabel="Tiền sử bản thân" rows={ca.lich_su.tien_su_ban_than} />
        )}
      </TextBox>

      <TextBox id="tien_su_gia_dinh" label="Tiền sử gia đình">
        {HIEN_THONG_TIN_KHAI_THAC && (
          <LichSuBlock targetId="tien_su_gia_dinh" targetLabel="Tiền sử gia đình" rows={ca.lich_su.tien_su_gia_dinh} />
        )}
      </TextBox>

      <div className="space-y-2">
        <RadioField id="di_ung" label="Tiền sử dị ứng" options={["Có", "Không", "Không xác định"]} />
        {!diUng.value && <p className="text-xs text-xem">⚠ Chưa chọn tiền sử dị ứng.</p>}
        {diUng.value === "Có" && (
          <>
            <fieldset>
              <legend className="mb-1">
                <FieldLabel id="di_ung_loai" label="Loại dị ứng" nguon={loaiDiUng.nguon} />
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {tuyChon.loai_di_ung.map((loai) => (
                  <label key={loai} className={RADIO}>
                    <input type="checkbox" checked={dangChon.includes(loai)} onChange={() => toggleLoai(loai)} className="accent-ef-xanh" />
                    {loai}
                  </label>
                ))}
              </div>
            </fieldset>
            <TextBox id="di_ung_mo_ta" label="Mô tả dị ứng" rows={1} />
          </>
        )}
        {HIEN_THONG_TIN_KHAI_THAC && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ef-phu">Lịch sử dị ứng</span>
              {ca.lich_su.di_ung.length > 0 && <SourceBadge nguon="cu" />}
              <button type="button" className={BTN_OUTLINE} onClick={() => notify(MO_PHONG)}>
                Lấy LS dị ứng từ hệ thống khác
              </button>
            </div>
            {ca.lich_su.di_ung.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-ef-vien">
                <table className="w-full min-w-[36rem] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {["Ngày cập nhật", "Loại phiếu", "Loại dị ứng", "Thông tin", "Người cập nhật", ""].map((head) => (
                        <th key={head} className={TH}>
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ca.lich_su.di_ung.map((row) => (
                      <tr key={`${row.ngay}-${row.loai_phieu}`} className="[&:last-child>td]:border-b-0">
                        <td className={`${TD} whitespace-nowrap tabular-nums`}>{row.ngay}</td>
                        <td className={TD}>{row.loai_phieu}</td>
                        <td className={TD}>{row.loai}</td>
                        <td className={TD}>{row.thong_tin}</td>
                        <td className={TD}>{row.nguoi}</td>
                        <td className={`${TD} text-right`}>
                          <button type="button" className={BTN_OUTLINE} onClick={() => append("di_ung_mo_ta", row.thong_tin, "cu")}>
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <TextBox id="benh_su" label="Bệnh sử" rows={4} bcyt>
        {HIEN_THONG_TIN_KHAI_THAC && (
          <LichSuBlock targetId="benh_su" targetLabel="Bệnh sử" rows={ca.lich_su.benh_su} columnLabel="Bệnh sử" />
        )}
      </TextBox>

      <ThuocDangDung />

      <div className={NHOM}>
        <FieldLabel label="Khám lâm sàng" bcyt />
        <OKhamCoThuVien id="kham_toan_than" label="Khám toàn thân" vung="toan_than" />
        <TextBox id="kham_chuyen_khoa" label="Khám chuyên khoa" rows={3} actions={<ThuVienButton id="kham_chuyen_khoa" />} />
        <OKhamCoThuVien id="kham_tim_mach_ho_hap" label="Khám tim mạch, hô hấp" vung="tim_mach_ho_hap" />
        <TextBox id="kham_khac" label="Khám các bộ phận khác" actions={<ThuVienButton id="kham_khac" />} />
      </div>

      <IcdField id="icd_ban_dau" moTaId="mo_ta_ban_dau" label="Chẩn đoán ban đầu" />

      <div className={NHOM}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLabel label="Xét nghiệm, thăm dò" />
          <button type="button" className={BTN_OUTLINE} onClick={() => notify(MO_PHONG)}>
            Lấy kết quả mới nhất
          </button>
        </div>
        <KetQuaGroup title="Kết quả xét nghiệm" items={ca.xet_nghiem} />
        <KetQuaGroup
          title="Kết quả chẩn đoán hình ảnh"
          items={ca.chan_doan_hinh_anh}
          extra={
            <button type="button" className={BTN_OUTLINE} onClick={() => notify(MO_PHONG)}>
              Xem tất cả hình ảnh
            </button>
          }
        />
        <KetQuaGroup
          title="Kết quả cận lâm sàng"
          items={ca.can_lam_sang}
          extra={ca.dong_bo_cls ? <span className="text-xs text-ef-phu">Đồng bộ lần cuối lúc {ca.dong_bo_cls}</span> : undefined}
        />
        <TextBox id="ghi_chu_kq" label="Các xét nghiệm, thăm dò chính" bcyt />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ef-chu">Thông tin chẩn đoán xác định từ OH</span>
        {ca.chan_doan_oh && <span className="rounded-md bg-ef-nen px-2 py-1 text-[13px] text-ef-chu">{ca.chan_doan_oh}</span>}
        <button type="button" className={BTN_OUTLINE} onClick={() => notify(MO_PHONG)}>
          Lấy kết quả
        </button>
      </div>

      <IcdField id="icd_ra_vien" moTaId="mo_ta_ra_vien" label="Chẩn đoán ra viện" />
      <IcdMultiField
        id="icd_kem_theo"
        label="Chẩn đoán kèm theo"
        loaiTru={[get("icd_ban_dau").value, get("icd_ra_vien").value].filter(Boolean)}
      />
      <RadioField id="da_xu_ly" label="Đã xử lý (thuốc, chăm sóc)" options={CO_KHONG} />
    </Section>
  );
}

function DieuTri() {
  const { data, get } = useEform();
  return (
    <Section title="2. Điều trị">
      <TextBox id="huong_dieu_tri" label="Hướng điều trị" bcyt actions={<ThuVienButton id="huong_dieu_tri" />} />
      <TextBox id="loi_dan" label="Lời dặn & theo dõi" bcyt actions={<ThuVienButton id="loi_dan" />} />
      <div className="grid gap-4 md:grid-cols-2">
        <RadioField id="hen_tai_kham" label="Hẹn tái khám" options={CO_KHONG} />
        {get("hen_tai_kham").value === "Có" && (
          <div className="space-y-1">
            <DateField id="ngay_tai_kham" label="Ngày tái khám" type="date" />
            {!get("ngay_tai_kham").value && <p className="text-xs text-xem">⚠ Đã chọn hẹn tái khám nhưng chưa nhập ngày.</p>}
          </div>
        )}
      </div>
      <RadioField id="tinh_trang_ra_vien" label="Tình trạng ra viện" options={data.tuyChon.tinh_trang_ra_vien} />
    </Section>
  );
}

function ThongTinKhac({ noiSoiEnabled }: { noiSoiEnabled: boolean }) {
  const { data, get, edit, notify } = useEform();
  const uyQuyen = get("bs_uy_quyen");
  const noiSoi = get("chuyen_noi_soi");
  return (
    <Section title="3. Thông tin khác">
      <div className="grid gap-4 md:grid-cols-2">
        <ReadonlyItem label="Bác sĩ chính" value={data.ca.bac_si_chinh} />
        <div>
          <div className="mb-1 text-[13px] font-semibold text-ef-chu">Bác sĩ được ủy quyền</div>
          <div className="flex items-center justify-between gap-2 rounded-md bg-ef-nen px-3 py-1.5">
            <span className="text-sm text-ef-chu">{uyQuyen.value || "Chưa có"}</span>
            <button type="button" className={BTN_OUTLINE} onClick={() => notify(MO_PHONG)}>
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className={`${RADIO} w-fit`}>
          <input
            type="checkbox"
            disabled={!noiSoiEnabled}
            checked={noiSoi.value === "Có"}
            onChange={(e) => edit("chuyen_noi_soi", e.target.checked ? "Có" : "")}
            className="accent-ef-xanh"
          />
          Chuyển nội soi
        </label>
        {!noiSoiEnabled && <p className="mt-1 text-xs text-ef-phu">Chỉ hoạt động khi trạng thái là &quot;Chờ KQ CLS&quot;.</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RadioField id="xn_benh_tat" label="Xác nhận bệnh tật" options={CO_KHONG} />
        <RadioField id="xn_bhxh" label="Xác nhận nghỉ việc hưởng BHXH" options={CO_KHONG} />
      </div>
    </Section>
  );
}

export function EformForm({ noiSoiEnabled }: { noiSoiEnabled: boolean }) {
  return (
    <>
      <DanhGiaChung />
      <DieuTri />
      <ThongTinKhac noiSoiEnabled={noiSoiEnabled} />
    </>
  );
}
