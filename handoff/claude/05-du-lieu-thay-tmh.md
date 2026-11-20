# 05 — Đề xuất dữ liệu Tim mạch thay dữ liệu TMH

Đây là **đề xuất**. Codex sở hữu loader và dữ liệu runtime, nên file này không sửa file nào trong `data/` hay `config/`. Vị trí từng file TMH đang được nạp và dòng code nạp nó nằm trong `06-phu-luc-kiem-ke-tmh.md`.

## Nhãn nguồn

| Nhãn | Nghĩa |
|---|---|
| `SEEN` | Thấy trên ảnh EMR (chỉ lấy nhãn hoặc tên danh mục, không lấy giá trị của bệnh nhân) |
| `DATASET` | Có trong `data/cardiology/` (dữ liệu tổng hợp đã có) |
| `MOCK` | Claude đề xuất làm dữ liệu giả. Phải gắn nhãn mock trên giao diện cho đến khi bác sĩ hoặc IT xác nhận |
| `ẨN` | Đề nghị tạm ẩn tính năng hoặc gợi ý cho đến khi có danh mục được xác nhận |

## 1. Ca mặc định, lịch hẹn, lịch sử

| Mục | Đề xuất | Nhãn |
|---|---|---|
| Ca mặc định trên `/` | Phần tử đầu của `data/eform/encounter-contexts.json` dựng từ **SYN-CARDIO-001** (tái khám THA, dị ứng Có). Thêm 2 context từ SYN-CARDIO-013 và SYN-CARDIO-039 để đủ ba ca kiểm thử | DATASET |
| Cơ sở / đơn vị / phòng | `OPD - Trung tâm Tim mạch` / `PK Nội tim mạch` (dạng nhãn như ảnh). `department_id` đổi từ `"tmh"` (`src/shared/clinical/schema.ts:121`) thành ví dụ `"tim-mach"`. `room_id` đổi từ `prototype-tmh-02` thành `prototype-tm-01` | SEEN (nhãn), MOCK (mã) |
| Bệnh nhân, bác sĩ | Giữ kiểu mã giả hiện có (`GIA-*`, `user_bs01`). Không lấy tên hay mã trên ảnh | MOCK |
| Lịch sử (bảng tiền sử bản thân, gia đình, bệnh sử, dị ứng) | Mỗi ca 1–2 dòng lịch sử lấy từ `past_history` / `family_history` của chính ca đó, gắn khoa "PK Tim mạch". Ca 001 thêm 1 dòng dị ứng "Penicillin" loại phiếu "Phiếu Đánh giá ban đầu ngoại trú" để thử nút Copy | DATASET + MOCK (ngày, khoa) |
| Kết quả XN / CĐHA / CLS theo ngày | Dựng từ `result_summaries` (lab, imaging, paraclinical) của ca. Tên dịch vụ CLS lấy ở mục 4 bên dưới | DATASET + SEEN (tên dịch vụ) |
| Lịch hẹn `data/clinic/appointments.json` | 10 lịch, một lịch cho mỗi lý do khám trong bộ 60 ca: tái khám tăng huyết áp · đánh trống ngực từng cơn · khó chịu vùng ngực khi gắng sức · khó thở khi gắng sức · tái khám rối loạn lipid máu · tái khám sau can thiệp mạch vành · tái khám suy tim · tái khám rối loạn nhịp · một lần ngất thoáng qua · đánh giá tim mạch trước thủ thuật | DATASET |
| Phiếu cũ `data/clinic/history/` (4 file) | Sinh lại bằng `scripts/tao-lich-su-clinic.ts` từ 4 ca FOLLOW_UP (001, 025, 031, 037). Cần sửa script, không sửa tay JSON | DATASET |
| `data/demo-luong/kich-ban/` (3 kịch bản) | ca-chuan → hội thoại SYN-CARDIO-001; ca-tu-che (tự chế) → SYN-CARDIO-013; ca-chua-dong-y → SYN-CARDIO-049 (ngất) | DATASET |
| `data/cases/ca-*.json` (11 ca eval TMH) | Viết lại thành 10 ca, mỗi chẩn đoán chính một ca, lấy bản `COMPLETE` đầu tiên của nhóm. `expected` dựng theo bảng `02`, không theo `reference_note` (xem `02` mục D). Hằng `CA_MAU` ở `src/server/du-lieu/eform.ts:13` trỏ sang ca THA | DATASET |
| `data/clinic-test/` | Chỉ dùng cho test. Đổi cùng lúc với assert trong test | – |

