// Tạo dữ liệu giả cho dashboard/bệnh nhân: các phiếu khám cũ (data/clinic/history) và ngữ cảnh khám cho
// bệnh nhân mới (data/eform/encounter-contexts.json). Chạy: npm run tao-lich-su-clinic. Chạy lại là ghi đè đúng các file này.
import fs from "node:fs";
import path from "node:path";
import { emptyDefinition, emptyEncounter, parseEncounter } from "@/shared/clinical/schema";
import type { Diagnosis, Encounter, ServiceGroup, ServiceOrder } from "@/shared/clinical/types";

const root = process.cwd();
const dir = path.join(root, "data", "clinic", "history");
fs.mkdirSync(dir, { recursive: true });

interface Spec {
  id: string;
  patient: string;
  doctor: string;
  at: string;
  appointment: string | null;
  status: Encounter["status"];
  summary: string | null;
  reason: string;
  history: string;
  exam: string;
  dx: { icd: string; text: string } | null;
  service: string | null;
  advice: string | null;
}

const SPECS: Spec[] = [
  { id: "7a1c0001-0000-4000-8000-000000000001", patient: "GIA-000123", doctor: "user_bs02", at: "2026-10-20T09:00:00+07:00", appointment: null, status: "hoan_thanh_kham",
    summary: "Viêm mũi dị ứng, đã dặn dùng thuốc xịt mũi (dữ liệu giả)", reason: "Ngạt mũi, hắt hơi buổi sáng", history: "Ngạt mũi từng đợt 2 tuần, hắt hơi nhiều, không sốt.",
    exam: "Niêm mạc mũi nhợt, cuốn mũi dưới phù nề hai bên.", dx: { icd: "J30.4", text: "Viêm mũi dị ứng" }, service: "Nội soi mũi", advice: "Xịt mũi theo chỉ định, tránh khói bụi, tái khám sau 4 tuần." },
  { id: "7a1c0001-0000-4000-8000-000000000002", patient: "GIA-000123", doctor: "user_bs01", at: "2026-09-05T14:30:00+07:00", appointment: null, status: "hoan_thanh_kham",
    summary: null, reason: "Đau tai phải", history: "Đau tai phải 3 ngày, nghe kém nhẹ.",
    exam: "Màng nhĩ phải đục, giảm di động.", dx: { icd: "H66.9", text: "Viêm tai giữa phải" }, service: null, advice: "Uống thuốc đủ liều, giữ tai khô." },
  { id: "7a1c0001-0000-4000-8000-000000000003", patient: "GIA-000456", doctor: "user_bs01", at: "2026-11-15T09:00:00+07:00", appointment: "LK-GIA-0450", status: "hoan_thanh_kham",
    summary: "Viêm họng cấp, hẹn tái khám (dữ liệu giả)", reason: "Đau họng, ho", history: "Đau họng 2 ngày, ho khan, sốt nhẹ.",
    exam: "Họng đỏ, amidan quá phát độ II, không mủ.", dx: { icd: "J02.9", text: "Viêm họng cấp" }, service: null, advice: "Súc họng nước muối, uống nhiều nước." },
  { id: "7a1c0001-0000-4000-8000-000000000004", patient: "GIA-000456", doctor: "user_bs01", at: "2026-11-15T16:00:00+07:00", appointment: "LK-GIA-0451", status: "cho_kq_cls",
    summary: "Chờ kết quả cận lâm sàng (dữ liệu giả)", reason: "Chóng mặt tái phát", history: "Chóng mặt từng cơn, kéo dài vài phút.",
    exam: "Nystagmus (-), Romberg (-).", dx: null, service: "Đo thính lực đồ", advice: null },
];

function build(spec: Spec): Encounter {
  const record = emptyEncounter({ id: spec.id, patientId: spec.patient, doctorId: spec.doctor, now: spec.at });
  record.appointment_id = spec.appointment;
  record.status = spec.status;
  record.tom_tat = spec.summary;
  record.phieu_kham.ly_do_kham = spec.reason;
  record.phieu_kham.benh_su = spec.history;
  record.phieu_kham.kham_toan_than = "Tỉnh, tiếp xúc tốt.";
  record.phieu_kham.kham_chuyen_khoa.mo_ta = spec.exam;
  record.phieu_kham.huong_dieu_tri = spec.advice;
  if (spec.dx) {
    const dx = emptyDefinition<Diagnosis>("diagnosis");
    Object.assign(dx, { id: `${spec.id.slice(0, -2)}d1` });
    Object.assign(dx.noi_dung, { giai_doan: "ra_vien", mo_ta: spec.dx.text, muc_do_khang_dinh: "xac_dinh", vai_tro: "chinh" });
    Object.assign(dx.icd, { code_system: "ICD-10", code: spec.dx.icd, display: spec.dx.text, trang_thai: "bac_si_chon" });
    record.chan_doan.push(dx);
  }
  if (spec.service) {
    const order = emptyDefinition<ServiceOrder>("serviceOrder");
    const group = emptyDefinition<ServiceGroup>("serviceGroup");
    Object.assign(group, { id: `${spec.id.slice(0, -2)}g1`, chan_doan_lich_su_lam_sang: spec.reason });
    record.chi_dinh.groups.push(group);
    Object.assign(order, { id: `${spec.id.slice(0, -2)}s1`, trang_thai: "da_xac_nhan", group_id: group.id });
    Object.assign(order.noi_dung, { ten_dich_vu: spec.service, so_luong: 1, hanh_dong: "de_nghi_moi" });
    Object.assign(order.danh_muc, { display: spec.service, trang_thai: "bac_si_chon" });
    record.chi_dinh.items.push(order);
    record.chi_dinh.de_cap = "co_chi_dinh";
  } else {
    record.chi_dinh.de_cap = "khong_chi_dinh";
  }
  return parseEncounter(record);
}

for (const spec of SPECS) {
  fs.writeFileSync(path.join(dir, `${spec.id}.json`), JSON.stringify(build(spec), null, 2) + "\n", "utf8");
}
console.log(`Đã ghi ${SPECS.length} phiếu cũ giả vào ${path.relative(root, dir)}`);

// Ngữ cảnh khám cho bệnh nhân mới: nhân bản ngữ cảnh đầu, bỏ toàn bộ lịch sử/kết quả cũ.
const file = path.join(root, "data", "eform", "encounter-contexts.json");
const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
const NEW = "LK-GIA-0458";
fixture.contexts = fixture.contexts.filter((c: { appointment_id: string }) => c.appointment_id !== NEW);
const template = structuredClone(fixture.contexts[0]);
const ca = template.ca;
Object.assign(ca, { pid: "GIA-000789", ma_luot_kham: NEW, ho_ten: "Lê Văn Mới", gioi_tinh: "Nam", canh_bao_di_ung: "" });
ca.lich_su = { tien_su_ban_than: [], tien_su_gia_dinh: [], benh_su: [], di_ung: [] };
ca.xet_nghiem = []; ca.chan_doan_hinh_anh = []; ca.can_lam_sang = [];
ca.danh_gia_ban_dau = [{ nhan: "Điều dưỡng đánh giá", gia_tri: "ĐD. X (user_dd01)" }];
Object.assign(template, { appointment_id: NEW, patient_id: "GIA-000789", age_months: 300 });
fixture.contexts.push(template);
fs.writeFileSync(file, JSON.stringify(fixture, null, 2) + "\n", "utf8");
console.log(`Đã thêm ngữ cảnh ${NEW} (bệnh nhân mới, chưa có lịch sử)`);
