import assert from "node:assert/strict";
import { test } from "node:test";
import { ClinicHttpError } from "@/server/clinic/errors";
import { handleClinicRequest } from "@/server/clinic/http";
import { GET as getAppointment } from "./appointments/[appointmentId]/route";
import { GET as getDashboard } from "./dashboard/route";
import { GET as getPatient } from "./patients/[patientId]/route";

const BASE = "http://localhost:3000";
// Next dựng request.url từ hostname cấu hình của server, nên guard chỉ tin header Host/Origin/Sec-Fetch-Site.
const req = (p: string, headers?: Record<string, string>) =>
  new Request(BASE + p, { headers: { Host: "localhost:3000", ...headers } });
const apptCtx = (appointmentId: string) => ({ params: Promise.resolve({ appointmentId }) });
const patCtx = (patientId: string) => ({ params: Promise.resolve({ patientId }) });

async function check(res: Response, status: number) {
  assert.equal(res.status, status);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  return (await res.json()) as Record<string, unknown>;
}

test("dashboard_ok_and_no_ai_fields", async () => {
  const res = await getDashboard(req("/api/clinic/dashboard?date=2026-11-14"));
  const text = JSON.stringify(await check(res, 200));
  assert.match(text, /"total":8/);
  assert.doesNotMatch(text, /transcript|ai_runs|ai_fill|"ai_/i);
});

test("dashboard_default_date_is_today_in_vietnam", async () => {
  const before = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const body = await check(await getDashboard(req("/api/clinic/dashboard")), 200);
  const after = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  assert.ok(body.date === before || body.date === after);
});

test("dashboard_bad_date_400", async () => {
  for (const d of ["2026-02-30", "abc", "2026-1-1", ""]) {
    await check(await getDashboard(req(`/api/clinic/dashboard?date=${d}`)), 400);
  }
});

test("remote_or_cross_origin_403", async () => {
  // URL luôn là local (giống Next thật); chỉ header của trình duyệt quyết định.
  await check(await getDashboard(req("/api/clinic/dashboard", { Host: "example.com" })), 403);
  await check(await getDashboard(req("/api/clinic/dashboard", { Origin: "http://evil.example" })), 403);
  await check(await getDashboard(req("/api/clinic/dashboard", { Host: "evil.example" })), 403);
  await check(await getAppointment(req("/x", { Host: "192.168.1.5:3000" }), apptCtx("LK-000001")), 403);
  await check(await getDashboard(req("/api/clinic/dashboard", { Origin: "http://localhost:3999" })), 403);
  await check(await getDashboard(req("/api/clinic/dashboard", { "Sec-Fetch-Site": "cross-site" })), 403);
  await check(await getDashboard(new Request(BASE + "/api/clinic/dashboard")), 403); // thiếu Host
  await check(await getDashboard(req("/api/clinic/dashboard?date=2026-11-14", { Origin: BASE })), 200);
  await check(await getDashboard(req("/api/clinic/dashboard", { "Sec-Fetch-Site": "same-origin" })), 200);
  await check(await getDashboard(req("/api/clinic/dashboard", { Host: "[::1]:3000" })), 200);
  await check(await getDashboard(req("/api/clinic/dashboard", { Host: "127.0.0.1:3000" })), 200);
});

test("appointment_ok_and_not_found_scope", async () => {
  const ok = await check(await getAppointment(req("/x"), apptCtx("LK-000001")), 200);
  assert.equal((ok.appointment as { id: string }).id, "LK-000001");
  await check(await getAppointment(req("/x"), apptCtx("LK-000011")), 404);
  await check(await getAppointment(req("/x"), apptCtx("LK-000012")), 404);
  await check(await getAppointment(req("/x"), apptCtx("khong-co")), 404);
});

test("patient_ok_not_found_and_selected_scope", async () => {
  const ok = await check(await getPatient(req("/x?appointment_id=LK-000005"), patCtx("000123")), 200);
  assert.equal(ok.selectedAppointmentId, "LK-000005");
  assert.equal((ok.patient as { id: string }).id, "000123");
  assert.doesNotMatch(JSON.stringify(ok), /transcript|ai_runs/i);
  await check(await getPatient(req("/x"), patCtx("000127")), 404);
  await check(await getPatient(req("/x"), patCtx("999999")), 404);
  await check(await getPatient(req("/x?appointment_id=LK-000003"), patCtx("000123")), 404);
  await check(await getPatient(req("/x?appointment_id="), patCtx("000123")), 400);
});

test("store_error_is_500_without_fake_totals", async () => {
  const res = await handleClinicRequest(req("/x"), () => {
    throw new Error("đĩa hỏng: chi tiết nội bộ");
  });
  const body = await check(res, 500);
  assert.equal(typeof body.error, "string");
  assert.ok(!("totals" in body));
  assert.doesNotMatch(JSON.stringify(body), /đĩa hỏng/);
  const e = await handleClinicRequest(req("/x"), () => {
    throw new ClinicHttpError(404, "Không tìm thấy.");
  });
  await check(e, 404);
});
