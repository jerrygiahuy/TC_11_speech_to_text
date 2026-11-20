# 01 — Rà bộ ảnh Phiếu khám ngoại trú

Nguồn: 24 ảnh HEIC chụp màn hình EMR thật. Ảnh chỉ được chuyển sang JPEG trong thư mục tạm cục bộ để đọc, không chép vào repo. File này **chỉ ghi nhãn, kiểu ô, lựa chọn, đơn vị và thứ tự**. Mọi giá trị trên ảnh (họ tên, PID, mã lượt, tài khoản bác sĩ, sinh hiệu, thuốc, kết quả, ngày khám) đã được bỏ.

## Số lượng ảnh

- `Form Ngoại trú/Phiếu khám ngoại trú/`: **21 ảnh** (IMG_2152 → IMG_2173, không có IMG_2158).
- `Form Ngoại trú/` (thư mục cha): **3 ảnh** (IMG_2787, IMG_2788, IMG_2789). Đây là phiếu của **điều dưỡng**, không phải Phiếu khám của bác sĩ.
- Tổng 24 ảnh, khớp con số trong plan. Plan ghi cả 24 ảnh nằm trong thư mục con, thực tế chỉ có 21.

## Nhóm ảnh theo phần của phiếu

| Mã ảnh | Phần của phiếu | Nội dung nhìn thấy | Độ rõ |
|---|---|---|---|
| IMG_2152 | Đầu phiếu + 1. Đánh giá chung | Thanh trên, banner bệnh nhân, tiêu đề, sinh hiệu, phòng khám, bác sĩ khám, thời gian khám, nơi giới thiệu, lý do đến khám, đầu mục Tiền sử bệnh. Thanh nút cuối màn hình | Rõ |
| IMG_2153 | Tiền sử bản thân | Ô "Tiền sử bệnh", bảng "Thông tin khai thác tiền sử bệnh" | Rõ |
| IMG_2154 | Tiền sử gia đình | Bảng tiền sử bản thân (tiếp), ô Gia đình, bảng "Thông tin khai thác tiền sử bệnh của người thân" | Rõ |
| IMG_2155 | Gia đình → Dị ứng | Bảng "Thông tin khai thác tiền sử dị ứng" | Rõ |
| IMG_2156 | Dị ứng | Bảng dị ứng, nút "LẤY LS DỊ ỨNG TỪ VIHC", ô chọn ⚠ Tiền sử dị ứng | Rõ |
| IMG_2157 | Bệnh sử | Ô Bệnh sử, bảng "Thông tin khai thác bệnh sử", đầu mục Thuốc hiện đang dùng | Rõ |
| IMG_2159 | Thuốc đang dùng → Khám lâm sàng | Ô chọn thuốc, danh sách trống, nút "Thêm thuốc", bảng thuốc trên hệ thống; Khám toàn thân, Khám chuyên khoa | Rõ |
| IMG_2160 | Thư viện Khám toàn thân (chưa chọn) | Popup 7 câu mẫu, nút Chọn tất cả / Hủy / Chọn | Rõ |
| IMG_2161 | Thư viện Khám toàn thân (đã chọn) | Câu đã chọn hiện thành thẻ phía trên | Rõ |
| IMG_2162 | Thư viện Khám chuyên khoa | Cây chuyên khoa (Khám bụng, Mắt, TMH...), thẻ câu đã chọn của Khám bụng | **Mờ**, chỉ đọc được tên nhóm |
| IMG_2163 | Thư viện Khám tim mạch, hô hấp | Popup 13 câu mẫu, tất cả đã chọn | Rõ |
| IMG_2164 | Khám lâm sàng đã điền + Chẩn đoán ban đầu | Cách câu thư viện được chèn vào ô; Khám các bộ phận khác; ICD10 + ô diễn giải | Rõ |
| IMG_2165 | Chẩn đoán ban đầu → Xét nghiệm | Khối "Các xét nghiệm, thăm dò chính", nhóm Kết quả xét nghiệm theo ngày | Rõ |
| IMG_2166 | Kết quả CĐHA và CLS | Thanh theo ngày, "Xem thêm", "Xem tất cả hình ảnh" | Rõ |
| IMG_2167 | Ô tóm tắt kết quả → Chẩn đoán | Ô "Các xét nghiệm, thăm dò chính", OH, Chẩn đoán ra viện, kèm theo, Đã xử lý, đầu mục 2. Điều trị | Rõ |
| IMG_2168 | 2. Điều trị | Hướng điều trị, Lời dặn, Hẹn tái khám, Tình trạng người bệnh ra viện, đầu mục 3 | Rõ |
| IMG_2169 | 2. Điều trị (chụp lại) | Giống IMG_2168, thấy ô ICD10 kèm theo phía trên | Rõ |
| IMG_2170 | 3. Thông tin khác | Bác sĩ chính, ủy quyền, Chuyển Nội Soi, Xác nhận bệnh tật, nghỉ việc BHXH, mã biểu mẫu | Rõ |
| IMG_2171 | Cuối phiếu | Như IMG_2170 + dòng "Chỉnh sửa lần cuối bởi … lúc …" | Rõ |
| IMG_2172 | Chọn ICD | Chẩn đoán ra viện đã chọn mã (ô diễn giải tự hiện tên mã), dropdown tìm ICD của Chẩn đoán kèm theo | Hơi mờ |
| IMG_2173 | Kết quả cận lâm sàng mở rộng | Cột Tên dịch vụ, Người trả kết quả, Kết luận, "Xem mô tả chi tiết", Copy | Rõ |
| IMG_2787 | Phiếu ĐD: sàng lọc ngã / ngất (trang 1) | Mã `A02_007_200326_VE`. Cột Điều dưỡng / Bác sĩ theo lần | Rõ |
| IMG_2788 | Phiếu ĐD: sàng lọc ngất (trang 2) + biện pháp can thiệp | Câu 4 ECG bất thường [BS], câu 5 Hematocrit [ĐD], 10 biện pháp | Rõ |
| IMG_2789 | Phiếu ĐD: đánh giá ban đầu ngoại trú | Dấu hiệu sinh tồn, Ghi chú, Dị ứng, Đau, Có thai, Cho con bú, Câu hỏi sàng lọc dịch tễ, Các thuốc đang dùng | Rõ |

