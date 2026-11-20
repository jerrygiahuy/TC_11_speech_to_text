import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { emptyEncounter } from "@/shared/clinical/schema";
import { aiEformPatch, applyAiDraft } from "@/shared/clinical/apply-ai";
import { projectEform } from "@/shared/clinical/eform";
import { dongChanDoanIn } from "@/shared/eform/chan-doan-in";
import type { Transcript } from "@/shared/clinical/types";
import type { ClinicalExtraction } from "@/shared/clinical/api";
import { CLINICAL_PROMPT_VERSION, mockClinicalExtraction, validateClinicalExtraction, type MockContext } from "./extraction";

/**
 * Nghiệm thu tự động 3 ca của handoff/claude/04-ca-kiem-thu.md: conversation_text (ca 039 thêm recovery_dictation)
 * chạy qua mock -> kiểm tra bằng chứng -> aiEformPatch/applyAiDraft, rồi so từng trường với file expected cạnh dữ liệu ca.
 */
const THOI_GIAN_KHAM = "2026-11-19T09:00";
type Vai = Transcript["segments"][number]["vai_tro"];
interface Mong { ca: string; thoi_gian_kham: string; sinh_hieu_fixture: { ha_tam_thu: number; ha_tam_truong: number }; fields?: Record<string, string>; thuocDangDung?: Row[]; giai_doan_a?: Giai; giai_doan_b?: Giai }
interface Row { ten: string; ham_luong: string; cach_dung: string }
interface Giai { fields: Record<string, string>; thuocDangDung?: Row[] }

const mong = (id: string): Mong => JSON.parse(fs.readFileSync(`data/cardiology/nghiem-thu/${id}.expected.json`, "utf8"));
const caGoc = (id: string) => JSON.parse(fs.readFileSync("data/cardiology/synthetic-cases.jsonl", "utf8").split("\n").find(row => row.includes(`"${id}"`))!) as { conversation_text: string; recovery_dictation: string | null; reference_note: { vital_signs: { sbp_mmhg: number; dbp_mmhg: number } } };

/** Phần khai của người bệnh (lý do, bệnh sử, tiền sử, dị ứng, thuốc đang dùng) và phần bác sĩ tách thành đoạn riêng theo nhãn. */
const NHAN_DAU_CAU = /(?=(?:Người bệnh đến khám vì|Bệnh sử:|Tiền sử bản thân:|Tiền sử gia đình:|Dị ứng:|Thuốc đang dùng:|Sinh hiệu:|Toàn thân |Khám tim phổi:|Kết quả chính:|Chẩn đoán:|Hướng điều trị:|Lời dặn:|Hẹn tái khám ))/u;
const KHAI = /^(?:Người bệnh đến khám vì|Bệnh sử:|Tiền sử bản thân:|Tiền sử gia đình:|Dị ứng:|Thuốc đang dùng:)/u;
function hoiThoai(text: string, vaiLoi?: Vai): Transcript {
  const doan: { vai: Vai; text: string }[] = [];
  for (const phan of text.split(NHAN_DAU_CAU).map(item => item.trim()).filter(Boolean)) {
    const vai: Vai = vaiLoi ?? (KHAI.test(phan) ? "benh_nhan" : "bac_si");
    if (doan.at(-1)?.vai === vai) doan[doan.length - 1].text += ` ${phan}`; else doan.push({ vai, text: phan });
  }
  return {
    schema_version: "1.1.0", request_id: randomUUID(), transcript_id: randomUUID(), revision: 1, language: "vi",
    privacy: { trang_thai: "passed", policy_version: "test", processed_at: "2026-11-19T09:00:00+07:00" },
    context: { tuoi_thang: null, gioi_tinh: null, can_nang_kg: null },
    segments: doan.map((item, i) => ({ id: `s${i + 1}`, sequence: i + 1, utterance_ref: null, speaker_id: null, vai_tro: item.vai, nguon_vai_tro: item.vai === "chua_ro" ? "chua_ro" : "bac_si_gan", start_ms: null, end_ms: null, text: item.text, is_final: true })),
  };
}

