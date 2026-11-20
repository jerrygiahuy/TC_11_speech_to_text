# Cấu trúc form "Phiếu khám ngoại trú" – EMR Vinmec (Bệnh án điện tử)

> Khảo sát tại PK Tai Mũi Họng (09/11/2026); cấu trúc màn EMR dùng chung các khoa, giữ làm tham khảo cho CardioNote.

> Nguồn: ảnh chụp màn hình eForm tại PK Tai Mũi Họng, Times City (OPD – Liên chuyên khoa), ngày 09/11/2026.
> Tài liệu chỉ mô tả **cấu trúc trường**. Không chứa họ tên, PID, mã lượt khám, CCCD, tài khoản bác sĩ hay nội dung lâm sàng của bệnh nhân.

---

## A. Thanh header (ghim cố định trên mọi màn hình)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| Người dùng đăng nhập | Tự động | [ẩn] |
| Cơ sở / khu vực | Tự động | VD: Times City (OPD – Liên chuyên khoa) |
| PID / mã thứ hai trong ngoặc | Tự động | [ẩn]. Mã trong ngoặc có thể là mã lượt khám (cần xác nhận) |
| Họ tên bệnh nhân | Tự động | [ẩn] |
| Giới tính | Tag màu | |
| Cảnh báo dị ứng | Tag đỏ + icon (i) xem chi tiết | Nổi bật ngay header |
| Xem LSKB (lịch sử khám bệnh), Mở rộng | Nút | |
| "Chỉnh sửa lần cuối bởi … lúc …" | Tự động | Audit trail |
| Phiếu "Đánh giá ban đầu người bệnh ngoại trú thông thường" | Khối thu gọn | Có vẻ do điều dưỡng làm trước |

## B. Phần 1 – Đánh giá chung

### B1. Sinh hiệu & thông tin lượt khám
Các ô màu xám = chỉ đọc, nhiều khả năng lấy từ phiếu đánh giá ban đầu.

| Trường | Kiểu / đơn vị |
|---|---|
| Mạch | Số, nhịp/phút |
| Nhiệt độ | Số, °C |
| Huyết áp | Tâm thu/tâm trương, mmHg |
| SpO2 | Số, % |
| Nhịp thở | Số, lần/phút |
| Chiều cao | Số, cm |
| Cân nặng | Số, kg |
| BMI | Tự tính |
| Thời gian khám | Date-time picker |
| Bác sĩ khám | Tự động [ẩn] |
| Phòng khám | Tự động |
| Nơi giới thiệu | Chọn 1: Cơ quan y tế / Tự đến |

### B2. Hỏi bệnh

| Trường | Kiểu | Ghi chú |
|---|---|---|
| Lý do đến khám | Text tự do | *Hiển thị trên báo cáo y tế* |
| Tiền sử bệnh – Bản thân | Text tự do | Bảng "Thông tin khai thác tiền sử bệnh": Ngày khám, Bác sĩ khám, Khoa phòng, Tiền sử bệnh, nút **Copy** |
| Tiền sử bệnh – Gia đình | Text tự do | Bảng "Thông tin khai thác tiền sử bệnh của người thân": cùng cột + Copy |
| Tiền sử dị ứng | Chọn 1: Có / Không / Không xác định. Nếu Có: chọn nhiều loại (Thực phẩm, Khác…) + text mô tả | Bảng "Thông tin khai thác tiền sử dị ứng": Ngày cập nhật, Loại phiếu, Loại dị ứng, Thông tin dị ứng, Người cập nhật, Copy. Nút **"Lấy LS dị ứng từ VIHC"** |
| Bệnh sử | Text tự do (thường dài) | *Hiển thị trên BCYT*. Bảng "Thông tin khai thác bệnh sử": Ngày khám, Bác sĩ khám, Khoa, Bệnh sử, Copy |
| Thuốc hiện đang dùng (cả kê đơn và không kê đơn) | Chọn 1: NB không có thuốc đang dùng / NB có thuốc đang dùng | Chưa thấy trường con khi chọn "có thuốc" |

### B3. Khám lâm sàng (*Hiển thị trên BCYT*)

| Trường | Kiểu |
|---|---|
| Bệnh nhân thực hiện phẫu thuật/thủ thuật | Có / Không |
| Khám toàn thân | Text tự do + "Mở thư viện tham khảo" (mẫu câu) |
| Khám chuyên khoa | Text tự do + thư viện. TMH chia theo Tai / Mũi / Vòm / Họng |
| Khám các bộ phận khác | Text tự do + thư viện |

