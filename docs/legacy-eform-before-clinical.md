# Tư liệu eForm trước luồng clinical

Tài liệu lịch sử; các hành vi kê đơn AI, lưu metrics thay hồ sơ và `/api/extract` dưới đây đã được thay bằng luồng trong [CLINICAL-WORKFLOW.md](CLINICAL-WORKFLOW.md). Không dùng như hướng dẫn vận hành hiện tại.

## Mô phỏng eForm ngoại trú

Trang chủ `/` mô phỏng màn **Phiếu khám ngoại trú của EMR** với một ca TMH giả. Các mục, trường, thứ tự, tab và trạng thái lượt khám giữ như EMR thật (xem `docs/cau-truc-phieu-kham-ngoai-tru.md`) để bác sĩ nhận ra ngay; cách trình bày thì làm mới cho gọn và dễ đọc hơn EMR:

- **Header ghim trên cùng** (từ khổ màn rộng): tên bệnh nhân, giới, PID, lượt khám, nhãn dị ứng đỏ (bấm xem chi tiết), Menu. Dòng dưới là **sinh hiệu chỉ đọc** từ phiếu điều dưỡng (chuyển từ mục Đánh giá chung lên đây để luôn thấy khi cuộn), "Đánh giá ban đầu", lần sửa cuối, Xem LSKB, Mở rộng.
- Mỗi mục là một thẻ trắng trên nền xám nhạt; lựa chọn Có/Không dạng thẻ bấm; bảng chỉ kẻ ngang, có nút Copy.
- **Thanh dưới đáy 2 tầng như EMR**, ghim ở mọi khổ màn: tầng trên là dải 7 trạng thái lượt khám (khổ điện thoại thì vuốt ngang); tầng dưới là Quay lại, Báo cáo y tế, In ngay, nút **Lưu** dài kèm số chỗ còn cần xem lại, nút lên đầu trang.
  - **In ngay** mở hộp thoại in của trình duyệt với bản in A4 (`src/client/eform/BanIn.tsx`): hành chính, sinh hiệu, các trường phiếu khám đã có chữ, chẩn đoán (mã và mô tả), bảng chỉ định, bảng đơn thuốc, chỗ ký bác sĩ, có dấu "DỮ LIỆU GIẢ – BẢN MÔ PHỎNG". Bản in giữ nguyên như đang hiện, kể cả chỗ AI chưa chắc.
  - **Trạng thái lượt khám**: "Chờ KQ CLS" mở ô Chuyển nội soi. "Hoàn thành khám" khóa phiếu, chỉ định, đơn thuốc và cột Trợ lý AI (chỉ đọc), chọn lại "Đang khám" để sửa; còn thay đổi chưa Lưu thì không cho chọn. Các trạng thái khác chỉ đổi lựa chọn, chưa có tác dụng gì.
- Chữ Be Vietnam Pro 14px. Thanh header của prototype (link sang Kết quả thử nghiệm, chế độ AI) nằm trên cùng và cuộn đi khi kéo xuống; header bệnh nhân vẫn ghim. Nút "Quay lại" chỉ hiện thông báo "Chưa kết nối hệ thống thật".
- **Giao diện tối giản, không hiện chú thích của prototype**: không có dải cảnh báo dữ liệu giả, không có nhãn "Dữ liệu cũ", "(tự động)", "(mô phỏng …)", không có các dòng giải thích cách AI hoạt động dưới từng điểm AI. Các giới hạn đó ghi trong README này. Dấu "DỮ LIỆU GIẢ" chỉ còn trên bản in, để tờ giấy in ra không bị nhầm là phiếu thật.

Chỗ khác với EMR là **cột "✨ Trợ lý AI điền phiếu" bên phải**:

Đầu cột có thanh **3 bước: Nói hoặc gõ → AI điền → Duyệt, Lưu**. Mỗi lúc chỉ một nút tô đậm: chưa có chữ thì nút 🎤 Bắt đầu nói, có chữ mới thì nút ✨ Điền vào phiếu, đã điền thì phần duyệt.

