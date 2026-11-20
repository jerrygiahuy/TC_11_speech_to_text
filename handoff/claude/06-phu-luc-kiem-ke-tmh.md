# Kiểm kê nội dung TMH còn lại (TC_11_speech_to_text)

Gốc repo: `/Users/huy.tvg2408/Documents/Vinmec phase 3/TC_11_speech_to_text`. Chỉ đọc, không sửa. Đường dẫn dưới đây tính từ gốc repo. Mọi dữ liệu là giả.
`data/cardiology/` (synthetic-cases.jsonl/csv, exam-library.json, schema...) chỉ được `scripts/generate-cardiology-data.mjs` nhắc tới; không có file trong `src/` nào nạp nó (đã grep).

## Nhóm 1. Ca mặc định, lịch hẹn, lịch sử, demo

Ca mặc định trên `/`: `src/app/page.tsx` render `EncounterWorkspace`. Component này gọi `listEncounters()` rồi chọn `lists.open[0] ?? lists.available[0]` (`src/client/eform/EncounterWorkspace.tsx:~118`). `available` do `src/app/api/clinical/encounters/route.ts:12` lấy từ `listEncounterContexts()` (`src/server/clinical/encounter-context.ts:122`), đọc `data/eform/encounter-contexts.json` (+ `data/clinical/walk-in-contexts/` sinh lúc chạy). Vậy ca mặc định = context đầu tiên trong `encounter-contexts.json`: `LK-GIA-0456`, bệnh nhân `GIA-000123`, bác sĩ `user_bs01`, "Phòng khám TMH 02", ca viêm tai giữa (viêm tai phải, chảy mủ). Bác sĩ/cơ sở cố định ở `getDemoClinicalActor()` (`encounter-context.ts:~100`: `user_bs01`, `facility-prototype`).

| File | Nội dung TMH | Nạp bởi (file:line) | App nạp lúc chạy? | Ghi chú |
|---|---|---|---|---|
| `data/eform/encounter-contexts.json` | 4 context ca TMH (3 bệnh nhân giả GIA-000123/456/789, "Phòng khám TMH 02", tiền sử, sinh hiệu, cận lâm sàng TMH) | `src/server/clinical/encounter-context.ts:60` (loadContexts); `src/server/demo-luong/store.ts:86` | yes | NGUỒN CA MẶC ĐỊNH của `/`. Cần thay bằng ca Tim mạch. |
| `data/eform/ca-gia.json` | 1 ca giả TMH ("Phòng khám TMH 02", lý do "đau tai phải, chảy mủ", dị ứng Penicillin) | `src/server/du-lieu/eform.ts:~26` (`readJson("ca-gia.json")`); `src/server/demo-luong/known-identifiers.ts:18` | yes (qua loadEformData) | Còn dùng cho route/test cũ; `/` dùng encounter-contexts. |
| `data/cases/ca-01 ... ca-11*.json` (11 file gốc) | 11 ca TMH: viêm tai giữa (ca-01, ca-11), mũi xoang, họng, amidan, VA, tai ngoài, dị vật tai, ù tai, u bã đậu, khàn tiếng. Mỗi ca có `input_noi`, `input_go_tat`, `expected` (phiếu khám, thuốc TMH). Không có mã ICD trong file | `src/server/du-lieu/config.ts:46-51` (`loadCases`, đọc TẤT CẢ `*.json`); gọi từ `src/server/du-lieu/eform.ts:23` (chỉ lấy `ca-11` làm `cauMau`), `trinh-dien.ts:37`; `src/server/ai/llm/*` qua ctx; tests `src/shared/clinical/vai-tro-nguoi-noi.test.ts:75`, `src/server/ai/pipeline.test.ts:8`; scripts `eval.ts:22`, `eval-mau.ts:47`, `eval-giong-noi.ts:94`, `tao-am-thanh-mau.ts:28` | yes (eForm `cauMau` = ca-11; `/trinh-dien`); còn lại chỉ scripts/test | Cần viết lại 11 ca Tim mạch; giữ `id` ca-11 hoặc đổi hằng `CA_MAU` ở `src/server/du-lieu/eform.ts:13`. |
| `data/clinic/appointments.json` | 9 lịch hẹn, nội dung TMH ("Khám họng", "viêm tai giữa mạn", "nội soi") | `src/server/clinic/fixture-source.ts:11,33` (`DEFAULT_CLINIC_DATA_DIR`), `repository.ts:55` | yes (`/dashboard`, `/benh-nhan`) | Mô tả lịch ghi bệnh TMH. |
| `data/clinic/patients.json` | 3 bệnh nhân giả (trường hồ sơ chung; không gắn khoa) | cùng loader trên | yes | Ít nội dung TMH, kiểm tra thủ công. |
| `data/clinic/directory-demo.json` | 1 cơ sở "Khu khám TMH (dữ liệu giả)", 2 bác sĩ | cùng loader trên | yes | Tên cơ sở chứa "TMH". |
| `data/clinic/history/7a1c0001-...-0001..0004.json` (4 file) | 4 lượt khám lịch sử: ngạt mũi/hắt hơi, đau tai phải, đau họng/ho, chóng mặt tái phát; có `kham_chuyen_khoa` tai/mũi/vòm/họng | `src/server/clinic/clinical-source.ts:9,26` (`DEFAULT_HISTORY_DIR`); test `src/shared/clinic/projection.test.ts:18` | yes | Sinh bởi `scripts/tao-lich-su-clinic.ts`; sửa script khi tạo lại. |
| `data/clinic-test/{patients,appointments,directory-demo,encounters-demo}.json` | 5 bệnh nhân, 12 lịch (nội soi TMH, viêm tai giữa, ngạt mũi, họng, chóng mặt), 4 encounter demo | `src/server/clinic/testing.ts:8`, `repository.test.ts:12`, `service.test.ts:183`, `src/shared/clinic/schedule.test.ts:25` | no (chỉ test) | Fixture test; sửa kèm assert nếu đổi. |
| `data/demo-luong/kich-ban/{ca-chuan,ca-tu-che,ca-chua-dong-y}.json` | 3 kịch bản hội thoại TMH (chảy dịch tai, đau họng, ù tai, betahistine) | `src/server/demo-luong/kich-ban.ts:8-24` (đọc thư mục, lọc `.json`); `src/app/api/demo-luong/kich-ban/route.ts:11`; test `routes.test.ts:106` | yes (`/demo-luong`) | Chỉ là kịch bản, gắn bệnh nhân GIA-000123/456/789. |
| `data/sessions/` | chỉ `.gitkeep` (+ `.gitkeep 2`), không có nội dung TMH | `src/server/du-lieu/sessions.ts:8` | yes (ghi lượt thử) | Không cần đổi. |

