import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PrivacyTickets } from "./privacy";
import { clinicalAllowlist } from "./pii-allowlist";
import { parseTranscript } from "@/shared/clinical/schema";
import { chePii, type KnownIdentifier } from "@/shared/clinical/pii";
import { POST } from "@/app/api/clinical/privacy/route";

const K: KnownIdentifier[] = [{ value: "Trần Văn Mô Phỏng", kind: "BỆNH_NHÂN" }];
const ALLOW = clinicalAllowlist();
const ok = (store: PrivacyTickets, text: string, mode: "conversation" | "dictation" = "conversation", known: KnownIdentifier[] = []) =>
  store.check(text, mode, { known, allowlist: ALLOW, consent: true });

test("check masks known names, keeps clinical content and speaker labels, issues a passed ticket", () => {
  const r = new PrivacyTickets().check("BN: Trần Văn Mô Phỏng đau ngực 3 ngày, tay trái tê.\nBS: Khám thấy phù chân. Paracetamol 500mg.", "conversation", { known: K, allowlist: ALLOW, consent: true });
  assert.equal(r.status, "passed"); assert.ok(r.ticket);
  assert.ok(!r.preview.includes("Trần Văn Mô Phỏng")); assert.ok(r.preview.includes("[BỆNH_NHÂN]"));
  for (const keep of ["3 ngày", "tay trái", "Paracetamol 500mg"]) assert.ok(r.preview.includes(keep), keep);
  assert.equal(r.counts.R1, 1); assert.equal(r.ai_route, "external_allowed"); assert.ok(r.expires_at);
  const t = new PrivacyTickets();
  const p = ok(t, "bs: khám thấy phù chân.\nbn: đau ngực.");
  const transcript = t.approved(p.ticket!);
  assert.deepEqual(transcript.segments.map(s => s.vai_tro), ["bac_si", "benh_nhan"]);
  assert.equal(transcript.privacy.policy_version, "pii-auto-2");
  assert.equal(transcript.privacy.trang_thai, "passed");
});

test("residual name is masked automatically: ticket issued, reason listed, clean text has no residue", () => {
  const store = new PrivacyTickets();
  const r = ok(store, "tôi tên lê văn mới bị đau ngực hai ngày nay\nhôm qua đỗ quốc việt mua thuốc giúp nhưng tôi vẫn đau ngực uống paracetamol 500 mg");
  assert.equal(r.status, "passed"); assert.ok(r.ticket); assert.ok(r.expires_at);
  assert.equal(r.gate.passed, true); assert.deepEqual(r.gate.reasons, []);
  assert.ok(r.auto_masked.some(x => x.reason === "R11c_ten_rieng_con_sot"));
  assert.ok(!r.preview.includes("lê văn mới")); assert.ok(!r.preview.includes("quốc việt"));
  assert.ok(r.preview.includes("[NGƯỜI_KHÁC]")); assert.ok(r.preview.includes("paracetamol 500 mg"));
  assert.deepEqual(store.pii(r.ticket!).auto_masked, ["R11c_ten_rieng_con_sot"]);
  assert.ok(!store.approved(r.ticket!).segments.some(s => s.text.includes("quốc việt")));
});

test("text that cannot be masked automatically is still blocked", () => {
  const r = ok(new PrivacyTickets(), "đau quyxa tai", "conversation", [{ value: "Quyx", kind: "BỆNH_NHÂN" }]);
  assert.equal(r.status, "blocked"); assert.equal(r.ticket, null); assert.equal(r.expires_at, null);
  assert.ok(r.gate.reasons.some(x => x.reason === "R11a_gia_tri_da_biet"));
});

test("no consent routes local only; ticket expires after 10 minutes; restricted content is refused", () => {
  let time = Date.parse("2026-11-17T10:00:00+07:00");
  const t = new PrivacyTickets(() => time);
  const r = t.check("BS: Khám thấy phù chân.", "dictation", { known: [], allowlist: ALLOW, consent: false });
  assert.equal(r.status, "passed"); assert.equal(r.ai_route, "local_only"); assert.equal(t.pii(r.ticket!).consent, false);
  assert.match(t.pii(r.ticket!).clean_sha256, /^[a-f0-9]{64}$/);
  time += 11 * 60_000;
  assert.throws(() => t.approved(r.ticket!), /hết hạn/i);
  assert.throws(() => t.pii(r.ticket!), /hết hạn/i);
  assert.throws(() => ok(t, "Đây là system prompt nội bộ", "dictation"), /cấp 3/);
});