1. Bác sĩ bấm 🎤 Bắt đầu nói trong lúc khám, hoặc gõ tắt một đoạn (có "Thử câu mẫu: kiểu nói / kiểu gõ tắt" để demo), rồi bấm **✨ Điền vào phiếu** (hoặc Ctrl+Enter).
2. AI gọi pipeline `/api/extract` (theo `LLM_PROVIDER`) và điền cùng lúc: lý do khám, bệnh sử, tiền sử, khám toàn thân, khám chuyên khoa, chẩn đoán, hướng điều trị, lời dặn, hẹn tái khám (tự tính ngày), **chỉ định dịch vụ** và **đơn thuốc** (hai tab cạnh tab Phiếu khám).
3. Cột AI hiện "Đã điền N trường", thanh tiến độ (tím là chắc chắn, vàng là còn cần xem lại) và danh sách **chỗ cần xem lại** có nút Xem (cuộn tới ô) và ✓ Đúng. Các trường còn lại nằm trong danh sách thu gọn. Bác sĩ duyệt, sửa rồi bấm Lưu. Có nút hoàn tác lần AI điền. Nói hoặc gõ thêm thì nút đổi thành "Điền thêm vào phiếu".

**Gọi phiếu mẫu theo bệnh** (`data/eform/phieu-mau.json`, `src/shared/eform/phieu-mau.ts`):

- Gõ hoặc nói tên mẫu vào ô nhập rồi bấm Điền, ví dụ "mẫu viêm tai giữa cấp", "vtg cấp" hoặc "viem tai giua cap". Tên mẫu phải đứng đầu câu (có thể có "mẫu", "điền mẫu", "theo mẫu" phía trước) hoặc đứng ngay sau chữ "mẫu". Tên bệnh nằm giữa một câu kể cả ca thì vẫn chạy luồng AI tách như cũ.
- Đang gõ dở (2–40 ký tự) mà chưa khớp mẫu nào thì dưới ô nhập hiện "Mẫu theo bệnh:" với tối đa 5 tên, bấm là điền luôn. Tên khớp nhiều mẫu (bí danh trùng) thì hiện nút "Dùng mẫu: …" để chọn.
- Chỉ có tên mẫu thì **không gọi API**: mẫu đã gán mã sẵn ở server lúc nạp trang và đổ thẳng vào phiếu.
- Có chi tiết sau tên ("vtg cấp, tai T, 3n, sốt 38,5") thì gọi `/api/extract` **một lần** với `mau_id`, phần chi tiết gửi làm `text`. Server lấy mẫu theo id. LLM nhận mẫu trong thẻ `<phieu_mau>`, được dặn giữ nguyên câu chữ, chỉ thay chỗ trống và sửa đúng chỗ bác sĩ nói. Sau đó code chạy thêm quy tắc `dienChoTrongNhap` cho chỗ trống LLM còn bỏ sót. Quy tắc:
  - `T`→trái, `3n`→3 ngày, "hai bên"→2 bên.
  - "phải/trái" chỉ tính khi đứng sau từ chỉ vị trí (tai, mũi, bên, họng…) hoặc đứng riêng một vế, nên động từ "phải" không bị hiểu là bên phải.
  - Nhiệt độ lấy số sau "sốt" trong khoảng 35–42, không lấy "sốt 2 ngày".
  - `[số]` không tìm được số thì giữ nguyên.

  Ở chế độ `mock` chỉ chạy quy tắc. Chỗ không hiểu thì giữ nguyên ngoặc và tô vàng. Gọi AI lỗi (quá tải, hết lượt) thì vẫn điền theo mẫu bằng quy tắc, kèm thông báo đỏ. Bác sĩ gõ vào ô nào trong lúc chờ AI thì ô đó được giữ. Mã ICD của mẫu chỉ dùng khi chẩn đoán LLM trả về vẫn là bệnh của mẫu; khác thì gợi ý mã theo từ khóa như luồng thường. Mã dịch vụ, thuốc vẫn qua bước khớp danh mục như mọi nháp.
- **Chỉ điền ô còn trống**: ô đã có chữ (điều dưỡng nhập sẵn, AI điền lần trước, bác sĩ gõ) giữ nguyên. Riêng Hẹn tái khám "Không" mặc định vẫn được đổi theo mẫu, trừ khi bác sĩ đã tự chọn. Chỉ định, thuốc trùng thì bỏ. Ô Khám các bộ phận khác cũng lấy từ mẫu.
- Chỗ riêng của bệnh nhân trong mẫu (`[phải|trái|2 bên]`, `[số] ngày`) hiện vàng để bác sĩ sửa. Mã ICD10 tra theo tên ICD của mẫu, luôn vàng như mọi mã ICD AI điền.
- Thông báo: "Đã điền theo mẫu …: N ô, X chỉ định, Y thuốc. Bỏ qua K ô đã có chữ. Còn M chỗ cần điền (tô vàng)." Hoàn tác dùng chung nút "↶ Hoàn tác lần AI điền". Lưu thì số đo lượt thử ghi thêm `mau_id`, trang Kết quả hiện "Mẫu <id>".

