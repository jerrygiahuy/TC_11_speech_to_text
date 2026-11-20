// Sinh dữ liệu giả Tim mạch từ bộ 60 ca (data/cardiology/synthetic-cases.jsonl), chạy xác định, không dùng mạng:
//   - ngữ cảnh lượt khám: data/eform/encounter-contexts.json (5 context: SYN-CARDIO-001, 013, 039, rồi 013 và 049 cho hai bệnh nhân của kịch bản demo) và data/eform/ca-gia.json (= ca đầu)
//   - dữ liệu phòng khám: data/clinic/{appointments,patients,directory-demo}.json và 4 phiếu cũ data/clinic/history/*.json
// Chạy: npm run tao-du-lieu-tim-mach (ghi đè đúng các file này); thêm `-- --check` để chỉ so với file trên đĩa (lệch thì thoát mã 1).
import fs from "node:fs";
import path from "node:path";
import { emptyDefinition, emptyEncounter, parseEncounter } from "@/shared/clinical/schema";
import type { Diagnosis, Encounter, ServiceGroup, ServiceOrder } from "@/shared/clinical/types";

const root = process.cwd();
const CO_SO = "OPD - Trung tâm Tim mạch";
const PHONG_KHAM = "PK Nội tim mạch";
const KHOA = "PK Tim mạch";
const DIEU_DUONG = "ĐD. X (user_dd01)";

interface Thuoc { name: string; strength: string; frequency: string }
interface Case {
  scenario_id: string;
  reference_note: {
    chief_complaint: string;
    history_present_illness: string | null;
    past_history: string | null;
    family_history: string | null;
    allergies: { status: string; items: string[] };
    current_medications: { status: string; items: Thuoc[] };
    vital_signs: { pulse_bpm?: number | null; sbp_mmhg?: number | null; dbp_mmhg?: number | null; temperature_c?: number | null; resp_rate?: number | null; spo2_pct?: number | null; weight_kg?: number | null; height_cm?: number | null } | null;
    exam: { general: string | null; cardio_respiratory: string | null };
    diagnoses: { initial: { code: string | null; display: string } | null };
    result_summaries: { lab: string | null; imaging: string | null; paraclinical: string | null };
    treatment: { plan: string | null; advice_followup: string | null };
  };
}

const cases = new Map<string, Case>();
for (const line of fs.readFileSync(path.join(root, "data", "cardiology", "synthetic-cases.jsonl"), "utf8").split("\n")) {
  if (line.trim()) { const item = JSON.parse(line) as Case; cases.set(item.scenario_id, item); }
}
function getCase(id: string): Case {
  const item = cases.get(id);
  if (!item) throw new Error(`Thiếu ca ${id} trong bộ 60 ca.`);
  return item;
}

// ---- Ngữ cảnh lượt khám ----
interface ContextSpec { caseId: string; appointment: string; patient: string; name: string; sex: string; ageMonths: number; ngay: string; xemLai: string; mucDau: string }
const CONTEXTS: ContextSpec[] = [
  { caseId: "SYN-CARDIO-001", appointment: "LK-GIA-0456", patient: "GIA-000123", name: "Nguyễn Thị Giả", sex: "Nữ", ageMonths: 576, ngay: "20/10/2026", xemLai: "09/11/2026 08:52", mucDau: "Không đau" },
  { caseId: "SYN-CARDIO-013", appointment: "000123", patient: "GIA-000456", name: "Trần Văn Mô Phỏng", sex: "Nam", ageMonths: 420, ngay: "05/10/2026", xemLai: "09/11/2026 08:40", mucDau: "3/10, vùng ngực khi gắng sức" },
  { caseId: "SYN-CARDIO-039", appointment: "LK-GIA-0457", patient: "GIA-000123", name: "Nguyễn Thị Giả", sex: "Nữ", ageMonths: 576, ngay: "02/10/2026", xemLai: "09/11/2026 08:55", mucDau: "Không đau" },
  // Kịch bản demo dùng "context mới nhất của bệnh nhân" (store.ts baseContextFor), nên bệnh nhân của mỗi kịch bản mang đúng context của hội thoại kịch bản đó:
  // ca-tu-che (hội thoại 013) chạy trên GIA-000789; ca-chua-dong-y (hội thoại 049) chạy trên GIA-000456. Hai context này đặt cuối danh sách.
  { caseId: "SYN-CARDIO-013", appointment: "LK-GIA-0458", patient: "GIA-000789", name: "Lê Văn Mới", sex: "Nam", ageMonths: 306, ngay: "09/11/2026", xemLai: "09/11/2026 08:58", mucDau: "3/10, vùng ngực khi gắng sức" },
  { caseId: "SYN-CARDIO-049", appointment: "LK-GIA-0461", patient: "GIA-000456", name: "Trần Văn Mô Phỏng", sex: "Nam", ageMonths: 420, ngay: "09/11/2026", xemLai: "09/11/2026 08:45", mucDau: "Không đau" },
];

