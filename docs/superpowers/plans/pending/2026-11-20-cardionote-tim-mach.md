# CardioNote: sản phẩm riêng cho Trung tâm Tim mạch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến `TC_11_speech_to_text` thành CardioNote, sản phẩm riêng của Trung tâm Tim mạch. Bác sĩ khám, máy ghi âm và chuyển giọng nói thành chữ, che PII, rồi AI điền nháp **đúng Phiếu khám ngoại trú Tim mạch theo Excel**. Bác sĩ sửa, duyệt, in. Không còn dữ liệu, nhãn, schema, từ điển hay test TMH.

**Architecture:** Giữ nguyên hạ tầng kế thừa từ dự án TMH của anh Hùng, vì nó không phụ thuộc chuyên khoa: STT local, che PII R1–R14 + NER, provider LLM, repository JSON có revision, duyệt, in, lịch khám. **Thay toàn bộ lớp nghiệp vụ**:
- hợp đồng `config/clinical/*.schema.json`;
- bộ chuyển Encounter ↔ eForm;
- giao diện eForm và bản in;
- ngữ cảnh lượt khám;
- danh mục, thư viện câu;
- từ điển ngôn ngữ, từ vựng STT;
- fixture và test.

Nguồn sự thật danh sách trường là `config/forms/phieu-kham-ngoai-tru.json` (sinh từ Excel). Có một test phủ trường để bảo đảm mọi trường Excel đều có chỗ trong sản phẩm.

**Tech Stack:** Next.js 16.4.5 (App Router), React 19.3, TypeScript, Tailwind 4, zod 4, `node:test` qua `tsx`, Python 3.12 cho dịch vụ STT (`.venv-stt`).

**Spec:**
- **Danh sách trường:** `config/forms/phieu-kham-ngoai-tru.json`, sinh bằng `scripts/nhap-excel-phieu-kham.py` từ `Form Ngoại trú/Phiếu khám ngoại trú/Danh sách field – Phiếu khám ngoại trú (Tim mạch) 1.xlsx`.
- **Ánh xạ, nguồn điền, quy tắc khi thiếu:** `handoff/claude/02-bang-anh-xa.md`. Mục B1–B12 là danh sách sửa code.
- **Câu hỏi bác sĩ và mặc định tạm:** `handoff/claude/03-cau-hoi-bac-si.md`.
- **Ba ca nghiệm thu:** `handoff/claude/04-ca-kiem-thu.md`.
- **Dữ liệu Tim mạch thay TMH:** `handoff/claude/05-du-lieu-thay-tmh.md`, gồm ICD, dịch vụ, thuốc, viết tắt, hotword.
- **Nơi còn TMH, có `file:line`:** `handoff/claude/06-phu-luc-kiem-ke-tmh.md`.
- **Bộ 60 ca giả:** `data/cardiology/` (`synthetic-cases.jsonl`, `exam-library.json`, `data-dictionary.json`).

## Global Constraints

- **Nơi làm:** chỉ trong `TC_11_speech_to_text/`. `speech-to-navigation/` là code TMH của anh Hùng: chỉ đọc để tham khảo, không sửa.
- **Ngôn ngữ:** nhãn giao diện, thông báo lỗi, tài liệu và commit viết bằng tiếng Việt, giữ giọng văn hiện có (CLAUDE.md quy tắc 5).
- **Dữ liệu:** chỉ dữ liệu giả (`SYN-*`, `GIA-*`, `user_bs01`). Không đưa ảnh EMR hay giá trị bệnh nhân thật vào repo (quy tắc 2).
- **Mã danh mục:** mã ICD và mã dịch vụ chỉ do `src/shared/match.ts` gán. LLM không điền mã, không đặt `ai_fill: true` cho trường mã (quy tắc 3).
- **Thiếu thông tin là chưa chọn:** khi thiếu thông tin thì để `null`, ô trống, không nút nào được chọn. Không quy thành "Không" (`02`, "Cách đọc").
- **Next.js 16:** trước khi viết route hay page, đọc `node_modules/next/dist/docs/01-app/`. `params` của route động là `Promise`.
- **Phiên bản schema:** đổi `CLINICAL_SCHEMA_VERSION` thành `"2.0.0"`. Hằng `schema_version` trong `ai-output.schema.json` cũng thành `"2.0.0"`. Hồ sơ `1.x` (TMH) bị từ chối với thông báo `"Hồ sơ TMH cũ (schema 1.x) không dùng được cho CardioNote."`.
- **Hằng khoa và phòng:** `department_id = "tim-mach"`, `room_id = "prototype-tim-mach-01"`, cơ sở hiển thị `"OPD - Trung tâm Tim mạch"`, phòng khám `"PK Nội tim mạch"`.
- **Ghi tài liệu:** mọi thay đổi đều ghi tài liệu bằng skill `ghi-tai-lieu`: thêm mục vào `docs/CHANGELOG.md` (đọc lại file ngay trước khi sửa) và cập nhật README hoặc docs liên quan (quy tắc 1).
- **Git:** mỗi agent chỉ `git add` đúng đường dẫn của mình, commit tiếng Việt, không push, merge hay stash. Chỉ một agent chạy `next dev` cùng lúc; agent đó dùng cổng 3100.
- **Kiểm tra cuối mỗi task:**
  - `npm test`: không có test fail mới so với danh sách nền ở Task 0.
  - `npm run lint`: không thêm lỗi.
  - `npx tsc --noEmit -p .`: không có lỗi ở file của task.
  - Task đổi schema thì chạy thêm `npm run clinical:check`.

## Chia việc cho sub-agent (CLAUDE.md quy tắc 7)

| Task | Agent | Phụ thuộc | Chạy song song với |
|---|---|---|---|
| ✅ 0. Chuẩn bị nhánh, dọn file " 2", ghi nền test | Session chính + anh | – | – |
| ✅ 1. Hợp đồng dữ liệu 2.0.0 + test phủ trường Excel | Sonnet, medium | 0 | – |
| ✅ 2. Bộ chuyển Encounter ↔ eForm và điền nháp AI | Sonnet, medium | 1 | 3, 5, 6, 7 |
| ✅ 3. Ngữ cảnh lượt khám và bộ sinh fixture từ 60 ca | Sonnet, medium | 1 | 2, 5, 6, 7 |
| 4. Giao diện eForm và bản in theo Excel | Sonnet, medium | 2, 3 | 6, 7 |
| ✅ 5. Danh mục và thư viện câu Tim mạch (dữ liệu mock) | Haiku, medium | 1 | 2, 3, 6, 7 |
| ✅ 6. Từ điển ngôn ngữ trong code + bộ trích mock | Sonnet, medium | 1 | 2, 3, 5, 7 |
| ✅ 7. Từ vựng STT | Haiku, medium | 0 | 1–6 |
| **Review giữa kỳ** sau Task 1–7 | Opus | 1–7 | – |
| 8. Kịch bản demo, ca eval, fixture test; về 0 test fail | Sonnet, medium | review giữa kỳ | – |
| 9. Nghiệm thu tự động 3 ca của `04` | Sonnet, medium | 8 | 10 |
| 10. Bỏ trang riêng `/phieu-kham-ngoai-tru` | Haiku, medium | 4 | 9 |
| 11. Chốt 100% Tim mạch: test chặn TMH + tài liệu | Haiku, medium | 9, 10 | – |
| **Review cuối** toàn nhánh | Opus | 11 | – |

