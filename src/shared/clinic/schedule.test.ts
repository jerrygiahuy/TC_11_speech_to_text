/* eslint-disable no-restricted-imports -- file test chỉ chạy bằng node:test, không vào bundle trình duyệt */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  AppointmentsFixtureSchema,
  ClinicDateSchema,
  PatientsFixtureSchema,
  AppointmentSchema,
  DisplayStatusSchema,
} from "./schema";
import {
  ageAt,
  clinicPeriod,
  displayStatus,
  selectDayAppointments,
  sortAppointments,
  summarizeAppointments,
  toClinicDate,
} from "./schedule";
import type { Appointment, AppointmentItem, DisplayStatus } from "./types";

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data", "clinic", name), "utf8"));
}

const patients = PatientsFixtureSchema.parse(readFixture("patients.json"));
const rows = AppointmentsFixtureSchema.parse(readFixture("appointments.json"));

// Fixture chỉ có lịch + bệnh nhân; trạng thái Encounter giả nằm ở trường `encounter_status`.
function fixtureItems(): AppointmentItem[] {
  return rows.map((row) => {
    const { encounter_status, ...appointment } = row;
    const patient = patients.find((p) => p.id === appointment.patient_id);
    assert.ok(patient, `thiếu bệnh nhân ${appointment.patient_id}`);
    return {
      appointment,
      patient,
      doctor_name: `Bác sĩ ${appointment.doctor_id}`,
      encounter_id: encounter_status === null ? null : `enc-${appointment.id}`,
      status: displayStatus(appointment.scheduling_status, encounter_status),
      has_prior_encounter: false,
    };
  });
}

function dayOne(items: AppointmentItem[]): AppointmentItem[] {
  return items.filter(
    (i) =>
      i.appointment.doctor_id === "BS01" &&
      i.appointment.facility_id === "CS01" &&
      toClinicDate(i.appointment.starts_at) === "2026-11-14",
  );
}

function make(id: string, startsAt: string, status: DisplayStatus): AppointmentItem {
  const base = fixtureItems()[0];
  return {
    ...base,
    appointment: { ...base.appointment, id, starts_at: startsAt },
    status,
  };
}

test("counts_fixture_and_subset", () => {
  const items = dayOne(fixtureItems());
  assert.deepEqual(summarizeAppointments(items), {
    total: 8,
    completed: 2,
    remaining: 4,
    unfinished: 2,
    cancelled: 1,
    other: 1,
    unknown: 0,
  });
  const remainingIds = items
    .filter((i) => ["scheduled", "in_progress", "waiting_results"].includes(i.status))
    .map((i) => i.appointment.id);
  const unfinishedIds = items
    .filter((i) => i.status === "in_progress" || i.status === "waiting_results")
    .map((i) => i.appointment.id);
  assert.deepEqual(unfinishedIds, ["LK-000005", "LK-000006"]);
  for (const id of unfinishedIds) assert.ok(remainingIds.includes(id));
  const t = summarizeAppointments(items);
  assert.equal(t.total, t.completed + t.remaining + t.cancelled + t.other + t.unknown);
});

test("counts_empty_unknown_and_all_terminal", () => {
  assert.deepEqual(summarizeAppointments([]), {
    total: 0, completed: 0, remaining: 0, unfinished: 0, cancelled: 0, other: 0, unknown: 0,
  });
  const base = "2026-11-14T08:00:00+07:00";
  const unk = summarizeAppointments([make("A", base, "unknown")]);
  assert.equal(unk.unknown, 1);
  assert.equal(unk.total, 1);
  const terminals = summarizeAppointments([
    make("A", base, "admitted"),
    make("B", base, "emergency_transfer"),
    make("C", base, "facility_transfer"),
  ]);
  assert.equal(terminals.completed, 0);
  assert.equal(terminals.remaining, 0);
  assert.equal(terminals.other, 3);
  assert.equal(terminals.total, 3);
});

