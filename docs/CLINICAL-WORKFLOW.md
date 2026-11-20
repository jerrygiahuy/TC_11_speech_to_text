# Luồng khám Tim mạch — prototype ngày 12/11/2026

Đã nối các task 2–5 vào trang `/`: **phiếu khám và chỉ định dịch vụ**. Kê đơn do bác sĩ làm riêng. Trang `/stt` vẫn là nơi thử STT độc lập; thuật toán phân tách người nói không thay đổi trong đợt này.

## Chạy và dùng

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000`. Mặc định dùng `mock`; đây là bộ trích xuất quy tắc có giới hạn, không cần API key. Bấm **Thử hội thoại tổng hợp** để thử luồng mà không cần ghi âm.

1. Chọn **Hội thoại** hoặc **Bác sĩ đọc**. Trong hội thoại, chỉ gán vai trò khi có nhãn `BS:`/`BN:` được người dùng kiểm tra; không đoán bác sĩ từ mã Người nói 1/2.
2. Nói hoặc nhập text. Ô nhập giữ chữ gốc, chỉ trong bộ nhớ trình duyệt.
3. Bấm **Che thông tin và tạo bản nháp**. Máy chủ che bằng bộ `pii-auto-2`: R1–R8 (nhãn R10), rồi lớp NER PhoBERT local (mặc định bật, tắt bằng `PII_NER=off`; chỉ thêm đoạn che, lỗi thì chỉ dùng rule; dòng "NER: đã chạy / không chạy / tắt" hiện dưới bản đã che), chốt chặn R11, cờ đồng ý R14 lấy từ hồ sơ bệnh nhân. Chốt chặn R11 thấy còn sót (vd. R11c, tên người lạ) thì máy chủ tự che phần đó (`[NGƯỜI_KHÁC]`, `[MÃ_ĐỊNH_DANH]`, `[LIÊN_HỆ]`…) rồi kiểm lại, và hiện dòng "Tự che thêm N mục còn sót"; bác sĩ không phải sửa tay. Áp dụng như nhau cho nội dung gõ tay và nội dung từ micro; eForm và `/demo-luong` gọi cùng một hàm `chePii` (`src/shared/clinical/pii/pipeline.ts`), thử nhanh bằng `npm run thu-che-pii -- "câu"`. Chỉ khi tự che xong vẫn còn sót mới bị chặn: hiện lý do theo mã rule, không gửi AI; sửa nội dung trong ô rồi bấm lại. Qua chốt chặn thì hiện **bản đã che** (chỉ đọc), số mục che theo rule và dòng "Đồng ý AI", rồi tạo bản nháp. Mỗi lượt ghi một dòng nhật ký R13 vào `data/clinical/audit/`.
4. Xem tóm tắt, chẩn đoán, tiền sử thuốc/dị ứng, cờ cần kiểm tra và câu nguồn. **Áp dụng bản nháp** đưa dữ kiện lên hai màn; giữ các ô bác sĩ đã sửa, không ghi đè tóm tắt nhập tay.
5. Bác sĩ sửa nội dung, chọn ICD và đúng dịch vụ, số lượng, vị trí/bên. Khi có chẩn đoán kèm, chọn rõ giai đoạn. Khi không có dịch vụ, tích **Bác sĩ xác nhận không chỉ định dịch vụ**. Khi có dịch vụ, điền chẩn đoán/lịch sử lâm sàng chung.
6. **Lưu phiếu & chỉ định** hoặc **Lưu nháp** trong tab chỉ định ghi cùng một hồ sơ JSON. URL nhận `?ho_so=<uuid>`; tải lại URL để mở đúng hồ sơ. Hai tab lưu cùng revision thì tab đến sau nhận lỗi xung đột.
7. Xác nhận đã xem các điểm AI đánh dấu, rồi **Duyệt phiếu và chỉ định**. Backend kiểm dữ liệu bắt buộc và ghi người/thời gian duyệt từ persona server.
8. **In ngay** chỉ bật cho bản đã duyệt, không có thay đổi chưa lưu. Sửa sau duyệt làm bản đang sửa không in được; lưu lại sẽ xóa duyệt cũ. Ctrl+P khi chưa duyệt chỉ có thông báo bản nháp.

## Demo luồng dữ liệu (`/demo-luong`)

Trang riêng, tách khỏi eForm `/`. eForm và `/demo-luong` cùng dùng bộ che `pii-auto-2` (rule cộng lớp NER tùy chọn); `/demo-luong` trình diễn từng bước: ghi âm (micro, file WAV hoặc kịch bản mẫu) → bản thô → che PII tự động (bộ rule R1–R8, R10, cộng lớp NER nếu bật, `pii-auto-2`) → chốt chặn R11 (còn sót thì tự che phần đó rồi kiểm lại, giống eForm; tự che xong vẫn sót mới không gửi AI; kịch bản `ca-tu-che` minh họa) → AI mock → lưu → phiếu đọc lại từ kho để bác sĩ sửa và duyệt. Bộ trích mock đọc cả lời nói kiểu STT thật (viết thường, không nhãn, không dấu hai chấm): nhận mục theo cụm mở đầu (lý do khám, tiền sử, gia đình có, dị ứng, đang uống/dùng, toàn thân, khám tim phổi, kết quả, chẩn đoán, hướng điều trị, lời dặn, hẹn tái khám), bỏ cụm khỏi giá trị; lời đáp câu bác sĩ hỏi lý do khám là lý do khám; mã ICD gán qua `match.ts` chỉ khi khớp chắc một mã (trạng thái xem). Kết quả mong đợi của 3 kịch bản: `data/demo-luong/kich-ban/expected/*.expected.json`, chấm bằng `src/server/demo-luong/kich-ban-phieu.test.ts`. Cờ đồng ý xử lý AI lấy từ hồ sơ tiếp đón (R14): chưa đồng ý thì chỉ chạy bộ tách local. Một phiếu có nhiều phiên ghi âm; ô bác sĩ đã sửa không bị phiên sau ghi đè (phiên sau nói khác thì hiện cờ xung đột); ghi phiên mới vào phiếu đã duyệt thì phiếu về nháp. Bản thô không ghi đĩa, không log; dữ liệu chạy nằm ở `data/demo-luong/` (gitignore). Chính sách dữ liệu: `docs/DATA-USE-POLICY.md` (cấp `deidentified`, áp dụng cho cả eForm và luồng này).

## Cấu hình model

Trong `.env.local` đặt `CLINICAL_LLM_PROVIDER=mock|gemini|anthropic|openai`; bỏ trống để dùng `LLM_PROVIDER`. Provider thực cần API key và `<PROVIDER>_MODEL` tương ứng theo `.env.example`. Không đổi model chỉ vì thay database.

Các ứng viên đã tra cứu để đánh giá thêm: [Gemini 3.8 Flash](https://aistudio.google.com/docs/models/gemini-3.8-flash), [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/overview), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models). Khả năng tiếng Việt y khoa phải đo trên bộ hội thoại có nhãn của bác sĩ; không coi tài liệu nhà cung cấp là kết quả kiểm thử TMH. Đợt này chỉ kiểm thử inference bằng mock/call giả lập, chưa gọi API trả phí hoặc so sánh chất lượng model thật.

## Hợp đồng và nơi lưu

- Nguồn chuẩn: `config/clinical/*.schema.json`, schema version `2.0.0`. Sinh kiểu bằng `npm run clinical:types`; kiểm tra bằng `npm run clinical:check`. `clinical:check` cần gói Python `jsonschema`, ghim `jsonschema==4.26.0` trong `stt/requirements-dev.txt` (cài vào `.venv-stt`, xem README; không tự cài).
- `src/shared/clinical/`: kiểu sinh tự động, validator, adapter hai màn, merge nháp AI và bộ lọc cục bộ.
- `src/server/clinical/`: ticket riêng tư, gọi model/kiểm chứng, kho artifact, repository JSON, duyệt.
- `data/clinical/encounters/<uuid>.json`: bản hiện tại; `revisions/<uuid>-rN.json`: lịch sử bất biến.
- `data/clinical/runs/`, `transcripts/`, `run-index/`: kết quả AI và transcript **đã lọc và được xác nhận**. Không lưu transcript raw mặc định. Các thư mục dữ liệu runtime được gitignore.
- Run giữ model/prompt/schema version và digest; retry cùng input đã được xác nhận dùng lại kết quả. Provider lỗi mạng không tự gọi lần hai; chỉ output sai kiểm tra mới được sửa một lần.

| Endpoint | Chức năng |
|---|---|
| `POST /api/clinical/privacy` | `check`: che R1–R8, lớp NER (mặc định bật, tắt bằng `PII_NER=off`; gọi `POST /ner` của STT local, trả `ner`), chốt chặn R11 (còn sót thì tự che rồi kiểm lại, trả `auto_masked`), đọc đồng ý R14; không gọi LLM |
| `POST /api/clinical/extract` | Nhận ticket đã duyệt, trả `ClinicalExtraction` |
| `POST /api/clinical/encounters` | Tạo/cập nhật hồ sơ với expected revision và run ID đã áp dụng |
| `GET /api/clinical/encounters/[id]` | Đọc hồ sơ, projection và artifact AI gần nhất nếu còn |
| `POST /api/clinical/approve` | Bác sĩ duyệt revision đã lưu |
| `POST /api/extract` | Đã ngừng, trả 410; không còn đường chuyển raw text trực tiếp ra LLM |

Gói STT ở root `app/` đã được chuyển vào `src/app/` để Next.js đăng ký được cả STT và eForm; code engine STT giữ nguyên.

## Giới hạn có chủ đích

- Chỉ dữ liệu giả, persona bệnh nhân/bác sĩ từ fixture server. Local/origin guard là ranh giới của bản demo, **không phải xác thực/phân quyền HIS**. Chưa tích hợp đăng nhập, lịch khám thật, hệ thống CLS, chữ ký số, gửi chỉ định hoặc database bệnh viện.
- Bộ lọc dùng quy tắc và danh tính đã biết, có thể bỏ sót tên hoặc chuyện riêng tư viết tự do. Từ 17/11/2026 không còn bước duyệt tay trước model: lớp bảo vệ là chốt chặn R11 và việc bác sĩ duyệt phiếu sau cùng. Che tự động chưa chứng minh khử định danh đầy đủ. Không nhập bệnh nhân thật trước khi có đánh giá riêng tư và phân quyền phù hợp.
- Kiểm chứng bằng chứng phát hiện nhiều lỗi cấu trúc, trích dẫn, vai trò, số và bên; không chứng minh mọi kết luận/tóm tắt của model đúng. Bác sĩ vẫn chịu trách nhiệm duyệt.
- Mock chỉ trích mệnh đề rõ ràng, chưa đủ khả năng hiểu hội thoại như LLM. Không tự suy thuốc, chẩn đoán hoặc dịch vụ từ triệu chứng.
- Repository dành cho prototype một instance; khóa file không có cơ chế tự phá khóa sau process crash. Giữ metadata chuẩn giúp thay repository bằng database sau.
- Danh mục và thông tin BHYT là dữ liệu tham khảo, không tự tính quyền lợi/chi trả. Chỉ định hủy/thay thế hoặc nhóm nhập từ HIS cần quy trình bác sĩ riêng.
- Task 1a cải thiện phân tách giọng vẫn hoãn. Task 1b đánh giá phòng khám thực tế cần file người dùng cung cấp.

## Kiểm tra

`npm test` chạy cả test `src/` và `lib/`; `npm run lint`, `npm run build`, `npm run clinical:check` kiểm các lớp còn lại. Đã kiểm luồng bằng Chrome headless với model mock: privacy gate → trích xuất → giữ tóm tắt bác sĩ → chọn ICD/dịch vụ → lưu từ tab chỉ định → tải lại → duyệt → chặn in khi sửa sau duyệt. Không có lỗi JavaScript trong lượt kiểm tra này.
