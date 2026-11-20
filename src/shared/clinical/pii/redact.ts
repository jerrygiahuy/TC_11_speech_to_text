import { HO_VIET } from "./ho-viet";
import type { KnownIdentifier, NerChapNhan, PiiLabelKind, PiiRule, PiiSpan, RedactionResult } from "./types";

/**
 * Bộ che PII tự động pii-auto-2 (R1–R8, nhãn R10, cộng đoạn NER tùy chọn). Chạy được ở cả hai phía, không phụ thuộc chữ hoa.
 * Mọi dò tìm chạy trên hai chuỗi cùng độ dài: `f` (bỏ dấu) và `d` (chữ thường, giữ dấu), có bảng ánh xạ về bản thô.
 * Heuristic, không phải bảo đảm ẩn danh: chốt chặn phần còn sót là việc của bước sau.
 */

const MARK = /^\p{M}$/u;

function foldChunk(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
}

/** Bỏ dấu, đ→d, chữ thường, gộp khoảng trắng. */
export function foldVietnamese(text: string): string {
  return foldChunk(text.normalize("NFC").toLowerCase()).replace(/\s+/g, " ").trim();
}

interface Text { f: string; d: string; startMap: number[]; endMap: number[] }

function buildText(raw: string): Text {
  const clusters: { s: number; e: number; text: string }[] = [];
  let i = 0;
  for (const ch of raw) {
    const len = ch.length;
    const last = clusters[clusters.length - 1];
    if (MARK.test(ch) && last) { last.e = i + len; last.text += ch; } else clusters.push({ s: i, e: i + len, text: ch });
    i += len;
  }
  let f = "", d = "";
  const startMap: number[] = [], endMap: number[] = [];
  let prevSpace = false;
  for (const c of clusters) {
    if (/^\s+$/.test(c.text)) {
      // Cụm khoảng trắng gộp thành một ký tự; có xuống dòng thì giữ "\n" để rule không che lan sang dòng sau
      // và R2 nhận ra đầu câu. Độ dài không đổi nên startMap/endMap vẫn đúng.
      const nl = c.text.includes("\n");
      if (prevSpace) {
        endMap[endMap.length - 1] = c.e;
        if (nl && !f.endsWith("\n")) { f = f.slice(0, -1) + "\n"; d = d.slice(0, -1) + "\n"; }
        continue;
      }
      const ws = nl ? "\n" : " ";
      f += ws; d += ws; startMap.push(c.s); endMap.push(c.e); prevSpace = true; continue;
    }
    prevSpace = false;
    const lower = c.text.normalize("NFC").toLowerCase();
    const folded = foldChunk(lower);
    const dChunk = lower.length === folded.length ? lower : folded;
    for (let k = 0; k < folded.length; k++) { startMap.push(c.s); endMap.push(c.e); }
    f += folded; d += dChunk;
  }
  return { f, d, startMap, endMap };
}

