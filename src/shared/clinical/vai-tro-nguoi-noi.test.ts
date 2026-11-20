import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { chamDiem, doanVaiTro, ganVaiTroChoDoan, ghepTheoNguoiNoi, noiChu, type LuotNoi } from "./vai-tro-nguoi-noi";

/**
 * Hội thoại giả (dữ liệu tự viết, không phải bệnh nhân thật), viết thường không dấu câu như chữ ASR trả về.
 * Mỗi hội thoại: [vai, câu]. Test đổi vai thành Người nói 1/2 theo cả hai chiều để chắc không phụ thuộc thứ tự.
 */
const HOI_THOAI: Record<string, ["BS" | "BN", string][]> = {
  "tái khám tăng huyết áp": [
    ["BN", "chào bác sĩ em đến tái khám huyết áp ạ"],
    ["BS", "dạo này huyết áp tại nhà bao nhiêu có đau ngực hay khó thở không"],
    ["BN", "dạ em đo ở nhà một trăm bốn mươi lăm trên tám mươi lăm thỉnh thoảng hơi đau đầu chứ không đau ngực ạ"],
    ["BS", "có dị ứng thuốc gì không đang uống thuốc gì"],
    ["BN", "dạ em dị ứng penicillin đang uống amlodipine năm miligam mỗi sáng"],
    ["BS", "để tôi khám tiếng T1 T2 đều rõ không âm thổi phổi trong không ran chẩn đoán tăng huyết áp vô căn tiếp tục thuốc hiện tại ghi nhật ký huyết áp hẹn tái khám sau ba mươi ngày"],
    ["BN", "dạ em cảm ơn bác sĩ"],
  ],
  "đau ngực khi gắng sức": [
    ["BS", "anh đau ngực khi leo cầu thang phải không"],
    ["BN", "dạ tôi thấy nặng ngực khi đi nhanh nghỉ thì đỡ tôi không bị ngất"],
    ["BS", "có tiền sử rối loạn lipid máu hay gia đình có ai bị bệnh mạch vành không"],
    ["BN", "dạ có mỡ máu cao em đang uống atorvastatin buổi tối bố tôi từng bị mạch vành"],
    ["BS", "huyết áp một trăm ba mươi hai trên tám mươi hai mạch tám mươi tĩnh mạch cổ không nổi tiếng tim đều không rung miu phổi trong chẩn đoán đau ngực cần đánh giá nguyên nhân tim mạch chỉ định làm điện tâm đồ hẹn tái khám sau bảy ngày"],
    ["BN", "có nguy hiểm không bác sĩ"],
  ],
  "hồi hộp đánh trống ngực": [
    ["BN", "bác sĩ ơi dạo này tôi hay hồi hộp đánh trống ngực mấy bữa nay cứ tối là bị"],
    ["BS", "mỗi lần kéo dài bao lâu có chóng mặt hay ngất thoáng qua không"],
    ["BN", "dạ khoảng mười phút có hơi choáng nhưng tôi không ngất ạ tôi uống nhiều cà phê"],
    ["BS", "điện tim nhịp không đều nghi rung nhĩ tôi chỉ định holter điện tim và siêu âm tim kê apixaban hẹn tái khám sau hai tuần"],
    ["BN", "dạ vâng tôi sẽ làm theo ạ"],
  ],
  "phù chân, suy tim": [
    ["BN", "thưa bác sĩ ông nhà tôi mấy hôm nay phù hai mắt cá chân khó thở khi nằm"],
    ["BS", "để tôi khám mỏm tim lệch ngoài có ran ẩm hai đáy phổi tĩnh mạch cổ nổi phù mắt cá chân hai bên"],
    ["BS", "chẩn đoán suy tim mạn tái khám sau một tuần xét nghiệm NT-proBNP siêu âm tim hạn chế muối nhé"],
    ["BN", "dạ có nặng không bác sĩ ông nhà tôi có phải nhập viện không"],
    ["BS", "theo dõi cân nặng mỗi sáng nhớ uống thuốc đều"],
  ],
};

