# Quy tắc sử dụng dữ liệu y tế

Phiên bản medical-data-use-2 / pii-auto-2, cập nhật 2026-11-18 (thêm lớp NER PhoBERT chạy cục bộ sau rule; dự án chuyển sang nghiên cứu). Trước đó: pii-auto-1 (17/11, eForm chuyển sang bộ che R1–R14; trước nữa eForm dùng bộ lọc local-review-2 và duyệt tay). Đây là quy tắc vận hành do người dùng cung cấp, không phải chứng nhận ẩn danh hoặc kết luận pháp lý.

| Cấp | Nội dung | Quyền dùng AI |
| --- | --- | --- |
| 1: public | Tài liệu tham chiếu được xác nhận công khai; tên thuốc riêng lẻ kể cả thuốc đặc thù | Được dùng AI nội bộ hoặc bên ngoài |
| 2: masked_internal | Audio, transcript, bệnh án kể cả đã che tên/CCCD | Chỉ nội bộ, cần sự đồng ý rõ ràng cho bản nội dung được kiểm tra |
| 2b: deidentified | Bản transcript đã qua chốt chặn PII tự động `pii-auto-2` (14 rule R1–R14, thêm lớp NER, mặc định bật), ở eForm `/` và `/demo-luong` | Chạy local luôn được. Ra AI bên ngoài chỉ khi bệnh nhân đã đồng ý xử lý AI; chưa đồng ý thì ném "Bệnh nhân chưa đồng ý xử lý AI — chỉ được chạy bộ tách local." |
| 3: restricted | Hợp đồng, system prompt/tài liệu chỉ dẫn mật do người dùng nhập | Không đưa vào bất kỳ AI nào |

Tên thuốc công khai không biến thông tin một người bệnh dùng thuốc đó thành dữ liệu công khai. Masking không tự nâng bệnh án cấp 2 thành cấp 1. Đường clinical luôn mặc định cấp 2; không có tham số HTTP cho phép tự khai bệnh án là public. Prompt ứng dụng cố định dùng để định nghĩa hành vi không phải tài liệu prompt mật được nhập để phân tích.

## Cấp deidentified (eForm `/` và `/demo-luong`)

- Phạm vi: eForm `/` (API `/api/clinical/privacy` action `check` và `/api/clinical/extract`) và `/demo-luong`. Từ 17/11/2026 eForm bỏ bước bác sĩ duyệt bản đã che và ô tích đồng ý trước AI (quyết định D2 trong `docs/superpowers/plans/pending/2026-11-17-eform-pii-r1-r14-design.md`, người dùng đã xác nhận). Bản nào qua chốt chặn R11 thì được cấp ticket và tạo bản nháp ngay. Từ 17/11/2026 (eForm cả gõ tay và giọng nói, và `/demo-luong`): chốt chặn thấy còn sót thì máy chủ tự che phần sót (tên người lạ → `[NGƯỜI_KHÁC]`, dãy số dài → `[MÃ_ĐỊNH_DANH]`, email/URL → `[LIÊN_HỆ]`, giá trị đã biết → nhãn theo loại) rồi chạy lại R11; bác sĩ không phải sửa tay. Chỉ khi tự che xong vẫn còn sót mới bị chặn: không cấp ticket, hiện lý do theo mã rule. Nhật ký R13 ghi mã lý do đã tự che ở trường `auto_masked`, không ghi chữ gốc; phiên lưu của `/demo-luong` cũng chỉ giữ mã lý do. Nhật ký R13 của eForm ở `data/clinical/audit/<encounter_id>.ndjson` (gitignore).
- Bản thô không ghi đĩa. Bộ che `pii-auto-2` (che định danh bằng rule, lớp NER che thêm nếu bật, chốt chặn R11; còn sót thì tự che rồi kiểm lại, vẫn sót thì chặn; đồng ý R14, nhật ký R13) chạy trước; chỉ khi chốt chặn qua mới có `DeidentificationProof { policy_version: "pii-auto-2", gate_passed: true, consent }` và `classifyData` trả `deidentified`. Nội dung cấp 3 vẫn là `restricted` dù có proof.
- Đồng ý (`consent`) lấy từ hồ sơ bệnh nhân. R14: chưa đồng ý thì chỉ chạy bộ tách local; đường ra ngoài bị chặn ở `assertDataUseAllowed`.
- Tùy chọn `noCache` của `extractClinical` bỏ đọc cache/run-index để mỗi lần demo chạy lại thật; vẫn ghi file lượt chạy.
- Với provider `mock`, trích xuất vẫn chạy cục bộ (đích nội bộ); hiện chưa có adapter AI bên ngoài thật, nên nhánh "ra ngoài" mới được kiểm bằng test với `call` được tiêm.
- Căn cứ tham chiếu (không phải kết luận pháp lý): Luật 91/2025 Điều 2.1, 14.6, 20, 26, 30; Nghị định 356/2025; HIPAA §164.514(b)(2). Chốt chặn tự động không chứng minh ẩn danh tuyệt đối: tuổi, giới, thời điểm và bệnh hiếm vẫn có thể tái định danh.

