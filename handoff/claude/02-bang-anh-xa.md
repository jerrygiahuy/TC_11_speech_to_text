# 02 — Bảng ánh xạ Phiếu khám ngoại trú Tim mạch

Đầu vào cho Codex: schema đầu ra AI, prompt, mapper, eForm và bản in. Bảng đối chiếu ba nguồn: ảnh (`01-ra-soat-anh.md`), `docs/tim_mach/vinmec_opd_schema_tong_hop.md` (gọi tắt **SCH**), `data/cardiology/data-dictionary.json` (gọi tắt **DD**), cùng code hiện tại: `config/forms/phieu-kham.json`, `config/clinical/common.schema.json#/$defs/phieuKham`, `src/shared/eform/dien-phieu.ts`, `src/client/eform/EformForm.tsx` và `BanIn.tsx`.

## Cách đọc

- **Khóa eForm:** id trường trong `EformForm.tsx` / `Truong`. Khóa *in nghiêng* là khóa mới đề xuất.
- **Khóa AI:** đường dẫn trong `phieuKham` của `config/clinical/common.schema.json`. Khóa *in nghiêng* là khóa mới đề xuất.
- **Nguồn điền:**
  - `LK`: lấy từ lượt khám hoặc hệ thống (hành chính, ĐD đã đo, lịch sử).
  - `HT`: lấy từ hội thoại hoặc lời đọc bổ sung, AI trích ra.
  - `BS`: bác sĩ tự nhập hoặc tự chọn.
  - `CODE`: code khớp danh mục gán (`src/shared/match.ts`), LLM không điền.
- **Khi thiếu:** cách xử lý khi nguồn không có thông tin. Quy ước chung: **chưa có thông tin = `null` / ô trống / chưa chọn nút nào**. Không quy thành "Không".
- **Bản in:** nhãn đề xuất trong `BanIn.tsx`. **[BCYT]** = màn hình ghi "Hiển thị trên báo cáo y tế". "–" = không in.
- **Mức xác minh:**
  - `SEEN`: nhãn và kiểu ô thấy trên ảnh.
  - `SEEN-mờ`: thấy nhưng ảnh mờ.
  - `SEEN-ĐD`: thấy trên phiếu điều dưỡng.
  - `PROPOSED`: đề xuất, chưa có ảnh.
  - `CẦN XÁC NHẬN`: ảnh không đủ để quyết định, có câu hỏi trong `03-cau-hoi-bac-si.md` (ghi `Qn`).
- **Bắt buộc:** ảnh không có dấu bắt buộc (xem `01`). Cột này chỉ ghi đề xuất của SCH/DD, mọi giá trị đều **chờ xác nhận ở Q1**.

## A. Bảng ánh xạ theo trường

### A1. Đầu phiếu và hành chính (nguồn `LK`, AI không điền)

