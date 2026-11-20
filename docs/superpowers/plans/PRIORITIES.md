# Thứ tự ưu tiên triển khai

Cập nhật: 14/11/2026.

Mục tiêu điều phối: hoàn thiện prototype theo quy trình khám. Hiện có **4 plan pending**, mỗi plan có một tài liệu thiết kế đi kèm. Trạng thái gốc được quản lý tại [pending/README.md](pending/README.md).

Tài liệu này ghi nhận thứ tự đề xuất, không đánh dấu bắt đầu triển khai hoặc thay thế bước duyệt thiết kế/plan còn chờ.

## Thứ tự ưu tiên

| Ưu tiên | Plan | Kết quả cần đạt | Phụ thuộc chính |
| --- | --- | --- | --- |
| 1 | [Một lượt khám, nhiều phiên ghi âm](pending/2026-11-14-interrupted-encounters.md) | Mở đúng hồ sơ, chuyển bệnh nhân an toàn, tiếp tục ghi âm và giữ lịch sử nội dung đã duyệt | Duyệt thiết kế/plan trước khi sửa mã sản phẩm |
| 2 | [Dashboard lịch khám và thông tin bệnh nhân](pending/2026-11-14-dashboard-patient.md) | Xem lịch → chọn bệnh nhân → mở/tiếp tục phiếu → xem lịch sử | Contracts/context thống nhất; phần tạo/tiếp tục phiếu cần nền tảng ưu tiên 1 đã nghiệm thu |
| 3 | [WER CLI cho micro và file audio](pending/2026-11-13-wer-cli.md) | Đo WER/CER tái lập được, so sánh bật/tắt lọc nhiễu trên cùng audio | Runtime STT local và dữ liệu tham chiếu; kiểm chứng micro thật cần người dùng tham gia |
| 4 | [Màn demo luồng dữ liệu và che PII tự động](pending/2026-11-16-demo-luong-du-lieu.md) | Trang `/demo-luong` chạy trọn ghi âm → che PII → AI mock → phiếu nhiều phiên. Đã triển khai Task 1–8 (17/11), còn thử micro thật | STT local cho nguồn micro/WAV; kịch bản mẫu chạy không cần STT |

## Các chặng điều phối

### Chặng 1 — Nền tảng lượt khám nhiều phiên

Triển khai theo các task trong plan ưu tiên 1:

1. **Task 1–2:** schema/migration và định danh, mở lại đúng mã khám. Chốt contracts/context để dashboard dùng chung.
2. **Task 3–4:** duyệt theo từng phần, snapshot bất biến và vòng đời phiên ghi âm/lease giữa các tab.
3. **Task 5–6:** đề xuất thay đổi dùng chung UI/server; ràng buộc privacy, transcript và AI vào đúng lượt/phiên.
4. **Task 7–8:** giao diện chuyển lượt, microphone controller, bản in đúng version và nghiệm thu tích hợp.

**Mốc bàn giao:** kịch bản A ghi âm → chờ kết quả → chuyển sang B → quay lại A hoạt động đúng; không lẫn dữ liệu, mất nội dung đã duyệt hoặc tạo trùng hồ sơ. Lỗi dừng/flush/lưu phải được kiểm chứng theo plan.

### Chặng 2 — Dashboard và hồ sơ bệnh nhân

1. **Task 1–2:** dữ liệu lịch/bệnh nhân, cách tính thống kê, repository và API đọc có kiểm quyền.
2. **Task 3–5:** dashboard list/calendar, popup lịch hẹn, thông tin bệnh nhân và xem toàn bộ phiếu cũ.
3. **Task 6:** nối tạo/tiếp tục phiếu vào eform.
4. **Task 7:** nghiệm thu toàn luồng và bàn giao.

**Có thể triển khai sớm:** Task 1–5 theo hướng chỉ đọc, sau khi thống nhất actor/context fixture và contracts với chặng 1. Đây chưa phải kết quả hoàn tất toàn luồng.

**Điều kiện bắt buộc trước Task 6:** context/open-or-reuse, loader đúng bệnh nhân, privacy/AI gắn đúng context và bảo vệ khi rời/chuyển ca của plan nhiều phiên phải được nghiệm thu. Khi thiếu phụ thuộc, giữ thao tác tạo/tiếp tục chưa khả dụng trong preview.

**Mốc bàn giao:** thống kê và lịch cùng dữ liệu, lịch sử chỉ đọc, mở/tiếp tục đúng phiếu và không bỏ qua bảo vệ microphone/nội dung chưa lưu.

### Chặng 3 — Công cụ đo chất lượng STT

Triển khai theo thứ tự task của plan WER CLI:

1. Metric WER/CER và report đối chiếu.
2. Chuẩn hóa audio và thu micro một lần.
3. Runner batch/session với cấu hình được cô lập.
4. CLI, corpus và hướng dẫn sử dụng.
5. Kiểm chứng native và bàn giao.

**Mốc bàn giao:** so sánh hai chế độ trên cùng audio và cấu hình; report ghi rõ pipeline, hash, coverage và lỗi từng mode. Kiểm chứng micro thật phải có bằng chứng riêng, không thay bằng test giả lập.

## Khi nào đổi ưu tiên?

- Nếu mục tiêu gần nhất là **hoàn thiện prototype quy trình khám**, giữ thứ tự **nhiều phiên → dashboard → WER CLI**.
- Nếu cần **đánh giá độ chính xác STT trước buổi thử với bác sĩ**, đưa **WER CLI lên ưu tiên 1**, sau đó quay lại nhiều phiên → dashboard. WER CLI tương đối độc lập và không phải điều kiện kỹ thuật bắt buộc của hai plan còn lại.

## Theo dõi thực hiện

- Ghi người phụ trách, trạng thái và blocker khi giao việc; cập nhật trạng thái chính tại [danh sách pending](pending/README.md).
- Dùng checkbox trong từng plan để theo dõi chi tiết; chỉ đánh dấu đạt khi có bằng chứng kiểm thử/nghiệm thu.
- Chỉ chuyển plan và thiết kế ra khỏi `pending` sau khi đạt nghiệm thu, rồi cập nhật các liên kết trong tài liệu này.
- **Community-1:** đã triển khai một phần, còn kiểm chứng native/RAM; theo dõi như việc tồn đọng riêng, không tính thêm vào 3 plan pending.

| Plan | Người phụ trách | Trạng thái tại 14/11/2026 | Blocker cần theo dõi |
| --- | --- | --- | --- |
| Nhiều phiên ghi âm | Chưa phân công | Đang triển khai — Task 1–7 xong, còn Task 8 nghiệm thu | Kiểm chứng micro thật và kịch bản hai bệnh nhân |
| Dashboard và bệnh nhân | Chưa phân công | Đang triển khai (16/11/2026) — Task 1–6 xong, còn Task 7 nghiệm thu | Kiểm hai tab mở cùng lúc, rời eForm khi còn micro, mốc 12:00 |
| WER CLI | Chưa phân công | Pending — chưa triển khai | Xếp lịch kiểm chứng native/micro khi tới bước bàn giao |