Session chính chỉ điều phối:
- viết brief tự đủ ngữ cảnh: dán phần task, Global Constraints, Review Focus và đường dẫn plan;
- sau mỗi task chạy lại `npm test`, `npm run lint`, `git status` để kiểm chứng, không tin báo cáo của sub-agent khi chưa kiểm;
- gom lỗi review giao Sonnet hoặc Haiku sửa.

**Không thuộc phạm vi plan này:**
- kê đơn tự động;
- tích hợp HIS/EMR thật, đăng nhập thật;
- cào danh mục thật của BYT/Vinmec. Đợt này để task tùy chọn ở cuối, cần mạng và cần anh đồng ý.

## Review Focus

1. **Thiếu thông tin vẫn chưa chọn.** Hội thoại không nhắc dị ứng, thuốc đang dùng hay hẹn tái khám thì ô tương ứng không có nút nào được chọn, không có "Không". → test ở Task 2: `thieu_thong_tin_khong_chon_nut_nao`.
2. **Không chép chẩn đoán ban đầu sang ra viện.** Hội thoại chỉ nói "Chẩn đoán: …" một lần thì chẩn đoán ra viện để trống (`02` B4). → test ở Task 2: `ra_vien_trong_khi_chi_co_ban_dau`.
3. **Bệnh nền không tự thành chẩn đoán kèm theo.** Bệnh chỉ nêu ở tiền sử (ví dụ rối loạn lipid máu ở SYN-CARDIO-013) không tự vào `icd_kem_theo`. → test ở Task 9, ca 013.
4. **Bộ che PII không che thuật ngữ và thuốc Tim mạch.** Câu có "Bisoprolol 2,5 mg", "Apixaban", "nhịp xoang", "rung nhĩ", "tĩnh mạch cổ" vẫn giữ nguyên sau `chePii`. Liều thập phân dấu phẩy `2,5 mg` không bị đổi. → test ở Task 6: `pii_giu_thuat_ngu_tim_mach`.
5. **AI không ghi đè sinh hiệu.** Hội thoại đọc huyết áp khác fixture thì sinh hiệu vẫn theo fixture và có cảnh báo lệch nguồn. → test ở Task 2: `ai_khong_ghi_de_sinh_hieu`.

---

### Task 0: Chuẩn bị nhánh, dọn file " 2", ghi nền test

**Người làm:** session chính. Ba quyết định dưới đây **cần anh đồng ý trước**. **Trạng thái: ✅ xong 20/11.**

- [x] **Bước 1: Commit nền.** *(Xong 20/11: commit `4c2aa10`, 423 file; `dev` đã push lên `origin`.)* Cây làm việc đang ở nhánh `feature/sync-hung-dev-20261119` với khoảng 300 thay đổi chưa commit. Hỏi anh: commit toàn bộ hiện trạng thành commit nền `chore: đồng bộ hiện trạng TC_11 trước khi làm CardioNote`, rồi tạo `dev` từ commit đó và push `dev`. Repo chưa có `dev`, mà CLAUDE.md quy tắc 6 bắt buộc nhánh mới phải tạo từ `dev`.
- [x] **Bước 2: Tạo nhánh làm việc.** *(Xong 20/11: `feature/cardionote-tim-mach`, `merge-base` = `4c2aa10`.)* `git fetch origin && git checkout -b feature/cardionote-tim-mach origin/dev`. Kiểm `git merge-base HEAD origin/dev` bằng commit mới nhất của `dev`.
- [x] **Bước 3: Dọn file " 2".** *(Xong 20/11, khác plan: xóa 105 file giống hệt; 56 file khác bản gốc (54 trùng commit `6a09af2`) **chuyển** vào `temp-1/ban-sao-2/` thay vì xóa, vì lệnh xóa bị chặn. Lint còn 0 lỗi.)*
  - Xóa các file tên có " 2" **giống hệt** bản gốc. Kiểm bằng `cmp`; theo `06` có khoảng 145 file.
  - Liệt kê 59 file " 2" **khác** bản gốc để anh xác nhận rồi mới xóa.
  - Kết quả mong đợi: `loadCases()` không còn nạp trùng, và lint hết 7 lỗi ở `src/shared/eform/*.test 2.ts`.
- [x] **Bước 4: Ghi nền.** *(Xong 20/11: `docs/testing/2026-11-20-nen-test.txt`, 422 test, 13 lỗi sẵn có.)*
  - `npm test 2>&1 | grep '^✖' | sort -u > docs/testing/2026-11-20-nen-test.txt`. Hiện là 13 test fail, do dữ liệu TMH đã bị làm rỗng.
  - Ghi `npm run lint` vào cùng file.
- [x] **Bước 5:** ghi CHANGELOG, commit `chore: dọn file bản sao " 2" và ghi nền test CardioNote`. *(Xong 20/11, khác tên: commit `9a10c87` và `cbde067`.)*

---

### Task 1: Hợp đồng dữ liệu 2.0.0 + test phủ trường Excel

**Files:**
- Sửa: `config/clinical/common.schema.json` (`$defs/exam`, `$defs/phieuKham`, `$defs/phieuKhamStorage`, `$defs/vitals`, `$defs/currentMedication`)
- Sửa: `config/clinical/ai-output.schema.json`, `config/clinical/encounter.schema.json` (hằng `schema_version`)
- Sinh lại: `src/shared/clinical/types.ts` bằng `npm run clinical:types` (không sửa tay)
- Sửa: `src/shared/clinical/schema.ts` (`CLINICAL_SCHEMA_VERSION`), `src/server/clinical/migrations.ts`
- Tạo: `src/shared/clinical/excel-coverage.ts`, `src/shared/clinical/excel-coverage.test.ts`
- Sửa: `src/shared/clinical/schema.test.ts`, `src/server/clinical/migrations.test.ts`, `docs/task-2/examples/*.json`, `docs/task-2/verify.py` nếu kiểm theo schema cũ

