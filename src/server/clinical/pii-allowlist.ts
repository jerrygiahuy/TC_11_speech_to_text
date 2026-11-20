import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { foldVietnamese } from "@/shared/clinical/pii";

/** Cụm từ lâm sàng TMH bắt đầu bằng họ hoặc từ trùng họ: không phải tên người. */
const TERMS = [
  "dịch nhầy", "phù thanh quản", "sốt cao", "cao liên tục", "co giật", "cổ chướng", "mạc treo",
  "ung thư", "ung thư vòm", "vòm họng", "mạc nhĩ", "thông khí", "dị vật", "đường thở",
  "hạ họng", "tai ngoài", "tai giữa", "tai trong", "viêm xoang", "viêm mũi", "viêm họng", "viêm amidan",
  "ho khan", "ho có đờm", "đau họng", "nghẹt mũi", "chảy mũi", "ù tai", "nghe kém", "thủng màng nhĩ", "chóng mặt",
  "cao huyết áp", "huyết áp cao", "tiền sử", "dương tính", "phù nề", "niêm mạc", "dịch mủ", "mô phỏng bệnh",
];

function readList(rel: string): { ten: string; ten_khac?: string[] }[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8"));
}

/** Danh mục cho phép của R11(c), dùng chung eForm và /demo-luong: thuật ngữ TMH, tên thuốc, tên dịch vụ (đã bỏ dấu). */
export function clinicalAllowlist(): ReadonlySet<string> {
  const out = new Set<string>(TERMS.map(foldVietnamese));
  for (const rel of ["data/catalog/thuoc.json", "data/catalog/dich-vu.json"]) {
    for (const it of readList(rel)) for (const n of [it.ten, ...(it.ten_khac ?? [])]) if (n) out.add(foldVietnamese(n));
  }
  return out;
}