## Cấu trúc phiếu theo thứ tự trên màn hình

Ký hiệu: **[BCYT]** = nhãn trên màn hình có chữ "(Hiển thị trên báo cáo y tế)". **[TV]** = có liên kết "Mở thư viện tham khảo". **[RO]** = ô nền xám, có vẻ chỉ đọc hoặc lấy sẵn (suy từ màu, chưa xác nhận).

### Khung cố định (mọi ảnh)
- Thanh trên: Menu, tên người dùng đăng nhập, huy hiệu số, cơ sở và đơn vị (ví dụ `OPD - Trung tâm Tim mạch`), cờ ngôn ngữ, đăng xuất.
- Banner bệnh nhân: PID / (số trong ngoặc) – Họ tên, nhãn đỏ "Đây là ca bệnh ngoại trú phức tạp", huy hiệu giới tính, biểu tượng sửa, nút **Xem LSKB**, **Mở rộng**.
- Tiêu đề: **Phiếu khám ngoại trú**.
- Thanh trạng thái lượt khám (chọn một): Đang khám · Chờ KQ CLS · Hoàn thành khám · Nhập nội trú · Chuyển cấp cứu · Chuyển CSKCB BHYT · Không khám.
- Nút thao tác: Quay lại · Báo cáo y tế · In ngay · Lưu · nút tròn (chưa rõ chức năng).

### 1. Đánh giá chung (IMG_2152)
| Nhãn | Kiểu ô | Đơn vị / lựa chọn |
|---|---|---|
| Mạch | số [RO] | nhịp/phút |
| Nhiệt độ | số [RO] | độ C |
| Huyết áp | một ô dạng `tâm thu/tâm trương` [RO] | mmHg |
| SpO2 | số [RO] | % |
| Nhịp thở | số [RO] | lần/phút |
| Chiều cao | số [RO] | cm |
| Cân nặng | số [RO] | kg |
| BMI | số [RO], có vẻ tự tính | – |
| Phòng khám | chữ [RO] | – |
| Bác sĩ khám | tài khoản + biểu tượng (i) | – |
| Thời gian khám | ngày giờ + nút lịch | `HH:mm dd/MM/yyyy` |
| Nơi giới thiệu | nút chọn một | Cơ quan y tế / Tự đến |
| Lý do đến khám [BCYT] | ô chữ nhiều dòng | – |

### Tiền sử bệnh (IMG_2152–2155)
- **+ Bản thân:** ô chữ "Tiền sử bệnh" + bảng "Thông tin khai thác tiền sử bệnh": Ngày khám · Bác sĩ khám · Khoa Phòng · Tiền sử bệnh · nút Copy mỗi dòng.
- **+ Gia đình:** ô chữ "Gia đình" + bảng "Thông tin khai thác tiền sử bệnh của người thân": cùng bốn cột + Copy.

