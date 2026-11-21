# Nghiệm thu Phiếu khám ngoại trú TC_11

Bảng ánh xạ và kỳ vọng chi tiết nằm trong `docs/task-2/field-mapping.md` và các file `data/cardiology/nghiem-thu/*.expected.json`.

| Ca mock | Kiểm tra ưu tiên |
|---|---|
| SYN-CARDIO-013 | Khám mới. Không chuyển bệnh nền trong tiền sử thành chẩn đoán kèm. Không tạo dòng chỉ định khi chưa có tên dịch vụ. |
| SYN-CARDIO-001 | Tái khám. Tách kết quả xét nghiệm hoặc điện tâm đồ đã có khỏi chỉ định mới. Kiểm tra hẹn tái khám từ ngày lượt khám của fixture. |
| SYN-CARDIO-039 | Đọc bổ sung. Giữ liều dạng thập phân, hiển thị từng đề xuất thay đổi và bảo toàn nội dung bác sĩ đã sửa. |

Mỗi ca cần kiểm tra qua đầu ra AI, eForm, phiên bản đã duyệt, bản lưu đọc lại và bản in. Cả ba ca giữ chẩn đoán ra viện trống nếu nguồn chỉ có chẩn đoán ban đầu. Sinh hiệu lấy từ fixture lượt khám. Trường Khám tim mạch, hô hấp hiển thị riêng với Khám chuyên khoa. Quy tắc bắt buộc khi duyệt và cách hiểu “chưa ghi nhận” chờ bác sĩ xác nhận.

## Nghiệm thu tự động 3 ca

Chạy: `npx tsx --conditions=react-server --test src/server/clinical/nghiem-thu-tim-mach.test.ts` (hoặc `npm test`). Mỗi ca chạy `conversation_text` (ca 039 giai đoạn B thêm `recovery_dictation`) qua mock, kiểm tra bằng chứng, rồi so từng ô của gói điền nháp với `data/cardiology/nghiem-thu/<mã ca>.expected.json`. Ô mong đợi trống phải bằng `""`; mọi ô AI điền ở trạng thái `xem`. Kết quả hiện tại: 3 ca PASS. Ca 013 đúng `04`: `de_cap = co_chi_dinh`, `items = []`, kèm mục `can_xem_lai` "nhắc chỉ định nhưng chưa nêu dịch vụ"; phiếu ở trạng thái này chưa duyệt được cho đến khi bác sĩ thêm dịch vụ hoặc đổi trạng thái.