| Nhãn gốc | Khóa eForm | Khóa AI | Nguồn | Khi thiếu | eForm | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|---|---|
| PID | `ca.pid` | – | LK | không mở phiếu | banner, chỉ đọc | PID | 2152 | SEEN |
| Số trong ngoặc sau PID | `ca.ma_luot_kham` | – | LK | để trống | banner | Mã lượt khám | 2152 | SEEN, ý nghĩa CẦN XÁC NHẬN (SCH Q1 IT) |
| Họ tên | `ca.ho_ten` | – | LK | – | banner | Họ tên | 2152 | SEEN |
| Giới tính | `ca.gioi_tinh` | – | LK | – | huy hiệu banner | Giới tính | 2152 | SEEN |
| Nhãn "ca bệnh ngoại trú phức tạp" | *`ca.ca_phuc_tap`* | – | LK | ẩn nhãn | nhãn đỏ banner | – | 2152 | SEEN, ý nghĩa CẦN XÁC NHẬN Q14 |
| Cơ sở / đơn vị | `ca.co_so` | – | LK | – | thanh trên | (đầu trang in) | 2152 | SEEN. Đặt giá trị mock `OPD - Trung tâm Tim mạch` |
| Phòng khám | `ca.phong_kham` | – | LK | – | chỉ đọc | – | 2152 | SEEN. Mock "PK Nội tim mạch" |
| Bác sĩ khám | `ca.bac_si_kham` | – | LK | – | chỉ đọc | – | 2152 | SEEN |
| Thời gian khám | `thoi_gian_kham` | – | LK | giờ mở phiếu | ngày giờ | Thời gian khám | 2152 | SEEN |
| Nơi giới thiệu | `noi_gioi_thieu` | – | LK/BS | chưa chọn | Cơ quan y tế / Tự đến | – | 2152 | SEEN |
| Trạng thái lượt khám | `trang_thai` | – | BS | Đang khám | thanh nút cuối | Trạng thái | mọi ảnh | SEEN |
| Mã biểu mẫu | *`ma_bieu_mau`* | – | hằng | – | chữ cuối phiếu | chân trang in | 2170 | SEEN (`A01_251_211222_V`) |
| Chỉnh sửa lần cuối bởi … lúc … | `ca.chinh_sua_cuoi` | – | hệ thống | ẩn | chữ cuối phiếu | – | 2171 | SEEN |

### A2. Sinh hiệu (nguồn `LK`, ĐD nhập trên Phiếu đánh giá ban đầu)

Trên Phiếu khám, các ô này nền xám và đặt đầu mục 1. Số liệu đến từ phiếu ĐD (IMG_2789). **Đề xuất:** AI không ghi đè sinh hiệu. Nếu hội thoại nói một số khác với số của lượt khám, hiện cảnh báo "lệch nguồn" để bác sĩ chọn, giữ nguyên số và đơn vị theo nguồn. Q4.

| Nhãn gốc | Khóa eForm | Khóa AI | Nguồn | Khi thiếu | Đơn vị | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|---|---|
| Mạch | `ca.sinh_hieu.mach` | (chỉ bằng chứng) | LK | "chưa đo", không lấy 0 | nhịp/phút | dòng Sinh hiệu | 2152, 2789 | SEEN, SEEN-ĐD |
| Nhiệt độ | `…nhiet_do` | – | LK | chưa đo | độ C | dòng Sinh hiệu | 2152, 2789 | SEEN |
| Huyết áp | `…ha_tam_thu` / `…ha_tam_truong` | – | LK | chưa đo | mmHg, hiện `tâm thu/tâm trương` trong **một** ô | dòng Sinh hiệu | 2152, 2789 | SEEN |
| SpO2 | `…spo2` | – | LK | chưa đo | % | dòng Sinh hiệu | 2152, 2789 | SEEN |
| Nhịp thở | `…nhip_tho` | – | LK | chưa đo | lần/phút | dòng Sinh hiệu | 2152, 2789 | SEEN |
| Chiều cao | `…chieu_cao` | – | LK | chưa đo | cm | dòng Sinh hiệu | 2152, 2789 | SEEN |
| Cân nặng | `…can_nang` | – | LK | chưa đo | kg | dòng Sinh hiệu | 2152, 2789 | SEEN |
| BMI | tính trong `EformHeader.tsx` | – | tính | trống nếu thiếu cao hoặc nặng | – | dòng Sinh hiệu | 2152, 2789 | SEEN |
| Ghi chú sinh hiệu | *`ca.sinh_hieu.ghi_chu`* | – | LK | ẩn | – | – | 2789 | SEEN-ĐD, chỉ có trên phiếu ĐD |

`SinhHieu` trong `src/shared/eform/types.ts` đang khai báo kiểu `number` bắt buộc. Cần cho phép `null` để biểu diễn "chưa đo".

### A3. Lý do khám, tiền sử, dị ứng, bệnh sử, thuốc

