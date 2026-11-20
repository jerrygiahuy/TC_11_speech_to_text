/**
 * Đoán giọng nào là bác sĩ, giọng nào là bệnh nhân từ nội dung lời nói của cả buổi khám.
 *
 * Máy phân tách người nói chỉ cho nhãn "Người nói 1/2", không biết vai trò. Bác sĩ không phải
 * bấm chọn gì: sau khi dừng ghi âm, mỗi giọng được chấm điểm theo các dấu hiệu lời bác sĩ
 * (chẩn đoán, chỉ định, kê đơn, hỏi bệnh, thuật ngữ khám) và lời bệnh nhân (kể triệu chứng
 * ngôi thứ nhất, gọi "bác sĩ", hỏi về bệnh, câu đáp "dạ/vâng"). Chỉ gán khi đủ nhiều dấu hiệu
 * và hai giọng chênh nhau rõ; không chắc thì giữ "chưa rõ người nói" như trước, không đoán bừa.
 *
 * Chạy trên trình duyệt, không gọi LLM, không lưu đặc trưng giọng.
 */

export type VaiTro = "BS" | "BN";

/** Một lượt nói: speaker null là đoạn chưa rõ người nói hoặc nói chồng */
export interface LuotNoi {
  speaker: number | null;
  text: string;
}

export interface DiemNguoiNoi {
  bacSi: number;
  benhNhan: number;
  /** Các dấu hiệu đã khớp, để giải thích */
  dauHieu: string[];
}

export interface KetQuaVaiTro {
  /** Vai trò đã gán cho từng người nói; rỗng khi chưa đủ dấu hiệu */
  vaiTro: Map<number, VaiTro>;
  diem: Map<number, DiemNguoiNoi>;
  /** Lý do ngắn bằng tiếng Việt, hiện cho bác sĩ */
  lyDo: string;
}

type BoDauHieu = [cumTu: string, trongSo: number][];

