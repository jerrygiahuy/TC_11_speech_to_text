# Kho lưu cục bộ TC_11

Khởi chạy ứng dụng từ Git root của worktree TC_11. Các đường dẫn mặc định của Next.js lấy thư mục chạy làm gốc, vì vậy mỗi checkout có kho JSON cục bộ riêng.

| Dữ liệu | Đường dẫn trong checkout |
|---|---|
| Phiếu và lịch sử phiên bản | `data/clinical/encounters/` |
| Ngữ cảnh lượt phát sinh, bản chép đã duyệt, khóa ghi âm và nhật ký | `data/clinical/` |
| Phiếu demo và phiên thử | `data/demo-luong/` và `data/sessions/` |
| Tùy chọn bác sĩ | `data/thoi-quen/` |
| Hồ sơ giọng nói | `data/giong-bac-si/` mặc định. Kiểm tra `VOICE_PROFILE_DIR` khi chạy STT |
| Dữ liệu mẫu | `data/clinic/`, `data/eform/`, `data/demo-luong/kich-ban/` và `data/cardiology/` |

Chạy kiểm thử lưu trữ với dữ liệu mock. Mở một lượt khám, lưu phiếu, ghi lại mã lượt, khởi động lại ứng dụng từ cùng worktree rồi mở lại phiếu. Kiểm tra tệp đầu ra nằm trong worktree và đối chiếu nội dung vừa lưu. Dùng cổng riêng nếu bản TMH đang chạy cùng lúc.

## Điểm nối Phiếu khám ngoại trú

- `config/forms/phieu-kham.json`, `config/clinical/` và `src/server/ai/prompt.ts` xác định trường và hướng dẫn trích xuất.
- `src/server/clinical/extraction.ts` là đường trích xuất lâm sàng cần đối chiếu với cấu hình AI.
- `src/shared/eform/dien-phieu.ts`, `src/client/eform/EformForm.tsx` và `src/client/eform/BanIn.tsx` chuyển bản nháp thành nội dung phiếu và bản in.
- `src/server/du-lieu/eform.ts` chọn ca mặc định. `src/server/du-lieu/config.ts` đọc ca mẫu. Chốt fixture sau khi nhận bảng ánh xạ và ca chuẩn.
