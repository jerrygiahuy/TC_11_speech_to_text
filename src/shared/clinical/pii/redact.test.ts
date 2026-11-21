import assert from "node:assert/strict";
import { test } from "node:test";
import { HO_VIET, PII_POLICY_VERSION, foldVietnamese, redactPii } from "./index";

const none = [] as never[];

test("phiên bản rule và bỏ dấu", () => {
  assert.equal(PII_POLICY_VERSION, "pii-auto-2");
  assert.equal(foldVietnamese("  Nguyễn  Thị Đào "), "nguyen thi dao");
  assert.ok(HO_VIET.length >= 90);
});

test("R1: tên đã biết, viết không dấu vẫn bị che", () => {
  const r = redactPii("chị nguyen thi gia đau ngực", [{ value: "Nguyễn Thị Giả", kind: "BỆNH_NHÂN" }]);
  assert.equal(r.clean, "chị [BỆNH_NHÂN] đau ngực");
  assert.equal(r.counts.R1, 1);
  assert.equal(r.spans[0].start, 4);
  assert.equal(r.spans[0].end, 18);
  assert.equal(r.spans[0].rule, "R1");
});

test("R1: người nhà xuất hiện hai lần cùng nhãn; số điện thoại đã biết tách khoảng trắng", () => {
  const r = redactPii("trần văn chồng chở tôi, trần văn chồng ở ngoài, gọi 0 9 1 2 3 4 5 6 7 8", [
    { value: "Trần Văn Chồng", kind: "NGƯỜI_NHÀ" },
    { value: "0912345678", kind: "LIÊN_HỆ" },
  ]);
  assert.equal(r.clean, "[NGƯỜI_NHÀ_1] chở tôi, [NGƯỜI_NHÀ_1] ở ngoài, gọi [LIÊN_HỆ_1]");
});

test("R2: tên người không cần chữ hoa", () => {
  assert.equal(redactPii("con tôi tên là lê minh bé, bị hồi hộp", none).clean, "con tôi tên là [NGƯỜI_1], bị hồi hộp");
  const r = redactPii("bác sĩ ơi ông phạm văn hàng xóm cũng bị", none);
  assert.ok(r.clean.includes("[NGƯỜI_1]"));
  assert.ok(!r.clean.includes("phạm"));
});

test("R2: không nhầm ho (triệu chứng) hay chữ thường gặp", () => {
  const text = "bé ho 3 ngày, cao 90 cm, dương tính với cúm";
  assert.equal(redactPii(text, none).clean, text);
});

test("R3: địa chỉ và địa danh", () => {
  const a = redactPii("nhà ở số 12 đường lê lợi phường bến thành", none).clean;
  for (const s of ["lê lợi", "bến thành", "12"]) assert.ok(!a.includes(s), s);
  assert.ok(redactPii("quê ở huyện mỹ đức", none).clean.includes("[ĐỊA_DANH_1]"));
  assert.equal(redactPii("đường huyết cao, tỉnh táo", none).clean, "đường huyết cao, tỉnh táo");
});

test("R4: ngày tháng, giữ thời gian bệnh", () => {
  const r = redactPii("sinh ngày 10/03/1978, đau ngực 3 ngày nay", none);
  assert.ok(r.clean.includes("[NGÀY]"));
  assert.ok(r.clean.includes("3 ngày nay"));
  assert.ok(!r.clean.includes("1978"));
});

test("R5: liên hệ", () => {
  const r = redactPii("số 0912 345 678 mail giả@vi.du email demo.gia@vi.du web https://vi.du ip 192.168.1.10", none);
  assert.ok(!/0912|demo\.gia|https:|192\./.test(r.clean), r.clean);
  assert.equal(r.counts.R5, 4);
  assert.match(r.clean, /\[LIÊN_HỆ_1\]/);
  assert.match(r.clean, /\[LIÊN_HỆ_4\]/);
});

test("R6: mã định danh", () => {
  for (const [text, secret] of [
    ["cccd 001234567890", "001234567890"],
    ["biển số 29A-123.45", "123.45"],
    ["pid GIA-000123", "000123"],
    ["số tài khoản 0123456789", "0123456789"],
  ] as const) {
    const r = redactPii(text, none);
    assert.ok(r.clean.includes("[MÃ_ĐỊNH_DANH_1]"), r.clean);
    assert.ok(!r.clean.includes(secret), r.clean);
  }
});