| Nhãn gốc | Khóa eForm | Khóa AI | Nguồn | Khi thiếu | eForm | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|---|---|
| Lý do đến khám [BCYT] | `ly_do` | `ly_do_kham` | HT | `null`, ô trống, đưa vào danh sách thiếu | ô chữ | Lý do đến khám | 2152 | SEEN. DD ghi bắt buộc, chờ Q1 |
| Tiền sử bệnh, Bản thân | `tien_su_ban_than` | `tien_su_ban_than` | HT + LK (bảng lịch sử, BS bấm Copy) | trống. **Không tự chép lịch sử vào ô** | ô chữ + bảng lịch sử | Tiền sử bản thân | 2153–2154 | SEEN |
| Bảng "Thông tin khai thác tiền sử bệnh" | `ca.lich_su.tien_su_ban_than[]` | – | LK | ẩn bảng | Ngày khám · BS khám · Khoa Phòng · Tiền sử bệnh · Copy | – | 2153 | SEEN |
| Tiền sử bệnh, Gia đình | `tien_su_gia_dinh` | `tien_su_gia_dinh` | HT + LK | trống. Giữ nguyên câu "không rõ" nếu được nói, **không** đổi thành "không có" | ô chữ + bảng | Tiền sử gia đình | 2154–2155 | SEEN |
| Bảng "…tiền sử bệnh của người thân" | `ca.lich_su.tien_su_gia_dinh[]` | – | LK | ẩn | 4 cột + Copy | – | 2154 | SEEN |
| Bảng "Thông tin khai thác tiền sử dị ứng" + LẤY LS DỊ ỨNG TỪ VIHC | `ca.lich_su.di_ung[]` | – | LK | ẩn | Ngày cập nhật · Loại phiếu · Loại dị ứng · Thông tin dị ứng · Người cập nhật · Copy | – | 2155–2156 | SEEN |
| ⚠ Tiền sử dị ứng | `di_ung` | `di_ung.trang_thai` | HT, BS xác nhận | `chua_de_cap` → **không chọn nút nào** và hiện cảnh báo. Chỉ "Không" khi có câu phủ định rõ. "Không xác định" khi BN không biết | Có / Không / Không xác định | Tiền sử dị ứng | 2156 | SEEN. Ánh xạ cụm "chưa ghi nhận": Q6 |
| Chi tiết dị ứng khi "Có" | `di_ung_loai`, `di_ung_mo_ta` | `di_ung.loai`, `di_ung.mo_ta` | HT | trống, cảnh báo "Có nhưng chưa ghi tác nhân" | eForm hiện đang dùng ô tích loại + ô mô tả | ghép vào Tiền sử dị ứng | – | CẦN XÁC NHẬN Q5 (chưa chụp trạng thái "Có") |
| Bệnh sử [BCYT] | `benh_su` | `benh_su` | HT + LK (bảng) | trống | ô chữ + bảng "Thông tin khai thác bệnh sử" | Bệnh sử | 2157 | SEEN |
| Thuốc hiện đang dùng (cả kê đơn và không kê đơn) | `thuoc_dang_dung` | `co_thuoc_dang_dung` | HT, BS xác nhận | `null` → **không chọn nút nào**. Chỉ "NB không có…" khi hội thoại phủ định rõ | NB không có thuốc đang dùng / NB có thuốc đang dùng | *Thuốc đang dùng* (mới) | 2157, 2159 | SEEN |
| Danh sách thuốc của phiếu + Thêm thuốc | *`thuoc_dang_dung_ds[]`* | `thuoc_dang_dung[]` (`ten`, `ham_luong`, `cach_dung`, `trang_thai`) | HT | rỗng. Cảnh báo nếu chọn "NB có" mà danh sách rỗng (SCH R8) | danh sách + nút Thêm thuốc | *Thuốc đang dùng*: `tên hàm lượng, cách dùng` mỗi dòng | 2159 | SEEN (ô danh sách), cột form Thêm thuốc CẦN XÁC NHẬN Q7 |
| Bảng "…các thuốc đã dùng trên hệ thống" | *`ca.lich_su.thuoc[]`* | – | LK | ẩn | tên thuốc · số lượng · đường dùng · ngày · Copy | – | 2159 | SEEN, tên cột suy đoán |