## 2. Mẫu câu và phiếu mẫu (`data/eform/`)

| File | Đề xuất | Nhãn |
|---|---|---|
| `mau-cau.json` | Bỏ khóa vùng `tai/mui/vom/hong`. Đề xuất vùng mới `tim`, `phoi`, `mach_ngoai_vi`, `toan_than` (đổi kiểu `VungKham`). Câu mặc định của `tim` và `phoi` lấy nguyên 13 câu `CARDIO_RESP` trong `exam-library.json`. Câu `toan_than` lấy 7 câu `GENERAL` | SEEN |
| `thu-vien.json` | Khám toàn thân, Khám tim mạch, hô hấp: dùng thư viện SEEN. Khám các bộ phận khác: một câu "Chưa ghi nhận bất thường" (SEEN IMG_2164). Hướng điều trị và Lời dặn: thư viện thật chưa chụp, nên dùng câu từ `plan` / `advice_followup` của bộ 60 ca | SEEN + DATASET (gắn nhãn mock) |
| `phieu-mau.json` (39 phiếu TMH) | 10 phiếu mẫu, một phiếu cho mỗi chẩn đoán chính của bộ ca (THA, đánh trống ngực, đau ngực, khó thở, RL lipid, sau can thiệp mạch vành, suy tim, rung nhĩ, ngất, khám trước thủ thuật). Mỗi phiếu lấy `exam`, `treatment` của bản `COMPLETE` | DATASET |
| `goi-y-theo-chan-doan.json` (12 bộ gợi ý ICD TMH) | **ẨN** phần gợi ý đơn thuốc theo chẩn đoán (kê đơn tự động nằm ngoài MVP). Gợi ý chỉ định: chỉ giữ cặp có nguồn, ví dụ THA → Điện tim thường; Suy tim → Siêu âm tim. Gắn nhãn mock | MOCK / ẨN |
| `icd10.json` (từ khóa gợi ý) | Thay 28 mã TMH bằng các mã ở mục 3, kèm từ khóa `manh` lấy từ `display` và `chief_complaint` | DATASET |
| `quy-tac.json` | Rà từ khóa tai/mũi/họng trong `tom_tat.bo_qua`, `icd`, `phu_dinh`. Chưa xác minh từng dòng | – |
| `tuy-chon.json` | Giữ. Đã khớp ảnh: Tình trạng người bệnh ra viện có 5 lựa chọn (SEEN IMG_2168) | SEEN |

## 3. ICD-10 Tim mạch

Danh mục hiện tại (`data/tham-khao/icd10-tmh.json`, 433 mã) **không có mã tim mạch nào** (xem `06`). Đề xuất một danh mục mock nhỏ, đủ cho bộ 60 ca:

| Mã | Tên đề xuất | Dùng trong bộ ca | Nhãn |
|---|---|---|---|
| I10 | Bệnh tăng huyết áp vô căn (nguyên phát) | chẩn đoán chính + kèm theo | **SEEN** (tên đúng như dropdown IMG_2172). Bộ ca ghi tên ngắn hơn "Tăng huyết áp vô căn" |
| R00.2 | Đánh trống ngực | chính | DATASET |
| R07.4 | Đau ngực, không đặc hiệu | ứng viên cho ca "Đau ngực cần đánh giá nguyên nhân tim mạch" | MOCK |
| R06.0 | Khó thở | chính | DATASET |
| E78.5 | Rối loạn lipid máu, không đặc hiệu | chính + kèm theo | DATASET |
| Z95.5 | Có nong mạch vành và bộ phận cấy ghép | chính | DATASET |
| I25.1 | Bệnh tim do xơ vữa động mạch | kèm theo | DATASET |
| I50.9 | Suy tim, không đặc hiệu | chính | DATASET |
| I48.9 | Rung nhĩ và cuồng nhĩ, không đặc hiệu | chính | DATASET |
| R55 | Ngất và trụy | chính | DATASET |
| Z01.8 | Khám chuyên khoa xác định khác | chính | DATASET |