**Interfaces:**
- Produces: `phieuKham` 2.0.0 có đúng các khóa:
  - `ly_do_kham`, `benh_su`, `tien_su_ban_than`, `tien_su_gia_dinh`: `string|null`.
  - `di_ung`: `allergy`, giữ nguyên.
  - `co_thuoc_dang_dung`: `boolean|null`.
  - `thuoc_dang_dung`: `currentMedication[]`, giữ `ten`, `ham_luong`, `cach_dung`, `trang_thai`.
  - `kham_toan_than`, `kham_chuyen_khoa`, `kham_tim_mach_ho_hap`, `kham_khac`: `string|null`.
  - `chan_doan`: `diagnosisMention[]`.
  - `ghi_chu_ket_qua`: `string|null`.
  - `da_xu_ly`: `boolean|null`.
  - `huong_dieu_tri`, `loi_dan`: `string|null`.
  - `hen_tai_kham`: `followUp`.
  - `tinh_trang_ra_vien`: enum hiện có hoặc `null`.
  - **Bỏ** `$defs/exam` (4 vùng tai/mũi/vòm/họng) và `co_pttt`; cả hai không có trong Excel.
  - `phieuKhamStorage` có cùng các khóa trừ `chan_doan`, vì chẩn đoán lưu ở `/chan_doan` cấp ngoài.
  - Trường bác sĩ chọn ở mục 1 và 3 của Excel **đã có** ở cấp ngoài của `encounter.schema.json`, không thêm vào `phieu_kham`:
    - `noi_gioi_thieu` → `/referral_source` (`"co_quan_y_te"|"tu_den"|null`);
    - `bac_si_uy_quyen` → `/delegated_doctor_id`;
    - `chuyen_noi_soi`, `xac_nhan_benh_tat`, `nghi_viec_bhxh` → `/thong_tin_khac/{chuyen_noi_soi,xn_benh_tat,xn_bhxh}`.
  - **Bỏ** `xn_me` khỏi `thong_tin_khac` vì không có trong Excel.
- Produces: `vitals` cho phép `null` từng chỉ số; hiện các chỉ số đã là `quantity`, kiểm lại `null`.
- Produces: `export const EXCEL_MAP: Record<string, { noi: "encounter" | "ngu_canh" | "giao_dien"; duong: string }>` trong `excel-coverage.ts`.
  - Khóa của map:
    - trường gốc: `truong.khoa`, ví dụ `huyet_ap`;
    - cột bảng lặp: `"<khoa bảng>[].<khoa cột>"`, ví dụ `"lich_su_thuoc[].ten_thuoc"`.
  - `noi: "encounter"` thì `duong` là JSON pointer trong `Encounter`, ví dụ `/phieu_kham/kham_tim_mach_ho_hap`.
  - `noi: "ngu_canh"` thì `duong` là đường dẫn chấm trong `CaGia`, ví dụ `sinh_hieu.ha_tam_thu`. Task 3 kiểm phần này.
  - `noi: "giao_dien"` dành cho trường chỉ có trên giao diện, ví dụ `mau_cau_da_chon`.
- Produces: `export function excelKeys(config: CauHinhPhieu): string[]` liệt kê mọi khóa như trên, từ `src/shared/phieu-kham-ngoai-tru/config.ts`.

- [x] **Bước 1: Viết test fail** trong `excel-coverage.test.ts`:
  - `moi_truong_excel_co_trong_map`: `excelKeys(CAU_HINH_PHIEU)` khác rỗng, và mọi khóa có trong `EXCEL_MAP`.
  - `duong_encounter_ton_tai`: với mọi mục `noi === "encounter"`, pointer đọc được trên `emptyEncounter({...})` (giá trị `!== undefined`).
  - `khong_con_vung_tmh`: `JSON.stringify(emptyEncounter(...).phieu_kham)` không chứa `"tai"`, `"mui"`, `"vom"`, `"hong"`, `"co_pttt"`.
  - Trong `schema.test.ts`: `schema_version === "2.0.0"`. Trong `migrations.test.ts`: hồ sơ `1.2.0` bị từ chối với đúng thông báo ở Global Constraints.
- [x] **Bước 2:** `npm test 2>&1 | grep -E 'excel|schema|migration'` → FAIL. *(Xong 20/11: RED đúng như dự kiến.)*
- [x] **Bước 3: Sửa schema** như Interfaces, chạy `npm run clinical:types`, sửa `schema.ts` và `migrations.ts`, viết `EXCEL_MAP` đủ 49 trường và 41 cột theo `02` mục A1–A7. *(Xong 20/11: config đúng 49 trường + 41 cột, `EXCEL_MAP` 90 khóa. Cột `ghi_chu` của thuốc đang dùng gộp vào `thuoc_dang_dung[]` (chờ Task 2 xác nhận).)*
- [x] **Bước 4:** *(Xong 20/11: 17/17 test mới PASS. 73 test mới vỡ, đã ghi danh sách trong báo cáo cho Task 2/8. `clinical:check`: phần types PASS; `verify.py` cần `python` + `jsonschema`, chạy bằng venv ngoài repo thì PASS.)*
  - `npm run clinical:check` PASS.
  - Test ở bước 1 PASS.
  - Test khác vỡ vì đổi schema thì **chỉ ghi danh sách** vào báo cáo, không sửa. Task 2 và Task 8 sẽ sửa.
- [x] **Bước 5:** ghi CHANGELOG, commit `feat(clinical): hợp đồng dữ liệu 2.0.0 theo phiếu khám Tim mạch`. *(Xong 20/11: commit `e43bf4b`. Mục CHANGELOG của Task 1 bị gom vào commit `40ee550` của Task 7.)*

---

### Task 2: Bộ chuyển Encounter ↔ eForm và điền nháp AI

**Files:**
- Sửa: `src/shared/clinical/eform.ts`
  - `TEXT_FIELDS`, `IDS`, `snapshotSchema`, `applyEformSnapshot`, `projectEform`;
  - xóa `specialistText`.
- Sửa: `src/shared/eform/dien-phieu.ts` (`ANH_XA`, `O_CHON_MAC_DINH`, đoạn chép chẩn đoán)
- Sửa: `src/shared/clinical/apply-ai.ts` (`applyAiDraft`, `aiEformPatch`)
- Sửa: `src/shared/clinic/projection.ts` (đang gọi `specialistText`), `src/shared/clinical/approvals.ts`, `src/shared/clinical/changes.ts` nếu nhắc `kham_chuyen_khoa` dạng object
- Test: `src/shared/clinical/eform.test.ts`, `src/shared/clinical/apply-ai.test.ts`, `src/shared/eform/dien-phieu.test.ts`

