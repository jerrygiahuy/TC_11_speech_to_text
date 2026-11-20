# Clinical JSON implementation plan

**Goal:** Triển khai task 2 thành cấu trúc runtime, lưu/đọc hồ sơ JSON và ánh xạ với eForm hiện tại, chỉ phiếu khám và chỉ định dịch vụ.

**Spec:** `docs/task-2/README.md`, `ai-contract.md`, `field-mapping.md`, schema 1.1.0; kê đơn do bác sĩ thực hiện riêng.

**Architecture:** Dùng JSON Schema làm nguồn chuẩn, sinh TypeScript và tạo validator Zod từ schema đã resolve local refs. Repository JSON một process kiểm revision và ghi nguyên tử. API nhận snapshot hai màn, server tạo metadata và chuyển sang aggregate; UI lưu/tải lại qua API mới.

**Tech Stack:** Next.js 16.4.5, React 19, TypeScript, Zod 4, Node fs.

## Global constraints

- Không sửa engine STT/diarization; chưa triển khai model trích xuất 1.1.0 hoặc bộ lọc riêng tư task 5 trong đợt task 2.
- Không trích xuất/điền đơn thuốc. Giữ tab bác sĩ nhập thuốc bằng tay độc lập; không lưu thuốc trong clinical aggregate.
- Prototype chỉ dữ liệu giả, chưa có xác thực HIS. API clinical chỉ cho localhost và nguồn cùng origin; không dùng cho bệnh nhân thật trước khi có auth/authorization.
- Làm trong checkout hiện tại trên nhánh `stt`, giữ nguyên tài liệu chưa commit của phiên trước. Không tạo worktree/commit/push vì sẽ tách tài liệu đang được triển khai khỏi workspace người dùng.

## Review focus

- Unknown khác false/0 và không tự biến số lượng thiếu thành 1 trong hồ sơ mới.
- Không nhận ID bác sĩ/bệnh nhân hoặc approved_by từ client.
- Lưu lỗi/xung đột không được báo thành công; hai tab chỉnh cùng revision chỉ một tab được ghi.
- Reload phải khôi phục đủ dữ liệu hai màn, không mất trường chuyên khoa/nguồn đã có.
- Mẫu AI, mock, thói quen và fallback không được đưa thuốc vào tab bác sĩ kê tay.

## Tasks

- [x] 1. Di chuyển schema sang `config/clinical`, sinh types, validator runtime và factory rỗng. Test positive/negative fixtures, đơn thuốc bị reject, validation nghiệp vụ.
- [x] 2. Adapter eForm ↔ aggregate. Test boolean/unknown, ngày giờ, chẩn đoán hai giai đoạn, nguồn, kết quả/sinh hiệu, mã và số lượng dịch vụ.
- [x] 3. Repository/API save/read. Test vòng lưu-đọc, retry, revision conflict, mã đường dẫn, metadata và origin guard. Ignore toàn bộ clinical/private runtime data.
- [x] 4. Nối nút Lưu và Tải bản lưu vào eForm, báo lỗi đúng; ngắt mọi đường AI kê thuốc, giữ nhập tay. Test giới hạn scope ở server và client boundary.
- [x] 5. Chạy schema verification, test suite, typecheck/lint/build; review độc lập một lần, sửa các lỗi quan trọng; cập nhật tài liệu với phần đã triển khai và phần task 3/4/5 còn chờ.

## Execution ledger

- Baseline: `npm test` lỗi 2 file vì dependency `server-only` chưa có trong node_modules; package đã được khai báo. Khôi phục dependencies trước khi đánh giá hồi quy.
- Ruling: Không xây model, auth HIS hoặc bộ lọc regex giả làm bảo mật hoàn chỉnh trong task 2; các phần đó cần đợt triển khai tương ứng. Clinical JSON lưu nháp, không tự phê duyệt/in chính thức.

## Scope mở rộng được người dùng yêu cầu trong cùng phiên

Người dùng yêu cầu tiếp tục tới hết các task và dùng multi-agent tiết kiệm token. Phần task 2 ban đầu được mở rộng triển khai cả task 3–5, vẫn loại kê đơn và giữ task 1a hoãn/1b chờ file. Các giới hạn ban đầu về chưa triển khai model/privacy không còn áp dụng cho scope mở rộng.

- [x] Privacy cục bộ + server, ticket pending/passed, review bắt buộc trước model, TTL và giới hạn bộ nhớ.
- [x] Trích xuất schema 1.1.0, bằng chứng/role/số/bên/phủ định, mock và provider adapters, artifact bất biến + retry/idempotency.
- [x] UI kiểm tra transcript/nháp, ưu tiên sửa tay, lưu/tải hai màn, metadata nguồn và chẩn đoán kèm có giai đoạn.
- [x] Duyệt backend và chặn in bản chưa duyệt/đã sửa. Không có xác thực HIS hoặc tích hợp bệnh viện thật.
- [x] Review theo phạm vi: sửa mất metadata/dẫn chứng khi lưu lại, nút Lưu nháp giả, ghi đè tóm tắt tay, chẩn đoán kèm không duyệt được, reset phiếu trong lúc lưu.
- [x] Chrome headless kiểm toàn luồng với mock; không gọi model trả phí.

Phân công: Sol xử lý privacy và extraction; Luna xử lý assistant UI; root tích hợp, persistence, approval và kiểm thử. Một agent chạm hạn mức ở bước hoàn thiện nhỏ; root nhận phần còn lại. Không commit/push.

Vẫn chờ: ghi âm phòng khám thật, đánh giá model/từ chuyên môn, hạ tầng auth/HIS/database và kiểm định riêng tư trước dữ liệu thật.

## Kết quả xác minh cuối

- `node node_modules/tsx/dist/cli.mjs --conditions=react-server --test 'src/**/*.test.ts' 'lib/**/*.test.ts'`: 113/113 đạt.
- TypeScript, ESLint toàn repo, production build Next.js: đạt.
- `npm run clinical:check`: 5 schema, 9 ví dụ, 9 payload sai được kiểm tra; generated types khớp schema.
- Chrome headless trên production build với `CLINICAL_LLM_PROVIDER=mock`: privacy → extraction → giữ tóm tắt nhập tay → chọn ICD/dịch vụ → Lưu nháp → reload → duyệt → in được; sửa sau duyệt bị chặn in; không lỗi JavaScript. Server smoke tạm tự dừng.
- Không gọi API model trả phí; không kiểm định chất lượng STT hội thoại thực tế vì chưa có file người dùng.
