"use client";

import { useEffect, useRef } from "react";
import { useEform } from "@/client/eform/EformContext";
import { BTN_OUTLINE, SourceBadge } from "@/client/eform/fields";
import { ngayGio } from "@/client/eform/BanIn";
import { nhanIcd } from "@/client/eform/IcdField";
import { dongChanDoanIn } from "@/shared/eform/chan-doan-in";
import { demChoTrong } from "@/shared/eform/mau-cau";

/** Các trường "hiển thị trên BCYT", theo thứ tự xuất hiện trên form */
const TRUONG_BCYT = [
  { id: "ly_do", label: "Lý do đến khám" },
  { id: "benh_su", label: "Bệnh sử" },
  { id: "kham_toan_than", label: "Khám toàn thân" },
  { id: "kham_chuyen_khoa", label: "Khám chuyên khoa" },
  { id: "kham_tim_mach_ho_hap", label: "Khám tim mạch, hô hấp" },
  { id: "kham_khac", label: "Khám các bộ phận khác" },
  { id: "ghi_chu_kq", label: "Xét nghiệm, thăm dò chính" },
  { id: "huong_dieu_tri", label: "Hướng điều trị" },
  { id: "loi_dan", label: "Lời dặn & theo dõi" },
];

/** Xem trước báo cáo y tế: ghép thẳng các trường có nhãn BCYT, giữ nhãn nguồn để thấy phần AI thêm */
export function BaoCaoDialog({ onClose }: { onClose: () => void }) {
  const { data, get } = useEform();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const kemTheo = get("icd_kem_theo");
  const chanDoanIn = dongChanDoanIn(get, (ma) => nhanIcd(ma, data.icd10));
  const { ca } = data;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label="Xem trước báo cáo y tế"
      className="m-auto w-full max-w-2xl rounded-xl p-6 text-ef-chu shadow-xl backdrop:bg-ef-dam/40"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ef-dam">Báo cáo y tế – xem trước</h2>
        <button type="button" className={BTN_OUTLINE} onClick={() => ref.current?.close()}>
          Đóng
        </button>
      </div>
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-md bg-ef-nen px-3 py-2 text-[13px]">
          {[
            ["Họ tên", ca.ho_ten],
            ["Giới tính", ca.gioi_tinh],
            ["PID", ca.pid],
            ["Thời gian khám", ngayGio(get("thoi_gian_kham").value)],
            ["Bác sĩ khám", ca.bac_si_kham],
            ["Dị ứng", ca.canh_bao_di_ung || "Không"],
          ].map(([nhan, giaTri]) => (
            <div key={nhan} className="flex gap-1">
              <dt className="text-ef-phu">{nhan}:</dt>
              <dd>{giaTri}</dd>
            </div>
          ))}
        </dl>
        {TRUONG_BCYT.map(({ id, label }) => {
          const field = get(id);
          return (
            <div key={id}>
              <div className="flex items-center gap-1.5 font-medium text-ef-chu">
                {label} <SourceBadge nguon={field.nguon} />
              </div>
              <p className="whitespace-pre-wrap">{field.value || <span className="text-ef-phu">(trống)</span>}</p>
              {demChoTrong(field.value) > 0 && (
                <p className="text-xs text-xem">⚠ Còn {demChoTrong(field.value)} chỗ [ ] chưa chọn, sẽ đi thẳng vào báo cáo nếu không sửa.</p>
              )}
            </div>
          );
        })}
        {chanDoanIn.length > 0 ? (
          chanDoanIn.map((dong) => (
            <div key={dong.nhan}>
              <div className="flex items-center gap-1.5 font-medium text-ef-chu">
                {dong.nhan} <SourceBadge nguon={get(dong.nhan === "Chẩn đoán ra viện" ? "icd_ra_vien" : "icd_ban_dau").nguon} />
              </div>
              <p className="whitespace-pre-wrap">{dong.noiDung}</p>
            </div>
          ))
        ) : (
          <div>
            <div className="font-medium text-ef-chu">Chẩn đoán ban đầu</div>
            <p className="text-ef-phu">(trống)</p>
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5 font-medium text-ef-chu">
            Chẩn đoán kèm theo <SourceBadge nguon={kemTheo.nguon} />
          </div>
          {kemTheo.value ? <p>{nhanIcd(kemTheo.value, data.icd10)}</p> : <p className="text-ef-phu">(trống)</p>}
        </div>
      </div>
    </dialog>
  );
}
