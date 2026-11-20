# Kịch bản thử với bác sĩ Tim mạch

Tài liệu cho một buổi thử CardioNote (trợ lý điền Phiếu khám ngoại trú và Chỉ định dịch vụ cho Trung tâm Tim mạch) với bác sĩ Tim mạch. **Phần 1** in ra đưa bác sĩ đọc, **Phần 2** dành cho người điều phối buổi thử. Trước 20/11/2026 tài liệu này viết cho bác sĩ Tai Mũi Họng; nay đã viết lại cho Tim mạch.

> **Chỉ dùng thông tin bịa.** Bác sĩ không nói tên, tuổi, PID hay bệnh sử của bệnh nhân thật, kể cả khi đang kể lại một ca quen. Chỉ đọc hội thoại của **10 ca giả lập** dưới đây, không ghi âm người bệnh thật.

---

## Phần 1. Cho bác sĩ

Buổi thử gồm **một đợt đo 10 ca giả lập**. Với mỗi ca, anh/chị làm hai lần để so sánh:

- **Lần 1, nhập tay:** nhìn nội dung ca và tự điền Phiếu khám, Chỉ định dịch vụ như vẫn làm hằng ngày.
- **Lần 2, dùng CardioNote:** đọc to hội thoại của ca (hoặc nạp hội thoại mẫu), bấm tạo bản nháp, rồi **sửa và duyệt** như một phiếu thật.

Người điều phối bấm giờ cả hai lần, tính từ lúc bắt đầu đến lúc bấm **Lưu phiếu & chỉ định** (với lần 2 gồm cả thời gian sửa và duyệt).

### 10 ca giả lập

Nội dung đọc nằm ở `data/cases/` (trường `input_noi`), hồ sơ mã giả `SYN-CARDIO-*`:

| Ca | Nội dung | Mã ca |
|---|---|---|
| 1 | Tái khám tăng huyết áp | SYN-CARDIO-001 |
| 2 | Đánh trống ngực từng cơn | SYN-CARDIO-007 |
| 3 | Khó chịu vùng ngực khi gắng sức | SYN-CARDIO-013 |
| 4 | Khó thở khi gắng sức | SYN-CARDIO-019 |
| 5 | Tái khám rối loạn lipid máu | SYN-CARDIO-025 |
| 6 | Tái khám sau can thiệp mạch vành | SYN-CARDIO-031 |
| 7 | Tái khám suy tim | SYN-CARDIO-037 |
| 8 | Tái khám rối loạn nhịp (rung nhĩ) | SYN-CARDIO-043 |
| 9 | Một lần ngất thoáng qua | SYN-CARDIO-049 |
| 10 | Đánh giá tim mạch trước thủ thuật | SYN-CARDIO-055 |

### Các bước với mỗi ca

1. Mở trang eForm `/`. Phiếu trên màn hình là một bệnh nhân giả; điều dưỡng đã nhập sẵn sinh hiệu và đánh giá ban đầu. Cột **✨ Trợ lý lâm sàng** nằm bên phải.
2. Chọn **Cách ghi nhận**: **Hội thoại** (bác sĩ và bệnh nhân nói chuyện) hoặc **Bác sĩ đọc** (bác sĩ đọc lại ca).
3. Đưa nội dung vào ô **Nội dung buổi khám**: bấm micro và đọc to, gõ vào ô, hoặc bấm **Nạp hội thoại mẫu**.
4. Bấm **Che thông tin và tạo bản nháp**. Hệ thống che thông tin nhận dạng trước khi gửi AI; xem **Bản đã che** để biết nội dung nào được gửi đi.
5. Đọc **Bản nháp · bác sĩ cần duyệt** và các mục **Cần xem lại**, rồi sửa phiếu như sửa phiếu bình thường. Thiếu thông tin thì để trống (dị ứng, thuốc đang dùng, hẹn tái khám chưa nhắc thì không nút nào được chọn).
6. **Duyệt** từng phần, rồi bấm **Lưu phiếu & chỉ định**. **Tải lại trang (F5)** trước khi sang ca sau.

Đơn thuốc không được tạo tự động; bác sĩ kê toa riêng.

### Thử thêm luồng trình diễn

Mở `/demo-luong` và chạy lần lượt 3 kịch bản có sẵn (nguồn **kịch bản mẫu**): **ca chuẩn** (tái khám tăng huyết áp, đủ loại thông tin định danh), **ca tự che** (tên người lạ còn sót, hệ thống tự che thêm rồi mới gửi AI) và **ca chưa đồng ý** (không đồng ý xử lý AI, chỉ chạy cục bộ). Anh/chị xem bản thô, bản đã che và phiếu cuối, rồi cho biết chỗ nào còn thấy thông tin nhận dạng.

---

## Phần 2. Cho người điều phối

### Chuẩn bị

