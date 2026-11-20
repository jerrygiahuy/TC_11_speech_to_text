import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const GOC = resolve(process.cwd());
const BO_QUA_THU_MUC = new Set(["node_modules", "__pycache__", ".venv-stt", ".next"]);
const BO_QUA_DUONG_DAN = [join("data", "cardiology")];
const DUOI_CHUNG = [".ts", ".tsx", ".json", ".py"];
const DUOI_STT = [".py"];
const DUOI_README = [".md"];
const FILE_NAY = relative(GOC, resolve(__dirname, "khong-con-tmh.test.ts"));

const MAU_TMH =
  /TMH|[Tt]ai [Mm]ũi [Hh]ọng|viêm tai|amidan|màng nhĩ|viêm xoang|[Hh]ọng|nhỏ tai|xịt mũi|\bH6[0-9]\.|"tai"|"mui"|"vom"|"hong"|[Mm]ũi|[Đđ]au tai|khe giữa|ngạt mũi|sổ mũi|speech-to-navigation/;

/**
 * Ngoại lệ có chủ đích, hẹp: chỉ bỏ qua dòng ở đúng file mà chứa đúng chuỗi này (không bỏ cả file, không đổi regex).
 * Mỗi mục phải còn khớp ít nhất một dòng, nếu không là ngoại lệ mồ côi và test fail.
 */
const THONG_BAO_CU = "Hồ sơ TMH cũ (schema 1.x) không dùng được cho CardioNote.";
const NGOAI_LE: { file: string; chuoi: string; lyDo: string }[] = [
  { file: "README.md", chuoi: "không còn nội dung Tai Mũi Họng", lyDo: "Câu mở đầu nói app đã bỏ nội dung TMH và test chặn lại." },
  { file: "README.md", chuoi: "(bản Tai Mũi Họng cũ)", lyDo: "Giải thích hồ sơ schema 1.x là bản TMH cũ nên bị từ chối." },
  { file: "README.md", chuoi: "đã bỏ các viết tắt TMH", lyDo: "Ghi chú viet-tat.json đã bỏ các viết tắt TMH." },
  { file: "README.md", chuoi: "vẫn là bộ lọc TMH cũ", lyDo: "Ghi chú bộ lọc cào danh mục chưa chuyển Tim mạch." },
  { file: "README.md", chuoi: "(bộ lọc TMH cũ, chưa dùng)", lyDo: "Chú thích cây thư mục cho scripts/cao-du-lieu.ts." },
  { file: "README.md", chuoi: "đo **thời Tai Mũi Họng**", lyDo: "Số đo STT 2026-11-11 là lịch sử từ thời TMH, ghi rõ để không nhầm với số Tim mạch." },
  { file: join("src", "server", "clinical", "migrations.ts"), chuoi: THONG_BAO_CU, lyDo: "Thông báo từ chối hồ sơ TMH cũ, nguyên văn theo ràng buộc chung." },
  { file: join("src", "server", "clinical", "migrations.test.ts"), chuoi: THONG_BAO_CU, lyDo: "Test kiểm đúng thông báo từ chối hồ sơ TMH cũ." },
  { file: join("src", "shared", "clinical", "pii", "redact.ts"), chuoi: '"tai"', lyDo: "Tên riêng Tài (dạng không dấu) trong danh sách tên của bộ che PII." },
  { file: join("src", "shared", "giong-noi", "sua-chu.test.ts"), chuoi: '["VTG", "VTN", "VMX", "TMH"]', lyDo: "Guard âm: các khóa viết tắt TMH không được quay lại viet-tat.json." },
  { file: join("src", "shared", "giong-noi", "sua-chu.test.ts"), chuoi: "viet-tat: khóa viết tắt của Tai Mũi Họng", lyDo: "Tên guard âm nói về viết tắt TMH." },
  { file: join("stt", "tests", "test_terminology.py"), chuoi: "ENT_TERMS = [", lyDo: "Guard âm: danh sách từ Tai Mũi Họng không được có trong hotword." },
  { file: join("stt", "tests", "test_terminology.py"), chuoi: "# Guard âm: từ vựng Tai Mũi Họng", lyDo: "Chú thích guard âm hotword." },
];
const daDung = new Set<number>();

