# Kịch bản thử với bác sĩ

Tài liệu cho một buổi thử Trợ lý AI điền phiếu với bác sĩ TMH. **Phần 1** in ra đưa bác sĩ đọc, **Phần 2** dành cho người điều phối buổi thử.

> **Chỉ dùng thông tin bịa.** Bác sĩ không nói tên, tuổi, PID hay bệnh sử của bệnh nhân thật, kể cả khi đang kể lại một ca quen.

---

## Phần 1. Cho bác sĩ

Phiếu trên màn hình là một bệnh nhân giả: **chị Nguyễn Thị Giả, 38 tuổi, dị ứng Penicillin**. Điều dưỡng đã nhập sẵn lý do khám và bệnh sử. Cột bên phải là **Trợ lý AI điền phiếu**.

Trợ lý có sẵn **39 phiếu mẫu theo bệnh** (viêm tai giữa cấp, viêm mũi xoang cấp, viêm họng cấp, chóng mặt tư thế…). Anh/chị chỉ cần gõ hoặc nói **tên mẫu**, có thể kèm vài chi tiết riêng của bệnh nhân. Phiếu khám, chỉ định và đơn thuốc sẽ được điền theo mẫu, sau đó anh/chị kiểm tra và sửa.

### Các bước

1. Gõ vào ô bên phải, hoặc bấm **🎤 Bắt đầu nói** rồi nói, ví dụ:
   - `mẫu viêm tai giữa cấp`
   - `vtg cấp, tai T, 3n, sốt 38,5`

   Gõ được 2 chữ đầu tên bệnh thì bên dưới hiện **Mẫu theo bệnh:** kèm vài tên để bấm chọn.
2. Bấm **✨ Điền vào phiếu**.
3. Kiểm tra cả ba tab **Phiếu khám**, **Chỉ định dịch vụ**, **Đơn thuốc**. Chỗ **tím** là điền theo mẫu, chỗ **vàng** là phải xem lại (ví dụ `[phải|trái|2 bên]` còn chưa chọn). Sửa như sửa phiếu bình thường. Chỗ vàng mà đã đúng thì bấm **✓ Đúng**.
4. Thấy phiếu ổn thì bấm **Lưu**. **Tải lại trang (F5)** trước khi sang kịch bản sau.

Mẫu **chỉ điền vào ô còn trống**: ô đã có chữ (điều dưỡng nhập, anh/chị đã gõ) được giữ nguyên. Muốn bỏ lần vừa điền thì bấm **↶ Hoàn tác lần AI điền**.

### Kịch bản

- **M1. Chỉ gõ tên mẫu.** Một bệnh anh/chị hay gặp nhất, ví dụ `mẫu viêm họng cấp`. Sau đó sửa phiếu cho khớp một bệnh nhân anh/chị tự nghĩ ra.
- **M2. Tên mẫu kèm 2–3 chi tiết.** Ví dụ `vtg cấp, tai P, 2n, sốt 39`, hoặc theo cách anh/chị vẫn gõ tắt.
- **M3. Nói thay vì gõ.** Bấm 🎤, nói "mẫu viêm mũi xoang cấp, ngạt mũi hai bên, bảy ngày", bấm ⏹ Dừng nghe rồi Điền.
- **M4. Phiếu đã có chữ.** Gọi một mẫu bất kỳ, xem lý do khám và bệnh sử điều dưỡng nhập sẵn có được giữ nguyên không.
- **M5. Bệnh chưa có mẫu.** Tóm tắt một ca không có trong danh sách (ví dụ u bã đậu sau tai) đúng như cách anh/chị vẫn đọc hay gõ. Trợ lý sẽ tách cả đoạn như trước.
- **M6. Thuốc trùng dị ứng.** `mẫu viêm tai giữa cấp`: mẫu có Augmentin trong khi bệnh nhân dị ứng Penicillin. Xem dòng thuốc có cảnh báo đỏ không.
- **A1. Để so sánh: đọc cả ca.** Đọc to đoạn dưới đây (đúng bệnh nhân trên phiếu), xem mất bao lâu so với gọi mẫu:

  > Chị đến khám vì đau tai phải, chảy mủ tai phải 4 ngày. Bệnh sử 4 ngày nay đau tai phải, 2 ngày nay chảy mủ vàng tai phải, nghe kém tai phải, sốt nhẹ. Tiền sử viêm tai giữa mạn tính tai phải, dị ứng penicillin. Khám thấy ống tai phải có mủ vàng, màng nhĩ phải thủng trung tâm. Chẩn đoán đợt cấp viêm tai giữa mạn tính có mủ tai phải. Chỉ định nội soi tai, đo thính lực đơn âm, làm sạch ống tai hút dịch tai. Kê Ciprofloxacin nhỏ tai phải 5 giọt một lần, ngày 2 lần, 7 ngày. Paracetamol 500 mg uống 1 viên một lần, ngày 3 lần, sau ăn, 5 ngày. Dặn giữ khô tai, không bơi. Hẹn tái khám sau 7 ngày.

---

## Phần 2. Cho người điều phối

### Chuẩn bị

- Đặt `ASR_PROVIDER=zipformer` trong `.env.local` (đã tải model bằng `npm run tai-model-giong-noi`) để âm thanh không rời khỏi máy.
- Chọn `LLM_PROVIDER`.
  - Chỉ gõ tên mẫu (M1, M4, M6) thì **không gọi LLM**, chạy được cả ở `mock`.
  - Tên mẫu kèm chi tiết (M2, M3) gọi LLM 1 lượt. Ở `mock` thì chỉ thay được bên, số ngày, nhiệt độ bằng quy tắc.
  - M5 và A1 cần LLM thật mới tách tốt.