function chay(transcript: Transcript, context: MockContext) {
  const draft = validateClinicalExtraction(mockClinicalExtraction(transcript, context), transcript);
  const run: ClinicalExtraction = { run_id: randomUUID(), draft, transcript, provider: "mock", model: "extractive", prompt_version: CLINICAL_PROMPT_VERSION, created_at: "2026-11-19T09:05:00+07:00", input_digest: "d".repeat(64), duration_ms: 1 };
  const ctx = { now: run.created_at, newId: () => randomUUID(), services: [] };
  return { draft, run, patch: aiEformPatch(run, ctx), ctx };
}
const ngu = (mongDoi: Mong): MockContext => ({ sinh_hieu: { ha_tam_thu: mongDoi.sinh_hieu_fixture.ha_tam_thu, ha_tam_truong: mongDoi.sinh_hieu_fixture.ha_tam_truong }, thoi_gian_kham: mongDoi.thoi_gian_kham });
/** Chữ cần so: gộp xuống dòng và khoảng trắng, bỏ dấu chấm cuối (mock giữ nguyên dấu câu của lời nói). */
const gon = (value: string) => value.replace(/\s+/gu, " ").trim().replace(/[.]+$/u, "");
const congNgay = (iso: string, ngay: number) => new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + ngay * 86400000).toISOString().slice(0, 10);

function soSanh(patch: ReturnType<typeof aiEformPatch>, fields: Record<string, string>, nhan: string) {
  const lech: string[] = [];
  for (const [id, expected] of Object.entries(fields)) {
    const actual = patch.fields[id]?.value ?? "";
    if (gon(actual) !== gon(expected)) lech.push(`${id}: có "${actual}" / cần "${expected}"`);
  }
  assert.deepEqual(lech, [], `${nhan}: trường lệch với expected`);
  // Mọi trường AI điền đều ở trạng thái xem (chờ bác sĩ), mã ICD không bao giờ vào thẳng.
  for (const [id, field] of Object.entries(patch.fields)) assert.equal(field.nguon, "xem", `${nhan}: ${id} phải ở trạng thái xem`);
}
const soThuoc = (patch: ReturnType<typeof aiEformPatch>, rows: Row[] | undefined) => assert.deepEqual(patch.thuocDangDung ?? [], rows ?? []);

test("nghiem_thu_013_kham_moi", () => {
  const expected = mong("SYN-CARDIO-013"), goc = caGoc("SYN-CARDIO-013");
  assert.equal(expected.sinh_hieu_fixture.ha_tam_thu, goc.reference_note.vital_signs.sbp_mmhg);
  const { draft, patch, run, ctx } = chay(hoiThoai(goc.conversation_text), ngu(expected));
  soSanh(patch, expected.fields!, "013");
  soThuoc(patch, expected.thuocDangDung);
  // Review Focus 3: bệnh nền ở tiền sử không tự thành chẩn đoán kèm theo; chẩn đoán ra viện chờ bác sĩ.
  assert.equal(patch.fields.icd_kem_theo?.value ?? "", "");
  assert.equal(patch.fields.mo_ta_ra_vien?.value ?? "", "");
  assert.ok((patch.fields.kham_tim_mach_ho_hap?.value ?? "").includes("Tiếng T1, T2 rõ"));
  assert.equal(patch.fields.kham_chuyen_khoa?.value ?? "", "");
  assert.deepEqual(patch.chiDinh, []);
  assert.equal(draft.chi_dinh.items.length, 0);
  assert.ok(draft.can_xem_lai.every(issue => issue.loai !== "mau_thuan"), "mạch/HA trong hội thoại trùng fixture nên không cảnh báo lệch");
  assert.equal(patch.fields.da_xu_ly?.value ?? "", "");
  assert.equal(patch.fields.tinh_trang_ra_vien?.value ?? "", "");
  // Bản in: có Chẩn đoán ban đầu, không có dòng Chẩn đoán ra viện.
  const shown = projectEform(applyAiDraft(emptyEncounter({ id: "e", patientId: "p", doctorId: "d", now: run.created_at }), run, ctx));
  const dong = dongChanDoanIn(id => shown.fields[id] ?? { value: "", nguon: null }, ma => ma);
  assert.deepEqual(dong.map(item => item.nhan), ["Chẩn đoán ban đầu"]);
});

test("nghiem_thu_001_tai_kham", () => {
  const expected = mong("SYN-CARDIO-001"), goc = caGoc("SYN-CARDIO-001");
  assert.equal(expected.sinh_hieu_fixture.ha_tam_thu, goc.reference_note.vital_signs.sbp_mmhg);
  const { draft, patch } = chay(hoiThoai(goc.conversation_text), ngu(expected));
  soSanh(patch, expected.fields!, "001");
  soThuoc(patch, expected.thuocDangDung);
  assert.equal(patch.fields.di_ung.value, "Có");
  assert.equal(patch.fields.hen_tai_kham.value, "Có");
  assert.equal(patch.fields.ngay_tai_kham.value, congNgay(THOI_GIAN_KHAM, 30));
  // Lời dặn có "tái khám sau 30 ngày" không được rơi sang nhánh hẹn tái khám làm trống lời dặn.
  assert.equal(patch.fields.loi_dan.value, "Ghi nhật ký huyết áp, tái khám sau 30 ngày");
  assert.equal(patch.fields.mo_ta_ra_vien?.value ?? "", "");
  assert.equal(patch.fields.icd_ra_vien?.value ?? "", "");
  assert.equal(draft.chi_dinh.de_cap, "chua_de_cap");
  assert.deepEqual(patch.chiDinh, []);
  assert.ok(!patch.fields.kham_tim_mach_ho_hap.value.includes("Khám tim phổi:"), "bỏ tiền tố nhãn khỏi dòng đầu");
  assert.ok(draft.can_xem_lai.every(issue => issue.loai !== "mau_thuan"));
});