function laNgoaiLe(rel: string, dong: string): boolean {
  let ketQua = false;
  NGOAI_LE.forEach((n, i) => {
    if (n.file === rel && dong.includes(n.chuoi)) { daDung.add(i); ketQua = true; }
  });
  return ketQua;
}

const soFileQuet = new Map<string, number>();
function duyet(thuMuc: string, duoi: string[], ketQua: string[], goc = thuMuc) {
  // Không nuốt lỗi: thư mục gốc không đọc được thì test phải fail, không được xanh vì quét không ra gì.
  if (statSync(join(GOC, thuMuc)).isFile()) {
    // Gốc là một file lẻ (README.md): quét thẳng file đó.
    soFileQuet.set(goc, 1);
    readFileSync(join(GOC, thuMuc), "utf8")
      .split("\n")
      .forEach((dong, i) => {
        if (MAU_TMH.test(dong) && !laNgoaiLe(thuMuc, dong)) ketQua.push(`${thuMuc}:${i + 1}`);
      });
    return;
  }
  const ds = readdirSync(join(GOC, thuMuc));
  for (const ten of ds) {
    const rel = join(thuMuc, ten);
    if (BO_QUA_THU_MUC.has(ten)) continue;
    if (BO_QUA_DUONG_DAN.some((p) => rel === p || rel.startsWith(p + "/"))) continue;
    if (rel === FILE_NAY) continue;
    const st = statSync(join(GOC, rel));
    if (st.isDirectory()) duyet(rel, duoi, ketQua, goc);
    else if (duoi.some((d) => ten.endsWith(d))) {
      soFileQuet.set(goc, (soFileQuet.get(goc) ?? 0) + 1);
      readFileSync(join(GOC, rel), "utf8")
        .split("\n")
        .forEach((dong, i) => {
          if (MAU_TMH.test(dong) && !laNgoaiLe(rel, dong)) ketQua.push(`${rel}:${i + 1}`);
        });
    }
  }
}

/** Quét toàn bộ các gốc; ngưỡng tối thiểu số file mỗi gốc (thấp hơn số hiện tại) để test không xanh khi quét hụt. */
const DUOI_TS = [".ts", ".tsx"];
const DUOI_JSON = [".json"];
const GOC_QUET: [string, string[], number][] = [
  ["src", DUOI_CHUNG, 200], ["config", DUOI_CHUNG, 10], ["data", DUOI_CHUNG, 5], ["stt", DUOI_STT, 20],
  ["lib", DUOI_TS, 3], ["README.md", DUOI_README, 1], [join("docs", "task-2", "examples"), DUOI_JSON, 5],
];
function quetTatCa(): string[] {
  const khop: string[] = [];
  soFileQuet.clear();
  for (const [thuMuc, duoi] of GOC_QUET) duyet(thuMuc, duoi, khop);
  return khop;
}

test("khong_con_tmh_trong_san_pham", () => {
  const khop = quetTatCa();
  for (const [thuMuc, , toiThieu] of GOC_QUET) assert.ok((soFileQuet.get(thuMuc) ?? 0) >= toiThieu, `Gốc ${thuMuc} chỉ quét ${soFileQuet.get(thuMuc) ?? 0} file (cần ít nhất ${toiThieu})`);
  assert.deepEqual(khop, [], `Còn dấu vết TMH:\n${khop.join("\n")}`);
});

test("khong_con_tmh_ngoai_le_khong_mo_coi", () => {
  // Tự quét lại, kể cả stt/, để kết quả không phụ thuộc test nào chạy trước.
  daDung.clear();
  quetTatCa();
  const moCoi = NGOAI_LE.filter((_, i) => !daDung.has(i)).map((n) => `${n.file}: ${n.chuoi}`);
  assert.deepEqual(moCoi, [], "Ngoại lệ không còn khớp dòng nào, hãy xóa khỏi NGOAI_LE");
});
