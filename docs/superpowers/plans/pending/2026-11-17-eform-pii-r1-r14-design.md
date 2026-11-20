# Thiết kế: eForm dùng bộ che PII R1–R14

Ngày 17/11/2026. Chỉ dùng dữ liệu giả.

## Bối cảnh

Sơ đồ `docs/so-do/luong-chinh.drawio` (trang "Phần chung") vẽ bước lọc dữ liệu nhạy cảm theo bộ rule `pii-auto-1` (R1–R14). Hiện bộ này mới chạy ở `/demo-luong`. eForm `/` vẫn dùng bộ lọc cũ:

- Bộ lọc là `redactTranscript`, phiên bản `local-review-2`, gồm các regex trong `src/shared/clinical/privacy.ts`. Bộ này chạy hai lần:
  - trên trình duyệt, mỗi lần gõ hoặc khi có câu STT mới;
  - trên máy chủ, ở bước `prepare` và `approve`.
- Bác sĩ phải sửa bản đã che, tích ô "Tôi đồng ý xử lý…" rồi bấm duyệt thì mới có ticket.
- Hệ thống không có chốt chặn R11, không lấy cờ đồng ý từ hồ sơ (R14) và không ghi nhật ký R13.

Việc cần làm: thay phần lọc của eForm bằng đúng chuỗi trên sơ đồ. Nền móng ticket, binding, phiên ghi âm và bản chép lời bất biến thì giữ nguyên.

## Quyết định

| # | Quyết định | Lý do |
| --- | --- | --- |
| D1 | Máy chủ che bằng `redactPii` (R1–R8, nhãn R10), rồi chạy `checkResidualPii` (R11). Cờ đồng ý lấy từ `patients.json › dong_y_xu_ly_ai` (R14). Mỗi lượt ghi một dòng nhật ký R13 vào `data/clinical/audit/<encounter_id>.ndjson`. | Khớp sơ đồ. Dùng lại module `src/shared/clinical/pii/` đã có test. |
| D2 | **Bỏ bước bác sĩ duyệt thủ công và ô tích đồng ý trước AI.** Gộp `prepare` + `approve` thành một hành động `check`. Qua R11 thì ticket ở trạng thái `passed` ngay. Bị chặn thì không cấp ticket và trả lý do theo mã rule. | Sơ đồ không có bước duyệt tay. Bản đã qua R11 được xếp cấp `deidentified` (`docs/DATA-USE-POLICY.md`). **Đây là thay đổi chính sách, cần người dùng xác nhận trước khi làm.** |
| D3 | Ô "Nội dung buổi khám" giữ **bản thô** (chỉ trong bộ nhớ trình duyệt, không ghi đĩa). Trình duyệt không che cục bộ nữa. Khi R11 chặn, bác sĩ sửa ngay trong ô rồi bấm lại. | Bác sĩ cần thấy chữ gốc mới sửa được chỗ bị chặn. Máy chủ vẫn là nơi duy nhất quyết định bản gửi AI. |
| D4 | Sau khi chạy, hiện **bản đã che dạng chỉ đọc**, tô các nhãn che, kèm số mục che theo rule, dòng "Đồng ý AI: ✓/✗" và cảnh báo bệnh hiếm như hiện nay. | Bác sĩ vẫn nhìn thấy đúng nội dung gửi AI (R12), nhưng không phải duyệt. |
| D5 | Danh sách định danh đã biết (R1) gồm: <ul><li>định danh trong ngữ cảnh lượt khám (`ca`): tên bệnh nhân, PID, mã khám, tài khoản, bác sĩ;</li><li>định danh của bệnh nhân trong `data/clinic/patients.json`: SĐT, địa chỉ, nơi làm việc, người nhà;</li><li>tên bác sĩ trong danh bạ.</li></ul> Không có bệnh nhân trong fixture thì chỉ dùng phần `ca` và coi như **chưa đồng ý**. | Danh sách R1 càng đủ thì R1 che được càng nhiều và R11a bắt được càng nhiều. Mặc định an toàn cho R14 là "chưa đồng ý". |
| D6 | Danh mục cho phép của R11(c) dùng chung một hàm `clinicalAllowlist()` cho cả hai trang, gồm thuật ngữ, tên thuốc, tên dịch vụ. | Tránh hai danh sách lệch nhau. |
| D7 | Bước trích xuất gọi `extractClinical` kèm `deidentification` do máy chủ dựng từ ticket. Provider cố định là `"mock"` vì chưa có adapter AI ngoài. | Mã hiện tại vốn chỉ chạy bộ tách trên máy. Ghi provider đúng thực tế. |
| D8 | Xóa `redactTranscript` và `PRIVACY_POLICY_VERSION` (`local-review-2`). Giữ `privacyReviewRisks`. | Sau thay đổi không còn ai gọi hai thứ này (YAGNI). |

## Ngoài phạm vi

- Nối AI bên ngoài thật. Nhánh R14 "đã đồng ý" vẫn chạy bộ tách trên máy.
- Sửa `/demo-luong`, chỉ dời code dùng chung.
- Áp lại bảng sửa chữ giọng nói (`config/sua-chu-giong-noi.json`).
- Mở viết tắt trước khi tách nội dung.

## Rủi ro

- Che tự động không chứng minh ẩn danh tuyệt đối. R2 và R11(c) dựa vào từ điển họ, nên tên đứng một mình có thể lọt. Tuổi, giới, thời điểm và bệnh hiếm ghép lại vẫn có thể nhận ra người bệnh.
- Bỏ duyệt tay nghĩa là không còn người chặn lỗi trước AI. Lớp bảo vệ còn lại là R11 và việc bác sĩ duyệt phiếu sau cùng.
- Nhật ký R13 chỉ là file ndjson trong `data/clinical/` (đã gitignore), chưa phải hệ thống nhật ký bền vững.