| Quy tắc | Chi tiết |
|---|---|
| Màu | Tím = AI điền (ô có vạch tím bên trái). Vàng = AI chưa chắc, cần xem lại (vạch vàng; bấm "✓ Đúng" ngay cạnh nhãn trường hoặc trong cột AI, hoặc sửa để bỏ đánh dấu). |
| Không ghi đè | Ô bác sĩ đã gõ hoặc đã sửa thì AI không ghi đè (cột AI không báo riêng). |
| Mã ICD10 | Không lấy từ LLM. Code chấm điểm từ khóa trên câu chẩn đoán để gán mã, luôn đánh dấu vàng. |
| Mã dịch vụ, thuốc | Do `src/shared/match.ts` khớp danh mục. Khớp chưa chắc thì dòng vàng, có ô chọn lại: bấm vào hiện ứng viên AI tìm được, gõ để tìm trong cả danh mục. |
| Ô tìm danh mục | Tìm dịch vụ, tìm thuốc, ICD10 đều là ô gõ để tìm (`TimDanhMuc.tsx`, tìm mờ theo tên, tên khác, hoạt chất, mã; hiểu từ viết tắt), hiện tối đa 30 kết quả. Mục có nhãn **DM BV** là danh mục bệnh viện. |
| Nói nhiều lần | Lần điền sau chỉ thêm dòng chỉ định/thuốc chưa có (trùng mã thì bỏ qua). |
| Đơn thuốc | Tổng số lượng tự tính theo `config/canh-bao.json`. Thuốc cùng nhóm với dị ứng trên header (ví dụ Penicillin → Augmentin, Amoxicillin) hiện cảnh báo đỏ; danh sách nhóm chỉ là minh họa. |

**✨ Gợi ý theo chẩn đoán** nằm đầu tab Chỉ định dịch vụ và tab Đơn thuốc:

- Lấy mã ICD10 đang chọn trên phiếu khám (ra viện, ban đầu, kèm theo; do bác sĩ chọn hoặc Trợ lý AI điền), tìm bộ mẫu khớp trong `data/eform/goi-y-theo-chan-doan.json` và liệt kê dịch vụ, thuốc kèm liều, lời dặn theo từng chẩn đoán. Tab nào có gợi ý thì hiện ✨ trên tên tab.
- **Không tự thêm gì.** Bác sĩ tích chọn rồi bấm "Thêm N mục đã chọn". Mục đã có trong danh sách hoặc trùng gợi ý phía trên thì làm mờ. Thuốc cùng nhóm dị ứng trên header (ví dụ Augmentin khi dị ứng Penicillin) không được tích sẵn và có cảnh báo đỏ.
- Lời dặn mẫu có nút "Chèn vào Lời dặn" (thêm vào cuối ô Lời dặn & theo dõi, đánh dấu AI điền).
- Bộ mẫu chỉ ghi tên dịch vụ và thuốc. Mã do `src/shared/match.ts` gán khi nạp trang; khớp chưa chắc thì dòng hiện vàng "cần xem lại".
- Chạy bằng rule, không gọi LLM. **12 bộ mẫu hiện có đều là dữ liệu giả, liều chỉ minh họa**; sẽ thay bằng danh sách bệnh hay gặp do bác sĩ đưa.
- **Đơn anh/chị đã kê (theo thói quen từng bác sĩ).** Mỗi lần bấm Lưu khi phiếu đã có mã ICD10 chính (chẩn đoán ra viện, chưa có thì ban đầu) và có ít nhất một dòng chỉ định hoặc thuốc, server ghi lại các dòng đó cùng lời dặn vào `data/thoi-quen/<tài khoản>.json` (không đưa lên git, giữ 200 lần gần nhất). Một lượt mở phiếu là một lần kê: Lưu lại nhiều lần thì ghi đè, không đếm thêm. Lần sau, với cùng mã ICD10 chính, nhóm "Đơn anh/chị đã kê N lần trước" đứng đầu khung gợi ý. Mỗi dòng hiện "kê x/N lần", lấy liều của lần gần nhất. Dòng kê từ một nửa số lần trở lên được tích sẵn; khi đã có nhóm này thì bộ mẫu chung không tích sẵn dòng nào. Mã đã lưu mà không còn trong danh mục thì dòng hiện vàng "cần xem lại". Nhóm này chỉ có sau khi bác sĩ đã Lưu, lần đầu chưa có gì.
- Tài khoản là `dang_nhap` trong `data/eform/ca-gia.json` (`user_bs01`). Nhiều bác sĩ thử chung một máy thì mở `/?bs=user_bs02`, `/?bs=user_bs03`… để thói quen không lẫn nhau (tên chỉ gồm chữ, số, `_`, `-`). Tên tài khoản hiện ở góc phải header.