Giữ hàm lượng và cách dùng như nguồn nói, kể cả dấu phẩy thập phân (`2,5 mg`). Không chuẩn hóa tên biệt dược thành hoạt chất.

### A4. Khám lâm sàng [BCYT]

| Nhãn gốc | Khóa eForm | Khóa AI | Nguồn | Khi thiếu | eForm | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|---|---|
| Khám toàn thân [TV] | `kham_toan_than` | `kham_toan_than` | HT; BS chọn thư viện | trống. **Không tự chèn câu "bình thường" của thư viện** | ô chữ + thư viện 7 câu (`exam-library.json#GENERAL`) | Khám toàn thân | 2159–2161, 2164 | SEEN |
| Khám chuyên khoa [TV] | `kham_chuyen_khoa` | `kham_chuyen_khoa`: đổi `$defs/exam` từ `{mo_ta,tai,mui,vom,hong}` thành chuỗi hoặc `{mo_ta}` | HT (chỉ khi BS khám cơ quan ngoài tim phổi, ví dụ bụng) | trống. Ca Tim mạch thường để trống | ô chữ + cây nhiều chuyên khoa, dòng đầu là tên nhóm (`Khám bụng:`) | Khám chuyên khoa | 2159, 2162, 2164 | SEEN-mờ (cây). Bỏ nhãn "TMH" và nút Tai/Mũi/Vòm/Họng |
| **Khám tim mạch, hô hấp** [TV] | *`kham_tim_mach_ho_hap`* | *`kham_tim_mach_ho_hap`* | HT (câu bác sĩ nói khi khám tim, phổi) | trống, đưa vào danh sách thiếu. DD ghi bắt buộc với Tim mạch, chờ Q1 | ô chữ + thư viện 13 câu (`exam-library.json#CARDIO_RESP`) | Khám tim mạch, hô hấp | 2163–2164 | SEEN. **Trường mới**, hiện code chưa có ở đâu |
| Khám các bộ phận khác [TV] | `kham_khac` | `kham_khac` | HT | trống. Không tự điền "Chưa ghi nhận bất thường" | ô chữ + thư viện | Khám các bộ phận khác | 2164–2165 | SEEN. Ranh giới với khám tim phổi (ví dụ phù chân): Q3 |

**Quyết định về hai mục khám: giữ riêng.**
- Bằng chứng: IMG_2164 cho thấy hai ô liền nhau, mỗi ô có thư viện riêng. Thư viện Khám chuyên khoa là cây nhiều chuyên khoa (IMG_2162). Thư viện Khám tim mạch, hô hấp là danh sách tim phổi phẳng (IMG_2163). Ca trên ảnh của Trung tâm Tim mạch ghi khám bụng vào "Khám chuyên khoa" và khám tim phổi vào "Khám tim mạch, hô hấp".
- Quy tắc trích cho AI: câu về tim, mạch ngoại vi, tĩnh mạch cổ, lồng ngực, phổi → `kham_tim_mach_ho_hap`. Câu về cơ quan khác (bụng, thần kinh...) → `kham_chuyen_khoa`, có tên nhóm ở đầu. Câu "không ghi nhận bất thường" chung → `kham_khac`.
- Chờ bác sĩ xác nhận ở Q2.

### A5. Chẩn đoán và kết quả

