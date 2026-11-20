# Nghiệm thu Phiếu khám ngoại trú TC_11

Bảng ánh xạ và kỳ vọng chi tiết nằm trong bản bàn giao Claude tại `handoff/claude/02-bang-anh-xa.md` và `04-ca-kiem-thu.md` trong checkout TC_11 gốc.

| Ca mock | Kiểm tra ưu tiên |
|---|---|
| SYN-CARDIO-013 | Khám mới. Không chuyển bệnh nền trong tiền sử thành chẩn đoán kèm. Không tạo dòng chỉ định khi chưa có tên dịch vụ. |
| SYN-CARDIO-001 | Tái khám. Tách kết quả xét nghiệm hoặc điện tâm đồ đã có khỏi chỉ định mới. Kiểm tra hẹn tái khám từ ngày lượt khám của fixture. |
| SYN-CARDIO-039 | Đọc bổ sung. Giữ liều dạng thập phân, hiển thị từng đề xuất thay đổi và bảo toàn nội dung bác sĩ đã sửa. |

Mỗi ca cần kiểm tra qua đầu ra AI, eForm, phiên bản đã duyệt, bản lưu đọc lại và bản in. Cả ba ca giữ chẩn đoán ra viện trống nếu nguồn chỉ có chẩn đoán ban đầu. Sinh hiệu lấy từ fixture lượt khám. Trường Khám tim mạch, hô hấp hiển thị riêng với Khám chuyên khoa. Quy tắc bắt buộc khi duyệt và cách hiểu “chưa ghi nhận” chờ bác sĩ xác nhận.