/** Dấu hiệu lời bác sĩ. Trọng số 3: gần như chỉ bác sĩ nói; 2: thường là bác sĩ; 1: gợi ý yếu. */
const DAU_HIEU_BAC_SI: BoDauHieu = [
  // Quyết định chuyên môn
  ["chẩn đoán", 3], ["chẩn đoán sơ bộ", 3], ["chẩn đoán ban đầu", 3], ["chẩn đoán xác định", 3], ["chẩn đoán phân biệt", 3],
  ["chỉ định", 3], ["cho chỉ định", 3], ["kê đơn", 3], ["kê toa", 3], ["kê thuốc", 3], ["đơn thuốc", 2], ["toa thuốc", 2],
  ["hướng điều trị", 3], ["điều trị nội khoa", 3], ["điều trị ngoại khoa", 3], ["điều trị ngoại trú", 3], ["điều trị nội trú", 3],
  ["nhập viện", 2], ["chuyển viện", 3], ["chuyển tuyến", 3], ["hội chẩn", 3], ["phẫu thuật", 2], ["thủ thuật", 2], ["làm thủ thuật", 3],
  ["hẹn tái khám", 3], ["tái khám", 2], ["hẹn khám lại", 3], ["quay lại khám", 2], ["quay lại ngay", 3], ["khám lại sau", 3],
  ["lời dặn", 3], ["dặn dò", 2], ["theo dõi thêm", 2], ["theo dõi", 1], ["cần theo dõi", 2],
  // Cận lâm sàng
  ["nội soi", 2], ["nội soi tai mũi họng", 3], ["nội soi mũi xoang", 3], ["nội soi thanh quản", 3], ["xét nghiệm", 2], ["làm xét nghiệm", 3],
  ["công thức máu", 3], ["chụp phim", 3], ["chụp ct", 3], ["chụp cắt lớp", 3], ["chụp x quang", 3], ["siêu âm", 2], ["đo thính lực", 3],
  ["đo nhĩ lượng", 3], ["thính lực đồ", 3], ["sinh thiết", 3], ["cấy dịch", 3], ["kháng sinh đồ", 3],
  // Liều dùng
  ["uống ngày", 3], ["ngày uống", 3], ["mỗi lần uống", 3], ["uống mỗi lần", 3], ["ngày hai lần", 2], ["ngày ba lần", 2], ["ngày một lần", 2],
  ["sau ăn", 2], ["trước ăn", 2], ["sau khi ăn", 2], ["trong bảy ngày", 2], ["trong năm ngày", 2], ["trong mười ngày", 2], ["dùng trong", 2],
  ["miligam", 3], ["mi li gam", 3], ["mg", 3], ["mililit", 2], ["dạng gói", 3], ["dạng viên", 3], ["viên nén", 3], ["viên nang", 3],
  ["nhỏ mũi", 2], ["xịt mũi", 2], ["nhỏ tai", 2], ["súc họng", 2], ["rửa mũi", 2], ["xông mũi", 2], ["khi sốt trên", 3], ["khi sốt", 1],
  ["amoxicillin", 2], ["amoxi", 2], ["paracetamol", 1], ["augmentin", 2], ["cefuroxim", 2], ["prednisolon", 2], ["methylprednisolon", 2],
  // Khám thực thể và thuật ngữ
  ["khám thấy", 3], ["thăm khám", 3], ["ghi nhận", 2], ["toàn thân", 2], ["tri giác", 3], ["tỉnh táo", 2], ["sinh hiệu", 3], ["dấu hiệu sinh tồn", 3],
  ["huyết áp", 1], ["mạch", 1], ["nhiệt độ", 1], ["màng nhĩ", 3], ["nón sáng", 3], ["ống tai", 2], ["ống tai ngoài", 3], ["niêm mạc", 3],
  ["cuốn mũi", 3], ["cuốn dưới", 3], ["vách ngăn", 3], ["khe giữa", 3], ["ngách mũi", 3], ["thành sau họng", 3], ["hạch cổ", 2],
  ["sung huyết", 3], ["phù nề", 3], ["xuất tiết", 3], ["thâm nhiễm", 3], ["quá phát", 3], ["xung huyết", 3], ["dịch nhầy", 2], ["dịch mủ", 2],
  ["dây thanh", 3], ["thanh quản", 2], ["sụn nắp", 3], ["xoang hàm", 2], ["xoang sàng", 3], ["xoang trán", 2], ["vòi nhĩ", 3],
  ["amidan độ", 3], ["quá phát độ", 3], ["độ một", 1], ["độ hai", 1], ["độ ba", 1],
  // Chẩn đoán gọi theo kiểu bác sĩ
  ["viêm tai giữa cấp", 2], ["viêm tai giữa mạn", 2], ["viêm mũi xoang", 2], ["viêm họng cấp", 2], ["viêm amidan cấp", 2], ["viêm thanh quản", 2],
  ["viêm tai ngoài", 2], ["dị vật", 2], ["polyp", 2], ["u nang", 2], ["trào ngược họng thanh quản", 3],
  // Hỏi bệnh, hướng dẫn khi khám
  ["bao lâu rồi", 2], ["từ khi nào", 2], ["từ bao giờ", 2], ["mấy ngày rồi", 2], ["có sốt không", 3], ["có ho không", 3], ["có đau không", 2],
  ["có chảy mủ không", 3], ["có nghe kém không", 3], ["có chóng mặt không", 3], ["có ù tai không", 3], ["có nghẹt mũi không", 3],
  ["đau bên nào", 3], ["bên nào", 1], ["có dị ứng", 2], ["dị ứng thuốc gì không", 3], ["có dị ứng thuốc không", 3], ["có bệnh gì không", 2],
  ["có đang uống thuốc gì không", 3], ["đã uống thuốc gì chưa", 3], ["tiền sử", 2], ["bệnh sử", 3], ["lý do khám", 3], ["vào khám vì", 3],
  ["đến khám vì", 3], ["đi khám vì", 2], ["há miệng", 3], ["há to", 3], ["thè lưỡi", 3], ["nói a", 3], ["ngửa cổ", 3], ["nghiêng đầu", 3],
  ["ngồi yên", 3], ["ngồi thẳng", 2], ["để tôi khám", 3], ["để bác khám", 3], ["để tôi xem", 3], ["để bác xem", 3], ["cho tôi xem", 2],
  ["hít vào", 2], ["thở ra", 2], ["nuốt thử", 3], ["bệnh nhân", 2], ["người bệnh", 2], ["bé này", 2], ["cháu này", 2],
  ["không sao đâu", 2], ["yên tâm", 1], ["nhớ uống", 3], ["uống đủ nước", 2], ["uống thuốc đều", 3], ["không được tự ý", 3], ["tránh", 1],
  ["kiêng", 1], ["nhé", 1],
];

