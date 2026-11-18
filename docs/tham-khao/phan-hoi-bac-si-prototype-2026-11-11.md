# Phản hồi của bác sĩ sau khi xem prototype – 11/11/2026

Ghi lại từ sổ tay của tác giả (học viên thực tập), đã làm sạch: không có tên bác sĩ hay thông tin bệnh nhân. Bác sĩ TMH xem trang eForm có cột Trợ lý AI, rồi nhận xét miệng.

## Bác sĩ nói gì (chép gần nguyên văn)

> Bác sĩ thì chỉ cần chuyển voice to text thôi, làm cái đấy cho tốt thì là được. Hoặc là hệ thống thông minh hơn nữa thì có thể nó phải ghi âm cái cuộc trò chuyện của bác sĩ, từ đó nó điền hộ thông tin. Còn cái kê đơn hay là dịch vụ chỉ định thì không phải ca nào cũng có cái đó. Kê đơn thì bác sĩ hỏi là nó có cá nhân hóa không, vì mỗi bác sĩ sẽ có thói quen kê đơn khác nhau.

## Tách thành ý

| # | Ý | Đã làm gì |
|---|---|---|
| 1 | Chuyển giọng nói thành chữ cho tốt là đủ dùng | Đo độ chính xác nhận dạng (`npm run eval-giong-noi`) và thêm bước sửa chữ sau nhận dạng (`config/sua-chu-giong-noi.json`). Xem `docs/CHANGELOG.md` ngày 2026-11-11 |
| 2 | Mức cao hơn: ghi âm cả cuộc trò chuyện bác sĩ – bệnh nhân rồi tự điền | Chưa làm. Cần sự đồng ý của bệnh nhân, tách người nói, lọc tiếng ồn phòng khám; chạm quy định bảo mật nên để sau khi được duyệt |
| 3 | Không phải ca nào cũng có kê đơn, chỉ định | Chưa đổi giao diện (chủ dự án quyết định không làm) |
| 4 | Kê đơn nên cá nhân hóa theo thói quen từng bác sĩ | Gợi ý "Đơn anh/chị đã kê" theo mã ICD10 chính, học từ các lần bác sĩ bấm Lưu |
| 5 | AI hỗ trợ chẩn đoán để đỡ bỏ sót bệnh (ý kiến thêm, ghi lại sau buổi xem, không có nguyên văn) | Chưa làm. Đề xuất bản hẹp "cờ đỏ", xem mục dưới |

## Ý 5: hỗ trợ chẩn đoán để đỡ bỏ sót

Chưa nên làm dạng "AI gợi ý chẩn đoán":

- **Rủi ro khác phần điền phiếu.** Điền phiếu sai thì bác sĩ thấy và sửa. Gợi ý chẩn đoán là hỗ trợ quyết định lâm sàng: gợi ý sai dẫn bác sĩ đi sai hướng, còn thiếu gợi ý thì dễ tạo cảm giác "AI không báo nên chắc không có gì". Cần bệnh viện duyệt và có bằng chứng mới dùng thật được.
- **Chưa biết thực tế bỏ sót bệnh gì, bao lâu một lần.** Phần lớn ca TMH ngoại trú là bệnh hay gặp. "Đỡ bỏ sót" mới là ý kiến chung, chưa phải việc đã xảy ra.
- **Báo nhiều quá thì bị bỏ qua.** Ca nào cũng liệt kê vài bệnh có thể có thì sau vài ngày bác sĩ không đọc nữa.

Đề xuất bản hẹp: **cờ đỏ, cân nhắc loại trừ.** Không đoán bệnh; chỉ nhắc khi nội dung phiếu có dấu hiệu nguy hiểm, mỗi cờ có lý do và nguồn. Chạy bằng rule như phần gợi ý ICD10 hiện có, không cần LLM. Ví dụ để hỏi bác sĩ (**chưa được bác sĩ xác nhận, không phải hướng dẫn lâm sàng**):

- Khàn tiếng kéo dài trên 3 tuần → nhắc soi thanh quản.
- Ù tai một bên kèm nghẹt mũi một bên → nhắc khám vòm.
- Nghe kém đột ngột → nhắc đây là ca cần xử trí sớm.

Danh sách cờ phải do bác sĩ đưa và duyệt, không tự soạn nội dung lâm sàng.

## Cần hỏi thêm (kiểu Mom Test)

- Lần gần nhất anh/chị gõ phiếu, phần nào mất thời gian nhất: gõ chữ, chọn mã ICD hay tìm thuốc? Nếu là gõ chữ thì ý 1 đúng là trọng tâm. Nếu là chọn mã hay tìm thuốc thì phần AI điền vẫn có giá trị.
- Với một chẩn đoán hay gặp, anh/chị có kê gần như giống hệt mỗi lần không? Khác nhau ở chỗ nào (thuốc, liều, số ngày)?
- Anh/chị đã từng dùng phần mềm đọc chính tả nào chưa? Bỏ dùng vì sao?
- Lần gần nhất anh/chị hoặc đồng nghiệp bỏ sót một bệnh là ca gì? Phát hiện ra lúc nào, nhờ đâu?
- Hiện khoa có cách nào nhắc dấu hiệu nguy hiểm không (checklist, kinh nghiệm truyền miệng)?
- Nếu máy nhắc một câu khi thấy dấu hiệu nguy hiểm, mỗi buổi khám nhắc tối đa bao nhiêu lần thì anh/chị vẫn chịu đọc?
