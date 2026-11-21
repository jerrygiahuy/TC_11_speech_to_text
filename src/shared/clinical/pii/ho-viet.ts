/** Các họ người Việt thường gặp, chữ thường có dấu. Dùng dò tên khi STT không có chữ hoa. */
export const HO_VIET: readonly string[] = [
  "nguyễn", "trần", "lê", "phạm", "hoàng", "huỳnh", "phan", "vũ", "võ", "đặng",
  "bùi", "đỗ", "hồ", "ngô", "dương", "lý", "đoàn", "trịnh", "đinh", "lâm",
  "phùng", "mai", "tô", "trương", "hà", "cao", "lương", "tạ", "quách", "thái",
  "la", "giang", "kiều", "diệp", "chu", "châu", "thạch", "âu", "tăng", "tống",
  "lục", "cù", "viên", "khúc", "nghiêm", "thân", "vương", "lại", "nông", "doãn",
  "hứa", "mạc", "lò", "bạch", "danh", "lưu", "sơn", "trà", "tiêu", "cung",
  "hàn", "ân", "đàm", "đào", "đồng", "đới", "cổ", "chử", "ca", "bành",
  "bá", "biện", "bế", "bình", "bồ", "cấn", "chiêm", "chung", "cồ", "diêm",
  "dư", "dịch", "điền", "giáp", "hầu", "khổng", "khương", "kha", "lăng", "lã",
  "lều", "liễu", "lô", "lữ", "ma", "mã", "mông", "ngạc", "nhâm", "ninh",
  "phí", "phó", "phù", "quản", "sầm", "sái", "tào", "tiết", "tôn", "tử",
  "triệu", "ung", "ứng", "uông", "vi", "vưu", "sử",
];

/**
 * Họ trùng từ thường hay gặp trong lời nói ("lại", "danh sách", "mã", "lô", "hà", "cao", "hồ sơ", "lý do"...).
 * Chốt chặn R11c (không có từ chỉ người đứng trước) chỉ coi là tên khi có đệm văn/thị hoặc ≥ 2 âm tiết sau họ.
 */
export const HO_TRUNG_TU_THUONG: ReadonlySet<string> = new Set([
  "lại", "danh", "mã", "lô", "hà", "cao", "viên", "hồ", "lâm", "mai", "tô", "tạ", "la", "giang", "châu", "âu", "tăng",
  "cù", "khúc", "thân", "nông", "lò", "bạch", "sơn", "trà", "tiêu", "cung", "hàn", "ân", "đàm", "đào", "đồng", "cổ", "ca",
  "bá", "bình", "bồ", "chung", "dư", "dịch", "điền", "hầu", "kha", "lăng", "lã", "lều", "liễu", "ma", "mông", "ninh",
  "phí", "phó", "phù", "quản", "sái", "tiết", "tôn", "tử", "ung", "ứng", "vi", "sử", "dương", "lý", "thái", "thạch",
  "lục", "chu", "mạc", "cấn", "bế", "diêm", "lương", "tào",
]);