/** Dấu hiệu lời bệnh nhân (hoặc người nhà nói thay). */
const DAU_HIEU_BENH_NHAN: BoDauHieu = [
  // Gọi bác sĩ
  ["bác sĩ ơi", 3], ["thưa bác sĩ", 3], ["dạ bác sĩ", 3], ["bác sĩ ạ", 3], ["bác sĩ", 1], ["bác ơi", 2], ["chào bác sĩ", 3],
  // Kể bệnh ngôi thứ nhất
  ["tôi bị", 3], ["em bị", 3], ["cháu bị", 2], ["con bị", 2], ["mình bị", 3], ["tôi đau", 3], ["em đau", 3], ["cháu đau", 2], ["con đau", 2],
  ["tôi thấy", 2], ["em thấy", 2], ["tôi hay", 2], ["em hay", 2], ["tôi cứ", 2], ["em cứ", 2], ["tôi có", 1], ["em có", 1], ["tôi không", 1],
  ["em không", 1], ["tôi nghe", 2], ["em nghe", 2], ["tôi ngủ", 2], ["em ngủ", 2], ["tôi ăn", 2], ["em ăn", 2], ["tôi nuốt", 3], ["em nuốt", 3],
  ["con tôi", 3], ["con em", 3], ["cháu nó", 3], ["bé nhà", 3], ["nhà tôi", 2], ["nhà em", 2], ["ông nhà", 3], ["bà nhà", 3], ["mẹ tôi", 3],
  ["bố tôi", 3], ["con nhà", 2],
  // Mốc thời gian kiểu kể chuyện
  ["dạo này", 2], ["mấy hôm nay", 2], ["mấy hôm", 1], ["mấy ngày nay", 2], ["mấy bữa nay", 3], ["mấy bữa", 2], ["hôm qua", 1], ["tối qua", 2],
  ["đêm qua", 2], ["sáng nay", 1], ["tuần trước", 1], ["từ hôm", 2], ["lâu lâu", 2], ["thỉnh thoảng", 1], ["suốt", 1], ["cả đêm", 2],
  // Cảm giác, từ ngữ đời thường
  ["khó chịu", 2], ["mệt", 1], ["nhức", 2], ["nhức đầu", 2], ["ê ẩm", 3], ["rát", 2], ["ngứa", 1], ["vướng", 2], ["nghèn nghẹn", 3],
  ["ù tai", 1], ["ù ù", 3], ["nghẹt mũi", 1], ["tắc mũi", 1], ["chảy nước mũi", 2], ["hắt hơi", 1], ["khàn tiếng", 1], ["mất tiếng", 1],
  ["đau quá", 3], ["khó thở", 1], ["không ngủ được", 3], ["không ăn được", 3], ["nuốt đau", 2], ["đau lắm", 3], ["hơi đau", 2], ["hơi sốt", 2],
  ["sốt nhẹ", 1], ["sốt cao", 1], ["chảy mủ", 1], ["nghe kém", 1], ["chóng mặt", 1], ["không đỡ", 3], ["đỡ hơn", 2], ["không thấy đỡ", 3],
  // Tự dùng thuốc
  ["tôi uống", 3], ["em uống", 3], ["đã uống", 2], ["có uống", 2], ["tự mua", 3], ["mua thuốc", 3], ["hiệu thuốc", 3], ["tiệm thuốc", 3],
  ["nhà thuốc", 2], ["tự nhỏ", 3], ["tự uống", 3], ["uống thuốc rồi", 3], ["thuốc nam", 3],
  // Hỏi bác sĩ
  ["có sao không", 3], ["có nặng không", 3], ["có nguy hiểm không", 3], ["bao giờ khỏi", 3], ["bao lâu thì khỏi", 3], ["có phải mổ không", 3],
  ["có phải mổ", 3], ["có cần mổ", 3], ["có lây không", 3], ["uống thuốc gì", 2], ["có được", 2], ["có cần", 1], ["phải kiêng gì", 3],
  ["kiêng gì", 3], ["bao nhiêu tiền", 3], ["bảo hiểm", 2], ["có được đi", 3], ["đi làm được không", 3], ["đi học được không", 3],
  // Câu đáp
  ["dạ", 1], ["vâng", 1], ["dạ có", 2], ["dạ không", 2], ["dạ vâng", 2], ["không ạ", 2], ["có ạ", 2], ["rồi ạ", 2], ["chưa ạ", 2], ["ạ", 1],
  ["cảm ơn bác sĩ", 3], ["em cảm ơn", 3], ["cháu cảm ơn", 3],
];

