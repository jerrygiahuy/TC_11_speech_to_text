# Ghi chú brainstorming: lượt khám có nhiều phiên ghi âm

Ngày: 2026-11-14 (Asia/Saigon).
Trạng thái: ghi lại quyết định trong trao đổi; chưa phải thiết kế kỹ thuật được duyệt hoặc yêu cầu triển khai.

## Nhu cầu và các quyết định đã chốt

- Bệnh viện cấp mã khám trước khi khám và lưu trên hệ thống. Bệnh nhân đi xét nghiệm ở đâu và quay lại vẫn dùng mã khám đó.
- Một lượt khám có một hồ sơ chung và nhiều phiên ghi âm riêng, có thể cách nhau 1–3 tiếng khi bệnh nhân đi xét nghiệm hoặc chụp chiếu.
- Trong lúc chờ, bác sĩ có thể khám bệnh nhân khác bằng lượt khám và các phiên ghi âm riêng; lượt trước chưa cần hoàn tất.
- Bác sĩ có thể duyệt, lưu phiếu khám ban đầu và chỉ định trước, rồi bổ sung kết luận và hướng điều trị khi bệnh nhân quay lại cùng lượt khám.
- Người dùng đã chọn hướng 1: AI đề xuất cập nhật hồ sơ theo từng phiên. Giữ phần đã duyệt; thay đổi vào phần đó cần bác sĩ duyệt riêng, có lịch sử và nguồn theo phiên.
- Đã cân nhắc hướng tạo lại toàn bộ bản nháp từ tất cả phiên nhưng không chọn: khó bảo toàn chỉnh sửa đã duyệt và dễ đề xuất lại chỉ định cũ.

## Nguyên tắc đã đề xuất để đưa vào thiết kế

- Tách trạng thái lượt khám, trạng thái ghi âm và việc duyệt từng phần; dừng ghi âm hoặc duyệt chỉ định không tự hoàn tất lượt khám.
- Gắn cố định mỗi phiên ghi âm với lượt khám từ khi bắt đầu. Kết quả STT/AI trả về muộn phải về lượt gốc, kể cả khi bác sĩ đã chuyển bệnh nhân.
- Dừng và lưu phiên đang ghi trước khi bắt đầu ghi cho bệnh nhân khác. Một thiết bị chỉ ghi cho một lượt tại một thời điểm.
- Lưu từng phiên riêng và trình bày hồ sơ chung; bảo toàn nhận định ban đầu, kết luận sau xét nghiệm và nội dung bác sĩ đã duyệt.
- Không tạo lại chỉ định đã duyệt chỉ vì hội thoại mới nhắc lại.
- Cần lưu bền vững để có thể mở lại lượt đang chờ sau khi đóng hoặc tải lại trang.

Các chi tiết giao diện, mô hình dữ liệu, đồng bộ và xử lý lỗi cần được thiết kế tiếp; chưa có thay đổi mã sản phẩm trong phiên trao đổi này.

## Kết quả cận lâm sàng: giữ nguyên luồng hiện tại

Người dùng xác nhận kết quả xét nghiệm/chụp chiếu được trả về phần mềm phòng khám dưới dạng liên kết hoặc kết luận ngắn. Khi muốn xem chi tiết, bác sĩ cần xem trên hệ thống khác.

Yêu cầu hiện tại: giữ nguyên luồng này; không mở rộng phạm vi tính năng nhiều phiên ghi âm sang cải tiến việc xem kết quả chi tiết.

## Chủ đề dành cho một phiên brainstorming khác

Mong muốn của người dùng: bác sĩ tập trung làm việc trong một ứng dụng, kể cả khi cần xem chi tiết kết quả xét nghiệm/chụp chiếu.

Đây là chủ đề đã hoãn, chưa chọn giải pháp và chưa được yêu cầu triển khai. Khi bàn lại, cần tìm hiểu khả năng tích hợp của các hệ thống nguồn, quyền truy cập và cách xem chi tiết trong ứng dụng. Không mặc định rằng liên kết hiện tại có thể nhúng hoặc toàn bộ dữ liệu chi tiết đã sẵn có.