Ở chế độ `mock`, câu mẫu của ca `data/cases/ca-11-viem-tai-giua-man-dot-cap.json` (cùng bệnh nhân giả với trang này) trả kết quả soạn sẵn; câu khác được tách bằng quy tắc nên kém hơn LLM thật.

Các điểm AI cũ vẫn nằm ngay tại ô, **đều là mock bằng rule, không gọi LLM**:

| Điểm AI | Cách hoạt động | Giới hạn |
|---|---|---|
| ✨ AI tóm tắt (Tiền sử bản thân, Tiền sử gia đình, Bệnh sử) | Trích câu có sẵn, gộp câu trùng qua các lần khám. Câu khác bên phải/trái hoặc khác số liệu không bị gộp. Bác sĩ sửa rồi mới chèn. **Đang ẩn** cùng các bảng "Thông tin khai thác" (lịch sử tiền sử, bệnh sử, dị ứng kèm nút Copy); đổi `HIEN_THONG_TIN_KHAI_THAC` ở đầu `src/client/eform/EformForm.tsx` thành `true` để hiện lại. | Không diễn đạt lại, nên rút gọn ít hơn LLM thật |
| ✨ Gợi ý ICD10 (top 3) | Chấm điểm từ khóa trong Bệnh sử và Khám lâm sàng, có xét phủ định ("không sốt"). Đoạn tóm tắt lịch sử cũ và chỗ `[ ]` chưa chọn không được tính. | **Độ tin cậy chỉ là điểm khớp từ khóa, không phải xác suất bệnh** |
| ✨ Gợi ý mẫu câu | Chọn mẫu Tai/Mũi/Vòm/Họng theo Lý do đến khám. Kết quả khám để trống cho bác sĩ chọn, AI không tự điền. | Chỉ có 7 nhóm lý do khám mẫu |

Nhãn trên giao diện: **✨ AI điền**, **⚠ AI chưa chắc, cần xem lại**, **Đã sửa**, **(Hiển thị trên báo cáo y tế)**. Nút "Báo cáo y tế" cho xem trước báo cáo: khối hành chính (họ tên, giới, PID, thời gian khám, bác sĩ, dị ứng), các trường có nhãn BCYT, chẩn đoán chính (chẩn đoán ra viện, chưa có thì chẩn đoán ban đầu) và chẩn đoán kèm theo. Ảnh chụp EMR chỉ thấy nhãn BCYT ở chẩn đoán kèm theo; việc đưa chẩn đoán chính và hành chính vào là giả định, cần xác nhận với bác sĩ.

Các nút lấy dữ liệu từ hệ thống khác, Menu, Xem LSKB và Quay lại chỉ hiện thông báo mô phỏng. Nút Lưu không ghi nội dung phiếu xuống đĩa. Nó chỉ ghi số đo lượt thử (xem mục Đo lường) và các dòng chỉ định, thuốc cho gợi ý theo thói quen. Tải lại trang là phiếu về dữ liệu ban đầu.

### Trang Trình diễn (`/trinh-dien`, tạm ẩn)

> Từ 2026-11-12 trang này tạm ẩn: không còn link ở thanh đầu, mở `/trinh-dien` ra 404. Code và kịch bản vẫn giữ nguyên, bật lại bằng cách khôi phục `src/app/trinh-dien/page.tsx` (xem ghi chú trong file).

Dùng trong buổi họp với bác sĩ, để cho thấy "làm việc với AI" cụ thể là thế nào. Vẫn là phiếu eForm với ca giả như trên. Thanh trên cùng chọn một trong 4 kiểu tương tác. Mỗi lần chọn (hoặc bấm "↺ Làm lại từ đầu") phiếu mở lại từ đầu theo kiểu đó. Thẻ giải thích ghi kiểu này giống thứ gì bác sĩ đã quen, dùng lúc nào, bác sĩ làm gì, máy làm gì, bác sĩ cần kiểm tra gì. Giải thích xong thì bấm "Ẩn giải thích" để cột Trợ lý AI hiện trọn trên màn laptop.