**Interfaces:**
- Consumes: `phieuKham` / `phieuKhamStorage` 2.0.0 (Task 1).
- Produces: id trường eForm mới:
  - `kham_tim_mach_ho_hap` (chữ);
  - `noi_gioi_thieu` (`"Cơ quan y tế"|"Tự đến"|""`).
- Produces: `noi_gioi_thieu` lưu vào `/referral_source`. Các id `bs_uy_quyen`, `chuyen_noi_soi`, `xn_benh_tat`, `xn_bhxh` giữ chỗ lưu cấp ngoài như hiện tại.
- Produces: bỏ id `co_pttt`, `xn_me`, `giai_doan_kem_theo` khỏi `IDS`, vì không có trong Excel.
- Produces: `EformSnapshot` thêm `thuocDangDung?: Array<{ ten: string; ham_luong: string; cach_dung: string }>` (tối đa 50 dòng, mỗi chuỗi tối đa 500 ký tự). Thứ tự các dòng được giữ khi lưu và khi `projectEform`.
- Produces: hành vi `dienPhieu`:
  - `O_CHON_MAC_DINH` rỗng: không còn mặc định "Không" cho `hen_tai_kham`.
  - Chẩn đoán ra viện chỉ lấy từ `chan_doan[]` có `giai_doan === "ra_vien"`.
  - Câu khám về tim, phổi, mạch ngoại vi, tĩnh mạch cổ, lồng ngực đi vào `kham_tim_mach_ho_hap`.

- [x] **Bước 1: Viết test fail:**
  - `thieu_thong_tin_khong_chon_nut_nao` (Review Focus 1): AI output có `di_ung.trang_thai = "chua_de_cap"`, `co_thuoc_dang_dung = null`, `hen_tai_kham.co_hen = null`. Kỳ vọng sau `aiEformPatch`: `fields.di_ung.value === ""`, `fields.thuoc_dang_dung.value === ""`, `fields.hen_tai_kham.value === ""`.
  - `ra_vien_trong_khi_chi_co_ban_dau` (Review Focus 2): `chan_doan = [{ giai_doan: "ban_dau", vai_tro: "chinh", mo_ta: "Tăng huyết áp độ II", ... }]`. Kỳ vọng `mo_ta_ban_dau === "Tăng huyết áp độ II"` và `mo_ta_ra_vien === ""`.
  - `ai_khong_ghi_de_sinh_hieu` (Review Focus 5): encounter có `sinh_hieu.ha_tam_thu` = 132. AI output có `can_xem_lai` gồm `{ field_path: "/sinh_hieu/ha_tam_thu", loai: "mau_thuan", ... }`. Kỳ vọng sau `applyAiDraft`: `sinh_hieu` giữ nguyên (`deepStrictEqual` với bản trước). Việc mock sinh ra mục `mau_thuan` khi nghe "huyết áp 150 trên 90" thì Task 6 kiểm.
  - `luu_doc_lai_du_truong_tim_mach`: snapshot có đủ `kham_tim_mach_ho_hap`, `noi_gioi_thieu = "Tự đến"`, 2 dòng `thuocDangDung` (một dòng có `"2,5 mg"`), `chuyen_noi_soi = "Có"`. Chạy `applyEformSnapshot` rồi `projectEform` → kết quả bằng nguyên snapshot (`deepStrictEqual`).
- [x] **Bước 2:** `npm test 2>&1 | grep -E 'eform|apply-ai|dien-phieu'` → các test mới FAIL. *(Xong 20/11: RED 17/29.)*
- [x] **Bước 3:** sửa 3 file chính theo Interfaces và `02` mục B3–B5, B9. Sửa các file gọi tới `specialistText`. *(Xong 20/11. `aiEformPatch` giờ trả cả ô rỗng, nơi nhận phải bỏ qua ô rỗng.)*
- [x] **Bước 4:** test bước 1 PASS. Test cũ trong 3 file test này vỡ vì dữ liệu TMH: viết lại bằng câu và giá trị Tim mạch lấy từ SYN-CARDIO-001. *(Xong 20/11: 42/42 PASS ở 5 file (thêm `approvals`, `changes`).)*
- [x] **Bước 5:** ghi CHANGELOG, commit `feat(eform): bộ chuyển phiếu khám Tim mạch 2.0.0`. *(Xong 20/11: commit `b076172`.)*

---

### Task 3: Ngữ cảnh lượt khám và bộ sinh fixture từ 60 ca

**Files:**
- Sửa: `src/shared/eform/types.ts`:
  - `SinhHieu`: mỗi chỉ số `number | null`;
  - `CaGia.lich_su` thêm `thuoc: DongThuocLichSu[]`;
  - `KetQuaTheoNgay.muc` đủ cột theo Excel.
- Sửa: `src/server/clinical/encounter-context.ts` (`validateEncounterContexts`)
- Tạo: `scripts/tao-du-lieu-tim-mach.ts`, thêm script `"tao-du-lieu-tim-mach": "tsx --conditions=react-server scripts/tao-du-lieu-tim-mach.ts"` vào `package.json`
- Xóa: `scripts/tao-lich-su-clinic.ts` và script `tao-lich-su-clinic` trong `package.json`
- Sinh lại: `data/eform/encounter-contexts.json`, `data/eform/ca-gia.json`, `data/clinic/{appointments,patients,directory-demo}.json`, `data/clinic/history/*.json`
- Test: `src/server/clinical/encounter-context.test.ts`, `src/shared/clinical/excel-coverage.test.ts` (thêm 1 test)

**Interfaces:**
- Consumes: `EXCEL_MAP` (Task 1).
- Produces:
  - `export interface DongThuocLichSu { ten_thuoc: string; lieu: string; duong_dung: string; ngay: string }`.
  - `KetQuaTheoNgay = { ngay: string; muc: Array<{ nhom?: string; bo_xet_nghiem?: string; ten: string; ket_qua: string; tham_chieu?: string; don_vi?: string; thoi_gian?: string; nguoi_tra_ket_qua?: string; ket_luan?: string }> }`.
- Produces: `encounter-contexts.json` có đúng 3 context, theo thứ tự:
  1. từ SYN-CARDIO-001 (ca mặc định trên `/`, mã lượt `LK-GIA-0456`);
  2. từ SYN-CARDIO-013;
  3. từ SYN-CARDIO-039.
  - Cả 3 có `co_so = "OPD - Trung tâm Tim mạch"` và `phong_kham = "PK Nội tim mạch"`.
  - Lịch sử và kết quả cận lâm sàng dựng theo `05` mục 1.
- Produces: `appointments.json` có 10 lịch hẹn, nội dung theo `05` mục 1, kèm `(dữ liệu giả)`. Giữ các lịch đặc thù đang được test dùng: hủy hẹn, bác sĩ khác, ngày mai, mã lượt toàn chữ số.

