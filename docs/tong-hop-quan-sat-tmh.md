# Tổng hợp quan sát – Khoa TMH & Liên chuyên khoa, Vinmec Times City
Cập nhật: 04/11/2026 (gồm các ngày 29/10, 30/10, 02/11, 03/11)

## Thông tin chung
- Vai trò: thực tập "Kỹ sư AI Exploration Sprint" (~6 tuần), quan sát quy trình để tìm chỗ AI có thể hỗ trợ.

## Hệ thống bác sĩ đang dùng
- emr.vinmec.com: danh sách bệnh nhân, bệnh án điện tử, phiếu khám ngoại trú
- Registration Production Environment: kê đơn, chỉ định dịch vụ. Kê đơn = tìm thuốc → thêm vào "customer order" → điền liều lượng, ngày dùng…
- Biên bản hội chẩn (03/11): tóm tắt tình trạng người bệnh, các vấn đề hội chẩn, chẩn đoán, điều trị và chăm sóc, thăm dò, khác. Bác sĩ mở trước khi khám, điền sau khi bệnh nhân đi.
- Excel (danh sách đăng ký), sổ giấy theo dõi khám hằng ngày (dán mã PID)
- Bệnh nhân nước ngoài: báo cáo chuyển Việt → Anh trên hệ thống (khá nhanh)
- Bệnh nhân: app MyVinmec (đặt lịch, lưu mã KH để check-in, xem kết quả KSK)

## Quy trình một ca khám ngoại trú
Gọi bệnh nhân vào → bác sĩ hỏi bệnh & khám, điều dưỡng nhập phiếu khám ngoại trú song song → bác sĩ sửa/bổ sung bệnh án → sang Registration kê đơn, chỉ định → in giấy, tư vấn → bệnh nhân về → ghi sổ giấy theo dõi.
Các trường bác sĩ hay tự nhập/sửa: bệnh sử, lý do đến khám, khám toàn thân, khám chuyên khoa, chẩn đoán ra viện, chẩn đoán kèm theo, hướng điều trị, lời dặn & theo dõi.

## Số liệu chính
- Block khám 20 phút/ca, ~12 ca/buổi, ~24 ca/ngày.
- 02/11: trung bình ~15 phút/ca (bệnh nhân vào → ra), dao động 7–30 phút; bỏ 2 ca dài thì ~11 phút. Chưa tính thời gian bác sĩ sửa bệnh án sau khi bệnh nhân về.
- Ca 8:17–8:47 (02/11): khám ~9 phút, nhập liệu + kê đơn ~20 phút.
- 30/10: một lần kê đơn mất ~8 phút; 3 lần thiếu điều dưỡng (bác sĩ vừa khám vừa tự nhập); 3 lần bác sĩ phải sửa lại bệnh án điều dưỡng nhập.
- Nội soi đơn thuần: 3 phút 20 giây (trẻ 2 tuổi), 8 phút 21 giây (bác trai ù tai, gồm hỏi bệnh).
- 03/11: 8 ca; khám thuần 3–7 phút ở ca thường, ~20 phút ở ca hội chẩn; 2 bệnh nhân đi thăm dò/chụp rồi quay lại mới được kê đơn (~13 và ~49 phút); biên bản hội chẩn ~8 phút sau khám.

## Lời nhân viên y tế (trích/ghi nhận trực tiếp)
- Bác sĩ: vừa khám vừa điền phiếu rồi lại sang phần mềm kê đơn "rất mất thời gian, bị phân tâm, không tập trung được vào bệnh nhân".
- Bác sĩ: quá nhiều hệ thống; kê đơn chậm; kê đơn & chỉ định phức tạp, phải gọi các bên; hủy chỉ định mất thời gian.
- Bác sĩ: không sửa được thời gian dùng thuốc trên hệ thống → phải gọi hỗ trợ, in bệnh án mang xuống phòng hỗ trợ (30/10).
- Tìm kiếm trên EMR "thô": gõ sai 1 ký tự là không ra bệnh nhân; tìm dịch vụ chỉ định lâu (ví dụ tìm mãi không ra dịch vụ điều trị u bã đậu).
- Bác sĩ (03/11): "đau đầu" với thao tác phần mềm khi tìm thông tin bệnh nhân, tìm thông tin loại bệnh; bệnh nhân khám nhiều lần nhưng không có bộ lọc, phải mở danh sách từng ngày ra xem.
- Bác sĩ (03/11): muốn xem BHYT ngay trên EMR, có hệ thống phân tích BHYT để biết thuốc nào bị hạn chế khi kê đơn; theo bác sĩ, các bệnh viện khác đã nối kê đơn với BHYT.

## Ý tưởng liên quan đến prototype
1. **Trợ lý giọng nói / văn bản điền bệnh án**: bác sĩ tự đọc tóm tắt sau khám (chỉ giọng bác sĩ, không ghi âm cuộc hội thoại với bệnh nhân) → AI chia vào đúng các trường phiếu khám (+ nối sang đơn thuốc). Kết hợp **mẫu điền sẵn** cho ca TMH hay gặp (viêm tai, viêm mũi họng ở trẻ).
   - Giá trị: giảm gánh nặng nhận thức + giảm thời gian ở ca thiếu điều dưỡng và ca phải sửa lại.
2. **Tìm kiếm thông minh** (chấp nhận sai chính tả, hiểu ý) cho danh mục dịch vụ chỉ định và thuốc. Rủi ro y tế thấp, dễ làm prototype.
3. **Cảnh báo BHYT khi kê đơn/chỉ định**: báo thuốc/dịch vụ nào BHYT hạn chế/không chi trả.
- Tầm nhìn dài hạn: một màn hình làm việc thống nhất cho bác sĩ (gom EMR + kê đơn + chỉ định).

## Tham chiếu bên ngoài
- Bệnh viện E (Hà Nội) dùng VEM.AI: giọng nói bác sĩ → bệnh án có cấu trúc; thời gian cập nhật bệnh án giảm từ 10–15 phút xuống 1–3 phút.
- MyHospital (phần mềm HIS) có speech-to-text điền bệnh án; MedVoice (sinh viên RMIT) xử lý thuật ngữ y khoa tiếng Việt, môi trường ồn.
- Quốc tế: Microsoft DAX, Abridge.

## Nguyên tắc cho prototype
- Hội thoại/tóm tắt GIẢ → AI điền form giống phiếu khám → mang cho bác sĩ xem góp ý. **Không dùng dữ liệu bệnh nhân thật.**
