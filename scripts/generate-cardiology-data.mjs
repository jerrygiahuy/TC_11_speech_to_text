import fs from "node:fs";
import path from "node:path";

const outputDir = path.join(process.cwd(), "data", "cardiology");
const checkOnly = process.argv.includes("--check");

const profiles = [
  {
    key: "hypertension", visitType: "FOLLOW_UP", complaint: "tái khám tăng huyết áp",
    hpi: "Theo dõi huyết áp tại nhà, thỉnh thoảng đau đầu nhẹ, không đau ngực, không khó thở",
    past: "Tăng huyết áp đã được theo dõi", family: "Gia đình có người tăng huyết áp",
    meds: [{ name: "Amlodipine", strength: "5 mg", frequency: "mỗi ngày một lần" }],
    vitals: [72, 148, 88, 36.7, 18, 98, 68, 165],
    cardio: "Mạch quay đều, rõ. Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran",
    diagnosis: ["I10", "Tăng huyết áp vô căn"], secondary: [],
    results: ["Chức năng thận trong giới hạn được ghi nhận", null, "Điện tâm đồ nhịp xoang"],
    plan: "Tiếp tục theo dõi huyết áp và dùng thuốc theo đơn hiện tại", advice: "Ghi nhật ký huyết áp, tái khám sau 30 ngày", followup: 30
  },
  {
    key: "palpitation", visitType: "NEW", complaint: "đánh trống ngực từng cơn",
    hpi: "Đánh trống ngực vài phút, tự hết, không ngất, không đau ngực",
    past: "Chưa ghi nhận bệnh tim mạch", family: "Chưa ghi nhận tiền sử gia đình liên quan",
    meds: [], vitals: [92, 126, 78, 36.6, 18, 99, 55, 160],
    cardio: "Mạch quay đều. Tiếng T1, T2 rõ, chưa ghi nhận âm thổi. Phổi trong, không ran",
    diagnosis: ["R00.2", "Đánh trống ngực"], secondary: [],
    results: [null, null, "Điện tâm đồ tại thời điểm khám chưa ghi nhận rối loạn nhịp"],
    plan: "Theo dõi triệu chứng và thực hiện thăm dò nhịp tim theo chỉ định", advice: "Quay lại sớm nếu cơn kéo dài hoặc có ngất", followup: 14
  },
  {
    key: "chest_discomfort", visitType: "NEW", complaint: "khó chịu vùng ngực khi gắng sức",
    hpi: "Cảm giác nặng ngực khi đi nhanh, giảm khi nghỉ, không ngất",
    past: "Rối loạn lipid máu", family: "Gia đình có người bệnh mạch vành",
    meds: [{ name: "Atorvastatin", strength: "20 mg", frequency: "buổi tối" }],
    vitals: [78, 132, 82, 36.8, 19, 98, 72, 170],
    cardio: "Lồng ngực cân đối. Tiếng T1, T2 rõ, không rung miu. Phổi trong, không ran",
    diagnosis: [null, "Đau ngực cần đánh giá nguyên nhân tim mạch"], secondary: [["E78.5", "Rối loạn lipid máu, không đặc hiệu"]],
    results: ["Chưa có kết quả xét nghiệm mới", null, "Điện tâm đồ cần bác sĩ đối chiếu"],
    plan: "Đánh giá thêm theo chỉ định cận lâm sàng của bác sĩ", advice: "Hạn chế gắng sức cho đến khi hoàn tất đánh giá", followup: 7
  },
  {
    key: "dyspnea", visitType: "NEW", complaint: "khó thở khi gắng sức",
    hpi: "Khó thở tăng khi đi cầu thang, không sốt, không đau ngực",
    past: "Chưa ghi nhận bệnh tim mạch", family: "Không rõ tiền sử gia đình",
    meds: [], vitals: [84, 124, 76, 36.7, 20, 97, 62, 158],
    cardio: "Không co kéo cơ hô hấp phụ. Tiếng tim rõ. Phổi thông khí hai bên, chưa ghi nhận ran",
    diagnosis: ["R06.0", "Khó thở"], secondary: [],
    results: [null, "Chưa có kết quả chẩn đoán hình ảnh", null],
    plan: "Đánh giá nguyên nhân khó thở theo chỉ định của bác sĩ", advice: "Theo dõi mức độ khó thở và tái khám theo hẹn", followup: 14
  },
  {
    key: "dyslipidemia", visitType: "FOLLOW_UP", complaint: "tái khám rối loạn lipid máu",
    hpi: "Dùng thuốc đều, chưa ghi nhận triệu chứng mới",
    past: "Rối loạn lipid máu", family: "Không rõ tiền sử gia đình",
    meds: [{ name: "Rosuvastatin", strength: "10 mg", frequency: "buổi tối" }],
    vitals: [70, 122, 74, 36.5, 17, 99, 64, 162],
    cardio: "Mạch đều. Tiếng tim rõ, không âm thổi. Phổi trong, không ran",
    diagnosis: ["E78.5", "Rối loạn lipid máu, không đặc hiệu"], secondary: [],
    results: ["Có kết quả lipid máu để bác sĩ đối chiếu", null, null],
    plan: "Duy trì điều trị theo đơn hiện tại và theo dõi xét nghiệm", advice: "Tái khám mang theo kết quả xét nghiệm", followup: 90
  },
  {
    key: "post_pci", visitType: "FOLLOW_UP", complaint: "tái khám sau can thiệp mạch vành",
    hpi: "Hiện không đau ngực, không khó thở khi sinh hoạt thông thường",
    past: "Đã can thiệp động mạch vành", family: "Không rõ tiền sử gia đình",
    meds: [{ name: "Aspirin", strength: "81 mg", frequency: "mỗi ngày một lần" }, { name: "Atorvastatin", strength: "40 mg", frequency: "buổi tối" }],
    vitals: [68, 128, 76, 36.6, 18, 98, 70, 168],
    cardio: "Mạch đều, rõ. Tiếng T1, T2 rõ. Không phù. Phổi trong, không ran",
    diagnosis: ["Z95.5", "Có nong mạch vành và bộ phận cấy ghép"], secondary: [["I25.1", "Bệnh tim do xơ vữa động mạch"]],
    results: ["Xét nghiệm theo dõi được ghi nhận", null, "Điện tâm đồ nhịp xoang"],
    plan: "Duy trì thuốc theo đơn đã được bác sĩ xác nhận", advice: "Theo dõi đau ngực và tái khám đúng hẹn", followup: 30
  },
  {
    key: "heart_failure", visitType: "FOLLOW_UP", complaint: "tái khám suy tim",
    hpi: "Khó thở khi gắng sức mức độ ổn định, không khó thở khi nghỉ",
    past: "Suy tim đang theo dõi", family: "Không rõ tiền sử gia đình",
    meds: [{ name: "Bisoprolol", strength: "2,5 mg", frequency: "mỗi ngày một lần" }, { name: "Furosemide", strength: "40 mg", frequency: "buổi sáng" }],
    vitals: [76, 118, 72, 36.7, 20, 96, 66, 164],
    cardio: "Tĩnh mạch cổ không nổi. Tiếng tim rõ. Phổi chưa ghi nhận ran. Phù mắt cá chân nhẹ hai bên",
    diagnosis: ["I50.9", "Suy tim, không đặc hiệu"], secondary: [],
    results: ["Điện giải và chức năng thận cần đối chiếu", "Có kết quả siêu âm tim để bác sĩ xem", null],
    plan: "Tiếp tục điều trị và theo dõi cân nặng theo hướng dẫn của bác sĩ", advice: "Theo dõi khó thở, phù và cân nặng hằng ngày", followup: 14
  },
  {
    key: "arrhythmia", visitType: "FOLLOW_UP", complaint: "tái khám rối loạn nhịp",
    hpi: "Thỉnh thoảng hồi hộp ngắn, không ngất, không khó thở khi nghỉ",
    past: "Rối loạn nhịp đang theo dõi", family: "Không rõ tiền sử gia đình",
    meds: [{ name: "Apixaban", strength: "5 mg", frequency: "ngày hai lần" }],
    vitals: [88, 130, 80, 36.6, 18, 98, 60, 166],
    cardio: "Mạch không đều. Tiếng tim nghe không đều, phổi trong, không ran",
    diagnosis: ["I48.9", "Rung nhĩ và cuồng nhĩ, không đặc hiệu"], secondary: [],
    results: [null, null, "Điện tâm đồ có dữ liệu để bác sĩ đối chiếu"],
    plan: "Tiếp tục theo dõi nhịp và dùng thuốc theo đơn đã xác nhận", advice: "Theo dõi chảy máu bất thường và tái khám đúng hẹn", followup: 30
  },
  {
    key: "syncope", visitType: "NEW", complaint: "một lần ngất thoáng qua",
    hpi: "Ngất trong thời gian ngắn khi đang đứng, tỉnh lại tự nhiên, chưa ghi nhận co giật",
    past: "Chưa ghi nhận bệnh tim mạch", family: "Gia đình chưa ghi nhận đột tử sớm",
    meds: [], vitals: [74, 116, 70, 36.7, 18, 99, 58, 163],
    cardio: "Mạch đều, tiếng tim rõ, chưa ghi nhận âm thổi. Phổi trong, không ran",
    diagnosis: ["R55", "Ngất và trụy"], secondary: [],
    results: ["Chưa có kết quả xét nghiệm mới", null, "Điện tâm đồ cần được đánh giá"],
    plan: "Đánh giá thêm nguyên nhân ngất theo chỉ định của bác sĩ", advice: "Tránh tự lái xe cho đến khi được đánh giá và quay lại nếu tái diễn", followup: 7
  },
  {
    key: "preoperative", visitType: "NEW", complaint: "đánh giá tim mạch trước thủ thuật",
    hpi: "Không đau ngực, không khó thở khi sinh hoạt thông thường",
    past: "Tăng huyết áp đang theo dõi", family: "Không rõ tiền sử gia đình",
    meds: [{ name: "Losartan", strength: "50 mg", frequency: "mỗi ngày một lần" }],
    vitals: [72, 136, 82, 36.5, 17, 99, 69, 169],
    cardio: "Mạch đều. Tiếng T1, T2 rõ, không âm thổi. Phổi trong, không ran",
    diagnosis: ["Z01.8", "Khám chuyên khoa xác định khác"], secondary: [["I10", "Tăng huyết áp vô căn"]],
    results: ["Có kết quả xét nghiệm tiền thủ thuật", null, "Điện tâm đồ nhịp xoang"],
    plan: "Hoàn thiện đánh giá tim mạch theo hồ sơ thủ thuật", advice: "Thực hiện hướng dẫn dùng thuốc trước thủ thuật của bác sĩ phụ trách", followup: 7
  }
];