- [x] **Bước 1: Viết test fail:**
  - `ngu_canh_tim_mach_mac_dinh`: `listEncounterContexts(actor)[0].ca.phong_kham === "PK Nội tim mạch"`.
  - `ngu_canh_tim_mach_mac_dinh`, tiếp: `JSON.stringify(contexts)` không chứa `"tai phải"`, `"họng"`, `"TMH"`.
  - `duong_ngu_canh_ton_tai` (trong `excel-coverage.test.ts`): với mọi mục `noi === "ngu_canh"` của `EXCEL_MAP`, đường dẫn đọc được trên `ca` của context đầu (`!== undefined`).
  - `sinh_hieu_null_hop_le`: context có `sinh_hieu.nhiet_do = null` vẫn qua `validateEncounterContexts`.
- [x] **Bước 2:** chạy hai file test → FAIL. *(Xong 20/11.)*
- [x] **Bước 3:** *(Xong 20/11. Khác plan: thêm `lich_su.thuoc`, `chan_doan_oh`, `sinh_hieu.bmi` vào `CaGia` cho khớp `EXCEL_MAP`; thêm lịch LK-GIA-0462 cho đủ 10; LK-GIA-0458 mất context (lịch vẫn còn). Sửa thêm tên lệnh trong README và CLAUDE.md.)*
  - Sửa kiểu và validator.
  - Viết `tao-du-lieu-tim-mach.ts`: đọc `data/cardiology/synthetic-cases.jsonl`, chạy xác định, không dùng mạng. Cờ `--check` so file trên đĩa với file sẽ sinh.
  - Chạy `npm run tao-du-lieu-tim-mach`.
- [x] **Bước 4:** test bước 1 PASS. `npm run tao-du-lieu-tim-mach -- --check` PASS. *(Xong 20/11: 12/12 PASS; `--check` khớp 9 file.)*
- [x] **Bước 5:** ghi CHANGELOG, commit `feat(du-lieu): ngữ cảnh lượt khám Tim mạch sinh từ bộ 60 ca`. *(Xong 20/11: commit `db80d8f`.)*

---

### Task 4: Giao diện eForm và bản in theo Excel

**Files:**
- Sửa: `src/client/eform/EformForm.tsx`:
  - `DanhGiaChung`: thứ tự mục và trường theo Excel phần 1;
  - `KhamChuyenKhoa` thành ô chữ thường;
  - ô mới "Khám tim mạch, hô hấp" ngay sau;
  - nhóm radio "Nơi giới thiệu";
  - danh sách "Thuốc đang dùng" có nút "+ Thêm thuốc";
  - đổi nhãn "Ghi chú kết quả" thành "Các xét nghiệm, thăm dò chính";
  - `ThongTinKhac` bỏ `xn_me`.
- Sửa: `src/client/eform/EformHeader.tsx` (sinh hiệu `null` hiển thị "chưa đo"; BMI để trống khi thiếu chiều cao hoặc cân nặng)
- Sửa: `src/client/eform/MauCauPanel.tsx`, `src/shared/eform/mau-cau.ts`, `src/shared/eform/types.ts` (`VungKham`, `MauCauData`)
- Sửa: `src/server/du-lieu/eform.ts` (nạp thư viện từ `data/cardiology/exam-library.json`)
- Sửa: `src/client/eform/LichSuBlock.tsx` (thêm bảng thuốc đã dùng), `src/client/eform/BanIn.tsx`, `src/client/demo-luong/DemoPhieuPanel.tsx`
- Sửa tên sản phẩm thành **CardioNote**: `src/client/chung/Header.tsx` (dòng 21 "Trợ lý điền bệnh án Tim mạch – Prototype" → "CardioNote – Trung tâm Tim mạch (prototype)"), `src/app/layout.tsx` (`title` = "CardioNote", `description` nêu Trung tâm Tim mạch, dữ liệu giả), `src/app/dashboard/page.tsx` (`title` = "Lịch khám – CardioNote"); grep `"Trợ lý điền bệnh án"` trong `src/` để sửa nốt chỗ còn lại. *(Thêm 20/11 theo yêu cầu anh.)*
- Xóa: `data/eform/mau-cau.json`
- Test: `src/shared/eform/mau-cau.test.ts` (tạo), `src/client/eform/*` không có test DOM, nên kiểm bằng trình duyệt ở bước 4

**Interfaces:**
- Consumes: id trường của Task 2, `CaGia` của Task 3.
- Produces:
  - `export type VungKham = "toan_than" | "tim_mach_ho_hap"`;
  - `MauCauData = { theoVung: Record<VungKham, string[]> }`, lấy từ `exam-library.json` (`GENERAL` → `toan_than`, `CARDIO_RESP` → `tim_mach_ho_hap`);
  - `MauCauPanel` có `Chọn tất cả`, `Chọn`, `Hủy`; câu được tick chèn vào ô đích thành các dòng `- …` (Excel, dòng `mau_cau_da_chon`).
- Produces: `BanIn` in riêng hai dòng "Chẩn đoán ban đầu" và "Chẩn đoán ra viện", dòng nào trống thì bỏ (B6). Bản in thêm "Thuốc đang dùng" và "Khám tim mạch, hô hấp" (B7).

- [ ] **Bước 1: Viết test fail** `mau-cau.test.ts`:
  - `thu_vien_tim_mach`: `theoVung.tim_mach_ho_hap.length === 13`, `theoVung.toan_than.length === 7`.
  - `chen_mau_cau`: chèn 2 câu vào ô rỗng → `"- Lồng ngực cân đối hai bên\n- Phổi trong, không ran"`. Chèn vào ô đã có chữ thì nối thêm dòng mới, không ghi đè.
  - `chanDoanIn`: thay bằng test cho hàm thuần mới `dongChanDoanIn(get)`, trả về mảng nhãn và nội dung. Chỉ có ban đầu thì mảng có đúng 1 phần tử.
- [ ] **Bước 2:** chạy test → FAIL.
- [ ] **Bước 3:** sửa giao diện theo Interfaces và B6–B10. Thứ tự hiển thị đúng thứ tự `config/forms/phieu-kham-ngoai-tru.json`.
- [ ] **Bước 4: Kiểm trên trình duyệt.**
  - Chạy `npx next dev -p 3100`, mở `/` bằng Chrome headless hoặc playwright, chụp ảnh toàn trang và bản in.
  - Kiểm có đủ "Nơi giới thiệu", "Khám tim mạch, hô hấp", "+ Thêm thuốc", hai dòng chẩn đoán.
  - Kiểm không còn chữ "Tai", "Mũi", "Vòm", "Họng", "TMH"; header và tab trình duyệt hiện "CardioNote".
  - Lưu rồi tải lại thì giữ đủ giá trị. Tắt dev server.