Nhãn chuyên khoa hard-code (grep `TMH|tai mũi họng|chuyên khoa`), tất cả đang chạy:
- `src/app/layout.tsx:13` title "Trợ lý điền bệnh án TMH"; `src/client/chung/Header.tsx:20` h1 cùng tên.
- `src/shared/clinical/schema.ts:121` `department_id: "tmh"`; `src/server/clinical/service.ts:24` `room_id = "prototype-tmh-02"`.
- `src/server/clinical/extraction.ts:197` system prompt "ngoại trú TMH"; `src/server/ai/prompt.ts:23` "bác sĩ Tai Mũi Họng".
- Nhãn ô: `src/client/eform/EformForm.tsx:82` ("Khám chuyên khoa TMH (Tai/Mũi/Vòm/Họng)"), `BanIn.tsx:57`, `src/client/demo-luong/DemoPhieuPanel.tsx:19`, `src/shared/eform/dien-phieu.ts:61`, `config/forms/phieu-kham.json:11`.
- Từ điển thuật ngữ TMH trong code: `src/server/clinical/pii-allowlist.ts:6-19`, `src/shared/clinical/vai-tro-nguoi-noi.ts:48-94` (hàng chục cụm triệu chứng/chẩn đoán TMH để đoán vai người nói), `src/server/ai/llm/rules.ts:92,113` ("nhỏ tai", "xịt mũi"...).
- `Khoa phòng` ở `src/client/eform/LichSuBlock.tsx:78` chỉ là tiêu đề cột, trung tính.

## Nhóm 2. Mẫu câu, phiếu mẫu, quy tắc (`data/eform/`)

