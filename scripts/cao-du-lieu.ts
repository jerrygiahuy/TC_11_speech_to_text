// Cào danh mục công khai về data/tham-khao/ để tra cứu: ICD-10 nhóm TMH, kỹ thuật TMH, hoạt chất và thuốc lưu hành.
//   npm run cao-du-lieu                 cào tất cả
//   npm run cao-du-lieu -- --bo-thuoc   bỏ phần biệt dược (bước chậm nhất, gọi API Cục Quản lý Dược)
// Dữ liệu ghi ra KHÔNG được ứng dụng nạp (ứng dụng chỉ đọc data/catalog/), xem data/tham-khao/README.md.
import fs from "node:fs";
import path from "node:path";

const HL7_VN = "https://downloads.fhir.hl7.org.vn/core/0.10.0/terminology/clinical";
const HL7_VN_IG = "https://vncore-ig.pages.dev";
const DAV_API = "https://dichvucong.dav.gov.vn/api/services/app/soDangKy/GetAllPublicServerPaging";
const OUT_DIR = path.join(process.cwd(), "data", "tham-khao");

/** Khoảng mã ICD-10 liên quan TMH. Mã 3 ký tự, so theo thứ tự chữ cái. */
const ICD_KHOANG: [string, string, string][] = [
  ["H60", "H95", "Bệnh tai và xương chũm (chương VIII)"],
  ["J00", "J06", "Nhiễm trùng hô hấp trên cấp"],
  ["J30", "J39", "Bệnh khác của đường hô hấp trên"],
  ["C00", "C14", "U ác môi, khoang miệng, hầu"],
  ["C30", "C32", "U ác hốc mũi, tai giữa, xoang, thanh quản"],
  ["D10", "D10", "U lành miệng và hầu"],
  ["Q16", "Q18", "Dị tật tai, mặt, cổ"],
  ["Q30", "Q31", "Dị tật mũi, thanh quản"],
  ["Q35", "Q37", "Khe hở vòm miệng, môi"],
  ["A36", "A36", "Bạch hầu"],
  ["K21", "K21", "Trào ngược dạ dày – thực quản"],
  ["R42", "R43", "Chóng mặt, rối loạn ngửi và nếm"],
  ["R49", "R49", "Rối loạn giọng nói"],
  ["T16", "T17", "Dị vật tai, đường hô hấp"],
];
/** Mã lẻ ngoài các khoảng trên (khớp cả mã con, ví dụ "D14.0" khớp "D14.0" và "D14.0x") */
const ICD_MA_LE = ["D14.0", "D14.1", "G51.0", "L72.1", "R04.0", "R04.1", "R06.1", "R07.0", "R13", "S02.2", "T18.0", "T18.1", "Z01.1", "Z46.1", "Z96.2"];

/** Kỹ thuật ngoài chương 15 vẫn hay được chỉ định ở phòng khám TMH */
const DVKT_NGOAI_CHUONG: [string, RegExp, RegExp?][] = [
  ["18. ĐIỆN QUANG", /xoang|xương chũm|xương thái dương|xương đá|thanh quản|vòm|hốc mũi|tai trong|blondeau|hirtz|schuller|hầu|xương mũi/i, /xoang hang/i],
  ["20. NỘI SOI CHẨN ĐOÁN CAN THIỆP", /tai|mũi|họng|thanh quản|xoang|vòm|hầu/i],
  ["21. THĂM DÒ CHỨC NĂNG", /thính|nhĩ lượng|tiền đình|ốc tai|khứu|giọng|thanh quản|ngừng thở khi ngủ/i],
  ["22. HUYẾT HỌC TRUYỀN MÁU", /^tổng phân tích tế bào máu ngoại vi/i],
  ["23. HOÁ SINH", /\bCRP\b/],
  ["24. VI SINH - KÝ SINH TRÙNG", /streptococcus|liên cầu|ASLO|EBV|nấm/i, /máu|nước tiểu|phân|dịch não tủy/i],
  ["27. PHẪU THUẬT NỘI SOI", /mũi|xoang|amidan|thanh quản|tai|vòm|họng|\bVA\b/, /vòm sọ/i],
];

