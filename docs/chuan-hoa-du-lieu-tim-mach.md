# Chuẩn hóa dữ liệu giả lập ngoại trú Tim mạch

## Kết luận phạm vi

Bộ dữ liệu phiên bản 1.0.0 phục vụ thử nghiệm ghi hội thoại thành bản nháp phiếu khám ngoại trú Tim mạch. Dữ liệu gồm 60 tình huống tổng hợp và không chứa thông tin người bệnh từ ảnh hoặc báo cáo khảo sát.

Nguồn đặc tả cho thấy các khối đã xuất hiện trên màn hình gồm thuốc đang dùng, khám toàn thân, khám chuyên khoa, khám tim mạch và hô hấp, chẩn đoán, kết quả cận lâm sàng, điều trị, lời dặn, tái khám và trạng thái lượt khám. Lý do khám, bệnh sử, tiền sử, sinh hiệu dạng số, chi tiết thuốc và audit đầy đủ vẫn là đề xuất cần xác nhận.

## Nguyên tắc chuẩn hóa

1. Mỗi tình huống có mã `SYN-CARDIO-NNN` và cờ `synthetic=true`.
2. Không dùng PID, họ tên, ngày sinh, số lượt khám hoặc ngày khám thật.
3. Trường lồng nhau giữ cấu trúc lâm sàng. CSV chỉ là bản phẳng phục vụ rà soát.
4. Chẩn đoán gồm mã và diễn giải. Mã có thể để `null` nếu hội thoại chỉ nêu nhận định chưa xác định.
5. Thuốc đang dùng được tách khỏi hướng điều trị. Dataset không tự tạo đơn thuốc mới.
6. Kết quả cận lâm sàng được chia thành `lab`, `imaging` và `paraclinical` theo cấu trúc màn hình.
7. Trạng thái ghi âm phản ánh ba tình huống thử nghiệm.
   - `COMPLETE` có đủ nội dung của tình huống.
   - `MISSING` thiếu một trường và ghi đường dẫn trong `missing_fields`.
   - `RECOVERED` có phần thiếu trong transcript đầu, sau đó bổ sung bằng `recovery_dictation`.
8. `draft_note`, `reviewed_note`, `review_time_seconds` và `error_tags` là dữ liệu đo. Chúng được để trống trước khi chạy prototype.

## Mapping với phiếu ngoại trú

| Khối chuẩn hóa | Khối trên phiếu | Mức xác minh |
|---|---|---|
| `current_medications` | Người bệnh có hoặc không có thuốc đang dùng | Cờ đã thấy, chi tiết đề xuất |
| `exam.general` | Khám toàn thân | Đã thấy |
| `exam.specialty` | Khám chuyên khoa | Đã thấy |
| `exam.cardio_respiratory` | Khám tim mạch, hô hấp | Đã thấy |
| `exam.other_organs` | Khám các bộ phận khác | Đã thấy |
| `diagnoses.initial` | Chẩn đoán ban đầu | Đã thấy |
| `diagnoses.discharge` | Chẩn đoán ra viện | Đã thấy, cần xác nhận ý nghĩa nghiệp vụ ngoại trú |
| `diagnoses.secondary` | Chẩn đoán kèm theo | Đã thấy |
| `result_summaries` | Xét nghiệm, chẩn đoán hình ảnh, cận lâm sàng | Đã thấy cấu trúc khối |
| `treatment.plan` | Hướng điều trị | Đã thấy |
| `treatment.advice_followup` | Lời dặn và theo dõi | Đã thấy |
| `treatment.followup_scheduled` | Hẹn tái khám | Đã thấy |
| `chief_complaint`, `history_present_illness`, `past_history`, `family_history` | Lý do khám, bệnh sử, tiền sử | Đề xuất, chưa có ảnh nguồn |
| `vital_signs` | Sinh hiệu | Đề xuất, chưa có ảnh nguồn |

## Thành phần chưa được coi là dữ liệu chuẩn EMR

- Tên bảng và cột DB thật của Vinmec.
- Field bắt buộc, giá trị mặc định và quyền nhập chính thức.
- Ý nghĩa chính xác của chẩn đoán ra viện trong lượt ngoại trú.
- Cách MUSE, OMRON, LIS, PACS và OH liên kết với phiếu.
- Cấu trúc đơn thuốc và chỉ định dịch vụ vì chúng nằm ngoài phạm vi phiếu được quan sát.
- Danh mục ICD-10 và danh mục dịch vụ chính thức dành cho Trung tâm Tim mạch.

Các thành phần trên cần xác nhận với bác sĩ và IT trước khi mapping sang hệ thống vận hành.

## Tiêu chí nghiệm thu dataset

- Có đúng 60 mã duy nhất.
- Mỗi trạng thái `COMPLETE`, `MISSING`, `RECOVERED` có 20 bản ghi.
- Lượt khám mới và tái khám có 30 bản ghi mỗi loại.
- Huyết áp tâm thu lớn hơn tâm trương và các sinh hiệu nằm trong khoảng của schema đề xuất.
- Ca `MISSING` có đúng một đường dẫn thiếu.
- Ca `RECOVERED` có lời đọc bổ sung và không còn trường trong `missing_fields`.
- Mọi trường đo kết quả thử nghiệm vẫn để trống.
- Không có thông tin định danh nhìn thấy trong ảnh nguồn.

## Đầu vào còn cần từ khoa và IT

1. Mẫu phiếu hoặc ảnh phần lý do khám, bệnh sử và tiền sử.
2. Màn hình hoặc hợp đồng dữ liệu sinh hiệu.
3. Danh sách trường bắt buộc và trường in trên báo cáo y tế.
4. Danh mục ICD-10, dịch vụ và thuốc được phép dùng trong môi trường dev.
5. Cấu trúc DB đã thống nhất giữa nhóm và đơn vị kỹ thuật.
6. Một bộ 5–10 tình huống giả lập được bác sĩ rà soát để hiệu chỉnh nội dung trước khi dùng làm ground truth.
