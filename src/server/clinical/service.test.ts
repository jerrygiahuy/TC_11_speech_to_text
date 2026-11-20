import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { proposeClinicalChangesForActor, decideClinicalChangesForActor, saveClinical, readClinical, approveClinical, openEncounter, readClinicalForActor, listOpenEncounters, saveClinicalForActor, approveClinicalForActor } from "./service";
import { getDemoClinicalActor, resolveEncounterContext } from "./encounter-context";
import { ClinicalRepository } from "./repository";
import { loadEformData } from "@/server/du-lieu/eform";
import { POST } from "@/app/api/clinical/encounters/route";
import { GET } from "@/app/api/clinical/encounters/[id]/route";
import { POST as legacyExtract } from "@/app/api/extract/route";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ClinicalExtraction } from "@/shared/clinical/api";

test("real form fixture saves clinical data and restores fields, results, vitals without prescriptions", () => {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-service-")));
  const data = loadEformData();
  // Ca giả Tim mạch chỉ có thời gian khám trong gia_tri: lý do và dị ứng do bác sĩ nhập trên phiếu.
  const fields = Object.fromEntries(Object.entries(data.ca.gia_tri).map(([key, value]) => [key, { value, nguon: "cu" }]));
  fields.ly_do = { value: "tái khám tăng huyết áp", nguon: "bs" };
  fields.di_ung = { value: "Có", nguon: "bs" };
  fields.di_ung_mo_ta = { value: "Penicillin", nguon: "bs" };
  const first = saveClinical({ snapshot: { fields, chiDinh: [], trangThai: "Đang khám" } }, store);
  assert.equal(first.record.phieu_kham.ly_do_kham, "tái khám tăng huyết áp");
  assert.equal(first.record.sinh_hieu.can_nang.value, data.ca.sinh_hieu.can_nang);
  assert.equal(first.record.ket_qua[0].ngay, "2026-10-20");
  assert.ok(first.record.lich_su.length > 0);
  assert.equal("don_thuoc" in first.record, false);
  const restored = readClinical(first.record.id, store);
  assert.equal(restored.snapshot.fields.di_ung_mo_ta.value, "Penicillin");
  restored.snapshot.fields.loi_dan.value = "Tái khám khi cần";
  restored.snapshot.fields.loi_dan.nguon = "bs";
  const second = saveClinical({ id: first.record.id, expected_revision: 1, snapshot: restored.snapshot }, store);
  assert.equal(second.record.revision, 2);
  assert.equal(second.record.phieu_kham.loi_dan, "Tái khám khi cần");
  assert.throws(() => saveClinical({ snapshot: restored.snapshot, approved_by: "spoofed" }, store));
});
test("HTTP boundary rejects cross-origin, malformed JSON and wrong revision types", async () => {
  const request = (body: string, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/clinical/encounters", { method: "POST", headers: { origin }, body });
  assert.equal((await POST(request("{}", "https://other.test"))).status, 403);
  assert.equal((await POST(request("invalid"))).status, 400);
  assert.equal((await POST(request(JSON.stringify({ id: "spoofed", expected_revision: "1", snapshot: {} })))).status, 400);
  const response = await GET(new Request("http://localhost:3000/api/clinical/encounters/bad"), { params: Promise.resolve({ id: "bad" }) });
  assert.equal(response.status, 400);
  assert.equal((await legacyExtract()).status, 410);
});

test("approval requires explicit review and complete clinical fields; editing revokes approval", () => {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-approve-")));
  const data = loadEformData();
  const fields = Object.fromEntries(Object.entries(data.ca.gia_tri).map(([key, value]) => [key, { value, nguon: "bs" }]));
  const first = saveClinical({ snapshot: { fields, chiDinh: [], trangThai: "Đang khám" } }, store);
  // Ca giả Tim mạch chưa có lý do và bệnh sử: bác sĩ nhập trước, khi đó mới tới bước chẩn đoán.
  assert.throws(() => approveClinical({ id: first.record.id, expected_revision: 1, acknowledged_issues: true }, store), /lý do khám và bệnh sử/i);
  first.snapshot.fields.ly_do = { value: "tái khám tăng huyết áp", nguon: "bs" };
  first.snapshot.fields.benh_su = { value: "Theo dõi huyết áp tại nhà, thỉnh thoảng đau đầu nhẹ", nguon: "bs" };
  const withHistory = saveClinical({ id: first.record.id, expected_revision: 1, snapshot: first.snapshot }, store);
  assert.throws(() => approveClinical({ id: first.record.id, expected_revision: 2, acknowledged_issues: true }, store), /chẩn đoán/i);
  assert.equal(withHistory.record.revision, 2);
  const snapshot = withHistory.snapshot;
  snapshot.fields.mo_ta_ban_dau = { value: "Tăng huyết áp vô căn", nguon: "bs" };
  snapshot.fields.icd_ban_dau = { value: "I10", nguon: "bs" };
  snapshot.fields.icd_kem_theo = { value: data.icd10.find(item => item.ma !== "I10")!.ma, nguon: "bs" };
  snapshot.chiDinhDeCap = "khong_chi_dinh";
  const second = saveClinical({ id: first.record.id, expected_revision: 2, snapshot }, store);
  assert.equal(second.record.revision, 3);
  assert.equal(second.record.chan_doan.find(item => item.noi_dung.vai_tro === "kem_theo")?.noi_dung.giai_doan, "chua_ro"); // chẩn đoán kèm theo không có giai đoạn (02: giai_doan_kem_theo đã bỏ), duyệt không đòi giai đoạn cho nó
  assert.throws(() => approveClinical({ id: first.record.id, expected_revision: 3, acknowledged_issues: false }, store));
  const approved = approveClinical({ id: first.record.id, expected_revision: 3, acknowledged_issues: true }, store);
  assert.equal(approved.record.revision, 4);
  assert.equal(approved.record.audit.approved_by, data.ca.dang_nhap);
  assert.ok(approved.record.audit.approved_at);
  const edited = saveClinical({ id: first.record.id, expected_revision: 4, snapshot: approved.snapshot }, store);
  assert.equal(edited.record.audit.approved_at, null);
  assert.equal(edited.record.revision, 5);
});

test("AI changes are proposed from a bound run, applied only when accepted, retried safely and never cross encounters", () => {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-ai-save-")));
  const actor = getDemoClinicalActor();
  const a = openEncounter(resolveEncounterContext(actor, "LK-GIA-0456"), store);
  const b = openEncounter(resolveEncounterContext(actor, "000123"), store);
  const fixture = (name: string) => JSON.parse(fs.readFileSync(`docs/task-2/examples/${name}.example.json`, "utf8"));
  const run: ClinicalExtraction = { run_id: randomUUID(), draft: fixture("ai-output"), transcript: fixture("transcript"), provider: "mock", model: "rules", prompt_version: "test", created_at: new Date().toISOString(), input_digest: "test", duration_ms: 1,
    binding: { encounter_id: a.record.id, recording_session_id: randomUUID(), generation: 1, content_revision: 1 } as ClinicalExtraction["binding"] };
  const getRun = () => run;
  const status = (expected: number) => (error: unknown) => error instanceof Error && "status" in error && error.status === expected;
  assert.throws(() => proposeClinicalChangesForActor(actor, { encounter_id: b.record.id, run_id: run.run_id }, store, getRun), status(403));
  const set = proposeClinicalChangesForActor(actor, { encounter_id: a.record.id, run_id: run.run_id }, store, getRun);
  const reason = set.changes.find(item => item.field_path === "/phieu_kham/ly_do_kham")!;
  const before = readClinicalForActor(actor, a.record.id, store).record;
  const request = { encounter_id: a.record.id, expected_revision: before.revision, run_id: run.run_id, accepted_ids: [reason.id], rejected_ids: [] as string[] };
  const decided = decideClinicalChangesForActor(actor, request, store, getRun);
  assert.equal(decided.record.phieu_kham.ly_do_kham, reason.after);
  assert.equal(decided.record.phieu_kham.benh_su, before.phieu_kham.benh_su);
  assert.equal(decided.record.ai_runs.length, 1);
  assert.equal(decided.record.revision, before.revision + 1);
  assert.equal(decideClinicalChangesForActor(actor, request, store, getRun).record.revision, decided.record.revision);
  assert.throws(() => decideClinicalChangesForActor(actor, { ...request, accepted_ids: [set.changes.find(item => item.id !== reason.id)!.id] }, store, getRun), status(409));
  assert.throws(() => decideClinicalChangesForActor({ ...actor, doctorId: "another" }, request, store, getRun), status(403));
  assert.ok(!proposeClinicalChangesForActor(actor, { encounter_id: a.record.id, run_id: run.run_id }, store, getRun).changes.some(item => item.id === reason.id));
});

test("opening A, B and A2 restores separate complete contexts, exact appointment and saved drafts", () => {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-context-")));
  const actor = getDemoClinicalActor();
  const a = openEncounter(resolveEncounterContext(actor, "LK-GIA-0456"), store);
  const b = openEncounter(resolveEncounterContext(actor, "000123"), store);
  const a2 = openEncounter(resolveEncounterContext(actor, "LK-GIA-0457"), store);
  assert.equal(new Set([a.record.id, b.record.id, a2.record.id]).size, 3);
  assert.equal(a.record.tuoi_thang_tai_kham, 576);
  assert.equal(b.record.tuoi_thang_tai_kham, 420);
  assert.equal(b.record.appointment_id, "000123");
  assert.equal(b.record.sinh_hieu.source_record_id, "000123");
  assert.equal(b.context.patientId, "GIA-000456");
  assert.equal(b.data.ca.ho_ten, "Trần Văn Mô Phỏng");
  // Ca 013 (khám mới) chỉ có điện tim đã có kết quả, chưa có lịch sử khám cũ.
  assert.deepEqual(b.record.ket_qua.map(row => [row.ten, row.ngay]), [["Điện tim thường", "2026-10-05"]]);
  assert.ok(b.record.lich_su.length > 0);
  assert.equal(b.snapshot.fields.ly_do?.value ?? "", "");
  assert.equal(b.snapshot.fields.di_ung_mo_ta?.value ?? "", "");
  assert.equal(a2.snapshot.fields.benh_su?.value ?? "", "");
  const revised = structuredClone(b.snapshot); revised.fields.loi_dan = { value: "Uống nước ấm", nguon: "bs" };
  const saved = saveClinicalForActor(actor, { id: b.record.id, expected_revision: 1, snapshot: revised }, store);
  const reopened = openEncounter(resolveEncounterContext(actor, "000123"), store);
  assert.equal(reopened.record.id, b.record.id);
  assert.equal(reopened.record.revision, saved.record.revision);
  assert.equal(reopened.snapshot.fields.loi_dan.value, "Uống nước ấm");
  assert.equal(readClinicalForActor(actor, b.record.id, store).data.ca.ho_ten, "Trần Văn Mô Phỏng");
  assert.equal(listOpenEncounters(actor, store).length, 3);
  assert.equal(listOpenEncounters(actor, store).find(row => row.id === b.record.id)?.patient_name, "Trần Văn Mô Phỏng");
  store.update(b.record.id, saved.record.revision, value => ({ ...value, status: "hoan_thanh_kham" }), actor.doctorId, new Date().toISOString());
  assert.equal(listOpenEncounters(actor, store).length, 2);
  assert.equal(openEncounter(resolveEncounterContext(actor, "000123"), store).record.status, "hoan_thanh_kham");
});

test("server actor rejects foreign read, save, approval, AI apply and corrupted patient bindings", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-context-auth-"));
  const store = new ClinicalRepository(directory);
  const actor = getDemoClinicalActor();
  const opened = openEncounter(resolveEncounterContext(actor, "000123"), store);
  const status = (expected: number) => (error: unknown) => error instanceof Error && "status" in error && error.status === expected;
  for (const foreign of [{ ...actor, doctorId: "another" }, { ...actor, facilityId: "another" }]) {
    assert.throws(() => readClinicalForActor(foreign, opened.record.id, store), status(403));
    assert.throws(() => saveClinicalForActor(foreign, { id: opened.record.id, expected_revision: 1, snapshot: opened.snapshot }, store), status(403));
    assert.throws(() => approveClinicalForActor(foreign, { id: opened.record.id, expected_revision: 1, acknowledged_issues: true }, store), status(403));
    assert.deepEqual(listOpenEncounters(foreign, store), []);
  }
  fs.writeFileSync(path.join(directory, `${opened.record.id}.json`), JSON.stringify({ ...opened.record, patient_id: "GIA-000123" }));
  assert.throws(() => readClinicalForActor(actor, opened.record.id, store), status(409));
  assert.throws(() => readClinical(opened.record.id, store), status(409));
  assert.throws(() => saveClinical({ id: opened.record.id, expected_revision: 1, snapshot: opened.snapshot }, store), status(409));
  assert.throws(() => openEncounter(resolveEncounterContext(actor, "000123"), store), status(409));
});