test("R7: quốc tịch nhiều từ che trọn giá trị", () => {
  for (const c of ["việt nam", "hàn quốc", "trung quốc", "hoa kỳ"]) {
    const r = redactPii(`quốc tịch ${c} đau ngực`, []);
    assert.equal(r.clean.includes(c.split(" ")[1]), false, r.clean);
  }
});

test("R7: thông tin nhạy cảm", () => {
  for (const text of ["quốc tịch nhật", "theo đạo thiên chúa", "đã ly hôn"]) {
    assert.ok(redactPii(text, none).clean.includes("[THÔNG_TIN_NHẠY_CẢM_1]"), text);
  }
  assert.equal(redactPii("viêm âm đạo", none).spans.length, 0);
});

test("R8: nội dung ngoài khám, giữ tiền sử gia đình", () => {
  assert.ok(redactPii("chuyện vay tiền nhà hàng xóm", none).clean.includes("[NỘI_DUNG_NGOÀI_KHÁM]"));
  const keep = "mẹ tôi bị ung thư phổi";
  assert.equal(redactPii(keep, none).clean, keep);
});

test("giữ nguyên thuốc, liều, vị trí phù, thời gian bệnh", () => {
  const raw = "amlodipine 5 mg ngày 2 lần, phù chân phải, sốt 38,5 độ, đau 3 ngày nay";
  const r = redactPii(raw, none);
  assert.equal(r.clean, raw);
  assert.equal(r.spans.length, 0);
});

test("tuổi và giới tính gắn R7", () => {
  const r = redactPii("bệnh nhân nữ 47 tuổi", none);
  assert.ok(r.clean.includes("[GIỚI_TÍNH]"));
  assert.ok(r.clean.includes("[TUỔI]"));
  assert.ok(r.spans.every(s => s.rule === "R7"));
});

test("span hợp lệ, không chồng nhau, vị trí đúng cả khi bản thô là NFD", () => {
  const raw = "chị Nguyễn Thị Giả (0912 345 678) sinh ngày 10/03/1978 quốc tịch nhật".normalize("NFD");
  const r = redactPii(raw, [{ value: "Nguyễn Thị Giả", kind: "BỆNH_NHÂN" }]);
  let last = 0;
  for (const s of r.spans) {
    assert.ok(raw.slice(s.start, s.end).length > 0);
    assert.ok(s.start >= last);
    last = s.end;
  }
  assert.equal(raw.slice(r.spans[0].start, r.spans[0].end).normalize("NFC"), "Nguyễn Thị Giả");
  assert.ok(!/Nguy|0912|1978|nhật/.test(r.clean.normalize("NFC")), r.clean);
});

test("vòng 1: R2 không nuốt từ lâm sàng sau từ chỉ người", () => {
  for (const text of ["em bình thường không sốt", "bé đồng ý làm điện tim", "em tiêu hóa kém"]) assert.equal(redactPii(text, none).clean, text, text);
  assert.equal(redactPii("anh trần văn an khó thở hồi hộp", none).clean, "anh [NGƯỜI_1] khó thở hồi hộp");
  assert.equal(redactPii("anh nguyen van a dau nguc", none).clean, "anh [NGƯỜI_1] dau nguc");
});

test("vòng 1: đầu văn bản không che chẩn đoán", () => {
  for (const text of ["lý do vào viện đau ngực phải", "ung thư phổi giai đoạn hai"]) assert.equal(redactPii(text, none).clean, text, text);
  assert.equal(redactPii("mã bệnh nhân 2026001234", none).clean, "mã bệnh nhân [MÃ_ĐỊNH_DANH_1]");
  assert.equal(redactPii("nguyễn thị giả đau ngực", none).clean, "[NGƯỜI_1] đau ngực");
});

test("vòng 1: R3 không che giải phẫu, phẫu thuật", () => {
  for (const text of ["vách ngăn lệch khỏi đường giữa", "đường rạch sau tai lành tốt", "đường mổ khô"]) assert.equal(redactPii(text, none).clean, text, text);
});

test("vòng 1: span chồng nhau không để lọt mảnh", () => {
  const r = redactPii("sống ở mỹ đức hà nội", none);
  assert.ok(!r.clean.includes("mỹ đức"), r.clean);
  assert.ok(!r.clean.includes("hà nội"), r.clean);
});

