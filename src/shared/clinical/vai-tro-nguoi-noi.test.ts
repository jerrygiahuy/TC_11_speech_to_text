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
  "viêm họng cấp": [
    ["BN", "chào bác sĩ em bị đau họng mấy hôm nay nuốt đau lắm"],
    ["BS", "đau từ khi nào có sốt không"],
    ["BN", "dạ từ hôm thứ hai em hơi sốt về đêm có tự mua thuốc ở hiệu thuốc uống mà không đỡ"],
    ["BS", "có dị ứng thuốc gì không"],
    ["BN", "dạ không ạ"],
    ["BS", "há miệng to nói a để tôi khám họng thành sau họng đỏ amidan sung huyết không có mủ"],
    ["BS", "chẩn đoán viêm họng cấp tôi kê đơn paracetamol năm trăm miligam uống ngày ba lần sau ăn trong năm ngày súc họng nước muối hẹn tái khám nếu sốt cao"],
    ["BN", "em có phải kiêng gì không bác sĩ"],
    ["BS", "uống đủ nước tránh đồ lạnh nhé"],
    ["BN", "dạ em cảm ơn bác sĩ"],
  ],
  "viêm tai giữa ở trẻ, mẹ nói thay": [
    ["BN", "bác sĩ ơi cháu nó kêu đau tai phải từ tối qua quấy khóc cả đêm"],
    ["BS", "bé có sốt không có chảy mủ không"],
    ["BN", "dạ có sốt ba tám độ chưa thấy chảy mủ ạ trước đó cháu bị sổ mũi mấy ngày"],
    ["BS", "cho bé ngồi yên nghiêng đầu để tôi soi tai màng nhĩ phải đỏ phồng mất nón sáng tai trái bình thường"],
    ["BS", "chẩn đoán viêm tai giữa cấp tai phải điều trị nội khoa ngoại trú kê amoxicillin dạng gói uống ngày hai lần sau ăn trong bảy ngày"],
    ["BN", "có nặng không bác sĩ bao giờ thì khỏi ạ"],
    ["BS", "không sao đâu uống thuốc đều nhé hẹn khám lại sau bảy ngày nếu chảy mủ tai thì quay lại ngay"],
  ],
  "viêm mũi xoang, bệnh nhân nói nhiều": [
    ["BS", "anh vào khám vì gì"],
    ["BN", "tôi bị nghẹt mũi chảy nước mũi vàng mấy tuần nay rồi đau nhức vùng trán nhất là buổi sáng tôi ngủ không được tôi có uống thuốc kháng sinh mua ngoài nhà thuốc mà không thấy đỡ dạo này còn hay nhức đầu nữa"],
    ["BS", "có hắt hơi nhiều không tiền sử có viêm mũi dị ứng không"],
    ["BN", "tôi hay hắt hơi buổi sáng vợ tôi bảo tôi ngủ ngáy to lắm tôi có sao không bác sĩ"],
    ["BS", "nội soi mũi xoang thấy niêm mạc phù nề cuốn dưới quá phát khe giữa có dịch mủ"],
    ["BS", "chẩn đoán viêm mũi xoang cấp chỉ định chụp ct mũi xoang kê augmentin một gam uống ngày hai lần sau ăn rửa mũi nước muối sinh lý tái khám sau mười ngày"],
    ["BN", "dạ vâng"],
  ],
  "khàn tiếng, bác sĩ nói ít": [
    ["BN", "em bị khàn tiếng gần một tháng nay em làm giáo viên nói nhiều lắm sáng dậy thì đỡ hơn chiều thì mất tiếng em có uống thuốc nam mà không đỡ"],
    ["BS", "có hút thuốc không có ợ chua không"],
    ["BN", "dạ em không hút thuốc thỉnh thoảng có ợ chua sau ăn ạ"],
    ["BS", "nội soi thanh quản dây thanh hai bên có hạt xơ nhỏ chẩn đoán hạt xơ dây thanh chỉ định nghỉ nói kê thuốc chống trào ngược hẹn tái khám sau hai tuần"],
  ],
  "dị vật tai": [
    ["BN", "bác sĩ ơi con em nhét hạt đậu vào tai trái từ chiều nay em lấy không được"],
    ["BS", "bé có đau không có chảy máu không"],
    ["BN", "dạ cháu kêu đau ít không thấy chảy máu ạ"],
    ["BS", "cho bé ngồi yên để bác khám ống tai trái có dị vật hạt đậu màng nhĩ không thấy được tôi làm thủ thuật lấy dị vật luôn"],
    ["BS", "lấy được dị vật ống tai ngoài không trầy xước kê thuốc nhỏ tai ngày hai lần trong năm ngày nếu đau nhiều hoặc chảy mủ thì quay lại khám"],
    ["BN", "dạ em cảm ơn bác sĩ"],
  ],
  "trình diễn eForm (viêm tai giữa mạn)": JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/eform/trinh-dien.json"), "utf8"))
    .hoi_thoai.map((d: { ai: "BS" | "BN"; cau: string }) => [d.ai, d.cau]),
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