function tenDichVu(loai: "lab" | "imaging" | "paraclinical", text: string): string {
  if (loai === "paraclinical") return "Điện tim thường";
  if (loai === "imaging") return "Siêu âm tim, màng tim qua thành ngực";
  if (text.includes("lipid")) return "Xét nghiệm bộ mỡ máu (Cholesterol, Triglycerid, HDL-C, LDL-C)";
  if (text.includes("Điện giải")) return "Điện giải đồ, Creatinin máu";
  if (text.includes("thận")) return "Creatinin máu";
  if (text.includes("tiền thủ thuật")) return "Xét nghiệm tiền thủ thuật";
  return "Xét nghiệm theo dõi";
}
const NHOM = { lab: "Xét nghiệm", imaging: "Chẩn đoán hình ảnh", paraclinical: "Thăm dò chức năng" } as const;

function ketQua(item: Case, loai: "lab" | "imaging" | "paraclinical", ngay: string) {
  const text = item.reference_note.result_summaries[loai];
  // "Chưa có kết quả ..." nghĩa là chưa có gì để hiện, không dựng dòng.
  if (!text || text.startsWith("Chưa có kết quả")) return [];
  return [{ ngay, muc: [{ nhom: NHOM[loai], ten: tenDichVu(loai, text), ket_qua: text, thoi_gian: `${ngay} 08:30`, nguoi_tra_ket_qua: "KTV. Y (dữ liệu giả)" }] }];
}

function bmi(weight: number | null, height: number | null): number | null {
  return weight && height ? Math.round((weight / (height / 100) ** 2) * 10) / 10 : null;
}

function buildCa(spec: ContextSpec) {
  const note = getCase(spec.caseId).reference_note;
  const item = getCase(spec.caseId);
  const vitals = note.vital_signs ?? {};
  const weight = vitals.weight_kg ?? null;
  const height = vitals.height_cm ?? null;
  const dong = (noi_dung: string) => ({ ngay: spec.ngay, bac_si: "BS. B", khoa: KHOA, noi_dung });
  const co = note.allergies.status === "PRESENT" ? note.allergies.items : [];
  const hasInfo = (text: string | null): text is string => !!text && !text.startsWith("Không rõ");
  return {
    _ghi_chu: `Ngữ cảnh giả sinh từ ${spec.caseId} bằng npm run tao-du-lieu-tim-mach.`,
    dang_nhap: "user_bs01",
    co_so: CO_SO,
    pid: spec.patient,
    ma_luot_kham: spec.appointment,
    ho_ten: spec.name,
    gioi_tinh: spec.sex,
    canh_bao_di_ung: co.join(", "),
    chinh_sua_cuoi: { nguoi: "user_dd01", luc: spec.xemLai },
    danh_gia_ban_dau: [
      { nhan: "Điều dưỡng đánh giá", gia_tri: DIEU_DUONG },
      { nhan: "Mức độ đau", gia_tri: spec.mucDau },
      { nhan: "Nguy cơ ngã", gia_tri: "Thấp" },
      { nhan: "Tình trạng dinh dưỡng", gia_tri: "Bình thường" },
    ],
    sinh_hieu: {
      mach: vitals.pulse_bpm ?? null,
      nhiet_do: vitals.temperature_c ?? null,
      ha_tam_thu: vitals.sbp_mmhg ?? null,
      ha_tam_truong: vitals.dbp_mmhg ?? null,
      spo2: vitals.spo2_pct ?? null,
      nhip_tho: vitals.resp_rate ?? null,
      chieu_cao: height,
      can_nang: weight,
      bmi: bmi(weight, height),
    },
    bac_si_kham: "BS. A",
    phong_kham: PHONG_KHAM,
    bac_si_chinh: "BS. A",
    trang_thai: "Đang khám",
    lich_su: {
      tien_su_ban_than: hasInfo(note.past_history) ? [dong(note.past_history)] : [],
      tien_su_gia_dinh: hasInfo(note.family_history) ? [dong(note.family_history)] : [],
      benh_su: [],
      di_ung: co.map(thong_tin => ({ ngay: spec.ngay, loai_phieu: "Phiếu Đánh giá ban đầu ngoại trú", loai: "Thuốc", thong_tin, nguoi: DIEU_DUONG })),
      thuoc: (note.current_medications.status === "PRESENT" ? note.current_medications.items : []).map(thuoc => ({ ten_thuoc: thuoc.name, lieu: `${thuoc.strength}, ${thuoc.frequency}`, duong_dung: "Uống", ngay: spec.ngay })),
    },
    chan_doan_oh: "",
    xet_nghiem: ketQua(item, "lab", spec.ngay),
    chan_doan_hinh_anh: ketQua(item, "imaging", spec.ngay),
    can_lam_sang: ketQua(item, "paraclinical", spec.ngay),
    dong_bo_cls: spec.xemLai,
    gia_tri: { thoi_gian_kham: "2026-11-09T09:15" },
  };
}