### Dị ứng (IMG_2155–2156)
- Bảng "Thông tin khai thác tiền sử dị ứng": Ngày cập nhật · Loại phiếu (ví dụ "Phiếu Đánh giá ban đầu ngoại trú", "Phiếu khám ngoại trú") · Loại dị ứng · Thông tin dị ứng · Người cập nhật · Copy. Nút **LẤY LS DỊ ỨNG TỪ VIHC**.
- **⚠ Tiền sử dị ứng** (nhãn đỏ, có biểu tượng cảnh báo): nút chọn một **Có / Không / Không xác định**. Đây là dấu hiệu "quan trọng" duy nhất thấy trên ảnh. Ảnh không cho biết đây là trường bắt buộc.
- Ảnh không cho thấy ô loại dị ứng hay mô tả xuất hiện khi chọn "Có" (chưa chụp trạng thái này).

### Bệnh sử (IMG_2157)
- **Bệnh sử [BCYT]:** ô chữ nhiều dòng + bảng "Thông tin khai thác bệnh sử": Ngày khám · Bác sĩ khám · Khoa · Bệnh sử · Copy.

### Thuốc hiện đang dùng (IMG_2157, IMG_2159)
- Nhãn: "Thuốc hiện đang dùng (Bao gồm cả thuốc kê đơn và không kê đơn)".
- Nút chọn một: **NB không có thuốc đang dùng / NB có thuốc đang dùng**.
- Danh sách thuốc của phiếu (khi trống hiện "Không có thông tin thuốc đã dùng") + nút **Thêm thuốc**. Chưa thấy các cột của form Thêm thuốc.
- Bảng "Thông tin khai thác các thuốc đã dùng trên hệ thống": tên thuốc kèm hàm lượng, dạng, hãng, nước · số lượng · đường dùng · ngày · Copy. Ảnh không có tiêu đề cột, nên tên cột là suy đoán.

### Khám lâm sàng [BCYT] (IMG_2159–2165)
Bốn ô con, mỗi ô có **[TV]** và ô chữ nhiều dòng. Câu chọn từ thư viện được chèn thành dòng bắt đầu bằng `- ` (IMG_2164).
| Ô | Thư viện |
|---|---|
| Khám toàn thân | 7 câu mẫu, phẳng (đã có trong `data/cardiology/exam-library.json` mục `GENERAL`) |
| Khám chuyên khoa | **Cây nhiều chuyên khoa**: Khám bụng, Khám tiết niệu - sinh dục, Khám Nội cơ - Xương - Khớp, Chấn thương chỉnh hình, Khám hậu môn trực tràng, Khám Mắt, Khám Dinh dưỡng, Khám Nội tiết, Dị ứng - Miễn dịch lâm sàng, Khám Tai Mũi Họng, Khám Răng Hàm Mặt, Khám Sản, Khám Phụ, Khám Nam khoa, Khám Sơ sinh, Y học cổ truyền, Khám Phục hồi chức năng, Y học tái tạo, Khám Nội nhi, Khám Ngoại nhi, Khám Thẩm mỹ, Khám da liễu, Khám Ung bướu (ảnh mờ, đọc được tên nhóm). Khi chọn, ô ghi tên nhóm làm dòng đầu (`Khám bụng:`), sau đó là các câu |
| Khám tim mạch, hô hấp | 13 câu mẫu, phẳng (đã có trong `exam-library.json` mục `CARDIO_RESP`) |
| Khám các bộ phận khác | Có [TV], chưa chụp nội dung thư viện |

**Kết luận về hai mục khám:** "Khám chuyên khoa" là ô dùng chung cho mọi chuyên khoa và lấy câu từ cây nhiều chuyên khoa. "Khám tim mạch, hô hấp" là ô riêng, nằm ngay sau và có thư viện tim phổi riêng. Hai ô cùng hiện trên một phiếu, nên đề xuất **giữ riêng, không gộp** (chi tiết ở `02-bang-anh-xa.md`).

### Chẩn đoán (IMG_2164–2167, IMG_2172)
| Nhãn | Kiểu ô |
|---|---|
| Chẩn đoán ban đầu | chọn ICD10 (có nút xóa) + ô diễn giải "Chẩn đoán ban đầu" |
| Các xét nghiệm, thăm dò chính [BCYT] + nút LẤY KẾT QUẢ MỚI NHẤT | ba khối: Kết quả xét nghiệm, Kết quả chẩn đoán hình ảnh (+ Xem tất cả hình ảnh), Kết quả cận lâm sàng. Mỗi khối có thanh theo ngày và "Xem thêm". Khi mở một ngày: Tên dịch vụ · Người trả kết quả · Kết luận · Xem mô tả chi tiết · Copy |
| (dưới khối kết quả) | nhãn "Đồng bộ lần cuối lúc …" + ô chữ "Các xét nghiệm, thăm dò chính" |
| Thông tin chẩn đoán xác định từ OH + LẤY KẾT QUẢ MỚI NHẤT | vùng hiển thị, trống thì hiện "Không có kết quả" |
| Chẩn đoán ra viện | chọn ICD10 + ô diễn giải. IMG_2172: sau khi chọn mã, ô diễn giải hiện tên mã |
| Chẩn đoán kèm theo [BCYT] | chọn nhiều ICD10, có ô tìm (gõ chữ ra danh sách `mã, tên`) |
| Đã xử lý (thuốc, chăm sóc) | Không / Có |

