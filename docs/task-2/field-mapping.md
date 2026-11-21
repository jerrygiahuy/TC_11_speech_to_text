# Ánh xạ trường phiếu khám và chỉ định dịch vụ → JSON

Task 2, 3, 4 chỉ bao phủ phiếu khám và chỉ định dịch vụ. Bác sĩ tự kê đơn qua quy trình riêng. Dị ứng và thuốc đã/đang dùng là thông tin bệnh sử được giữ; thuốc kê mới không được đưa vào các trường bệnh sử, hướng điều trị hoặc lời dặn.

Các đường dẫn dưới đây tương đối với `encounter` trừ khi ghi `identity`. `i`, `j` là vị trí minh họa; khi lưu/merge phải dùng ID dòng. Nguồn **AI** luôn có nghĩa bản nháp cần duyệt và chỉ từ dữ kiện được nói.

Ký hiệu: **QS** = thấy trong ghi chép màn thật; **UI** = có trong prototype; **ĐX** = đề xuất để dữ liệu có nghĩa rõ hơn, chưa khẳng định màn thật có ô này. Các nút/tìm kiếm/tab không phải dữ liệu hồ sơ; phân biệt ở phần cuối.

## A. Header, lịch khám, sinh hiệu

| Trường | Đường dẫn | Nguồn / lưu ý |
|---|---|---|
| Tài khoản đăng nhập | `identity.practitioners[].login_account` | Session đăng nhập, không AI; QS |
| Cơ sở / khoa / phòng | `facility_id`, `department_id`, `room_id` | HIS/session; tên hiển thị tra bảng cơ sở/khoa/phòng; QS |
| Ward / buồng / giường | `room_id`, `bed_id` | HIS/nhập tay; chưa có dữ liệu thì null; QS |
| PID | `patient_id` → `identity.patient.external_patient_id` | Backend nối danh tính, không model; QS |
| Mã lượt khám | `id`, `appointment_id` | Backend; mã cạnh PID chưa rõ, không tự đồng nhất; QS/ĐX |
| Họ tên / giới tính | `identity.patient.ho_ten`, `.gioi_tinh` | Nguồn tiếp đón; chỉ quyền đọc phù hợp; QS |
| Ngày sinh / tuổi | `identity.patient.ngay_sinh`, `tuoi_thang_tai_kham` | Ngày sinh từ tiếp đón; tuổi là snapshot theo ngày khám; ĐX theo luồng lịch khám |
| Liên lạc / giấy tờ / người đưa trẻ đến | `identity.patient` | Không thuộc AI payload; ĐX phục vụ lưu và in |
| Bác sĩ khám | `examiner_id` → `identity.practitioners` | Session/ủy quyền, không suy từ lời nói; QS |
| Bác sĩ chính / bác sĩ ủy quyền | `primary_doctor_id`, `delegated_doctor_id` | Backend có quyền; QS |
| Chỉnh sửa lần cuối bởi / lúc | `audit.updated_by`, `.updated_at` | Server tự ghi; QS |
| Phiếu đánh giá ban đầu thu gọn | `danh_gia_ban_dau[]` | Nguồn điều dưỡng/HIS, nhãn + giá trị + source record; QS |
| Mạch | `sinh_hieu.mach` | Số + `/min`, nguồn điều dưỡng/HIS; QS |
| Nhiệt độ | `sinh_hieu.nhiet_do` | Số + `Cel`; QS |
| Huyết áp tâm thu / tâm trương | `sinh_hieu.ha_tam_thu`, `.ha_tam_truong` | Tách hai số + `mm[Hg]`; QS |
| SpO2 | `sinh_hieu.spo2` | Số + `%`; QS |
| Nhịp thở | `sinh_hieu.nhip_tho` | Số + `/min`; QS |
| Chiều cao / cân nặng | `sinh_hieu.chieu_cao`, `.can_nang` | Số + `cm`/`kg`, giữ thời điểm đo; QS |
| BMI | `sinh_hieu.bmi` | Tính từ chiều cao/cân nặng hợp lệ, nguồn `tinh_toan`, không AI; QS |
| Thời gian khám | `encounter_at` | `thoi_gian_kham` của UI; thời điểm có offset; QS/UI |
| Nơi giới thiệu | `referral_source` | `noi_gioi_thieu`: Cơ quan y tế → `co_quan_y_te`, Tự đến → `tu_den`; QS/UI |
| Trạng thái lượt khám | `status` | Danh mục chuyển đổi bên dưới; bác sĩ thao tác; QS/UI |

## B. Phiếu khám

