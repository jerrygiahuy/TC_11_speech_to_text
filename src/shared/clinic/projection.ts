// Chiếu một phiếu khám đã lưu sang dạng chỉ đọc để xem lại. Hàm thuần: không I/O, không mutate input.
// Chỉ lấy nội dung lâm sàng đã lưu; không có transcript, lần chạy AI hay nguồn dữ liệu. Không bịa dữ liệu thiếu.
import { approvalState, requiredApprovalScopes } from "../clinical/approvals";
import type { Encounter, Quantity } from "../clinical/types";
import { formatClinicDate } from "./format";
import { displayStatus } from "./schedule";
import type { HistoricalEncounterViewModel, PatientProfile } from "./types";

type Row = { label: string; value: string };

const ALLERGY_STATE = { co: "Có", khong: "Không", khong_xac_dinh: "Không xác định", chua_de_cap: "" } as const;
const STAGE = { ban_dau: "Ban đầu", ra_vien: "Ra viện", chua_ro: "Chưa rõ giai đoạn" } as const;
const ROLE = { chinh: "Chính", kem_theo: "Kèm theo", chua_ro: "Chưa rõ vai trò" } as const;
const CERTAINTY = { xac_dinh: "Xác định", nghi_ngo: "Nghi ngờ", loai_tru: "Loại trừ", phu_dinh: "Phủ định", chua_ro: "Chưa rõ" } as const;
const SIDE = { phai: "Phải", trai: "Trái", hai_ben: "Hai bên", khong_ap_dung: "" } as const;
const ORDER_STATE = { nhap: "Nháp", da_xac_nhan: "Đã xác nhận", dang_thuc_hien: "Đang thực hiện", hoan_thanh: "Hoàn thành", da_huy: "Đã hủy" } as const;
const OUTCOME = { khoi: "Khỏi", do_giam: "Đỡ, giảm", chua_thay_doi: "Chưa thay đổi", nang_hon: "Nặng hơn", khac: "Khác" } as const;
const VITALS: Array<[keyof Encounter["sinh_hieu"], string]> = [
  ["mach", "Mạch"], ["nhiet_do", "Nhiệt độ"], ["ha_tam_thu", "Huyết áp tâm thu"], ["ha_tam_truong", "Huyết áp tâm trương"],
  ["spo2", "SpO2"], ["nhip_tho", "Nhịp thở"], ["chieu_cao", "Chiều cao"], ["can_nang", "Cân nặng"], ["bmi", "BMI"],
];

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function quantity(q: Quantity | undefined): string {
  if (!q || q.value === null || q.value === undefined) return "";
  return q.unit ? `${q.value} ${q.unit}` : String(q.value);
}

function rows(entries: Array<[string, string | null | undefined]>): Row[] {
  return entries.filter(([, v]) => text(v) !== "").map(([label, v]) => ({ label, value: text(v) }));
}

function dayOf(iso: string | null | undefined): string {
  return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? formatClinicDate(iso.slice(0, 10)) : "";
}

export interface ProjectionContext {
  patient: PatientProfile;
  doctor_name: string;
  facility_name: string;
}

