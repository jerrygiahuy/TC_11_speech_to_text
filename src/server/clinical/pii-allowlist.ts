import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { foldVietnamese } from "@/shared/clinical/pii";

/** Cụm từ lâm sàng Tim mạch bắt đầu bằng họ hoặc từ trùng họ: không phải tên người. */
const TERMS = [
  "triệu chứng", "tâm thu", "tâm trương", "tâm nhĩ", "tâm thất", "đo huyết áp", "đo điện tim", "đo abi", "đường huyết",
  "đau thắt ngực", "đau ngực", "tức ngực", "nặng ngực", "hồi hộp", "đánh trống ngực", "ngất thoáng qua", "khó thở", "hụt hơi",
  "mạch quay", "mạch ngoại vi", "mạch đều", "nhịp xoang", "nhịp tim", "nhịp nhanh", "nhịp chậm", "rung nhĩ", "rung thất", "cuồng nhĩ",
  "tĩnh mạch cổ", "mỏm tim", "liên sườn", "lồng ngực", "phổi trong", "rì rào phế nang", "ran ẩm", "ran nổ", "ran rít", "âm thổi",
  "tiếng tim", "tiếng t1", "tiếng t2", "rung miu", "phù chân", "phù mắt cá chân", "gan to", "bụng mềm",
  "hở van", "hẹp van", "van hai lá", "van động mạch chủ", "block nhánh", "thiếu máu cơ tim", "nhồi máu cơ tim", "bệnh mạch vành",
  "suy tim", "tăng huyết áp", "huyết áp cao", "cao huyết áp", "rối loạn lipid máu", "mỡ máu", "đái tháo đường", "tiểu đường",
  "điện tâm đồ", "điện tim", "siêu âm tim", "chức năng thận", "dương tính", "tiền sử", "mô phỏng bệnh", "dị ứng",
  "sốt cao", "co giật", "cổ chướng", "phù nề", "niêm mạc", "ung thư", "chóng mặt", "ho khan", "ho có đờm",
];

function readList(rel: string): { ten: string; ten_khac?: string[] }[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8"));
}

/** Danh mục cho phép của R11(c), dùng chung eForm và /demo-luong: thuật ngữ Tim mạch, tên thuốc, tên dịch vụ (đã bỏ dấu). */
export function clinicalAllowlist(): ReadonlySet<string> {
  const out = new Set<string>(TERMS.map(foldVietnamese));
  for (const rel of ["data/catalog/thuoc.json", "data/catalog/dich-vu.json"]) {
    for (const it of readList(rel)) for (const n of [it.ten, ...(it.ten_khac ?? [])]) if (n) out.add(foldVietnamese(n));
  }
  return out;
}