test("legacy first-save retries reuse A1 without silently overwriting it and reject a foreign stored owner", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clinical-legacy-open-"));
  const store = new ClinicalRepository(directory);
  const snapshot = { fields: { ly_do: { value: "First saved complaint", nguon: "bs" } }, chiDinh: [], trangThai: "Đang khám" };
  const first = saveClinical({ snapshot }, store);
  const retried = saveClinical({ snapshot: { ...snapshot, fields: { ly_do: { value: "Unversioned overwrite", nguon: "bs" } } } }, store);
  assert.equal(retried.record.id, first.record.id);
  assert.equal(retried.record.revision, 1);
  assert.equal(retried.record.phieu_kham.ly_do_kham, "First saved complaint");
  fs.writeFileSync(path.join(directory, `${first.record.id}.json`), JSON.stringify({ ...first.record, examiner_id: "foreign" }));
  assert.throws(() => saveClinical({ snapshot }, store), (error: unknown) => error instanceof Error && "status" in error && error.status === 403);
  assert.throws(() => saveClinical({ snapshot, ai_run_ids: [randomUUID()] }, store), (error: unknown) => error instanceof z.ZodError);
});

test("lưu phiếu không đổi trạng thái vòng đời: chờ/hoàn tất chỉ qua transition", () => {
  const store = new ClinicalRepository(fs.mkdtempSync(path.join(os.tmpdir(), "clinical-lifecycle-")));
  const actor = getDemoClinicalActor();
  const opened = openEncounter(resolveEncounterContext(actor, "LK-GIA-0456"), store);
  for (const trangThai of ["Hoàn thành khám", "Chờ KQ CLS"] as const) {
    const saved = saveClinicalForActor(actor, { id: opened.record.id, expected_revision: readClinicalForActor(actor, opened.record.id, store).record.revision, snapshot: { ...opened.snapshot, trangThai } }, store);
    assert.equal(saved.record.status, "dang_kham");
    assert.equal(saved.snapshot.trangThai, "Đang khám");
  }
});
