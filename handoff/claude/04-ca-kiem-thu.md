# 04 — Ba ca kiểm thử và đầu ra mong đợi

Nguồn: `data/cardiology/synthetic-cases.jsonl` (60 ca tổng hợp, mã `SYN-*`, không phải người bệnh thật). Đầu ra mong đợi viết theo bảng ánh xạ `02-bang-anh-xa.md`. Đầu ra này **khác `reference_note` ở vài chỗ có chủ đích**, mỗi chỗ được ghi ở cột "Khác `reference_note`".

Lý do chọn ba ca:

| Tình huống | Mã ca | Lý do chọn |
|---|---|---|
| Khám mới | **SYN-CARDIO-013** | Chẩn đoán không có mã ICD, bệnh nền nêu ở tiền sử (thử chẩn đoán kèm không tự điền). Dị ứng nói "chưa ghi nhận". Có thuốc đang dùng. Có ý chỉ định CLS nhưng không nêu dịch vụ cụ thể |
| Tái khám | **SYN-CARDIO-001** | Tăng huyết áp, giống bối cảnh trên ảnh EMR. Dị ứng **Có**. Có thuốc. Có kết quả XN và ECG đã có. Hẹn 30 ngày |
| Ghi âm thiếu rồi đọc bổ sung | **SYN-CARDIO-039** | Trạng thái `RECOVERED`: hội thoại thiếu thuốc đang dùng, lời đọc bổ sung có 2 thuốc kèm số thập phân `2,5 mg`. Dị ứng **Có**. Có câu "không rõ tiền sử gia đình" và một phát hiện có thể thuộc khám bộ phận khác |

Quy ước cho cả ba ca:
- `thoi_gian_kham` cố định trong fixture, ví dụ `2026-11-19T09:00`, để ngày tái khám kiểm được.
- Sinh hiệu lấy từ fixture lượt khám (`reference_note.vital_signs` chuyển thành `ca.sinh_hieu`), không lấy từ AI.
- Tất cả trường AI điền có nguồn `ai` hoặc `xem`. Mã ICD luôn `xem`.

---

## Ca 1 — SYN-CARDIO-013 (khám mới, ghi âm đủ)

**Đầu vào:** `conversation_text` của ca, `recovery_dictation = null`.

| Trường (khóa eForm) | Mong đợi | Nguồn | Khác `reference_note` |
|---|---|---|---|
| `ly_do` | khó chịu vùng ngực khi gắng sức | ai | – |
| `benh_su` | Cảm giác nặng ngực khi đi nhanh, giảm khi nghỉ, không ngất | ai | – |
| `tien_su_ban_than` | Rối loạn lipid máu | ai | – |
| `tien_su_gia_dinh` | Gia đình có người bệnh mạch vành | ai | – |
| `di_ung` | **Không**, nguồn `xem` (cụm "chưa ghi nhận", chờ Q6). Nếu Q6 trả lời "chưa ghi nhận ≠ không" thì đổi thành chưa chọn + cảnh báo | xem | ref: `NONE` |
| `thuoc_dang_dung` | NB có thuốc đang dùng | ai | – |
| `thuoc_dang_dung_ds` | 1 dòng: Atorvastatin · 20 mg · buổi tối | ai | – |
| Sinh hiệu (đầu phiếu) | Theo fixture: mạch 80, HA 132/82, SpO2 98, nhiệt độ 36.8, nhịp thở 19, cân nặng 72, chiều cao 170. Không cảnh báo lệch vì mạch, HA, SpO2 trong hội thoại trùng fixture | LK | – |
| `kham_toan_than` | Tỉnh táo, tiếp xúc tốt | ai | – |
| `kham_tim_mach_ho_hap` | Lồng ngực cân đối. Tiếng T1, T2 rõ, không rung miu. Phổi trong, không ran | ai | – |
| `kham_chuyen_khoa`, `kham_khac` | trống | – | – |
| `mo_ta_ban_dau` | Đau ngực cần đánh giá nguyên nhân tim mạch | ai | – |
| `icd_ban_dau` | **trống**, hoặc một ứng viên đau ngực từ danh mục Tim mạch ở trạng thái `xem`. Không được là mã TMH (ví dụ `R07.0` "đau họng" trong danh mục hiện tại) | xem | ref: `null` |
| `mo_ta_ra_vien`, `icd_ra_vien` | **trống**, chờ bác sĩ | – | ref: chép từ ban đầu |
| `icd_kem_theo` | **trống**. Có thể hiện gợi ý "Rối loạn lipid máu (từ tiền sử)" nhưng không điền | – | ref: `E78.5` |
| `ghi_chu_kq` | Chưa có kết quả xét nghiệm mới; Điện tâm đồ cần bác sĩ đối chiếu | ai | – |
| Chỉ định (`chi_dinh`) | `de_cap = co_chi_dinh`, `items = []`, thêm một mục `can_xem_lai`: "bác sĩ nhắc chỉ định CLS nhưng chưa nêu dịch vụ". Không tạo dòng dịch vụ | xem | – |
| `huong_dieu_tri` | Đánh giá thêm theo chỉ định cận lâm sàng của bác sĩ | ai | – |
| `loi_dan` | Hạn chế gắng sức cho đến khi hoàn tất đánh giá | ai | – |
| `hen_tai_kham` / `ngay_tai_kham` | Có / `thoi_gian_kham` + 7 ngày | ai | – |
| `da_xu_ly`, `tinh_trang_ra_vien` | chưa chọn | – | ref `treated_at_visit = false`: không có câu nói "không xử lý" nên để chưa chọn |
| Kê đơn | không có dòng | – | – |
| Danh sách thiếu | gồm: Chẩn đoán ra viện | – | – |