| File | Nội dung TMH | Nạp bởi (file:line) | App nạp lúc chạy? | Ghi chú |
|---|---|---|---|---|
| `data/eform/mau-cau.json` | `mac_dinh` 4 vùng tai/mui/vom/hong + 7 nhóm lý do khám (đau tai chảy mủ...) với câu mẫu `[a|b]` theo vùng | `src/server/du-lieu/eform.ts:~33` (`readJson("mau-cau.json")`) -> `src/shared/eform/mau-cau.ts` -> `src/client/eform/MauCauPanel.tsx:6,55,60` | yes | Khóa JSON là `VungKham`; phải đổi cùng kiểu. |
| `data/eform/phieu-mau.json` | 39 phiếu mẫu TMH (viêm tai giữa cấp/mạn, VTN, nút ráy, dị vật tai, VMX, VMDU, họng, amidan, VA, thanh quản, trào ngược...) có `icd_ten`, `kham_chuyen_khoa`, chỉ định, đơn thuốc | `src/server/du-lieu/phieu-mau.ts:15`; `src/shared/eform/phieu-mau.ts`; test `phieu-mau.test.ts` | yes | `icd_ten` phải khớp tên mã trong `icd10-tmh.json` (comment `phieu-mau.ts:14`). |
| `data/eform/goi-y-theo-chan-doan.json` | 12 bộ gợi ý chỉ định/đơn thuốc theo ICD (H66.0, H65.9...) | `src/server/du-lieu/eform.ts:~37` | yes | Mã ICD TMH. |
| `data/eform/quy-tac.json` | `tom_tat` 3, `icd` 6, `phu_dinh` 3 quy tắc cho AI (từ khóa tai/mũi/họng) | `src/server/du-lieu/eform.ts:~32` | yes | Chưa đọc kỹ từng quy tắc: chưa xác minh mức TMH từng dòng. |
| `data/eform/icd10.json` | 28 mã ICD từ khóa gợi ý (24 H/J, K21.9, R04.0, T16, T17.1) | `src/server/du-lieu/danh-muc.ts:121,124` | yes | Xem nhóm 3. |
| `data/eform/thu-vien.json` | 4 khóa (khám toàn thân, khám khác, hướng điều trị, lời dặn): câu thư viện, nội dung hướng TMH (ví dụ "Tim đều, phổi không ran" ở khám khác) | `eform.ts:~31` | yes | Kiểm tra từng câu. |
| `data/eform/tuy-chon.json` | trạng thái, tình trạng ra viện, loại dị ứng (chung) | `eform.ts:~31` | yes | Nhiều khả năng trung tính, chưa xác minh. |
| `data/eform/trinh-dien.json` | kịch bản trình diễn (lệnh, hội thoại, thói quen) | `src/server/du-lieu/trinh-dien.ts:22` | yes (`/trinh-dien`) | Có thể TMH, chưa xác minh chi tiết. |
| `data/eform/encounter-contexts.json`, `ca-gia.json` | xem nhóm 1 | | yes | |

`VungKham = "tai"|"mui"|"vom"|"hong"` (`src/shared/eform/types.ts:93`) và nơi phụ thuộc:
- `src/shared/eform/types.ts:96,101` (`MauCauData.mac_dinh`, `nhom[].mau`).
- `src/shared/eform/mau-cau.ts:3,5-9,19,27,35` (`VUNG_KHAM` nhãn Tai/Mũi/Vòm/Họng; `theoVung` cứng 4 khóa).
- `src/client/eform/MauCauPanel.tsx:6,55,60-63` (vẽ 4 nút vùng).
- `src/shared/clinical/types.ts:30-33` (kiểu `Exam` có `tai/mui/vom/hong`, sinh bởi `scripts/generate-clinical-types.mjs` từ `config/clinical/common.schema.json:145,167` và các `kham_chuyen_khoa` ở dòng 228/290/1219/1280).
- `src/shared/clinical/eform.ts:42` (danh sách 4 vùng cứng) và `:90` (`kham_chuyen_khoa = {mo_ta, tai:null, mui:null, vom:null, hong:null}`).
- `src/shared/clinic/projection.ts:99` (`specialistText(note.kham_chuyen_khoa)`), `src/server/clinical/extraction.ts` (nhắc `kham_chuyen_khoa`), `src/shared/clinical/approvals.ts`, `changes.ts`; các test `eform.test.ts`, `apply-ai.test.ts`, `extraction.test.ts`, `phieu-mau.test.ts`, `flow.test.ts`.
- Dữ liệu chứa `kham_chuyen_khoa`: toàn bộ `data/cases/*.json`, `data/clinic/history/*`, `config/forms/phieu-kham.json`, `docs/task-2/examples/*.json`.
Đổi sang Tim mạch cần quyết định: giữ khóa `kham_chuyen_khoa` nhưng bỏ/đổi 4 vùng (thay bằng ví dụ tim/phổi/mạch ngoại vi), đồng thời sửa schema JSON, sinh lại `types.ts`, và các test trên.