| Nhãn gốc | Khóa eForm | Khóa AI | Nguồn | Khi thiếu | eForm | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|---|---|
| Chẩn đoán ban đầu: diễn giải | `mo_ta_ban_dau` | `chan_doan[]` có `giai_doan ∈ {ban_dau, chua_ro}` và `vai_tro = chinh` | HT | trống, danh sách thiếu | ô chữ | **Chẩn đoán ban đầu** (in riêng) | 2164–2165 | SEEN |
| Chẩn đoán ban đầu: ICD10 | `icd_ban_dau` | – | CODE, nguồn `xem` | trống. Không có mã khớp thì để trống (ví dụ "Đau ngực cần đánh giá…") | chọn ICD | ghép trước diễn giải | 2164 | SEEN |
| Các xét nghiệm, thăm dò chính [BCYT]: khối kết quả | `ca.xet_nghiem[]`, `ca.chan_doan_hinh_anh[]`, `ca.can_lam_sang[]` | – | LK (bấm LẤY KẾT QUẢ MỚI NHẤT) | "Không có kết quả" | 3 khối theo ngày; mở ra: Tên dịch vụ · Người trả kết quả · Kết luận · Copy | – | 2165–2166, 2173 | SEEN |
| Các xét nghiệm, thăm dò chính: ô tóm tắt | `ghi_chu_kq` (đổi nhãn eForm từ "Ghi chú kết quả" thành "Các xét nghiệm, thăm dò chính") | `ghi_chu_ket_qua` | HT (**chỉ kết quả đã có**) + BS Copy | trống | ô chữ dưới nhãn "Đồng bộ lần cuối lúc" | Xét nghiệm, thăm dò chính | 2167 | SEEN |
| Chỉ định mới (không nằm trên Phiếu khám) | (màn Chỉ định) | `chi_dinh` (`de_cap`, `items[]`) | HT, CODE gán mã dịch vụ | `de_cap = chua_de_cap`, không tạo dòng | màn Chỉ định | bảng chỉ định trên bản in | – | SCH ghi ngoài phạm vi phiếu. **Không gộp vào `ghi_chu_kq`** |
| Thông tin chẩn đoán xác định từ OH | *`ca.chan_doan_oh[]`* | – | LK | "Không có kết quả" | vùng hiển thị + nút | – | 2167 | SEEN. Nghĩa của "OH": SCH Q4 IT |
| Chẩn đoán ra viện: diễn giải | `mo_ta_ra_vien` | `chan_doan[]` có `giai_doan = ra_vien` | HT **chỉ khi BS nói rõ là kết luận cuối lượt** | **trống**. Không chép từ chẩn đoán ban đầu. Có thể hiện nút "Dùng chẩn đoán ban đầu" để BS bấm | ô chữ | **Chẩn đoán ra viện** (in riêng, trống thì bỏ dòng) | 2167, 2172 | SEEN. Nghĩa trong ngoại trú: Q8 |
| Chẩn đoán ra viện: ICD10 | `icd_ra_vien` | – | CODE | trống | chọn ICD; chọn mã thì ô diễn giải tự hiện tên mã (2172) | ghép trước diễn giải | 2172 | SEEN |
| Chẩn đoán kèm theo [BCYT] | `icd_kem_theo` (danh sách mã, phân cách bằng dấu phẩy) | `chan_doan[]` có `vai_tro = kem_theo` | HT (BS nói rõ là chẩn đoán) → CODE | trống. **Bệnh chỉ nêu ở tiền sử không tự thành chẩn đoán kèm**, chỉ hiện gợi ý | chọn nhiều ICD có ô tìm, không trùng mã (SCH R6) | Chẩn đoán kèm theo | 2167, 2172 | SEEN |
| Đã xử lý (thuốc, chăm sóc) | `da_xu_ly` | `da_xu_ly` | HT/BS | chưa chọn (SCH đề xuất mặc định Không, ảnh cũng chưa chọn) | Không / Có | – | 2167 | SEEN |

### A6. 2. Điều trị