// ---------- Danh sách từ ----------
const STOP_WORDS = [
  "bị", "đau", "ho", "sốt", "khám", "và", "thì", "nên", "có", "không", "đã", "rồi", "ạ", "nhưng", "cũng", "hay", "với",
  "ở", "tại", "là", "đến", "vì", "mà", "anh", "chị", "ông", "bà", "cô", "chú", "bác", "em", "con", "cháu", "tôi", "nói",
  "bảo", "đang", "sẽ", "muốn", "cần", "xin", "ơi", "nhờ", "hỏi", "thấy", "nghe", "ngứa", "chảy", "nhức", "ù", "tai", "mũi",
  "họng", "ngày", "tuần", "tháng", "năm", "nay", "qua", "từ", "trong", "khi", "lúc", "sau", "trước", "này", "đó", "kia",
  "ấy", "nhé", "nha", "vậy", "thế", "nữa", "rất", "hơi", "khá", "quá", "lắm", "đây", "nhà", "xa", "gần", "sĩ",
  // triệu chứng, từ lâm sàng thường đứng sau từ chỉ người
  "viêm", "nghẹt", "khàn", "chóng", "mặt", "tiếng", "khó", "thở", "mệt", "mỏi", "nhẹ", "nặng", "tăng", "giảm", "đỡ",
  "hết", "lành", "tốt", "khô", "ướt", "mủ", "máu", "sưng", "kém", "thường", "nôn", "buồn", "mất", "ngạt", "hắt",
  "nhiễm", "đồng", "ý", "hóa", "nội", "ngoại", "soi", "phẫu", "mổ", "điếc",
  // động từ hay đứng ngay sau tên ("Đỗ Quốc Việt mua thuốc"): đuôi tên dừng ở đây, không che lố
  "mua", "đưa", "dẫn", "gọi", "lấy", "uống", "dùng", "kê", "đi", "về",
  // hư từ hay đứng sau chữ trùng họ trong lời kể liền mạch từ STT ("mỡ máu hơi cao còn tiểu đường")
  "còn", "chưa", "được", "những", "mỗi", "gì", "nào",
  "cái", "các", "cho", "đúng", "cùng", "để", "đấy", "xong", "thứ", "mình", "làm", "xem", "lên", "ra", "vào", "phải",
  "vẫn", "đều", "theo", "bằng", "giúp", "biết", "nhiều", "luôn", "thôi", "nếu", "bệnh", "thuốc",
];
/** Dạng không dấu chỉ áp cho từ viết không dấu ("thị" khác "thì"). */
/** Tên riêng thường gặp trùng dạng không dấu với từ dừng ("hoa"/"hóa", "nam"/"năm"): đuôi tên không bao giờ dừng ở đây. */
const GIVEN_NAMES_FOLD = new Set(["nam", "van", "lam", "bang", "nhung", "cung", "hoa", "mai", "lan", "an", "binh", "tho", "het", "mat", "lanh", "hung", "huong", "thao", "linh", "minh", "my", "nga", "ngoc", "phuong", "thu", "trang", "hanh", "hien", "hieu", "hai", "ha", "hang", "yen", "tam", "tuan", "dung", "duc", "giang", "khanh", "long", "loan", "oanh", "quynh", "son", "tai", "thanh", "thuy", "trung", "vinh", "xuan"]);
const STOP_FOLD = new Set(STOP_WORDS.map(w => foldVietnamese(w)).filter(w => w.length > 1 && !GIVEN_NAMES_FOLD.has(w)));
/** Cặp họ + từ thường gặp không phải tên người ("em bình thường", "bé đồng ý"). */
const COMMON_AFTER_HO = new Set([
  "bình thường", "đồng ý", "tiêu hóa", "tiêu chảy", "bình phục", "đào thải", "tăng huyết", "lâm sàng", "phù nề",
  "phù hợp", "sử dụng", "thân nhiệt", "tiết dịch", "tiết niệu", "cao huyết", "lý do", "ung thư", "mã bệnh",
]);
/** Họ phổ biến: đầu câu không có từ chỉ người thì chỉ nhận các họ này hoặc khi có đệm văn/thị. */
export const COMMON_HO_FOLD: ReadonlySet<string> = new Set(["nguyen", "tran", "le", "pham", "hoang", "huynh", "vo", "vu", "dang", "bui", "ngo", "do", "dinh", "trinh"]);
// "đường" là tên bệnh khi đứng sau "đái tháo", "tiểu", "lượng"... hoặc trước "huyết", "hô hấp"... ("đái tháo đường rối loạn
// mỡ máu" đọc liền không dấu câu). Từ 18/11/2026 đây chỉ là lớp chặn thứ hai: "đường" chỉ được coi là tên đường khi có số
// nhà hoặc dấu hiệu nơi chốn đứng trước (lượt quét R3 "đường" trong redactPii).
const DUONG_SRC = "(?<!(?:tháo|tiểu|lượng|hạ|độ|thử|chỉ số|bột|men|ngọt)\\s+)đường(?!\\s+(?:huyết|ruột|thở|mật|tiêu hóa|hô hấp|niệu|tiết niệu|dẫn|truyền|uống|tiêm|máu|kính|vào|ra|giữa|rạch|mổ|cong|dò|rò|ống|xương|khâu|lệch|sau|trước|bên|tiết|thông|vết|cắt|mê|khí|dài|ngang|dọc|type|tuýp|típ|thai kỳ)(?![\\p{L}]))";
const ADMIN_WORDS = [
  "phố", "ngõ", "ngách", "hẻm", "phường", "xã(?!\\s+hội)", "thị trấn", "quận", "huyện", "thành phố",
  // "bé tỉnh, sốt 38 độ" đọc liền không dấu câu: "tỉnh" là tỉnh táo, không phải đơn vị hành chính
  "tỉnh(?!\\s+(?:táo|dậy|lại|giấc|ngủ|sốt|suốt|không|và|tiếp|xúc))", "thôn", "ấp", "khu phố", "tổ dân phố",
];
const ADMIN_SRC = ADMIN_WORDS.join("|");
const STOP_SRC = STOP_WORDS.join("|");
const SYL = `(?!(?:${ADMIN_SRC}|đường|${STOP_SRC})(?![\\p{L}\\d]))\\p{L}+`;
/** Khoảng trắng trong cùng một dòng: địa danh không bao giờ được che lan sang dòng sau. */
const WS = "[^\\S\\n]+";
/** Dấu hiệu nơi chốn đứng ngay trước "đường" ("ở đường láng", "nhà em đường nguyễn trãi"). */
const DUONG_CUE = `(?:ở|tại|sống(?:${WS}ở)?|địa chỉ(?:${WS}nhà)?(?:${WS}là)?|nhà(?:${WS}(?:em|tôi|mình|cháu|con|anh|chị|ông|bà|bác|cô|chú))?)`;
const SO_NHA = `(?:số(?:${WS}nhà)?${WS})?\\d+[a-z]?(?:/\\d+)*`;
/** Phần tên sau từ hành chính: một số, hoặc tối đa 3 âm tiết trên cùng dòng. */
const TEN_DIA_DANH = `(?:\\d+|${SYL}(?:${WS}${SYL}){0,2})(?![\\p{L}\\d])`;
const CITIES = "hà nội|hồ chí minh|sài gòn|tp\\.?\\s*hcm|đà nẵng|hải phòng|cần thơ|huế";

