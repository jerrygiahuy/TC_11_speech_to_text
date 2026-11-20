import assert from "node:assert/strict";
import { test } from "node:test";
import { chePii, PII_POLICY_VERSION, redactPii, type KnownIdentifier } from "./index";
import { aiRouteFor, checkResidualPii, maskResidualPii } from "./gate";
import { buildAuditEntry } from "./audit";

const none: KnownIdentifier[] = [];
const noAllow: ReadonlySet<string> = new Set();
const reasons = (s: string, known = none, allow = noAllow) => checkResidualPii(s, known, allow).reasons.map((r) => r.reason);

test("R11a: giá trị đã biết còn sót (không dấu) bị chặn", () => {
  const r = checkResidualPii("bệnh nhân tên nguyen thi gia đau ngực", [{ value: "Nguyễn Thị Giả", kind: "BỆNH_NHÂN" }], noAllow);
  assert.equal(r.passed, false);
  assert.ok(r.reasons.some((x) => x.reason === "R11a_gia_tri_da_biet"));
  assert.ok(r.reasons.every((x) => x.excerpt.length <= 40));
});

test("R11a: giá trị ngắn (<= 2 ký tự) bị bỏ qua", () => {
  assert.equal(checkResidualPii("đau ngực lê", [{ value: "Lê", kind: "BỆNH_NHÂN" }], noAllow).reasons.some((x) => x.reason === "R11a_gia_tri_da_biet"), false);
});

test("R11b: dãy số dài, kể cả tách khoảng trắng; số trong nhãn không tính", () => {
  assert.ok(reasons("gọi 0 9 1 2 3 4 5 6 7 8 nhé").includes("R11b_day_so_dai"));
  assert.ok(reasons("mã 012-345").includes("R11b_day_so_dai"));
  assert.equal(reasons("liên hệ [MÃ_ĐỊNH_DANH_123456] đau ngực").includes("R11b_day_so_dai"), false);
  assert.equal(reasons("uống 500 mg ngày 2 lần, đau 3 ngày").includes("R11b_day_so_dai"), false);
});

test("R11c: họ + âm tiết chữ thường, không dấu cũng bắt", () => {
  assert.equal(checkResidualPii("gặp lý hoài an ở chợ", none, noAllow).passed, false);
  assert.ok(reasons("gặp lý hoài an ở chợ").includes("R11c_ten_rieng_con_sot"));
  const gap = checkResidualPii("chi le thi hoa tho kho", none, noAllow);
  assert.equal(gap.passed, false);
  assert.ok(gap.reasons.some((x) => x.reason === "R11c_ten_rieng_con_sot"));
});

test("R11c: chữ STT có dấu, đọc liền không dấu câu không bị coi là tên", () => {
  // "ba" (số), "thai", "ha" là chữ thường trong văn bản có dấu, không phải họ Bá/Thái/Hà
  for (const s of [
    "sốt ba mươi tám phẩy năm độ trước đó có sổ mũi",
    "chưa dị ứng thuốc gì toàn thân bé tỉnh",
    "chẩn đoán viêm thai giữa cấp thai phải hướng điều trị",
    "ha ceamon hai trăm năm mươi mi lim uống ngày ba lần",
  ]) assert.equal(checkResidualPii(s, none, noAllow).passed, true, s);
  // tên thật trong văn bản có dấu vẫn chặn, kể cả họ phổ biến viết không dấu
  assert.equal(checkResidualPii("bệnh nhân khai gặp trần văn khải ở chợ", none, noAllow).passed, false);
  assert.equal(checkResidualPii("bệnh nhân khai gặp nguyen hoai an ở chợ", none, noAllow).passed, false);
});

test("R11c: câu lâm sàng thường qua; nhãn không bị coi là tên", () => {
  assert.equal(checkResidualPii("thủng màng nhĩ, suy tim", none, noAllow).passed, true);
  assert.equal(reasons("[BỆNH_NHÂN] đau ngực [NGƯỜI_1] đưa đến").includes("R11c_ten_rieng_con_sot"), false);
});