test("local_day_noon_and_carryover", () => {
  assert.equal(toClinicDate("2026-11-13T17:00:00Z"), "2026-11-14");
  assert.equal(toClinicDate("2026-11-13T16:59:59Z"), "2026-11-13");
  assert.equal(toClinicDate("2026-11-14T08:00:00+07:00"), "2026-11-14");
  assert.equal(clinicPeriod("2026-11-14T04:59:59Z"), "morning");
  assert.equal(clinicPeriod("2026-11-14T05:00:00Z"), "afternoon");
  assert.equal(clinicPeriod("2026-11-13T17:00:00Z"), "morning"); // 00:00 VN
  assert.equal(clinicPeriod("2026-11-14T16:59:59Z"), "afternoon"); // 23:59:59 VN
  assert.throws(() => toClinicDate("2026-11-14T08:00:00"), RangeError);

  const all = fixtureItems().filter((i) => i.appointment.doctor_id === "BS01");
  const before = JSON.stringify(all);
  const { appointments, carriedOpenItems } = selectDayAppointments(all, "2026-11-14");
  assert.equal(JSON.stringify(all), before, "không mutate input");
  assert.equal(appointments.length, 8);
  assert.ok(!appointments.some((i) => i.appointment.id === "LK-000009"));
  assert.deepEqual(carriedOpenItems.map((i) => i.appointment.id), ["LK-000009"]);
  assert.ok(!carriedOpenItems.some((i) => i.appointment.id === "LK-000010"), "lịch tương lai không carry");
  // ca hôm qua đã hoàn thành thì không carry
  const done = make("D", "2026-11-13T09:00:00+07:00", "completed");
  assert.deepEqual(selectDayAppointments([done], "2026-11-14").carriedOpenItems, []);
  // 23:30 VN ngày 13 = 16:30Z vẫn là ngày 13 -> carry; 00:30 VN ngày 14 = 17:30Z -> thuộc ngày 14
  const late = make("E", "2026-11-13T16:30:00Z", "waiting_results");
  assert.equal(selectDayAppointments([late], "2026-11-14").carriedOpenItems.length, 1);
  assert.equal(selectDayAppointments([late], "2026-11-14").appointments.length, 0);
  const early = make("F", "2026-11-13T17:30:00Z", "waiting_results");
  assert.equal(selectDayAppointments([early], "2026-11-14").carriedOpenItems.length, 0);
  assert.equal(selectDayAppointments([early], "2026-11-14").appointments.length, 1);
});

test("carry_unknown_with_encounter_but_not_unknown_without", () => {
  // Xung đột lịch hủy + Encounter đang khám của ngày trước: vẫn mang sang, không vào N hôm nay.
  const conflict = { ...make("G", "2026-11-13T09:00:00+07:00", "unknown"), encounter_id: "enc-G" };
  const r = selectDayAppointments([conflict], "2026-11-14");
  assert.deepEqual(r.carriedOpenItems.map((i) => i.appointment.id), ["G"]);
  assert.equal(r.appointments.length, 0);
  // unknown không có Encounter (lịch hủy thường) thì không carry.
  const plain = { ...make("H", "2026-11-13T09:00:00+07:00", "unknown"), encounter_id: null };
  assert.equal(selectDayAppointments([plain], "2026-11-14").carriedOpenItems.length, 0);
});

test("conflicting_cancelled_active_is_unknown", () => {
  assert.equal(displayStatus("cancelled", "dang_kham"), "unknown");
  assert.equal(displayStatus("cancelled", "cho_kq_cls"), "unknown");
  assert.equal(displayStatus("cancelled", "hoan_thanh_kham"), "unknown");
  assert.equal(displayStatus("cancelled", null), "cancelled");
  assert.equal(displayStatus("scheduled", null), "scheduled");
  assert.equal(displayStatus("scheduled", "khong_kham"), "cancelled");
  assert.equal(displayStatus("scheduled", "dang_kham"), "in_progress");
  assert.equal(displayStatus("scheduled", "cho_kq_cls"), "waiting_results");
  assert.equal(displayStatus("scheduled", "hoan_thanh_kham"), "completed");
  assert.equal(displayStatus("scheduled", "nhap_noi_tru"), "admitted");
  assert.equal(displayStatus("scheduled", "chuyen_cap_cuu"), "emergency_transfer");
  assert.equal(displayStatus("scheduled", "chuyen_cskcb_bhyt"), "facility_transfer");
  assert.equal(displayStatus("scheduled", "gia_tri_la"), "unknown");
});