### B4. Chẩn đoán & cận lâm sàng

| Trường | Kiểu | Ghi chú |
|---|---|---|
| Chẩn đoán ban đầu | Chọn ICD10 (mã + tên) + ô mô tả | |
| Các xét nghiệm, thăm dò chính | Nút "Lấy kết quả mới nhất" | *Hiển thị trên BCYT* |
| ├ Kết quả xét nghiệm | Accordion theo ngày, "Xem thêm" | |
| ├ Kết quả chẩn đoán hình ảnh | Accordion theo ngày, "Xem thêm", "Xem tất cả hình ảnh" | |
| ├ Kết quả cận lâm sàng | Accordion theo ngày, dòng "Đồng bộ lần cuối lúc…" | |
| └ Ô ghi chú/tóm tắt kết quả | Text tự do | |
| Thông tin chẩn đoán xác định từ OH | Nút "Lấy kết quả mới nhất" | OH là hệ thống nào → cần hỏi |
| Chẩn đoán ra viện | Chọn ICD10 + ô mô tả | |
| Chẩn đoán kèm theo | Chọn nhiều ICD10 | *Hiển thị trên BCYT* |
| Đã xử lý (thuốc, chăm sóc) | Có / Không | |

## C. Phần 2 – Điều trị

| Trường | Kiểu |
|---|---|
| Hướng điều trị | Text tự do + thư viện, *Hiển thị trên BCYT* |
| Lời dặn & theo dõi | Text tự do + thư viện, *Hiển thị trên BCYT* |
| Hẹn tái khám | Có / Không (chưa thấy ô ngày khi chọn Có) |
| Tình trạng người bệnh ra viện | Chọn 1: Khỏi / Đỡ, giảm / Chưa thay đổi / Nặng hơn / Khác |

## D. Phần 3 – Thông tin khác

| Trường | Kiểu |
|---|---|
| Bác sĩ chính | Tự động [ẩn] |
| Bác sĩ được ủy quyền khám | Nút "Chỉnh sửa ủy quyền khám" |
| Chuyển nội soi | Checkbox. Bác sĩ phải chọn trạng thái "Chờ KQ CLS" để khu nội soi tiếp nhận |
| Xác nhận bệnh tật | Có / Không |
| Xác nhận nghỉ việc hưởng BHXH | Có / Không |
| Xác nhận người mẹ không đủ sức khỏe để chăm sóc con | Có / Không |
| *(ảnh bị cắt – có thể còn trường phía dưới)* | |

## E. Thanh thao tác (ghim dưới cùng)

- **Trạng thái lượt khám:** Đang khám · Chờ KQ CLS · Hoàn thành khám · Nhập nội trú · Chuyển cấp cứu · Chuyển CSKCB BHYT · Không khám
- **Nút:** Quay lại · Báo cáo y tế · In ngay · Lưu · Lên đầu trang

---

## Ghi chú cho AI Exploration Sprint

- **Báo cáo y tế được ghép từ form.** Mọi trường gắn nhãn "Hiển thị trên báo cáo y tế" đi thẳng vào báo cáo, nên chất lượng text tự do quyết định chất lượng báo cáo.
- **Thao tác "Copy" từ lần khám trước rất phổ biến.** Tiền sử, bệnh sử và dị ứng đều có bảng lịch sử đa khoa kèm nút Copy → cơ hội cho AI tóm tắt/gộp lịch sử thay cho copy thủ công.
- **"Thư viện tham khảo" = mẫu câu tĩnh** → AI có thể gợi ý theo đúng triệu chứng.
- **ICD10 chọn tay** và phải khớp với chẩn đoán viết tự do → use case gợi ý mã ICD từ text.
- **Sinh hiệu bác sĩ chỉ đọc**, kế thừa từ phiếu điều dưỡng → dữ liệu đã có cấu trúc sẵn.

## Câu hỏi còn mở / phần chưa thấy

- Mã trong ngoặc cạnh PID là gì?
- "OH" trong "Thông tin chẩn đoán xác định từ OH" là hệ thống nào?
- Đơn thuốc và chỉ định CLS nằm ở module nào?
- Trường con khi chọn "NB có thuốc đang dùng" và "Hẹn tái khám = Có"?
- Phần cuối mục 3 – Thông tin khác.