const HO_D = new Set(HO_VIET);
const AMBIGUOUS_ASCII_HO = new Set(["ho", "do", "la", "mai", "cao", "ta", "chu", "ma", "vi", "ca", "lai", "dang", "ong"]);
const HO_ASCII = new Set(HO_VIET.map(h => foldVietnamese(h)).filter(h => !AMBIGUOUS_ASCII_HO.has(h)));
/** Họ trùng chữ thường khác: đầu câu không có từ chỉ người thì không coi là họ. */
const SENTENCE_START_EXCLUDE = new Set(["cao", "dương", "lâm", "triệu", "trương", "mai", "la", "lã", "hà", "đỗ", "tiêu", "sơn", "đồng", "đào", "chu", "ca", "bình", "hầu", "lại", "ân", "viên", "vi", "sử", "hồ", "thân", "tôn", "tử"]);
const PERSON_TRIGGERS = new Set(["anh", "chị", "ông", "bà", "cô", "chú", "bác", "bé", "em", "con", "cháu", "tên", "bs", "thầy", "mẹ", "bố", "ba", "má", "vợ", "chồng", "là"]);
const TRIGGER_FILLERS = new Set(["sĩ", "là", "nội", "ngoại", "tôi", "của"]);
const STOP_SET = new Set(STOP_WORDS);