| Trường / ID UI | Đường dẫn | Nguồn / quy tắc |
|---|---|---|
| Lý do đến khám / `ly_do` | `phieu_kham.ly_do_kham` | AI/nhập tay; config cũ dùng `ly_do_kham`; QS/UI |
| Bệnh sử / `benh_su` | `phieu_kham.benh_su` | AI từ bệnh nhân/bác sĩ, giữ phủ định và diễn biến; QS/UI |
| Tiền sử bản thân / `tien_su_ban_than` | `phieu_kham.tien_su_ban_than` | Config cũ `tien_su` chỉ map vào đây, không trộn gia đình; QS/UI |
| Tiền sử gia đình / `tien_su_gia_dinh` | `phieu_kham.tien_su_gia_dinh` | Chỉ nội dung liên quan bệnh; QS/UI |
| Tiền sử dị ứng / `di_ung` | `phieu_kham.di_ung.trang_thai` | Có/Không/Không xác định; chưa đề cập để riêng; QS/UI |
| Loại dị ứng / `di_ung_loai` | `phieu_kham.di_ung.loai[]` | UI hiện dùng chuỗi CSV, adapter đổi mảng; QS/UI |
| Mô tả dị ứng / `di_ung_mo_ta` | `phieu_kham.di_ung.mo_ta` | Có thể chưa rõ tác nhân, không tự hoàn thiện; QS/UI |
| Cảnh báo dị ứng header | Tổng hợp từ dị ứng hiện tại + lịch sử liên quan | View suy ra, không lưu một chuỗi cảnh báo độc lập dễ lệch; QS/UI |
| Có thuốc đang dùng / `thuoc_dang_dung` | `phieu_kham.co_thuoc_dang_dung` | NB có/không có → true/false; chưa hỏi → null; QS/UI |
| Chi tiết thuốc đang dùng | `phieu_kham.thuoc_dang_dung[]` | Tên, hàm lượng, cách dùng, trạng thái; **ĐX**, trường con màn thật chưa thấy |
| Khám toàn thân / `kham_toan_than` | `phieu_kham.kham_toan_than` | Chỉ kết quả bác sĩ nói/nhập; QS/UI |
| Khám chuyên khoa / `kham_chuyen_khoa` | `phieu_kham.kham_chuyen_khoa` | Chuỗi; chỉ khi bác sĩ khám cơ quan ngoài tim phổi (vd bụng), có tên nhóm ở đầu. Schema 2.0.0 chỉ có một chuỗi; QS/UI |
| Khám tim mạch, hô hấp / `kham_tim_mach_ho_hap` | `phieu_kham.kham_tim_mach_ho_hap` | Chuỗi (mới ở 2.0.0): câu về tim, mạch ngoại vi, tĩnh mạch cổ, lồng ngực, phổi; QS/UI |
| Khám khác / `kham_khac` | `phieu_kham.kham_khac` | Không điền “bình thường” mặc định; QS/UI |
| Chẩn đoán ban đầu / `icd_ban_dau`, `mo_ta_ban_dau` | `chan_doan[i]` có `noi_dung.giai_doan=ban_dau` | Mô tả từ bác sĩ; mã từ danh mục/bác sĩ; QS/UI |
| Chẩn đoán ra viện / `icd_ra_vien`, `mo_ta_ra_vien` | `chan_doan[i]` có `noi_dung.giai_doan=ra_vien` | Không tự copy ban đầu; config cũ `chan_doan_chinh` không xác định giai đoạn nên cần adapter thận trọng; QS/UI |
| Chẩn đoán kèm / `icd_kem_theo` | `chan_doan[]` có `noi_dung.vai_tro=kem_theo` | Nhiều dòng, vẫn giữ giai đoạn ban đầu/ra viện/chưa rõ; adapter UI có thể dùng CSV mã; QS/UI |
| Mã ICD / tên ICD | `chan_doan[i].icd.code`, `.display`, `.code_system` | Chỉ mã đã xác minh; danh mục tham khảo không phải tự động mã bệnh viện; QS |
| Kết quả xét nghiệm | `ket_qua[]` nhom=`xet_nghiem` | HIS/lab; source ID, thời điểm, trạng thái, số/đơn vị hoặc text; QS/UI |
| Kết quả CĐHA | `ket_qua[]` nhom=`chan_doan_hinh_anh` | HIS/RIS/PACS qua backend; tài liệu ảnh chỉ reference có quyền; QS/UI |
| Kết quả CLS khác | `ket_qua[]` nhom=`can_lam_sang` | Tách khỏi chỉ định chưa thực hiện; QS/UI |
| Đồng bộ CLS lần cuối | `dong_bo_cls_luc` | Server đồng bộ, không AI; QS/UI |
| Ghi chú kết quả / `ghi_chu_kq` | `phieu_kham.ghi_chu_ket_qua` | Diễn giải bác sĩ, không thay kết quả chính thức; QS/UI |
| Chẩn đoán xác định từ OH | `chan_doan[]` + provenance `source_system/source_record_id` qua nguồn | Chỉ import khi biết contract OH; nút lấy kết quả không tạo chẩn đoán; QS |
| Đã xử lý / `da_xu_ly` | `phieu_kham.da_xu_ly` | Có/Không/null; QS/UI |
| Hướng điều trị / `huong_dieu_tri` | `phieu_kham.huong_dieu_tri` | Kế hoạch bác sĩ đã nói; QS/UI |
| Lời dặn / `loi_dan` | `phieu_kham.loi_dan` | Nội dung bác sĩ đã nói; QS/UI |
| Hẹn tái khám / `hen_tai_kham` | `phieu_kham.hen_tai_kham.co_hen` | Có/Không/null; QS/UI |
| Ngày tái khám / `ngay_tai_kham` | `phieu_kham.hen_tai_kham.ngay_cu_the` | Có trong UI, chưa rõ màn thật; **UI/ĐX** |
| Hẹn sau khoảng thời gian | `phieu_kham.hen_tai_kham.sau_bao_lau`, `.nguyen_van` | Không mất “sau 3 ngày” khi chưa đủ căn cứ tính ngày; ĐX |
| Tình trạng ra viện / `tinh_trang_ra_vien` | `phieu_kham.tinh_trang_ra_vien` | Khỏi → `khoi`, Đỡ/giảm → `do_giam`, Chưa thay đổi → `chua_thay_doi`, Nặng hơn → `nang_hon`, Khác → `khac`; QS/UI |
| Chuyển nội soi / `chuyen_noi_soi` | `thong_tin_khac.chuyen_noi_soi` | Bác sĩ chọn, kiểm trạng thái Chờ KQ CLS; QS/UI |
| Xác nhận bệnh tật / `xn_benh_tat` | `thong_tin_khac.xn_benh_tat` | Bác sĩ, không AI tự xác nhận; QS/UI |
| Xác nhận BHXH / `xn_bhxh` | `thong_tin_khac.xn_bhxh` | Bác sĩ; QS/UI |
| Bảng tiền sử / bệnh sử / dị ứng cũ | `lich_su[]` | Ngày, bác sĩ ID, khoa ID, loại phiếu/dị ứng, nội dung và source record; QS/UI |
| Copy dữ liệu cũ | `lich_su[i].copied_to_path`, `nguon_du_lieu[]` | Ghi nguồn lịch sử, không biến thành lời nói hôm nay; QS/UI |