| Nhãn gốc | Khóa eForm | Khóa AI | Nguồn | Khi thiếu | eForm | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|---|---|
| Hướng điều trị [BCYT] [TV] | `huong_dieu_tri` | `huong_dieu_tri` | HT | trống | ô chữ + thư viện | Hướng điều trị | 2168 | SEEN. Thư viện chưa chụp |
| Lời dặn & theo dõi [BCYT] [TV] | `loi_dan` | `loi_dan` | HT | trống | ô chữ + thư viện | Lời dặn & theo dõi | 2168 | SEEN |
| Hẹn tái khám | `hen_tai_kham` | `hen_tai_kham.co_hen` | HT | **chưa chọn**. Chỉ "Không" khi BS nói không hẹn. Bỏ `hen_tai_kham` khỏi `O_CHON_MAC_DINH` trong `dien-phieu.ts` | Có / Không | Hẹn tái khám | 2168 | SEEN, ảnh không có mặc định |
| Ngày / khoảng tái khám | `ngay_tai_kham` | `hen_tai_kham.sau_bao_lau`, `ngay_cu_the`, `nguyen_van` | HT; code tính ngày từ `thoi_gian_kham` | trống. Có "Có" nhưng thiếu khoảng thì cảnh báo | ô ngày (hiện khi Có) | ngày dd/MM/yyyy (+ câu gốc) | – | CẦN XÁC NHẬN Q9 (chưa chụp trạng thái Có) |
| Tình trạng người bệnh ra viện | `tinh_trang_ra_vien` | `tinh_trang_ra_vien` | BS | chưa chọn | Khỏi / Đỡ, giảm / Chưa thay đổi / Nặng hơn / Khác | Tình trạng ra viện | 2168 | SEEN. Nhãn đầy đủ đã thấy, SCH bị cắt |

### A7. 3. Thông tin khác (nguồn `LK`/`BS`, AI không điền)

| Nhãn gốc | Khóa eForm | Nguồn | eForm | Bản in | Ảnh | Xác minh |
|---|---|---|---|---|---|---|
| Bác sĩ chính | `ca.bac_si_chinh` | LK | chỉ đọc | – | 2170 | SEEN |
| Bác sĩ được ủy quyền khám + CHỈNH SỬA ỦY QUYỀN KHÁM | `bs_uy_quyen` | BS | N/A + nút | – | 2170 | SEEN |
| Chuyển Nội Soi | `chuyen_noi_soi` | BS | ô tích + câu nhắc chọn Chờ KQ CLS | – | 2170 | SEEN |
| Xác nhận bệnh tật | `xn_benh_tat` | BS | Có / Không | – | 2170 | SEEN |
| Xác nhận nghỉ việc hưởng BHXH | `xn_bhxh` | BS | Có / Không | – | 2170 | SEEN |

## B. Thay đổi so với code hiện tại (để Codex lập việc)

| # | Chỗ trong code | Hiện tại | Theo bảng ánh xạ |
|---|---|---|---|
| B1 | `config/forms/phieu-kham.json` id `kham_chuyen_khoa` | nhãn "Khám chuyên khoa TMH", từ khóa mock là tai/mũi/họng | đổi nhãn thành "Khám chuyên khoa"; thêm trường `kham_tim_mach_ho_hap` với từ khóa mock như "khám tim phổi", "khám tim mạch", "tim", "phổi" |
| B2 | `common.schema.json#/$defs/exam` | `{mo_ta, tai, mui, vom, hong}` bắt buộc | bỏ bốn vùng TMH; thêm `kham_tim_mach_ho_hap` vào `phieuKham.required` |
| B3 | `dien-phieu.ts` `ANH_XA` | nhãn "Khám chuyên khoa TMH" | đổi nhãn, thêm dòng `kham_tim_mach_ho_hap` |
| B4 | `dien-phieu.ts` mục chẩn đoán | khi `!clinicalOnly`, chép `chan_doan_chinh` vào **cả** ban đầu và ra viện | chỉ điền ra viện khi `giai_doan = ra_vien`. Không chép ban đầu sang ra viện |
| B5 | `dien-phieu.ts` `O_CHON_MAC_DINH` | coi `hen_tai_kham` có sẵn "Không" | ảnh không có mặc định; `null` = chưa chọn |
| B6 | `BanIn.tsx` `chanDoanIn` | in **một** chẩn đoán (ra viện nếu có, không thì ban đầu) | in riêng hai dòng Chẩn đoán ban đầu và Chẩn đoán ra viện; dòng trống thì bỏ |
| B7 | `BanIn.tsx` danh sách `truong` | không in Thuốc đang dùng, không có Khám tim mạch, hô hấp; nhãn "Khám chuyên khoa TMH" | thêm "Thuốc đang dùng" và "Khám tim mạch, hô hấp"; đổi nhãn |
| B8 | `EformForm.tsx` `KhamChuyenKhoa` | nhãn "(Tai/Mũi/Vòm/Họng)", nút AI mẫu câu theo vùng TMH | ô chữ thường + thư viện; thêm ô Khám tim mạch, hô hấp ngay sau, thư viện lấy từ `exam-library.json#CARDIO_RESP` |
| B9 | `EformForm.tsx` `thuoc_dang_dung` | chỉ nút chọn, nhãn "NB không có / NB có" | nhãn đầy đủ như ảnh; thêm danh sách thuốc + Thêm thuốc; trạng thái chưa chọn |
| B10 | `EformForm.tsx` `ghi_chu_kq` | nhãn "Ghi chú kết quả" | nhãn "Các xét nghiệm, thăm dò chính" như ảnh |
| B11 | `types.ts` `SinhHieu` | `number` bắt buộc | `number \| null` để biểu diễn "chưa đo" |
| B12 | `config/forms/phieu-kham.json` `tien_su` | gợi ý "Tiền sử bệnh, dị ứng, phẫu thuật" | tách dị ứng ra khỏi tiền sử; bản tiền sử chỉ gồm bản thân. Gia đình là trường riêng |

