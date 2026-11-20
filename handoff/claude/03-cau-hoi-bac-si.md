# 03 — Câu hỏi cho bác sĩ và IT

Mỗi câu gắn với trường trong `02-bang-anh-xa.md` và ảnh làm căn cứ. Câu hỏi bám vào việc người được hỏi đã làm ở lần khám gần nhất, theo tinh thần Mom Test, để tránh hỏi ý kiến chung chung. Trong lúc chờ trả lời, Codex dùng **mặc định tạm** ở cột cuối và tiếp tục kiểm thử với mock.

## Cho bác sĩ Tim mạch

| # | Trường | Câu hỏi | Căn cứ hiện có | Mặc định tạm |
|---|---|---|---|---|
| Q1 | Mọi trường | Ở lần anh/chị bấm "Hoàn thành khám" gần nhất, hệ thống có chặn vì thiếu ô nào không? Đó là ô nào? | Ảnh không có dấu bắt buộc. Chỉ Tiền sử dị ứng có ⚠ | Khi duyệt chỉ **cảnh báo, không chặn**. Danh sách cảnh báo: Lý do đến khám, Tiền sử dị ứng, Thuốc đang dùng, Khám tim mạch hô hấp, Chẩn đoán ban đầu, Hướng điều trị, Hẹn tái khám |
| Q2 | Khám chuyên khoa / Khám tim mạch, hô hấp | Ở ca gần nhất anh/chị khám cả bụng lẫn tim phổi, anh/chị ghi phần nào vào ô "Khám chuyên khoa" và phần nào vào "Khám tim mạch, hô hấp"? Có ca nào anh/chị ghi tim phổi vào "Khám chuyên khoa" không? | IMG_2162–2164: hai ô riêng, hai thư viện khác nhau | Giữ riêng. Tim phổi vào ô tim mạch hô hấp; cơ quan khác vào khám chuyên khoa |
| Q3 | Khám các bộ phận khác | Lần gần nhất gặp người bệnh phù chân, anh/chị ghi "phù mắt cá chân" vào ô nào? | Chưa có ảnh ca thực tế | Ô mà bác sĩ đang nói tới trong lời khám. Mặc định là khám tim mạch, hô hấp |
| Q4 | Sinh hiệu | Lần gần nhất số huyết áp anh/chị đo tại phòng khác với số ĐD đã nhập, anh/chị sửa ở đâu, hay ghi vào phần khám? | IMG_2152 ô xám, IMG_2789 phiếu ĐD | AI không ghi đè sinh hiệu. Số khác nhau thì hiện cảnh báo lệch nguồn để bác sĩ chọn |
| Q5 | Dị ứng "Có" | Khi chọn "Có" ở Tiền sử dị ứng, màn hình hiện thêm ô gì (loại, tác nhân, phản ứng)? | Chưa chụp trạng thái Có. Bảng lịch sử có cột "Loại dị ứng" | Giữ ô loại + mô tả của eForm hiện tại |
| Q6 | Dị ứng | Khi người bệnh nói "chưa thấy dị ứng gì", anh/chị bấm "Không" hay "Không xác định"? | Bộ ca dùng cụm "chưa ghi nhận" cho trạng thái NONE | Điền "Không", đánh dấu `xem` (cần xem lại) |
| Q7 | Thuốc đang dùng | Lần gần nhất bấm "Thêm thuốc", anh/chị nhập những ô nào? Có chép từ bảng thuốc trên hệ thống bằng nút Copy không? | IMG_2159 | tên · hàm lượng · cách dùng |
| Q8 | Chẩn đoán ra viện | Với người bệnh ngoại trú về trong ngày, ô "Chẩn đoán ra viện" có phải là chẩn đoán cuối lượt khám không? Lần gần nhất ô này khác ô ban đầu là ca nào? | IMG_2167, IMG_2172. SCH Q8 | Để trống cho bác sĩ điền. Có nút "Dùng chẩn đoán ban đầu" |
| Q9 | Hẹn tái khám | Khi chọn "Có", anh/chị nhập ngày cụ thể hay số ngày? | Chưa chụp trạng thái Có | Ô ngày, tính từ câu "sau N ngày" |
| Q10 | Trường không có trên ảnh | Phiếu thật có ô "Có phẫu thuật/thủ thuật", "Xác nhận người mẹ không đủ sức khỏe chăm sóc con" không? | Không thấy ở IMG_2159–2171 | Ẩn khỏi phiếu Tim mạch, giữ trong code |
| Q11 | Bản in | Lần gần nhất in phiếu cho người bệnh, anh/chị dùng "In ngay" hay "Báo cáo y tế"? Bản đó có những mục nào? | Nhãn [BCYT] trên 7 trường | In mọi trường có giá trị, đúng thứ tự trên phiếu |
| Q12 | Viết tắt | Các chữ viết tắt anh/chị gõ nhiều nhất khi khám Tim mạch là gì (ví dụ THA, ĐTĐ)? | Bảng tiền sử trên ảnh có "THA", "DTD2" | Danh sách mock ở `05` mục 6 |
| Q13 | Chẩn đoán kèm theo | Khi người bệnh có bệnh nền (ví dụ rối loạn mỡ máu) nhưng hôm nay khám vì việc khác, anh/chị có ghi bệnh nền vào "Chẩn đoán kèm theo" không? | Bộ ca tự đưa bệnh nền vào kèm theo | Không tự điền, chỉ gợi ý |

## Cho IT / dữ liệu

| # | Câu hỏi | Căn cứ |
|---|---|---|
| Q14 | Nhãn "Đây là ca bệnh ngoại trú phức tạp" được bật theo quy tắc nào? | IMG_2152 |
| Q15 | Danh mục ICD-10, dịch vụ CLS và thuốc của Trung tâm Tim mạch lấy ở đâu? Có bản xuất được dùng cho prototype không? | Danh mục hiện tại là TMH (`06`) |
| Q16 | Cây "Khám chuyên khoa" có nhóm Tim mạch không? Thư viện của Hướng điều trị và Lời dặn & theo dõi có nội dung gì? | IMG_2162 mờ |
| Q17 | Các câu còn mở trong `docs/tim_mach/vinmec_opd_schema_tong_hop.md` mục 7 (số trong ngoặc sau PID, OH, MUSE/OMRON, submit) | SCH |

## Ảnh cần chụp thêm

Chụp trên ca giả hoặc che thông tin trước khi chụp:
1. Tiền sử dị ứng = Có.
2. Form Thêm thuốc.
3. Hẹn tái khám = Có.
4. Thư viện Khám chuyên khoa (chụp rõ), Khám các bộ phận khác, Hướng điều trị, Lời dặn.
5. Màn Báo cáo y tế và bản In ngay.
6. IMG_2158 (thiếu trong chuỗi ảnh, có thể là ảnh giữa Bệnh sử và Thuốc đang dùng).