**Bản in mong đợi:** có hai dòng Chẩn đoán ban đầu (có diễn giải, không mã) và Khám tim mạch, hô hấp. Không có dòng Chẩn đoán ra viện cho đến khi bác sĩ điền. Có dòng Thuốc đang dùng.

---

## Ca 2 — SYN-CARDIO-001 (tái khám, ghi âm đủ)

| Trường | Mong đợi | Nguồn | Khác `reference_note` |
|---|---|---|---|
| `ly_do` | tái khám tăng huyết áp | ai | – |
| `benh_su` | Theo dõi huyết áp tại nhà, thỉnh thoảng đau đầu nhẹ, không đau ngực, không khó thở | ai | – |
| `tien_su_ban_than` | Tăng huyết áp đã được theo dõi | ai | – |
| `tien_su_gia_dinh` | Gia đình có người tăng huyết áp | ai | – |
| `di_ung` / chi tiết | **Có** / mô tả "Penicillin". Loại dị ứng: chỉ điền nếu danh mục loại có "Thuốc" và bác sĩ xác nhận (Q5) | ai | – |
| `thuoc_dang_dung` / danh sách | NB có / Amlodipine · 5 mg · mỗi ngày một lần | ai | – |
| Sinh hiệu | fixture: mạch 72, HA 148/88, SpO2 98, nhiệt độ 36.7, nhịp thở 18, cân nặng 68, chiều cao 165 | LK | – |
| `kham_toan_than` | Tỉnh táo, tiếp xúc tốt | ai | – |
| `kham_tim_mach_ho_hap` | Mạch quay đều, rõ. Tiếng T1, T2 đều rõ, không âm thổi. Phổi trong, không ran | ai | – |
| `mo_ta_ban_dau` / `icd_ban_dau` | Tăng huyết áp vô căn / `I10` nếu danh mục Tim mạch có mã, trạng thái `xem` | ai / xem | – |
| `mo_ta_ra_vien` / `icd_ra_vien` | trống | – | ref: `I10` |
| `icd_kem_theo` | trống | – | – |
| `ghi_chu_kq` | Chức năng thận trong giới hạn được ghi nhận; Điện tâm đồ nhịp xoang | ai | – |
| Chỉ định | `de_cap = chua_de_cap`, không có dòng. "Kết quả chính" là kết quả đã có, **không** sinh chỉ định XN thận hay ECG | – | – |
| `huong_dieu_tri` | Tiếp tục theo dõi huyết áp và dùng thuốc theo đơn hiện tại | ai | – |
| `loi_dan` | Ghi nhật ký huyết áp, tái khám sau 30 ngày | ai | – |
| `hen_tai_kham` / `ngay_tai_kham` | Có / `thoi_gian_kham` + 30 ngày | ai | – |
| Kê đơn | không có dòng. "Theo đơn hiện tại" không phải đơn mới | – | – |

**Kiểm tra luồng (dùng ca này cho mốc bàn giao Đợt 1):** tạo nháp → bác sĩ sửa `loi_dan` thành câu khác → duyệt từng phần → Lưu → khởi động lại app → mở lại từ kho TC_11 → In ngay. Bản in phải có đúng câu `loi_dan` đã sửa, dị ứng "Có: Penicillin", chẩn đoán ban đầu `I10`, và chẩn đoán ra viện nếu bác sĩ đã điền.

---

## Ca 3 — SYN-CARDIO-039 (ghi âm thiếu, đọc bổ sung)

### Giai đoạn A: chỉ có `conversation_text`

