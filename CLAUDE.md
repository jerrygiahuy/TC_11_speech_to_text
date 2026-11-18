@AGENTS.md

# Trợ lý điền bệnh án TMH – hướng dẫn cho Claude

Prototype Next.js 16 (App Router) + React 19 + Tailwind 4. Bác sĩ nói hoặc gõ tắt, AI tách và điền nháp Phiếu khám, Chỉ định, Đơn thuốc. Chi tiết cách chạy và cấu hình xem `README.md`; quan sát thực địa xem `docs/` (tóm tắt và cấu trúc màn hình EMR) và `docs/tham-khao/` (nhật ký, báo cáo tuần, mục lục ở `docs/tham-khao/README.md`). Cần biết bác sĩ thực sự nhập gì, mất bao lâu thì tra ở đó trước khi đoán.

## Quy tắc bắt buộc

1. **Mọi thay đổi đều phải ghi tài liệu, kể cả thay đổi nhỏ nhất** (một dòng code, một khóa JSON, một màu, một dependency). Sau khi sửa, dùng skill `ghi-tai-lieu`: thêm mục vào `docs/CHANGELOG.md` và cập nhật `README.md` / `docs/` liên quan. Hook `Stop` sẽ chặn nếu quên.
2. **Chỉ dùng dữ liệu giả.** Không thêm tên, PID, CCCD, tài khoản bác sĩ hay nội dung lâm sàng thật vào code, dữ liệu mẫu, tài liệu hay commit. **Thông tin nhạy cảm** (tên người thật, quốc tịch bệnh nhân, hồ sơ cá nhân, ảnh chụp màn hình EMR, bản gốc chưa làm sạch) **chỉ để trong `temp-1/`** (đã gitignore). Đưa vào `docs/` thì phải làm sạch trước.
3. **Mã danh mục chỉ được gán bởi code khớp danh mục** (`src/shared/match.ts`), không bao giờ để LLM tự điền mã. Không đặt `ai_fill: true` cho trường mã.
4. **Next.js 16 khác dữ liệu huấn luyện.** Trước khi viết code dùng API Next, đọc `node_modules/next/dist/docs/` hoặc tra context7.
5. Viết tài liệu, nhãn giao diện, thông báo lỗi bằng tiếng Việt, giữ giọng văn hiện có.

## Lệnh thường dùng

```bash
npm run dev                  # http://localhost:3000, mặc định LLM_PROVIDER=mock
npm run lint
npm test                     # test node:test cho src/**/*.test.ts
npm run build
npm run eval -- --rule-only  # chấm điểm bộ tách quy tắc, không tốn phí API
npm run eval-mau             # đo phiếu mẫu theo bệnh đúng sẵn bao nhiêu (mock, không tốn phí)
npm run cao-du-lieu          # cào lại danh mục thật về data/tham-khao/ (ứng dụng chưa nạp)
npm run tai-model-giong-noi  # tải model Zipformer về models/, cần cho ASR_PROVIDER=zipformer
npm run tao-am-thanh-mau     # Windows: giọng máy đọc 11 ca thành data/giong-noi/*.wav
npm run eval-giong-noi       # đo nhận dạng giọng nói + bộ sửa chữ (config/sua-chu-giong-noi.json)
```

`npm run eval -- --provider=anthropic|openai|gemini` gọi API thật và tốn phí: hỏi trước khi chạy.

## Kiến trúc nhanh

- Chỉ có hai trang: `/` là eForm (mô phỏng phiếu khám EMR + cột Trợ lý AI, `src/client/eform/`), `/ket-qua` là số đo lượt thử (ghi khi bấm Lưu trên eForm). Trang "Màn hình làm việc" cũ đã bỏ ngày 2026-11-11.
- `config/forms/*.json` sinh ra schema gửi LLM, prompt, mock và eval. Giao diện eForm viết tay: thêm trường thì sửa JSON, rồi nối vào `src/shared/eform/dien-phieu.ts` và `src/client/eform/` nếu cần hiện trên phiếu.
- Code chia theo nơi chạy, xem `docs/cau-truc-du-an.md`: `src/app` (định tuyến mỏng), `src/client` (FE), `src/server` (BE, có `import "server-only"`), `src/shared` (TS thuần dùng cả hai phía). `src/client` không import `src/server`, gọi qua `/api/*` bằng `src/client/api.ts`; kiểu request/response đặt ở `src/shared/api.ts`. `npm run lint` chặn import sai chiều.
- AI thật (LLM, ASR) ở `src/server/ai/`: `pipeline.ts` → `llm/{mock,anthropic,openai,gemini,rules}.ts` → `src/shared/match.ts` (khớp danh mục) → `src/shared/validate.ts`.
- `src/shared/eform/` là rule mock cho trang eForm (tóm tắt, gợi ý ICD10, mẫu câu, gợi ý chỉ định và đơn thuốc theo chẩn đoán, đếm số đo lượt thử), chạy trên trình duyệt, không gọi LLM.
- Script ngoài Next import code server phải chạy bằng `tsx --conditions=react-server` (như `npm run eval`), nếu không `server-only` sẽ báo lỗi.
- Thêm trường mới thì bổ sung `expected` trong `data/cases/ca-*.json` để eval không tính là "Thừa".

## Kiểm tra trước khi báo xong

- `npm run lint` sạch; đổi logic tách/khớp thì chạy `npm run eval -- --rule-only` và ghi điểm trước/sau vào CHANGELOG.
- Đổi giao diện thì mở trang trong trình duyệt (plugin playwright) để xem thật.

## Plugin dùng trong dự án

Khai báo trong `.claude/settings.json`: `typescript-lsp` (cần `npm i -g typescript-language-server typescript`), `playwright`, `security-guidance`, `claude-md-management`, `commit-commands`, `frontend-design` (skill thiết kế giao diện). Lý do chọn từng cái xem `docs/CHANGELOG.md` mục ngày 2026-11-10 và 2026-11-11.
