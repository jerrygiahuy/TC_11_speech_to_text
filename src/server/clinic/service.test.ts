import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { ClinicHttpError } from "./errors";
import type { ClinicActor } from "./ports";
import { createClinicRepository } from "./repository";
import { loadAppointment, loadDashboard, loadPatientPage } from "./service";

const actor: ClinicActor = { doctor_id: "BS01", facility_id: "CS01" };
const NOW = () => "2026-11-14T03:00:00.000Z";
const deps = { now: NOW };

function status(fn: () => unknown): number | string {
  try {
    fn();
    return "ok";
  } catch (e) {
    return e instanceof ClinicHttpError ? e.status : "other";
  }
}

test("dashboard_scoped_totals_and_carryover", () => {
  const d = loadDashboard(actor, "2026-11-14", deps);
  assert.equal(d.date, "2026-11-14");
  assert.equal(d.timezone, "Asia/Ho_Chi_Minh");
  assert.deepEqual(d.doctor, { id: "BS01", name: "BS. Mẫu Một" });
  assert.equal(d.facility.id, "CS01");
  assert.equal(d.fetchedAt, "2026-11-14T03:00:00.000Z");
  assert.deepEqual(d.totals, {
    total: 8,
    completed: 2,
    remaining: 4,
    unfinished: 2,
    cancelled: 1,
    other: 1,
    unknown: 0,
  });
  const ids = d.appointments.map((i) => i.appointment.id);
  assert.ok(!ids.includes("LK-000011") && !ids.includes("LK-000012"));
  assert.deepEqual(d.carriedOpenItems.map((i) => i.appointment.id), ["LK-000009"]);
  const first = d.appointments[0];
  assert.equal(first.patient.id, "000123");
  assert.equal(first.encounter_id, "enc-LK-000001");
  assert.equal(first.status, "completed");
  assert.equal(first.doctor_name, "BS. Mẫu Một");
});

test("dashboard_has_prior_encounter_excludes_own_encounter", () => {
  const d = loadDashboard(actor, "2026-11-14", deps);
  const by = (id: string) => d.appointments.find((i) => i.appointment.id === id)!;
  assert.equal(by("LK-000005").has_prior_encounter, true); // 000123 còn phiếu khác
  assert.equal(by("LK-000003").has_prior_encounter, false); // 000125 chưa có phiếu nào
  assert.equal(by("LK-000002").has_prior_encounter, true); // 000124 có phiếu cũ trước 08:30 (phiếu LK-000006 lúc 13:30 không tính)
});

test("has_prior_false_when_only_own_encounter", () => {
  const repo = createClinicRepository({
    source: {
      listByFacility: (facilityId) => [
        {
          id: "enc-only",
          appointment_id: "LK-000005",
          patient_id: "000123",
          facility_id: facilityId,
          doctor_id: "BS01",
          encounter_at: "2026-11-14T10:00:00+07:00",
          status: "dang_kham",
          summary: null,
        },
      ],
    },
  });
  const item = loadAppointment(actor, "LK-000005", { repo, now: NOW });
  assert.equal(item.has_prior_encounter, false);
  assert.equal(item.status, "in_progress");
});

function encounter(over: Record<string, unknown>) {
  return {
    id: "enc-x",
    appointment_id: null,
    patient_id: "000123",
    facility_id: "CS01",
    doctor_id: "BS01",
    encounter_at: "2026-11-14T13:30:00+07:00",
    status: "hoan_thanh_kham",
    summary: null,
    ...over,
  };
}

test("has_prior_only_counts_encounters_before_appointment_start", () => {
  const mk = (at: string) =>
    createClinicRepository({ source: { listByFacility: () => [encounter({ encounter_at: at })] } });
  // LK-000001 bắt đầu 08:00 ngày 14: phiếu 13:30 cùng ngày là sau, không phải lượt trước.
  assert.equal(loadAppointment(actor, "LK-000001", { repo: mk("2026-11-14T13:30:00+07:00"), now: NOW }).has_prior_encounter, false);
  assert.equal(loadAppointment(actor, "LK-000001", { repo: mk("2026-11-13T13:30:00+07:00"), now: NOW }).has_prior_encounter, true);
});

test("encounter_with_mismatched_patient_facility_or_doctor_is_store_error", () => {
  for (const over of [{ patient_id: "000124" }, { doctor_id: "BS02" }]) {
    const repo = createClinicRepository({
      source: { listByFacility: () => [encounter({ appointment_id: "LK-000001", ...over })] },
    });
    assert.equal(status(() => loadAppointment(actor, "LK-000001", { repo, now: NOW })), 500, JSON.stringify(over));
    assert.equal(status(() => loadDashboard(actor, "2026-11-14", { repo, now: NOW })), 500);
  }
});