const statuses = ["COMPLETE", "MISSING", "RECOVERED", "COMPLETE", "MISSING", "RECOVERED"];
const omittedByVariant = [null, "reference_note.family_history", "reference_note.current_medications", null, "reference_note.result_summaries", "reference_note.treatment.advice_followup"];

function medicationText(items) {
  if (!items.length) return "không dùng thuốc thường xuyên";
  return items.map((item) => `${item.name} ${item.strength}, ${item.frequency}`).join("; ");
}

function makeReference(profile, index) {
  const [pulse, sbp, dbp, temperature, respRate, spo2, weight, height] = profile.vitals;
  const secondary = profile.secondary.map(([code, display]) => ({ code, display }));
  const reference = {
    chief_complaint: profile.complaint,
    history_present_illness: profile.hpi,
    past_history: profile.past,
    family_history: profile.family,
    allergies: { status: index % 4 === 0 ? "PRESENT" : "NONE", items: index % 4 === 0 ? ["Penicillin"] : [] },
    current_medications: { status: profile.meds.length ? "PRESENT" : "NONE", items: profile.meds },
    vital_signs: { pulse_bpm: pulse + (index % 3), sbp_mmhg: sbp + (index % 2) * 2, dbp_mmhg: dbp, temperature_c: temperature, resp_rate: respRate, spo2_pct: spo2, weight_kg: weight + (index % 2), height_cm: height, source: index % 2 ? "MANUAL" : "OMRON" },
    exam: { general: "Tỉnh táo, tiếp xúc tốt", specialty: null, cardio_respiratory: profile.cardio, other_organs: null },
    diagnoses: { initial: { code: profile.diagnosis[0], display: profile.diagnosis[1] }, discharge: { code: profile.diagnosis[0], display: profile.diagnosis[1] }, secondary },
    result_summaries: { lab: profile.results[0], imaging: profile.results[1], paraclinical: profile.results[2] },
    treatment: { treated_at_visit: false, plan: profile.plan, advice_followup: profile.advice, followup_scheduled: true, followup_interval_days: profile.followup },
    reference_text: ""
  };
  reference.reference_text = `Lý do khám: ${reference.chief_complaint}. Bệnh sử: ${reference.history_present_illness}. Tiền sử: ${reference.past_history}. Khám: ${reference.exam.cardio_respiratory}. Chẩn đoán: ${reference.diagnoses.discharge.display}. Hướng điều trị: ${reference.treatment.plan}. Lời dặn: ${reference.treatment.advice_followup}.`;
  return reference;
}

