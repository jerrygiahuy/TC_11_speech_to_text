# Tài liệu tham khảo – quan sát thực địa khoa TMH

Lấy từ Claude Project "Vinmec" ngày 10/11/2026. Đây là nguồn gốc của các yêu cầu trong prototype: đọc khi cần biết bác sĩ thực sự nhập gì, mất bao lâu, vướng ở đâu.

| File | Nội dung | Thời gian quan sát | Dùng cho phần nào của app |
|---|---|---|---|
| [nhat-ky-day-du-tmh.md](nhat-ky-day-du-tmh.md) | Nhật ký chi tiết theo ngày tại phòng khám TMH: dòng thời gian từng ca, thao tác BS/ĐD, bản nộp 6 mục mỗi ngày | 29/10–05/11/2026 | Số liệu thời gian nhập liệu, các trường BS hay sửa (Phiếu khám) |
| [nhat-ky-day-du-tmh-tuan-2.md](nhat-ky-day-du-tmh-tuan-2.md) | Nhật ký tuần 2, ý tưởng gợi ý chỉ định và đơn thuốc theo chẩn đoán, trường liều theo dạng thuốc | 09/11/2026 | Chỉ định, Kê đơn, trang `/eform` |
| [nhat-ky-quay-tiep-don-tmh.md](nhat-ky-quay-tiep-don-tmh.md) | Quầy tiếp đón: dòng thời gian, luồng tiếp đón, cấu trúc 2 form giấy, điểm nghẽn | Buổi sáng, ghi 30/10/2026 (ngày cần xác nhận) | Thông tin hành chính (`config/forms/hanh-chinh.json`) |
| [bao-cao-tuan-1-phan-1-2.md](bao-cao-tuan-1-phan-1-2.md) | Báo cáo tuần 1: nhật ký quan sát lâm sàng và ghi chép phỏng vấn, kèm câu hỏi bổ sung kiểu Mom Test | 29/10–04/11/2026 | Bối cảnh người dùng, câu hỏi cần hỏi bác sĩ |
| [phan-hoi-bac-si-prototype-2026-11-11.md](phan-hoi-bac-si-prototype-2026-11-11.md) | Nhận xét của bác sĩ TMH sau khi xem prototype: voice-to-text là chính, ghi âm hội thoại, kê đơn cá nhân hóa, hỗ trợ chẩn đoán để đỡ bỏ sót (đề xuất cờ đỏ); câu hỏi cần hỏi thêm | 11/11/2026 | Nhận dạng giọng nói, gợi ý "Đơn anh/chị đã kê" |
| [bao-hiem-thanh-toan-co-dieu-kien-2026-11-11.md](bao-hiem-thanh-toan-co-dieu-kien-2026-11-11.md) | Bác sĩ hỏi về phần bảo hiểm: không biết dịch vụ nào bên nào trả, trả bao nhiêu, muốn loại bảo hiểm hiện ra. Tra cứu "thanh toán BHYT có điều kiện" (TT 37/2024, TT 39/2024), các nguồn trả ở Vinmec, giả thuyết chỗ vướng, câu hỏi cần hỏi | 11/11/2026 | Chưa dùng; ứng viên cho nhãn BHYT ở Chỉ định và Kê đơn |
| [bao-cao-tuan-1-phan-4.md](bao-cao-tuan-1-phan-4.md) | Ma trận điểm nghẽn: tần suất, mức tác động, cách khoa đang xử lý tạm, trọng tâm được chọn | 29/10–03/11/2026 | Lý do chọn bài toán kê đơn và chỉ định |

Các tài liệu đã làm sạch nằm ngay trong `docs/`: [tong-hop-quan-sat-tmh.md](../tong-hop-quan-sat-tmh.md) (bản tóm tắt) và ba file `cau-truc-*.md` (cấu trúc màn hình EMR).

## Lưu ý dữ liệu

- Bản ở đây đã làm sạch: tên tác giả thay bằng "tác giả (học viên thực tập)", quốc tịch cụ thể của bệnh nhân thay bằng "nước ngoài". Không có tên, PID hay số điện thoại bệnh nhân. Vẫn giữ tuổi ước lượng, giới tính và giờ khám vì cần cho số liệu thời gian.
- **Thông tin nhạy cảm để ở `temp-1/`** (đã gitignore, không lên repo). Bản gốc đầy đủ của Claude Project nằm ở `temp-1/vinmec-project/`, gồm cả `context-thuc-tap-vinmec.md` (hồ sơ cá nhân) và file xuất `vinmec-project-docs.json`.
- Không thêm chi tiết nào khiến nhận ra được người bệnh hay nhân viên. Bản trên Claude Project vẫn là bản gốc: sửa một bên thì cập nhật bên kia và ghi vào `docs/CHANGELOG.md`.