/** Dùng chung với chốt chặn R11c: token (chữ thường, giữ dấu) có phải họ người Việt không. */
export function isHo(d: string): boolean {
  if (HO_D.has(d)) return true;
  return /^[a-z]+$/.test(d) && HO_ASCII.has(d);
}

// ---------- Thu thập ứng viên ----------
interface Cand { rule: PiiRule; kind: PiiLabelKind; start: number; end: number; key: string; nguon?: "ner" }
type Add = (rule: PiiRule, kind: PiiLabelKind, s: number, e: number, key?: string, nguon?: "ner") => void;

const UNNUMBERED = new Set<PiiLabelKind>(["BỆNH_NHÂN", "BÁC_SĨ", "NGÀY", "TUỔI", "GIỚI_TÍNH", "NỘI_DUNG_NGOÀI_KHÁM"]);
const RULES: PiiRule[] = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function knownRegex(value: string): RegExp | null {
  const folded = foldVietnamese(value);
  if (folded.replace(/\s/g, "").length < 3) return null;
  const compact = folded.replace(/[\s.-]/g, "");
  const body = /^\+?\d{6,}$/.test(compact)
    ? [...compact].map(esc).join("[\\s.-]*")
    : folded.split(" ").map(esc).join("\\s+");
  return new RegExp(`(?<![a-z0-9])${body}(?![a-z0-9])`, "g");
}

/**
 * `extra`: đoạn do lớp NER thêm (vị trí trên `raw`, đã lọc bằng `locNer`). Được thêm SAU mọi rule nên không thể
 * làm mất đoạn rule đã che; phần chồng lên đoạn đã nhận bị cắt, phần còn lại vẫn che. Không truyền thì như cũ.
 */
