import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const GOC = resolve(process.cwd());
const BO_QUA_THU_MUC = new Set(["node_modules", "__pycache__", ".venv-stt", ".next"]);
const BO_QUA_DUONG_DAN = [join("data", "cardiology")];
const DUOI_CHUNG = [".ts", ".tsx", ".json", ".py"];
const DUOI_STT = [".py"];
const FILE_NAY = relative(GOC, resolve(__dirname, "khong-con-tmh.test.ts"));

const MAU_TMH =
  /TMH|[Tt]ai [Mm]ũi [Hh]ọng|viêm tai|amidan|màng nhĩ|viêm xoang|họng|nhỏ tai|xịt mũi|\bH6[0-9]\.|"tai"|"mui"|"vom"|"hong"/;

/**
 * Ngoại lệ có chủ đích, hẹp: chỉ bỏ qua dòng ở đúng file mà chứa đúng chuỗi này (không bỏ cả file, không đổi regex).
 * Mỗi mục phải còn khớp ít nhất một dòng, nếu không là ngoại lệ mồ côi và test fail.
 */
const THONG_BAO_CU = "Hồ sơ TMH cũ (schema 1.x) không dùng được cho CardioNote.";
const NGOAI_LE: { file: string; chuoi: string; lyDo: string }[] = [
  { file: join("src", "server", "clinical", "migrations.ts"), chuoi: THONG_BAO_CU, lyDo: "Thông báo từ chối hồ sơ TMH cũ, nguyên văn theo ràng buộc chung." },
  { file: join("src", "server", "clinical", "migrations.test.ts"), chuoi: THONG_BAO_CU, lyDo: "Test kiểm đúng thông báo từ chối hồ sơ TMH cũ." },
  { file: join("src", "shared", "clinical", "pii", "redact.ts"), chuoi: '"tai"', lyDo: "Tên riêng Tài (dạng không dấu) trong danh sách tên của bộ che PII." },
];
const daDung = new Set<number>();

function laNgoaiLe(rel: string, dong: string): boolean {
  let ketQua = false;
  NGOAI_LE.forEach((n, i) => {
    if (n.file === rel && dong.includes(n.chuoi)) { daDung.add(i); ketQua = true; }
  });
  return ketQua;
}

function duyet(thuMuc: string, duoi: string[], ketQua: string[]) {
  let ds: string[];
  try {
    ds = readdirSync(join(GOC, thuMuc));
  } catch {
    return;
  }
  for (const ten of ds) {
    const rel = join(thuMuc, ten);
    if (BO_QUA_THU_MUC.has(ten)) continue;
    if (BO_QUA_DUONG_DAN.some((p) => rel === p || rel.startsWith(p + "/"))) continue;
    if (rel === FILE_NAY) continue;
    const st = statSync(join(GOC, rel));
    if (st.isDirectory()) duyet(rel, duoi, ketQua);
    else if (duoi.some((d) => ten.endsWith(d))) {
      readFileSync(join(GOC, rel), "utf8")
        .split("\n")
        .forEach((dong, i) => {
          if (MAU_TMH.test(dong) && !laNgoaiLe(rel, dong)) ketQua.push(`${rel}:${i + 1}`);
        });
    }
  }
}

test("khong_con_tmh_trong_san_pham", () => {
  const khop: string[] = [];
  for (const t of ["src", "config", "data"]) duyet(t, DUOI_CHUNG, khop);
  duyet("stt", DUOI_STT, khop);
  assert.deepEqual(khop, [], `Còn dấu vết TMH:\n${khop.join("\n")}`);
});

test("khong_con_tmh_ngoai_le_khong_mo_coi", () => {
  const khop: string[] = [];
  for (const t of ["src", "config", "data"]) duyet(t, DUOI_CHUNG, khop);
  const moCoi = NGOAI_LE.filter((_, i) => !daDung.has(i)).map((n) => `${n.file}: ${n.chuoi}`);
  assert.deepEqual(moCoi, [], "Ngoại lệ không còn khớp dòng nào, hãy xóa khỏi NGOAI_LE");
});