function thanhLuot(hoiThoai: ["BS" | "BN", string][], soBacSi: number): LuotNoi[] {
  return hoiThoai.map(([vai, cau]) => ({ speaker: vai === "BS" ? soBacSi : 3 - soBacSi, text: cau }));
}

for (const [ten, hoiThoai] of Object.entries(HOI_THOAI)) {
  test(`phân vai đúng: ${ten}`, () => {
    for (const soBacSi of [1, 2]) {
      const ketQua = doanVaiTro(thanhLuot(hoiThoai, soBacSi));
      assert.equal(ketQua.vaiTro.get(soBacSi), "BS", `${ten}: ${ketQua.lyDo} ${JSON.stringify([...ketQua.diem])}`);
      assert.equal(ketQua.vaiTro.get(3 - soBacSi), "BN");
    }
  });
}

test("bác sĩ tự đọc (10 ca Tim mạch tổng hợp, một giọng) được gán BS", () => {
  const dong = fs.readFileSync(path.join(process.cwd(), "data/cardiology/synthetic-cases.jsonl"), "utf8").split("\n").filter(Boolean).slice(0, 10);
  assert.equal(dong.length, 10);
  for (const d of dong) {
    const ca = JSON.parse(d) as { scenario_id: string; conversation_text: string };
    const ketQua = doanVaiTro([{ speaker: 1, text: ca.conversation_text }]);
    assert.equal(ketQua.vaiTro.get(1), "BS", `${ca.scenario_id}: ${ketQua.lyDo}`);
  }
});

test("vai_tro_tim_mach: câu hỏi triệu chứng là bác sĩ, câu kể hồi hộp là bệnh nhân", () => {
  const bs = chamDiem("anh có đau ngực khi leo cầu thang không");
  const bn = chamDiem("dạ tôi thấy hồi hộp đánh trống ngực");
  assert.ok(bs.bacSi > bs.benhNhan, JSON.stringify(bs));
  assert.ok(bn.benhNhan > bn.bacSi, JSON.stringify(bn));
  const ketQua = doanVaiTro([
    { speaker: 1, text: "anh có đau ngực khi leo cầu thang không" },
    { speaker: 2, text: "dạ tôi thấy hồi hộp đánh trống ngực" },
    { speaker: 1, text: "để tôi khám tiếng T1 T2 đều rõ không âm thổi phổi trong không ran chẩn đoán rung nhĩ" },
    { speaker: 2, text: "dạ tôi cảm ơn bác sĩ" },
  ]);
  assert.equal(ketQua.vaiTro.get(1), "BS");
  assert.equal(ketQua.vaiTro.get(2), "BN");
});

test("chưa đủ dấu hiệu thì không gán", () => {
  const ketQua = doanVaiTro([
    { speaker: 1, text: "chào anh mời anh ngồi" },
    { speaker: 2, text: "dạ chào bác sĩ" },
    { speaker: 1, text: "hôm nay trời mưa to nhỉ" },
  ]);
  assert.equal(ketQua.vaiTro.size, 0);
});

test("hơn hai giọng hoặc chỉ có lượt chưa rõ thì không gán", () => {
  assert.equal(doanVaiTro([{ speaker: null, text: "chẩn đoán tăng huyết áp kê đơn" }]).vaiTro.size, 0);
  const ba = doanVaiTro([
    { speaker: 1, text: "chẩn đoán tăng huyết áp kê đơn amlodipine uống ngày một lần sau ăn hẹn tái khám" },
    { speaker: 2, text: "em bị đau ngực mấy hôm nay" },
    { speaker: 3, text: "cháu nó sốt cả đêm" },
  ]);
  assert.equal(ba.vaiTro.size, 0);
});