## Nhóm 3. Danh mục (`data/catalog/`, `data/tham-khao/`)

Loader: `src/server/du-lieu/danh-muc.ts` (`loadCatalogs` dòng 103-113, `loadIcd10` dòng 119-133), re-export từ `config.ts:14`. LƯU Ý: README `data/tham-khao/README.md` nói "ứng dụng đã nạp" các file này; ghi chú trong `scripts/cao-du-lieu.ts:4` ("KHÔNG được ứng dụng nạp") đã lỗi thời. Code thực tế đang nạp.

| File | Nội dung TMH | Nạp bởi (file:line) | App nạp lúc chạy? | Ghi chú |
|---|---|---|---|---|
| `data/catalog/dich-vu.json` | 30 dịch vụ soạn tay (`DV-TMH-001 Khám Tai Mũi Họng`, nội soi tai/mũi/họng, đo thính lực, nhĩ lượng...) | `danh-muc.ts:105` | yes | Có `ten_khac` (cách bác sĩ gọi). |
| `data/catalog/thuoc.json` | 35 dòng thuốc (Augmentin, Otipax, Nasonex, Betaserc, xịt mũi...) | `danh-muc.ts:106` | yes | Chủ yếu kháng sinh/xịt mũi/nhỏ tai. |
| `data/tham-khao/icd10-tmh.json` | 433 mã ICD-10; 219 mã H/J (H=135, J=84), C=94, Q=62... Chỉ 1 mã nằm trong nhóm tim mạch cần tìm: `R07.0` (thực ra là "đau họng", không phải đau ngực) | `danh-muc.ts:120` | yes | Không có I10, I11, I20-I25, I48, I50, R00, R06.0, R55, E78, Z95. |
| `data/eform/icd10.json` | 28 mã; 0 mã tim mạch | `danh-muc.ts:121` | yes | Cung cấp từ khóa `manh/vua`; mã trong đó nhưng thiếu ở nguồn thật vẫn được giữ. |
| `data/tham-khao/dich-vu-ky-thuat-tmh.json` | 486 kỹ thuật, gồm 403 chương 15 "Tai Mũi Họng" | `danh-muc.ts:76,105` | yes | Không có kỹ thuật tim mạch (chưa kiểm từng dòng; nguồn lọc theo TMH). |
| `data/tham-khao/thuoc-luu-hanh-tmh.json` | 4.914 thuốc của 58 hoạt chất hay kê ở TMH (4,5 MB cả thư mục) | `danh-muc.ts:84,106` | yes | Thiếu thuốc tim mạch (amlodipin, atorvastatin, bisoprolol...). |
| `data/tham-khao/thuoc-hoat-chat.json` | 960 hoạt chất BHYT toàn danh mục (không lọc TMH) | không | no (README ghi "chưa dùng") | Dùng lại được cho tim mạch. |
| `data/tham-khao/nguon.json` | số mục cào, ngày cào | không | no | Cập nhật sau khi cào lại. |
| `scripts/cao-du-lieu.ts` | bộ lọc TMH (khoảng ICD, `HOAT_CHAT_TMH`, chương 15) ở dòng 13-74,142,185 | `package.json` script `cao-du-lieu` | only scripts | Là nơi cần sửa bộ lọc để cào lại cho Tim mạch. |

## Nhóm 4. Từ vựng STT