test("dashboard_empty_day_is_real_zero_but_invalid_date_is_400", () => {
  const d = loadDashboard(actor, "2026-12-01", deps);
  assert.equal(d.totals.total, 0);
  assert.equal(status(() => loadDashboard(actor, "2026-02-30", deps)), 400);
  assert.equal(status(() => loadDashboard(actor, "hôm nay", deps)), 400);
});

test("dashboard_store_error_propagates_not_zero_totals", () => {
  const repo = createClinicRepository({ dataDir: path.join(process.cwd(), "khong-ton-tai") });
  assert.equal(status(() => loadDashboard(actor, "2026-11-14", { repo, now: NOW })), 500);
});

test("dashboard_other_actor_sees_only_own", () => {
  const d = loadDashboard({ doctor_id: "BS02", facility_id: "CS01" }, "2026-11-14", deps);
  assert.deepEqual(d.appointments.map((i) => i.appointment.id), ["LK-000011"]);
  const e = loadDashboard({ doctor_id: "BS03", facility_id: "CS02" }, "2026-11-14", deps);
  assert.deepEqual(e.appointments.map((i) => i.appointment.id), ["LK-000012"]);
});

test("appointment_scope_404", () => {
  assert.equal(loadAppointment(actor, "LK-000001", deps).appointment.patient_id, "000123");
  assert.equal(status(() => loadAppointment(actor, "LK-000011", deps)), 404); // bác sĩ khác
  assert.equal(status(() => loadAppointment(actor, "LK-000012", deps)), 404); // cơ sở khác
  assert.equal(status(() => loadAppointment(actor, "LK-999999", deps)), 404);
});

test("patient_page_history_is_saved_encounters_sorted_and_excludes_selected", () => {
  const p = loadPatientPage(actor, "000123", "LK-000005", deps);
  assert.equal(p.patient.id, "000123");
  assert.equal(p.selectedAppointmentId, "LK-000005");
  assert.deepEqual(
    p.history.map((h) => h.id),
    ["enc-LK-000001", "enc-demo-000123-a", "enc-demo-000123-b"],
  );
  const a = p.history.find((h) => h.id === "enc-demo-000123-a")!;
  assert.equal(a.doctor_name, "BS. Mẫu Hai", "gồm phiếu bác sĩ khác cùng cơ sở");
  assert.equal(a.status, "completed");
  // Không bịa: thiếu summary thì dùng lý do khám của lịch, không có lịch thì nói rõ chưa có.
  assert.equal(
    p.history.find((h) => h.id === "enc-LK-000001")!.summary,
    "Khám nội soi tai mũi họng theo hẹn (dữ liệu giả)",
  );
  assert.equal(p.history.find((h) => h.id === "enc-demo-000123-b")!.summary, "Chưa có tóm tắt");
  assert.deepEqual(p.eligibleAppointments.map((i) => i.appointment.id), ["LK-000005"]);
});

test("patient_page_without_selection_includes_all_saved", () => {
  const p = loadPatientPage(actor, "000123", undefined, deps);
  assert.equal(p.selectedAppointmentId, null);
  assert.equal(p.history.length, 4);
  assert.equal(p.history[0].id, "enc-LK-000005"); // 10:00 ngày 14/11 mới nhất
});

test("patient_page_scope_404", () => {
  assert.equal(status(() => loadPatientPage(actor, "000127", undefined, deps)), 404); // cơ sở khác
  assert.equal(status(() => loadPatientPage(actor, "999999", undefined, deps)), 404); // PID giả
  assert.equal(status(() => loadPatientPage(actor, "000123", "LK-000003", deps)), 404); // lịch của người khác
  assert.equal(status(() => loadPatientPage(actor, "000125", "LK-000011", deps)), 404); // bác sĩ khác
  assert.equal(status(() => loadPatientPage(actor, "000123", "LK-999999", deps)), 404);
});

test("reading_never_writes_files", () => {
  const dir = path.join(process.cwd(), "data", "clinic");
  const snap = () => readdirSync(dir).map((f) => [f, readFileSync(path.join(dir, f), "utf8")]);
  const before = snap();
  loadDashboard(actor, "2026-11-14", deps);
  loadAppointment(actor, "LK-000005", deps);
  loadPatientPage(actor, "000123", "LK-000005", deps);
  assert.deepEqual(snap(), before);
});