export function projectHistoricalEncounter(record: Encounter, ctx: ProjectionContext): HistoricalEncounterViewModel {
  const note = record.phieu_kham;
  const allergyState = ALLERGY_STATE[note.di_ung.trang_thai];
  const allergy = [allergyState, note.di_ung.loai.join(", "), text(note.di_ung.mo_ta)].filter((v) => v !== "").join(" · ");
  const medications = note.thuoc_dang_dung
    .map((m) => [text(m.ten), text(m.ham_luong), text(m.cach_dung)].filter((v) => v !== "").join(" "))
    .filter((v) => v !== "")
    .join("; ");
  const followUp = note.hen_tai_kham;

  const diagnoses: Row[] = record.chan_doan
    .filter((d) => text(d.noi_dung.mo_ta) !== "" || text(d.icd.code) !== "")
    .map((d) => ({
      label: [STAGE[d.noi_dung.giai_doan], ROLE[d.noi_dung.vai_tro]].join(" · "),
      value: [
        text(d.icd.code),
        text(d.noi_dung.mo_ta) || text(d.icd.display),
        d.noi_dung.muc_do_khang_dinh ? `(${CERTAINTY[d.noi_dung.muc_do_khang_dinh]})` : "",
      ].filter((v) => v !== "").join(" "),
    }));

  const results: Row[] = record.ket_qua
    .filter((r) => text(r.ten) !== "" && text(r.ket_qua_text) !== "")
    .map((r) => ({ label: [text(r.ten), dayOf(r.ngay)].filter((v) => v !== "").join(" · "), value: text(r.ket_qua_text) }));

  const orders: Row[] = record.chi_dinh.items.map((o) => ({
    label: text(o.danh_muc.display) || text(o.noi_dung.ten_dich_vu) || "Dịch vụ chưa có tên",
    value: [
      o.noi_dung.so_luong === null ? "" : `SL ${o.noi_dung.so_luong}`,
      text(o.noi_dung.vi_tri),
      o.noi_dung.ben ? SIDE[o.noi_dung.ben] : "",
      ORDER_STATE[o.trang_thai],
      text(o.noi_dung.ghi_chu),
    ].filter((v) => v !== "").join(" · "),
  }));

  const drafts: Array<{ id: string; title: string; rows: Row[] }> = [
    { id: "ly-do", title: "Lý do khám và bệnh sử", rows: rows([["Lý do khám", note.ly_do_kham], ["Bệnh sử", note.benh_su]]) },
    {
      id: "tien-su",
      title: "Tiền sử, dị ứng và thuốc đang dùng",
      rows: rows([
        ["Tiền sử bản thân", note.tien_su_ban_than],
        ["Tiền sử gia đình", note.tien_su_gia_dinh],
        ["Dị ứng", allergy],
        ["Thuốc đang dùng", medications || (note.co_thuoc_dang_dung === false ? "Không có" : "")],
      ]),
    },
    { id: "sinh-hieu", title: "Sinh hiệu", rows: rows(VITALS.map(([key, label]) => [label, quantity(record.sinh_hieu[key] as Quantity)])) },
    {
      id: "kham",
      title: "Khám",
      rows: rows([["Khám toàn thân", note.kham_toan_than], ["Khám chuyên khoa", note.kham_chuyen_khoa], ["Khám tim mạch, hô hấp", note.kham_tim_mach_ho_hap], ["Khám khác", note.kham_khac]]),
    },
    { id: "chan-doan", title: "Chẩn đoán", rows: diagnoses },
    { id: "ket-qua", title: "Kết quả cận lâm sàng", rows: [...results, ...rows([["Các xét nghiệm, thăm dò chính", note.ghi_chu_ket_qua]])] },
    { id: "chi-dinh", title: "Chỉ định", rows: orders },
    {
      id: "ket-luan",
      title: "Kết luận và hướng điều trị",
      rows: rows([
        ["Hướng điều trị", note.huong_dieu_tri],
        ["Lời dặn", note.loi_dan],
        ["Tình trạng ra viện", note.tinh_trang_ra_vien ? OUTCOME[note.tinh_trang_ra_vien] : ""],
        ["Hẹn tái khám", followUp.co_hen === null ? "" : followUp.co_hen ? [text(followUp.nguyen_van), dayOf(followUp.ngay_cu_the)].filter((v) => v !== "").join(" · ") || "Có" : "Không"],
        ["Tóm tắt", record.tom_tat],
      ]),
    },
  ];

  const scopes = requiredApprovalScopes(record);
  const states = scopes.map((scope) => approvalState(record, scope));
  const approval: HistoricalEncounterViewModel["approval"] = states.every((s) => s === "current")
    ? { state: "approved", label: "Đã duyệt" }
    : states.some((s) => s === "changed")
      ? { state: "changed", label: "Sửa sau khi duyệt" }
      : { state: "draft", label: "Bản nháp" };

  return {
    id: record.id,
    appointment_id: record.appointment_id ?? null,
    revision: record.revision,
    encounter_at: record.encounter_at,
    status: displayStatus("scheduled", record.status),
    patient: ctx.patient,
    identity_source: "current_profile",
    doctor_name: ctx.doctor_name,
    facility_name: ctx.facility_name,
    sections: drafts.filter((s) => s.rows.length > 0),
    approval,
    missingSections: drafts.filter((s) => s.rows.length === 0).map((s) => s.title),
  };
}