### 2. Điều trị (IMG_2168–2169)
| Nhãn | Kiểu ô | Lựa chọn |
|---|---|---|
| Hướng điều trị [BCYT] [TV] | ô chữ | – |
| Lời dặn & theo dõi [BCYT] [TV] | ô chữ | – |
| Hẹn tái khám | chọn một | Có / Không. **Trên ảnh chưa nút nào được chọn** |
| Tình trạng người bệnh ra viện | chọn một | Khỏi / Đỡ, giảm / Chưa thay đổi / Nặng hơn / Khác. Chưa nút nào được chọn |

Chưa chụp trạng thái Hẹn tái khám = Có (chưa biết ô ngày xuất hiện ra sao).

### 3. Thông tin khác (IMG_2170–2171)
| Nhãn | Kiểu ô |
|---|---|
| Bác sĩ chính | chữ + (i) |
| Bác sĩ được ủy quyền khám | chữ (mặc định N/A) + nút CHỈNH SỬA ỦY QUYỀN KHÁM |
| Chuyển Nội Soi | ô tích + câu nhắc "Bác sĩ vui lòng chọn **Chờ KQ CLS** để khu vực nội soi có thể tiếp nhận bệnh nhân" |
| Xác nhận bệnh tật | Có / Không |
| Xác nhận nghỉ việc hưởng BHXH | Có / Không |
| Mã biểu mẫu | chữ cố định `A01_251_211222_V` |
| Chỉnh sửa lần cuối bởi … lúc … | chữ hệ thống |

### Phiếu điều dưỡng (IMG_2787–2789), là nguồn dữ liệu của Phiếu khám
- **Phiếu đánh giá ban đầu ngoại trú (IMG_2789):** Dấu hiệu sinh tồn gồm Mạch (nhịp/phút), Huyết áp (mmHg), Nhiệt độ (độ C), SpO2 (%), Nhịp thở (lần/phút), Chiều cao (cm), Cân nặng (kg), BMI, Ghi chú. Ngoài ra có Dị ứng (nút + mô tả), Đau, Có thai, Cho con bú (có "Không áp dụng"), Câu hỏi sàng lọc dịch tễ 3 câu + Kết quả sàng lọc, mục "2. Các thuốc đang dùng", dấu thời gian và "ĐD thực hiện".
- **Sàng lọc ngã / ngất (IMG_2787–2788, mã `A02_007_200326_VE`):** Ghi "✓" cho Có và "O" cho Không. Sàng lọc ngã có 3 câu do ĐD làm. Sàng lọc ngất có 5 câu, trong đó câu 4 "ECG bất thường" do **BS** trả lời. Có 10 biện pháp can thiệp.
- Hai phiếu này giải thích vì sao sinh hiệu trên Phiếu khám có nền xám: số liệu được ĐD nhập trước. Bảng dị ứng trên Phiếu khám cũng gom dòng từ cả "Phiếu Đánh giá ban đầu ngoại trú" và "Phiếu khám ngoại trú".

## Dấu bắt buộc

**Không ảnh nào có dấu `*` hay chữ "bắt buộc".** Chỉ "Tiền sử dị ứng" có nhãn đỏ kèm ⚠. Vì vậy mọi cột "bắt buộc" trong bảng ánh xạ đều ghi là **cần xác nhận**. Không suy ra quy tắc bắt buộc từ ảnh.

## Các phần ảnh chưa đủ bằng chứng

1. Trạng thái "Có" của Tiền sử dị ứng: có ô loại hay mô tả không.
2. Form "Thêm thuốc": các cột cần nhập.
3. Thư viện của Khám các bộ phận khác, Hướng điều trị, Lời dặn & theo dõi.
4. Hẹn tái khám = Có: ô ngày hay số ngày.
5. Màn hình **Báo cáo y tế** và bản **In ngay**: trường nào thật sự được in.
6. Cây Khám chuyên khoa: ảnh mờ. Chưa biết có nhóm "Khám Tim mạch" trong cây không.
7. Bốn trường đang có trong eForm prototype nhưng **không thấy trên ảnh**: "Có phẫu thuật/thủ thuật", "Giai đoạn chẩn đoán kèm", "Xác nhận người mẹ không đủ sức khỏe chăm sóc con", "Loại dị ứng" dạng ô tích (xem `02-bang-anh-xa.md` mục C).