test("vòng 1: tên người thân không cần từ 'tên', giữ tiền sử", () => {
  const r = redactPii("mẹ là phạm thị mai bị suy tim", none);
  assert.equal(r.clean, "mẹ là [NGƯỜI_1] bị suy tim");
  assert.equal(redactPii("mẹ tôi bị ung thư phổi", none).clean, "mẹ tôi bị ung thư phổi");
});

test("vòng 2: đuôi tên không dừng ở tên riêng trùng từ dừng không dấu", () => {
  assert.equal(redactPii("bé lê thị hoa đau ngực", none).clean, "bé [NGƯỜI_1] đau ngực");
  assert.equal(redactPii("bé hoàng văn nam sốt cao", none).clean, "bé [NGƯỜI_1] sốt cao");
});

test("R3: 'đường' trong tên bệnh (đái tháo đường, tiểu đường, lượng đường) không phải địa danh", () => {
  for (const text of [
    "tiền sử tăng huyết áp đái tháo đường rối loạn mỡ máu",
    "đái tháo đường type 2 đang điều trị",
    "bố bị tiểu đường nhiều năm",
    "lượng đường trong máu cao",
    "hạ đường huyết lúc đói",
  ]) assert.equal(redactPii(text, none).clean, text, text);
  // địa chỉ thật vẫn che
  assert.ok(redactPii("nhà ở đường nguyễn trãi", none).clean.includes("[ĐỊA_DANH_1]"));
  assert.ok(redactPii("mẹ bị tiểu đường, nhà ở đường lê lợi", none).clean.includes("[ĐỊA_DANH_1]"));
});

test("R3: 'đường' chỉ là tên đường khi có dấu hiệu nơi chốn", () => {
  for (const text of ["ông nhà em bị đái đường biến chứng thận", "nhiễm trùng đường tiểu tái phát",
    "trên đường đi học bé bị ngã", "viêm đường sinh dục", "đường dẫn lưu còn ít dịch"])
    assert.equal(redactPii(text, none).clean, text, text);
  for (const [text, masked] of [["nhà em đường nguyễn trãi", "đường nguyễn trãi"], ["số 12 đường lê lợi", "số 12 đường lê lợi"],
    ["chị ở đường láng", "đường láng"], ["ở đường số 5", "đường số 5"], ["Nhà ở Đường Hòa Bình", "Đường Hòa Bình"]] as const) {
    const r = redactPii(text, none);
    assert.deepEqual(r.spans.filter(s => s.rule === "R3").map(s => text.slice(s.start, s.end)), [masked], text);
  }
});

test("R3: không che qua dòng mới", () => {
  const text = "em ở đường láng\nngười nhà khai đái tháo đường";
  assert.deepEqual(redactPii(text, none).spans.map(s => text.slice(s.start, s.end)), ["đường láng"]);
  const addr = "nhà ở số 12 đường lê lợi\nphường bến thành";
  assert.deepEqual(redactPii(addr, none).spans.map(s => addr.slice(s.start, s.end)), ["số 12 đường lê lợi", "phường bến thành"]);
});

test("R2: đuôi tên dừng sau tên gọi, không nuốt chữ lâm sàng", () => {
  const cases: [string, string][] = [
    ["bà nội của bé là nguyễn thị tâm dị ứng penicillin", "nguyễn thị tâm"],
    ["bố cháu đinh văn long hút thuốc", "đinh văn long"],
    ["ông lê văn tám hen phế quản", "lê văn tám"],
    ["bà hoàng thị mai tiền sử lao phổi", "hoàng thị mai"],
    ["chị võ thị hằng thai ba tháng", "võ thị hằng"],
    ["anh trần nam hút thuốc", "trần nam"],
    ["bà nguyen thi tam di ung penicillin", "nguyen thi tam"],
    ["em tên là phạm ngọc anh thư bị tăng huyết áp", "phạm ngọc anh thư"],
    ["cháu bùi gia bảo hồi hộp", "bùi gia bảo"],
    ["chị nguyễn thị minh khai ở nhà", "nguyễn thị minh khai"],
    ["anh đỗ quốc việt khó thở", "đỗ quốc việt"],
    ["cô trần thu hà hồi hộp", "trần thu hà"],
    ["bé nguyễn minh khôi phù chân", "nguyễn minh khôi"],
  ];
  for (const [text, name] of cases)
    assert.deepEqual(redactPii(text, none).spans.filter(s => s.rule === "R2").map(s => text.slice(s.start, s.end)), [name], text);
});