- Đặt `ASR_PROVIDER=zipformer` trong `.env.local` (đã tải model bằng `npm run tai-model-giong-noi`) để âm thanh không rời khỏi máy. Cần chạy STT (`npm run stt:start`) nếu dùng micro.
- Chọn `CLINICAL_LLM_PROVIDER`. Ở `mock` thì bản nháp là dữ liệu mô phỏng, chỉ đủ để thử giao diện; muốn đo chất lượng tách thật thì dùng LLM thật.
- Nếu dùng `gemini` bằng key miễn phí: đặt `GEMINI_MODEL=gemini-3.5-flash-lite` (**15 lượt gọi mỗi phút, 500 lượt mỗi ngày**, mỗi lượt khoảng 2–3 giây). Thỉnh thoảng Google trả lỗi 503 khi quá tải, gặp lỗi thì bấm lại.
- Mở `/ket-qua` trước buổi thử để biết đã có bao nhiêu lượt cũ.
- In sẵn nội dung 10 ca từ `data/cases/` (trường `input_noi`) và hội thoại tương ứng ở `data/cardiology/` để bác sĩ đọc. Chỉ dùng dữ liệu giả.

### Đo gì trong đợt 10 ca

Với mỗi ca, ghi cho cả lần nhập tay và lần dùng CardioNote:

| Chỉ số | Cách đo |
|---|---|
| Thời gian hoàn thiện phiếu | Bấm giờ từ lúc bắt đầu đến lúc bấm Lưu phiếu & chỉ định. Lần CardioNote gồm cả sửa và duyệt. Số đếm tự ghi ở `/ket-qua` chỉ dùng để đối chiếu. |
| Số ô phải sửa | Số trường AI điền mà bác sĩ đã sửa (cột "Đã sửa" ở `/ket-qua`), cộng dòng AI thêm mà bác sĩ sửa hoặc xóa. |
| Lỗi thêm nội dung ngoài hội thoại | Số ô AI điền mà hội thoại không hề nói (ví dụ chẩn đoán kèm theo từ tiền sử, dị ứng "Không" khi chưa hỏi). Đối chiếu từng ô với **Bằng chứng trích từ nội dung đã lọc**. Mỗi ô như vậy tính một lỗi. |
| Ô thiếu thông tin bị điền thay vì để trống | Số ô lẽ ra phải trống (không nút nào được chọn) nhưng đã bị chọn. |

Lưu ý khi đọc số: dùng link "Thử hội thoại tổng hợp" hoặc "Nạp hội thoại mẫu" thì lượt không có thời gian nhập thật nên không tính vào số trung bình ở `/ket-qua`. Với buổi thử, bác sĩ đọc hoặc nói thật; thời gian lấy từ đồng hồ bấm tay của người điều phối.

### Cần biết trước để không bất ngờ

- **Mẫu câu khám có sẵn** (thư viện tham khảo ở `data/cardiology/exam-library.json`, như "Tim đều, phổi không ran"). Bác sĩ không khám chỗ đó mà vẫn Lưu thì bệnh án ghi sai. Ghi lại bác sĩ có đọc kỹ từng ô không, hay bấm Lưu luôn.
- **Nhận dạng giọng nói hay nghe sai tên thuốc và từ chuyên môn** (Bisoprolol, Apixaban, Rosuvastatin…). Sau bước sửa chữ (`config/sua-chu-giong-noi.json`) vẫn còn lỗi; giọng người thật chưa đo. Ghi lại bác sĩ gõ sửa ngay, đọc lại, hay bỏ cuộc.
- **Danh mục ICD và dịch vụ hiện là dữ liệu mô phỏng** (mỗi mục có `"mock": true`), không dùng trong lâm sàng. Mã do hệ thống gán, AI không tự điền mã.
- Mỗi lần tải trang chỉ ghi **một** lượt số đo, vào lần Lưu đầu tiên sau khi AI đã điền. Quên tải lại thì ca sau không được ghi.
- **Bệnh nền ở tiền sử** (ví dụ rối loạn lipid máu ở SYN-CARDIO-013) không được tự thành chẩn đoán kèm theo; chẩn đoán chỉ nói một lần ("Chẩn đoán: …") thì chẩn đoán ra viện để trống. Nếu thấy khác, ghi lại.

### Ghi chép mỗi ca

Người điều phối ghi bằng tay:

| Ca | Thời gian nhập tay | Thời gian CardioNote (gồm sửa, duyệt) | Số ô phải sửa | Số lỗi thêm nội dung ngoài hội thoại | Ô nào bác sĩ không đọc mà vẫn Lưu | Bác sĩ dừng hay do dự ở đâu | Câu bác sĩ nói nguyên văn |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| `/demo-luong` (3 kịch bản) | (không bấm giờ) | | | | | | |

### Hỏi sau buổi thử

Hỏi về việc đã xảy ra, không hỏi bác sĩ có thích không:

- Ở ca vừa rồi, ô nào anh/chị phải sửa nhiều nhất?
- Lần gần nhất anh/chị nhập phiếu khám Tim mạch, phần nào chiếm nhiều thời gian nhất?
- Ca hôm qua anh/chị nhập phiếu và chỉ định mất bao lâu?
- Lúc nãy chỗ nào anh/chị không tin kết quả và phải đọc lại kỹ?
- Có ô nào AI điền mà anh/chị thấy hội thoại không hề nói không?
- Loại ca Tim mạch nào anh/chị gặp nhiều mà 10 ca này chưa có?