test("R11c: allowlist (fold) cho cụm bắt đầu bằng họ đi qua", () => {
  const custom = (t: string) => checkResidualPii(t, none, new Set(["lý hoài", "Lý Hoài An"]));
  assert.equal(checkResidualPii("gặp lý hoài an ở chợ", none, noAllow).passed, false);
  assert.equal(custom("gặp lý hoài an ở chợ").passed, true);
  // cụm allowlist che họ dù họ không đứng đầu cụm
  assert.equal(checkResidualPii("nhớ lý do viêm", none, new Set(["lý do viêm"])).passed, true);
  assert.equal(checkResidualPii("trong tiền sử hoa mắt", none, new Set(["tiền sử hoa"])).passed, true);
});

test("R11d: email hoặc URL", () => {
  assert.ok(reasons("gửi về abc@example.test nhé").includes("R11d_email_url"));
  assert.ok(reasons("xem https://example.test/x").includes("R11d_email_url"));
});

test("bản sạch từ bộ che qua chốt chặn", () => {
  const known: KnownIdentifier[] = [{ value: "Nguyễn Thị Giả", kind: "BỆNH_NHÂN" }];
  const r = redactPii("chị nguyen thi gia đau ngực phải ba ngày dùng amlodipine 5 mg", known);
  const g = checkResidualPii(r.clean, known, noAllow);
  assert.equal(g.passed, true);
  assert.equal(g.reasons.length, 0);
});

test("R14: không đồng ý thì chỉ chạy cục bộ", () => {
  assert.equal(aiRouteFor(false), "local_only");
  assert.equal(aiRouteFor(true), "external_allowed");
});

test("R13: nhật ký không mang bản thô", () => {
  const raw = "chị nguyen thi gia đau ngực";
  const known: KnownIdentifier[] = [{ value: "Nguyễn Thị Giả", kind: "BỆNH_NHÂN" }];
  const red = redactPii(raw, known);
  const gate = checkResidualPii(red.clean, known, noAllow);
  const e = buildAuditEntry({
    now: "2026-11-16T01:02:03.000Z", encounter_id: "LK-GIA-0001", session_sequence: 1,
    policy_version: PII_POLICY_VERSION, counts: red.counts, gate: gate.passed,
    gate_reasons: gate.reasons.map((x) => x.reason), ai_route: aiRouteFor(true),
    provider: "mock", model: "mock-1", clean_sha256: "a".repeat(64),
  });
  assert.equal(e.at, "2026-11-16T01:02:03.000Z");
  assert.equal(e.gate, true);
  const json = JSON.stringify(e).toLowerCase();
  assert.equal(json.includes("nguyen"), false);
  assert.equal(json.includes("đau ngực"), false);
  assert.equal("now" in e, false);
});

const CAU_SACH = [
  "ho khan về đêm", "đau cổ họng tăng khi nuốt", "niêm mạc mũi phù nề chảy dịch", "màng nhĩ đục lõm không thủng",
  "đau đầu do viêm xoang", "khám lại sau một tuần", "chẩn đoán suy tim", "xét nghiệm dương tính", "vì ù tai",
  "nói là nghẹt mũi", "amidan sưng to có mủ", "sốt 38 độ", "không có tiền sử dị ứng", "tiền sử cao huyết áp",
  "đau ngực ba ngày nay", "uống amlodipine 5 mg", "tái khám ngày mai", "thủng màng nhĩ, suy tim",
  "nghẹt mũi hai bên chảy dịch mủ", "soi họng thấy phù nề niêm mạc", "bị cao huyết áp đang uống thuốc",
  "ngực trái đau ba ngày kèm sốt nhẹ", "chóng mặt khi đứng dậy", "hẹn tái khám sau hai tuần",
];

test("hồi quy: 20+ câu ENT sạch viết thường đều qua, không cần allowlist của người gọi", () => {
  assert.ok(CAU_SACH.length >= 20);
  for (const c of CAU_SACH) assert.equal(checkResidualPii(c, none, noAllow).passed, true, c);
});