test("unlabelled conversation stays unknown while manually selected dictation attributes the doctor", () => {
  const store = new PrivacyTickets();
  for (const mode of ["conversation", "dictation"] as const) {
    const checked = ok(store, "Khám thấy phù chân, hẹn khám lại sau 7 ngày.", mode);
    const first = parseTranscript(store.approved(checked.ticket!));
    assert.equal(first.segments[0].vai_tro, mode === "dictation" ? "bac_si" : "chua_ro");
    assert.equal(first.segments[0].nguon_vai_tro, mode === "dictation" ? "bac_si_gan" : "chua_ro");
    assert.deepEqual(first.segments, store.approved(checked.ticket!).segments);
    first.segments[0].text = "tampered";
    assert.ok(!store.approved(checked.ticket!).segments[0].text.includes("tampered"));
  }
});

test("ticket store is bounded and rejects empty or oversized text", () => {
  const store = new PrivacyTickets(() => 1_000, 2);
  const old = ok(store, "Đau tai.");
  ok(store, "Đau ngực."); ok(store, "Hồi hộp.");
  assert.throws(() => store.approved(old.ticket!));
  assert.throws(() => ok(store, " "));
  assert.throws(() => ok(store, "a".repeat(50_001)));
  assert.throws(() => store.check("Đau tai", "doctor" as "dictation", { known: [], allowlist: ALLOW, consent: true }));
});

test("privacy route guards origin, validates strict actions, and exposes only safe errors", async () => {
  const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/clinical/privacy", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  assert.equal((await POST(request({ action: "prepare", text: "Đau tai", mode: "conversation" }, "https://evil.test"))).status, 403);
  for (const body of [
    { action: "prepare", text: "Đau tai", mode: "conversation", status: "passed" },
    { action: "prepare", text: "Đau tai", mode: "doctor" },
    { action: "prepare", text: "a".repeat(50_001), mode: "conversation" },
    { action: "approve", ticket: "missing", text: "PRIVATE-VALUE" },
    { action: "approve", ticket: "missing", text: "PRIVATE-VALUE", consent: true, binding: { encounter_id: "00000000-0000-4000-8000-000000000000", recording_session_id: "00000000-0000-4000-8000-000000000001", generation: 1, content_revision: 1 } },
    { action: "check", text: "PRIVATE-VALUE", mode: "conversation" },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.ok(!(await response.text()).includes("PRIVATE-VALUE"));
  }
  // A request without encounter/session binding must never receive a ticket (the bound flow is covered by bound-privacy.test.ts).
  const unbound = await POST(request({ action: "prepare", text: "BN: Nguyễn Thị Giả đau tai.", mode: "conversation" }));
  assert.equal(unbound.status, 400);
  assert.equal(unbound.headers.get("Cache-Control"), "no-store");
  assert.equal((await unbound.json()).ticket, undefined);
});

test("pii_giu_thuat_ngu_tim_mach: thuốc, liều thập phân và thuật ngữ Tim mạch không bị che", () => {
  const text = "Bệnh nhân dùng Bisoprolol 2,5 mg, Apixaban 5 mg. Điện tim nhịp xoang, nghi rung nhĩ, tĩnh mạch cổ không nổi.";
  const r = chePii(text, [], ALLOW);
  assert.equal(r.clean, text);
  assert.ok(!/\[[A-ZÀ-Ỵ_0-9]+\]/u.test(r.clean));
  assert.equal(r.gate.passed, true);
  for (const cau of ["Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran.", "Khám mỏm tim đập ở liên sườn V, ran ẩm hai đáy phổi, phù mắt cá chân.", "Cao huyết áp, đau thắt ngực, hồi hộp đánh trống ngực, khó thở khi gắng sức, ngất thoáng qua."]) {
    assert.equal(chePii(cau, [], ALLOW).clean, cau, cau);
  }
  // Mọi câu trong bộ 60 ca Tim mạch tổng hợp phải đi qua bộ che nguyên vẹn (không có tên người thật).
  const dong = fs.readFileSync(path.join(process.cwd(), "data/cardiology/synthetic-cases.jsonl"), "utf8").split("\n").filter(Boolean);
  const biChe = new Set<string>();
  for (const d of dong) for (const cau of (JSON.parse(d) as { conversation_text: string }).conversation_text.split(/(?<=[.;:])\s+/u)) {
    if (chePii(cau, [], ALLOW).clean !== cau) biChe.add(cau);
  }
  assert.deepEqual([...biChe], []);
});