| Trường | Mong đợi | Nguồn | Ghi chú |
|---|---|---|---|
| `ly_do` | tái khám suy tim | ai | |
| `benh_su` | Khó thở khi gắng sức mức độ ổn định, không khó thở khi nghỉ | ai | |
| `tien_su_ban_than` | Suy tim đang theo dõi | ai | |
| `tien_su_gia_dinh` | **Không rõ tiền sử gia đình** (giữ nguyên câu) | ai | không được đổi thành "Không" |
| `di_ung` / chi tiết | Có / Penicillin | ai | |
| `thuoc_dang_dung` | **chưa chọn** (`co_thuoc_dang_dung = null`) | – | Không được chọn "NB không có thuốc đang dùng" |
| `thuoc_dang_dung_ds` | rỗng | – | |
| Sinh hiệu | fixture: mạch 78, HA 118/72, SpO2 96, nhiệt độ 36.7, nhịp thở 20, cân nặng 66, chiều cao 164 | LK | |
| `kham_toan_than` | Tỉnh táo, tiếp xúc tốt | ai | |
| `kham_tim_mach_ho_hap` | Tĩnh mạch cổ không nổi. Tiếng tim rõ. Phổi chưa ghi nhận ran. Phù mắt cá chân nhẹ hai bên | ai | Câu phù chân để ở đây vì bác sĩ nói dưới "Khám tim phổi". Ranh giới chờ Q3 |
| `mo_ta_ban_dau` / `icd_ban_dau` | Suy tim, không đặc hiệu / `I50.9` nếu có trong danh mục, `xem` | ai / xem | |
| `mo_ta_ra_vien` | trống | – | ref chép từ ban đầu |
| `ghi_chu_kq` | Điện giải và chức năng thận cần đối chiếu; Có kết quả siêu âm tim để bác sĩ xem | ai | kết quả đã có, không sinh chỉ định |
| `huong_dieu_tri` | Tiếp tục điều trị và theo dõi cân nặng theo hướng dẫn của bác sĩ | ai | |
| `loi_dan` | Theo dõi khó thở, phù và cân nặng hằng ngày | ai | |
| `hen_tai_kham` / ngày | Có / + 14 ngày | ai | |
| **Danh sách thiếu** | **Thuốc đang dùng**, Chẩn đoán ra viện | – | `missing_fields` trong file là `[]` vì đó là trạng thái sau bổ sung |

### Bước của bác sĩ giữa hai giai đoạn
Bác sĩ sửa tay `loi_dan` thành "Theo dõi khó thở, phù và cân nặng hằng ngày; đến viện ngay khi khó thở tăng". Sau đó duyệt phần Điều trị.

### Giai đoạn B: thêm `recovery_dictation`
Lời đọc: "Thuốc đang dùng: Bisoprolol 2,5 mg, mỗi ngày một lần; Furosemide 40 mg, buổi sáng."

| Kiểm tra | Mong đợi |
|---|---|
| Hiện đề xuất, chưa áp dụng | Bảng đề xuất có 2 thay đổi: chọn "NB có thuốc đang dùng", thêm 2 dòng thuốc. Phiếu chưa đổi cho đến khi bác sĩ bấm áp dụng |
| Giá trị thuốc | Bisoprolol · **2,5 mg** (giữ dấu phẩy) · mỗi ngày một lần; Furosemide · 40 mg · buổi sáng |
| Bảo toàn chỗ đã sửa | `loi_dan` giữ nguyên câu bác sĩ đã sửa. Phần Điều trị đã duyệt vẫn ở trạng thái đã duyệt |
| Không đè trường khác | Các trường không có trong lời đọc bổ sung không xuất hiện trong bảng đề xuất |
| Danh sách thiếu sau khi áp dụng | còn: Chẩn đoán ra viện |
| Bỏ một đề xuất | Bác sĩ chỉ áp dụng Bisoprolol. Phiếu có 1 thuốc, đề xuất còn lại bị bỏ, không tự quay lại |

**Bản in mong đợi:** Thuốc đang dùng 1 hoặc 2 dòng theo lựa chọn của bác sĩ. Lời dặn là câu đã sửa.

---

## Ghi chú khi chạy qua micro (Đợt 2)

Đọc to `conversation_text` của ba ca. Các thuật ngữ dễ nhận dạng sai, ưu tiên thêm vào hotwords và bảng sửa chữ: "T1, T2", "rung miu", "tĩnh mạch cổ", "Atorvastatin", "Amlodipine", "Bisoprolol", "Furosemide", "SpO2", "mi li mét thủy ngân", "2,5 mg". Ghi lỗi thực tế vào `docs/testing/`.