- Tên mã phải đối chiếu danh mục ICD-10 của BYT / Vinmec trước khi bỏ nhãn mock. Cách làm: sửa bộ lọc trong `scripts/cao-du-lieu.ts` (dòng 13–74) để cào chương IX (I00–I99) và các mã R/Z/E ở trên.
- Trong lúc chờ, gắn nhãn mock trên dropdown ICD.

## 4. Dịch vụ CLS

| Dịch vụ | Nhãn |
|---|---|
| Điện tim thường | **SEEN** (IMG_2173, tên dịch vụ) |
| Siêu âm tim, màng tim qua thành ngực | **SEEN** |
| Đo chỉ số ABI (chỉ số cổ chân/cánh tay) | **SEEN** |
| Holter điện tâm đồ 24 giờ | MOCK (cụm đã có trong hotwords) |
| Holter huyết áp 24 giờ | MOCK |
| Nghiệm pháp gắng sức | MOCK |
| Xét nghiệm bộ mỡ máu (Cholesterol, Triglycerid, HDL-C, LDL-C) | MOCK |
| Creatinin máu / điện giải đồ | MOCK (bộ ca có "chức năng thận", "điện giải") |
| NT-proBNP | MOCK |
| X-quang ngực thẳng | MOCK |

- Mã dịch vụ: để code khớp danh mục gán, dạng `DV-TM-xxx`. LLM không tự điền mã.
- Danh mục kỹ thuật thật: cào lại từ chương Tim mạch của danh mục BYT thay cho chương 15 TMH.

## 5. Thuốc

- Bộ 60 ca có 9 thuốc đang dùng: Amlodipine 5 mg, Atorvastatin 20/40 mg, Rosuvastatin 10 mg, Aspirin 81 mg, Bisoprolol 2,5 mg, Furosemide 40 mg, Apixaban 5 mg, Losartan 50 mg (`DATASET`).
- Danh mục thuốc dùng cho **thuốc đang dùng** và khớp tên: 9 thuốc trên (`DATASET`). Có thể lọc `data/tham-khao/thuoc-hoat-chat.json` (960 hoạt chất BHYT, chưa nạp) theo các hoạt chất này.
- **Kê đơn tự động nằm ngoài MVP**, nên gợi ý đơn thuốc trên màn Kê đơn để `ẨN`. Danh mục `thuoc.json` hiện có (Augmentin, Otipax...) không nên hiện trong ca Tim mạch.

## 6. Từ vựng STT