| File | Nội dung TMH | Nạp bởi (file:line) | App nạp lúc chạy? | Ghi chú |
|---|---|---|---|---|
| `config/viet-tat.json` | 20 viết tắt; nhóm TMH: VTG, VTN, VMX, VMDU, NSTMH, TMH, ĐNL (và ĐTL). Không có viết tắt tim mạch (THA, NMCT, ECG...) | `src/server/du-lieu/config.ts:32-33`; dùng ở `eform.ts:25`, `phieu-mau.ts:27`, `trinh-dien.ts:25`; bung ở `src/shared/normalize.ts` | yes | |
| `config/stt-hotwords.json` | 81 cụm: ~14 TMH, ~18 nhãn khoa/nhãn mắt/răng, thuốc kháng sinh; ĐÃ CÓ ~30 cụm tim mạch (tăng huyết áp, NMCT, suy tim, Holter, stent, amlodipine...) | `stt/terminology.py:11` (đọc `STT_HOTWORDS_FILE` hoặc `config/stt-hotwords.json`) | yes (dịch vụ STT Python) | Trộn nhiều khoa; cần bỏ cụm nha/mắt/TMH. |
| `config/sua-chu-giong-noi.json` | `thay` 50 quy tắc (nhiều quy tắc TMH: "hai mũi họng" -> "tai mũi họng", "màng nhị" -> "màng nhĩ", "chạy mủ"...), `tu_chuyen_khoa` 39 (Augmentin, Otipax, Nasonex, Betaserc...), `dau_hieu_thuoc` 21 (nhỏ tai/mũi/xịt mũi) | `src/server/du-lieu/config.ts:36-38`; `eform.ts` (loadSuaChu); `src/shared/giong-noi/sua-chu.ts`; `scripts/eval-giong-noi.ts` | yes (client áp trước khi vào ô nhập) | Cần thêm tên thuốc tim mạch và lỗi nghe nhầm tim mạch. |
| `src/client/giong-bac-si/DangKyGiong.tsx:15-21` | 5 câu đọc mẫu: "đau họng, nuốt vướng", "amidan", "màng nhĩ", "nội soi tai mũi họng", paracetamol | route `/giong-bac-si` (`src/app/giong-bac-si/page.tsx`) | yes | Câu 1-3 TMH hoàn toàn, câu 4-5 trung tính. |
| `data/giong-noi/` | chỉ `README.md` (nhắc `data/cases/`); file `.wav` không đưa lên git | `scripts/eval-giong-noi.ts:22` | only scripts | |
| `config/forms/phieu-kham.json:11` | nhãn "Khám chuyên khoa TMH", hint "Kết quả khám tai, mũi, họng" | `config.ts:24` (`loadForms`) | yes | Cấu hình form cho AI điền. |
| `config/canh-bao.json`, `config/theme.json` | trung tính (cảnh báo cân nặng trẻ em, màu) | `config.ts:29,42` | yes | Không đổi. |

## Nhóm 5. Tên kỹ thuật và tài liệu