const contexts = CONTEXTS.map(spec => ({
  appointment_id: spec.appointment, patient_id: spec.patient, facility_id: "facility-prototype", doctor_id: "user_bs01", age_months: spec.ageMonths, ca: buildCa(spec),
}));

// ---- Phiếu cũ (data/clinic/history), từ 4 ca FOLLOW_UP ----
interface HistorySpec {
  id: string; caseId: string; patient: string; doctor: string; at: string; appointment: string | null; status: Encounter["status"]; summary: string | null; service: string | null;
}
const HISTORY: HistorySpec[] = [
  { id: "7a1c0001-0000-4000-8000-000000000001", caseId: "SYN-CARDIO-001", patient: "GIA-000123", doctor: "user_bs02", at: "2026-10-20T09:00:00+07:00", appointment: null, status: "hoan_thanh_kham", summary: "Tăng huyết áp, tiếp tục thuốc và theo dõi huyết áp tại nhà (dữ liệu giả)", service: "Điện tim thường" },
  { id: "7a1c0001-0000-4000-8000-000000000002", caseId: "SYN-CARDIO-037", patient: "GIA-000123", doctor: "user_bs01", at: "2026-09-05T14:30:00+07:00", appointment: null, status: "hoan_thanh_kham", summary: null, service: null },
  { id: "7a1c0001-0000-4000-8000-000000000003", caseId: "SYN-CARDIO-031", patient: "GIA-000456", doctor: "user_bs01", at: "2026-11-15T09:00:00+07:00", appointment: "LK-GIA-0450", status: "hoan_thanh_kham", summary: "Sau can thiệp mạch vành, hẹn tái khám (dữ liệu giả)", service: "Siêu âm tim, màng tim qua thành ngực" },
  { id: "7a1c0001-0000-4000-8000-000000000004", caseId: "SYN-CARDIO-025", patient: "GIA-000456", doctor: "user_bs01", at: "2026-11-15T16:00:00+07:00", appointment: "LK-GIA-0451", status: "cho_kq_cls", summary: "Chờ kết quả xét nghiệm mỡ máu (dữ liệu giả)", service: "Xét nghiệm bộ mỡ máu (Cholesterol, Triglycerid, HDL-C, LDL-C)" },
];