| File | Đề xuất | Nhãn |
|---|---|---|
| `config/stt-hotwords.json` | Giữ khoảng 30 cụm tim mạch đang có. Bỏ cụm TMH, mắt, răng và tên khoa khác. Thêm: rung miu, tiếng T1 T2, âm thổi, tĩnh mạch cổ, mỏm tim, liên sườn V, rì rào phế nang, ran ẩm, phù mắt cá chân, đánh trống ngực, ngất thoáng qua, rung nhĩ, apixaban, furosemide, SpO2, NT-proBNP, chỉ số ABI | SEEN (câu thư viện) + DATASET + MOCK |
| `config/viet-tat.json` | Bỏ viết tắt TMH (VTG, VTN, VMX, VMDU, NSTMH, TMH, ĐNL/ĐTL). Thêm mock: THA → tăng huyết áp; ĐTĐ → đái tháo đường (thấy "DTD2" trong bảng tiền sử trên ảnh); RLLM → rối loạn lipid máu; NMCT → nhồi máu cơ tim; BTTMCB → bệnh tim thiếu máu cục bộ; ECG/ĐTĐ (cần chọn một vì trùng ĐTĐ); SAT → siêu âm tim; HA → huyết áp | MOCK. Danh sách viết tắt bác sĩ thật dùng: Q12 |
| `config/sua-chu-giong-noi.json` | Bỏ quy tắc TMH (`thay`, `tu_chuyen_khoa`, `dau_hieu_thuoc` nhỏ/xịt). `tu_chuyen_khoa` thêm 9 thuốc của bộ ca. `thay` để rỗng phần tim mạch cho đến khi chạy micro và ghi lỗi thật (Đợt 2) | DATASET |
| `DangKyGiong.tsx` câu đọc mẫu | Thay 3 câu TMH bằng: "Tiếng T1, T2 đều rõ, không âm thổi." · "Huyết áp một trăm bốn mươi tám trên tám mươi tám mi li mét thủy ngân, SpO2 chín mươi tám phần trăm." · "Bệnh nhân đang dùng Bisoprolol hai phẩy năm mi li gam mỗi ngày một lần." Giữ 2 câu trung tính | SEEN + DATASET |
| Từ điển trong code | `src/server/clinical/pii-allowlist.ts`, `src/shared/clinical/vai-tro-nguoi-noi.ts`, `src/server/ai/llm/rules.ts` còn cụm TMH. Thêm thuật ngữ tim mạch vào allowlist để bộ che PII không che tên thuốc hay thuật ngữ | MOCK |

## 7. Tài liệu và file hậu tố ` 2`

| Nhóm | Số lượng | Đề xuất |
|---|---|---|
| `data/cases/* 2.json` | 11, giống hệt bản gốc | **Xóa trước tiên.** `loadCases()` đọc mọi `*.json` nên đang nạp trùng 22 ca (`src/server/du-lieu/config.ts:46-51`) |
| ` 2` khác, giống hệt bản gốc | ~134 | Đề nghị xóa. Không có code nào trỏ tới (đã grep tên file) |
| ` 2` khác nội dung bản gốc | 59 (ví dụ `EformScreen 2.tsx`, `TroLyAi 2.tsx`, `CHANGELOG 2.md`, `sua-chu-giong-noi 2.json`, `data/clinic/* 2.json`) | Là bản cũ từ lần đồng bộ. Trước khi xóa, chủ repo xác nhận không còn nội dung cần giữ. `tsconfig.json` include `**/*.ts(x)` nên các file `.ts(x)` ` 2` vẫn bị type-check và lint |
| Nhãn "TMH" trong UI và prompt | `layout.tsx:13`, `Header.tsx:20`, `ai/prompt.ts:23`, `clinical/extraction.ts:197`... | Đổi thành "Tim mạch" cùng lúc với P0 |
| `tmh-device-id` | `EncounterWorkspace.tsx:20,23` | Đổi thành `eform-device-id`. Thiết bị sẽ mất id cũ trong trình duyệt. Prototype nên chấp nhận được |
| Tài liệu TMH trong `docs/` | nhiều file khảo sát | Giữ làm lịch sử. README, CLAUDE.md đổi tiêu đề sang TC_11 Tim mạch |

Lệnh xóa đề xuất. **Chưa chạy, chờ chủ repo đồng ý:**

```bash
find data/cases -name '* 2.json' -delete
```

## 8. Điểm hạn chế của bộ 60 ca

- Mọi ca có dị ứng đều là **Penicillin** (15 ca). Không có ca "Không xác định". Đề xuất bổ sung mock 2–3 ca có dị ứng khác và 1 ca "Không xác định" trước khi chấm phân biệt dị ứng.
- Mọi ca đều có hẹn tái khám (`followup_scheduled = true`). Không có ca "không hẹn", nên không thử được sự khác nhau giữa "không" và "chưa có thông tin" ở hẹn tái khám. Đề xuất thêm 1 ca.
- `exam.specialty` luôn `null`. Không có ca nào thử Khám chuyên khoa (ví dụ khám bụng). Đề xuất thêm 1 ca có khám bụng để thử ranh giới hai mục khám.