test("stable_order_and_age", () => {
  const items = dayOne(fixtureItems());
  const shuffled = [items[3], items[7], items[2], items[0], items[5], items[1], items[6], items[4]];
  const before = JSON.stringify(shuffled);
  const sorted = sortAppointments(shuffled);
  assert.equal(JSON.stringify(shuffled), before, "không mutate input");
  assert.notEqual(sorted, shuffled);
  assert.deepEqual(
    sorted.map((i) => i.appointment.id),
    ["LK-000001", "LK-000002", "LK-000003", "LK-000004", "LK-000005", "LK-000006", "LK-000007", "LK-000008"],
  );
  // trùng giờ: so sánh chuỗi, giữ số 0 đầu
  const tie = sortAppointments([
    make("000124", "2026-11-14T09:00:00+07:00", "scheduled"),
    make("000123", "2026-11-14T09:00:00+07:00", "scheduled"),
  ]);
  assert.deepEqual(tie.map((i) => i.appointment.id), ["000123", "000124"]);
  assert.equal(items.find((i) => i.appointment.patient_id === "000123")?.patient.id, "000123");

  assert.equal(ageAt("2000-11-15", "2026-11-14"), "25 tuổi");
  assert.equal(ageAt("2000-11-15", "2026-11-15"), "26 tuổi");
  assert.equal(ageAt("2026-09-14", "2026-11-14"), "2 tháng");
  assert.equal(ageAt("2025-11-15", "2026-11-14"), "11 tháng");
  assert.equal(ageAt("2025-11-14", "2026-11-14"), "1 tuổi");
  assert.equal(ageAt(null, "2026-11-14"), "Chưa có thông tin");
  // Ngày sinh tương lai: không tạo tuổi âm, trả "Chưa có thông tin"
  assert.equal(ageAt("2027-01-01", "2026-11-14"), "Chưa có thông tin");

  assert.equal(ClinicDateSchema.safeParse("2026-02-30").success, false);
  assert.equal(ClinicDateSchema.safeParse("2026-02-28").success, true);
  assert.equal(ClinicDateSchema.safeParse("2024-02-29").success, true);
  assert.equal(ClinicDateSchema.safeParse("2026-2-3").success, false);
  const good: Appointment = {
    id: "X", facility_id: "CS01", patient_id: "000123", doctor_id: "BS01",
    starts_at: "2026-11-14T08:00:00+07:00", ends_at: null, content: "", scheduling_status: "scheduled",
  };
  assert.equal(AppointmentSchema.safeParse(good).success, true);
  assert.equal(AppointmentSchema.safeParse({ ...good, starts_at: "2026-11-14T08:00:00" }).success, false);
  assert.equal(AppointmentSchema.safeParse({ ...good, scheduling_status: "in_progress" }).success, false);
  assert.equal(DisplayStatusSchema.safeParse("la_hoac").success, false);
});

test("fixture_covers_required_cases", () => {
  assert.equal(new Set(rows.map((r) => r.doctor_id)).size >= 2, true);
  assert.equal(new Set(rows.map((r) => r.facility_id)).size >= 2, true);
  assert.ok(patients.some((p) => p.date_of_birth === null));
  assert.ok(patients.some((p) => p.id.startsWith("0")));
  assert.ok(patients.some((p) => p.insurance.bhyt.enrolled && !p.insurance.bao_lanh.enrolled));
  assert.ok(patients.some((p) => p.insurance.bao_lanh.enrolled));
});