test("bệnh nhân nhắc lại tên bệnh không đủ để bị coi là bác sĩ", () => {
  const ketQua = doanVaiTro(thanhLuot([
    ["BN", "em bị suy tim mấy năm nay rồi bác sĩ ạ dạo này khó thở lắm"],
    ["BS", "chẩn đoán suy tim mạn đợt cấp chỉ định siêu âm tim kê đơn furosemide ngày một lần tái khám sau hai tuần"],
  ], 2));
  assert.equal(ketQua.vaiTro.get(2), "BS");
});

test("chấm điểm theo cụm từ nguyên vẹn, không khớp nửa từ", () => {
  assert.equal(chamDiem("mạch máu").dauHieu.includes("mạch"), true);
  assert.equal(chamDiem("mạchh").bacSi, 0);
  assert.ok(chamDiem("Chẩn đoán: tăng huyết áp.").dauHieu.includes("chẩn đoán"));
});

test("đổi nhãn tạm Người nói N thành BS/BN trong đoạn ghi âm", () => {
  const doan = [
    "Người nói 2: chào bác sĩ em bị đau ngực mấy hôm nay đau lắm có tự mua thuốc uống mà không đỡ",
    "Người nói 1: đau từ khi nào có khó thở không ngồi yên để tôi khám tim phổi tiếng tim đều",
    "câu chưa rõ người nói",
    "Người nói 1: chẩn đoán tăng huyết áp kê đơn amlodipine uống ngày một lần sau ăn hẹn tái khám",
    "Người nói 2: dạ em cảm ơn bác sĩ",
  ].join("\n");
  const { text, ketQua } = ganVaiTroChoDoan(doan);
  assert.equal(ketQua.vaiTro.get(1), "BS");
  assert.deepEqual(text.split("\n").map((dong) => dong.split(":")[0]), ["BN", "BS", "câu chưa rõ người nói", "BS", "BN"]);
});

test("không đủ dấu hiệu thì bỏ nhãn tạm, giữ nội dung", () => {
  const { text } = ganVaiTroChoDoan("Người nói 1: chào anh\nNgười nói 2: dạ chào");
  assert.equal(text, "chào anh\ndạ chào");
});

test("ghép từ theo lượt: đổi người nói thì xuống dòng có nhãn, nối tiếp lượt cũ không lặp nhãn", () => {
  const dau = ghepTheoNguoiNoi([
    { text: "chào", speaker: 2 }, { text: "bác", speaker: 2 }, { text: "sĩ", speaker: 2 },
    { text: "mời", speaker: 1 }, { text: "ngồi", speaker: 1 },
  ]);
  assert.equal(dau.text, "\nNgười nói 2: chào bác sĩ\nNgười nói 1: mời ngồi");
  // Từ chưa rõ người nói hoặc nói chồng nối tiếp lượt đang nói, không ngắt dòng
  const tiep = ghepTheoNguoiNoi([{ text: "anh", speaker: 1 }, { text: "ừ", speaker: null }, { text: "dạ", speaker: 2, overlap: true }, { text: "vâng", speaker: 2 }], dau.cuoi);
  assert.equal(tiep.text, "anh ừ dạ\nNgười nói 2: vâng");
  let o = noiChu("", dau.text, false);
  o = noiChu(o, tiep.text, true);
  assert.equal(o, "Người nói 2: chào bác sĩ\nNgười nói 1: mời ngồi anh ừ dạ\nNgười nói 2: vâng");
  assert.equal(ghepTheoNguoiNoi([{ text: "ừ", speaker: null }, { text: "chào", speaker: 1 }]).text, "\nừ\nNgười nói 1: chào");
  // Đoạn chưa rõ dài (có thể người thứ ba) không gộp vào lượt trước; kẹp giữa cùng một người thì vẫn gộp
  const ba = [{ text: "a", speaker: null }, { text: "b", speaker: null }, { text: "c", speaker: null }];
  assert.equal(ghepTheoNguoiNoi([{ text: "khám", speaker: 1 }, ...ba, { text: "dạ", speaker: 2 }]).text, "\nNgười nói 1: khám\na b c\nNgười nói 2: dạ");
  assert.equal(ghepTheoNguoiNoi([{ text: "khám", speaker: 1 }, ...ba, { text: "tiếp", speaker: 1 }]).text, "\nNgười nói 1: khám a b c tiếp");
  assert.equal(noiChu("ghi tay", "câu mới", false), "ghi tay\ncâu mới");
});