- [ ] **Bước 5:** ghi CHANGELOG, cập nhật `README.md` mục eForm. Commit `feat(eform): giao diện và bản in phiếu khám Tim mạch`.

---

### Task 5: Danh mục và thư viện câu Tim mạch (dữ liệu mock)

**Files:**
- Thay nội dung:
  - `data/eform/icd10.json`: 11 mã ở `05` mục 3, mỗi mã có `manh` và `vua`;
  - `data/catalog/dich-vu.json`: 10 dịch vụ ở `05` mục 4, mã `DV-TM-001`…`DV-TM-010`, có `ten_khac`;
  - `data/catalog/thuoc.json`: 9 thuốc ở `05` mục 5;
  - `data/eform/thu-vien.json`: theo `05` mục 2;
  - `data/eform/phieu-mau.json`: 10 phiếu mẫu, mỗi chẩn đoán chính một phiếu;
  - `data/eform/goi-y-theo-chan-doan.json`: chỉ cặp chỉ định có nguồn, không có đơn thuốc;
  - `data/eform/quy-tac.json`: bỏ từ khóa tai, mũi, họng.
- Sửa: `src/server/du-lieu/danh-muc.ts` dòng 76, 84, 105, 106, 120: bỏ tham chiếu `*-tmh.json`. Khi chưa có danh mục thật, chỉ dùng danh mục soạn tay.
- Sửa: `src/shared/eform/phieu-mau.ts` (chú thích dòng 14; `NGU_CANH_BEN` bỏ tai, mũi, họng, amidan)
- Test: `src/shared/eform/phieu-mau.test.ts`, `src/shared/eform/icd.test.ts`

**Interfaces:**
- Consumes: không cần gì từ task khác ngoài schema đã chốt.
- Produces: mọi mục danh mục có `"mock": true` để giao diện gắn nhãn mock (`05`, "Nhãn nguồn"). `icd_ten` trong phiếu mẫu khớp đúng tên trong `icd10.json`.

- [x] **Bước 1: Sửa test** cho khớp yêu cầu mới, chạy để thấy FAIL: *(Xong 20/11.)*
  - `phieu-mau.test.ts`: "có ít nhất 30 mẫu" thành `có đúng 10 mẫu, id không trùng`, và mọi `icd_ten` có trong `icd10.json`.
  - `icd.test.ts`: gợi ý cho "tăng huyết áp" có `I10` đứng đầu; gợi ý cho "đau họng" trả mảng rỗng.
- [x] **Bước 2:** `npm test 2>&1 | grep -E 'phieu-mau|icd'` → FAIL. *(Xong 20/11.)*
- [x] **Bước 3:** thay dữ liệu và sửa `danh-muc.ts` theo Files. *(Xong 20/11. `quy-tac.json` giữ nguyên vì không có từ khóa TMH; `thu-vien.json` không gắn `mock` từng câu (giữ shape).)*
- [x] **Bước 4:** test PASS. `npm run eval-mau` chạy không lỗi; ghi điểm vào CHANGELOG. *(Xong 20/11: test PASS. `eval-mau` chạy được nhưng chưa có điểm (0/1 ca có `mau_id`), chờ 10 ca mới ở Task 8.)*
- [x] **Bước 5:** commit `feat(danh-muc): danh mục và thư viện câu Tim mạch (mock)`. *(Xong 20/11: commit `2912878`.)*

---

### Task 6: Từ điển ngôn ngữ trong code + bộ trích mock

**Files:**
- Sửa: `src/server/clinical/pii-allowlist.ts` (dòng 6–19: thay cụm TMH bằng thuật ngữ và thuốc Tim mạch)
- Sửa: `src/shared/clinical/vai-tro-nguoi-noi.ts` (dòng 48–96: từ điển đoán vai BS/BN)
- Sửa: `src/server/ai/llm/rules.ts` (dòng 89–113: đường dùng "xịt mũi", "nhỏ tai" → chỉ giữ uống, ngậm dưới lưỡi, tiêm)
- Sửa: `src/shared/clinical/pii/redact.ts` (dòng 62, 78: danh sách từ thường bỏ "tai", "mũi"; thêm từ Tim mạch dễ nhầm với tên người)
- Sửa: `src/server/clinical/extraction.ts`:
  - `mockClinicalExtraction`: tách câu khám tim phổi vào `kham_tim_mach_ho_hap` theo `02` mục A4;
  - dòng 153: từ khóa triệu chứng Tim mạch;
  - `CLINICAL_PROMPT_VERSION = "clinical-tim-mach-1"`.
- Sửa: `src/server/ai/prompt.ts` nếu còn ví dụ TMH
- Test: `src/shared/clinical/vai-tro-nguoi-noi.test.ts`, `src/shared/clinical/pii/*.test.ts`, `src/server/clinical/extraction.test.ts`, `src/server/clinical/privacy.test.ts`

**Interfaces:**
- Consumes: `phieuKham` 2.0.0 (Task 1).
- Produces: `mockClinicalExtraction(transcript)` trả `AiOutput` 2.0.0. Câu chứa "tim", "T1", "T2", "âm thổi", "phổi", "ran", "tĩnh mạch cổ", "mỏm tim" đi vào `kham_tim_mach_ho_hap`. Câu "bụng mềm…" đi vào `kham_chuyen_khoa`, dòng đầu là `Khám bụng:`.

- [x] **Bước 1: Viết test fail:**
  - `pii_giu_thuat_ngu_tim_mach` (Review Focus 4): `chePii("Bệnh nhân dùng Bisoprolol 2,5 mg, Apixaban 5 mg. Điện tim nhịp xoang, nghi rung nhĩ, tĩnh mạch cổ không nổi.")` → text sau che **bằng nguyên văn**, không có nhãn che nào.
  - `mock_tach_kham_tim_phoi`: transcript có "Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran. Bụng mềm." → `kham_tim_mach_ho_hap` chứa 2 câu đầu, `kham_chuyen_khoa === "Khám bụng:\n- Bụng mềm"`.
  - `mock_lech_sinh_hieu`: transcript có "huyết áp 150 trên 90". Ngữ cảnh lượt khám có `ha_tam_thu` = 132. `can_xem_lai` có mục `loai === "mau_thuan"`, `field_path === "/sinh_hieu/ha_tam_thu"`.
  - `vai_tro_tim_mach`: câu "anh có đau ngực khi leo cầu thang không" → BS; "dạ tôi thấy hồi hộp đánh trống ngực" → BN.
