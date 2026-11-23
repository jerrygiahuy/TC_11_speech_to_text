# Kiểm tra trước khi đưa nội dung lên GitHub

Thực hiện trước mỗi lần push, tải file, mở issue, viết bình luận hoặc đăng bản phát hành. Checklist này là bước kiểm tra của con người, không phải cơ chế tự động ngăn tải dữ liệu lên.

## Nội dung

- [ ] Chỉ có nội dung đã được phép đưa lên; phần chưa rõ đã được giữ lại để hỏi người phụ trách qua kênh nội bộ.
- [ ] Không có tên đơn vị, logo, thông tin nhận diện tổ chức, dữ liệu thật, tài liệu hoặc nghiệp vụ nội bộ chưa được phép chia sẻ.
- [ ] Đã kiểm tra tên repo, tên file, tên biến/hàm, comment, cấu hình, prompt và system prompt.
- [ ] Đã xem trực tiếp ảnh, tài liệu đính kèm, notebook output và dữ liệu mẫu; không chỉ tìm từ khóa trong file văn bản.
- [ ] Không có mật khẩu, token, khóa truy cập, chuỗi kết nối hoặc địa chỉ hệ thống nội bộ.
- [ ] Các ví dụ dùng dữ liệu giả tạo mới, giá trị cấu hình giả và địa chỉ mẫu.

## File và lịch sử Git

- [ ] Đã xem danh sách file bằng `git status` và rà soát thay đổi sẽ đưa lên, gồm cả file mới.
- [ ] Đã kiểm tra các commit chưa push, thông điệp commit và thông tin tác giả.
- [ ] Nếu đưa code từ nguồn khác vào, đã rà soát mọi branch, tag và lịch sử sẽ được tải lên; không dùng mirror hoặc force push một cách mặc định.
- [ ] File `.env`, khóa, log và dữ liệu cục bộ không nằm trong nội dung được Git theo dõi. Không coi `.gitignore` là bằng chứng lịch sử đã sạch.
- [ ] Đã dùng công cụ quét tại máy hoặc môi trường được phép nếu có, đồng thời rà soát thủ công. Kết quả không phát hiện không chứng minh nội dung an toàn tuyệt đối.

## Đích tải lên và người kiểm tra

- [ ] Đã kiểm tra `git remote -v` và đúng repo theo mã nhóm.
- [ ] Repo ở trạng thái **Private** và chỉ người được phân công có quyền truy cập.
- [ ] Nội dung đã được người phụ trách duyệt theo quy trình của nhóm trước khi tải lên. Review pull request sau push không thay thế bước này.
- [ ] Ghi nhận người kiểm tra, thời điểm và phiên bản đã duyệt trên kênh nội bộ được phép.

## Nếu phát hiện đã tải nhầm

Dừng tải thêm, báo người quản trị qua kênh nội bộ và phối hợp xử lý. Không dán lại nội dung nhạy cảm vào issue hoặc bình luận. Thu hồi hoặc thay khóa đã lộ; xóa file ở phiên bản hiện tại chưa đủ để xóa lịch sử và các bản sao.