| Kiểu | Phiếu mở ra thế nào | Gọi LLM? |
|---|---|---|
| 1. Máy điền sẵn | Đã có nháp AI của câu mẫu (kết quả soạn sẵn, server đổ sẵn vào phiếu) | Không |
| 2. Bấm một lần | Đã chọn H66.1, mở tab Đơn thuốc, có "Đơn anh/chị đã kê 3 lần trước" (giả) | Không |
| 3. Nói một câu | Đã chọn H66.1, ô nhập có câu "Kê như mọi khi, thêm Cetirizin… Hẹn tái khám sau 7 ngày." | Có, khi bấm Điền |
| 4. Nghe cả buổi khám | Nút "▶ Bắt đầu nghe buổi khám" phát lại 12 câu hội thoại giả vào ô nhập (`BS: …`, `BN: …`), mỗi câu khoảng 1,4 giây, không dùng micro | Có, khi bấm Điền |

- Câu lệnh "kê như mọi khi", "như lần trước", "đơn quen"… dùng được ở cả trang chính. Máy lấy các dòng bác sĩ hay kê (kê từ một nửa số lần trở lên) cho chẩn đoán chính trên phiếu; phiếu chưa có thì dùng mã AI vừa gán. Các dòng này đứng trước dòng AI tách từ câu nói. Chưa có đơn đã kê thì thông báo không lấy được bộ quen.
- Prompt LLM hiểu hội thoại: lời bệnh nhân (`BN:`) chỉ dùng cho lý do khám, bệnh sử, tiền sử; khám, chẩn đoán, chỉ định, thuốc, lời dặn chỉ lấy từ lời bác sĩ.
- Ở trang này, bấm Lưu không ghi số đo lượt thử hay đơn đã kê.
- Kiểu 3, 4 chạy với `mock` thì tách bằng quy tắc nên kém. Nên dùng LLM thật. Gemini miễn phí thỉnh thoảng báo 503 quá tải, bấm lại là được.
- Kịch bản (chữ trên thẻ, câu lệnh, hội thoại, 3 đơn đã kê giả) ở `data/eform/trinh-dien.json`. Sửa rồi tải lại trang là có hiệu lực.

| File trong `data/eform/` | Nội dung |
|---|---|
| `ca-gia.json` | Ca giả và lịch sử khám |
| `trinh-dien.json` | Kịch bản trang `/trinh-dien`: `kieu` (chữ trên thẻ của 4 kiểu), `lenh` (câu kiểu 3), `hoi_thoai` (hội thoại kiểu 4, `ai` là `BS` hoặc `BN`), `thoi_quen` (đơn đã kê giả, chỉ ghi tên; mã gán bằng `src/shared/match.ts` khi nạp trang) |
| `phieu-mau.json` | Phiếu mẫu theo bệnh (giả), bác sĩ gọi bằng tên trong ô Trợ lý AI. Mỗi mẫu: `id`, `ten`, `bi_danh` (viết tắt, cách gọi khác; không trùng giữa các mẫu, tránh từ ngắn dễ nhầm như "va"), `icd_ten` (đúng tên một mã trong `data/tham-khao/icd10-tmh.json`, mã do code tra), `kham_khac` (ô Khám các bộ phận khác), `nhap` (cùng dạng nháp của `config/forms`: `phieu_kham`, `chi_dinh`, `ke_don`; không có trường mã). Chỗ riêng của bệnh nhân viết `[phải\|trái\|2 bên]` hoặc `[số] ngày` (đơn vị: ngày, tuần, tháng, giờ, độ, lần, kg). Không ghi `so_luong` chỉ định khi là 1 (eForm tự hiểu là 1). Sửa xong chạy `npm test` để chắc mọi mẫu tra được ICD và mọi dòng khớp chắc danh mục |
| `goi-y-theo-chan-doan.json` | Bộ mẫu chỉ định, thuốc, lời dặn theo mã ICD10 (giả). Mỗi mẫu: `id`, `ten`, `icd` (danh sách mã), `chi_dinh` (`ten`), `don_thuoc` (`ten`, `ham_luong`, `duong_dung`, `lieu_moi_lan`, `so_lan_ngay`, `thoi_diem`, `so_ngay`, `ghi_chu`), `loi_dan`. Tên nên có trong danh mục bệnh viện `data/catalog/` để khớp chắc mã |
| `icd10.json` | Từ khóa gợi ý ICD10 (`manh`, `vua`) cho 28 mã TMH hay gặp. Danh sách mã để chọn lấy từ `data/tham-khao/icd10-tmh.json` (367 mã chi tiết); mã ở đây mà nguồn thật không có vẫn được giữ |
| `mau-cau.json` | Mẫu câu theo nhóm lý do khám, chỗ trống viết dạng `[a\|b]` |
| `quy-tac.json` | Ngưỡng tóm tắt, cách tính điểm, từ phủ định |
| `thu-vien.json` | Thư viện mẫu câu tĩnh của các ô khác |
| `tuy-chon.json` | Danh sách trạng thái và lựa chọn |