- Nếu dùng `gemini` bằng key miễn phí: đặt `GEMINI_MODEL=gemini-3.5-flash-lite` (**15 lượt gọi mỗi phút, 500 lượt mỗi ngày**, mỗi lượt khoảng 2–3 giây). Model mạnh hơn hết hạn mức rất nhanh. Thỉnh thoảng Google trả lỗi 503 khi quá tải, gặp lỗi thì bấm lại.
- Mở `/ket-qua` trước buổi thử để biết đã có bao nhiêu lượt cũ. Lượt có dùng mẫu hiện "· Mẫu <id>".
- Danh sách mẫu và cách gọi tắt: `data/eform/phieu-mau.json` (`ten`, `bi_danh`), hoặc gõ 2 chữ vào ô để hiện gợi ý.

### Mẫu đúng sẵn bao nhiêu (ước tính)

Đo bằng `npm run eval-mau` trên 10 ca mẫu có mẫu tương ứng (ngày 2026-11-12):

| | Chung | Phiếu khám | Chỉ định | Đơn thuốc |
|---|---|---|---|---|
| Chỉ gõ tên mẫu | 68,5% | 38,9% | 97,4% | 76,3% |
| Tên mẫu kèm chi tiết (quy tắc, chưa dùng LLM) | 72,5% | 53,7% | 97,4% | 76,3% |

Chỗ mẫu hay sai nhất là bệnh sử, khám toàn thân, khám chuyên khoa và lời dặn, vì bên tai, con số và câu chữ của từng ca khác mẫu. Hẹn tái khám, hướng điều trị và mã chỉ định gần như luôn đúng. **Mẫu và đáp án đều do nhóm soạn**, nên số thật phải đo ở buổi thử này.

### Cần biết trước để không bất ngờ

- **Mẫu có sẵn câu khám kiểu "Tim đều, phổi không ran", "màng nhĩ 2 bên bình thường".** Bác sĩ không khám chỗ đó mà vẫn Lưu thì bệnh án ghi sai. Ghi lại bác sĩ có đọc kỹ từng ô không, hay bấm Lưu luôn.
- **Tên mẫu chỉ được nhận khi đứng đầu câu hoặc đứng sau chữ "mẫu".** Câu kể cả ca có nhắc tên bệnh ở giữa thì chạy luồng tách cũ. Bác sĩ nói "mẫu…" giữa chừng thì vẫn nhận.
- **Ô vàng `[phải|trái|2 bên]`, `[số] ngày`** là chỗ mẫu cần bác sĩ điền. Nói kèm chi tiết thì phần lớn được thay tự động; không thay được thì vẫn để vàng.
- **Nhận dạng giọng nói hay nghe sai tên thuốc và từ chuyên môn.** Lần thử bằng giọng đọc máy ngày 2026-11-11 có khoảng 29% số từ bị sai. Sau bước sửa chữ (`config/sua-chu-giong-noi.json`) còn khoảng 10% trên giọng máy; giọng người thật chưa đo. Tên bệnh ngắn trong lệnh gọi mẫu cũng có thể bị nghe sai. Ghi lại bác sĩ gõ sửa ngay, đọc lại, hay bỏ cuộc.
- Mỗi lần tải trang chỉ ghi **một** lượt số đo, vào lần Lưu đầu tiên sau khi AI đã điền. Quên tải lại thì kịch bản sau không được ghi.
- Dùng link "Thử câu mẫu" thì lượt đó không tính vào số trung bình. Ở buổi thử, bác sĩ gõ hoặc nói thật.

### Ghi chép mỗi kịch bản

Số đếm (thời gian, số trường AI điền, đã sửa, bổ sung, khớp danh mục, mẫu đã dùng) đã tự ghi ở `/ket-qua`. Người điều phối ghi thêm bằng tay:

| Kịch bản | Mẫu đã gọi | Chữ nào trong mẫu phải sửa | Ô nào bác sĩ không đọc mà vẫn Lưu | Bác sĩ dừng hay do dự ở đâu | Câu bác sĩ nói nguyên văn |
|---|---|---|---|---|---|
| M1 | | | | | |
| M2 | | | | | |
| M3 | | | | | |
| M4 | | | | | |
| M5 | (không có mẫu) | | | | |
| M6 | | | | | |
| A1 | (đọc cả ca) | | | | |

### Hỏi sau buổi thử

Hỏi về việc đã xảy ra, không hỏi bác sĩ có thích không:

- Ở lượt vừa rồi, chữ nào trong mẫu anh/chị phải sửa?
- Lần gần nhất điều dưỡng gõ mẫu viết tắt xong, anh/chị sửa những chữ nào?
- Bộ viết tắt điều dưỡng đang dùng có bao nhiêu mẫu? Ai soạn, lần cuối sửa khi nào?
- Ca hôm qua anh/chị nhập phiếu và đơn mất bao lâu? Phần nào chiếm nhiều thời gian nhất?
- Bệnh nào anh/chị gặp nhiều mà danh sách mẫu chưa có?
- Lúc nãy chỗ nào anh/chị không tin kết quả và phải đọc lại kỹ?