- [x] **Bước 2:** chạy các file test → FAIL. *(Xong 20/11.)*
- [x] **Bước 3:** sửa từ điển và mock theo Files. Viết lại các test TMH trong các file này bằng câu Tim mạch, lấy từ `conversation_text` của bộ 60 ca. *(Xong 20/11. Khác plan: `mockClinicalExtraction(transcript, context?)` nhận sinh hiệu để phát hiện lệch; validator chấp nhận `can_xem_lai` trỏ `/sinh_hieu/*`; sửa "triệu chứng" bị che nhầm (họ "Triệu").)*
- [x] **Bước 4:** *(Xong 20/11: test PASS. Eval mock trước = sau: rule-only 77,8%; eval-pii che nhầm 0/84 và 0/8. Chưa nơi nào truyền sinh hiệu vào `extractClinical`.)*
  - Test PASS.
  - `npm run eval -- --rule-only` chạy được; ghi điểm trước và sau vào CHANGELOG.
  - `npm run eval-pii` không tăng số che nhầm.
- [x] **Bước 5:** commit `feat(ngon-ngu): từ điển và bộ trích mock Tim mạch`. *(Xong 20/11: commit `d0fdd9c`.)*

---

### Task 7: Từ vựng STT

**Files:**
- Sửa: `config/stt-hotwords.json`: bỏ cụm TMH, mắt, răng; thêm danh sách ở `05` mục 6.
- Sửa: `config/viet-tat.json`: bỏ VTG, VTN, VMX, VMDU, NSTMH, TMH, ĐNL, ĐTL; thêm THA, ĐTĐ, RLLM, NMCT, BTTMCB, SAT, HA, kèm `"mock": true`. **ECG/ĐTĐ trùng nhau: dùng `ĐTĐ` = đái tháo đường, `ECG` = điện tâm đồ.**
- Sửa: `config/sua-chu-giong-noi.json`:
  - bỏ quy tắc TMH trong `thay`, `tu_chuyen_khoa`, `dau_hieu_thuoc`;
  - `tu_chuyen_khoa` thêm 9 thuốc của bộ ca;
  - `dau_hieu_thuoc` bỏ "nhỏ tai", "xịt mũi".
- Sửa: `src/client/giong-bac-si/DangKyGiong.tsx`: câu đọc mẫu thứ 5 bỏ "súc họng nước muối"; dùng 3 câu Tim mạch ở `05` mục 6.
- Sửa: `stt/tests/test_terminology.py`, `stt/tests/test_stt.py`, `stt/ner_probe.py` (câu ví dụ)

- [x] **Bước 1: Sửa test Python** để kỳ vọng hotword Tim mạch, ví dụ `"rung nhĩ" in hotwords` và `"amidan" not in hotwords`. Chạy `.venv-stt/bin/python -m pytest stt/tests/test_terminology.py -q` → FAIL. *(Xong 20/11.)*
- [x] **Bước 2:** sửa 3 file config và câu đọc mẫu. *(Xong 20/11. Khác plan: không thêm `"mock": true` vào `viet-tat.json` vì file là bảng từ→nghĩa, khóa `mock` sẽ bung chữ "mock" thành "true". 05 mục 5 chỉ có 8 thuốc khác nhau nên thêm 8. Bỏ thêm quy tắc "nhỏ mũi" và "niên mạc".)*
- [x] **Bước 3:** *(Xong 20/11: pytest terminology + stt PASS; 11 test `test_denoise` lỗi sẵn do venv thiếu scipy. grep config sạch. `stt/tests/test_ner.py` còn câu "đau họng", để Task 8/11 xử lý.)*
  - `.venv-stt/bin/python -m pytest stt/tests -q` PASS.
  - `npm test` không có fail mới.
  - `grep -nE 'tai|mũi|họng|amidan|xoang' config/*.json` không còn cụm TMH. "Nhịp xoang" được phép.
- [x] **Bước 4:** ghi CHANGELOG, cập nhật `docs/STT.md` mục hotword. Commit `feat(stt): từ vựng Tim mạch`. *(Xong 20/11: commit `40ee550`.)*

---

### Review giữa kỳ (Opus)

Đọc diff Task 1–7. Chạy `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run clinical:check`.

Đối chiếu với `02` mục B1–B12 và 5 dòng Review Focus. Báo lỗi theo mức nghiêm trọng. Session chính giao Sonnet sửa trước khi sang Task 8.

---

### Task 8: Kịch bản demo, ca eval, fixture test; về 0 test fail

**Files:**
- Thay: `data/demo-luong/kich-ban/{ca-chuan,ca-tu-che,ca-chua-dong-y}.json`, dùng hội thoại SYN-CARDIO-001, 013, 049 (`05` mục 1)
- Thay: `data/cases/`:
  - xóa `ca-11-tim-mach.json`;
  - tạo 10 ca `ca-01-tang-huyet-ap.json` … `ca-10-kham-truoc-thu-thuat.json`; `expected` dựng theo `02`, không theo `reference_note`.
- Sửa: `src/server/du-lieu/eform.ts` (hằng `CA_MAU` trỏ `ca-01-tang-huyet-ap`)
- Thay: `data/clinic-test/*.json`, `data/pii-eval/cau-stt.json` (câu STT Tim mạch giả; giữ số câu và phân bố nhãn che)
- Sửa: mọi test đang fail trong danh sách nền ở Task 0 và mọi test vỡ ghi trong báo cáo Task 1–7

**Interfaces:**
- Consumes: mọi thứ ở Task 1–7.
- Produces: `npm test` → **0 fail**.

- [ ] **Bước 1:** `npm test 2>&1 | grep '^✖' | sort -u` liệt kê các test fail hiện tại.
- [ ] **Bước 2: Thay dữ liệu.** Với mỗi test fail, sửa dữ liệu hoặc kỳ vọng sang Tim mạch. **Không xóa test để cho qua.** Test kiểm hành vi không còn tồn tại, ví dụ 4 vùng TMH, thì xóa và ghi lý do vào CHANGELOG.
- [ ] **Bước 3: Chạy kiểm tra.**
  - `npm test` → `ℹ fail 0`.
  - `npm run eval -- --rule-only` và `npm run eval-mau` chạy được; ghi điểm.
  - `npm run lint` sạch lỗi.
- [ ] **Bước 4:** ghi CHANGELOG, commit `test: chuyển fixture và kịch bản sang Tim mạch`.

---

### Task 9: Nghiệm thu tự động 3 ca của `04`

**Files:**
- Tạo: `src/server/clinical/nghiem-thu-tim-mach.test.ts`
- Tạo: `data/cardiology/nghiem-thu/{SYN-CARDIO-013,SYN-CARDIO-001,SYN-CARDIO-039}.expected.json`: chuyển bảng "Mong đợi" của `04` thành JSON theo id trường eForm.