test("máy gộp hai người thành một giọng thì không gán cả đoạn cho một vai", () => {
  // Chữ thật từ máy chủ với hội thoại tổng hợp cùng một giọng máy đọc: phân tách trả về một người nói.
  const gop = "chào bác sĩ em bị đau ngực mấy hôm nay đau lắm đau từ khi nào rồi có khó thở không dạ từ hôm thứ hai em hơi hồi hộp về đêm em có tự mua thuốc ở hiệu thuốc uống mà không đỡ có dị ứng thuốc gì không dạ không ạ ngồi yên để tôi khám tiếng tim đều phổi trong không ran chẩn đoán tăng huyết áp tôi kê đơn amlodipine năm miligam uống ngày một lần sau ăn hẹn khám nếu đau ngực em có phải kiêng gì không bác sĩ uống đủ nước nhớ uống thuốc đều nhé dạ em cảm ơn bác sĩ";
  const ketQua = doanVaiTro([{ speaker: 1, text: gop }]);
  assert.equal(ketQua.vaiTro.size, 0);
  assert.match(ketQua.lyDo, /chưa tách được hai người/);
  const haiGiong = doanVaiTro([{ speaker: 1, text: gop }, { speaker: 2, text: "dạ vâng" }]);
  assert.equal(haiGiong.vaiTro.size, 0);
});

test("giọng bác sĩ đã đăng ký: ưu tiên giọng khi nội dung chưa đủ dấu hiệu", () => {
  const doan = "Người nói 1: chào anh mời anh ngồi\nNgười nói 2: dạ chào\nNgười nói 1: anh thấy sao";
  assert.equal(ganVaiTroChoDoan(doan).text, "chào anh mời anh ngồi\ndạ chào\nanh thấy sao");
  const { text, ketQua } = ganVaiTroChoDoan(doan, 1);
  assert.equal(text, "BS: chào anh mời anh ngồi\nBN: dạ chào\nBS: anh thấy sao");
  assert.match(ketQua.lyDo, /giọng bác sĩ đã đăng ký/);
  // Một giọng khớp: bác sĩ tự đọc
  assert.equal(ganVaiTroChoDoan("Người nói 1: chào anh", 1).text, "BS: chào anh");
});

test("giọng khớp nhưng nội dung chắc chắn là bệnh nhân thì không gán; giọng không có trong đoạn thì dùng nội dung", () => {
  const doan = [
    "Người nói 1: chào bác sĩ em bị đau ngực mấy hôm nay đau lắm có tự mua thuốc uống mà không đỡ",
    "Người nói 2: đau từ khi nào có khó thở không ngồi yên để tôi khám tim phổi tiếng tim đều",
    "Người nói 2: chẩn đoán tăng huyết áp kê đơn amlodipine uống ngày một lần sau ăn hẹn tái khám",
    "Người nói 1: dạ em cảm ơn bác sĩ",
  ].join("\n");
  const mauThuan = ganVaiTroChoDoan(doan, 1);
  assert.equal(mauThuan.ketQua.vaiTro.size, 0);
  assert.match(mauThuan.ketQua.lyDo, /mâu thuẫn|giống bệnh nhân/);
  assert.equal(ganVaiTroChoDoan(doan, 3).ketQua.vaiTro.get(2), "BS");
  assert.equal(ganVaiTroChoDoan(doan, null).ketQua.vaiTro.get(2), "BS");
});