function sentenceFor(pathName, reference) {
  const values = {
    "reference_note.family_history": `Tiền sử gia đình: ${reference.family_history}.`,
    "reference_note.current_medications": `Thuốc đang dùng: ${medicationText(reference.current_medications.items)}.`,
    "reference_note.result_summaries": `Kết quả chính: ${[reference.result_summaries.lab, reference.result_summaries.imaging, reference.result_summaries.paraclinical].filter(Boolean).join("; ") || "chưa có kết quả mới"}.`,
    "reference_note.treatment.advice_followup": `Lời dặn: ${reference.treatment.advice_followup}.`
  };
  return values[pathName] || "";
}

function buildConversation(reference, omitted) {
  const segments = [
    `Người bệnh đến khám vì ${reference.chief_complaint}.`,
    `Bệnh sử: ${reference.history_present_illness}.`,
    `Tiền sử bản thân: ${reference.past_history}.`,
    omitted === "reference_note.family_history" ? "" : `Tiền sử gia đình: ${reference.family_history}.`,
    `Dị ứng: ${reference.allergies.status === "PRESENT" ? reference.allergies.items.join(", ") : "chưa ghi nhận"}.`,
    omitted === "reference_note.current_medications" ? "" : `Thuốc đang dùng: ${medicationText(reference.current_medications.items)}.`,
    `Sinh hiệu: mạch ${reference.vital_signs.pulse_bpm} lần mỗi phút, huyết áp ${reference.vital_signs.sbp_mmhg} trên ${reference.vital_signs.dbp_mmhg} mi li mét thủy ngân, SpO2 ${reference.vital_signs.spo2_pct} phần trăm.`,
    `Toàn thân tỉnh táo, tiếp xúc tốt. Khám tim phổi: ${reference.exam.cardio_respiratory}.`,
    omitted === "reference_note.result_summaries" ? "" : sentenceFor("reference_note.result_summaries", reference),
    `Chẩn đoán: ${reference.diagnoses.initial.display}.`,
    `Hướng điều trị: ${reference.treatment.plan}.`,
    omitted === "reference_note.treatment.advice_followup" ? "" : `Lời dặn: ${reference.treatment.advice_followup}.`,
    `Hẹn tái khám sau ${reference.treatment.followup_interval_days} ngày.`
  ];
  return segments.filter(Boolean).join(" ");
}

