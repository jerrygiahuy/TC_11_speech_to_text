import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { createWalkInContext, getDemoClinicalActor, resolveEncounterContext, listEncounterContexts, validateEncounterContexts } from "./encounter-context";
import { loadEformData } from "@/server/du-lieu/eform";
import { ClinicalError } from "./repository";

test("server contexts replace complete patient data and preserve leading zero appointment", () => {
  const actor = getDemoClinicalActor();
  const a = resolveEncounterContext(actor, "LK-GIA-0456");
  const b = resolveEncounterContext(actor, "000123");
  assert.equal(b.appointmentId, "000123");
  assert.equal(b.patientId, "GIA-000456");
  assert.equal(b.data.ca.ho_ten, "Trần Văn Mô Phỏng");
  assert.ok(b.data.ca._ghi_chu.includes("SYN-CARDIO-007"), "lịch 000123 (đánh trống ngực) mang context ca đánh trống ngực");
  assert.equal(b.data.ca.gioi_tinh, "Nam");
  assert.equal(b.data.ca.canh_bao_di_ung, "");
  assert.deepEqual(b.data.ca.lich_su.di_ung, []);
  assert.ok(b.data.ca.lich_su.tien_su_ban_than.length > 0);
  assert.deepEqual(b.data.ca.xet_nghiem, []);
  assert.deepEqual(b.data.ca.chan_doan_hinh_anh, []);
  assert.deepEqual(b.data.ca.can_lam_sang.map(day => day.muc.map(item => item.ten)), [["Điện tim thường"]]);
  assert.notDeepEqual(b.data.ca.sinh_hieu, a.data.ca.sinh_hieu);
  assert.equal(b.data.ca.gia_tri.di_ung_mo_ta, undefined);
  assert.equal(resolveEncounterContext(actor, "LK-GIA-0457").data.ca.gia_tri.benh_su, undefined);
  b.data.ca.ho_ten = "changed";
  assert.equal(resolveEncounterContext(actor, "000123").data.ca.ho_ten, "Trần Văn Mô Phỏng");
  assert.deepEqual(loadEformData().ca, a.data.ca);
  assert.deepEqual(listEncounterContexts(actor).map(item => item.appointmentId), ["000123", "LK-GIA-0457", "LK-GIA-0458", "LK-GIA-0461", "LK-GIA-0456"]); // SYN-CARDIO-013, 039, rồi 013 (GIA-000789), 049 (GIA-000456), 001 (GIA-000123: 001 sau 039 nên là context mới nhất)
});

test("ngu_canh_tim_mach_mac_dinh", () => {
  const contexts = listEncounterContexts(getDemoClinicalActor());
  const macDinh = contexts.find(item => item.appointmentId === "LK-GIA-0456")!;
  assert.ok(macDinh);
  assert.equal(macDinh.data.ca.phong_kham, "PK Nội tim mạch");
  for (const context of contexts) {
    assert.equal(context.data.ca.co_so, "OPD - Trung tâm Tim mạch");
    assert.equal(context.data.ca.phong_kham, "PK Nội tim mạch");
  }
  const ca = macDinh.data.ca;
  assert.equal(ca.sinh_hieu.ha_tam_thu, 148);
  assert.equal(ca.lich_su.di_ung.some(row => row.thong_tin.includes("Penicillin") && row.loai_phieu === "Phiếu Đánh giá ban đầu ngoại trú"), true);
  assert.equal(ca.lich_su.thuoc[0].ten_thuoc, "Amlodipine");
});

test("sinh_hieu_null_hop_le", () => {
  const fixture = JSON.parse(fs.readFileSync("data/eform/encounter-contexts.json", "utf8"));
  fixture.contexts[0].ca.sinh_hieu.nhiet_do = null;
  fixture.contexts[0].ca.sinh_hieu.bmi = null;
  assert.doesNotThrow(() => validateEncounterContexts(fixture));
});

test("context authorization uses server doctor and facility, never patient identifiers", () => {
  const status = (expected: number) => (error: unknown) => error instanceof ClinicalError && error.status === expected;
  assert.throws(() => resolveEncounterContext({ doctorId: "other", facilityId: "facility-prototype" }, "000123"), status(403));
  assert.throws(() => resolveEncounterContext({ doctorId: "user_bs01", facilityId: "other" }, "000123"), status(403));
  assert.throws(() => resolveEncounterContext(getDemoClinicalActor(), "123"), status(404));
  assert.deepEqual(listEncounterContexts({ doctorId: "other", facilityId: "facility-prototype" }), []);
});

test("fixture validation rejects identity corruption, duplicate appointments and inconsistent patient demographics", () => {
  const fixture = () => JSON.parse(fs.readFileSync("data/eform/encounter-contexts.json", "utf8"));
  const corrupt = fixture(); corrupt.contexts[0].ca.pid = "GIA-000123";
  assert.throws(() => validateEncounterContexts(corrupt));
  const duplicate = fixture(); duplicate.contexts.push(structuredClone(duplicate.contexts[0]));
  assert.throws(() => validateEncounterContexts(duplicate));
  const age = fixture(); age.contexts[0].age_months = 0;
  assert.throws(() => validateEncounterContexts(age));
  const identity = fixture(); identity.contexts[4].ca.ho_ten = "Another name";
  assert.throws(() => validateEncounterContexts(identity));
  const otherFacility = fixture(); const other = structuredClone(otherFacility.contexts[0]); other.facility_id = "second";
  otherFacility.contexts.push(other);
  assert.doesNotThrow(() => validateEncounterContexts(otherFacility));
});

test("khám mới tạo ngữ cảnh riêng cho đúng bệnh nhân, mỗi lần một mã, và từ chối bệnh nhân không có hồ sơ mẫu", () => {
  const actor = getDemoClinicalActor();
  const made: string[] = [];
  try {
    const a = createWalkInContext(actor, "GIA-000123");
    const b = createWalkInContext(actor, "GIA-000123");
    made.push(a.appointmentId, b.appointmentId);
    assert.notEqual(a.appointmentId, b.appointmentId);
    assert.equal(a.patientId, "GIA-000123");
    assert.deepEqual(a.data.ca.gia_tri, {});
    assert.equal(resolveEncounterContext(actor, a.appointmentId).patientId, "GIA-000123");
    assert.throws(() => createWalkInContext(actor, "GIA-KHONG-CO"), (error: unknown) => error instanceof ClinicalError && error.status === 409);
  } finally {
    for (const id of made) fs.rmSync(`data/clinical/walk-in-contexts/${id}.json`, { force: true });
  }
});

test("lich_hen_dung_10_ly_do_khac_nhau_theo_05", () => {
  const lich = JSON.parse(fs.readFileSync("data/clinic/appointments.json", "utf8")) as { content: string }[];
  const lyDo = ["tái khám tăng huyết áp", "đánh trống ngực từng cơn", "khó chịu vùng ngực khi gắng sức", "khó thở khi gắng sức", "tái khám rối loạn lipid máu", "tái khám sau can thiệp mạch vành", "tái khám suy tim", "tái khám rối loạn nhịp", "một lần ngất thoáng qua", "đánh giá tim mạch trước thủ thuật"];
  assert.equal(lich.length, 10);
  for (const item of lyDo) assert.equal(lich.filter(row => row.content.toLocaleLowerCase("vi").includes(item)).length, 1, item);
});