## C. Trường có trong eForm nhưng không thấy trên ảnh

Không xóa. Ẩn hoặc giữ tùy Q10. Nếu giữ thì ghi rõ "không có trên phiếu thật".

| Khóa eForm | Nhãn trong code | Ghi chú |
|---|---|---|
| `co_pttt` | Có phẫu thuật/thủ thuật | Không thấy trong Khám lâm sàng ở IMG_2159–2164 |
| `giai_doan_kem_theo` | Giai đoạn chẩn đoán kèm | Không thấy |
| `xn_me` | Xác nhận người mẹ không đủ sức khỏe chăm sóc con | IMG_2170–2171 chỉ có Xác nhận bệnh tật và BHXH |
| `di_ung_loai` (ô tích) | Loại dị ứng | Có cột "Loại dị ứng" trong bảng lịch sử. Chưa thấy ô nhập |

## D. Lệch giữa bộ 60 ca mock và bảng này

Các điểm cần Codex xử lý khi chấm ca, vì bộ ca không sai về dữ liệu nhưng `reference_note` mâu thuẫn với quy tắc "chỉ điền khi có căn cứ":

1. **Chẩn đoán ra viện:** cả 60 ca có `diagnoses.discharge` giống hệt `initial`, trong khi hội thoại chỉ nói "Chẩn đoán: …" một lần. Khi chấm, coi ra viện là "cần bác sĩ xác nhận", không tính AI bỏ sót.
2. **Chẩn đoán kèm theo** (13–18, 31–36, 55–60): `secondary` có mã, nhưng hội thoại chỉ nêu bệnh đó ở "Tiền sử bản thân" (ví dụ ca 013). Kỳ vọng: không tự điền, chỉ gợi ý.
3. **Sinh hiệu:** `vital_signs` có nhiệt độ, nhịp thở, cân nặng, chiều cao, `source = OMRON`, nhưng hội thoại chỉ đọc mạch, HA, SpO2. Các số này là dữ liệu lượt khám (`LK`). Không chấm AI theo những số này.
4. **`missing_fields` của ca RECOVERED** là `[]`. Đó là trạng thái sau khi đọc bổ sung. Danh sách thiếu của giai đoạn trước khi đọc bổ sung phải tự suy ra: trường có trong `recovery_dictation` mà không có trong `conversation_text`.
5. **Mã ICD trong `reference_note`** chỉ là mã tham chiếu để chấm. Theo CLAUDE.md quy tắc 3, mã trên phiếu phải do `match.ts` gán từ danh mục Tim mạch. Danh mục hiện tại là TMH, xem `05-du-lieu-thay-tmh.md`.
