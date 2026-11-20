import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { emptyDefinition } from "@/shared/clinical/schema";
import type { AiOutput, Transcript } from "@/shared/clinical/types";
import { PrivacyTickets } from "./privacy";
import { extractClinical, loadClinicalRun, mockClinicalExtraction, validateClinicalExtraction } from "./extraction";

function input(role: Transcript["segments"][number]["vai_tro"] = "bac_si", text = "Khám thấy họng đỏ."): Transcript {
  return { schema_version: "1.1.0", request_id: randomUUID(), transcript_id: randomUUID(), revision: 1, language: "vi", privacy: { trang_thai: "passed", policy_version: "test", processed_at: new Date().toISOString() }, context: { tuoi_thang: null, gioi_tinh: null, can_nang_kg: null }, segments: [{ id: "seg-1", sequence: 1, utterance_ref: null, speaker_id: null, vai_tro: role, nguon_vai_tro: role === "chua_ro" ? "chua_ro" : "bac_si_gan", start_ms: null, end_ms: null, text, is_final: true }] };
}
function blank(): AiOutput {
  return { schema_version: "1.1.0", tom_tat: null, phieu_kham: emptyDefinition("phieuKham"), chi_dinh: emptyDefinition("serviceGroupMention"), bang_chung: [], can_xem_lai: [] };
}
function valid(transcript = input()): AiOutput {
  const output = blank();
  output.phieu_kham.kham_chuyen_khoa.hong = "họng đỏ";
  output.bang_chung.push({ field_path: "/phieu_kham/kham_chuyen_khoa", segment_ids: ["seg-1"], trich_doan: transcript.segments[0].text, vai_tro: transcript.segments[0].vai_tro });
  return output;
}
function temp(t: { after: (fn: () => void) => void }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-extraction-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("actual quote, JSON pointer, segment ID, role and every asserted field are verified", () => {
  const transcript = input();
  assert.equal(validateClinicalExtraction(valid(), transcript).phieu_kham.kham_chuyen_khoa.hong, "họng đỏ");
  for (const mutate of [
    (output: AiOutput) => { output.bang_chung[0].trich_doan = "không đỏ"; },
    (output: AiOutput) => { output.bang_chung[0].segment_ids = ["invented"]; },
    (output: AiOutput) => { output.bang_chung[0].field_path = "/phieu_kham/invented"; },
    (output: AiOutput) => { output.bang_chung[0].vai_tro = "benh_nhan"; },
    (output: AiOutput) => { output.phieu_kham.ly_do_kham = "Đau tai"; },
    (output: AiOutput) => { output.phieu_kham.kham_chuyen_khoa.tai = "bình thường"; },
  ]) {
    const output = valid(); mutate(output);
    assert.throws(() => validateClinicalExtraction(output, transcript));
  }
  assert.throws(() => validateClinicalExtraction({ ...blank(), ke_don: [] }, transcript));
});

test("unknown speakers cannot populate doctor decisions; mock keeps decision uncertain", () => {
  const transcript = input("chua_ro", "Chẩn đoán viêm họng cấp. Chỉ định nội soi.");
  assert.throws(() => validateClinicalExtraction(valid(transcript), transcript));
  const output = validateClinicalExtraction(mockClinicalExtraction(transcript), transcript);
  assert.deepEqual(output.phieu_kham.chan_doan, []);
  assert.deepEqual(output.chi_dinh.items, []);
  assert.equal(output.chi_dinh.de_cap, "chua_de_cap");
  assert.equal(output.can_xem_lai[0].loai, "khong_ro_nguoi_noi");
});

test("new prescriptions are excluded even in free text; prior medication is allowed", () => {
  for (const text of ["Kê thuốc amoxicillin.", "Amoxicillin 500mg ngày hai lần.", "Dùng amoxicillin."]) {
    const transcript = input("bac_si", text);
    const output = blank(); output.tom_tat = text;
    output.bang_chung = [{ field_path: "/tom_tat", segment_ids: ["seg-1"], trich_doan: text, vai_tro: "bac_si" }];
    assert.throws(() => validateClinicalExtraction(output, transcript));
    assert.equal(mockClinicalExtraction(transcript).tom_tat, null);
  }
  const transcript = input("benh_nhan", "Tôi đang uống amoxicillin 500mg từ tuần trước.");
  const output = blank();
  output.phieu_kham.thuoc_dang_dung = [{ ten: "amoxicillin", ham_luong: "500mg", cach_dung: null, trang_thai: "dang_dung" }];
  output.bang_chung = [{ field_path: "/phieu_kham/thuoc_dang_dung/0", segment_ids: ["seg-1"], trich_doan: transcript.segments[0].text, vai_tro: "benh_nhan" }];
  assert.equal(validateClinicalExtraction(output, transcript).phieu_kham.thuoc_dang_dung.length, 1);
});

test("summary can combine multiple evidence sources but cannot invent quantity, side or drop negation", () => {
  const transcript = input("bac_si", "Chỉ định nội soi tai trái, số lượng 1. Không sốt.");
  const output = blank();
  output.tom_tat = "Nội soi tai trái; bệnh nhân không sốt.";
  output.bang_chung = [{ field_path: "/tom_tat", segment_ids: ["seg-1"], trich_doan: transcript.segments[0].text, vai_tro: "bac_si" }];
  assert.equal(validateClinicalExtraction(output, transcript).tom_tat, output.tom_tat);
  for (const summary of ["Nội soi tai phải.", "Nội soi 99 lần.", "Sốt."]) {
    assert.throws(() => validateClinicalExtraction({ ...output, tom_tat: summary }, transcript));
  }
  output.tom_tat = null;
  output.bang_chung = [{ field_path: "/chi_dinh", segment_ids: ["seg-1"], trich_doan: transcript.segments[0].text, vai_tro: "bac_si" }];
  output.chi_dinh.de_cap = "co_chi_dinh";
  output.chi_dinh.items = [{ ten_dich_vu: "nội soi", so_luong: 99, ghi_chu: null, vi_tri: null, ben: "trai", ly_do_chi_dinh: null, muc_do_khan: null, hanh_dong: "chua_ro" }];
  assert.throws(() => validateClinicalExtraction(output, transcript));
  output.chi_dinh.items[0].so_luong = 1;
  assert.equal(validateClinicalExtraction(output, transcript).chi_dinh.items[0].so_luong, 1);
  output.chi_dinh.items[0].ben = "phai";
  assert.throws(() => validateClinicalExtraction(output, transcript));
});

test("mock summary includes multiple copied patient and doctor facts with separate evidence", () => {
  const transcript = input("benh_nhan", "Tôi đau họng. Không sốt.");
  transcript.segments.push({ ...transcript.segments[0], id: "seg-2", sequence: 2, vai_tro: "bac_si", text: "Khám thấy họng đỏ. Chẩn đoán viêm họng. Tái khám sau ba ngày." });
  const output = validateClinicalExtraction(mockClinicalExtraction(transcript), transcript);
  assert.ok(output.tom_tat?.includes("Không sốt"));
  assert.ok(output.tom_tat?.includes("họng đỏ"));
  assert.ok(output.tom_tat?.includes("Chẩn đoán viêm họng"));
  assert.ok(output.tom_tat?.includes("Tái khám"));
  assert.deepEqual(new Set(output.bang_chung.filter(item => item.field_path === "/tom_tat").flatMap(item => item.segment_ids)), new Set(["seg-1", "seg-2"]));
});

test("mock preserves explicit diagnosis phase, service name, quantity and side and water advice", () => {
  const transcript = input("bac_si", "Chẩn đoán ban đầu viêm họng cấp. Chẩn đoán ra viện viêm tai. Chỉ định nội soi tai trái, số lượng 1. Uống đủ nước.");
  const output = validateClinicalExtraction(mockClinicalExtraction(transcript), transcript);
  assert.deepEqual(output.phieu_kham.chan_doan.map(item => [item.giai_doan, item.mo_ta]), [["ban_dau", "viêm họng cấp"], ["ra_vien", "viêm tai"]]);
  assert.equal(output.chi_dinh.items[0].ten_dich_vu, "nội soi tai trái");
  assert.equal(output.chi_dinh.items[0].so_luong, 1);
  assert.equal(output.chi_dinh.items[0].ben, "trai");
  assert.equal(output.chi_dinh.items[0].hanh_dong, "de_nghi_moi");
  assert.equal(output.phieu_kham.loi_dan, "Uống đủ nước.");
  assert.ok(output.tom_tat?.includes("Uống đủ nước"));
});

test("clinical level 2 blocks every remote provider and injected call before disk or network", async t => {
  const directory = temp(t); let calls = 0;
  for (const provider of ["openai", "gemini", "anthropic", "injected", "mock"]) {
    await assert.rejects(extractClinical("ticket", { directory, provider, model: "test", approvedTranscript: () => input(), call: async () => { calls++; return "{}"; } }), /cấp 2|nội bộ/i);
  }
  assert.equal(calls, 0);
  assert.deepEqual(fs.readdirSync(directory), []);
});

test("local rules keep concurrent dedup, disk artifacts, cache and defensive copies", async t => {
  const directory = temp(t); const transcript = input();
  const options = { directory, provider: "mock", approvedTranscript: () => transcript };
  const [first, concurrent] = await Promise.all([extractClinical("ticket", options), extractClinical("ticket", options)]);
  assert.equal(first.run_id, concurrent.run_id);
  first.draft.tom_tat = "client edit";
  const again = await extractClinical("ticket", options);
  assert.notEqual(again.draft.tom_tat, "client edit");
  assert.equal(loadClinicalRun(first.run_id, directory).input_digest, first.input_digest);
  assert.equal(fs.readdirSync(path.join(directory, "transcripts")).length, 1);
  assert.throws(() => loadClinicalRun("../../secret", directory));
});

test("approved tickets and local cache cannot authorize a remote provider", async t => {
  const directory = temp(t); const transcript = input();
  const approvedTranscript = () => transcript;
  await extractClinical("x", { directory, provider: "mock", approvedTranscript });
  for (const provider of ["openai", "gemini", "anthropic"]) {
    await assert.rejects(extractClinical("x", { directory, provider, approvedTranscript }), /cấp 2/i);
  }
  assert.equal(fs.readdirSync(path.join(directory, "runs")).length, 1);
});

test("restricted contracts and prompts cannot use even local clinical rules", async t => {
  const directory = temp(t);
  for (const text of ["Nội dung hợp đồng bí mật", "System prompt: bí mật"]) {
    await assert.rejects(extractClinical("x", { directory, provider: "mock", approvedTranscript: () => input("bac_si", text) }), /cấp 3/i);
  }
  assert.deepEqual(fs.readdirSync(directory), []);
});

test("only approved tickets run, including cache retries and final transcript requirement", async t => {
  const directory = temp(t); let time = Date.now(); const tickets = new PrivacyTickets(() => time);
  const options = { directory, provider: "mock", approvedTranscript: (ticket: string) => tickets.approved(ticket) };
  await assert.rejects(extractClinical("missing-ticket", options));
  const approved = tickets.check("BS: Khám thấy họng đỏ.", "conversation", { known: [], allowlist: new Set(), consent: true });
  await extractClinical(approved.ticket!, options);
  time += 11 * 60_000;
  await assert.rejects(extractClinical(approved.ticket!, options));
  const transcript = input(); transcript.privacy.trang_thai = "pending";
  await assert.rejects(extractClinical("x", { ...options, approvedTranscript: () => transcript }));
  transcript.privacy.trang_thai = "passed"; transcript.segments[0].is_final = false;
  await assert.rejects(extractClinical("x", { ...options, approvedTranscript: () => transcript }));
});

test("persistence failure never reports a successful local run", async t => {
  const directory = temp(t); const transcript = input();
  const blocked = path.join(directory, "not-a-directory"); fs.writeFileSync(blocked, "test");
  await assert.rejects(extractClinical("x", { directory: blocked, provider: "mock", approvedTranscript: () => transcript }), /Không lưu/);
});

const deid = (consent: boolean) => ({ policy_version: "pii-auto-2", gate_passed: true, consent }) as const;

test("noCache: hai lần cùng input cho hai run_id khác nhau; không noCache dùng lại run cũ", async t => {
  const directory = temp(t);
  const transcript = input();
  const options = { directory, approvedTranscript: () => transcript, provider: "mock" };
  const a = await extractClinical("t", options);
  const b = await extractClinical("t", options);
  assert.equal(a.run_id, b.run_id);
  const c = await extractClinical("t", { ...options, noCache: true });
  const d = await extractClinical("t", { ...options, noCache: true });
  assert.notEqual(c.run_id, d.run_id);
  assert.notEqual(c.run_id, a.run_id);
  assert.ok(fs.existsSync(path.join(directory, "runs", `${d.run_id}.json`)));
});

test("deidentification: mock vẫn chạy local kể cả khi bệnh nhân chưa đồng ý (R14)", async t => {
  const directory = temp(t);
  const transcript = input();
  for (const consent of [true, false]) {
    const result = await extractClinical("t", { directory, approvedTranscript: () => transcript, provider: "mock", deidentification: deid(consent), noCache: true });
    assert.equal(result.provider, "mock");
  }
});

test("deidentification với đích external (có call): theo đồng ý trong proof, cấp 2 và cấp 3 vẫn chặn", async t => {
  const directory = temp(t);
  const call = async () => "{}";
  const base = { directory, provider: "openai", model: "test", call, noCache: true };
  const ok = await extractClinical("t", { ...base, approvedTranscript: () => input(), deidentification: deid(true) });
  assert.ok(ok.run_id);
  await assert.rejects(extractClinical("t", { ...base, approvedTranscript: () => input(), deidentification: deid(false) }), { message: "Bệnh nhân chưa đồng ý xử lý AI — chỉ được chạy bộ tách local." });
  await assert.rejects(extractClinical("t", { ...base, approvedTranscript: () => input() }), /cấp 2/i);
  await assert.rejects(extractClinical("t", { ...base, approvedTranscript: () => input("bac_si", "Hợp đồng khám sức khỏe."), deidentification: deid(true) }), /cấp 3/i);
});