export function redactPii(raw: string, known: KnownIdentifier[], extra: readonly NerChapNhan[] = []): RedactionResult {
  const t = buildText(raw);
  const { f, d } = t;
  const accepted: Cand[] = [];
  // Phần chồng lên span đã nhận bị cắt bỏ, phần còn lại vẫn được che (không để lọt mảnh nào).
  const add: Add = (rule, kind, s, e, key, nguon) => {
    // Tên đoán (R2) chồng lên span khác thì bỏ hẳn: mảnh còn lại chỉ là từ thường. Đoạn NER thì vẫn che phần còn lại.
    if (rule === "R2" && !nguon && accepted.some(c => s < c.end && e > c.start)) return;
    let segs: [number, number][] = [[s, e]];
    for (const c of accepted) {
      segs = segs.flatMap(([a, b]): [number, number][] => {
        if (a >= c.end || b <= c.start) return [[a, b]];
        const out: [number, number][] = [];
        if (a < c.start) out.push([a, c.start]);
        if (b > c.end) out.push([c.end, b]);
        return out;
      });
    }
    const whole = segs.length === 1 && segs[0][0] === s && segs[0][1] === e;
    for (let [a, b] of segs) {
      while (a < b && f[a] === " ") a++;
      while (b > a && f[b - 1] === " ") b--;
      if (b <= a) continue;
      accepted.push({ rule, kind, start: a, end: b, key: whole && key ? key : f.slice(a, b).replace(/[\s.,-]/g, ""), ...(nguon ? { nguon } : {}) });
    }
  };
  const scan = (rule: PiiRule, kind: PiiLabelKind, re: RegExp) => {
    for (const m of d.matchAll(re)) if (m[0].length > 0) add(rule, kind, m.index!, m.index! + m[0].length);
  };

  // R1: giá trị đã biết (dài trước)
  const sorted = [...known].filter(k => k.value?.trim()).sort((a, b) => b.value.length - a.value.length);
  for (const k of sorted) {
    const re = knownRegex(k.value);
    if (!re) continue;
    const key = foldVietnamese(k.value).replace(/[\s.-]/g, "");
    for (const m of f.matchAll(re)) add("R1", k.kind, m.index!, m.index! + m[0].length, key);
  }

  // R6: mã định danh
  const idValue = "(?:\\d{4,}(?:[ .-]?\\d{2,})*|[a-z]{1,6}-?\\d{3,}(?:-\\w+)*|\\d{2}[a-z]{1,2}[- ]?\\d{3}\\.?\\d{2})";
  const idKeywords = "cccd|cmnd|căn cước(?: công dân)?|hộ chiếu|(?:thẻ )?bhyt|thẻ bảo hiểm|bảo hiểm(?: y tế| bảo lãnh)?|mã bảo lãnh|pid|mã (?:bệnh nhân|định danh|hồ sơ)|số (?:tài khoản|thẻ|hồ sơ)|stk|tài khoản|biển số(?: xe)?";
  scan("R6", "MÃ_ĐỊNH_DANH", new RegExp(`(?<=(?<![\\p{L}])(?:${idKeywords})\\s*[:：]?\\s*)${idValue}(?![\\p{L}\\d])`, "gu"));
  scan("R6", "MÃ_ĐỊNH_DANH", /(?<![\p{L}\d])\d{2}[a-z]-?\d{3}\.\d{2}(?!\d)/gu);
  scan("R6", "MÃ_ĐỊNH_DANH", /(?<![\p{L}\d])[a-z]{2,5}-\d{4,}(?!\d)/gu);
  scan("R6", "MÃ_ĐỊNH_DANH", /(?<![\d.,])(?:\d{12}|\d{9})(?!\d)/gu);

  // R5: liên hệ
  scan("R5", "LIÊN_HỆ", /[\w.+%-]+@[\w.-]+\.[a-z]{2,}/gu);
  scan("R5", "LIÊN_HỆ", /(?:https?:\/\/|www\.)[^\s,;]*[^\s,;.]/gu);
  scan("R5", "LIÊN_HỆ", /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d])/gu);
  scan("R5", "LIÊN_HỆ", /(?<![\d.,])(?:\+84|0)(?:[\s.-]*\d){8,10}(?!\d)/gu);
  scan("R5", "LIÊN_HỆ", /(?<=(?:số điện thoại|điện thoại|sđt|sdt|zalo|phone|liên hệ)\s*[:：]?\s*)\+?\d(?:[\s.-]?\d){7,}(?!\d)/gu);

  // R4: ngày tháng
  scan("R4", "NGÀY", /(?:ngày\s+)?\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+(?:19|20)\d{2}/gu);
  scan("R4", "NGÀY", /(?<=(?:ngày sinh|sinh ngày|năm sinh|sinh năm)\s*[:：]?\s*)\d{1,4}(?:[/.-]\d{1,4}){0,2}/gu);
  scan("R4", "NGÀY", /(?<![\d/.-])(?:\d{1,2}[/.-]\d{1,2}[/.-](?:19|20)\d{2}|(?:19|20)\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2})(?![\d/])/gu);
  scan("R4", "NGÀY", /(?<=(?:ngày\s+(?:khám|nhập viện|xuất viện|điều trị|tái khám)|(?:khám|nhập viện|xuất viện|điều trị|tái khám)\s+ngày)\s*[:：]?\s*)\d{1,2}[/.-]\d{1,2}(?![\d/.-])/gu);

  // R3: địa chỉ, địa danh
  scan("R3", "ĐỊA_DANH", new RegExp(`(?<![\\p{L}\\d])(?:số${WS}\\d+[a-z]?(?:/\\d+)*${WS})?(?:${ADMIN_SRC})${WS}${TEN_DIA_DANH}`, "gu"));
  // "đường" chỉ là tên đường khi có số nhà ("số 12 đường lê lợi"), dấu hiệu nơi chốn đứng trước ("ở đường láng"),
  // hoặc dạng "đường số 5". Cụm y khoa ("đái đường", "đường tiểu") không có các dấu hiệu này nên không bị che.
  scan("R3", "ĐỊA_DANH", new RegExp(`(?<![\\p{L}\\d])${SO_NHA}${WS}${DUONG_SRC}${WS}${TEN_DIA_DANH}`, "gu"));
  scan("R3", "ĐỊA_DANH", new RegExp(`(?<![\\p{L}\\d])đường${WS}số${WS}\\d+(?![\\p{L}\\d])`, "gu"));
  scan("R3", "ĐỊA_DANH", new RegExp(`(?<=(?<![\\p{L}])${DUONG_CUE}${WS})${DUONG_SRC}${WS}${TEN_DIA_DANH}`, "gu"));
  scan("R3", "ĐỊA_DANH", /(?<![\p{L}\d])số nhà[^\S\n]*\d+[a-z]?(?:\/\d+)*/gu);
  scan("R3", "ĐỊA_DANH", new RegExp(`(?<![\\p{L}])(?:${CITIES})(?![\\p{L}])`, "gu"));
  scan("R3", "ĐỊA_DANH", new RegExp(`(?<=(?<![\\p{L}])(?:quê quán|quê|sống ở|sinh sống ở|cư trú ở|cư trú tại|sống tại|địa chỉ(?: nhà)?(?: là)?)${WS}(?:ở${WS})?)${SYL}(?:${WS}${SYL}){0,2}`, "gu"));

  // R7: thông tin nhạy cảm
  const religions = "thiên chúa(?: giáo)?|công giáo|phật(?: giáo)?|tin lành|hồi(?: giáo)?|cao đài|hòa hảo";
  scan("R7", "THÔNG_TIN_NHẠY_CẢM", /(?<![\p{L}])quốc tịch\s+(?:việt\s+nam|hàn\s+quốc|trung\s+quốc|hoa\s+kỳ|\p{L}+(?:\s+(?:quốc|lan|bản))?)(?![\p{L}])/gu);
  scan("R7", "THÔNG_TIN_NHẠY_CẢM", new RegExp(`(?<![\\p{L}])(?:theo\\s+)?(?:(?<!âm\\s)đạo|tôn giáo)\\s+(?:${religions})(?![\\p{L}])`, "gu"));
  scan("R7", "THÔNG_TIN_NHẠY_CẢM", new RegExp(`(?<![\\p{L}])theo\\s+(?:${religions})(?![\\p{L}])`, "gu"));
  scan("R7", "THÔNG_TIN_NHẠY_CẢM", /(?<![\p{L}])(?:(?:đã|đang)\s+)?(?:ly hôn|li hôn|ly dị|ly thân|góa(?:\s+(?:chồng|vợ))?)(?![\p{L}])/gu);
  scan("R7", "THÔNG_TIN_NHẠY_CẢM", /(?<![\p{L}])(?:dân tộc\s+\p{L}+|đảng viên)(?![\p{L}])/gu);

  // R8: nội dung ngoài khám
  scan("R8", "NỘI_DUNG_NGOÀI_KHÁM", new RegExp(`(?<![\\p{L}])(?:chuyện\\s+(?:vay tiền|mua nhà|làm ăn|tiền bạc|đất đai|chính trị)|nợ nần|tranh chấp tài sản|cờ bạc|cá độ)(?:\\s+(?!(?:${STOP_SRC})(?![\\p{L}]))\\p{L}+){0,4}`, "gu"));

  // R2: tên người, dựa vào từ chỉ người hoặc đầu câu + họ
  nameScan(d, f, add);

  // Tuổi, giới tính (gắn R7 như bộ cũ)
  const age = "\\d{1,3}(?:[.,]\\d+)?\\s*(?:(?:tháng|năm)\\s*)?tuổi";
  scan("R7", "TUỔI", new RegExp(`(?:(?<![\\p{L}])tuổi\\s*[:：]\\s*\\d{1,3}(?:[.,]\\d+)?|(?<![\\p{L}\\d])${age})(?![\\p{L}\\d])`, "gu"));
  scan("R7", "GIỚI_TÍNH", /(?<=(?:giới tính\s*[:：]?\s*|(?<![\p{L}])bệnh nhân\s+|(?<![\p{L}])bn\s*[:：]\s*|tôi là\s+))(?:nam|nữ)(?![\p{L}])/gu);
  scan("R7", "GIỚI_TÍNH", new RegExp(`(?<![\\p{L}])(?:nam|nữ)(?=\\s+${age})`, "gu"));

  // Lớp NER (sau mọi rule): đổi vị trí trên bản thô sang vị trí trên chuỗi gấp `f`.
  for (const x of extra) {
    let a = 0;
    while (a < t.startMap.length && t.startMap[a] < x.start) a++;
    let b = t.endMap.length;
    while (b > a && t.endMap[b - 1] > x.end) b--;
    if (b > a) add(x.rule, x.kind, a, b, f.slice(a, b).replace(/[\s.,-]/g, ""), "ner");
  }

  // Dựng kết quả: sắp theo vị trí, gán nhãn R10
  accepted.sort((a, b) => a.start - b.start);
  const counters = new Map<string, Map<string, number>>();
  const label = (c: Cand): string => {
    if (UNNUMBERED.has(c.kind)) return `[${c.kind}]`;
    let m = counters.get(c.kind);
    if (!m) counters.set(c.kind, m = new Map());
    let n = m.get(c.key);
    if (n === undefined) m.set(c.key, n = m.size + 1);
    return `[${c.kind}_${n}]`;
  };
  const counts = Object.fromEntries(RULES.map(r => [r, 0])) as Record<PiiRule, number>;
  const spans: PiiSpan[] = accepted.map(c => {
    counts[c.rule]++;
    return { rule: c.rule, kind: c.kind, start: t.startMap[c.start], end: t.endMap[c.end - 1], label: label(c), ...(c.nguon ? { nguon: c.nguon } : {}) };
  });
  let clean = raw;
  for (let i = spans.length - 1; i >= 0; i--) clean = clean.slice(0, spans[i].start) + spans[i].label + clean.slice(spans[i].end);
  return { raw, clean, spans, counts };
}