/** Điểm tối thiểu của giọng được coi là bác sĩ: tương đương ít nhất ba dấu hiệu mạnh. */
export const DIEM_TOI_THIEU = 9;
/** Hai giọng phải chênh nhau ít nhất chừng này điểm (lời bác sĩ trừ lời bệnh nhân). */
export const CHENH_TOI_THIEU = 8;
/** Chỉ một giọng: dấu hiệu vai còn lại không được quá 25% (bác sĩ tự đọc 10 ca mẫu: tối đa 20%). */
const TI_LE_LAN = 0.25;
/** Hai giọng: giọng được chọn làm bác sĩ không được chứa lời bệnh nhân quá 50% điểm lời bác sĩ. */
const TI_LE_LAN_HAI_GIONG = 0.5;
/** Mỗi cụm từ tính tối đa chừng này lần, để một từ lặp lại không áp đảo. */
const TOI_DA_MOI_CUM = 2;

/** Chữ thường, bỏ dấu câu, gom khoảng trắng; giữ dấu tiếng Việt vì ASR trả chữ có dấu. */
function chuanHoa(text: string): string {
  return ` ${text.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

function demCum(vanBan: string, cum: string): number {
  const mau = ` ${cum} `;
  let lan = 0;
  for (let i = vanBan.indexOf(mau); i >= 0 && lan < TOI_DA_MOI_CUM; i = vanBan.indexOf(mau, i + 1)) lan++;
  return lan;
}

function cham(vanBan: string, bo: BoDauHieu, dauHieu: string[]): number {
  let diem = 0;
  for (const [cum, trongSo] of bo) {
    const lan = demCum(vanBan, cum);
    if (lan) {
      diem += lan * trongSo;
      dauHieu.push(cum);
    }
  }
  return diem;
}

/** Chấm điểm một đoạn lời (dùng cho test và giải thích). */
export function chamDiem(text: string): DiemNguoiNoi {
  const vanBan = chuanHoa(text);
  const dauHieu: string[] = [];
  const bacSi = cham(vanBan, DAU_HIEU_BAC_SI, dauHieu);
  const benhNhan = cham(vanBan, DAU_HIEU_BENH_NHAN, dauHieu);
  return { bacSi, benhNhan, dauHieu };
}

/** Gộp lời theo người nói rồi quyết định vai trò. Lượt chưa rõ người nói không tính. */
export function doanVaiTro(luot: LuotNoi[]): KetQuaVaiTro {
  const loi = new Map<number, string[]>();
  for (const { speaker, text } of luot) {
    if (speaker === null || !text.trim()) continue;
    loi.set(speaker, [...(loi.get(speaker) ?? []), text]);
  }
  const diem = new Map<number, DiemNguoiNoi>();
  for (const [speaker, cau] of loi) diem.set(speaker, chamDiem(cau.join(" . ")));
  const vaiTro = new Map<number, VaiTro>();
  const rong = (lyDo: string): KetQuaVaiTro => ({ vaiTro, diem, lyDo });

  if (diem.size === 0) return rong("Không có lượt nói nào rõ người nói.");
  if (diem.size > 2) return rong("Có hơn hai giọng, chưa tự phân vai được.");
  const net = (d: DiemNguoiNoi) => d.bacSi - d.benhNhan;
  const xep = [...diem].sort((a, b) => net(b[1]) - net(a[1]));
  const [bacSi, diemBacSi] = xep[0];

  if (xep.length === 1) {
    // Một giọng: bác sĩ tự đọc, hoặc chỉ thu được lời bệnh nhân. Nếu lẫn nhiều dấu hiệu của cả hai vai thì có thể
    // máy chưa tách được hai người (giọng giống nhau, nói chồng): gán cả đoạn cho một vai sẽ sai một nửa, nên không gán.
    if (diemBacSi.bacSi >= DIEM_TOI_THIEU && diemBacSi.benhNhan <= diemBacSi.bacSi * TI_LE_LAN) {
      vaiTro.set(bacSi, "BS");
      return rong("Chỉ có một giọng, lời nói mang dấu hiệu của bác sĩ.");
    }
    if (diemBacSi.benhNhan >= DIEM_TOI_THIEU && diemBacSi.bacSi <= diemBacSi.benhNhan * TI_LE_LAN) {
      vaiTro.set(bacSi, "BN");
      return rong("Chỉ có một giọng, lời nói mang dấu hiệu của bệnh nhân.");
    }
    if (diemBacSi.bacSi >= DIEM_TOI_THIEU && diemBacSi.benhNhan >= DIEM_TOI_THIEU) {
      return rong("Chỉ nhận ra một giọng nhưng có cả lời bác sĩ lẫn lời bệnh nhân (máy chưa tách được hai người), nên chưa gán vai.");
    }
    return rong("Chỉ có một giọng và chưa đủ dấu hiệu để biết là bác sĩ hay bệnh nhân.");
  }

  const [benhNhan, diemBenhNhan] = xep[1];
  if (diemBacSi.bacSi < DIEM_TOI_THIEU) return rong("Chưa đủ dấu hiệu lời bác sĩ (chẩn đoán, chỉ định, hỏi bệnh…) để phân vai.");
  if (net(diemBacSi) - net(diemBenhNhan) < CHENH_TOI_THIEU) return rong("Hai giọng có dấu hiệu gần giống nhau, chưa phân vai chắc chắn.");
  if (diemBacSi.benhNhan > diemBacSi.bacSi * TI_LE_LAN_HAI_GIONG) {
    return rong("Giọng có nhiều lời bác sĩ cũng chứa nhiều lời bệnh nhân (máy có thể gộp nhầm hai người), nên chưa gán vai.");
  }
  vaiTro.set(bacSi, "BS");
  vaiTro.set(benhNhan, "BN");
  return rong(`Người nói ${bacSi} là bác sĩ, người nói ${benhNhan} là bệnh nhân (theo nội dung lời nói).`);
}

/** Nhãn tạm trong ô nhập khi đang ghi âm */
export const nhanNguoiNoi = (speaker: number) => `Người nói ${speaker}: `;
const NHAN_TAM = /^Người nói (\d+):\s*/u;

/**
 * Kết hợp giọng bác sĩ đã đăng ký với đoán theo nội dung. Giọng khớp rõ thì ưu tiên giọng (đúng cả khi buổi khám
 * ít lời chuyên môn); nhưng nếu nội dung chắc chắn chỉ ra giọng đó là bệnh nhân thì hai nguồn mâu thuẫn, không gán.
 */
export function ketHopGiongBacSi(luot: LuotNoi[], giongBacSi: number | null | undefined): KetQuaVaiTro {
  const theoNoiDung = doanVaiTro(luot);
  const nguoiNoi = [...new Set(luot.map((item) => item.speaker).filter((s): s is number => s !== null))];
  if (!giongBacSi || !nguoiNoi.includes(giongBacSi)) return theoNoiDung;
  const { diem } = theoNoiDung;
  if (theoNoiDung.vaiTro.get(giongBacSi) === "BN") {
    return { vaiTro: new Map(), diem, lyDo: `Giọng bác sĩ đã đăng ký là người nói ${giongBacSi}, nhưng nội dung lời nói lại giống bệnh nhân, nên chưa gán vai.` };
  }
  if (nguoiNoi.length > 2) return { vaiTro: new Map(), diem, lyDo: "Có hơn hai giọng, chưa tự phân vai được." };
  const vaiTro = new Map<number, VaiTro>([[giongBacSi, "BS"]]);
  for (const s of nguoiNoi) if (s !== giongBacSi) vaiTro.set(s, "BN");
  return { vaiTro, diem, lyDo: `Nhận ra giọng bác sĩ đã đăng ký (người nói ${giongBacSi}).` };
}

/**
 * Đổi nhãn tạm "Người nói N:" trong đoạn chữ của một lần ghi âm thành "BS:"/"BN:".
 * Không đủ dấu hiệu thì bỏ nhãn tạm (lượt đó là chưa rõ người nói, như khi chưa có phân tách).
 * giongBacSi: người nói khớp giọng bác sĩ đã đăng ký (STT backend so khi chốt phiên), nếu có.
 */
export function ganVaiTroChoDoan(doan: string, giongBacSi?: number | null): { text: string; ketQua: KetQuaVaiTro } {
  const dong = doan.split("\n");
  const luot: LuotNoi[] = dong.map((line) => {
    const m = NHAN_TAM.exec(line);
    return m ? { speaker: Number(m[1]), text: line.slice(m[0].length) } : { speaker: null, text: line };
  });
  const ketQua = ketHopGiongBacSi(luot, giongBacSi);
  const text = dong.map((line, i) => {
    const { speaker, text: noiDung } = luot[i];
    if (speaker === null) return line;
    const vai = ketQua.vaiTro.get(speaker);
    return vai ? `${vai}: ${noiDung}` : noiDung;
  }).join("\n");
  return { text, ketQua };
}

/** Một từ ASR kèm người nói (khớp SpeakerWord của lib/stt) */
export interface TuCoNguoiNoi {
  text: string;
  speaker: number | null;
  overlap?: boolean;
}

/**
 * Ghép từ thành chữ theo lượt: đổi người nói thì xuống dòng và thêm nhãn tạm "Người nói N:".
 * `truoc` là người nói của từ cuối đã ghép ở lần trước (undefined: chưa ghép gì) để nối tiếp đúng lượt.
 * Chữ trả về bắt đầu bằng "\n" khi mở lượt mới; nối tiếp lượt cũ thì không có khoảng trắng đầu.
 */
export function ghepTheoNguoiNoi(tu: TuCoNguoiNoi[], truoc?: number | null): { text: string; cuoi: number | null | undefined } {
  let text = "";
  let cuoi = truoc;
  const nguoi = tu.map((w) => (w.overlap ? null : w.speaker));
  for (let i = 0; i < tu.length; i++) {
    const w = tu[i];
    let ai = nguoi[i];
    if (ai === null && cuoi !== undefined && cuoi !== null) {
      // Từ lẻ chưa rõ người nói ở chỗ nối đoạn (tối đa 2 từ, hoặc kẹp giữa hai đoạn của cùng người) nối tiếp lượt đang nói.
      // Đoạn chưa rõ dài hơn có thể là người thứ ba (người nhà): để thành dòng riêng không nhãn, không gộp vào lời bác sĩ.
      let j = i;
      while (j < tu.length && nguoi[j] === null) j++;
      if (j - i <= 2 || nguoi[j] === cuoi) ai = cuoi;
    }
    if (ai !== cuoi) {
      text += `\n${ai ? nhanNguoiNoi(ai) : ""}${w.text}`;
      cuoi = ai;
    } else text += text ? ` ${w.text}` : w.text;
  }
  return { text, cuoi };
}

/** Nối chữ mới vào ô nhập: chữ mở lượt mới (bắt đầu "\n") hoặc lần ghi mới thì xuống dòng, cùng lượt thì cách một dấu cách. */
export function noiChu(hienTai: string, moi: string, cungLanGhi: boolean): string {
  if (!moi) return hienTai;
  if (!hienTai) return moi.replace(/^\n/, "");
  if (moi.startsWith("\n")) return hienTai + moi;
  return `${hienTai}${cungLanGhi ? " " : "\n"}${moi}`;
}