test("vẫn chặn tên người thật sự", () => {
  for (const c of ["đi cùng ngô thị lan", "chi le thi hoa tho kho", "gặp lý hoài an ở chợ"]) {
    assert.equal(reasons(c).includes("R11c_ten_rieng_con_sot"), true, c);
  }
});

test("allowlist: họ nằm giữa cụm allowlist vẫn được bỏ qua", () => {
  assert.equal(checkResidualPii("tiền sử cao huyết áp", none, new Set(["tiền sử"])).passed, true);
  assert.equal(checkResidualPii("tiền sử dương văn bình", none, noAllow).passed, false);
});

test("tự che phần sót R11c: tên người lạ thay bằng nhãn, nội dung lâm sàng giữ nguyên, che xong qua chốt chặn", () => {
  const m = maskResidualPii("hôm qua đỗ quốc việt mua thuốc giúp\nđau họng uống paracetamol 500 mg", none, noAllow);
  assert.equal(m.clean.includes("quốc việt"), false);
  assert.ok(m.clean.includes("[NGƯỜI_KHÁC]"));
  for (const keep of ["hôm qua", "thuốc giúp", "đau họng", "paracetamol 500 mg", "\n"]) assert.ok(m.clean.includes(keep), keep);
  assert.ok(m.masked.some((x) => x.reason === "R11c_ten_rieng_con_sot"));
  assert.equal(checkResidualPii(m.clean, none, noAllow).passed, true);
});

test("tự che phần sót: nhiều tên, dãy số, email, URL và giá trị đã biết viết không dấu", () => {
  const known: KnownIdentifier[] = [{ value: "Nguyễn Thị Giả", kind: "BỆNH_NHÂN" }];
  const text = "[BỆNH_NHÂN] đi cùng ngô thị lan và gặp lý hoài an, gọi 0912 345 678, gửi abc@example.test hoặc https://example.test/x, chị nguyen thi gia đau ngực";
  const m = maskResidualPii(text, known, noAllow);
  for (const gone of ["ngô thị lan", "lý hoài an", "0912 345 678", "abc@example.test", "https://example.test/x", "nguyen thi gia"]) {
    assert.equal(m.clean.includes(gone), false, gone);
  }
  for (const label of ["[BỆNH_NHÂN]", "[NGƯỜI_KHÁC]", "[MÃ_ĐỊNH_DANH]", "[LIÊN_HỆ]"]) assert.ok(m.clean.includes(label), label);
  assert.ok(m.clean.endsWith("đau ngực"));
  const kinds = new Set(m.masked.map((x) => x.reason));
  for (const r of ["R11a_gia_tri_da_biet", "R11b_day_so_dai", "R11c_ten_rieng_con_sot", "R11d_email_url"]) assert.ok(kinds.has(r as never), r);
  assert.equal(checkResidualPii(m.clean, known, noAllow).passed, true, m.clean);
});

test("tự che phần sót: bản sạch không đổi khi không còn gì sót", () => {
  const m = maskResidualPii("[NGƯỜI_1] đưa đến, đau ngực ba ngày", none, noAllow);
  assert.equal(m.clean, "[NGƯỜI_1] đưa đến, đau ngực ba ngày");
  assert.deepEqual(m.masked, []);
});

test("tự che phần sót: giá trị đã biết dính trong một từ không che được thì vẫn để chốt chặn chặn", () => {
  const known: KnownIdentifier[] = [{ value: "Quyx", kind: "BỆNH_NHÂN" }];
  const m = maskResidualPii("đau quyxa tai", known, noAllow);
  assert.equal(checkResidualPii(m.clean, known, noAllow).passed, false);
});