/** Cặp họ + từ thường ("bình thường", "phù nề") không phải tên người. */
export function isCommonHoPair(toks: { w: string }[], j: number): boolean {
  return j + 1 < toks.length && COMMON_AFTER_HO.has(`${toks[j].w} ${toks[j + 1].w}`);
}

/** Âm tiết tiếng Việt (dạng không dấu): phụ âm đầu + vần. Tên thuốc ngoại ("atorvastatin", "amlopin") không khớp. */
const VIET_SYLLABLE = /^(?:ngh|ng|gh|gi|kh|nh|ph|th|tr|ch|qu|[bcdghklmnprstvx])?[aeiouy]{1,3}(?:ng|nh|ch|[cmnpt])?$/;
export function isVietSyllable(w: string): boolean {
  return VIET_SYLLABLE.test(foldVietnamese(w));
}

/**
 * Từ đệm hay gặp. Tên Việt dài hơn 2 âm tiết hầu như luôn có từ đệm ở giữa ("thị", "văn", "minh"...); tên gọi ("tâm",
 * "long", "hằng") đứng cuối, nên chữ ngay sau tên gọi không thuộc tên ("nguyễn thị tâm | dị ứng"). Không đưa vào đây tên
 * gọi hay đứng cuối (tâm, long, tám, hằng, mai, nam, hà): thà để NER che bù đuôi tên còn hơn nuốt chữ lâm sàng.
 */