test("bác sĩ tự đọc (10 ca mẫu, một giọng) được gán BS", () => {
  const thuMuc = path.join(process.cwd(), "data/cases");
  const tep = fs.readdirSync(thuMuc).filter((t) => /^ca-.*\.json$/.test(t));
  assert.ok(tep.length >= 10);
  for (const t of tep) {
    const ca = JSON.parse(fs.readFileSync(path.join(thuMuc, t), "utf8")) as { input_noi: string };
    const ketQua = doanVaiTro([{ speaker: 1, text: ca.input_noi }]);
    assert.equal(ketQua.vaiTro.get(1), "BS", `${t}: ${ketQua.lyDo}`);
  }
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
  assert.equal(doanVaiTro([{ speaker: null, text: "chẩn đoán viêm họng cấp kê đơn" }]).vaiTro.size, 0);
  const ba = doanVaiTro([
    { speaker: 1, text: "chẩn đoán viêm họng cấp kê đơn paracetamol uống ngày ba lần sau ăn hẹn tái khám" },
    { speaker: 2, text: "em bị đau họng mấy hôm nay" },
    { speaker: 3, text: "cháu nó sốt cả đêm" },
  ]);
  assert.equal(ba.vaiTro.size, 0);
});

test("bệnh nhân nhắc lại tên bệnh không đủ để bị coi là bác sĩ", () => {
  const ketQua = doanVaiTro(thanhLuot([
    ["BN", "em bị viêm xoang mấy năm nay rồi bác sĩ ạ dạo này nghẹt mũi lắm"],
    ["BS", "chẩn đoán viêm mũi xoang mạn đợt cấp chỉ định nội soi mũi xoang kê đơn rửa mũi ngày hai lần tái khám sau hai tuần"],
  ], 2));
  assert.equal(ketQua.vaiTro.get(2), "BS");
});

test("chấm điểm theo cụm từ nguyên vẹn, không khớp nửa từ", () => {
  assert.equal(chamDiem("mạch máu").dauHieu.includes("mạch"), true);
  assert.equal(chamDiem("mạchh").bacSi, 0);
  assert.ok(chamDiem("Chẩn đoán: viêm họng cấp.").dauHieu.includes("chẩn đoán"));
});

test("đổi nhãn tạm Người nói N thành BS/BN trong đoạn ghi âm", () => {
  const doan = [
    "Người nói 2: chào bác sĩ em bị đau họng mấy hôm nay nuốt đau lắm có tự mua thuốc uống mà không đỡ",
    "Người nói 1: đau từ khi nào có sốt không há miệng to để tôi khám họng thành sau họng đỏ",
    "câu chưa rõ người nói",
    "Người nói 1: chẩn đoán viêm họng cấp kê đơn paracetamol uống ngày ba lần sau ăn hẹn tái khám",
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
  const gop = "chào bác sĩ em bị đau họng mấy hôm nay nốt đau lắm đau từ khi nào rồi có xuất không dạ từ hôm thứ hai em hơi sốt về đêm em có tự mua thuốc ở hiệu thuốc uống mà không đỡ có dị ứng thuốc gì không dạ không ạ há miệng to nói a để tôi khám họng thành sau hàm đỏ mịn sung huyết không có mủ chẩn đoán viêm họng cấp tôi kê đơn vạ sẽ tạo một năm trăm miligam uống ngày ba lần sau ăn trong năm ngày xúc họng nước muối hẹn khám nếu sốt cao em có phải kiêng gì không bác sĩ uống đủ nước tránh đổ lạnh nhé dạ em cảm ơn bác sĩ";
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
    "Người nói 1: chào bác sĩ em bị đau họng mấy hôm nay nuốt đau lắm có tự mua thuốc uống mà không đỡ",
    "Người nói 2: đau từ khi nào có sốt không há miệng to để tôi khám họng thành sau họng đỏ",
    "Người nói 2: chẩn đoán viêm họng cấp kê đơn paracetamol uống ngày ba lần sau ăn hẹn tái khám",
    "Người nói 1: dạ em cảm ơn bác sĩ",
  ].join("\n");
  const mauThuan = ganVaiTroChoDoan(doan, 1);
  assert.equal(mauThuan.ketQua.vaiTro.size, 0);
  assert.match(mauThuan.ketQua.lyDo, /mâu thuẫn|giống bệnh nhân/);
  assert.equal(ganVaiTroChoDoan(doan, 3).ketQua.vaiTro.get(2), "BS");
  assert.equal(ganVaiTroChoDoan(doan, null).ketQua.vaiTro.get(2), "BS");
});