function buildHistory(spec: HistorySpec): Encounter {
  const note = getCase(spec.caseId).reference_note;
  const record = emptyEncounter({ id: spec.id, patientId: spec.patient, doctorId: spec.doctor, now: spec.at });
  record.appointment_id = spec.appointment;
  record.status = spec.status;
  record.tom_tat = spec.summary;
  const form = record.phieu_kham;
  form.ly_do_kham = note.chief_complaint;
  form.benh_su = note.history_present_illness;
  form.tien_su_ban_than = note.past_history;
  form.kham_toan_than = note.exam.general;
  form.kham_tim_mach_ho_hap = note.exam.cardio_respiratory;
  form.huong_dieu_tri = note.treatment.plan;
  form.loi_dan = note.treatment.advice_followup;
  const initial = note.diagnoses.initial;
  if (initial) {
    const dx = emptyDefinition<Diagnosis>("diagnosis");
    Object.assign(dx, { id: `${spec.id.slice(0, -2)}d1` });
    Object.assign(dx.noi_dung, { giai_doan: "ra_vien", mo_ta: initial.display, muc_do_khang_dinh: "xac_dinh", vai_tro: "chinh" });
    if (initial.code) Object.assign(dx.icd, { code_system: "ICD-10", code: initial.code, display: initial.display, trang_thai: "bac_si_chon" });
    record.chan_doan.push(dx);
  }
  if (spec.service) {
    const order = emptyDefinition<ServiceOrder>("serviceOrder");
    const group = emptyDefinition<ServiceGroup>("serviceGroup");
    Object.assign(group, { id: `${spec.id.slice(0, -2)}g1`, chan_doan_lich_su_lam_sang: note.chief_complaint });
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

// ---- Lịch hẹn, bệnh nhân, danh bạ ----
const FACILITY = "facility-prototype";
function lich(id: string, patient: string, doctor: string, start: string, end: string | null, content: string, status: "scheduled" | "cancelled" = "scheduled") {
  return { id, facility_id: FACILITY, patient_id: patient, doctor_id: doctor, starts_at: start, ends_at: end, content: `${content} (dữ liệu giả)`, scheduling_status: status };
}
// Một lịch cho mỗi lý do khám trong bộ 60 ca; giữ các lịch đặc thù test dùng: hủy hẹn, bác sĩ khác, ngày mai, mã lượt toàn chữ số.
const APPOINTMENTS = [
  lich("LK-GIA-0450", "GIA-000456", "user_bs01", "2026-11-15T09:00:00+07:00", "2026-11-15T09:30:00+07:00", "Tái khám sau can thiệp mạch vành, đã hoàn thành"),
  lich("LK-GIA-0451", "GIA-000456", "user_bs01", "2026-11-15T16:00:00+07:00", null, "Ca hôm qua tái khám rối loạn lipid máu, còn chờ kết quả xét nghiệm"),
  lich("LK-GIA-0456", "GIA-000123", "user_bs01", "2026-11-16T08:00:00+07:00", "2026-11-16T08:30:00+07:00", "Tái khám tăng huyết áp theo hẹn"),
  lich("LK-GIA-0457", "GIA-000123", "user_bs01", "2026-11-16T09:30:00+07:00", null, "Lượt thứ hai cùng bệnh nhân, tái khám suy tim"),
  lich("000123", "GIA-000456", "user_bs01", "2026-11-16T10:00:00+07:00", null, "Khó chịu vùng ngực khi gắng sức, mã lượt chỉ gồm chữ số"),
  lich("LK-GIA-0458", "GIA-000789", "user_bs01", "2026-11-16T14:00:00+07:00", null, "Bệnh nhân mới, khó chịu vùng ngực khi gắng sức, khám lần đầu"),
  lich("LK-GIA-0459", "GIA-000456", "user_bs01", "2026-11-16T15:00:00+07:00", null, "Khó thở khi gắng sức, bệnh nhân hủy hẹn", "cancelled"),
  lich("LK-GIA-0460", "GIA-000123", "user_bs02", "2026-11-16T16:00:00+07:00", null, "Tái khám rối loạn nhịp, lịch của bác sĩ khác cùng cơ sở"),
  lich("LK-GIA-0461", "GIA-000456", "user_bs01", "2026-11-17T09:00:00+07:00", null, "Một lần ngất thoáng qua, lịch ngày mai"),
  lich("LK-GIA-0462", "GIA-000789", "user_bs01", "2026-11-17T10:30:00+07:00", null, "Đánh giá tim mạch trước thủ thuật"),
];

const trong = { known: false, enrolled: null, provider: null, plan: null, member_code: null, valid_from: null, valid_to: null };
const khongCo = { known: true, enrolled: false, provider: null, plan: null, member_code: null, valid_from: null, valid_to: null };
const PATIENTS = [
  { id: "GIA-000123", facility_id: FACILITY, full_name: "Nguyễn Thị Giả", date_of_birth: "1978-03-10", gender: "nữ",
    insurance: { bhyt: { known: true, enrolled: true, provider: "BHYT Mẫu", plan: "Mức 80%", member_code: "MAU-0123", valid_from: "2026-01-01", valid_to: "2026-12-31" }, bao_lanh: khongCo },
    dong_y_xu_ly_ai: { trang_thai: true, luc: "2026-11-01T09:00:00+07:00" }, nguoi_nha: [{ ho_ten: "Trần Văn Phụ", quan_he: "chồng", dien_thoai: "0900000321" }],
    noi_lam_viec: "Công ty TNHH Mô Phỏng", dia_chi: "số 12 đường Mẫu, phường Giả, quận Thử", dien_thoai: "0900000123" },
  { id: "GIA-000456", facility_id: FACILITY, full_name: "Trần Văn Mô Phỏng", date_of_birth: "1991-07-22", gender: "nam",
    insurance: { bhyt: khongCo, bao_lanh: { known: true, enrolled: true, provider: "Bảo lãnh Mẫu", plan: "Gói cơ bản", member_code: "BL-0456", valid_from: "2026-06-01", valid_to: "2026-10-31" } },
    dong_y_xu_ly_ai: { trang_thai: false, luc: "2026-11-01T09:05:00+07:00" }, nguoi_nha: [{ ho_ten: "Phạm Thị Thử", quan_he: "vợ", dien_thoai: "0900000654" }],
    noi_lam_viec: "Xưởng Giả Lập", dia_chi: "số 34 ngõ Thử, phường Mô, quận Phỏng", dien_thoai: "0900000456" },
  { id: "GIA-000789", facility_id: FACILITY, full_name: "Lê Văn Mới", date_of_birth: "2001-05-02", gender: "nam",
    insurance: { bhyt: trong, bao_lanh: trong },
    dong_y_xu_ly_ai: { trang_thai: true, luc: "2026-11-02T10:00:00+07:00" }, nguoi_nha: [{ ho_ten: "Hoàng Thị Mẫu", quan_he: "mẹ", dien_thoai: "0900000987" }],
    noi_lam_viec: "Trường Mẫu Giả", dia_chi: "số 56 phố Giả, phường Thử, quận Mẫu", dien_thoai: "0900000789" },
];
const DIRECTORY = {
  facilities: [{ id: FACILITY, name: "Cơ sở mô phỏng / Khu khám Tim mạch (dữ liệu giả)" }],
  doctors: [{ id: "user_bs01", name: "BS. A" }, { id: "user_bs02", name: "BS. B" }],
};

// ---- Ghi / kiểm ----
const outputs = new Map<string, string>();
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
outputs.set("data/eform/encounter-contexts.json", json({ version: 1, synthetic: true, contexts }));
outputs.set("data/eform/ca-gia.json", json(contexts[0].ca));
outputs.set("data/clinic/appointments.json", json(APPOINTMENTS));
outputs.set("data/clinic/patients.json", json(PATIENTS));
outputs.set("data/clinic/directory-demo.json", json(DIRECTORY));
for (const spec of HISTORY) outputs.set(`data/clinic/history/${spec.id}.json`, json(buildHistory(spec)));

const check = process.argv.includes("--check");
const stale: string[] = [];
for (const [rel, text] of outputs) {
  const file = path.join(root, rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (check) { if (current !== text) stale.push(rel); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}
if (check) {
  if (stale.length) { console.error(`Dữ liệu Tim mạch đã lệch so với bộ 60 ca, chạy lại npm run tao-du-lieu-tim-mach:\n- ${stale.join("\n- ")}`); process.exit(1); }
  console.log(`Khớp: ${outputs.size} file.`);
} else {
  console.log(`Đã ghi ${outputs.size} file (${contexts.length} ngữ cảnh, ${APPOINTMENTS.length} lịch hẹn, ${HISTORY.length} phiếu cũ).`);
}