const TEN_DEM_LIST = [
  "văn", "thị", "hữu", "đức", "công", "quang", "minh", "ngọc", "thanh", "thu", "kim", "hoàng", "quốc", "gia", "bảo", "xuân",
  "hồng", "thùy", "thúy", "phương", "anh", "hải", "việt", "nhật", "hoài", "như", "bích", "cẩm", "kiều", "mỹ", "diệu",
  "khánh", "đình", "trọng", "bá", "tiến", "mạnh", "duy", "trung", "tấn", "thế", "huy", "phúc", "đăng", "thái", "tuấn",
  "ngân", "tường", "vĩnh", "mộng", "tố", "hoa",
  // họ kép "Tôn Thất": "thất" đứng giữa như từ đệm ("tôn thất minh")
  "thất",
];
const TEN_DEM: ReadonlySet<string> = new Set(TEN_DEM_LIST);
const TEN_DEM_FOLD: ReadonlySet<string> = new Set(TEN_DEM_LIST.map(w => foldVietnamese(w)));
/** Từ dừng vẫn là âm tiết tên khi đứng sau từ đệm ("ngọc anh", "gia bảo"). */
const TEN_TRUNG_TU_DUNG: ReadonlySet<string> = new Set(["anh", "bảo", "bao"]);
const laTenDem = (w: string) => TEN_DEM.has(w) || (/^[a-z]+$/.test(w) && TEN_DEM_FOLD.has(w));