const records = [];
let counter = 1;
for (const [profileIndex, profile] of profiles.entries()) {
  for (let variant = 0; variant < statuses.length; variant += 1) {
    const reference = makeReference(profile, profileIndex + variant);
    const status = statuses[variant];
    const omitted = omittedByVariant[variant];
    records.push({
      dataset_version: "1.0.0",
      synthetic: true,
      scenario_id: `SYN-CARDIO-${String(counter).padStart(3, "0")}`,
      care_setting: "OPD",
      visit_type: profile.visitType,
      doctor_template_id: `CARDIO-OPD-${String.fromCharCode(65 + (profileIndex % 3))}`,
      recording_status: status,
      conversation_text: buildConversation(reference, omitted),
      recovery_dictation: status === "RECOVERED" ? sentenceFor(omitted, reference) : null,
      reference_note: reference,
      missing_fields: status === "MISSING" ? [omitted] : [],
      draft_note: null,
      reviewed_note: null,
      review_time_seconds: null,
      error_tags: []
    });
    counter += 1;
  }
}

function csvCell(value) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const csvFields = [
  "scenario_id", "care_setting", "visit_type", "doctor_template_id", "recording_status", "conversation_text", "recovery_dictation",
  "chief_complaint", "history_present_illness", "past_history", "family_history", "allergies", "current_medications", "vital_signs",
  "exam_general", "exam_cardio_respiratory", "diagnoses", "result_summaries", "treatment", "missing_fields",
  "draft_note", "reviewed_note", "review_time_seconds", "error_tags"
];