Trạng thái: Đang khám → `dang_kham`; Chờ KQ CLS → `cho_kq_cls`; Hoàn thành khám → `hoan_thanh_kham`; Nhập nội trú → `nhap_noi_tru`; Chuyển cấp cứu → `chuyen_cap_cuu`; Chuyển CSKCB BHYT → `chuyen_cskcb_bhyt`; Không khám → `khong_kham`.

## C. Chỉ định dịch vụ

Trong bảng này `S = chi_dinh.items[i]`.

| Trường | Đường dẫn | Nguồn / quy tắc |
|---|---|---|
| Có nhắc chỉ định không | `chi_dinh.de_cap` | Bổ sung để phân biệt chưa nhắc và không chỉ định; ĐX |
| Chẩn đoán / lịch sử lâm sàng bắt buộc bước 2 | `chi_dinh.groups[g].chan_doan_lich_su_lam_sang` | Theo từng nhóm/lần chỉ định; AI trích nếu nói rõ; bắt buộc trước xác nhận, không bắt buộc lưu nháp; QS |
| Mã dịch vụ / `ma_dich_vu`, UI `ma` | `S.danh_muc.code` | Server khớp danh mục + bác sĩ duyệt; QS/UI |
| Tên Việt/Anh theo danh mục | `S.danh_muc.display`, tra catalog theo `catalog_id` | Catalog lưu tên Việt/Anh; không nhét toàn bộ bản dịch vào từng encounter; QS |
| Tên dịch vụ nguyên văn / `ten_dich_vu`, UI `ten` | `S.noi_dung.ten_dich_vu` | Giữ cách bác sĩ gọi để đối chiếu; QS/UI |
| Số lượng / `so_luong` | `S.noi_dung.so_luong` | Không nghe nói giữ null; UI đề xuất 1 phải có nguồn mặc định/bác sĩ chấp nhận; UI/ĐX |
| Ghi chú / `ghi_chu` | `S.noi_dung.ghi_chu` | AI/nhập tay; UI |
| Lý do và chẩn đoán liên quan | `S.noi_dung.ly_do_chi_dinh`, `S.chan_doan_ids[]` | Text và FK, không tự thêm lý do; ĐX |
| Vị trí / bên / khẩn | `S.noi_dung.vi_tri`, `.ben`, `.muc_do_khan` | Khi được nói rõ, tránh mất ý; ĐX |
| Gói cá nhân / gói chia sẻ | `S.package_id`, `.package_version`, `.group_id` | Thuộc tính loại gói tra catalog gói, không suy từ tên gói; QS/ĐX kiểu lưu |
| Nhóm XN / CĐHA / dịch vụ chung | Catalog dịch vụ → category | View nhóm theo catalog, không đoán theo tiền tố mã; QS |
| Buồng / giường | `chi_dinh.groups[g].room_id`, `.bed_id` | Snapshot của nhóm, có thể lấy từ bối cảnh encounter khi được xác nhận; QS |
| Giá dịch vụ | `S.billing.don_gia` | Bảng giá có version/thời điểm, không AI; QS |
| Thành tiền từng dòng | `S.billing.thanh_tien` | Server tính khi giá/số lượng đủ và quy tắc giá đã rõ; QS/ĐX |
| Tổng số dịch vụ / tổng thành tiền | View tổng hợp các dòng hiện hành | Phân biệt số dòng và tổng số lượng; giá thiếu thì không hiển thị tổng như đã đầy đủ; QS |
| Checkbox BHYT | `S.billing.chon_bhyt` | Người có quyền chọn; ý nghĩa nghiệp vụ chưa được xác minh; QS |
| Đủ điều kiện BHYT / nguồn trả | `S.billing.dieu_kien_bhyt`, `.can_cu`, `.nguon_tra[]` | Phòng BHYT/hệ thống có quyền; mặc định chưa đánh giá; ĐX |
| Lưu nháp / xác nhận / hủy | `S.trang_thai`, `S.review` | Backend thực hiện sau thao tác người dùng, không từ AI; QS |