/** Hoạt chất hay kê ở TMH, tra theo chuỗi con nên dùng gốc từ ("Amoxicil" bắt cả amoxicilin và amoxicillin) */
const HOAT_CHAT_TMH = [
  // Kháng sinh
  "Amoxicil", "Cefuroxim", "Cefixim", "Cefpodoxim", "Cefdinir", "Cefaclor", "Cefadroxil", "Cefalexin",
  "Azithromycin", "Clarithromycin", "Erythromycin", "Spiramycin", "Levofloxacin", "Moxifloxacin",
  "Ciprofloxacin", "Ofloxacin", "Clindamycin", "Metronidazol",
  // Kháng histamin, kháng leukotrien
  "Loratadin", "Desloratadin", "Cetirizin", "Levocetirizin", "Fexofenadin", "Rupatadin", "Bilastin",
  "Chlorpheniramin", "Montelukast",
  // Corticoid uống và xịt mũi
  "Prednisolon", "Methylprednisolon", "Dexamethason", "Betamethason",
  "Mometason", "Fluticason", "Budesonid", "Triamcinolon", "Beclometason",
  // Nhỏ mũi, nhỏ tai, súc họng
  "Xylometazolin", "Oxymetazolin", "Naphazolin", "Natri clorid", "Phenazon", "Benzydamin",
  // Long đờm, giảm đau, chống viêm
  "Acetylcystein", "Ambroxol", "Bromhexin", "Carbocistein", "Paracetamol", "Ibuprofen", "Chymotrypsin",
  // Chóng mặt, ù tai
  "Betahistin", "Cinnarizin", "Flunarizin", "Acetyl leucin", "Ginkgo",
  // Trào ngược họng thanh quản
  "Esomeprazol", "Omeprazol", "Pantoprazol", "Rabeprazol",
];
/** API tìm theo chuỗi con nên "Ofloxacin" trả cả Levofloxacin: chỉ giữ thuốc có gốc từ đứng đầu một từ */
function dungHoatChat(hoatChat: string, text: string): boolean {
  const haystack = text.toLowerCase();
  const needle = hoatChat.toLowerCase();
  for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + 1)) {
    if (i === 0 || !/\p{L}/u.test(haystack[i - 1])) return true;
  }
  return false;
}
/** Hoạt chất mà phần lớn số đăng ký là dạng không dùng ở TMH: chỉ giữ dạng bào chế khớp mẫu */
const LOC_DANG_BAO_CHE: Record<string, RegExp> = {
  "Natri clorid": /mũi|xịt|nhỏ|rửa/i,
};
/** Mỗi hoạt chất giữ tối đa bấy nhiêu thuốc còn hiệu lực, để file không quá lớn */
const TOI_DA_MOI_HOAT_CHAT = 100;
const TRANG = 50;
const NGHI_MS = 400;