test("R13: trường lạ như raw không lọt vào nhật ký", () => {
  const input = {
    now: "2026-11-16T00:00:00.000Z", encounter_id: "LK-GIA-0001", session_sequence: 1, policy_version: PII_POLICY_VERSION as typeof PII_POLICY_VERSION,
    counts: { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0 }, gate: true, gate_reasons: [], ai_route: "local_only" as const,
    provider: "mock", model: "mock-1", clean_sha256: "b".repeat(64), raw: "nguyen thi gia",
  };
  const e = buildAuditEntry(input) as unknown as Record<string, unknown>;
  assert.equal("raw" in e, false);
  assert.equal(JSON.stringify(e).includes("nguyen"), false);
});

test("R11c: chữ thường trùng họ trong câu bệnh sử STT không bị coi là tên ('cao còn', 'viên atorvastatin')", () => {
  const cau = "mỡ máu cũng hơi cao còn tiểu đường thì chưa có anh đang uống những thuốc gì tôi uống amlopin 5 mg mỗi sáng với 1 viên atorvastatin 10 mg vào buổi tối";
  assert.equal(checkResidualPii(cau, none, noAllow).passed, true, JSON.stringify(checkResidualPii(cau, none, noAllow).reasons));
  for (const c of ["uống 1 viên paracetamol", "huyết áp cao còn đau đầu", "dùng viên amoxicillin"]) {
    assert.equal(checkResidualPii(c, none, noAllow).passed, true, c);
  }
  // tên thật vẫn chặn
  for (const c of ["gặp cao văn lâm ở chợ", "đi cùng viên thị hà"]) assert.equal(checkResidualPii(c, none, noAllow).passed, false, c);
});

test("trọn câu bệnh sử STT liền mạch: không che nhầm bệnh, thuốc; vẫn che tuổi", () => {
  const raw = "tiền sử tăng huyết áp đái tháo đường rối loạn mỡ máu hay bệnh tim mạch nào khác không tôi bị tăng huyết áp khoảng 5 năm rồi mỡ máu cũng hơi cao còn tiểu đường thì chưa có anh đang uống những thuốc gì tôi uống amlopin 5 mg mỗi sáng với 1 viên atorvastatin 10 mg vào buổi tối bố tôi từng bị nhồi máu cơ tim lúc 60 tuổi";
  const r = redactPii(raw, none);
  const g = checkResidualPii(r.clean, none, noAllow);
  assert.equal(g.passed, true, JSON.stringify(g.reasons));
  assert.equal(r.clean, raw.replace("60 tuổi", "[TUỔI]"));
});

test("R11c: từ thường trùng họ (lại, danh, mã, lô, hà) trong lời nói liền mạch không bị coi là tên", () => {
  for (const c of [
    "bác sĩ xem lại cái đấy hình như chưa đúng",
    "anh in lại cái đơn xong đưa tôi",
    "chị gửi lại cho tôi kết quả",
    "kê lại đúng liều như cũ",
    "tôi xem trong danh sách thuốc",
    "ghi lại các thứ để mai khám",
    "kiểm tra mã danh đúng chưa",
    "uống hết một lô thì anh quay lại",
    "hai vợ chồng đi lại cùng nhau",
    "đi đâu cũng lại cùng anh",
  ]) assert.equal(checkResidualPii(c, none, noAllow).passed, true, `${c}: ${JSON.stringify(checkResidualPii(c, none, noAllow).reasons)}`);
  // tên thật có họ trùng từ thường vẫn chặn khi đủ dạng tên (có đệm hoặc ≥ 2 âm tiết sau họ)
  for (const c of ["gặp lại văn hùng ở chợ", "đi với hà thị lan", "chị mã ngọc ánh gọi", "danh thị mỹ đưa đến"]) {
    assert.equal(checkResidualPii(c, none, noAllow).passed, false, c);
  }
});

test("R11c dùng chung đuôi tên với R2: tên ba âm tiết có từ đệm vẫn được che đủ", () => {
  const r = chePii("hôm qua đỗ quốc việt mua thuốc giúp", [], new Set());
  assert.equal(r.clean.includes("quốc"), false, r.clean);
  assert.equal(r.clean.includes("việt"), false, r.clean);
  assert.equal(r.clean.includes("mua thuốc giúp"), true, r.clean);
});