test("nghiem_thu_039_doc_bo_sung", () => {
  const expected = mong("SYN-CARDIO-039"), goc = caGoc("SYN-CARDIO-039");
  // Giai đoạn A: chỉ có hội thoại. Chưa có thuốc: ô thuốc đang dùng để chưa chọn.
  const a = chay(hoiThoai(goc.conversation_text), ngu(expected));
  soSanh(a.patch, expected.giai_doan_a!.fields, "039 A");
  soThuoc(a.patch, []);
  assert.equal(a.patch.fields.thuoc_dang_dung?.value ?? "", "");
  assert.ok(a.patch.fields.tien_su_gia_dinh.value.toLocaleLowerCase("vi").includes("không rõ"), "giữ nguyên cụm không rõ, không đổi thành Không");
  assert.match(a.patch.fields.tien_su_gia_dinh.value, /không rõ/iu);

  // Giai đoạn B: lời đọc bổ sung, chỉ chứa thuốc đang dùng.
  const b = chay(hoiThoai(goc.recovery_dictation!, "chua_ro"), ngu(expected));
  soSanh(b.patch, expected.giai_doan_b!.fields, "039 B");
  soThuoc(b.patch, expected.giai_doan_b!.thuocDangDung);
  assert.equal(b.patch.thuocDangDung!.length, 2);
  assert.ok(b.patch.thuocDangDung!.some(row => row.ham_luong === "2,5 mg"), "giữ dấu phẩy thập phân");
  // Không đè trường khác: bảng đề xuất chỉ có ô thuốc đang dùng.
  assert.deepEqual(Object.keys(b.patch.fields), ["thuoc_dang_dung"]);

  // Áp A rồi B: phần bổ sung không xóa phần đã có.
  let hoSo = emptyEncounter({ id: "e", patientId: "p", doctorId: "d", now: a.run.created_at });
  hoSo = applyAiDraft(hoSo, a.run, a.ctx);
  hoSo = applyAiDraft(hoSo, b.run, b.ctx);
  const shown = projectEform(hoSo);
  assert.equal(shown.fields.thuoc_dang_dung.value, "NB có");
  assert.equal(shown.thuocDangDung!.length, 2);
  assert.equal(gon(shown.fields.loi_dan.value), expected.giai_doan_a!.fields.loi_dan);
  assert.match(shown.fields.tien_su_gia_dinh.value, /không rõ/iu);
  assert.equal(shown.fields.mo_ta_ra_vien.value, "");
});

test("mock_so_dien_thoai_khong_la_trieu_chung: 'ho'/'phù' chỉ tính khi đứng riêng, không nằm trong 'số điện thoại'", () => {
  const khongPhaiTrieuChung = ["Số điện thoại của tôi là 0900000000.", "Tôi tên là Hồ Văn A, có hộ khẩu ở quận 1.", "Nhà tôi ở phường Phú Nhuận, gần chợ."];
  for (const text of khongPhaiTrieuChung) {
    const transcript = hoiThoai(text, "benh_nhan");
    const output = mockClinicalExtraction(transcript);
    assert.equal(output.phieu_kham.ly_do_kham, null, text);
    assert.equal(output.phieu_kham.benh_su, null, text);
    assert.equal(output.tom_tat, null, text);
  }
  // Đối chứng: "ho" và "phù" đứng riêng vẫn là triệu chứng.
  const ho = mockClinicalExtraction(hoiThoai("Tôi bị ho về đêm.", "benh_nhan"));
  assert.equal(ho.phieu_kham.ly_do_kham, "Tôi bị ho về đêm.");
  const phu = mockClinicalExtraction(hoiThoai("Chân tôi phù từ hôm qua.", "benh_nhan"));
  assert.equal(phu.phieu_kham.benh_su, "Chân tôi phù từ hôm qua.");
});