Catalog gói tương lai cần `id`, mã, tên, loại cá nhân/chia sẻ, `owner_id`, khoa, version và `items(service_catalog_id, quantity)`. Catalog dịch vụ cần `id`, `code_system`, mã, tên Việt/Anh, alias, nhóm, khoa, trạng thái, version; giá/điều kiện BHYT là nguồn riêng có hiệu lực thời gian. Các catalog hiện có thiếu nhiều thuộc tính này; không giả định đã đầy đủ.

## D. Kê đơn thuốc — ngoài scope

Bác sĩ tự chọn thuốc, kê liều, chỉnh/ngừng thuốc, kiểm tra, lưu và in đơn bằng quy trình riêng. Bộ schema này không có `don_thuoc`, `ke_don`, bảng đơn thuốc, mapping màn kê đơn hoặc chức năng AI gợi ý/điền đơn. Tài liệu màn OH trong repo chỉ là tham khảo lịch sử.

## E. Trường hiển thị và thao tác không lưu như dữ kiện lâm sàng

- Từ khóa tìm dịch vụ, grouping và checkbox lọc chỉ là trạng thái UI.
- Gói cá nhân/gói chia sẻ và thư viện câu mẫu nằm ở catalog/cấu hình cá nhân, không phải quyết định điều trị cho lượt hiện tại. Khi chọn áp dụng phải ghi nguồn và duyệt.
- Xem LSKB, Lấy kết quả mới nhất, ViHC, Xem tất cả hình ảnh, Copy, Tạo gói, In, Submit, Confirm, Renew, Resume, Put on hold, Cancel là hành động. Có thể sinh audit event khi triển khai; không tạo field boolean cho mỗi nút.
- Báo cáo y tế lấy nội dung từ snapshot đã duyệt: lý do, bệnh sử, khám, chẩn đoán, kết quả/tóm tắt, điều trị, lời dặn và tái khám. Header in ghép định danh ở backend theo quyền. Việc kê và in đơn do bác sĩ thực hiện riêng, ngoài task 2, 3, 4.

## F. Những khác biệt cần adapter thay vì đổi UI ngay

1. Phiếu cũ có `tien_su` một chuỗi; mới có bản thân/gia đình riêng. Không split bằng dấu phẩy tùy ý.
2. Khám chuyên khoa là một chuỗi, có tên nhóm ở đầu; adapter không tách chuỗi này thành nhiều vùng.
3. UI cũ dùng chuỗi rỗng để hiển thị; adapter chuyển null → chuỗi rỗng **chỉ ở UI**, chiều lưu phải kiểm lại kiểu trước chuyển.
4. `nguon` cũ `cu/ai/xem/sua/bs` là nhãn hiển thị. Nhãn mới phải dựa cả provenance và review: lịch sử/HIS → `cu`; AI chưa duyệt có vấn đề → `xem`; AI đã duyệt → `ai`; bác sĩ sửa AI → `sua`; bác sĩ tự nhập → `bs`. Phải có dấu hiệu chưa duyệt ngay cả khi không có cờ.
5. Mã dịch vụ và giá không nằm trong AI output; chỉ xuất hiện từ nguồn có quyền sau resolution/validation server và duyệt.