/**
 * Chỉ số token ngay sau đuôi tên bắt đầu sau họ ở `j` (tối đa 3 âm tiết tiếng Việt, dừng ở từ dừng/dấu ngắt). Âm tiết thứ
 * hai trở đi của đuôi chỉ được nhận khi âm tiết ngay trước là từ đệm. Dùng chung với R11c.
 */
export function nameTailEnd(toks: { w: string }[], j: number, joined: (a: number, b: number) => boolean): number {
  let k = j + 1;
  while (k <= j + 3 && k < toks.length && joined(k - 1, k) && /^\p{L}+$/u.test(toks[k].w) && isVietSyllable(toks[k].w)) {
    const w = toks[k].w;
    if (k >= j + 2 && !laTenDem(toks[k - 1].w)) break;
    const tuDung = STOP_SET.has(w) || (/^[a-z]+$/.test(w) && STOP_FOLD.has(w));
    // Chữ không dấu "thi" ngay sau họ là "thị", không phải "thì" ("nguyen thi tam").
    if (tuDung && !(k >= j + 2 && TEN_TRUNG_TU_DUNG.has(w)) && !(k === j + 1 && w === "thi")) break;
    k++;
  }
  return k;
}

function nameScan(d: string, f: string, add: Add): void {
  const toks = [...d.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ w: m[0], s: m.index!, e: m.index! + m[0].length }));
  const joined = (a: number, b: number) => !/[,;.!?\n:]/.test(d.slice(toks[a].e, toks[b].s));
  const startOfSentence = (i: number) => i === 0 || /[.!?\n]/.test(d.slice(toks[i - 1].e, toks[i].s));
  for (let i = 0; i < toks.length; i++) {
    let j = -1;
    let needFollow = 1;
    if (PERSON_TRIGGERS.has(toks[i].w)) {
      j = i + 1;
      needFollow = toks[i].w === "là" ? 2 : 1;
      for (let n = 0; n < 3 && j < toks.length && TRIGGER_FILLERS.has(toks[j].w) && joined(j - 1, j); n++) j++;
      if (j < toks.length && !joined(j - 1, j)) continue;
    } else if (startOfSentence(i) && !SENTENCE_START_EXCLUDE.has(toks[i].w)) {
      j = i;
      needFollow = 2;
    }
    if (j < 0 || j >= toks.length || !isHo(toks[j].w)) continue;
    if (isCommonHoPair(toks, j)) continue;
    if (j === i && !COMMON_HO_FOLD.has(foldVietnamese(toks[j].w)) && !(j + 1 < toks.length && (toks[j + 1].w === "văn" || toks[j + 1].w === "thị"))) continue;
    const k = nameTailEnd(toks, j, joined);
    if (k - j - 1 < needFollow) continue;
    const s = toks[j].s, e = toks[k - 1].e;
    add("R2", "NGƯỜI", s, e, f.slice(s, e).replace(/\s/g, ""));
    i = k - 1;
  }
}