**Interfaces:**
- Consumes:
  - `mockClinicalExtraction` (Task 6), `aiEformPatch` / `applyAiDraft` (Task 2), `dongChanDoanIn` (Task 4);
  - ngữ cảnh lượt khám (Task 3).
- Produces: một test cho mỗi ca. Chạy transcript `conversation_text` (ca 039 thêm `recovery_dictation`) qua pipeline mock, rồi so từng trường với file expected.
  - Trường mong đợi "trống" phải bằng `""`.
  - Mã ICD phải ở trạng thái `xem`.

- [ ] **Bước 1:** viết 3 test:
  - `nghiem_thu_013_kham_moi`: `icd_kem_theo === ""` (Review Focus 3), `mo_ta_ra_vien === ""`, `kham_tim_mach_ho_hap` chứa `"Tiếng T1, T2 rõ"`.
  - `nghiem_thu_001_tai_kham`: `di_ung === "Có"`, `hen_tai_kham === "Có"`, `ngay_tai_kham` = `thoi_gian_kham` + 30 ngày.
  - `nghiem_thu_039_doc_bo_sung`: `thuocDangDung` có 2 dòng, một dòng `ham_luong === "2,5 mg"`; `tien_su_gia_dinh` giữ cụm "không rõ".
- [ ] **Bước 2:** chạy → ghi lại kết quả. Trường nào lệch do mock trích thiếu thì sửa mock ở `extraction.ts`. **Không sửa expected** trừ khi expected trái `04`.
- [ ] **Bước 3:** cả 3 test PASS, `npm test` vẫn 0 fail.
- [ ] **Bước 4:** cập nhật `docs/tc11-nghiem-thu-phieu-ngoai-tru.md` (cách chạy, kết quả). Ghi CHANGELOG, commit `test: nghiệm thu tự động 3 ca Tim mạch`.

---

### Task 10: Bỏ trang riêng `/phieu-kham-ngoai-tru`

**Files:**
- Xóa: `src/app/phieu-kham-ngoai-tru/`, `src/app/api/phieu-kham-ngoai-tru/`, `src/client/phieu-kham-ngoai-tru/`, `src/server/phieu-kham-ngoai-tru/`, `data/phieu-kham-ngoai-tru/`
- Giữ:
  - `config/forms/phieu-kham-ngoai-tru.json`;
  - `scripts/nhap-excel-phieu-kham.py`;
  - `src/shared/phieu-kham-ngoai-tru/{types,config}.ts`, mà Task 1 dùng cho `excelKeys`. Xóa `du-lieu.ts`, `schema.ts` và test của chúng nếu không còn nơi import (kiểm bằng grep).
- Sửa: `src/client/chung/Header.tsx` (bỏ link "Phiếu khám Tim mạch"), `.gitignore` (bỏ dòng `/data/phieu-kham-ngoai-tru/*.json`), `README.md`, `docs/cau-truc-du-an.md`

- [ ] **Bước 1:** `grep -rn "phieu-kham-ngoai-tru" src` chỉ còn import tới `src/shared/phieu-kham-ngoai-tru/{types,config}`.
- [ ] **Bước 2:** `npm test` 0 fail, `npm run lint` sạch, `npx tsc --noEmit -p .` sạch.
- [ ] **Bước 3:** ghi CHANGELOG, commit `refactor: gộp trang phiếu khám riêng vào eForm chính`.

---

### Task 11: Chốt 100% Tim mạch — test chặn TMH + tài liệu

**Files:**
- Tạo: `src/shared/khong-con-tmh.test.ts`
- Sửa: `README.md`, `CLAUDE.md` (đoạn mô tả dự án; `docs/tham-khao/` đã xóa thì sửa câu tham chiếu), `docs/CLINICAL-WORKFLOW.md` (tiêu đề "Luồng khám TMH" → "Luồng khám Tim mạch"), `docs/cau-truc-du-an.md`, `docs/superpowers/plans/pending/README.md` (trạng thái plan này)
- Sửa: `scripts/cao-du-lieu.ts`: đổi chú thích; bộ lọc TMH giữ nguyên nhưng ghi "chưa dùng". Việc cào lại để task tùy chọn.

- [ ] **Bước 1: Viết test** `khong_con_tmh_trong_san_pham`:
  - Quét `src/`, `config/`, `data/` (trừ `data/cardiology/`, file test này, `node_modules`), các đuôi `.ts`, `.tsx`, `.json`, `.py`.
  - Tìm regex `/TMH|[Tt]ai [Mm]ũi [Hh]ọng|viêm tai|amidan|màng nhĩ|viêm xoang|"tai"|"mui"|"vom"|"hong"/`.
  - Kỳ vọng mảng `file:line` khớp **rỗng**. Cụm "nhịp xoang" không khớp regex.
- [ ] **Bước 2:** chạy → FAIL nếu còn sót. Sửa từng chỗ sót, ghi vào báo cáo.
- [ ] **Bước 3:** cập nhật tài liệu theo Files. README mô tả sản phẩm CardioNote, luồng, cách chạy trên macOS (`.venv-stt` Python 3.12, `uv`), danh mục mock, cách sinh lại config từ Excel và fixture từ 60 ca.
- [ ] **Bước 4:** `npm test` 0 fail, `npm run lint` sạch, `npm run build` PASS.
- [ ] **Bước 5:** commit `docs: CardioNote 100% Tim mạch`.

---

### Review cuối (Opus)

So sánh toàn nhánh với `dev`:
- chạy `npm test`, `npm run lint`, `npm run build`, `npm run clinical:check`;
- chạy app `next dev -p 3100`, mở `/` bằng trình duyệt, làm trọn luồng mock: gõ hội thoại SYN-CARDIO-001 → che → AI mock → áp dụng → sửa → lưu → duyệt → in;
- đối chiếu 5 dòng Review Focus.

Báo cáo PASS/FAIL thật. Sửa xong thì session chính hỏi anh có tạo PR vào `dev` không.

### Task tùy chọn (sau khi anh đồng ý, cần mạng): danh mục thật

- Sửa bộ lọc `scripts/cao-du-lieu.ts` (dòng 13–74) để cào chương IX ICD-10 (I00–I99) và các mã R/Z/E ở `05` mục 3, kỹ thuật chương Tim mạch, thuốc của các hoạt chất Tim mạch.
- Ghi ra `data/tham-khao/{icd10,dich-vu-ky-thuat,thuoc-luu-hanh}-tim-mach.json` và nối vào `danh-muc.ts`.
- Bỏ nhãn mock cho mục nào đã khớp danh mục thật.