interface FhirConcept {
  code: string;
  display: string;
  definition?: string;
  property?: { code: string; valueString?: string; valueBoolean?: boolean; valueCode?: string }[];
  concept?: FhirConcept[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tải ${url} lỗi ${res.status}`);
  return (await res.json()) as T;
}

function prop(concept: FhirConcept, code: string) {
  const found = concept.property?.find((p) => p.code === code);
  return found?.valueString ?? found?.valueBoolean ?? found?.valueCode;
}

function flatten(concepts: FhirConcept[]): FhirConcept[] {
  return concepts.flatMap((c) => [c, ...flatten(c.concept ?? [])]);
}

function writeOut(file: string, data: unknown) {
  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(data, null, 1) + "\n", "utf8");
  console.log(`  → data/tham-khao/${file}: ${Array.isArray(data) ? data.length : 1} mục`);
}

function icdLienQuan(code: string): boolean {
  const ma3 = code.slice(0, 3);
  return ICD_KHOANG.some(([tu, den]) => ma3 >= tu && ma3 <= den) || ICD_MA_LE.some((ma) => code.startsWith(ma));
}

async function caoIcd10() {
  console.log("ICD-10 (HL7 Vietnam, TT 06/2026/TT-BYT)...");
  const cs = await getJson<{ concept: FhirConcept[] }>(`${HL7_VN}/CodeSystem-vn-icd10-cs.full.json`);
  const rows = flatten(cs.concept)
    .filter((c) => icdLienQuan(c.code))
    .map((c) => ({
      ma: c.code,
      ten: c.display,
      ten_en: c.definition ?? "",
      ma_nhom: (prop(c, "type-code") as string | undefined) ?? c.code,
      khoang: prop(c, "section-id") ?? "",
      chuong: prop(c, "chapter-code") ?? "",
      chi_tiet: prop(c, "leaf") === true,
    }));
  writeOut("icd10-tmh.json", rows);
  return rows.length;
}

async function caoDichVuKyThuat() {
  console.log("Danh mục kỹ thuật (HL7 Vietnam, TT 23/2024/TT-BYT)...");
  const cs = await getJson<{ concept: FhirConcept[] }>(`${HL7_VN}/CodeSystem-vn-dvkt-cs.full.json`);
  const rows = cs.concept
    .map((c) => ({ ma: c.code, ten: c.display, chuong: String(prop(c, "chuong") ?? "") }))
    .filter(({ ten, chuong }) => {
      if (chuong === "15. TAI MŨI HỌNG") return true;
      const rule = DVKT_NGOAI_CHUONG.find(([ten_chuong]) => ten_chuong === chuong);
      return rule ? rule[1].test(ten) && !rule[2]?.test(ten) : false;
    });
  writeOut("dich-vu-ky-thuat-tmh.json", rows);
  return rows.length;
}

async function caoHoatChat() {
  console.log("Danh mục hoạt chất (HL7 Vietnam, QĐ 7603/QĐ-BYT)...");
  const cs = await getJson<{ concept: FhirConcept[] }>(`${HL7_VN_IG}/CodeSystem-vn-drug-substance-cs.json`);
  const rows = cs.concept.map((c) => ({
    ma: c.code,
    ten: c.display,
    ...(prop(c, "status") === "retired" ? { ngung_dung: true } : {}),
  }));
  writeOut("thuoc-hoat-chat.json", rows);
  return rows.length;
}

interface DavItem {
  tenThuoc: string;
  soDangKy: string;
  isHetHan: boolean;
  thongTinDangKyThuoc?: { ngayHetHanSoDangKy?: string };
  thongTinThuocCoBan?: { hoatChatChinh?: string; hamLuong?: string; dangBaoChe?: string; dongGoi?: string };
  congTySanXuat?: { tenCongTySanXuat?: string; nuocSanXuat?: string };
}

async function davPage(hoatChat: string, skip: number) {
  const res = await fetch(DAV_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ KichHoat: true, SoDangKyThuoc: { HoatChatChinh: hoatChat }, skipCount: skip, maxResultCount: TRANG }),
  });
  if (!res.ok) throw new Error(`API Cục Quản lý Dược lỗi ${res.status}`);
  const json = (await res.json()) as { result: { totalCount: number; items: DavItem[] } };
  return json.result;
}

async function caoBietDuoc() {
  console.log("Thuốc lưu hành (API tra cứu số đăng ký, Cục Quản lý Dược)...");
  const bySdk = new Map<string, Record<string, string>>();
  for (const hoatChat of HOAT_CHAT_TMH) {
    const loc = LOC_DANG_BAO_CHE[hoatChat];
    let kept = 0;
    let total = 0;
    for (let skip = 0; kept < TOI_DA_MOI_HOAT_CHAT; skip += TRANG) {
      const page = await davPage(hoatChat, skip);
      total = page.totalCount;
      for (const it of page.items) {
        const co = it.thongTinThuocCoBan ?? {};
        if (it.isHetHan || bySdk.has(it.soDangKy) || !dungHoatChat(hoatChat, co.hoatChatChinh ?? "")) continue;
        if (loc && !loc.test(co.dangBaoChe ?? "")) continue;
        bySdk.set(it.soDangKy, {
          ma: it.soDangKy,
          ten: it.tenThuoc.trim(),
          hoat_chat: (co.hoatChatChinh ?? "").trim(),
          ham_luong: (co.hamLuong ?? "").trim(),
          dang_bao_che: (co.dangBaoChe ?? "").trim(),
          dong_goi: (co.dongGoi ?? "").trim(),
          nha_san_xuat: (it.congTySanXuat?.tenCongTySanXuat ?? "").trim(),
          nuoc_san_xuat: (it.congTySanXuat?.nuocSanXuat ?? "").trim(),
          het_han_sdk: (it.thongTinDangKyThuoc?.ngayHetHanSoDangKy ?? "").slice(0, 10),
          tra_theo: hoatChat,
        });
        if (++kept >= TOI_DA_MOI_HOAT_CHAT) break;
      }
      await sleep(NGHI_MS);
      if (skip + TRANG >= total) break;
    }
    console.log(`  ${hoatChat}: giữ ${kept} / ${total} số đăng ký`);
  }
  const rows = [...bySdk.values()].sort((a, b) => a.tra_theo.localeCompare(b.tra_theo, "vi") || a.ten.localeCompare(b.ten, "vi"));
  writeOut("thuoc-luu-hanh-tmh.json", rows);
  return rows.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const counts: Record<string, number> = {
    "icd10-tmh.json": await caoIcd10(),
    "dich-vu-ky-thuat-tmh.json": await caoDichVuKyThuat(),
    "thuoc-hoat-chat.json": await caoHoatChat(),
  };
  if (!process.argv.includes("--bo-thuoc")) counts["thuoc-luu-hanh-tmh.json"] = await caoBietDuoc();
  // Giữ số đếm của phần không cào lại (ví dụ chạy --bo-thuoc)
  const nguonPath = path.join(OUT_DIR, "nguon.json");
  const cu = fs.existsSync(nguonPath) ? JSON.parse(fs.readFileSync(nguonPath, "utf8")).so_muc : {};
  writeOut("nguon.json", { ngay_cao: new Date().toISOString().slice(0, 10), so_muc: { ...cu, ...counts } });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