| Vị trí | Nội dung | Nạp bởi / dùng ở | App nạp lúc chạy? | Ghi chú |
|---|---|---|---|---|
| `tmh-device-id` | khóa `localStorage` | `src/client/eform/EncounterWorkspace.tsx:20,23` (hai lần) | yes | Đổi thành tên trung tính (vd `eform-device-id`); đổi thì thiết bị mất id cũ, chấp nhận. Chỉ 2 chỗ trong src. |
| `prototype-tmh-02` | `room_id` | `src/server/clinical/service.ts:24` | yes | |
| `department_id: "tmh"` | | `src/shared/clinical/schema.ts:121` | yes | Nên đổi thành mã khoa Tim mạch. |
| Tên file `*-tmh.json` | | `danh-muc.ts:76,84,105,106,120` | yes | Đổi tên file thì sửa 5 dòng này, cộng `scripts/cao-du-lieu.ts:132,146,216,223-227`. |
| `README.md:1,200,219`, `CLAUDE.md:3`, `AGENTS.md` | tiêu đề "TMH"; README đoạn 3 đã ghi đây là nhánh TC_11 Tim mạch còn nghiệp vụ TMH; ví dụ JSON `DV-TMH-002`. `AGENTS.md` chỉ chứa quy tắc Next.js (không nhắc TMH) | | no (tài liệu) | |
| `docs/` có TMH | CHANGELOG, STT.md, STT-VERIFICATION.md, CLINICAL-WORKFLOW.md, legacy-eform-before-clinical.md, kich-ban-thu-bac-si.md, tong-hop-quan-sat-tmh.md, cau-truc-phieu-kham-ngoai-tru.md, cau-truc-man-chi-dinh-dich-vu.md, cau-truc-man-ke-don-oh.md, task-2/*, tham-khao/* (nhat-ky-*-tmh, bao-cao-tuan-1...), superpowers/plans/pending/2026-11-16-* | | no | Tài liệu khảo sát thực địa TMH, giữ làm lịch sử. Đã có sẵn `docs/chuan-hoa-du-lieu-tim-mach.md` và `docs/tim_mach/vinmec_opd_schema_tong_hop.md`. |
| Test có TMH | `src/server/demo-luong/kich-ban.test.ts`, `src/server/ai/pipeline.test.ts`, `src/server/clinic/service.test.ts`, `stt/tests/test_terminology.py`, `stt/tests/test_stt.py` | | only tests | Sẽ vỡ khi đổi dữ liệu. |
| `package.json` | `name: "prototype-1"` (không có TMH) | | | |

## Nhóm 6. File hậu tố " 2"

Tìm thấy 204 file `* 2*` (loại `node_modules`, `.git`, `.next`): 145 giống hệt bản gốc (`cmp`), 59 khác nội dung. Không file nào ngoài các file " 2" nhắc tên " 2" (grep basename: 0 kết quả), nên không có code tham chiếu trực tiếp.

| Nhóm file " 2" | Số lượng | So với bản gốc | Nạp lúc chạy? | Ghi chú |
|---|---|---|---|---|
| `data/cases/ca-NN-... 2.json` | 11 | tất cả giống hệt | YES | `loadCases` (`config.ts:46-51`) đọc mọi `*.json`, nên mỗi ca bị nạp 2 lần (22 mục). Hiện lành tính vì `eform.ts:23` dùng `.find` theo id, nhưng `/trinh-dien`, eval, `tao-am-thanh-mau` đếm trùng. Test `vai-tro-nguoi-noi.test.ts:75` regex `^ca-.*\.json$` cũng khớp bản " 2". |
| `data/eform/* 2.json` (9: goi-y, thu-vien, ca-gia, trinh-dien, icd10, quy-tac, tuy-chon, mau-cau, phieu-mau) | 9 | giống hệt | no | Các loader dùng tên file cố định, không quét thư mục. |
| `data/catalog/dich-vu 2.json`, `thuoc 2.json`; `data/tham-khao/*` (6 file + README 2) | 8 | giống hệt | no | Tên cố định. |
| `data/clinic/appointments 2.json` (23 dòng diff), `patients 2.json` (168), `directory-demo 2.json` (12) | 3 | KHÁC (bản cũ) | no | Loader `fixture-source.ts` đọc tên cố định; xem `data/clinic/` chỉ có 3 file này + `history/`. |
| `data/sessions/.gitkeep 2`, `data/giong-noi/README 2.md` | 2 | giống | no | `sessions.ts` có thể liệt kê thư mục, chưa kiểm cách lọc: chưa xác minh. |
| `config/sua-chu-giong-noi 2.json` (84 dòng diff), `viet-tat 2.json`, `canh-bao 2.json`, `theme 2.json`, `config/forms/* 2.json` | 7 | `sua-chu` KHÁC, còn lại giống | no | |
| `src/**/* 2.ts(x)` (khoảng 100 file) | ~100 | ~35 file KHÁC (vd `EformScreen 2.tsx` 447 dòng, `TroLyAi 2.tsx` 597, `MicButton 2.tsx` 317, `BanIn 2.tsx` 16, `page 2.tsx` 18) | no (Next route/Import không trỏ tới) | Là bản cũ của file. `tsconfig.json:27` `include "**/*.ts","**/*.tsx"` nên chúng vẫn bị `tsc`/IDE type-check và eslint quét; có thể gây lỗi/nhiễu. |
| `src/**/*.test 2.ts` (vd `phieu-mau.test 2.ts`, `service.test 2.ts`) | ~12 | vài file khác | no | `npm test` = `tsx --test "src/**/*.test.ts" "lib/**/*.test.ts"` (`package.json:18`). Tên `x.test 2.ts` kết thúc bằng `" 2.ts"`, không khớp `*.test.ts`, nên KHÔNG bị chạy. |
| gốc: `README 2.md` (237 dòng diff), `CLAUDE 2.md` (65), `AGENTS 2.md` (46), `package 2.json` (20), `package-lock 2.json`, `tsconfig 2.json`, `next.config 2.ts`, `eslint.config 2.mjs`, `.env 2.example`, `.gitignore 2`; `docs/*` " 2" (7 + `docs/tham-khao` 8 + `docs/testing` 1; `docs/CHANGELOG 2.md` 853 dòng diff); `scripts/* 2.*`; `.claude/*` " 2" | khoảng 40 | phần lớn KHÁC | no | Bản cũ/backup do đồng bộ. |

Loader thư mục khác:
- `src/server/demo-luong/kich-ban.ts:12-13`: lọc `.json` và `ID.test(tên bỏ .json)`; chưa đọc regex `ID` nên chưa xác minh có loại tên có dấu cách hay không; hiện `data/demo-luong/kich-ban/` không có file " 2".
- `src/server/clinical/encounter-context.ts:loadWalkInContexts`: quét `data/clinical/walk-in-contexts/*.json` (không phải thư mục có file " 2").
- `data/clinic/history/` không có file " 2".

## Phát hiện đáng chú ý

- Ca mặc định trên `/` là `LK-GIA-0456` (viêm tai giữa, "Phòng khám TMH 02"), lấy từ phần tử đầu của `data/eform/encounter-contexts.json` qua `EncounterWorkspace.tsx` (`open[0] ?? available[0]`). Đổi file này (kèm `ca-gia.json`) là bước đầu quyết định.
- `loadCases()` (`src/server/du-lieu/config.ts:46`) quét MỌI `*.json` trong `data/cases/`, nên 11 file `* 2.json` (giống hệt gốc) bị nạp trùng lúc chạy: `/trinh-dien`, các script eval và test. Xóa các file " 2" trước khi đổi sang ca Tim mạch để tránh nhân đôi.
- Danh mục thật TMH đang được app nạp: `icd10-tmh.json` (433 mã, 219 mã H/J), `dich-vu-ky-thuat-tmh.json` (486), `thuoc-luu-hanh-tmh.json` (4.914), cộng 2 file `data/catalog/`. Không có mã tim mạch nào trong danh sách cần tìm (I10, I11, I20-I25, I48, I50, R00, R06.0, R55, E78, Z95); `R07.0` có mặt nhưng là "đau họng".
- Lưu ý: `scripts/cao-du-lieu.ts:4` vẫn ghi "ứng dụng KHÔNG nạp data/tham-khao" nhưng `danh-muc.ts` đã nạp; README thư mục này mới đúng.
- `VungKham` (tai/mũi/vòm/họng) ăn sâu vào `types.ts`, JSON schema `config/clinical/common.schema.json`, `clinical/types.ts` (sinh tự động), `clinical/eform.ts:42,90`, `MauCauPanel.tsx`, `data/eform/mau-cau.json` và mọi ca; đổi sang tim mạch là thay đổi schema + sinh lại kiểu + sửa test, không chỉ thay dữ liệu.
- Nhãn TMH hard-code còn ở UI/prompt: `layout.tsx:13`, `Header.tsx:20`, `EformForm.tsx:82`, `BanIn.tsx:57`, `DemoPhieuPanel.tsx:19`, `dien-phieu.ts:61`, `config/forms/phieu-kham.json:11`, `schema.ts:121` (`department_id "tmh"`), `service.ts:24`, và 2 prompt AI (`ai/prompt.ts:23`, `clinical/extraction.ts:197`).
- Từ điển TMH nhúng trong code (không phải JSON): `pii-allowlist.ts`, `vai-tro-nguoi-noi.ts` (đoán vai BS/BN), `ai/llm/rules.ts`: cần bổ sung thuật ngữ tim mạch, nếu không PII gate và nhận diện vai có thể xử lý sai.
- STT: `stt-hotwords.json` đã có ~30 cụm tim mạch lẫn cụm nha/mắt/TMH; `sua-chu-giong-noi.json` và `viet-tat.json` còn hoàn toàn TMH; `DangKyGiong.tsx` có 3/5 câu đọc mẫu TMH.
- `tmh-device-id` (localStorage) chỉ ở `EncounterWorkspace.tsx:20,23`; đổi tên an toàn.
- Hầu hết các file " 2" không được tham chiếu và `npm test` không chạy chúng, nhưng `tsconfig.json` include `**/*.ts(x)` nên chúng vẫn bị type-check/lint; 59 file khác bản gốc (bản cũ), nên không thể dùng làm nguồn đúng.
- Fixture `data/clinic-test/` và các test (`kich-ban.test.ts`, `pipeline.test.ts`, `service.test.ts`, `stt/tests/*`) chứa nội dung TMH và assert theo đó; đổi dữ liệu sẽ làm vỡ test. `data/cardiology/` và `docs/tim_mach/` đã có sẵn nhưng chưa được app nạp.