## Cơ chế thực thi

- STT dùng Zipformer cục bộ; không fallback Web Speech gửi audio bên ngoài.
- Bộ lọc cục bộ che định danh trực tiếp, tuổi cụ thể/tuổi trẻ nhỏ, giới tính được nói rõ, ngày lịch và giờ điều trị. Giữ số đo, liều, thời gian tương đối và tên thuốc.
- Tuổi + giới tính + thời điểm điều trị + bệnh hiếm vẫn có thể tái định danh. Người kiểm tra phải loại/mask trường không cần thiết. Không có danh sách bệnh hiếm đầy đủ và không tự suy diễn/xóa chẩn đoán.
- Trước thu/nhận dạng audio, giao diện micro và upload yêu cầu checkbox đồng ý nội bộ; service STT loopback không phải hệ thống quản lý consent độc lập.
- Không còn checkbox đồng ý phân tích transcript trên eForm. Cờ đồng ý xử lý AI (R14) lấy từ hồ sơ bệnh nhân (`data/clinic/patients.json › dong_y_xu_ly_ai`); bệnh nhân không có trong hồ sơ thì coi là chưa đồng ý và chỉ chạy bộ tách cục bộ. Ticket chỉ giữ bản đã che trong bộ nhớ, hết hạn 10 phút. Hồ sơ giả không phải sổ consent bền vững hay cơ chế xác minh người có thẩm quyền đồng ý.
- Clinical extraction chặn mọi provider bên ngoài và callback provider thử nghiệm trước cache, ghi artifact hoặc gọi mạng. Hiện chỉ mock/rules cục bộ; chưa có adapter LLM nội bộ. Đặt biến môi trường không thể bỏ chặn.
- Tài liệu có dấu hiệu hợp đồng/system prompt bị chặn trước khi cấp ticket và trước AI. Nhận diện từ khóa là heuristic, có thể bỏ sót hoặc chặn nhầm: người dùng không được nhập tài liệu cấp 3. Không dùng LLM để phân loại dữ liệu nhạy cảm.

## Dự án nghiên cứu, lớp NER và giấy phép

- Từ 18/11/2026 dự án là nghiên cứu, không thương mại hóa (người dùng đã xác nhận với hội đồng). Nhờ vậy mới được dùng bộ dữ liệu chỉ cấp phép nghiên cứu như PhoNER_COVID19. Nếu sau này chuyển lại sang thương mại thì phải bỏ mô hình đã huấn luyện trên bộ này và huấn luyện lại bằng dữ liệu có giấy phép phù hợp.
- PhoNER_COVID19 (VinAI): chỉ dùng cho nghiên cứu và giáo dục, không phân phối lại. Không commit, không đăng, không chia sẻ dữ liệu (`models/ner/phoner-covid19/`) và trọng số đã fine-tune (`models/ner/phobert-phoner/`); cả hai đã gitignore. `npm run ner:tai-du-lieu` bắt người chạy gõ `--dong-y-giay-phep` sau khi đọc điều khoản. Công trình dùng mô hình phải trích dẫn: Truong, T. H., Dao, M. H., & Nguyen, D. Q. (2021). *COVID-19 Named Entity Recognition for Vietnamese*. NAACL 2021.
- PhoBERT-base (VinAI, MIT) là mô hình gốc. VnCoreNLP RDRSegmenter (GPL-3.0) dùng để tách từ, chạy qua Java cục bộ; chỉ tải về máy, không đóng gói vào mã nguồn dự án.
- Lớp NER chạy cục bộ trong service STT loopback (`POST /ner`, 127.0.0.1), không gửi văn bản ra ngoài. Lớp này chỉ che thêm, không bỏ mục nào rule đã che. NER lỗi hoặc quá thời gian thì máy chủ dùng kết quả rule như cũ, và nhật ký R13 ghi `ner.trang_thai` (`chay`, `khong_chay` hoặc `tat`). Mặc định bật từ 18/11/2026; `PII_NER=off` để tắt.
- Giới hạn đã đo: tên một âm tiết đứng một mình và tên đầy đủ của người nhà vẫn có thể lọt, vì PhoNER chỉ gán nhãn NAME cho bệnh nhân. Mô hình đôi khi che đúng chữ nhưng gán sai nhãn, ví dụ coi tên người là địa danh. Chốt chặn R11 vẫn là lớp bảo vệ sau. Số đo xem `docs/CHANGELOG.md` mục 2026-11-18.

## Kiểm chứng

Tests bao phủ: thiếu consent, tái xác nhận, cấp 3, zero outbound calls, masking không đổi mức phân loại, giữ tên thuốc/đơn vị/số đo/thời gian lâm sàng. Cần bộ mẫu đã gán nhãn và quy trình consent thực tế trước triển khai với bệnh án thật. Việc review không chứng minh đã ẩn danh tuyệt đối.