const csvRows = records.map((record) => {
  const note = record.reference_note;
  const row = {
    ...record,
    chief_complaint: note.chief_complaint,
    history_present_illness: note.history_present_illness,
    past_history: note.past_history,
    family_history: note.family_history,
    allergies: note.allergies,
    current_medications: note.current_medications,
    vital_signs: note.vital_signs,
    exam_general: note.exam.general,
    exam_cardio_respiratory: note.exam.cardio_respiratory,
    diagnoses: note.diagnoses,
    result_summaries: note.result_summaries,
    treatment: note.treatment
  };
  return csvFields.map((field) => csvCell(row[field])).join(",");
});

const summary = {
  dataset_version: "1.0.0",
  synthetic: true,
  domain: "CARDIOLOGY_OPD",
  record_count: records.length,
  status_counts: Object.fromEntries(["COMPLETE", "MISSING", "RECOVERED"].map((status) => [status, records.filter((record) => record.recording_status === status).length])),
  visit_type_counts: Object.fromEntries(["NEW", "FOLLOW_UP"].map((type) => [type, records.filter((record) => record.visit_type === type).length])),
  measurement_fields_populated: false
};

function validate() {
  const ids = new Set(records.map((record) => record.scenario_id));
  if (records.length !== 60 || ids.size !== 60) throw new Error("Dataset phải có 60 mã duy nhất");
  for (const expected of ["COMPLETE", "MISSING", "RECOVERED"]) {
    if (summary.status_counts[expected] !== 20) throw new Error(`Phân bố ${expected} không đúng`);
  }
  for (const record of records) {
    const vital = record.reference_note.vital_signs;
    if (vital.sbp_mmhg <= vital.dbp_mmhg) throw new Error(`${record.scenario_id}: huyết áp không hợp lệ`);
    if (record.recording_status === "MISSING" && record.missing_fields.length !== 1) throw new Error(`${record.scenario_id}: thiếu missing_fields`);
    if (record.recording_status === "RECOVERED" && (!record.recovery_dictation || record.missing_fields.length)) throw new Error(`${record.scenario_id}: recovery không hợp lệ`);
    if (record.draft_note !== null || record.reviewed_note !== null || record.review_time_seconds !== null || record.error_tags.length) throw new Error(`${record.scenario_id}: dữ liệu đo chưa được để trống`);
  }
}

validate();
if (!checkOnly) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "synthetic-cases.jsonl"), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  fs.writeFileSync(path.join(outputDir, "synthetic-cases.csv"), `${csvFields.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`);
  fs.writeFileSync(path.join(outputDir, "dataset-summary.json"), JSON.stringify(summary, null, 2) + "\n");
}

console.log(JSON.stringify(summary, null, 2));
