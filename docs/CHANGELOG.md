# Nhật ký thay đổi

Mỗi thay đổi, dù nhỏ, đều có một mục ở đây. Mục mới nhất ở trên cùng. Cách ghi xem `.claude/skills/ghi-tai-lieu/SKILL.md`.

## 2026-11-20

### Xóa 105 file bản sao " 2" giống hệt bản gốc
- **Loại:** Dọn dẹp
- **Thay đổi:** Xóa 105 file tên có " 2" (bản sao do đồng bộ thư mục) có nội dung giống hệt bản gốc (kiểm bằng `cmp`), trong đó có 11 ca `data/cases/* 2.json` bị `loadCases()` nạp trùng. Còn 56 file " 2" khác bản gốc: 54 file trùng đúng bản ở commit `6a09af2`, `README 2.md` chỉ có một dòng ghi chú cũ, `docs/CHANGELOG 2.md` không có dòng riêng. 56 file này chờ chủ repo xác nhận rồi mới xóa, và không đưa vào commit.
- **Lý do:** Task 0 của plan CardioNote: dọn bản sao trước khi làm tiếp; tránh nạp trùng ca và nhiễu lint, type-check.
- **File:** 105 file `* 2*` (đã xóa), `docs/CHANGELOG.md`
- **Kiểm tra:** `npm test` 422 test, 409 đạt, 13 lỗi sẵn có như trước. `npm run lint` từ 7 lỗi còn 3, cả 3 ở `src/shared/eform/dien-phieu.test 2.ts` (thuộc 56 file chờ xác nhận).
- **Ảnh hưởng:** Không đổi hành vi ứng dụng.

### Plan CardioNote: sản phẩm riêng cho Trung tâm Tim mạch
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/superpowers/plans/pending/2026-11-20-cardionote-tim-mach.md`: 12 task (0–11) cùng 2 lượt review Opus, mỗi task ghi agent (Haiku/Sonnet), phụ thuộc, file, giao diện, test cần viết. Mục tiêu: lớp nghiệp vụ theo Excel phiếu khám ngoại trú Tim mạch, không còn TMH, có test phủ trường Excel và test chặn TMH. Thêm dòng vào `docs/superpowers/plans/pending/README.md`.
- **Lý do:** Chuyển TC_11 thành sản phẩm riêng của Trung tâm Tim mạch, chia việc cho sub-agent theo CLAUDE.md quy tắc 7.
- **File:** `docs/superpowers/plans/pending/2026-11-20-cardionote-tim-mach.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đối chiếu tên hàm, khóa schema (`referral_source`, `thong_tin_khac`, `issue.loai`) với code hiện tại.
- **Ảnh hưởng:** Không đổi code.

### Đổi nhãn, prompt và mã khoa từ TMH sang Tim mạch (bước 1)
- **Loại:** Giao diện, Cấu hình, Tài liệu
- **Thay đổi:** Đổi tiêu đề trang và header thành "Trợ lý điền bệnh án Tim mạch". Nhãn ô "Khám chuyên khoa TMH..." thành "Khám chuyên khoa" ở eForm, bản in, demo luồng và mô phỏng phiếu. Prompt AI nói "bác sĩ Tim mạch" và "ngoại trú Tim mạch". Mã khoa `department_id` đổi từ `tmh` thành `tim-mach`, mã phòng mẫu thành `prototype-tim-mach-01`. Khóa localStorage thiết bị đổi từ `tmh-device-id` thành `eform-device-id`. Ba câu đọc mẫu ở đăng ký giọng bác sĩ thay bằng câu Tim mạch giả (đau ngực, khám tim, tăng huyết áp). Đổi dòng tiêu đề trong `CLAUDE.md`.
- **Lý do:** Repo mượn từ dự án Tai Mũi Họng và đang chuyển thành 100% cho Trung tâm Tim mạch. Bước 1 chỉ đổi nhãn, prompt, mã khoa và khóa lưu; từ điển thuật ngữ và schema cấu hình để các bước sau.
- **File:** `src/app/layout.tsx`, `src/client/chung/Header.tsx`, `src/client/eform/EformForm.tsx`, `src/client/eform/BanIn.tsx`, `src/client/eform/EncounterWorkspace.tsx`, `src/client/demo-luong/DemoPhieuPanel.tsx`, `src/client/giong-bac-si/DangKyGiong.tsx`, `src/shared/eform/dien-phieu.ts`, `src/shared/clinical/schema.ts`, `src/server/ai/prompt.ts`, `src/server/clinical/extraction.ts`, `src/server/clinical/service.ts`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npm test`: 422 test, 409 đạt, 13 lỗi; danh sách 13 test lỗi giống hệt trước khi sửa (lỗi sẵn có, không có lỗi mới). `npm run lint`: 7 errors, 6 warnings, giống trước khi sửa (không thêm lỗi; cả 7 lỗi `no-restricted-imports` nằm ở 3 file bản sao `src/shared/eform/*.test 2.ts`). Chưa mở trình duyệt xem giao diện.
- **Ảnh hưởng:** Mã khoa và mã phòng trong dữ liệu clinical mới tạo sẽ là `tim-mach` và `prototype-tim-mach-01`; bản ghi cũ giữ `tmh`. Ghi nhận khóa localStorage cũ `tmh-device-id` sẽ không còn đọc được, nên thiết bị sinh mã mới một lần. Chưa đổi: từ điển thuật ngữ TMH trong `src/server/clinical/pii-allowlist.ts` và `src/shared/eform/mau-cau.ts`, mã dịch vụ `DV-TMH-003` trong test, dữ liệu `data/`, schema `config/clinical/`.

### Gộp worktree Codex về checkout chính
- **Loại:** Cấu hình
- **Thay đổi:** Gỡ git worktree `../TC_11_codex_worktree` (nhánh `feature/tc11-codex-opd`, chưa có commit riêng) và xóa nhánh đó. Chuyển sang checkout chính: `docs/tc11-nghiem-thu-phieu-ngoai-tru.md`, `docs/tc11-kho-luu-local.md` và thư mục `models/` (Zipformer, diarization, VAD; vẫn gitignore). Tạo lại `.venv-stt` (Python 3.12, `uv pip install -r stt/requirements-lock.txt`) vì môi trường ảo không chuyển thư mục được.
- **Lý do:** Chỉ làm việc ở một chỗ (`TC_11_speech_to_text`); worktree gần như trùng cây chính và đang giữ cổng 3000.
- **File:** `docs/tc11-nghiem-thu-phieu-ngoai-tru.md`, `docs/tc11-kho-luu-local.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `git worktree list` chỉ còn checkout chính; `.venv-stt/bin/python -c "import stt.api"` chạy được.
- **Ảnh hưởng:** Không đổi code. Dữ liệu chạy thử trong worktree (`data/clinical/encounters/`, `recording-leases/`) rỗng nên không cần chuyển.

### Trang Phiếu khám ngoại trú (Tim mạch) lưu mọi trường ra file JSON
- **Loại:** Tính năng
- **Thay đổi:** Thêm trang `/phieu-kham-ngoai-tru` dựng form động từ `config/forms/phieu-kham-ngoai-tru.json` (49 trường gốc, mỗi kiểu một control, bảng lặp thêm/xóa dòng, chọn 1 có nút bỏ chọn, huyết áp tách số, BMI tự tính khi đủ chiều cao và cân nặng, nút "Điền ví dụ"). API `GET/POST /api/phieu-kham-ngoai-tru`, `GET/PUT/DELETE /api/phieu-kham-ngoai-tru/<id>` kiểm tra bằng schema zod sinh từ config. Store ghi `data/phieu-kham-ngoai-tru/<uuid>.json` nguyên tử (file tạm rồi đổi tên), chặn id không phải UUID. Thêm link "Phiếu khám Tim mạch" vào Header.
- **Lý do:** Prototype để lưu được toàn bộ dữ liệu phiếu khám ngoại trú Tim mạch (không gọi AI), làm nền cho các bước sau.
- **File:** `src/shared/phieu-kham-ngoai-tru/{types,config,du-lieu,schema}.ts`, `src/shared/phieu-kham-ngoai-tru/phieu-kham-ngoai-tru.test.ts`, `src/server/phieu-kham-ngoai-tru/store.ts`, `src/server/phieu-kham-ngoai-tru/store.test.ts`, `src/app/api/phieu-kham-ngoai-tru/route.ts`, `src/app/api/phieu-kham-ngoai-tru/[id]/route.ts`, `src/app/phieu-kham-ngoai-tru/page.tsx`, `src/client/phieu-kham-ngoai-tru/{PhieuKhamNgoaiTru.tsx,Control.tsx,api.ts}`, `src/client/chung/Header.tsx`, `data/phieu-kham-ngoai-tru/.gitkeep`, `.gitignore`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npm test`: 12 test mới đạt (bản rỗng đủ khóa, schema nhận bản rỗng và bản ví dụ, từ chối chon_1 ngoài danh sách, lưu rồi đọc lại khớp từng trường, id không phải UUID bị từ chối); số test lỗi vẫn là 13 như trước. `npm run lint` không thêm lỗi. Chạy `next dev` cổng 3100 và dùng curl: trang 200, POST bản ví dụ rồi GET khớp, PUT đổi file trên đĩa, id sai trả 400, id không có trả 404. Chưa xem giao diện bằng trình duyệt.
- **Ảnh hưởng:** Thêm trang và API mới; không đổi eForm `/`, lớp clinical hay dữ liệu cũ. File phiếu nhập tay không lên git.

## 2026-11-19

### Bàn giao bảng ánh xạ Phiếu khám ngoại trú Tim mạch (Claude Code)
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `handoff/claude/` gồm: rà 24 ảnh phiếu, bảng ánh xạ nhãn → khóa → nguồn → eForm → bản in theo mã ảnh, 17 câu hỏi cho bác sĩ và IT, ba ca kiểm thử (SYN-CARDIO-013, 001, 039) với đầu ra mong đợi, đề xuất dữ liệu Tim mạch thay TMH có nhãn nguồn, kiểm kê nơi còn nạp TMH.
- **Lý do:** Làm đầu vào cho Codex triển khai phiếu theo `PLAN_TC11_CLAUDE_CODE.md` mục 1–3.
- **File:** `handoff/claude/*.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Quét file bàn giao không thấy định danh hoặc giá trị bệnh nhân từ ảnh. Ảnh chỉ đọc cục bộ, không chép vào repo. Không sửa code, dữ liệu hay cấu hình.
- **Ảnh hưởng:** Không đổi hành vi ứng dụng.

### Đồng bộ mã nguồn nền mới nhất cho TC_11
- **Loại:** Đồng bộ mã nguồn, Tài liệu
- **Thay đổi:** Chép snapshot cây mã nguồn từ `speech-to-navigation@af402e1` (`origin/dev`) sang nhánh riêng của repo TC_11; giữ bộ dữ liệu giả lập Tim mạch và ghi rõ trạng thái chuyển đổi trong README.
- **Lý do:** Dùng chung nền tảng kỹ thuật mới nhất với nhóm anh Hùng nhưng duy trì repository và lịch sử commit độc lập cho Trung tâm Tim mạch.
- **File:** Toàn bộ cây mã nguồn nền; `data/cardiology/`, `docs/chuan-hoa-du-lieu-tim-mach.md`, `scripts/generate-cardiology-data.mjs`, `README.md`.
- **Kiểm tra:** Đối chiếu cây file với `origin/dev`; không sao chép thư mục `.git`; không thay đổi repo nguồn; chưa commit và chưa push.
- **Ảnh hưởng:** TC_11 nhận STT, che PII, luồng clinical và giao diện mới; các trường nghiệp vụ TMH vẫn cần được chuyển đổi sang Tim mạch.

## 2026-11-18

### Chuẩn hóa dữ liệu giả lập ngoại trú Tim mạch
- **Loại:** Dữ liệu, Tài liệu, Script
- **Thay đổi:** Tạo JSON Schema, từ điển trường có mức xác minh, thư viện câu khám và 60 tình huống tổng hợp ngoại trú Tim mạch; xuất đồng thời JSONL và CSV; bổ sung script tái tạo và tự kiểm tra ba tình huống ghi âm đầy đủ, thiếu và đọc bổ sung.
- **Lý do:** Chuẩn bị bộ dữ liệu riêng cho prototype TC_11 từ tài liệu khảo sát và cấu trúc phiếu ngoại trú được cung cấp, không dùng dữ liệu người bệnh thật.
- **File:** `data/cardiology/README.md`, `data/cardiology/data-dictionary.json`, `data/cardiology/exam-library.json`, `data/cardiology/schema/opd-synthetic-case.schema.json`, `data/cardiology/synthetic-cases.jsonl`, `data/cardiology/synthetic-cases.csv`, `data/cardiology/dataset-summary.json`, `scripts/generate-cardiology-data.mjs`, `docs/chuan-hoa-du-lieu-tim-mach.md`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `node scripts/generate-cardiology-data.mjs --check` đạt; 60 mã duy nhất; mỗi trạng thái 20 bản ghi; 30 lượt mới và 30 tái khám; JSON cấu hình parse thành công; quét không thấy định danh xuất hiện trong ảnh nguồn.
- **Ảnh hưởng:** Dataset Tim mạch đã sẵn sàng cho bước tích hợp và eval. Giao diện, prompt, catalog và các ca `data/cases/` hiện vẫn là TMH.

### Đưa hai quy tắc làm việc từ worktree priority-plan-2 vào nhánh
- **Loại:** Tài liệu, Quy trình
- **Thay đổi:** Quy tắc 6 (nhánh mới chỉ tạo từ `dev`, `main` là production) và quy tắc 7 (chia việc cho sub-agent) trong `CLAUDE.md`, cùng hai mục CHANGELOG ngày 2026-11-14, trước đây chỉ nằm ở thay đổi chưa commit của worktree `.claude/worktrees/priority-plan-2-c8793f`. Nay chép nguyên văn vào nhánh `ner-phobert`.
- **Lý do:** Rà soát trước khi merge `ner-phobert` vào `dev` cho thấy hai quy tắc này chưa có trên nhánh nào; xóa worktree là mất.
- **File:** `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đối chiếu từng dòng thêm với bản trong worktree. Không có thay đổi code.

### Sửa R3 "đường" và R2 che lấn: hết che nhầm chữ lâm sàng
- **Loại:** Sửa lỗi
- **Thay đổi** (`src/shared/clinical/pii/redact.ts`, theo plan `docs/superpowers/plans/pending/2026-11-18-sua-r2-r3.md`):
  - **R3 "đường".** "Đường" chỉ là tên đường khi có một trong các dấu hiệu sau:
    - số nhà đứng trước ("số 12 đường lê lợi");
    - dấu hiệu nơi chốn đứng ngay trước ("ở", "tại", "sống ở", "địa chỉ", "nhà em/tôi…");
    - hoặc dạng "đường số 5".

    Danh sách loại trừ cũ ("đái tháo", "tiểu", "huyết"…) giữ làm lớp chặn thứ hai (`DUONG_SRC`). "đái đường", "đường tiểu", "đường sinh dục", "trên đường đi học" không còn bị che. Câu thiếu dấu hiệu ("bé đi đường lê duẩn") để NER che.
  - **Không che qua dòng mới.** `buildText` trước đây gộp mọi khoảng trắng, kể cả xuống dòng, thành một dấu cách, nên R3 che lan sang dòng sau ("đường láng\nngười"). Nay cụm khoảng trắng có xuống dòng được giữ là `\n`, và mọi biểu thức R3 dùng khoảng trắng cùng dòng. Hệ quả kèm theo: R2 nhận đầu dòng là đầu câu, như code vốn định.
  - **R2 đuôi tên.** Từ âm tiết thứ hai sau họ, `nameTailEnd` chỉ nhận âm tiết mới khi âm tiết ngay trước là từ đệm (`TEN_DEM`: văn, thị, minh, ngọc, quốc, gia, thất…).
    - Hết nuốt chữ lâm sàng: "nguyễn thị tâm ~~dị~~ ứng", "đinh văn long ~~hút~~ thuốc", "lê văn tám ~~hen~~", "hoàng thị mai ~~tiền~~ sử", "võ thị hằng ~~thai~~".
    - "anh", "bảo" sau từ đệm vẫn là tên, nên "phạm ngọc anh thư" và "bùi gia bảo" được che đủ.
    - Chữ không dấu "thi" ngay sau họ là "thị".
    - Chốt chặn R11c dùng chung hàm này.
  - **Cái giá đã biết.** Ở đầu câu, tên hai âm tiết theo sau là động từ ("trần nam hút thuốc") không còn được R2 che nhờ nuốt thêm chữ; NER che bù.
  - `data/pii-eval/cau-stt.json` thêm 11 câu giả: `duong-01…06`, `ten-26…30`.
- **Số đo `eval-pii`** (71 câu STT, 3 kịch bản):

  | Chế độ | Bắt được trước | Bắt được sau | Che nhầm trước | Che nhầm sau |
  | --- | --- | --- | --- | --- |
  | Chỉ rule, câu STT | 18/44 | 18/44 | 9/84 | **0/84** |
  | Rule cộng NER, câu STT | 31/44 | 31/44 | 9/84 | **0/84** |
  | Kịch bản, cả hai chế độ | 13/13 | 13/13 | 0/8 | 0/8 |

- **Lý do:**
  - Người dùng báo tên bệnh có chữ "đường" bị hiểu thành địa danh; thiết kế R3 cách A đã được chọn.
  - Người dùng yêu cầu sửa R2 che lấn sang chữ kế tiếp.
  - GitNexus xếp `redactPii` và `nameTailEnd` mức HIGH: eForm `privacy.check`, `/demo-luong`, R11c.
- **File:** `src/shared/clinical/pii/redact.ts`, `src/shared/clinical/pii/redact.test.ts`, `src/shared/clinical/pii/gate.test.ts`, `data/pii-eval/cau-stt.json`, `docs/superpowers/plans/pending/2026-11-18-sua-r2-r3.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - 3 test mới đỏ trước khi sửa, đạt sau khi sửa: R3 cần dấu hiệu, R3 không lan dòng, R2 đuôi tên.
  - `npm test` 409/410; test đỏ duy nhất `encounter-context.test.ts` có từ trước.
  - `eslint src scripts` 0 lỗi; `tsc` sạch.
  - Không chạy lại `eval --rule-only` để so điểm: bộ tách `src/server/ai` không dùng bộ che PII nên điểm không thể đổi.
  - `detect-changes` mức critical, do nhánh còn lẫn thay đổi micro/STT chưa commit.

### Thiết kế sửa R3: "đường" chỉ là tên đường khi có dấu hiệu nơi chốn
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/superpowers/plans/pending/2026-11-18-r3-duong-design.md`, bản thiết kế ngắn. Lỗi tên bệnh có chữ "đường" bị che thành `[ĐỊA_DANH]` là do rule R3, không do NER:
  - R3 coi mọi "đường" là tên đường, rồi dựa vào danh sách loại trừ viết tay;
  - R3 che lan sang dòng sau.

  Người dùng chọn cách A: chỉ nhận "đường" khi có dấu hiệu nơi chốn ("ở", "tại", "nhà", số nhà…), và R3 không che qua dòng mới.
- **Lý do:** Người dùng báo "đái tháo đường", "tiểu đường", "đường huyết" bị hiểu là địa danh. Thử 20 câu: NER không gán nhầm câu nào; R3 che sai "đái đường biến chứng thận" và "nhiễm trùng đường tiểu tái phát".
- **File:** `docs/superpowers/plans/pending/2026-11-18-r3-duong-design.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chưa sửa code, chờ duyệt thiết kế.

### Bật NER mặc định; NER không che đoạn chỉ có một chữ cái
- **Loại:** Tính năng, sửa lỗi
- **Thay đổi:**
  - **Bật mặc định.** `goiNer` mặc định gọi NER, chỉ tắt khi đặt `PII_NER=off`; không đặt biến cũng tính là bật. `.env.example` đổi thành `PII_NER=on`. STT không chạy thì lượt đó vẫn che bằng rule, và trang hiện "NER: không chạy, chỉ dùng rule".
  - **Cách ly test.** `flow.test.ts` đặt `PII_NER=off` ở đầu tệp, để test không gọi dịch vụ STT thật đang chạy trên máy. Test nào cần NER thì tự tiêm `ner`.
  - **Sửa lỗi che "P.".** `locNer` bỏ đoạn có dưới 2 chữ cái hoặc chữ số; trước đây điều kiện là dưới 2 ký tự. Lỗi gặp khi quét NER trên ca mẫu gõ tắt: mô hình gán "P." (bên phải) là tên người, nên "khối u sau tai P." thành "tai [NGƯỜI_1]" và mất thông tin bên.
  - README, `docs/STT.md`, `docs/CLINICAL-WORKFLOW.md` và `docs/DATA-USE-POLICY.md` ghi NER mặc định bật.
- **Lý do:** Người dùng chọn bật NER mặc định sau khi xem số đo `eval-pii` (câu STT 29,7% → 64,9%, che nhầm không tăng). Lỗi "P." chỉ lộ ra khi quét toàn bộ dữ liệu giả có sẵn.
- **File:** `src/server/clinical/ner-client.ts`, `src/server/clinical/ner-client.test.ts`, `src/server/demo-luong/flow.ts`, `src/server/demo-luong/flow.test.ts`, `src/shared/clinical/pii/ner.ts`, `src/shared/clinical/pii/ner.test.ts`, `.env.example`, `README.md`, `docs/STT.md`, `docs/CLINICAL-WORKFLOW.md`, `docs/DATA-USE-POLICY.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Hai test mới đỏ trước khi sửa: "không đặt PII_NER thì mặc định bật NER" và "bỏ đoạn NER chỉ có một chữ cái kèm dấu câu". `thu-che-pii --ner` với "amidan P. sưng đỏ" không còn che "P.".

### Task 10 NER: huấn luyện xong, đo rule cộng NER, sửa lệch dấu thanh, chính sách dữ liệu
- **Loại:** Tính năng, sửa lỗi
- **Thay đổi:**
  - **Kết quả huấn luyện.** Chạy 17:51–19:39 (6383 giây, 5 epoch). `meta.json` ghi:
    - F1 theo thực thể (4 loại dùng) trên test là 0,956 với chữ gốc và 0,933 với bản kiểu STT;
    - ngưỡng 0,3, precision 0,937 trên dev kiểu STT;
    - `model_sha256` `5c6608c8…`.
  - **Sửa lỗi `/ner` trả 500.** RDRSegmenter đổi dấu thanh kiểu cũ sang kiểu mới ("hòa" → "hoà"), nên `word_offsets` báo từ không khớp văn bản. Câu bị lỗi là `noi-04` ("bệnh viện đa khoa hòa bình"); máy chủ đã rơi về chỉ dùng rule. Nay `word_offsets` so âm tiết bằng `_syllable_key`, bỏ qua chỗ đặt dấu thanh nhưng vẫn phân biệt dấu khác nhau.
  - **Đo `eval-pii`** (STT đã nạp mô hình):

    | Bộ | Chỉ rule | Rule cộng NER |
    | --- | --- | --- |
    | Câu STT, bắt được | 11/37 (29,7%) | 24/37 (64,9%) |
    | Câu STT, che nhầm | 2/73 | 2/73 |
    | Câu STT, p95 | 0,9 ms | 23 ms |
    | Kịch bản, bắt được | 13/13 | 13/13 |
    | Kịch bản, che nhầm | 0/8 | 0/8 |
    | Kịch bản, p95 | 2 ms | 100 ms |

    Gọi `/ner` thẳng: lần đầu 1,1 giây (nạp mô hình), sau đó 25–50 ms cho 3 câu.
  - **Còn sót.** Tên một âm tiết đứng trơn ("thằng tuấn", "bác sĩ hùng") và tên đầy đủ của người nhà ("bố cháu đinh văn long"). Ở `/demo-luong` ca "tự che thêm", NER che "đỗ quốc việt" nhưng gán nhãn địa danh `[ĐỊA_DANH_1]` thay vì tên người: chữ vẫn được che, chỉ sai nhãn.
  - **Điều kiện bật** (plan Task 10): đạt. Câu STT bắt được nhiều hơn, che nhầm không tăng, p95 dưới 2000 ms. Kịch bản đã 13/13 khi chỉ dùng rule nên không thể tăng; được tính là đạt vì không giảm. Mặc định **vẫn `PII_NER=off`**, chờ người dùng quyết.
  - **Kiểm trình duyệt với `PII_NER=on`.** eForm che "nguyễn thị lan" thành `[NGƯỜI_1]` và hiện "NER: đã chạy (1 đoạn)"; lúc NER tắt chữ "lan" vẫn lộ. `/demo-luong` chế độ Kỹ thuật hiện "Lớp NER: NER: đã chạy (1 đoạn)". Thêm cấu hình `dev-ner` vào `.claude/launch.json` để mở server với `PII_NER=on`.
  - **`docs/DATA-USE-POLICY.md`:**
    - lên `pii-auto-2`;
    - thêm mục "Dự án nghiên cứu, lớp NER và giấy phép": nghiên cứu từ 18/11/2026; điều khoản PhoNER_COVID19 và trích dẫn NAACL 2021; cấm phát hành dữ liệu và trọng số; PhoBERT MIT; VnCoreNLP GPL-3.0; NER chạy cục bộ, lỗi thì dùng rule; giới hạn đã đo.
  - README và `docs/STT.md` thêm số đo, ghi chú cần `JAVA_HOME` khi chạy STT, và cách sửa lệch dấu thanh.
- **Lý do:** Plan NER Task 4 bước 6, Task 5 bước 5, Task 8 bước 5 và Task 10.
- **File:** `stt/ner_text.py`, `stt/tests/test_ner_text.py`, `.claude/launch.json`, `docs/DATA-USE-POLICY.md`, `docs/STT.md`, `README.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - `pytest stt/tests` 130 đạt, có `test_word_offsets_accepts_moved_tone_mark` (đỏ trước khi sửa) và `test_word_offsets_still_rejects_other_tone`.
  - `npm test` 403/404. Test đỏ duy nhất là `encounter-context.test.ts`, có từ trước, không liên quan.
  - `eslint src lib scripts` 0 lỗi; `tsc --noEmit` sạch.
  - `detect-changes --scope all` xếp mức critical (54 file, 146 luồng). Phần lớn luồng thuộc thay đổi micro/STT chưa commit có từ trước.

### Huấn luyện NER tự giữ máy không ngủ; bắt đầu lần huấn luyện thật
- **Loại:** Tính năng
- **Thay đổi:**
  - Trên Windows, `stt/ner_train.py` gọi `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` ngay khi bắt đầu, để máy không tự ngủ trong lúc huấn luyện. Không đổi cài đặt nguồn; tự hết khi tiến trình kết thúc. Gập nắp hay chọn Sleep thì máy vẫn ngủ.
  - Lần huấn luyện thật bắt đầu lúc 17:51 ngày 18/11, chạy như một tiến trình riêng: log ở `logs/ner-train.log` và `logs/ner-train.err.log`, PID ở `logs/ner-train.pid`. Lúc bắt đầu máy còn trống 6,4 GB RAM và đang cắm sạc.
- **Lý do:** Người dùng cho phép huấn luyện. Chế độ giữ máy thức của app tự hết sau khoảng 5 phút phiên không hoạt động, còn huấn luyện mất khoảng 2 giờ.
- **File:** `stt/ner_train.py`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `pytest stt/tests/test_ner_train_prep.py` 5 đạt. Chưa có kết quả huấn luyện; F1 và ngưỡng sẽ ghi khi chạy xong.

### Task 5 NER: endpoint `POST /ner` trong dịch vụ STT
- **Loại:** Tính năng
- **Thay đổi:**
  - Mới `stt/ner.py`:
    - `LocalNer` nạp mô hình ở lần gọi đầu; `ready()` chỉ kiểm file;
    - `OnnxWordTagger` chạy PhoBERT bằng onnxruntime int8, chia cửa sổ theo từ, đổi id vượt vocab thành `<unk>`;
    - các hàm `windows` và `stitch_windows`.
  - Mới `stt/ner_api.py` (router `/ner`). `create_app` nhận thêm `ner=None` và `/health` thêm `ner_ready`.
  - Vị trí trả về tính theo UTF-16 trên chuỗi NFC. Không log nội dung. `docs/STT.md` thêm mục "Lớp NER che PII".
- **Lý do:** Plan NER, Task 5 (spec D7). GitNexus xếp `create_app` rủi ro LOW.
- **File:** `stt/ner.py`, `stt/ner_api.py`, `stt/api.py`, `stt/tests/test_ner.py`, `docs/STT.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `pytest stt/tests` 128 đạt, trong đó 7 test `/ner` mới: vị trí UTF-16 với emoji, chữ NFD, 503 kèm `ner_ready: false`, đầu vào sai trả 400, chuỗi rỗng, chia cửa sổ, thực thể vắt qua hai cửa sổ ra một đoạn. Với mô hình chạy thử nhỏ, `LocalNer` trong `.venv-stt` chạy được, gồm câu 600 từ, lần đầu mất 2,4 giây. Chưa kiểm với mô hình thật.

### Task 9 NER: bộ đo `npm run eval-pii` và mốc của bộ rule
- **Loại:** Tính năng
- **Thay đổi:**
  - Mới `data/pii-eval/cau-stt.json`: 60 câu **giả** kiểu chữ STT. Gồm 25 câu có tên đứng một mình hoặc không có từ chỉ người, 10 câu có địa danh hay nơi làm việc, 15 câu bẫy ("sốt cao", "hà hơi", "khám lại", "hội chứng ménière", "bệnh kawasaki"…) và 10 câu thường.
  - Mới `src/shared/clinical/pii/danh-gia.ts`:
    - `danhGiaMotCau` so theo ranh giới từ ở dạng gấp, nên "lan" trong "lan tỏa" không bị tính là đã che;
    - `phanVi` tính p50/p95.
  - Mới `scripts/eval-pii.ts` (`npm run eval-pii`, thêm `--ner`, `--chi-tiet`). Kịch bản `/demo-luong` chấm với hồ sơ giả và allowlist của trang đó.
  - README thêm mục "Chấm bộ che PII".
- **Lý do:** Plan NER, Task 9 (spec D12): thước đo là "tốt hơn rule trên chữ của dự án".
- **File:** `data/pii-eval/cau-stt.json`, `src/shared/clinical/pii/danh-gia.ts`, `src/shared/clinical/pii/danh-gia.test.ts`, `scripts/eval-pii.ts`, `package.json`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `danh-gia.test.ts` 3 đạt. `npm run eval-pii` với chỉ rule:

  | Nguồn | Bắt được | Che nhầm | p50 / p95 |
  |---|---|---|---|
  | Câu STT giả | 11/37 (29,7%) | 2/73 | 0,3 / 1,0 ms |
  | Kịch bản `/demo-luong` | 13/13 (100%) | 0/8 | 1,6 / 2,0 ms |

- **Ảnh hưởng:** Đây là mốc để so khi bật NER (Task 10). Bộ câu cần bác sĩ duyệt và bổ sung.

### Task 3–4 NER: xử lý văn bản và script huấn luyện PhoBERT (chưa huấn luyện thật)
- **Loại:** Tính năng
- **Thay đổi:**
  - Mới `stt/ner_text.py`, gồm các hàm thuần dùng chung lúc huấn luyện và lúc chạy:
    - `stt_style`, `word_offsets`, `to_utf16`, `bio_spans`;
    - `relabel_full_names`: gắn lại `NAME` cho tên đầy đủ đang mang nhãn `O`, bỏ tên quốc gia như "Hàn_Quốc";
    - `resegment`: tách từ lại bằng VnCoreNLP rồi chiếu nhãn sang từ mới;
    - `load_ho_viet`: đọc thẳng `HO_VIET` từ `ho-viet.ts`, để TS và Python chung một danh sách họ.
  - Mới `stt/ner_train.py` (chạy bằng `npm run ner:train`) và `scripts/setup-ner-train.ps1` (`npm run ner:setup-train`), cùng `stt/requirements-ner-train.txt` (torch CPU 2.15, transformers 5.23, seqeval, onnx, onnxruntime).
  - Cách huấn luyện: fine-tune `vinai/phobert-base` trên bản gốc nối thêm bản STT; lưu checkpoint mỗi epoch, `--resume` chạy tiếp; `--probe-steps` đo thời gian dự kiến.
  - Đầu ra: xuất ONNX rồi lượng tử hóa int8; chọn ngưỡng trên dev-stt (ngưỡng nhỏ nhất có precision từ 0,85 trở lên); ghi `meta.json`.
  - Phát hiện `tokenizer.json` của `vinai/phobert-base` có 66.119 token, nhiều hơn `vocab_size` 64.001 của mô hình (lỗi "index out of range"). Script đổi các id vượt `vocab_size` thành `<unk>`, cả lúc huấn luyện lẫn lúc chạy. Đã đối chiếu: kết quả khớp `PhobertTokenizer` gốc trên cả 10.474 từ của PhoNER.
  - README thêm mục "Huấn luyện".
- **Lý do:** Plan NER, Task 3–4.
- **File:** `stt/ner_text.py`, `stt/tests/test_ner_text.py`, `stt/ner_train.py`, `stt/tests/test_ner_train_prep.py`, `stt/requirements-ner-train.txt`, `scripts/setup-ner-train.ps1`, `stt/ner.py`, `package.json`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - `pytest stt/tests`: 10 test `ner_text` và 5 test chuẩn bị dữ liệu đạt.
  - Trên tập train: gắn lại được 186 tên; tách từ lại khớp 474/500 câu, câu không khớp giữ bản viết thường.
  - Chạy thử nhỏ (64 câu, 1 epoch, 33 giây) ra đủ 4 file, `model.int8.onnx` 135 MB, sha256 hợp lệ. Mô hình này chạy được qua `LocalNer` trong `.venv-stt`, kể cả câu 600 từ phải chia cửa sổ.
  - Đo 50 bước trên toàn bộ dữ liệu: 1,79 giây/bước, 629 bước/epoch, 5 epoch ≈ 1,6 giờ cộng thời gian đánh giá.
  - **Chưa huấn luyện thật**: cần người dùng cho phép vì máy bận khoảng 2 giờ.

### Task 8 NER: nối lớp NER vào eForm, `/demo-luong` và `thu-che-pii`
- **Loại:** Tính năng
- **Thay đổi:**
  - **eForm:** route `/api/clinical/privacy` dùng `checkRecordingPrivacyWithNer`. Hàm này kiểm đầu vào, gọi `goiNer([text])`, rồi chuyển kết quả cho `checkRecordingPrivacy`; hàm đồng bộ cũ và các test của nó giữ nguyên. `PrivacyTickets.check` nhận `ner?`. Ticket giữ trạng thái NER cho nhật ký R13 lúc tạo bản nháp (`extract-recording.ts`) và lúc bị chặn. `PrivacyCheckResult` thêm `ner: { trang_thai, so_doan }`.
  - **`/demo-luong`:** `runDemoFlow` gọi `goiNer` trước `chePii` (test truyền `input.ner`). Sự kiện `che` thêm `du_lieu.ner`, nhật ký có trường `ner`.
  - **Giao diện:** hàm dùng chung `nhanNer` hiện một dòng "NER: đã chạy (n đoạn) / không chạy, chỉ dùng rule / tắt", dưới dòng đồng ý AI trong Trợ lý AI (eForm), và ở mục "Lớp NER" trong chi tiết bước ③ của `/demo-luong`.
  - **`npm run thu-che-pii -- --ner "câu"`:** gọi NER (bật `PII_NER` cho lượt này) rồi in riêng các đoạn NER.
  - README thêm mục "Bật NER". `docs/CLINICAL-WORKFLOW.md` ghi bước NER và đổi tên bộ che thành `pii-auto-2`.
- **Lý do:** Plan NER, Task 8 (spec D9–D11).
- **File:** `src/server/clinical/bound-privacy.ts`, `src/server/clinical/bound-privacy.test.ts`, `src/server/clinical/privacy.ts`, `src/server/clinical/extract-recording.ts`, `src/server/clinical/ner-client.ts`, `src/server/clinical/ner-client.test.ts`, `src/app/api/clinical/privacy/route.ts`, `src/shared/clinical/api.ts`, `src/server/demo-luong/flow.ts`, `src/server/demo-luong/flow.test.ts`, `src/shared/demo-luong/types.ts`, `src/shared/clinical/pii/nhan.ts`, `src/shared/clinical/pii/ner.test.ts`, `src/client/eform/TroLyAi.tsx`, `src/client/demo-luong/TechDetails.tsx`, `scripts/thu-che-pii.ts`, `README.md`, `docs/CLINICAL-WORKFLOW.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - `npm test` 400/401 đạt; lỗi duy nhất là lỗi cũ `encounter-context.test.ts`. Có 3 test eForm và 2 test `/demo-luong` mới, cùng test `nhanNer`.
  - `tsc --noEmit` sạch; `eslint src lib scripts` sạch; `npm run build` đạt.
  - Trình duyệt với `PII_NER` tắt: `/demo-luong` ca chuẩn, chế độ Kỹ thuật, bước ③ hiện "Phiên bản rule pii-auto-2" và "Lớp NER: NER: tắt". eForm: gõ "BN: hôm qua lan đưa tôi đi khám, đau họng 3 ngày.", bấm che, thấy dòng "NER: tắt"; bản đã che vẫn còn "lan" (rule bỏ sót).
  - `thu-che-pii --ner` khi STT không chạy in "NER: không chạy, chỉ dùng rule".
  - Chưa kiểm khi NER bật vì chưa có mô hình thật.

### Task 7 NER: client gọi `/ner`, nhật ký R13 có trường `ner`, phiên bản `pii-auto-2`
- **Loại:** Tính năng
- **Thay đổi:**
  - Mới `src/server/clinical/ner-client.ts` với `goiNer(texts)`:
    - `PII_NER` khác `on` thì trả `tat` và không gọi mạng.
    - Có bật thì chuẩn hóa NFC rồi gọi `POST {NER_BACKEND_URL|STT_BACKEND_URL}/ner`, chờ tối đa `PII_NER_TIMEOUT_MS` (mặc định 2000).
    - Lỗi, quá giờ, 503, phản hồi sai schema (zod) hay lệch số mảng đều trả `khong_chay`. Không log nội dung.
  - Kiểu `NerTrangThai` và `NerKetQua` nằm trong `src/shared/clinical/pii/types.ts`.
  - `PiiAuditEntry.ner?` gồm `{ trang_thai, model_sha256?, so_doan? }`. `buildAuditEntry` sao chép từng trường, không giữ trường lạ.
  - `PII_POLICY_VERSION` đổi `pii-auto-1` → `pii-auto-2`. `DeidentificationProof.policy_version` dùng `typeof PII_POLICY_VERSION`. Sửa chuỗi phiên bản trong 5 file test và chú thích.
  - `.env.example` thêm `PII_NER=off`, `PII_NER_TIMEOUT_MS=2000`, `NER_BACKEND_URL=`.
- **Lý do:** Plan NER, Task 7 (spec D11): NER hỏng thì độ an toàn quay về đúng mức hiện nay, và nhật ký cho biết lượt nào thiếu lớp NER.
- **File:** `src/server/clinical/ner-client.ts`, `src/server/clinical/ner-client.test.ts`, `src/shared/clinical/pii/types.ts`, `src/shared/clinical/pii/audit.ts`, `src/shared/clinical/pii/index.ts`, `src/shared/clinical/pii/nhan.ts`, `src/shared/clinical/pii/redact.ts`, `src/shared/clinical/data-policy.ts`, `src/shared/clinical/api.ts`, `src/server/clinical/extraction.ts`, `src/server/clinical/privacy.ts`, `src/shared/clinical/pii/redact.test.ts`, `src/server/clinical/privacy.test.ts`, `src/server/clinical/extract-recording.test.ts`, `src/server/clinical/extraction.test.ts`, `src/shared/clinical/data-policy.test.ts`, `.env.example`, `docs/CHANGELOG.md`
- **Kiểm tra:** `ner-client.test.ts` 7 đạt. `npm test` 394/395 đạt, lỗi duy nhất là lỗi cũ `encounter-context.test.ts`. `npm run clinical:check` báo "Clinical types are stale" dù không file schema hay `types.ts` nào đổi, nên đây là lỗi có từ trước.
- **Ảnh hưởng:** Bản chép lời và nhật ký mới ghi `pii-auto-2`; dữ liệu cũ (`pii-auto-1`) vẫn đọc được vì schema nhận chuỗi bất kỳ.

### Task 6 NER: `chePii` nhận đoạn NER, chỉ thêm che không gỡ
- **Loại:** Tính năng
- **Thay đổi:**
  - `chePii(input, known, allowlist, ner?)` nhận thêm tham số tùy chọn `{ spans, nguong }`. Mỗi phần văn bản có một mảng đoạn riêng; số mảng lệch với số phần văn bản thì bỏ qua NER. Kết quả thêm trường `ner_chap_nhan`.
  - Mới `src/shared/clinical/pii/ner.ts`:
    - `NER_SANG_NHAN` ánh xạ nhãn: NAME→R2 `NGƯỜI`, LOCATION→R3 `ĐỊA_DANH`, ORGANIZATION→R3 `NƠI_LÀM_VIỆC`, PATIENT_ID→R6 `MÃ_ĐỊNH_DANH`.
    - `locNer` bỏ các đoạn: loại khác, điểm dưới ngưỡng, vị trí sai, ngắn hơn 2 ký tự, hoặc nằm trọn trong allowlist lâm sàng.
  - `redactPii(raw, known, extra?)`: đoạn NER được thêm **sau** mọi rule, mang cờ `nguon: "ner"`. Phần chồng bị cắt, phần còn lại vẫn che (kể cả với R2). Đoạn NER cùng tên với R2 thì dùng chung số nhãn.
  - `gate.ts` export `coveredByAllowlist`.
  - `eslint.config.mjs` bỏ qua `.venv-ner-train/**`.
- **Lý do:** Plan NER, Task 6. GitNexus xếp `redactPii` rủi ro HIGH (cả eForm lẫn `/demo-luong` dùng), nên chỉ thêm tham số tùy chọn; không truyền NER thì kết quả giống hệt cũ.
- **File:** `src/shared/clinical/pii/ner.ts`, `src/shared/clinical/pii/ner.test.ts`, `src/shared/clinical/pii/redact.ts`, `src/shared/clinical/pii/pipeline.ts`, `src/shared/clinical/pii/types.ts`, `src/shared/clinical/pii/gate.ts`, `src/shared/clinical/pii/index.ts`, `eslint.config.mjs`, `docs/CHANGELOG.md`
- **Kiểm tra:** `ner.test.ts` 8 đạt. `npm test` 387/388 đạt, lỗi duy nhất là lỗi cũ `encounter-context.test.ts`. `eslint src lib scripts` không lỗi. `npm run lint` toàn repo vẫn báo lỗi trong `.claude/worktrees/` (đã có từ trước, không thuộc thay đổi này).

### Task 2 NER: lệnh tải PhoNER_COVID19 có xác nhận giấy phép
- **Loại:** Dữ liệu
- **Thay đổi:**
  - Mới `stt/download_phoner.py`, chạy qua `npm run ner:tai-du-lieu -- --dong-y-giay-phep`. Script tải `{train,dev,test}_word.json` của PhoNER_COVID19, ghim commit `9af190a` và sha256, về `models/ner/phoner-covid19/` kèm `nguon.json`. Không có cờ đồng ý thì in điều khoản (nghiên cứu hoặc giáo dục, không phân phối lại, trích dẫn NAACL 2021) rồi thoát với mã 2.
  - README thêm mục "Lớp NER che PII".
- **Lý do:** Plan NER, Task 2. Giấy phép cấm phân phối lại nên dữ liệu không vào repo; người tải phải chủ động đồng ý điều khoản.
- **File:** `stt/download_phoner.py`, `stt/tests/test_download_phoner.py`, `package.json`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `pytest stt/tests/test_download_phoner.py` 3 đạt. Tải thật được 3 file (train 5027 câu, dev 2000, test 3000) và `nguon.json`. `npm run ner:tai-du-lieu` không có cờ thì in điều khoản.
- **Ảnh hưởng:** Khi xem dữ liệu phát hiện nhãn `NAME` của PhoNER chỉ dành cho tên bệnh nhân (349 lần, đa số viết tắt kiểu "L.T.H."), còn ít nhất 112 tên đầy đủ của bác sĩ hay quan chức mang nhãn `O`. Task 4 sẽ gắn lại nhãn cho những tên này.

### Task 1 NER: onnxruntime và bộ tách từ VnCoreNLP chạy chung `.venv-stt` được
- **Loại:** Phụ thuộc
- **Thay đổi:**
  - `.venv-stt` thêm `onnxruntime==1.32.0`, `tokenizers==0.23.3`, `pyjnius==1.9.0` (kéo theo `flatbuffers`, `protobuf`). Không có torch.
  - Mới `stt/ner_segment.py`: tải bộ tách từ RDRSegmenter của VnCoreNLP (jar + `vi-vocab` + `wordsegmenter.rdr`, ghim commit `62bbc58` và sha256) về `models/ner/vncorenlp/`, và `make_segmenter()` gọi VnCoreNLP qua pyjnius.
  - Không dùng gói `py_vncorenlp` như plan ghi, vì hàm tải của nó gọi `wget` (Windows không có) và hàm khởi tạo đổi thư mục làm việc của cả tiến trình mà không trả lại.
  - Mới `stt/ner_probe.py`: script thử một lần, đo RAM.
  - `.gitignore` thêm `/models/ner/`, `/.venv-ner-train/`, `/.cache-ner/`.
- **Lý do:** Plan NER (`docs/superpowers/plans/pending/2026-11-18-ner-phobert.md`), Task 1: phải biết các gói này có xung đột với `sherpa-onnx` không trước khi làm tiếp.
- **File:** `stt/ner_segment.py`, `stt/ner_probe.py`, `stt/tests/test_ner_segment.py`, `stt/requirements.txt`, `stt/requirements-lock.txt`, `.gitignore`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - `python -m stt.ner_probe` cho kết quả **CHUNG_VENV**: không có xung đột DLL; Zipformer cho chữ giống hệt trước và sau khi nạp onnxruntime.
  - RSS: Zipformer 213 MB; cộng bộ tách từ 284 MB; cộng onnxruntime 307 MB; NER tốn thêm khoảng 118 MB (chưa tính PhoBERT int8).
  - Câu thử viết thường được tách thành `chị nguyễn_thị lan ở thủ_đức đau họng`: tên bị tách sai khi không có chữ hoa.
  - `pytest stt/tests` 103 đạt (3 test mới).
- **Ảnh hưởng:** Cần JDK và `JAVA_HOME` (đã cài OpenJDK 21). Vì bộ tách từ xử lý chữ thường kém, Task 4 sẽ tách từ lại bản viết thường của dữ liệu huấn luyện bằng chính RDRSegmenter.

### Plan triển khai lớp NER PhoBERT (10 task, chưa làm)
- **Loại:** Tài liệu
- **Thay đổi:** Viết plan theo bản thiết kế đã duyệt. Thứ tự các task: thử xung đột `onnxruntime`/`py_vncorenlp` với `sherpa-onnx` → tải PhoNER có xác nhận giấy phép → hàm xử lý văn bản → huấn luyện và xuất ONNX → endpoint `/ner` → `chePii` nhận đoạn NER → client NER, nhật ký R13, `pii-auto-2` → nối eForm, `/demo-luong`, `thu-che-pii` → `npm run eval-pii` → đo và quyết định bật. Bảng plan chưa triển khai cập nhật trạng thái.
- **Lý do:** Người dùng duyệt bản thiết kế và yêu cầu viết plan trước khi tích hợp. Phân tích GitNexus cho thấy `redactPii` và `buildAuditEntry` rủi ro HIGH, nên plan chỉ thêm tham số hoặc trường tùy chọn, và giữ nguyên `checkRecordingPrivacy` đồng bộ (thêm bản async riêng) để không phải sửa test cũ.
- **File:** `docs/superpowers/plans/pending/2026-11-18-ner-phobert.md`, `docs/superpowers/plans/pending/README.md` (trạng thái cập nhật lại sau Task 9), `docs/CHANGELOG.md`
- **Kiểm tra:** Chưa kiểm tra (tài liệu, chờ người dùng duyệt plan).

### Cài Java để tách từ cho NER; thiết kế NER đổi sang PhoNER bản theo từ
- **Loại:** Phụ thuộc
- **Thay đổi:**
  - Cài Microsoft OpenJDK 21 lên máy phát triển bằng `winget install --id Microsoft.OpenJDK.21`. Bộ cài tự đặt `JAVA_HOME` và PATH cho toàn máy. Repo không có file nào đổi vì việc cài này.
  - Bản thiết kế NER đổi D2: huấn luyện trên PhoNER_COVID19 **bản theo từ**, tách từ bằng RDRSegmenter của VnCoreNLP (giấy phép GPL-3.0) cả lúc huấn luyện lẫn lúc chạy. Không tách được từ thì NER không chạy, bộ che dùng rule như hiện tại.
  - D4 thêm: chạy thử khoảng 50 bước để in thời gian dự kiến, lưu checkpoint mỗi epoch để chạy tiếp được.
  - Thêm rủi ro: RAM của máy ảo Java, chất lượng tách từ trên chữ STT, điều khoản GPL.
- **Lý do:** Người dùng yêu cầu cài Java để dùng bộ tách từ, vì PhoBERT được huấn luyện sẵn trên văn bản đã tách từ.
- **File:** `docs/superpowers/plans/pending/2026-11-18-ner-phobert-design.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `java -version` chạy được, ra `openjdk version "21.0.13.0.2" 2026-10-22 LTS`. Chưa thử VnCoreNLP.
- **Ảnh hưởng:** Terminal và Next dev đang mở phải mở lại mới thấy `java` trong PATH.

### Thiết kế lớp NER PhoBERT + PhoNER_COVID19 cho bộ che PII (chưa triển khai)
- **Loại:** Tài liệu
- **Thay đổi:** Thêm bản thiết kế lớp NER chạy local, phía sau bộ rule R1–R8. Nội dung chính: fine-tune `vinai/phobert-base` trên PhoNER_COVID19 bản âm tiết, xuất ONNX int8, chạy qua endpoint `/ner` của dịch vụ `stt/`. NER chỉ được thêm đoạn che, không được gỡ đoạn rule đã che. Mặc định tắt (`PII_NER=off`) cho tới khi bộ đo `npm run eval-pii` cho thấy NER bắt được nhiều hơn mà không che nhầm thêm từ lâm sàng. Bảng plan chưa triển khai thêm một dòng.
- **Lý do:** Bộ rule dò tên người yếu với chữ STT viết thường. Ngày 18/11 người dùng xác nhận với hội đồng dự án là nghiên cứu, không thương mại hóa, nên được dùng PhoNER_COVID19 (giấy phép chỉ cho nghiên cứu hoặc giáo dục, cấm phân phối lại).
- **File:** `docs/superpowers/plans/pending/2026-11-18-ner-phobert-design.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chưa kiểm tra (chỉ là tài liệu, chờ người dùng duyệt rồi mới viết plan).

### Đăng ký giọng bác sĩ (màn hình riêng `/giong-bac-si`) để eForm tự nhận giọng BS
- **Loại:** Tính năng
- **Thay đổi:**
  - Màn hình mới `/giong-bac-si` (mục "Giọng bác sĩ" trên menu, tách khỏi eForm theo yêu cầu): xem trạng thái, thu đoạn đọc mẫu ~30 giây có thanh tiến độ, đăng ký lại, xóa.
  - STT backend: `stt/voice_profiles.py` (lưu/xem/xóa vector giọng ở `data/giong-bac-si/`, so khớp), `LocalDiarizer.enrollment_embedding`, API `GET/POST/DELETE /voices/{mã}`; phiên tạo với `X-STT-Voice` thì khi chốt trả `voice_match`. `clean_speech` nhận `max_frames`.
  - Next: route `src/app/api/stt/giong-bac-si/route.ts` và `src/app/api/stt/session/route.ts` lấy mã bác sĩ từ actor phía máy chủ; `proxySttVoice`, `proxySttSession(..., voiceId)`; `SpeakerSessionClient.create(..., soGiongBacSi)`; `src/client/api.ts` thêm `xemGiongBacSi`/`dangKyGiongBacSi`/`xoaGiongBacSi` kèm thông báo lỗi tiếng Việt; kiểu `GiongBacSiTrangThai`.
  - eForm: `MicButton` có `onGiongBacSi`; `ganVaiTroChoDoan(doan, giongBacSi)` qua `ketHopGiongBacSi`: giọng khớp thì BS/BN theo giọng, mâu thuẫn với nội dung thì không gán, chưa đăng ký thì đoán theo nội dung như trước.
  - Ghép chữ theo lượt: đoạn chưa rõ người nói dài hơn 2 từ (có thể người thứ ba) không còn bị gộp vào lượt trước (lỗi thấy khi thử file 3 giọng: lời người khác bị ghi thành BS).
  - `.gitignore` thêm `/data/giong-bac-si`.
- **Lý do:** cách 2 đã bàn với người dùng: bác sĩ đăng ký giọng một lần, eForm tự nhận giọng bác sĩ, không cần bấm chọn mỗi buổi khám.
- **File:** `stt/voice_profiles.py`, `stt/diarization.py`, `stt/diarized_sessions.py`, `stt/api.py`, `stt/tests/test_voice_profiles.py`, `lib/stt/proxy.ts`, `lib/stt/speaker-client.ts`, `lib/stt/continuous.ts`, `src/app/api/stt/giong-bac-si/route.ts`, `src/app/api/stt/session/route.ts`, `src/app/giong-bac-si/page.tsx`, `src/client/giong-bac-si/DangKyGiong.tsx`, `src/client/chung/Header.tsx`, `src/client/chung/MicButton.tsx`, `src/client/chung/DenoisedMic.tsx`, `src/client/eform/TroLyAi.tsx`, `src/client/api.ts`, `src/shared/api.ts`, `src/shared/clinical/vai-tro-nguoi-noi.ts`, `src/shared/clinical/vai-tro-nguoi-noi.test.ts`, `.gitignore`, `README.md`, `docs/STT.md`
- **Kiểm tra:** `pytest stt/tests` 100 đạt (4 test mới: lưu/xóa/mã sai, ngưỡng khớp, đăng ký rồi chốt phiên trả `voice_match`, lỗi đăng ký); `vai-tro-nguoi-noi.test.ts` 17 đạt; `npm test` 379 đạt, 1 lỗi có sẵn `encounter-context.test.ts`; `tsc`, `eslint` không lỗi. Thật với model: đăng ký bằng giọng máy đọc (ca-01) qua `/api/stt/giong-bac-si` → 25,5 giây lời nói; file hai giọng người thật bị từ chối `VOICE_ENROLL_MULTIPLE_SPEAKERS`; chốt phiên: ca-03 cùng giọng → người nói 1 (0,963), hai giọng người thật → không khớp (0,14/0,09), trộn người thật + giọng đã đăng ký → người nói 2 (0,951). Trình duyệt: màn hình `/giong-bac-si` hiển thị đúng; eForm với file trộn hiện "Tự phân vai: Nhận ra giọng bác sĩ đã đăng ký (người nói 2)" và gắn BS/BN. Đã xóa giọng thử sau khi kiểm tra. Chưa thử đăng ký và khám bằng giọng người thật.
- **Ảnh hưởng:** cần khởi động lại STT backend (`npm run stt:start`). Next dev đang chạy vẫn render phía máy chủ thanh menu cũ (lỗi hydration ở trang mới) cho tới khi khởi động lại `npm run dev`. Vài từ ngay chỗ đổi người nói vẫn có thể bị bộ phân tách gán nhầm; bác sĩ thấy khi duyệt.

### eForm: tự phân vai bác sĩ/bệnh nhân theo nội dung lời nói sau khi dừng ghi
- **Loại:** Tính năng
- **Thay đổi:**
  - Mới `src/shared/clinical/vai-tro-nguoi-noi.ts`: chấm điểm lời của từng giọng (Người nói 1/2 từ bộ phân tách người nói) theo khoảng 220 cụm dấu hiệu lời bác sĩ và lời bệnh nhân, chỉ gán BS/BN khi đủ dấu hiệu và hai giọng chênh rõ; một giọng lẫn lời cả hai vai (máy chưa tách được) hoặc hơn hai giọng thì không gán. Chi tiết ngưỡng ở `docs/STT.md` mục "Tự gán vai bác sĩ/bệnh nhân theo nội dung".
  - `DenoisedMic` đưa chữ vào ô theo lượt kèm nhãn tạm `Người nói N:` (từ lẻ chưa rõ người nói nối tiếp lượt đang nói); chữ tạm cũng hiện theo lượt.
  - `TroLyAi`: ô nhập chỉ đọc khi đang ghi; dừng ghi thì đổi nhãn tạm trong đoạn vừa ghi thành `BS:`/`BN:` (hoặc bỏ nhãn nếu không chắc) và hiện dòng "Tự phân vai: …". Bác sĩ không phải bấm thêm gì.
- **Lý do:** bác sĩ chỉ muốn bấm ghi và bấm dừng; ô nhập không có nhãn BS/BN nên ở chế độ Hội thoại mọi câu là "chưa rõ người nói", bản nháp không dùng được lời bác sĩ.
- **File:** `src/shared/clinical/vai-tro-nguoi-noi.ts`, `src/shared/clinical/vai-tro-nguoi-noi.test.ts`, `src/client/chung/DenoisedMic.tsx`, `src/client/eform/TroLyAi.tsx`, `docs/STT.md`
- **Kiểm tra:** `vai-tro-nguoi-noi.test.ts` 15 test đạt (6 hội thoại giả có nhãn theo cả hai chiều, 10 ca tự đọc, gộp nhầm một giọng, không đủ dấu hiệu, nhãn tạm). `npm test` 377 đạt, 1 lỗi có sẵn `encounter-context.test.ts`. `tsc`, `eslint` sạch. Trình duyệt (micro giả lập): `ca-03.tts.wav` một giọng → ô hiện `Người nói 1:` khi ghi, `BS:` sau khi dừng; `models/diarization/test-two-vi.wav` hai giọng người thật → hiện `Người nói 1/2` khi ghi, không gán vì thiếu dấu hiệu. Chưa thử hội thoại khám thật hai người.
- **Ảnh hưởng:** phân tích ảnh hưởng GitNexus báo `TroLyAi` mức HIGH (nằm trên trang `/` và trang trình diễn); props không đổi. Lỗi tìm thấy khi thử: updater `setText` không được xóa ref bên trong vì React dev gọi updater hai lần.

### Che PII: bớt bắt nhầm từ thường thành tên người (R11c); eForm và /demo-luong gọi chung một hàm `chePii`
- **Loại:** Sửa lỗi
- **Thay đổi:**
  - Họ trùng từ thường (`HO_TRUNG_TU_THUONG` trong `ho-viet.ts`: lại, danh, mã, lô, hà, cao, hồ, lý, dương…): chốt chặn R11c chỉ coi là tên khi có đệm văn/thị hoặc ≥ 2 âm tiết sau họ. Trước đây "danh sách", "lại cho", "mã danh" bị che thành `[NGƯỜI_KHÁC]`.
  - Đệm "thị"/"văn" của R11c: văn bản có dấu thì "thì" không còn bị coi là "thị" ("lô thì anh").
  - Thêm hư từ, động từ thường vào danh sách từ dừng (cái, các, cho, đúng, cùng, để, đấy, xong, thứ, mình, làm, xem, lên, ra, vào, phải, vẫn, đều, theo, bằng, giúp, biết, nhiều, luôn, thôi, nếu, bệnh, thuốc), áp cho cả R2 và R11c. Dạng không dấu trùng tên (van, lam, bang, nhung, cung) vẫn không coi là từ dừng.
  - Hàm mới `chePii` (`src/shared/clinical/pii/pipeline.ts`): che R1–R8 từng đoạn → chốt chặn R11 → tự che phần sót → kiểm lại. `PrivacyStore.check` (eForm) và `runDemoFlow` (/demo-luong) trước đây mỗi bên tự viết chuỗi này, nay cùng gọi `chePii`. `/stt` không che PII (chỉ nhận dạng), giữ nguyên.
  - Lệnh mới `npm run thu-che-pii -- "câu"` (hoặc `--file đường/dẫn.txt`) chạy đúng `chePii` với allowlist của hai trang, in bản đã che, mục R1–R8, mục R11 tự che, có bị chặn không.
- **Lý do:** thử /demo-luong bằng một file WAV khác: 10/11 mục R11c tự che là từ thường ("lại cái đấy hình", "danh sách", "mã danh đúng", "lô thì anh"…). Người dùng muốn mọi trang dùng chung một hàm lọc để dễ thử.
- **File:** `src/shared/clinical/pii/ho-viet.ts`, `src/shared/clinical/pii/redact.ts`, `src/shared/clinical/pii/gate.ts`, `src/shared/clinical/pii/pipeline.ts`, `src/shared/clinical/pii/index.ts`, `src/shared/clinical/pii/gate.test.ts`, `src/shared/clinical/pii/pipeline.test.ts`, `src/server/demo-luong/flow.ts`, `src/server/clinical/privacy.ts`, `scripts/thu-che-pii.ts`, `package.json`, `README.md`, `CLAUDE.md`, `docs/CLINICAL-WORKFLOW.md`
- **Kiểm tra:** thêm test 10 câu chứa đúng các cụm bị bắt nhầm (đều qua chốt chặn) và 4 tên thật có họ trùng từ thường (vẫn bị chặn); 2 test cho `chePii`. `npm test` 375/376 đạt (ca `encounter-context.test.ts` hỏng sẵn từ trước); `tsc --noEmit` sạch; `eslint` các file đã sửa sạch. `npm run thu-che-pii` trên câu mẫu: chỉ che "đường lê lợi" và "lại văn hùng". Chưa thử lại trên trình duyệt bằng file WAV.
- **Ảnh hưởng:** tên người có họ trùng từ thường mà chỉ có 2 âm tiết và không có từ chỉ người đứng trước (vd. "gặp hà lan") không còn bị R11c bắt; có "anh/chị/bé…" đứng trước thì R2 vẫn che. Giữ `PII_POLICY_VERSION = "pii-auto-1"` vì chuỗi này nằm trong schema và dữ liệu đã duyệt; đổi số cần sửa schema riêng.

### Che PII: không che nhầm "đái tháo đường", "cao còn…", "viên atorvastatin" trong lời kể STT liền mạch
- **Loại:** Sửa lỗi
- **Thay đổi:**
  - R3 (`redact.ts`): "đường" không bị coi là tên đường phố khi đứng sau "tháo", "tiểu", "lượng", "hạ", "độ", "thử", "chỉ số", "bột", "men", "ngọt", hoặc đứng trước "type/tuýp/típ/thai kỳ". Trước đây "đái tháo **đường rối loạn mỡ** máu" thành `[ĐỊA_DANH_1]`.
  - Đuôi tên người (`nameTailEnd`, dùng chung cho R2 và chốt chặn R11c) chỉ nhận âm tiết có cấu tạo tiếng Việt (`isVietSyllable`), nên tên thuốc ngoại như "atorvastatin", "amlopin" không thành đuôi tên. Trước đây "viên atorvastatin" (Viên là họ) bị che thành `[NGƯỜI_KHÁC]`.
  - Thêm hư từ vào danh sách từ dừng: "còn", "chưa", "được", "những", "mỗi", "gì", "nào". Trước đây "hơi cao còn tiểu đường" (Cao là họ) bị che thành `[NGƯỜI_KHÁC]`.
  - R11c (`gate.ts`): chữ trùng họ đứng ngay sau số ("1 viên", "2 cao") là danh từ đơn vị, không phải họ.
- **Lý do:** thử /demo-luong bằng file WAV, câu tiền sử tim mạch đọc liền không dấu câu bị che nhầm tên bệnh và tên thuốc, AI mất thông tin lâm sàng. Bộ che dùng chung nên sửa một chỗ áp dụng cho cả /demo-luong và eForm (`src/server/clinical/privacy.ts`).
- **File:** `src/shared/clinical/pii/redact.ts`, `src/shared/clinical/pii/gate.ts`, `src/shared/clinical/pii/redact.test.ts`, `src/shared/clinical/pii/gate.test.ts`
- **Kiểm tra:** thêm 3 test (câu trong ảnh chụp đọc trọn qua bộ che và chốt chặn chỉ còn che `[TUỔI]`; địa chỉ "đường lê lợi", tên "cao văn lâm", "viên thị hà" vẫn bị che/chặn). `npm test` 359/360 đạt; ca hỏng `encounter-context.test.ts` đã hỏng sẵn trước thay đổi này. `eslint src/shared/clinical/pii/` sạch. Chưa thử lại trên trình duyệt bằng file WAV.
- **Ảnh hưởng:** bản đã che giữ nguyên tên bệnh, tên thuốc ngoại nhiều hơn. Tên người có âm tiết không chuẩn tiếng Việt (vd. tên phiên âm nước ngoài sau họ Việt) sẽ không còn bị R2/R11c bắt theo đuôi.

### eForm giọng nói: sửa chữ đã chốt bị mất, chữ hiện sớm hơn, dừng nhanh hơn
- **Loại:** Sửa lỗi
- **Thay đổi:**
  - Sửa lỗi chữ nhận dạng đã chốt không bao giờ vào ô "Nội dung buổi khám" (khi dừng, chữ tạm biến mất dần): `TroLyAi` so `binding.encounterId` (mã lịch hẹn, vd. LK-…) với `record.id` (mã hồ sơ) nên luôn lệch và bỏ chữ. Nay so theo phiên ghi âm (`recordingSessionId`) thuộc hồ sơ đang mở.
  - Chữ của cùng một lần ghi âm nối bằng dấu cách thay vì xuống dòng sau mỗi đoạn; lần ghi mới hoặc sau khi gõ tay thì xuống dòng.
  - Đoạn âm thanh gửi đi tối đa 2,5 giây thay vì 5 giây (`openContinuousSession` có tùy chọn `segmentFrames`, `PcmSegmenter` nhận `maxFrames`; `/stt` giữ 5 giây).
  - Phiên STT độ trễ thấp: header `X-STT-Latency: low` (eForm gửi qua `SpeakerSessionClient.create(..., lowLatency)`, proxy chuyển tiếp) cho cửa sổ nhận dạng lại 15 giây và chốt chữ cũ hơn 6 giây (mặc định vẫn 25 giây / 10 giây cho `/stt`). Đo trên trình duyệt với giọng máy 47 giây: mỗi đoạn xử lý ~2 giây (trước ~3 giây, chậm hơn thời gian nói nên ứ đọng), bấm Dừng tới khi xong ~3 giây (trước ~7 giây).
- **Lý do:** bác sĩ thử giọng nói: không thấy chữ hiện khi đang nói, bấm dừng chờ lâu rồi chữ biến mất hoàn toàn.
- **File:** `src/client/eform/TroLyAi.tsx`, `src/client/chung/DenoisedMic.tsx`, `lib/stt/session.ts`, `lib/stt/continuous.ts`, `lib/stt/speaker-client.ts`, `lib/stt/proxy.ts`, `stt/diarized_sessions.py`, `stt/api.py`, `stt/tests/test_diarized_sessions.py`, `docs/STT.md`
- **Kiểm tra:** `pytest stt/tests` 96 đạt (thêm test phiên độ trễ thấp); `tsx --test lib/stt/*.test.ts` 21 đạt; `tsc`, `eslint` sạch. Trên trình duyệt: giả lập micro bằng `data/giong-noi/ca-01.tts.wav` (file tạm trong `public/`, đã xóa), chữ hiện trong ô sau ~4–5 giây rồi thêm dần mỗi ~2 giây, dừng xong chữ còn nguyên trong ô. Chưa thử bằng micro và giọng thật.
- **Ảnh hưởng:** cần khởi động lại STT backend (`npm run stt:start`) để nhận code mới. Lần nhận dạng đầu sau khi khởi động lại chậm hơn (~7 giây) do nạp model.

### eForm: thiết kế lại nút ghi âm, bỏ ô "Tôi đồng ý…" (mặc định đã đồng ý)
- **Loại:** Giao diện
- **Thay đổi:**
  - Nút ghi âm của Trợ lý lâm sàng thành nút đặc màu tím: biểu tượng micro trong vòng tròn bên trái, hai dòng chữ "Bấm để nói" / "Chữ hiện dần trong ô bên dưới". Đang nghe thì chuyển đỏ, vòng tròn nhấp nháy, hiện "Đang nghe · m:ss" / "Bấm để dừng"; lúc mở micro và chốt câu cuối có vòng xoay. Kiểu và nội dung nút gom vào `src/client/chung/mic-ui.tsx` (`GIAO_DIEN_MIC`, `NoiDungMic`); `GiaoDienMic` bỏ khóa `nhan`.
  - Bỏ ô "Tôi đồng ý xử lý âm thanh và nội dung y tế…" ở cả `MicButton` và `DenoisedMic`: coi như đã đồng ý, nút bấm được ngay (vẫn gửi `X-Clinical-Consent: true` khi mở phiên `/api/asr`).
- **Lý do:** bác sĩ thấy nút cũ xấu và bị mờ vì chưa đánh dấu đồng ý; yêu cầu bỏ ô đồng ý.
- **File:** `src/client/chung/mic-ui.tsx`, `src/client/chung/MicButton.tsx`, `src/client/chung/DenoisedMic.tsx`
- **Kiểm tra:** `tsc --noEmit`, `eslint` các file sửa sạch; mở `/` trên trình duyệt (1440×900) thấy nút mới, không còn ô đồng ý. Chưa thử trạng thái đang nghe bằng micro thật.
- **Ảnh hưởng:** không còn bước xác nhận đồng ý mỗi lần thu âm.

## 2026-11-17

### Sửa /stt dính chữ ở chỗ nối đoạn và /demo-luong che nhầm chữ STT
- **Loại:** Sửa lỗi
- **Thay đổi:**
  - /stt (Python): `tokens_to_words` coi token chỉ có dấu cách (`"▁"`) là dấu hiệu bắt đầu từ mới. Zipformer 70 MB hay trả `"▁"` riêng rồi mới đến chữ ở đầu đoạn VAD, nên trước đây chữ đó dính vào từ trước ("sốtà", "độừ", "ngoại trúà").
  - /demo-luong: chữ STT đi qua bộ sửa chữ `config/sua-chu-giong-noi.json` như eForm trước khi che ("thai" → "tai", "ba mươi tám phẩy năm" → "38,5", "ha ceamon" → "Paracetamol").
  - Chốt chặn R11c (`gate.ts`): với văn bản có dấu (≥ 30% âm tiết có dấu), chữ không dấu chỉ tính là họ nếu chính nó là họ ("phan") hoặc là họ phổ biến viết không dấu ("nguyen", "tran"…). Trước đây "ba", "thai", "ha" bị hiểu là "Bá", "Thái", "Hà" nên cả cụm bị tự che thành `[NGƯỜI_KHÁC]`. Thêm "dị ứng", "phản ứng", "đáp ứng", "toàn thân" vào allowlist lâm sàng mặc định.
  - Bộ che R3 (`redact.ts`): "tỉnh" theo sau bởi sốt/suốt/không/và/tiếp/xúc không coi là đơn vị hành chính ("bé tỉnh, sốt 38 độ").
  - Bộ che R2/R11c: thêm động từ mua, đưa, dẫn, gọi, lấy, uống, dùng, kê, đi, về vào từ dừng, để đuôi tên không che lố ("[NGƯỜI_KHÁC] mua thuốc" thay vì "[NGƯỜI_KHÁC] thuốc").
- **Lý do:** Người dùng yêu cầu kiểm tra và sửa /stt và /demo-luong. Chạy file `data/giong-noi/ca-01.tts.wav` qua cả hai trang thì thấy: /stt dính chữ; /demo-luong (nguồn File WAV) tự che 8 cụm chữ lâm sàng ("sốt [NGƯỜI_KHÁC] năm độ", "chưa dị [NGƯỜI_KHÁC]", "viêm [NGƯỜI_KHÁC] phải"), làm hỏng bản gửi AI.
- **File:** `stt/diarization.py`, `stt/tests/test_diarization.py`, `src/app/api/demo-luong/route.ts`, `src/shared/clinical/pii/gate.ts`, `src/shared/clinical/pii/gate.test.ts`, `src/shared/clinical/pii/redact.ts`
- **Kiểm tra:**
  - `pytest stt/tests`: 95 đạt. Bản sửa Python chạy qua server tạm ở cổng 8766 thì ra "sốt à", "độ ừ".
  - `npm test`: 356/357; lỗi còn lại có từ trước (`encounter-context.test.ts`). `tsc` sạch. `eslint src lib components scripts`: 0 lỗi.
  - /demo-luong với ca-01.tts.wav: bước che 0 cụm tự che, qua chốt chặn. Kịch bản "Ca tự che thêm" vẫn tự che đúng "đỗ quốc việt". Kịch bản "Ca chuẩn" vẫn che đủ 9 mục.
- **Ảnh hưởng:**
  - Server STT Python đang chạy (cổng 8765, không có `--reload`) phải khởi động lại (`npm run stt:start`) thì /stt mới hết dính chữ.
  - Đã thử tách chữ STT của /demo-luong thành câu theo khoảng nghỉ nhưng bỏ: giọng đọc ngừng ở dấu phẩy nên cắt giữa tên thuốc và liều ("amoxin" | "250 mg").

### Bộ sửa chữ giọng nói chỉnh theo lỗi của Zipformer 70 MB
- **Loại:** Cấu hình
- **Thay đổi:** `config/sua-chu-giong-noi.json`:
  - Thêm luật thay cụm cho các lỗi lặp lại của bản 70 MB: "mi lim"/"miligam" → mg, "centi mét" → cm, "ít quan" → X-quang, thêm các cách nghe nhầm amidan ("à mịn", "ào mỉ", "a đẳng"…), "hai mũi" → "tai mũi" (chỉ khi sau là "bình"/"họng"), "đau phải/trái" → "đau tai phải/trái", "thái phải/trái", "gù tai", "khô thay", "mùi bám", "nốt" → "nuốt" (chỉ khi sau là đau/vướng/nghẹn), "khan tiếng", "nghỉ rộng", "niên mạc", "xung huyết", "mãn tính" → "mạn tính", "tiên sử", "gì ứng", "dịch nhảy", "chức ăn" → "trước ăn", "tiểu sâu", "cấp chỉ".
  - Thêm cách đọc tên thuốc mà bản 70 MB nghe ra: Augmentin, Amoxicillin, Cefuroxim, Cefixim, Ofloxacin, Paracetamol ("ha ceamon"), Ibuprofen, Methylprednisolon, Mometason, Betahistin, Ginkgo biloba, Esomeprazol, Strepsils.
- **Lý do:** Sau khi đổi eForm sang Zipformer 70 MB (mục dưới), bộ sửa chữ vẫn chỉnh theo lỗi của bản 27 MB nên kết quả sau sửa kém hơn. Người dùng yêu cầu chỉnh lại.
- **File:** `config/sua-chu-giong-noi.json`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npm run eval-giong-noi` (11 file giọng máy), sau khi sửa: WER 12,1% → **6,7%**, Mã 16/42 → **30/42**, Liều 6/24 → **20/24**, sửa nhầm trên câu gốc vẫn 0 từ. Chữ thô không đổi (17,4%). `npm test` 355/356 (lỗi còn lại có từ trước: `encounter-context.test.ts`).
- **Ảnh hưởng:** Bác sĩ đọc bằng micro trên eForm thấy chữ đúng hơn, nhất là đơn vị liều và tên thuốc. Các cách đọc thêm vào lấy từ giọng máy (`npm run tao-am-thanh-mau`), nên giọng người thật có thể nghe ra kiểu khác. Cần đo lại khi có ghi âm thật.

### eForm giọng nói: chữ hiện dần trong ô nhập, khử nhiễu nhanh hơn và luôn bật, nút Nói to hơn
- **Loại:** Tính năng
- **Thay đổi:**
  - Chữ tạm (phần đang nói, chưa chốt) hiện nối sau nội dung ngay trong ô "Nội dung buổi khám" khi đang ghi âm (ô chỉ đọc lúc đó); chốt thì chuyển thành chữ thật. `MicButton` có prop mới `onInterim`.
  - Khử nhiễu DeepFilterNet3 luôn bật: bỏ checkbox "Khử nhiễu ... (tùy chọn)" và đoạn giải thích khỏi giao diện bác sĩ.
  - Tăng tốc khử nhiễu: trước đây mỗi đoạn âm thanh làm khử nhiễu lại cả cửa sổ 25 giây (khởi động lại `deep-filter.exe` trên toàn bộ), nên backlog khi bấm Dừng rất lâu. Nay `stt/diarized_sessions.py` chỉ khử nhiễu đoạn mới kèm 1 giây ngữ cảnh và giữ bộ đệm đã khử nhiễu (`Session.clean`).
  - Nút Nói/Dừng nghe to hơn, có biểu tượng micro/dừng dạng SVG (`src/client/chung/mic-ui.tsx`).
- **Lý do:** bác sĩ không thấy chữ ghi được khi đang nói, bấm Dừng phải chờ khử nhiễu rất lâu, nút nhỏ và xấu, lựa chọn khử nhiễu không cần để bác sĩ thấy.
- **File:** `stt/diarized_sessions.py`, `stt/tests/test_diarized_sessions.py`, `src/client/chung/MicButton.tsx`, `src/client/chung/DenoisedMic.tsx`, `src/client/chung/mic-ui.tsx`, `src/client/eform/TroLyAi.tsx`
- **Kiểm tra:** `pytest` (test_diarized_sessions, test_session_api, test_denoise) đạt 26/26; `tsc`, `eslint` các file sửa sạch; `npm test` 355 đạt, 1 lỗi sẵn có `encounter-context.test.ts` (5 !== 4, có ở HEAD, không do thay đổi này). Chưa thử bằng micro thật và chưa xem giao diện trên trình duyệt; cần khởi động lại `npm run stt:start` để backend nhận code mới.
- **Ảnh hưởng:** chữ chốt vẫn theo cơ chế cũ (ổn định sau ~10 giây), nay có thêm chữ tạm trong ô. Khử nhiễu mất lựa chọn tắt trên eForm, cần STT backend chạy.

### eForm nhận dạng giọng nói bằng Zipformer ~70 MB (bỏ bản 27 MB); thông báo thiếu model ghi rõ file thiếu
- **Loại:** Cấu hình
- **Thay đổi:**
  - eForm (`/api/asr`) dùng `csukuangfj/sherpa-onnx-zipformer-vi-int8-2025-04-20` (revision `b2745a4`, encoder ~70 MB, gốc zzasdf/viet_iter3_pseudo_label, ~70 nghìn giờ dữ liệu) ở `models/stt/zipformer-vi/`, cùng bộ với trang `/stt`. Thông số model gom vào `src/shared/model-giong-noi.ts`, khớp `stt/model_artifacts.py`.
  - `npm run tai-model-giong-noi` tải 5 file của bản 70 MB từ Hugging Face theo revision đã khóa, kiểm SHA-256 (sai thì xóa file và báo lỗi), ghi `provision.json` giống bước setup của `/stt`. File đã có và đúng SHA-256 thì bỏ qua. Silero VAD vẫn ở `models/silero_vad.onnx`.
  - `GET /api/asr` trả thêm `thuMucModel` và `thieu` (danh sách file còn thiếu). Nút micro ghi rõ thư mục và file thiếu thay vì "Chưa có model giọng nói trên máy".
  - Đã xóa thư mục `models/sherpa-onnx-zipformer-vi-30M-int8-2026-02-09/` (bản 27 MB, 32,8 MB trên đĩa, nằm ngoài git).
- **Lý do:** Người dùng muốn dùng bản 70 MB đã có sẵn thay vì bản 27 MB, và thấy dòng "Chạy npm run tai-model-giong-noi" mà không biết thiếu gì. Dòng đó hiện khi server chạy từ một bản checkout không có `models/` (5 worktree trong `.claude/worktrees/` đều thiếu).
- **File:** `src/shared/model-giong-noi.ts` (mới), `src/server/ai/asr.ts`, `src/app/api/asr/route.ts`, `src/app/api/asr/route.test.ts`, `src/shared/api.ts`, `src/client/chung/MicButton.tsx`, `scripts/tai-model-giong-noi.ts`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - Chạy script trong thư mục trống: tải đủ 5 file (encoder 70,9 MB), SHA-256 khớp. Chạy lại trong dự án: bỏ qua cả 5.
  - `GET /api/asr` trả `sanSang: true`, `thuMucModel: "models/stt/zipformer-vi"`, `thieu: []`. Gửi `models/stt/zipformer-vi/test_wavs/1.wav` qua `/api/asr` từng mẩu 0,4 giây: ra "Những nơi đã khống chế được căn bệnh.".
  - `tsc` sạch, `eslint src scripts` 0 lỗi, `npm test` 355/356 (lỗi còn lại có từ trước: `encounter-context.test.ts`).
  - Chưa xem tận mắt dòng thông báo thiếu model trên trình duyệt (máy này có đủ model).
- **Ảnh hưởng:** `npm run eval-giong-noi` (11 file giọng máy): chữ thô WER 21,4% (bản 27 MB, số đo ghi ở mục cũ, có thể đã khác do bộ sửa chữ đổi sau đó) → 17,4%. Sau bộ sửa chữ: WER 12,1%, Mã 16/42, Liều 6/24, sửa nhầm 0 từ; bản 27 MB từng đạt 10,5%, 22/42, 11/24. Bộ sửa chữ `config/sua-chu-giong-noi.json` được chỉnh theo lỗi của bản 27 MB nên hợp với bản 70 MB kém hơn, cần chỉnh lại. Chưa đo tốc độ so với bản 27 MB. Máy đã kéo repo cần chạy lại `npm run tai-model-giong-noi`, trừ khi đã setup `/stt`.

### /demo-luong cũng tự che phần còn sót sau chốt chặn R11; kịch bản `ca-bi-chan` thành `ca-tu-che`
- **Loại:** Tính năng
- **Thay đổi:**
  - `runDemoFlow`: chốt chặn R11 không qua thì tự che từng đoạn bằng `maskResidualPii` (giống eForm) rồi chạy lại R11. Chỉ dừng ở bước ③ khi tự che xong vẫn còn sót.
  - Sự kiện `che` thêm `auto_masked` (mã lý do kèm đoạn chữ, chỉ đi trong stream). Phiên lưu trong `meta/` và dòng nhật ký R13 chỉ giữ mã lý do (`auto_masked`).
  - `DemoFlowInput.extraKnown` (chỉ dùng trong test) để dựng ca vẫn bị chặn. Route không truyền trường này.
  - Giao diện:
    - ô ③ ghi "Tự che thêm N mục còn sót, rồi qua chốt chặn R11";
    - cột "Bản đã che" ghi "Tự che thêm N" và liệt kê từng mục ("→ đã tự che");
    - chế độ Kỹ thuật có dòng "Tự che phần còn sót" và "Qua (sau khi tự che)".
  - Đổi tên kịch bản `ca-bi-chan.json` thành `ca-tu-che.json`, tên hiển thị "Ca tự che thêm…". `expected` thêm `tu_che`, `phai_che` thêm "đỗ quốc việt", `bi_chan` thành `false`.
  - Sơ đồ `luong-chinh.drawio`: ghi chú R11 thêm bước tự che. Ô dừng đổi thành "Tự che xong vẫn sót: dừng".
- **Lý do:** Người dùng muốn `/demo-luong` thống nhất với eForm (mục ngay dưới).
- **File:** `src/server/demo-luong/flow.ts`, `src/server/demo-luong/flow.test.ts`, `src/server/demo-luong/kich-ban.test.ts`, `src/app/api/demo-luong/routes.test.ts`, `src/shared/demo-luong/types.ts`, `src/client/demo-luong/StepRail.tsx`, `src/client/demo-luong/TranscriptPanels.tsx`, `src/client/demo-luong/TechDetails.tsx`, `src/client/demo-luong/DemoLuongScreen.tsx`, `data/demo-luong/kich-ban/ca-tu-che.json` (đổi tên từ `ca-bi-chan.json`), `docs/so-do/luong-chinh.drawio`, `docs/DATA-USE-POLICY.md`, `docs/CLINICAL-WORKFLOW.md`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - Sửa test trước: ca tự che đủ 5 bước, nhật ký có `auto_masked`. Ca bị chặn dựng bằng âm thanh giả và `extraKnown`.
  - Test demo-luong 39/39. `npm test` 355/356; lỗi duy nhất là `encounter-context.test.ts:28`, có từ trước.
  - `tsc` sạch. `eslint src lib`: 0 lỗi.
  - Trình duyệt `/demo-luong`, kịch bản `ca-tu-che`:
    - 5 bước xong, ô ③ hiện "Tự che thêm 1 mục còn sót";
    - bản đã che là "hôm qua [NGƯỜI_KHÁC] thuốc giúp…";
    - chế độ Kỹ thuật hiện "Qua (sau khi tự che)";
    - ở 375px không tràn ngang (scrollWidth 375);
    - không file nào trong `data/demo-luong/` (trừ kịch bản) chứa "quốc việt".
- **Ảnh hưởng:** Màn demo không còn kịch bản dừng ở chốt chặn. Nhánh bị chặn vẫn còn trong code và có test, nhưng chỉ xảy ra khi tự che không xử lý được.

### eForm tự che phần còn sót sau chốt chặn R11 thay vì bắt bác sĩ sửa tay
- **Loại:** Tính năng
- **Thay đổi:**
  - Thêm `maskResidualPii` (`src/shared/clinical/pii/gate.ts`): che tất cả những gì R11 còn thấy trong bản sạch. Tên người lạ (R11c) thành `[NGƯỜI_KHÁC]`, dãy số dài (R11b) thành `[MÃ_ĐỊNH_DANH]`, email/URL (R11d) thành `[LIÊN_HỆ]`, giá trị đã biết viết không dấu (R11a) thành nhãn theo loại (vd. `[BỆNH_NHÂN]`). Phần dò tên của R11 tách thành `residualNames` để dò và che dùng chung, kết quả của `checkResidualPii` không đổi.
  - `PrivacyTickets.check`: chốt chặn không qua thì tự che, rồi chạy lại R11 trên bản đã che. Qua thì cấp ticket như thường. Chỉ chặn khi tự che xong vẫn còn sót, ví dụ giá trị đã biết dính liền trong một từ.
  - Kết quả `check` có thêm `auto_masked` (mã lý do + đoạn đã che, chỉ gửi về màn hình). Ticket nhớ các mã lý do. Nhật ký R13 (`PiiAuditEntry.auto_masked`, trường tùy chọn) chỉ ghi mã lý do, không ghi chữ gốc.
  - Trợ lý lâm sàng hiện "Tự che thêm N mục còn sót (không cần sửa tay)" kèm từng mục. Khung đỏ chỉ còn hiện khi hệ thống không tự che được.
  - Áp dụng cho cả gõ tay và giọng nói trên eForm, vì cả hai đi qua cùng ô nội dung và nút "Che thông tin và tạo bản nháp". `/demo-luong` đổi theo ở mục ngay trên.
- **Lý do:** Người dùng thử ca (c) "hôm qua đỗ quốc việt mua thuốc giúp". Hệ thống chỉ báo lỗi và không gửi AI, nên bác sĩ mất thời gian tự tìm và sửa. Yêu cầu: tự chuyển phần nhạy cảm sang dạng đã che rồi gửi tiếp.
- **File:** `src/shared/clinical/pii/gate.ts`, `src/shared/clinical/pii/index.ts`, `src/shared/clinical/pii/audit.ts`, `src/shared/clinical/pii/gate.test.ts`, `src/shared/clinical/api.ts`, `src/server/clinical/privacy.ts`, `src/server/clinical/privacy.test.ts`, `src/server/clinical/bound-privacy.ts`, `src/server/clinical/bound-privacy.test.ts`, `src/server/clinical/extract-recording.ts`, `src/server/clinical/extract-recording.test.ts`, `src/client/eform/TroLyAi.tsx`, `docs/DATA-USE-POLICY.md`, `docs/CLINICAL-WORKFLOW.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - Viết test trước. Test mới lỗi ("maskResidualPii is not a function"), sau khi viết code thì qua.
  - `npm test`: 354/355. Test hỏng duy nhất là lỗi có sẵn ở `encounter-context.test.ts:28`.
  - `tsc --noEmit` sạch. `npx eslint src lib`: 0 lỗi, 6 cảnh báo cũ.
  - GitNexus impact: `checkResidualPii` LOW. `PrivacyTickets.check` UNKNOWN; tìm theo chữ thấy chỉ `bound-privacy.ts` và test gọi.
  - Trình duyệt (server dev cổng 3000, mock), lượt LK-GIA-0456: hội thoại tổng hợp cộng câu "hôm qua đỗ quốc việt mua thuốc giúp". Bản đã che là "hôm qua [NGƯỜI_KHÁC] thuốc giúp", hiện "Tự che thêm 1 mục còn sót", có bản nháp. Nhật ký có dòng `gate:true`, `auto_masked:["R11c_ten_rieng_con_sot"]`, không có chữ "quốc việt".
- **Ảnh hưởng:**
  - Đuôi tên R11c lấy tối đa 3 âm tiết sau họ nên có thể nuốt cả động từ: "đỗ quốc việt mua" che thành một nhãn, mất chữ "mua". Đây là giới hạn của bộ dò tên có sẵn, chưa sửa.
  - Server dev đã chạy từ trước khi sửa giữ bộ ticket cũ trong bộ nhớ (`globalThis`), nên trả 500 ở `/api/clinical/privacy` cho tới khi nạp lại module. Lúc kiểm thì nó tự hết sau một lần sửa `privacy.ts`. Nếu vẫn gặp thì khởi động lại `npm run dev`.

### Sửa `npm run stt:start` báo "Next server exited" khi cổng 3000 đã có server
- **Loại:** Sửa lỗi
- **Thay đổi:** Khi cổng web đã có `next dev` chạy (PID 17204, mở từ 14:38), script kiểm tra trang `/stt` chỉ chờ 4 giây; Next dev biên dịch `/stt` lần đầu lâu hơn nên kiểm tra hết hạn, script coi là chưa sẵn sàng và mở thêm một Next nữa. Next không cho hai server trong cùng thư mục (`logs/stt-web.err.log`: "Another next dev server is already running") nên báo lỗi. `scripts/start-stt.ps1` giờ phát hiện cổng đang có server (`Get-NetTCPConnection`), chờ tối đa 120 giây, và nếu vẫn chưa nối được STT thì báo rõ nguyên nhân (server cũ mở khi chưa đặt `STT_BACKEND_URL`) thay vì mở server thứ hai.
- **File:** `scripts/start-stt.ps1`, `docs/CHANGELOG.md`
- **Kiểm tra:** chạy lại `npm run stt:start` với server đang chạy: in đường dẫn `/stt` và backend `/health` (ready, vad_ready). Chưa tái hiện lại tình huống server cũ chưa nối STT; chưa thử micro.

### eForm R1–R14 · Task 6: chính sách dữ liệu, luồng khám và sơ đồ theo R1–R14
- **Loại:** Tài liệu
- **Thay đổi:**
  - `docs/DATA-USE-POLICY.md`: cấp `deidentified` áp dụng cho cả eForm. Bỏ câu "eForm vẫn cần duyệt riêng tư thủ công". Checkbox đồng ý đổi thành cờ R14 lấy từ hồ sơ. Ghi nơi lưu nhật ký R13 của eForm và quyết định D2.
  - `docs/CLINICAL-WORKFLOW.md`: các bước 2–3 theo nút "Che thông tin và tạo bản nháp". Bảng endpoint đổi sang `check`. Mục giới hạn nói rõ không còn duyệt tay trước model.
  - `README.md`: dòng "Luồng hiện tại" (17/11) và dòng sơ đồ.
  - `docs/so-do/luong-chinh.drawio`: ba ghi chú vàng đổi thành "eForm và /demo-luong cùng dùng pii-auto-1".
  - `pending/README.md`: cập nhật trạng thái plan.
- **Lý do:** Plan `2026-11-17-eform-pii-r1-r14.md`, Task 6.
- **File:** `docs/DATA-USE-POLICY.md`, `docs/CLINICAL-WORKFLOW.md`, `README.md`, `docs/so-do/luong-chinh.drawio`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra nghiệm thu toàn plan:**
  - `npm test`: 346/348 qua. Hai test lỗi:
    - `encounter-context.test.ts:28` (lỗi có sẵn);
    - `extract-recording.test.ts` "transcript not yet attached": file này bị sửa từ ngoài phiên, chưa commit; bản đã commit qua 4/4.
  - `tsc --noEmit`: sạch. `eslint src lib`: 0 lỗi, 5 cảnh báo cũ. `npm run build`: thành công.
  - `npm run eval -- --rule-only`: chạy bình thường, 0 dòng thừa. Bộ tách quy tắc không bị sửa.
  - `npm run clinical:check`: lỗi "Clinical types are stale". Nguyên nhân: `src/shared/clinical/types.ts` trong bản checkout là CRLF (autocrlf) còn file sinh ra là LF. Plan không đụng tới schema hay types, nên đây là lỗi có sẵn.
  - `npm run lint`: lỗi ở `.claude/worktrees/*/.next` (build của worktree khác), không thuộc mã nguồn.
  - GitNexus `detect_changes --scope compare --base-ref 15fbe52`: 35 file, rủi ro critical. Phần lớn số luồng bị kéo vào vì khớp với ký hiệu chung `actor` trong test. Các luồng thật bị ảnh hưởng (`TroLyAi`, `EncounterWorkspace`, POST privacy/extract) đã có test và đã kiểm trên trình duyệt.

### eForm R1–R14 · Task 5: Trợ lý lâm sàng hiện bản đã che, lý do chặn R11 và đồng ý R14
- **Loại:** Giao diện
- **Thay đổi:**
  - Ô "Nội dung buổi khám" giữ chữ gốc (chỉ trong bộ nhớ trình duyệt), không còn che cục bộ.
  - Một nút **"Che thông tin và tạo bản nháp"** thay cho chuỗi cũ: kiểm tra riêng tư → sửa bản xem trước → tích đồng ý → tạo bản nháp.
  - Bị chặn: khung đỏ "Chưa gửi AI: còn sót thông tin nhận dạng", liệt kê lý do theo mã R11 và đoạn trích, không tạo bản nháp.
  - Qua chốt chặn: khối "Bản đã che (nội dung gửi AI)" chỉ đọc, các nhãn `[…]` được tô màu. Kèm dòng số mục che theo rule ("R1 × 1"), dòng "Đồng ý AI: ✓ (lúc tiếp đón, …)" hoặc "✗ — chỉ chạy bộ tách trên máy chủ", và cảnh báo bệnh hiếm.
  - Bỏ ô tích đồng ý và ô sửa bản đã che.
  - Nhãn rule, lý do chặn, mẫu nhãn che và `gioVN` chuyển sang `src/shared/clinical/pii/nhan.ts`; `/demo-luong` lấy lại qua `hien-thi.ts`.
  - Xóa `redactTranscript` và `PRIVACY_POLICY_VERSION` (`local-review-2`), giữ `privacyReviewRisks`.
  - Hàm `checkClinicalPrivacy` thay `prepareClinicalPrivacy`/`approveClinicalPrivacy`.
  - Lời nhắc khi chuyển lượt còn nội dung chưa lưu đổi thành "chưa che và lưu", hướng dẫn bấm nút mới.
  - Route privacy bỏ biến `_action` không dùng.
- **Lý do:** Plan `2026-11-17-eform-pii-r1-r14.md`, Task 5.
- **File:** `src/shared/clinical/pii/nhan.ts`, `src/client/demo-luong/hien-thi.ts`, `src/client/clinical-api.ts`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/EncounterWorkspace.tsx`, `src/client/eform/encounter-bridge.ts`, `src/shared/clinical/privacy.ts`, `src/shared/clinical/privacy.test.ts`, `src/app/api/clinical/privacy/route.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - Trước khi sửa: `tsc --noEmit` báo `PrivacyPreview` không tồn tại. Sau khi sửa: `tsc` sạch, `eslint src lib` 0 lỗi (6 cảnh báo cũ).
  - `npm test`: lỗi có sẵn `encounter-context.test.ts:28` và một test bị sửa từ ngoài phiên (xem mục "Ảnh hưởng").
  - Trình duyệt (`npm run dev`, mock):
    - (a) LK-GIA-0456 + "Thử hội thoại tổng hợp": qua chốt chặn, "Đồng ý AI: ✓", có bản nháp.
    - (b) Câu có tên người nhà giả lấy từ hồ sơ: hiện `[NGƯỜI_NHÀ_1]`, "R1 × 1".
    - (c) "hôm qua đỗ quốc việt mua thuốc giúp": bị chặn R11c, không có bản nháp. File nhật ký có dòng `gate:false`, `provider:"khong_goi"`, không có chữ gốc.
    - (d) Mã 000123: "Đồng ý AI: ✗ — chỉ chạy bộ tách trên máy chủ", vẫn tạo được bản nháp.
    - (e) `/demo-luong` mở được, không tràn ở 375px.
    - Không có lỗi console.
  - Ở 375px trang eForm tràn ngang (`scrollWidth` 535) do hàng nút trạng thái có sẵn ("Nhập nội trú", "Chuyển cấp cứu"…), không do khối mới (rộng 310px). Chưa sửa.
- **Ảnh hưởng:**
  - Bác sĩ không còn phải duyệt tay trước khi gửi AI (D2 đã được người dùng xác nhận).
  - Nội dung bị chặn vẫn ở trạng thái "chờ" trong phiên. Muốn chuyển lượt thì bỏ phần đó hoặc sửa rồi bấm lại.
  - File `src/server/clinical/extract-recording.test.ts` có một sửa đổi chưa commit, không do phiên này làm: đổi regex lỗi mong đợi thành `/đã thay đổi|kiểm tra lại/`, nên test "transcript not yet attached" lỗi. Bản đã commit vẫn qua. Phiên này không đụng vào sửa đổi đó.

### eForm R1–R14 · Task 4: trích xuất kèm bằng chứng R11/R14 và nhật ký R13
- **Loại:** Tính năng
- **Thay đổi:** Thêm `src/server/clinical/extract-recording.ts › extractForRecording`. Hàm này làm lần lượt:
  1. Kiểm tra ngữ cảnh và việc bản chép lời đã được gắn vào phiên (chuyển nguyên từ route).
  2. Dựng bằng chứng khử định danh `{ policy_version: "pii-auto-1", gate_passed: true, consent }` từ ticket phía máy chủ.
  3. Gọi `extractClinical` với provider `"mock"`. Đặt `CLINICAL_LLM_PROVIDER` cũng không đổi được provider, vì chưa có adapter AI ngoài.
  4. Tạo xong bản nháp thì ghi một dòng R13 (`gate:true`, tuyến AI, provider/model, mã băm bản sạch). Lỗi xảy ra trước bước này thì không ghi gì.

  `POST /api/clinical/extract` chỉ còn đọc body rồi gọi hàm này.
- **Lý do:** Plan `2026-11-17-eform-pii-r1-r14.md`, Task 4.
- **File:** `src/server/clinical/extract-recording.ts`, `src/server/clinical/extract-recording.test.ts`, `src/app/api/clinical/extract/route.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** Test mới lỗi trước (không có module), sau đó qua 4/4. Bốn ca: provider `mock` dù đặt biến môi trường `gemini`; bệnh nhân chưa đồng ý thì nhật ký ghi `local_only`; ticket hết hạn thì không ghi nhật ký và không tạo lượt AI; bản chép lời chưa gắn vào phiên thì trả 409. `npm test`: 354/355 qua, chỉ còn lỗi có sẵn ở `encounter-context.test.ts:28`.

### eForm R1–R14 · Task 3: API `check` thay `prepare`/`approve`, nhật ký R13 khi bị chặn
- **Loại:** Tính năng
- **Thay đổi:**
  - `POST /api/clinical/privacy` chỉ còn nhận `{ action: "check", text, mode, binding }`. Hai action `prepare`/`approve` cũ trả 400.
  - `checkRecordingPrivacy` lấy danh sách định danh R1 và cờ đồng ý R14 của lượt khám từ máy chủ, che và chặn bằng `pii-auto-1`. Qua chốt chặn thì trả thêm digest. Bị chặn thì ghi một dòng R13 (`gate:false`, `provider:"khong_goi"`, chỉ có mã lý do và mã băm) và không cấp ticket.
  - `requireRecordingContext` trả `known` và `consent` thay cho mảng `identifiers` cũ.
  - Kiểu `PrivacyPreview` đổi thành `PrivacyCheckResult` (`src/shared/clinical/api.ts`).
  - Bốn file test trích xuất, phiên ghi âm và bản chép lời được đổi sang dùng `check`.
- **Lý do:** Plan `2026-11-17-eform-pii-r1-r14.md`, Task 3.
- **File:** `src/shared/clinical/api.ts`, `src/server/clinical/bound-privacy.ts`, `src/server/clinical/bound-privacy.test.ts`, `src/app/api/clinical/privacy/route.ts`, `src/server/clinical/privacy.test.ts`, `src/server/clinical/extraction.test.ts`, `src/server/clinical/extraction-binding.test.ts`, `src/server/clinical/recording-service.test.ts`, `src/server/clinical/reviewed-transcripts.test.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - Test `bound-privacy` lỗi trước (thiếu export), sau đó qua 3/3.
  - `npm test`: 350/351 qua. Test lỗi duy nhất là lỗi có sẵn ở `encounter-context.test.ts:28` (5 !== 4), không liên quan.
  - `tsc --noEmit` còn lỗi ở `src/client/clinical-api.ts` vì `PrivacyPreview` đã bị xóa. Lỗi này sửa ở Task 5.

### eForm R1–R14 · Task 2: ticket riêng tư che bằng pii-auto-1 và chốt chặn R11
- **Loại:** Tính năng
- **Thay đổi:** `PrivacyTickets` bỏ hai bước `prepare`/`approve` (bộ lọc `local-review-2` + bác sĩ duyệt tay), thay bằng hàm `check(text, mode, { known, allowlist, consent, binding })`:
  - Thứ tự xử lý: chặn nội dung cấp 3 → che bằng `redactPii` (R1–R8, nhãn R10) → chốt chặn `checkResidualPii` (R11) → tuyến AI theo cờ đồng ý (R14).
  - Bị chặn thì không lưu gì và không cấp ticket, chỉ trả lý do theo mã rule.
  - Qua chốt chặn thì cấp ticket `passed`, hạn 10 phút.

  Thêm hàm `pii(ticket)` trả số mục che, tuyến AI, cờ đồng ý và mã băm bản sạch, dùng cho nhật ký R13. Transcript ghi `policy_version = "pii-auto-1"`. Bỏ mảng định danh cứng lấy từ `ca-gia.json`.
- **Lý do:** Plan `2026-11-17-eform-pii-r1-r14.md`, Task 2. Người dùng đã duyệt D2 (bỏ duyệt tay trước AI).
- **File:** `src/server/clinical/privacy.ts`, `src/server/clinical/privacy.test.ts`, `src/server/clinical/privacy-binding.test.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** Test mới lỗi trước (`check is not a function`), sau đó qua 10/10. Các test giữ nhãn `BS:`/`bs:`, giữ "3 ngày", "tai trái", "Paracetamol 500mg"; câu STT chữ thường có tên lạ thì bị chặn R11c. GitNexus impact: `PrivacyTickets` ở mức MEDIUM (6 nơi gọi trực tiếp, đều sửa ở Task 3). **Chưa chạy `npm test` đầy đủ:** `bound-privacy` và các test khác còn gọi API cũ, sẽ sửa ở Task 3.

### eForm R1–R14 · Task 1: định danh đã biết, allowlist R11c và nhật ký R13 dùng chung
- **Loại:** Tính năng
- **Thay đổi:** Thêm ba module server:
  - `src/server/clinical/known-identifiers.ts`: hàm `patientKnownIdentifiers` lấy định danh của bệnh nhân từ hồ sơ giả và cờ đồng ý R14. Hàm `knownIdentifiersForContext` gộp ngữ cảnh lượt khám, hồ sơ bệnh nhân và danh bạ bác sĩ, có bỏ trùng; bệnh nhân không có trong hồ sơ thì coi là chưa đồng ý.
  - `src/server/clinical/pii-allowlist.ts`: hàm `clinicalAllowlist`, chuyển nguyên từ `demoAllowlist`.
  - `src/server/clinical/pii-audit.ts`: hàm `appendPiiAudit` ghi ndjson vào `data/clinical/audit/`, chỉ nhận mã lượt khám dạng UUID và dựng lại dòng qua `buildAuditEntry` để không trường lạ nào lọt vào file.

  `/demo-luong` gọi lại hai hàm dùng chung (`knownIdentifiersFor`, `demoAllowlist`), hành vi không đổi.
- **Lý do:** Plan `2026-11-17-eform-pii-r1-r14.md`, Task 1.
- **File:** `src/server/clinical/known-identifiers.ts`, `src/server/clinical/known-identifiers.test.ts`, `src/server/clinical/pii-allowlist.ts`, `src/server/clinical/pii-audit.ts`, `src/server/clinical/pii-audit.test.ts`, `src/server/demo-luong/known-identifiers.ts`, `src/server/demo-luong/kich-ban.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** Test mới lỗi trước (không tìm thấy module), sau khi viết code thì qua. Chạy test mới cùng test của `demo-luong` và `pii`: 69/69 qua. GitNexus impact: `knownIdentifiersFor` ở mức LOW.

### Plan chuyển eForm sang bộ che PII R1–R14
- **Loại:** Tài liệu
- **Thay đổi:** Thêm thiết kế và plan 6 task trong `docs/superpowers/plans/pending/`, để eForm `/` dùng bộ `pii-auto-1` như trang "Phần chung" của sơ đồ. Nội dung chính:
  - Máy chủ che bằng R1–R8 (nhãn theo R10), chặn ở R11, lấy cờ đồng ý từ hồ sơ (R14), ghi nhật ký R13 vào `data/clinical/audit/`.
  - Gộp hai bước `prepare` và `approve` thành một hành động `check`, bỏ ô tích đồng ý và bước duyệt tay. Trợ lý lâm sàng hiện bản đã che dạng chỉ đọc, số mục che theo rule và lý do chặn.
  - Dùng chung định danh đã biết và danh mục cho phép với `/demo-luong`. Xóa `redactTranscript` (`local-review-2`).
- **Lý do:** Người dùng yêu cầu viết plan sau khi chọn vẽ sơ đồ theo bộ R1–R14.
- **File:** `docs/superpowers/plans/pending/2026-11-17-eform-pii-r1-r14-design.md`, `docs/superpowers/plans/pending/2026-11-17-eform-pii-r1-r14.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đã đối chiếu tên hàm, kiểu và fixture trong plan với code hiện tại:
  - `PrivacyTickets`, `bound-privacy`, `extractClinical`, các module `pii/`;
  - mã khám `000123` ứng với `GIA-000456` (chưa đồng ý), `LK-GIA-0456` ứng với `GIA-000123` (đã đồng ý).

  Đã chạy thử `redactPii` trên câu giả: nhãn `BN:`/`BS:`, "3 ngày", "Paracetamol 500mg" vẫn còn, tên bị thay bằng `[BỆNH_NHÂN]`. Chưa triển khai code.
- **Ảnh hưởng:** Quyết định D2 (bỏ duyệt tay trước AI) là thay đổi chính sách dữ liệu, cần người dùng xác nhận trước khi làm.

### Sơ đồ draw.io hai luồng chính và bước lọc dữ liệu nhạy cảm R1–R14
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/so-do/luong-chinh.drawio`, gồm 3 trang, chia làn Bác sĩ / Trình duyệt / Máy chủ trong viện, mô tả từng bước bằng lời thường thay vì tên API:
  1. Nói → điền phiếu khám (ghi âm, nhận dạng tại chỗ R9, bản thô chỉ nằm trong bộ nhớ).
  2. Gõ tắt: 2A gõ vào ô Trợ lý rồi đi qua bước lọc; 2B gõ tắt trên phiếu (mở viết tắt khi tìm danh mục, mẫu câu, gợi ý ICD và chỉ định), không gửi nội dung đi.
  3. Phần chung: khung đỏ "Lọc dữ liệu nhạy cảm" theo bộ `pii-auto-1`. Khung này gồm định danh đã biết, R1–R8 che cùng lúc, R10 nhãn, chốt chặn R11 (còn sót thì dừng, không gửi AI), R12 tối thiểu dữ liệu, R14 đồng ý. Sau đó AI tách, kiểm tra bằng chứng, khớp danh mục, lưu kèm nhật ký R13, rồi bác sĩ nhận/bỏ đề xuất, lưu, duyệt và in. Mỗi rule ghi căn cứ (Luật 91/2025, NĐ 356/2025, HIPAA, ISO/IEC).

  Ô offpage bấm được để chuyển trang.
- **Lý do:** Người dùng cần sơ đồ dễ hiểu cho hai tính năng chính và muốn làm nổi bật các rule lọc đã nạp. Người dùng chọn vẽ theo bộ R1–R14.
- **Lưu ý trên sơ đồ:**
  - Bộ R1–R14 hiện chỉ chạy ở `/demo-luong`. eForm `/` vẫn dùng bộ lọc `local-review-2` và bác sĩ tự kiểm tra trước khi tạo nháp.
  - Bước tách nội dung của eForm chưa mở viết tắt; bảng `viet-tat.json` chỉ dùng khi tìm danh mục.
  - Ngoài sơ đồ còn thấy `config/sua-chu-giong-noi.json` vẫn được nạp nhưng không còn áp vào câu chốt trong luồng clinical mới (README mục "Sửa chữ sau nhận dạng" chưa phản ánh điều này). Chưa sửa.
- **File:** `docs/so-do/luong-chinh.drawio`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:**
  - Đã parse XML. Mã phần tử không trùng, mọi mũi tên trỏ tới phần tử có thật (trang 1: 14, trang 2: 17, trang 3: 25 mũi tên).
  - Đã xem cả 3 trang bằng trình xem draw.io (viewer-static) trên trình duyệt, chỉnh lại các đường chồng chữ.
  - Chưa mở bằng ứng dụng draw.io desktop.

### Nghiệm thu màn /demo-luong, sửa tràn ngang 375px, tài liệu và số đo PII
- **Loại:** Sửa lỗi, Tài liệu
- **Thay đổi:** Kiểm trong trình duyệt (dữ liệu giả, AI mock) Task 7 bước 3 của plan demo luồng dữ liệu: ca chuẩn phần 1 (rev 2, 9 mục che) → sửa ô "Lý do đến khám" thành "BS sửa" (rev 3, nguồn "Bác sĩ sửa") → phần 2 (rev 4, ô giữ giá trị bác sĩ, thêm "Khám chuyên khoa TMH" và chỉ định từ AI · phiên 2) → Duyệt (rev 5, "Đã duyệt") → phiên 3 (rev 6, phiếu về nháp). Ca bị chặn: ③ "Bị chặn · R11c", ④⑤ "Không gửi AI", phiếu giữ rev 1. Ca chưa đồng ý: dòng "Đồng ý AI: ✗", ④ "Không được gửi AI ngoài — chạy bộ tách local". Chế độ Kỹ thuật mở được chi tiết từng bước; "+ Phiếu khám mới" ra phiếu rev 1, chưa có phiên. Không có lỗi console. Lỗi tìm thấy: ở khung 375px trang tràn ngang (cuộn ngang 514px) vì ô chọn kịch bản mẫu không co lại; thêm `max-w-full min-w-0` cho ô chọn và khối chứa trong `NguonPicker.tsx`, đo lại `scrollWidth` = `clientWidth` = 375.
  - Số đo che PII trên 3 kịch bản (chạy `redactPii` + `checkResidualPii` với `knownIdentifiersFor`):

    | Kịch bản | Phải che | Đã che | Còn sót | Che thừa (mục phải giữ bị che) | Chốt chặn |
    | --- | --- | --- | --- | --- | --- |
    | `ca-chuan` | 9 | 9 | 0 | 0 | qua (đúng kỳ vọng) |
    | `ca-chua-dong-y` | 2 | 2 | 0 | 0 | qua (đúng kỳ vọng) |
    | `ca-bi-chan` | 1 | 1 | 0 | 0 | chặn R11c (đúng kỳ vọng) |
  - `README.md`, `docs/CLINICAL-WORKFLOW.md` (mục "Demo luồng dữ liệu"), `docs/cau-truc-du-an.md` (bảng dùng chung), `docs/superpowers/plans/PRIORITIES.md` và `pending/README.md` ghi trạng thái mới. Plan vẫn để trong `pending/` vì chưa thử micro thật.
- **File:** `src/client/demo-luong/NguonPicker.tsx`, `README.md`, `docs/CLINICAL-WORKFLOW.md`, `docs/cau-truc-du-an.md`, `docs/superpowers/plans/PRIORITIES.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npm test`: chỉ một lỗi có sẵn ở `encounter-context.test.ts:28` (5 !== 4), không liên quan; `npx eslint src lib` 0 lỗi, 6 cảnh báo cũ; `npm run build` thành công (có route `/demo-luong`); `npm run eval -- --rule-only` chạy bình thường, 0 dòng thừa (không so diff với trước vì không dựng lại bản cũ; đường cũ chỉ thêm tham số tùy chọn, có test giữ hành vi). `detect-changes --scope all`: chỉ chạm 1 file, không trùng ký hiệu đã lập chỉ mục nên không coi là kết quả sạch; `--scope compare --base-ref main` báo critical với 470 luồng vì gộp cả nhánh. **Chưa kiểm tra:** micro thật và STT (`npm run stt:start` chưa chạy), nên chưa chuyển plan ra khỏi `pending/`. Ca chưa đồng ý chạy bộ tách local nên phiếu gần như trống (ví dụ "Lý do đến khám" không điền dù bản đã che có "đến khám vì ù tai trái 2 tuần"): giới hạn của bộ quy tắc, chưa sửa.

## 2026-11-16

### Sửa rà soát vòng 1 cho màn /demo-luong
- **Loại:** Sửa lỗi
- **Thay đổi:**
  - Bản sửa của bác sĩ chụp giá trị gốc lúc bấm "Sửa" và chỉ gửi ô khác giá trị gốc đó (trước đây so với phiếu hiện tại nên phiên mới chạy giữa chừng có thể bị ghi đè và đánh dấu "Bác sĩ sửa"). Đang mở bản sửa thì khóa "▶ Ghi phiên mới", kèm lý do.
  - Lưu bản sửa/Duyệt lỗi (ví dụ 409 revision cũ) thì đọc lại phiếu, giữ thông báo lỗi tiếng Việt, lần bấm sau dùng đúng revision.
  - Micro: gỡ component lúc đang "Đang mở micro…" thì micro mở xong được đóng ngay, không setState sau khi gỡ; khóa chọn nguồn khi đang mở hoặc đang thu.
  - Ô ④ / chi tiết AI khi `local_only` chỉ hiện "Không được gửi AI ngoài — chạy bộ tách local", không kèm dòng "Mock — chưa rời máy chủ".
  - Ghi chú rủi ro R2 nói rõ chữ STT là chữ thường nên rule không dựa vào chữ hoa.
  - Nút chọn nguồn có tên truy cập ("Micro", "File WAV", "Kịch bản mẫu"); đoạn tô đỏ có mã rule dạng chữ ẩn cho trình đọc màn hình.
  - Test `listKichBan` kiểm `phien`: ca chuẩn `[1, 2]`, hai ca còn lại `[]`.
- **Lý do:** Rà soát task 7 và kiểm tra trình duyệt của controller.
- **File:** `src/client/demo-luong/{DemoLuongScreen,DemoPhieuPanel,MicWav,NguonPicker,StepRail,TechDetails,TranscriptPanels}.tsx`, `src/client/demo-luong/hien-thi.ts`, `src/server/demo-luong/kich-ban.test.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** `tsc` sạch; `eslint` 0 lỗi; `kich-ban.test.ts` 11/11; `npm run build` thành công; `npm test` 345/346 (lỗi có sẵn ở `encounter-context.test.ts:28`). Kiểm tra trình duyệt: controller kiểm sau.

### Màn demo /demo-luong hai chế độ xem
- **Loại:** Giao diện
- **Thay đổi:** Thêm trang `/demo-luong` (link "Demo luồng dữ liệu" trên thanh đầu).
  - Thanh trên: công tắc chế độ Bác sĩ / Lãnh đạo | Kỹ thuật, chọn bệnh nhân giả, dòng "Đồng ý AI: ✓/✗ (lúc tiếp đón, <lúc>)" (đọc từ hồ sơ giả qua `/api/clinic/patients/[id]`, sau lượt chạy lấy theo sự kiện ③; chưa đồng ý thì thêm nhãn "Không được gửi AI ngoài — chạy bộ tách local"), "+ Phiếu khám mới", "Xóa dữ liệu demo".
  - Chọn nguồn: Micro (thu thành WAV 16 kHz bằng đường ống `lib/stt/microphone.ts` + `encodePcm16WavFromChunks`; `MicButton`/`DenoisedMic` chỉ trả chữ nên không dùng trực tiếp được), File WAV (chuẩn hóa bằng `canonicalizeAudioBlob`), Kịch bản mẫu (chọn phần 1/2 hoặc cả kịch bản; tự gợi ý phần tiếp theo). Chọn kịch bản của bệnh nhân khác thì mở phiếu mới cho bệnh nhân đó thay vì lỗi 409.
  - Sơ đồ 5 ô có trạng thái và ms; bị chặn thì ③ đỏ kèm mã lý do, ④⑤ "Không gửi AI". Thanh phiên `Phiên 1 ✓ · Phiên 2 ✓ · [▶ Ghi phiên mới]`, bấm phiên để xem lại; bản thô giữ trong state theo `sequence`, có ghi chú mất khi tải lại trang (mã phiếu đang mở giữ trong `sessionStorage` nên tải lại vẫn về đúng phiếu).
  - Ba cột (xếp dọc dưới 768px): Bản thô (span đỏ, `title` = mã rule), Bản đã che (nhãn xanh có hiệu ứng đỏ → xanh, "Đã che N mục · Chặn: không/có"), Phiếu khám đọc lại từ kho (nhãn "AI · phiên N" / "Bác sĩ sửa", "Phiên N nói khác: …", câu nguồn, cờ cần kiểm tra, Sửa / Lưu bản sửa / Duyệt, rev, "Bác sĩ thao tác: N lần (duyệt phiếu)" đếm thật số lần Lưu bản sửa/Duyệt thành công).
  - Chế độ Bác sĩ: chữ lớn, dòng "Thông tin định danh không rời máy chủ bệnh viện". Chế độ Kỹ thuật: mỗi ô mở `TechDetails` (bảng đếm theo rule, lý do chặn, `payload_preview` nguyên văn, provider/model/prompt/schema/policy version, kiểm cấu trúc, JSON `DemoPhieu`, dòng nhật ký R13, ghi chú rủi ro còn lại của R2, "Mock — chưa rời máy chủ").
  - `GET /api/demo-luong/kich-ban` trả thêm `phien: number[]` (kiểu mới `KichBanTomTat` trong `types.ts`). `globals.css` thêm keyframes `demo-do-sang-xanh`.
- **Lý do:** Task 7 của plan demo luồng dữ liệu: cho bác sĩ/lãnh đạo và hội đồng kỹ thuật xem trọn luồng trên một màn.
- **File:** `src/app/demo-luong/page.tsx`, `src/client/demo-luong/{DemoLuongScreen,ThanhTren,NguonPicker,MicWav,StepRail,SessionBar,TranscriptPanels,DemoPhieuPanel,TechDetails}.tsx`, `src/client/demo-luong/{hien-thi,api}.ts`, `src/client/chung/Header.tsx`, `src/shared/demo-luong/types.ts`, `src/server/demo-luong/kich-ban.ts`, `src/app/globals.css`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit` sạch; `npx eslint src lib` 0 lỗi; `npm run build` thành công (có route `/demo-luong`); `npm test` 344/345 (lỗi có sẵn ở `encounter-context.test.ts:28`). Impact `Header` LOW (1 nơi gọi: `RootLayout`); `listKichBan` UNKNOWN, tìm chữ thấy chỉ route `kich-ban` và test gọi, thay đổi chỉ thêm trường. Kiểm tra trình duyệt: controller kiểm sau. Chưa thử micro.

### Sửa rà soát vòng 1 cho API demo-luong
- **Loại:** Sửa lỗi
- **Thay đổi:** `types.ts`: thêm `DemoErrorEvent` (`{buoc, trang_thai:"loi", ms, du_lieu:{loi,...}}`, các trường ngữ cảnh của `ai`/`luu` là tùy chọn) và hàm `isDemoError`; bỏ các biến thể `loi` riêng lẻ, dòng lỗi giữa stream nay đúng kiểu. Test hủy request nay thật sự kiểm tra phiếu không đổi (đã xác nhận fail khi tắt xử lý abort). `DEMO_LUONG_DIR` chỉ có hiệu lực khi `NODE_ENV=test` hoặc nằm dưới thư mục tạm. Client báo lỗi tiếng Việt khi phản hồi không có body. Route đọc âm thanh theo từng đoạn và trả 413 ngay khi vượt 20 MB, kể cả không có Content-Length.
- **File:** `src/shared/demo-luong/types.ts`, `src/server/demo-luong/{get-store,stream,flow.test}.ts`, `src/app/api/demo-luong/{route,routes.test}.ts`, `src/client/demo-luong/api.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** routes + flow test 20/20, `tsc` sạch, `eslint` 0 lỗi, `npm test` 344/345 (lỗi có sẵn ở `encounter-context.test.ts`).

### API stream và phiếu demo cho /demo-luong
- **Loại:** Tính năng
- **Thay đổi:** Thêm API của `/demo-luong` và module gọi từ trình duyệt (chưa có giao diện).
  - `POST /api/demo-luong?phieu=<uuid>&kich_ban=<id>[&phien=1|2]` hoặc `?phieu=<uuid>` với body `audio/wav`: trả `application/x-ndjson`, mỗi dòng một `DemoEvent`. Kiểm tra mã phiếu, kịch bản, phiên, bệnh nhân khớp, kích thước âm thanh (> 20 MB: 413) trước khi mở stream nên lỗi trả JSON 400/404/409/413. Hủy request thì dừng bộ sinh sự kiện. Lỗi giữa chừng chỉ phát một dòng `{buoc, trang_thai:"loi", du_lieu:{loi}}` chung, không lộ stack. STT gọi qua `proxyStt` với `Request` nội bộ; lỗi STT phát một dòng `stt/loi` rồi đóng. Âm thanh không ghi đĩa.
  - `POST /api/demo-luong/phieu` (tạo), `DELETE` (204, xóa dữ liệu demo), `GET`/`PATCH /phieu/[id]` (đọc, lưu bản sửa, revision cũ 409), `POST /phieu/[id]/duyet`, `GET /kich-ban`. Mọi route: `runtime = "nodejs"`, `assertLocalDemoRequest`, lỗi qua `clinicalResponse`, `Cache-Control: no-store`.
  - `src/server/demo-luong/get-store.ts`: `getDemoStore()` là nơi duy nhất chọn kho; biến môi trường `DEMO_LUONG_DIR` (chỉ để test) trỏ sang thư mục tạm. `stream.ts`: `ndjsonStream`. `src/client/demo-luong/api.ts`: `streamDemoFlow` và các hàm gọi CRUD.
  - `types.ts`: thêm biến thể `stt` với `trang_thai: "loi"` cho `DemoEvent`.
- **Lý do:** Task 6 của plan demo luồng dữ liệu: giao diện (Task 7) cần một cổng HTTP cho bộ điều phối và kho phiếu.
- **File:** `src/app/api/demo-luong/**`, `src/server/demo-luong/{get-store,stream}.ts`, `src/client/demo-luong/api.ts`, `src/shared/demo-luong/types.ts`, `src/server/demo-luong/flow.test.ts` (kiểu), `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/app/api/demo-luong/routes.test.ts` 7/7; `npx tsc --noEmit` sạch; `npx eslint src lib` 0 lỗi; `npm test` 341/342 (một lỗi có sẵn ở `encounter-context.test.ts`).

### Bộ điều phối 5 bước và kho phiếu nhiều phiên cho demo luồng dữ liệu
- **Loại:** Tính năng
- **Thay đổi:** Thêm phần lõi máy chủ của `/demo-luong` (chưa có API và giao diện).
  - `store.ts`: kho riêng ở `data/demo-luong/` (`demoStore(root?)` dùng `ClinicalRepository` trỏ vào `encounters/`). `createDemoPhieu` tạo phiếu khám mới không theo lịch hẹn theo kiểu `createPatientEncounter` (`createWalkInContext` + `openEncounter`); `readDemoPhieu` đọc lại hồ sơ và sidecar `meta/<id>.json` (`sources`, `sessions`, `duyet`; chỉ bản đã che); `saveDoctorEdit` áp đúng các ô bác sĩ sửa lên hồ sơ (revision mới, nguồn "bac_si", bỏ duyệt; revision cũ thì 409, ô lạ thì 400); `approveDemoPhieu` ghi người/thời gian duyệt bằng persona demo `user_bs01`; `resetDemoData` xóa `encounters/ meta/ runs/ transcripts/ run-index/ audit/`, giữ `kich-ban/`. `DemoStore` có thêm tùy chọn `openContext` (mặc định `createWalkInContext`) để test dùng ngữ cảnh fixture.
  - `merge.ts`: `mergeSession` ghép một phiên vào phiếu: ô bác sĩ đã sửa giữ giá trị cũ, AI nói khác (không rỗng) thì gắn `xung_dot {phien, gia_tri_ai}`; ô khác đổi giá trị thì nguồn "AI · phiên n".
  - `flow.ts`: `runDemoFlow` phát lần lượt `stt` (kịch bản: ghép đoạn, engine "kich-ban"; audio: gọi `transcribe`, chế độ dictation, không lưu audio) → `ban_tho` (che từng đoạn, vị trí span theo bản thô ghép) → `che` (chốt chặn R11, đồng ý R14, `dong_y_override` của kịch bản được ưu tiên; bị chặn thì phát `bi_chan`, ghi nhật ký `gate:false` chỉ mã lý do, dừng, hồ sơ không đổi) → `ai` (`extractClinical` mock với transcript đã che, proof `pii-auto-1`, `noCache`, `directory` là kho demo) → `luu` (`applyAiDraft` + `RecordingSession` mới `stopped/reviewed`, `reviewed_digest` là sha256 bản sạch, ô bác sĩ sửa được đặt lại trong hồ sơ, ghi sidecar và một dòng `audit/<id>.ndjson`, đọc lại từ đĩa kèm sha256 file hồ sơ). Kịch bản của bệnh nhân khác phiếu đang mở thì 409.
- **Lý do:** Task 5 của plan demo luồng dữ liệu: một phiếu nhiều phiên ghi âm, bác sĩ sửa ô không bị phiên sau ghi đè, bản thô chỉ đi trong stream.
- **File:** `src/server/demo-luong/{store,merge,flow}.ts`, `src/server/demo-luong/{store,flow}.test.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/server/demo-luong/store.test.ts src/server/demo-luong/flow.test.ts` 14/14 (trước khi viết code: không tìm thấy module `./store`), gồm test không rò bản thô quét đệ quy mọi file trong kho tạm (trừ `kich-ban/`); `npm test` 331/332 (một lỗi có sẵn ở `encounter-context.test.ts`); `npx eslint src lib` 0 lỗi. Đường mặc định `createWalkInContext` chạy thử một lần bằng script tạm (tạo 2 phiếu khác nhau, chạy trọn 5 bước) rồi xóa file ngữ cảnh đã tạo.
- **Ảnh hưởng:** (bản đầu) mỗi phiếu demo để lại một file `data/clinical/walk-in-contexts/LK-NEW-*.json`; đã sửa sau rà soát, xem dưới.
- **Sửa sau rà soát vòng 1:**
  - Phiếu demo không còn ghi gì ngoài `data/demo-luong/`: `service.ts` thêm export mới `seedNewEncounter(context, appointmentId)` (dựng hồ sơ như `openEncounter` từ ngữ cảnh fixture của bệnh nhân, gắn mã lượt mới, không sửa `seed`/`createWalkInContext`); `createDemoPhieu` dùng nó với mã `LK-DEMO-xxxxxxxx` rồi `repo.openByAppointment`. Phiếu demo không hiện trong danh sách phiếu eForm, "Xóa dữ liệu demo" xóa sạch. Bỏ tùy chọn `openContext` của `DemoStore`. Test đường mặc định: không file mới nào dưới `data/clinical/`, `resetDemoData` không để lại gì.
  - Kịch bản `ca-chuan`: tách đoạn (danh tính, triệu chứng, tiền sử riêng; phiên 2 tách khám / chỉ định / thuốc), bệnh nhân nói lý do khám trước khi bị hỏi danh tính, câu khám bỏ chữ "nhỏ" (bộ lọc kê đơn coi "nhỏ + chữ" là thuốc nhỏ). Nay phiên 1 điền lý do khám "tôi bị chảy dịch tai phải đau 3 ngày nay" (không còn nhãn che), phiên 2 điền khám chuyên khoa và một chỉ định. Danh sách `phai_che`/`phai_giu` không đổi, mỗi phiên vẫn qua chốt chặn.
  - `flow.ts`: dòng nhật ký `gate:false` ghi trước khi phát sự kiện `bi_chan`; nhánh `luu/loi` không ném lỗi (đọc lại phiếu và băm file đều được bọc).
  - Không sửa `mockClinicalExtraction` (`/ho\b/` vẫn khớp "thoại"): impact HIGH nên dừng, chờ chủ dự án quyết.
  - Kiểm tra: store/flow/kich-ban/extraction 42/42; `npm test` 334/335 (lỗi có sẵn ở `encounter-context.test.ts`); `npx eslint src lib` 0 lỗi.
  - File thêm: `src/server/clinical/service.ts`, `data/demo-luong/kich-ban/ca-chuan.json`.

### Cấp deidentified và tùy chọn noCache cho chính sách dữ liệu
- **Loại:** Tính năng
- **Thay đổi:** `data-policy.ts` thêm cấp `deidentified`, kiểu `DeidentificationProof` và tham số `proof` cho `classifyData` (proof `pii-auto-1` hợp lệ, không restricted thì trả `deidentified`). `assertDataUseAllowed`: `deidentified` ra ngoài khi có đồng ý, chưa đồng ý thì ném "Bệnh nhân chưa đồng ý xử lý AI — chỉ được chạy bộ tách local."; `masked_internal` ra ngoài vẫn bị chặn. `extractClinical` nhận `deidentification` (truyền vào `classifyData`, lấy đồng ý từ proof) và `noCache` (bỏ đọc cache bộ nhớ và run-index, không gộp inflight, vẫn ghi run). Không truyền hai tùy chọn thì hành vi cũ. `docs/DATA-USE-POLICY.md` thêm mục cấp deidentified, nêu rõ chỉ áp dụng `/demo-luong`, eForm `/` giữ duyệt thủ công.
- **Lý do:** Để luồng demo chạy không qua phiếu duyệt riêng tư thủ công mà vẫn giữ đường chặn cấp 2 và cấp 3.
- **File:** `src/shared/clinical/data-policy.ts`, `src/server/clinical/extraction.ts`, hai file test tương ứng, `docs/DATA-USE-POLICY.md`, `docs/CHANGELOG.md`
- **Sửa sau rà soát vòng 1:** bản đầu chưa nối proof vào `extractClinical` (vẫn truyền đồng ý `true` cứng) dù mô tả ở trên; nay đã nối thật và có test đích external (có `call`): đồng ý thì qua, chưa đồng ý bị chặn đúng thông báo, không proof vẫn chặn cấp 2, văn bản cấp 3 vẫn chặn. JSDoc ghi rõ proof chỉ phía máy chủ.
- **Kiểm tra:** data-policy.test.ts và extraction.test.ts 20/20; impact `assertDataUseAllowed`, `extractClinical`, `classifyData` đều LOW.

### Dữ liệu giả, kịch bản mẫu và giá trị đã biết cho demo luồng dữ liệu
- **Loại:** Tính năng
- **Thay đổi:** `data/clinic/patients.json` thêm trường giả tùy chọn cho mỗi bệnh nhân: `dong_y_xu_ly_ai {trang_thai, luc}`, `nguoi_nha[]`, `noi_lam_viec`, `dia_chi`, `dien_thoai` (schema `PatientProfileSchema` nhận các trường này, đều optional nên fixture cũ vẫn hợp lệ; file được định dạng lại nên diff dài). Thêm 3 kịch bản `data/demo-luong/kich-ban/{ca-chuan,ca-chua-dong-y,ca-bi-chan}.json`; `.gitignore` bỏ qua `data/demo-luong/*` trừ `kich-ban/`. Thêm `src/shared/demo-luong/types.ts` (kiểu dùng chung `KichBan`, `DemoEvent`, `DemoPhieu`...), `src/server/demo-luong/known-identifiers.ts` (`knownIdentifiersFor` gom tên, mã, điện thoại, địa chỉ, nơi làm việc, người nhà, nhân viên và cờ đồng ý AI) và `kich-ban.ts` (`listKichBan`, `loadKichBan` chỉ nhận id `[a-z0-9-]`, lỗi 404; `demoAllowlist` gồm thuật ngữ TMH, tên thuốc và dịch vụ trong danh mục, đã bỏ dấu). `pii/index.ts` export thêm `DEFAULT_CLINICAL_ALLOWLIST`.
- **Lý do:** Cung cấp đầu vào giả và danh sách giá trị đã biết cho luồng demo che PII; ca bị chặn chứng minh chốt chặn R11c hoạt động.
- **File:** `data/clinic/patients.json`, `src/shared/clinic/schema.ts`, `data/demo-luong/kich-ban/*.json`, `src/shared/demo-luong/types.ts`, `src/server/demo-luong/{known-identifiers,kich-ban}.ts`, `src/server/demo-luong/kich-ban.test.ts`, `src/shared/clinical/pii/index.ts`, `.gitignore`, `docs/CHANGELOG.md`
- **Sửa sau rà soát vòng 1:** bỏ "tôn thất" khỏi allowlist (tên người ghép họ này phải bị chặn, có test); R7 quốc tịch che trọn giá trị nhiều từ ("việt nam", "hàn quốc", "trung quốc", "hoa kỳ", có test trong `redact.test.ts`); thêm `phien` cho `doan` và `DemoSource`, hàm `doanForPhien`, ca chuẩn chia phiên 1 (lý do khám, bệnh sử) và 2 (khám, chỉ định); ca bị chặn kiểm đúng lý do R11c; `listKichBan` bỏ qua tên file sai định dạng id.
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/server/demo-luong/kich-ban.test.ts` cùng `redact.test.ts`, `gate.test.ts` đạt 45/45 sau sửa; trước đó 8/8; `npm test` 309/310 (một lỗi có sẵn ở `encounter-context.test.ts`); `npx eslint src lib` không lỗi.

### Chốt chặn R11, đồng ý R14, nhật ký R13 cho bộ che PII
- **Loại:** Tính năng
- **Thay đổi:** Thêm `checkResidualPii(clean, known, allowlist)` chặn bản sạch còn sót PII trước khi gọi AI: (a) giá trị đã biết (so khớp không dấu, dài hơn 2 ký tự), (b) dãy số dài kể cả tách khoảng trắng (bỏ phần trong nhãn), (c) tên người còn sót, dò bằng đúng logic của R2 (họ có dấu khớp đúng, họ không dấu trừ họ mơ hồ, đuôi không phải từ dừng hay cặp từ thường; `redact.ts` export `isHo`, `isCommonHoPair`, `nameTailEnd` để dùng chung), không cần chữ hoa, bỏ qua nhãn, (d) email/URL. Trích đoạn lấy từ bản sạch, tối đa 40 ký tự. Thêm `aiRouteFor(consent)` (R14: không đồng ý thì `local_only`) và `buildAuditEntry` (R13: chỉ số đếm, kết quả chốt chặn, hàm băm do máy chủ cung cấp; không mang chữ thô hay chữ sạch). Chưa nối vào luồng nào.
  - Allowlist: `DEFAULT_CLINICAL_ALLOWLIST` ("tiền sử", "cao huyết áp", "dương tính", "phù nề", "niêm mạc", "ngày mai"...) luôn gộp với allowlist của người gọi; họ nằm ở bất kỳ vị trí nào trong cụm allowlist đều được bỏ qua. 24 câu ENT thường viết thường đều qua không cần allowlist.
  - `buildAuditEntry` sao chép từng trường (trường lạ như `raw` không lọt vào); `excerpt` của chốt chặn có thể chứa PII còn sót nên không được lưu.
- **Lý do:** Bước chặn cuối của màn demo luồng dữ liệu: nghi ngờ còn sót thì không gọi AI. Bắt được cả ca bộ che bỏ sót như "chi le thi hoa tho kho" không dấu.
- **File:** `src/shared/clinical/pii/{gate,audit,index}.ts`, `src/shared/clinical/pii/gate.test.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinical/pii/gate.test.ts` cùng `redact.test.ts` đạt 34/34 (redact 20/20); `npx eslint src lib` không lỗi (5 cảnh báo có sẵn).

### Bộ che PII tự động pii-auto-1 (R1–R8, nhãn R10)
- **Loại:** Tính năng
- **Thay đổi:** Thêm module thuần TS `src/shared/clinical/pii/`: `redactPii(raw, known)` che tên đã biết (so khớp không dấu, tách khoảng trắng), tên người dò bằng từ điển họ (`HO_VIET`) nên không cần chữ hoa, địa chỉ/địa danh, ngày tháng, liên hệ (điện thoại, email, URL, IP), mã định danh (CCCD, biển số, PID, tài khoản), thông tin nhạy cảm (quốc tịch, tôn giáo, hôn nhân), nội dung ngoài khám, cùng tuổi/giới tính. Trả về bản sạch, danh sách span trên bản thô và số lần mỗi rule. Nhãn dạng `[KIND_n]` đếm theo thứ tự xuất hiện, cùng giá trị cùng nhãn; bệnh nhân/bác sĩ không số. Không sửa `privacy.ts` (`redactTranscript` cũ giữ nguyên). Chưa nối vào luồng nào.
  - Sửa sau rà soát vòng 1: R2 không nuốt từ lâm sàng sau từ chỉ người (thêm từ dừng triệu chứng, cặp họ + từ thường như "bình thường", từ dừng không dấu); R2 đầu văn bản chỉ nhận họ phổ biến hoặc có đệm văn/thị; "đường" không che giải phẫu/phẫu thuật; span chồng nhau được cắt phần chồng và vẫn che phần còn lại (trừ R2); thêm từ chỉ người thân (mẹ, bố, vợ, chồng, "là") để che tên người nhà không cần chữ "tên".
- **Lý do:** Bước đầu của màn demo luồng dữ liệu: bản thô từ STT (chữ thường, không dấu câu) phải được che PII trước khi đến AI.
- **File:** `src/shared/clinical/pii/{types,ho-viet,redact,index}.ts`, `src/shared/clinical/pii/redact.test.ts`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinical/pii/redact.test.ts` đạt 19/19; eslint sạch trên thư mục mới. `npm test` toàn bộ: 281/282, một lỗi có sẵn ở `encounter-context.test.ts` (đếm phiếu lịch sử 5 thay vì 4), không liên quan thay đổi này.

### Thiết kế màn demo luồng dữ liệu và bộ rule PII tự động (chờ duyệt)
- **Loại:** Tài liệu
- **Thay đổi:** Thêm bản thiết kế màn `/demo-luong`: STT → bản thô → che PII tự động trên máy chủ → AI → lưu → phiếu khám để bác sĩ duyệt lần cuối, có hai chế độ xem (Bác sĩ/Lãnh đạo và Kỹ thuật). Đề xuất 14 rule PII (R1–R14), có chốt chặn không gọi AI khi nghi ngờ còn sót, và cờ đồng ý xử lý AI lấy lúc tiếp đón. Sau bước rà soát: STT trả chữ thường nên dò tên bằng từ điển họ; một phiếu khám có nhiều phiên ghi âm, kèm nút "+ Phiếu khám mới"; ô bác sĩ đã sửa không bị phiên sau ghi đè. AI đợt này chỉ là mock; nối model thật để đợt sau.
- **Lý do:** Chủ dự án cần demo trọn luồng cho cả bác sĩ/lãnh đạo bệnh viện và hội đồng kỹ thuật, không thêm thao tác duyệt bản lọc cho bác sĩ. Rule dựa trên Luật BVDLCN 91/2025/QH15, Nghị định 356/2025/NĐ-CP và HIPAA Safe Harbor.
Thiết kế đã được duyệt và có plan triển khai 8 task, mỗi task có test (bộ che PII, chốt chặn, dữ liệu giả, nới chính sách, bộ điều phối, API stream, giao diện, tài liệu).
- **File:** `docs/superpowers/plans/pending/2026-11-16-demo-luong-du-lieu-design.md`, `docs/superpowers/plans/pending/2026-11-16-demo-luong-du-lieu.md`, `docs/superpowers/plans/pending/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chưa kiểm tra. Mới là tài liệu, chưa sửa code.
- **Ảnh hưởng:** Khi triển khai sẽ phải sửa `docs/DATA-USE-POLICY.md`: dữ liệu đã qua chốt chặn được coi là đã khử nhận dạng.

### Chỉnh giao diện dashboard/bệnh nhân theo góp ý; "Tạo mới phiếu khám" tạo phiếu ngoại trú mới
- **Loại:** Tính năng, Giao diện, Sửa lỗi
- **Thay đổi:**
  - Màn bệnh nhân: nút **Tạo mới phiếu khám** luôn dùng được, tạo một phiếu khám ngoại trú mới (không theo lịch hẹn) rồi mở ở eForm. Server (`POST /api/clinic/patients/[patientId]/encounters`) lấy bác sĩ/cơ sở từ actor, tạo ngữ cảnh riêng mã `LK-NEW-xxxxxxxx` từ ngữ cảnh gần nhất của bệnh nhân (giữ danh tính, tiền sử, cận lâm sàng; bỏ nội dung lượt cũ), lưu ở `data/clinical/walk-in-contexts/` (đã gitignore) và mở phiếu qua `openEncounter`. Mỗi lần bấm tạo một phiếu mới; bệnh nhân chưa có hồ sơ mẫu thì trả 409. Bỏ hộp chọn lịch `AppointmentPicker` (không còn dùng).
  - Lịch sử khám: phân trang, tối đa 10 phiếu mỗi trang (Trước/Sau, "Trang x/y").
  - Dashboard: bỏ khối "Đang khám / chờ kết quả" (trùng ý nghĩa với "Còn lại"); "Còn lại" ghi thêm "Chưa khám · Đang khám · Chờ kết quả CLS". Khối cao cố định, nhiều ca thì cuộn trong khung (bỏ "Xem tất cả").
  - Màu: khai báo `emr-blue`/`emr-navy` trong `globals.css` (trước chưa có nên nền không sinh ra, nút "Lịch theo giờ" đang chọn bị chữ trắng trên nền trắng); danh sách Sáng nền vàng nhạt, Chiều nền xanh nhạt; nút Đóng của popup nền đỏ chữ trắng.
  - Popup: `<dialog>` modal dùng `h-fit` thay `h-auto` (h-auto bị kéo giãn hết chiều cao nên có khoảng trắng); popup co theo nội dung, quá cao thì cuộn.
- **Lý do:** góp ý của bác sĩ/người dùng trên ảnh chụp màn hình dashboard và màn bệnh nhân.
- **File:** `src/app/globals.css`, `src/client/clinic/{ClinicDialog,api}.tsx`, `src/client/dashboard/{DashboardScreen,EncounterGroup,AppointmentList}.tsx`, `src/client/patient/{CreateEncounter,EncounterHistory,PatientScreen}.tsx`, `src/client/patient/AppointmentPicker.tsx` (xóa), `src/server/clinic/{open,service}.ts`, `src/server/clinical/encounter-context{,.test}.ts`, `src/app/api/clinic/patients/[patientId]/encounters/route.ts`.
- **Kiểm tra:** `npm test` 268 đạt (thêm test ngữ cảnh khám mới); `npx tsc --noEmit` sạch; `npx eslint src` 0 lỗi. Trình duyệt: nút Lịch theo giờ đang chọn nền xanh đậm chữ trắng; popup lịch hẹn cao 489px thay vì 714px; bấm "Tạo mới phiếu khám" ở GIA-000123 mở `/?ho_so=<mã>` với phiếu trống. Chưa kiểm phân trang với hơn 10 phiếu và màn 375px.
- **Ảnh hưởng:** popup phiếu cũ có nút "Chi tiết phiếu khám": phiếu có trong kho phiếu thật thì mở ở eForm (`/?ho_so=<mã>`), bản lưu cũ giả (`data/clinic/history`) thì báo "chưa mở được trên eForm" (`EncounterHistoryDialog.tsx`; đã kiểm phiếu thật, nhánh bản lưu cũ chỉ kiểm qua API trả 404). Phiếu khám mới không xuất hiện trong lịch hẹn của dashboard (chỉ trong lịch sử bệnh nhân).

### Dashboard và màn bệnh nhân nối với phiếu khám thật: xem phiếu cũ, mở/tiếp tục phiếu
- **Loại:** Tính năng
- **Thay đổi:**
  - Dữ liệu dashboard (`data/clinic/`) đổi sang định danh của lớp clinical (cơ sở `facility-prototype`, bác sĩ `user_bs01`/`user_bs02`, PID `GIA-*`, mã lượt `LK-GIA-*`). Bộ 8 ca cũ (CS01, BS01, 000123...) chuyển sang `data/clinic-test/`, chỉ dùng cho test.
  - Dashboard và màn bệnh nhân đọc phiếu thật: `src/server/clinic/clinical-source.ts` đọc `data/clinical/encounters` cùng 4 phiếu cũ giả trong `data/clinic/history/` (tạo bằng `npm run tao-lich-su-clinic`; script này cũng thêm ngữ cảnh khám `LK-GIA-0458` cho bệnh nhân mới vào `data/eform/encounter-contexts.json`). Actor lấy từ `getDemoClinicalActor()`, bỏ `demoActor` cố định.
  - Chính sách mở phiếu một nơi (`appointment-context.ts`): `AppointmentItem` có `can_open` và `open_reason` (`eligible`, `cancelled`, `future`, `terminal`, `unknown`, `no_context`). `eligibleAppointments` của màn bệnh nhân lọc theo đúng chính sách này, thay điều kiện tạm trước đó.
  - Task 5: API `GET /api/clinic/patients/[id]/encounters/[encounterId]` trả phiếu cũ đã chiếu chỉ đọc (`projection.ts`, không có transcript, lần chạy AI hay nguồn dữ liệu); nút "Xem phiếu" mở popup toàn phiếu có Mới hơn/Cũ hơn, bỏ kết quả muộn.
  - Task 6: `POST /api/clinic/appointments/[id]/open` kiểm lại quyền và chính sách ở server rồi mở/dùng lại phiếu qua `openEncounter` của lớp clinical. Nút "Mở/Tiếp tục phiếu khám" (popup lịch hẹn) và "Tạo phiếu khám" (màn bệnh nhân, có hộp chọn khi nhiều lịch) chuyển sang `/?ho_so=<mã>`. Thêm `findEncounterContextIdentity` vào `encounter-context.ts` (tra định danh nhẹ, không dựng dữ liệu phiếu).
  - Test dùng `src/server/clinic/testing.ts` (kho fixture và actor CS01/BS01); `setClinicRepositoryForTest`, `setClinicActorForTest` cho test route.
- **Lý do:** hai bộ dữ liệu (dashboard và phiếu khám) không khớp định danh nên không mở được phiếu hay xem phiếu cũ; yêu cầu hoàn thiện plan Dashboard và bệnh nhân sau khi gộp nhánh.
- **File:** `data/clinic/*`, `data/clinic/history/*`, `data/clinic-test/*`, `data/eform/encounter-contexts.json`, `scripts/tao-lich-su-clinic.ts`, `package.json`, `src/server/clinic/{ports,clinical-source,demo-actor,repository,service,appointment-context,open,testing,errors}.ts`, `src/server/clinic/{open,service,repository}.test.ts`, `src/app/api/clinic/**`, `src/app/{dashboard,benh-nhan}/**` (đổi actor), `src/server/clinical/encounter-context{,.test}.ts`, `src/shared/clinic/{types,projection,projection.test,schedule.test,layout.test}.ts`, `src/client/clinic/{api,open-appointment,open-appointment.test,OpenAppointmentButton,AppointmentActions}`, `src/client/patient/{PatientScreen,EncounterHistory,EncounterHistoryDialog,HistoricalEncounterView,AppointmentPicker,CreateEncounter}.tsx`.
- **Kiểm tra:** `npm test` 267 đạt; `npx tsc --noEmit` sạch; `npx eslint src` 0 lỗi. Trình duyệt (`next dev -p 3101`, mở bằng `localhost`): dashboard 16/11 đúng số liệu và ca chờ từ hôm trước; bấm "Mở phiếu khám" ở LK-GIA-0457 tạo hồ sơ và eForm hiện đúng "Nguyễn Thị Giả · LK-GIA-0457"; màn bệnh nhân GIA-000123: "Xem phiếu" mở phiếu 20/10, Mới hơn/Cũ hơn đúng (2/3, 3/3), chỉ có request GET; không chọn lịch thì "Tạo phiếu khám" hiện hộp chọn 2 lịch. `npm run clinical:check` báo "Clinical types are stale" cả khi chưa có thay đổi này (đã thử bằng `git stash`), không do thay đổi này.
- **Ảnh hưởng:** dashboard mặc định hiện lịch cố định 15–17/11/2026 (không tự dịch theo ngày chạy; ngày khác dùng `?date=`). Hãy mở bằng `localhost`: với `next dev -H 127.0.0.1` truy cập bằng `127.0.0.1` thì lớp clinical trả "Nguồn yêu cầu không hợp lệ". Chưa kiểm: hai tab mở cùng lúc, rời eForm khi còn micro/chưa lưu, phiếu cũ đã duyệt (nhãn "Đã duyệt"), mốc 12:00 và khối trên 5 dòng.

## 2026-11-14

### Quy tắc phân chia công việc cho sub-agent
- **Loại:** Tài liệu, Quy trình
- **Thay đổi:** Thêm quy tắc bắt buộc số 7 vào `CLAUDE.md`: session chính chỉ điều phối; việc dễ giao Haiku 5.5 (effort Medium), việc khó hơn giao Sonnet 5.5 (effort Medium), Opus 5.5 chỉ để review code (một lần cho cả cụm task). Kèm các nguyên tắc rút ra từ lượt làm ưu tiên 2: brief tự đủ ngữ cảnh, kiểm lại kết quả sub-agent, chỉ chạy song song khi khác file và chỉ một agent chạy `next dev`, commit đúng đường dẫn, kiểm tra phụ thuộc nhánh trước khi giao việc.
- **Lý do:** Người dùng muốn dùng lại cách chia việc tiết kiệm token này cho các session sau.
- **File:** `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đọc lại mục "Quy tắc bắt buộc" trong `CLAUDE.md`. Không có thay đổi code.
- **Ảnh hưởng:** Chỉ là quy tắc làm việc cho Claude.

### Quy tắc nhánh: tạo từ `dev`, `main` chỉ nhận merge từ `dev`
- **Loại:** Tài liệu, Quy trình
- **Thay đổi:** Thêm quy tắc bắt buộc số 6 vào `CLAUDE.md`: `dev` là nhánh phát triển gốc, `main` là nhánh production. Mọi nhánh và worktree mới chỉ được tạo từ `dev`, PR của nhánh con trỏ vào `dev`, `main` chỉ nhận merge từ `dev`. Có bước kiểm tra gốc nhánh trước khi tạo (`git fetch origin`, `git merge-base HEAD origin/dev`) và yêu cầu dừng báo người dùng nếu phát hiện nhánh tạo từ `main`.
- **Lý do:** Nhánh `claude/priority-plan-2-c8793f` lỡ được tạo từ `main` nên xung đột với `dev` ở 3 file khi merge.
- **File:** `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đọc lại mục "Quy tắc bắt buộc" trong `CLAUDE.md`. Không có thay đổi code.
- **Ảnh hưởng:** Chỉ là quy tắc làm việc cho người và Claude. Nhánh priority-plan-2 hiện tại vẫn từ `main`; việc merge vào `dev` do người dùng xử lý.

### Chuyển trang và API thử nghiệm STT từ `app/` sang `src/app/`
- **Loại:** Dọn dẹp
- **Thay đổi:** di chuyển nguyên văn (nội dung không đổi) `app/stt/page.tsx` và `app/api/stt/{route.ts,session/route.ts,session/[id]/route.ts}` sang `src/app/...`.
- **Lý do:** dự án có thư mục `src/app`, Next.js chỉ dùng một thư mục `app`, nên các route đặt ở `app/` ở gốc không được phục vụ.
- **File:** `app/stt/page.tsx`, `app/api/stt/route.ts`, `app/api/stt/session/route.ts`, `app/api/stt/session/[id]/route.ts` (xóa) và các file cùng tên dưới `src/app/` (thêm).
- **Kiểm tra:** so sánh từng file cũ với file mới: giống nhau ngoài ký tự xuống dòng; `npm run build` liệt kê `/stt`, `/api/stt`, `/api/stt/session`, `/api/stt/session/[id]`.
- **Ảnh hưởng:** đường dẫn trang và API không đổi; chỉ thay vị trí file.

### Một lượt khám nhiều phiên ghi âm: giao diện và nối client (Task 5 giao diện, Task 6 client, Task 7)
- **Loại:** Tính năng, Sửa lỗi
- **Thay đổi:**
  - Trang chính mở qua `EncounterWorkspace`: thanh **Lượt khám** (`EncounterSwitcher`) chọn theo mã khám; chuyển lượt đi qua `recording-controller` (dừng micro, chữ cuối, chốt phiên, rồi mới tải lượt kia). Phiếu còn thay đổi chưa lưu thì chặn chuyển; còn nội dung ghi hoặc gõ chưa kiểm tra thì hiện hộp "Ở lại / Bỏ phần chưa duyệt và chuyển". Cảnh báo khi đóng tab lúc còn dữ liệu chưa lưu hoặc đang ghi âm.
  - `clinical-api.ts` viết lại: mở lượt, danh sách, phiên ghi âm (start/heartbeat/finalize/content/recover), privacy và extract kèm `binding`, đề xuất thay đổi, duyệt theo phạm vi, đổi trạng thái.
  - `TroLyAi.tsx`: mỗi lần kiểm tra riêng tư gắn đúng phiên (tạo phiên nhập tay nếu chưa có, tăng phiên bản nội dung khi chữ đổi), lưu bản chép lời đã kiểm tra vào phiên, rồi mới tạo bản nháp. Nút "Áp dụng bản nháp" và "Hoàn tác" được thay bằng `ClinicalChanges.tsx`: bác sĩ chấp nhận hoặc từ chối từng đề xuất cũ/mới, server áp dụng.
  - `RecordingSessions.tsx`: lịch sử phiên (giờ, trạng thái, bản chép lời đã kiểm tra, nút bỏ phần chưa duyệt), không có nút nghe lại.
  - `EformScreen.tsx`: duyệt theo từng phần (phiếu ban đầu, kết luận, tóm tắt, từng chỉ định) và ba nút **Chờ kết quả / Tiếp tục khám / Hoàn tất lượt khám**; chỉ in khi mọi phần đang đúng bản đã duyệt, nội dung in lấy từ hồ sơ đã lưu; bỏ "Phiếu mới".
  - `MicButton.tsx`, `DenoisedMic.tsx`: thêm `beforeStart`, `onCaptureReady`, `onCaptureFailed`, `onStopRequest`, `onText(text, binding)`; `stop()` trả đúng lần dừng đang chạy để bên ngoài chỉ chốt phiên sau khi chữ cuối đã giao.
  - Server: route `approve` dùng duyệt theo phạm vi; route mới `POST /api/clinical/transition`; lưu phiếu không còn đổi trạng thái sang hoặc khỏi Chờ KQ CLS và Hoàn thành khám (chỉ qua transition).
- **Lý do:** hoàn thành chặng 1 của plan ưu tiên 1; client cũ gọi privacy/extract không kèm binding nên bị server trả 400.
- **Sửa lỗi phát hiện khi chạy thật:** (1) route `recording` làm mất hành động của thao tác `content` vì trùng khóa `action`; nay gửi trong `content_action`. (2) Chọn mã ICD cho chẩn đoán do AI đề xuất (vai trò chưa rõ) để lại một dòng chẩn đoán thừa không mã, làm duyệt bị chặn; nay thay đúng dòng đang hiện (`src/shared/clinical/eform.ts`, có test). (3) Lưu phiếu có thể đặt thẳng "Hoàn thành khám" bỏ qua kiểm tra duyệt.
- **File:** `src/client/clinical-api.ts`, `src/client/api.ts`, `src/client/eform/{EncounterWorkspace,EncounterSwitcher,RecordingSessions,ClinicalChanges,EformScreen,TroLyAi,BanIn}.tsx`, `src/client/eform/encounter-bridge.ts`, `src/client/chung/{MicButton,DenoisedMic}.tsx`, `src/app/page.tsx`, `src/app/api/clinical/{approve,recording,transition}/route.ts`, `src/server/clinical/service.ts`, `src/shared/clinical/eform.ts`, test `service.test.ts` và `eform.test.ts`, `README.md`, `docs/superpowers/plans/PRIORITIES.md`, plan ưu tiên 1
- **Kiểm tra:** 195 test đạt; `npx tsc --noEmit` và `npx eslint src` sạch; `npm run clinical:check` đạt; `npm run build` đạt; `npm run eval -- --rule-only` chạy bình thường (bộ tách quy tắc không đổi). Trình duyệt (dữ liệu giả, AI mock): mở A, nhập tay, kiểm tra riêng tư, bản nháp, chấp nhận đề xuất, Chờ kết quả, chuyển B, quay lại A còn nguyên phiên và tóm tắt, Tiếp tục khám; duyệt riêng phiếu ban đầu và tóm tắt, sửa kết luận thì bản duyệt ban đầu vẫn còn; tải lại trang mở đúng hồ sơ. **Chưa kiểm tra:** thu âm bằng micro thật (máy chưa có model Zipformer), Ctrl+P xem bản in, hai tab cùng bấm ghi âm, kịch bản A1/B1/A2 qua micro.
- **Ảnh hưởng:** trang `/` luôn mở một lượt theo mã khám (không còn "Phiếu mới", `?bs=` bị bỏ). Trang `/trinh-dien` không gắn lượt khám nên Trợ lý lâm sàng chỉ hiện thông báo. Dữ liệu local cũ có hai hồ sơ cùng mã khám sẽ báo "Có nhiều hồ sơ cho cùng mã khám"; bản trùng được chuyển sang `data/clinical/_trung-ma-kham/` (git bỏ qua). Chưa có API đọc chữ của bản chép lời đã duyệt nên lịch sử phiên chỉ hiện thông tin bản.
- **Còn lại của plan:** Task 8 chưa nghiệm thu nên plan vẫn ở `pending`.

### Một lượt khám nhiều phiên ghi âm: nền server (Task 1–6), chưa có giao diện

Plan: `docs/superpowers/plans/pending/2026-11-14-interrupted-encounters.md`. Phần server và logic dùng chung đã chạy và có test; giao diện chuyển lượt (Task 7) và nghiệm thu (Task 8) chưa làm, nên plan vẫn ở `pending`.

- **Đã có từ các lượt trước (nay được ghi lại):** schema 1.2 và migrator (`config/clinical/*.schema.json`, `migrations.ts`), mở đúng mã khám (`encounter-context.ts`, `repository.ts`, `data/eform/encounter-contexts.json`), duyệt theo phạm vi và snapshot (`approvals.ts`, `approval-service.ts`), phiên ghi âm và lease giữa các tab (`recording-service.ts`), privacy/extraction gắn theo `{encounter, session, content_revision}` (`bound-privacy.ts`, `reviewed-transcripts.ts`, route `privacy`/`extract`), `recording-controller.ts`.
- **Sửa 4 test đang hỏng:**
  - `approvals.ts`: `approvalScopeForPath` giờ chỉ nhận trường lâm sàng có trong danh sách (sinh hiệu, thông tin khác, trường lồng của dị ứng/hẹn tái khám, nội dung chỉ định/nhóm); `measured_at`, `source_system`, `review`, `created_at` không còn thuộc phạm vi duyệt nào.
  - `recording-service.ts`: không cho bắt đầu ghi âm khi lượt đang `cho_kq_cls` (phải tiếp tục khám trước); finalize lặp lại sau khi đã dừng nhưng lỗi trước lúc đóng lease sẽ đóng lease, nhờ vậy thiết bị được giải phóng. Sửa khóa `action` bị ghi đè trong digest của yêu cầu nội dung.
  - `privacy.test.ts`: test route cập nhật theo luồng bắt buộc `binding`; yêu cầu không có binding phải trả 400 và không cấp ticket.
  - `recording-service.test.ts`: bỏ `require()` để lint đạt.
- **Task 5, đề xuất thay đổi dùng chung:** `src/shared/clinical/changes.ts` thêm `proposeClinicalChanges` và `applyClinicalChanges` (id ổn định theo run, chỉ áp phần được chấp nhận, lệch giá trị gốc thì báo `StaleChangeError`, retry không lặp, ghi `change_decisions`, `ai_runs` và nguồn). `service.ts` thêm `proposeClinicalChangesForActor`/`decideClinicalChangesForActor`: server tự dựng bộ đề xuất từ run đã lưu, run chỉ mở trong đúng lượt khám đã gắn (403 nếu khác). Bỏ `ai_run_ids` khỏi lưu hồ sơ nên không còn đường tự áp AI vượt qua bước duyệt.
- **Route mới:** `POST /api/clinical/changes` (propose/decide), `POST /api/clinical/recording` (start/heartbeat/finalize/content/recover), `POST /api/clinical/open` (mở hoặc dùng lại lượt theo mã khám), `GET /api/clinical/encounters` (danh sách đang khám và mã khám có thể mở).
- **Kiểm tra:** `npx tsx --conditions=react-server --test "src/**/*.test.ts"` 172 đạt, 0 lỗi; `npx tsc --noEmit` và `npx eslint src` sạch; `npm run clinical:check` đạt. Chưa chạy `npm run build`, chưa kiểm tra trong trình duyệt.
- **Chưa làm (để phiên sau; danh sách có checkbox ở cuối file plan):** `src/client/clinical-api.ts` và `TroLyAi.tsx` vẫn gọi privacy/extract không kèm binding nên sẽ bị server từ chối (400); chưa có `EncounterSwitcher`, `RecordingSessions`, `ClinicalChanges`; `EformScreen.tsx`, `BanIn.tsx` và hai microphone chưa nối với `recording-controller`; Task 8 (kịch bản nghiệm thu, build, tài liệu người dùng) chưa làm.

## 2026-11-13

### Kiểm chứng DeepFilterNet3 CPU local

- Hoàn thiện kiểm chứng lựa chọn mặc định tắt, audio sạch cho VAD/STT, audio gốc cho diarization, session cố định mode và retry/rollback.
- Bổ sung test DeepFilterNet kết hợp Community-1 và file dài qua ranh giới khối; 94 Python tests, 129 TypeScript tests, typecheck và lint đạt.
- Xác nhận executable v0.5.6 đúng SHA-256, smoke native thật và benchmark 5/25/51 giây; chưa có WER. Chi tiết cài đặt, giới hạn và kết quả tại `docs/STT.md`.
- Bỏ qua runtime/model DeepFilterNet trong Git và loại thư mục runtime/cache sinh tự động khỏi ESLint.

### Community-1 local tùy chọn cho file

- Thêm worker CPU riêng và lựa chọn hậu xử lý file sau Zipformer; giữ overlap/timeline, không bật cho phiên micro.
- Tách venv PyTorch khỏi STT, guard RAM và một tác vụ; runtime inference offline/telemetry tắt.
- Setup/download script, UI báo chưa sẵn sàng, tests API/adapter giả lập. Weights và benchmark thật chờ người dùng cấp quyền HF; Community-1 không phải khử nhiễu.

### Ổn định gán người nói với model hiện có

- Cập nhật hồ sơ bằng quan sát khớp mạnh; từ chối mơ hồ và không gộp hai cụm đang nói đồng thời vào cùng ID.
- Lấy phần sạch trong lượt chồng giọng một phần; bỏ gán theo giọng gần450ms, giữ chưa rõ tại ranh giới và khoảng trống.
- Chống cộng trùng vùng giọng và từ chối embedding bị tràn norm;60 Python tests đạt.
- Kiểm thử model thật5+3 giây, A/B/A và rollback hồ sơ khi diarization lỗi. Chưa công bố mức tăng accuracy trên bản ghi Tim mạch chưa có nhãn.

### Phân loại dữ liệu và chặn AI bên ngoài

- Bệnh án đã masking vẫn cấp 2: chỉ nội bộ và bắt buộc đồng ý; cấp 3 hợp đồng/prompt mật bị chặn khỏi AI. Không tự nâng mức sau khi lọc.
- Chặn cloud LLM và Web Speech cho luồng bệnh án; giữ mock/rules và Zipformer cục bộ.
- Bổ sung masking tuổi/giới tính/ngày giờ, cảnh báo bệnh hiếm/tái định danh; giữ tên thuốc, số đo, liều và khoảng thời gian lâm sàng.
- Quy tắc và giới hạn: docs/DATA-USE-POLICY.md.

### Silero VAD cho micro và file

- Giữ Zipformer; thêm Silero ONNX cục bộ, không thêm PyTorch. Chỉ nhận dạng khoảng lời nói và giữ timestamp bản gốc; không dùng RMS làm fallback.
- Setup tải model kiểm SHA-256; health/start/UI kiểm tra VAD và báo thiếu/lỗi model rõ ràng.
- Kiểm thử chọn đoạn, offset timestamp và bỏ qua khi không có lời nói; chạy smoke model thật với mẫu lời nói/khoảng lặng/nhiễu tổng hợp. Chưa kết luận mức cải thiện độ chính xác trên hội thoại lâm sàng.


### Bỏ giới hạn tải file audio

- Gỡ chặn 30 giây/20 MB ở giao diện, chuẩn hóa audio, proxy và backend STT; giữ kiểm tra định dạng và dữ liệu âm thanh hợp lệ.
- Gỡ timeout cố định khoảng 2 phút cho nhận dạng file tải lên; vẫn cho phép hủy từ giao diện.
- Thêm kiểm thử nhận file 31 giây và WAV 660 giây (>20 MB), cùng kiểm thử proxy chuyển đủ dữ liệu.

### Sửa các phát hiện review dashboard và hồ sơ bệnh nhân
- **Loại:** Sửa lỗi, Bảo mật, Giao diện
- **Thay đổi:**
  - Trang `/benh-nhan/[patientId]` gọi `assertLocalDemoPage` (403 vào error boundary, không `notFound`). `page-guard.ts` chuyển cả header Host sang guard; thêm `page-guard.test.ts`.
  - `guard.ts` bỏ phụ thuộc `request.url` (Next dựng từ hostname cấu hình của server): chỉ dựa Host/Origin/Sec-Fetch-Site, thiếu Host là 403. Comment nêu đúng phạm vi: chặn cross-origin và DNS rebinding từ trình duyệt, không chặn client tự đặt Host; nên chạy `next dev -H 127.0.0.1` (ghi vào README). `routes.test.ts` dùng URL local + header khác.
  - `service.ts` `buildItem`: Encounter gắn đúng mã lịch nhưng lệch bệnh nhân/cơ sở/bác sĩ là lỗi dữ liệu 500, không gắn nhầm. `has_prior_encounter` chỉ tính phiếu cùng bệnh nhân có `encounter_at` trước giờ hẹn của lịch đang xem (phiếu 13:30 không còn là lượt trước của lịch 08:00).
  - `EncounterHistory`: nhãn "Mã lượt" hiện `appointment_id`, ẩn khi null.
  - `selectDayAppointments`: ca `unknown` có Encounter của ngày trước được mang sang `carriedOpenItems`.
  - `AppointmentDialog`: đóng thì tăng bộ đếm, mở lại cùng lịch không hiện kết quả/lỗi cũ.
  - `clinic/api.ts`: 200 mà body không phải JSON thì ném lỗi tiếng Việt thay vì `{}`.
  - `DashboardScreen`: ô chọn ngày chỉ điều hướng khi ngày đầy đủ, có thật, năm >= 1900 (`isCompleteClinicDate` mới ở `format.ts`).
  - Cỡ chữ: tiêu đề trang và tiêu đề khối 18px. `layoutDay` vẽ tối thiểu 20 phút (`MIN_BLOCK_MINUTES`) nên ca ngắn xếp cạnh khối kế tiếp thay vì bị đè.
  - Để lại, chờ ưu tiên 1: cờ `not_examined` (#5) và `eligibleAppointments` tạm (#10).
- **Lý do:** Phát hiện của review (Opus) trên nhánh priority-plan-2.
- **File:** `src/app/benh-nhan/[patientId]/page.tsx`, `src/app/api/clinic/routes.test.ts`, `src/server/clinic/{guard,page-guard,page-guard.test,service,service.test}.ts`, `src/shared/clinic/{schedule,layout,format}.ts` và test tương ứng, `src/client/{clinic/AppointmentDialog,clinic/api,dashboard/DashboardScreen,dashboard/EncounterGroup,patient/EncounterHistory}.tsx`, `README.md`, `docs/cau-truc-du-an.md`, `docs/testing/2026-11-14-dashboard-patient.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** bộ test clinic 60/60 PASS (trước đó 53 + test mới); `npm run lint` và `npx tsc --noEmit` exit 0; kiểm trình duyệt ở 1440/390px xem docs/testing.
- **Ảnh hưởng:** Request thiếu header Host nay bị 403 (trình duyệt luôn gửi Host).

### Kiểm tra trình duyệt màn bệnh nhân và đối chiếu dashboard (kiểm thử)
- **Loại:** Tài liệu
- **Thay đổi:**
  - Chạy `next dev -p 3101` và kiểm bằng Playwright (Chromium) trên dữ liệu giả: `/benh-nhan/000123` (có lịch, BHYT có tham gia, bảo lãnh không tham gia), `/benh-nhan/000124` (bảo lãnh hết hạn, tuổi tính bằng tháng), `/benh-nhan/000125` (thiếu thông tin, lịch sử rỗng), `/benh-nhan/999999` và `appointment_id=XXX` (không tìm thấy), `return_to` ra ngoài (link về `/dashboard`).
  - Đối chiếu dashboard: popup LK-000001 → "Xem thông tin bệnh nhân" → "Về dashboard" giữ ngày và view; "Ngày trước" sang 13/11 giữ view; "Làm mới" gọi lại API; chuyển "Lịch theo giờ".
  - Ghi kết quả PASS/FAIL/chưa kiểm vào `docs/testing/2026-11-14-dashboard-patient.md`: mục "Màn bệnh nhân", mục "Dashboard: đối chiếu bổ sung" và mục "Chưa kiểm" tổng hợp. Sửa câu phạm vi và hai dòng cũ (3.15, 4.10) cho khớp.
  - Không sửa code ứng dụng.
- **Lý do:** Nghiệm thu trình duyệt cho màn bệnh nhân (Task 5) và các mục dashboard còn thiếu, theo yêu cầu kiểm tra thật trước khi báo xong.
- **File:** `docs/testing/2026-11-14-dashboard-patient.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đã chạy thật trên `http://localhost:3101`: 1440, 1024 và 390px không tràn ngang trên trang bệnh nhân; Network trang bệnh nhân chỉ có GET. Các mục không kiểm được (fixture không có ca 11:59/12:00 và khối quá 5 dòng; slow fetch; click nền bằng chuột thật) ghi rõ trong tài liệu, không ghi PASS.
- **Ảnh hưởng:** Không đổi code. Bug phát hiện trong lượt này: không có.

### Gộp badge trạng thái và định dạng ngày của màn bệnh nhân vào bản dùng chung (refactor)
- **Loại:** Dọn dẹp
- **Thay đổi:**
  - Xóa `src/client/patient/StatusBadge.tsx` (kèm TODO "hợp nhất"). `EncounterHistory` dùng `StatusBadge` của `src/client/clinic/status.tsx`, truyền `{ status, encounter_id: null }` vì lịch sử không có mã lượt: nhãn "Hủy khám" giữ như cũ, không đổi thành "Không khám".
  - Xóa `src/client/patient/format.ts`. Chuyển các hàm còn thiếu sang `src/shared/clinic/format.ts`: `NO_INFO`, `formatOptionalClinicDate` (thay `formatDate`: null là "Chưa có thông tin", chuỗi lạ giữ nguyên), `formatClinicDateTimeLenient` (thay `formatDateTime`: timestamp lạ trả nguyên chuỗi thay vì ném lỗi), `formatGender`.
  - `src/shared/clinic/schedule.ts` dùng chung `NO_INFO` từ `format.ts` thay hằng số trùng.
  - `PatientScreen`, `InsuranceSummary`, `EncounterHistory` import từ shared.
  - Thêm test cho ba hàm mới trong `src/shared/clinic/format.test.ts`.
- **Lý do:** Hai cặp trùng chức năng (badge trạng thái và định dạng ngày) đã có TODO hợp nhất từ Task 5.
- **File:** `src/client/patient/{StatusBadge.tsx,format.ts}` (xóa), `src/client/patient/{EncounterHistory,InsuranceSummary,PatientScreen}.tsx`, `src/shared/clinic/{format,format.test,schedule}.ts`, `docs/CHANGELOG.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/*.test.ts src/server/clinic/*.test.ts src/app/api/clinic/routes.test.ts src/client/patient/*.test.ts`: baseline 50/50 PASS, sau refactor 53/53 PASS (3 test mới). `npx eslint .` exit 0. `npx tsc --noEmit` exit 0, không có lỗi (không còn 3 lỗi có sẵn như các mục trước ghi). Chưa kiểm tra trên trình duyệt ở bước này.
- **Ảnh hưởng:** Badge trạng thái ở màn bệnh nhân nhỏ hơn về đệm và cỡ chữ (theo bản dashboard: `px-1.5 text-[11px] rounded-sm`), nhãn và màu không đổi. Hành vi ngày/giờ với dữ liệu hợp lệ không đổi.

### Dashboard lịch khám: popup lịch hẹn và đường vào hồ sơ bệnh nhân (Task 4)
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - `src/client/clinic/ClinicDialog.tsx`: hộp thoại modal dùng `<dialog>` gốc (focus trap, Escape, aria-modal do trình duyệt lo), thêm khôi phục focus, khóa cuộn nền, cuộn nội dung riêng, chỉ đóng khi bấm đúng nền, gần toàn màn hình ở màn hẹp.
  - `AppointmentDialog.tsx`: gọi `getAppointment` (no-store, AbortController), có loading, lỗi và Thử lại; kết quả gắn khóa `id#lần thử` nên kết quả muộn của lịch khác không hiện. Hiện mã lịch/lượt, UUID hồ sơ nếu có, PID, họ tên, tuổi theo ngày hẹn, ngày sinh, giờ hẹn, bác sĩ, trạng thái, nội dung đầy đủ.
  - `AppointmentActions.tsx`: link "Xem thông tin bệnh nhân" (có lượt trước) hoặc "Thông tin bệnh nhân" kèm "Chưa có lịch sử khám"; href `/benh-nhan/<PID>?appointment_id=&return_to=` qua `patientHref` (`safeReturnTo` chỉ nhận đường nội bộ). Nút Tạo/Mở phiếu khám tắt, chú thích "Chờ nền ca khám nhiều phiên (ưu tiên 1)"; không điều hướng ca mẫu, không sinh Encounter hay UUID.
  - `DashboardScreen` gắn dialog, thay dòng "Đã chọn lịch" tạm của Task 3.
- **Lý do:** Task 4 plan Dashboard và Bệnh nhân. `safeReturnTo` và test đã có từ commit Task 3 (`src/shared/clinic/links.ts`).
- **File:** `src/client/clinic/{ClinicDialog,AppointmentDialog,AppointmentActions}.tsx`, `src/client/dashboard/DashboardScreen.tsx`, `docs/testing/2026-11-14-dashboard-patient.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/*.test.ts src/server/clinic/*.test.ts src/app/api/clinic/routes.test.ts` 45/45 PASS, `npm run lint` sạch, `npx tsc --noEmit` chỉ 3 lỗi có sẵn. Trình duyệt thật: mở bằng click/Enter, Tab giữ trong popup, Escape trả focus và mở khóa cuộn, lỗi/Thử lại, 390px; mục chưa kiểm ghi ở checklist (click nền thật, slow fetch, Shift+Tab).
- **Ảnh hưởng:** Chưa có nút mở phiếu thật; chờ nền ca khám nhiều phiên của ưu tiên 1.

### Dashboard lịch khám: trang /dashboard với danh sách và lịch theo giờ (Task 3)
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Trang `src/app/dashboard/` (`page.tsx`, `loading.tsx`, `error.tsx`): server page chờ `searchParams` (`date`, `view`), mặc định hôm nay giờ Việt Nam và `list`, ngày sai quay về hôm nay. Gọi thẳng `loadDashboard` với actor demo; chạy guard local qua `src/server/clinic/page-guard.ts` (dựng Request từ Host/Origin/Sec-Fetch-Site rồi dùng `assertLocalDemoRequest`).
  - `src/client/dashboard/`: `DashboardScreen` (tiêu đề, ngày, nút Ngày trước/Hôm nay/Ngày sau/chọn ngày/Làm mới, tổng N, ba khối, dòng hủy/kết thúc khác/chưa xác định, khối ca ngày trước, chuyển Danh sách / Lịch theo giờ lưu trong URL), `EncounterGroup` (tối đa 5 dòng, "Xem tất cả", khối rỗng) và `OtherEncounters`, `AppointmentList` (Sáng/Chiều), `DayCalendar` (trục 07 đến 18 giờ, mở rộng khi có ca ngoài giờ, khối 30 phút khi thiếu giờ kết thúc, lịch trùng giờ xếp cạnh nhau, nhãn "Bây giờ" chỉ hôm nay), `StatusLegend`.
  - `src/client/clinic/status.tsx` (nhãn và màu 9 trạng thái, "Không khám" khi Encounter `khong_kham`), `AppointmentRow.tsx`.
  - `src/shared/clinic/`: `format.ts` (giờ/ngày VN, cộng ngày, thứ), `layout.ts` (`groupAppointments`, `splitByPeriod`, `layoutDay`), `links.ts` (`safeReturnTo`, `dashboardHref`, `patientHref`) cùng test.
  - `Header.tsx`: thêm link "Lịch khám"; đường dẫn `/benh-nhan/*` cũng sáng mục này. Không đổi `/`.
  - Làm mới: mỗi ngày là một thể hiện riêng (`key` theo ngày), request bị hủy khi rời trang hoặc khi bấm lại, có số thứ tự nên response cũ không ghi đè; lỗi làm mới giữ số liệu cũ kèm cảnh báo, không đưa về 0.
- **Lý do:** Task 3 plan Dashboard và Bệnh nhân. Popup lịch hẹn (Task 4) làm ở mục sau; tạm thời bấm dòng chỉ hiện dòng "Đã chọn lịch".
- **File:** `src/app/dashboard/*`, `src/client/dashboard/*`, `src/client/clinic/{status.tsx,AppointmentRow.tsx}`, `src/client/chung/Header.tsx`, `src/server/clinic/page-guard.ts`, `src/shared/clinic/{format,layout,links}.ts` và test, `docs/testing/2026-11-14-dashboard-patient.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** test mới `format/links/layout` trước khi có module FAIL, sau đó PASS (toàn bộ `src/shared/clinic/*.test.ts` 19+ test). `npm run lint` sạch ở file mới, `npx tsc --noEmit` chỉ còn 3 lỗi có sẵn. Trình duyệt thật ở 1440/1024/390px: số 8/2/4/2/1/1 đúng, không tràn ngang; kết quả chi tiết và mục chưa kiểm ở `docs/testing/2026-11-14-dashboard-patient.md`.
- **Ảnh hưởng:** Theme `ef_*` chưa có trên nhánh này, dùng token hiện có (`emr-navy`, `emr-blue`, `xem`, `accent`, `primary`, `ink`, `muted`, đỏ `#c9302c` như eform). Chưa kiểm "Xem tất cả" với dữ liệu thật (không khối nào quá 5 dòng).

### Hồ sơ bệnh nhân: màn /benh-nhan/[patientId], danh sách lịch sử, bộ điều phối tải phiếu cũ (Task 5, phần độc lập)
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Trang `src/app/benh-nhan/[patientId]/` (`page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`): server page chờ `params` và `searchParams` (`appointment_id`, `return_to`), gọi thẳng `loadPatientPage` với actor demo (không fetch API nội bộ). Service trả 404 (PID giả, lịch không thuộc bác sĩ/bệnh nhân) thì ra trang not-found; lỗi khác vào error boundary (nút Thử lại, không dữ liệu giả). `return_to` đi qua `safeReturnTo` (`src/shared/clinic/links.ts`).
  - `src/client/patient/`: `PatientScreen` (link "Về dashboard", họ tên, PID giữ số 0 đầu, ngày sinh, tuổi theo ngày hẹn hoặc hôm nay, giới tính), `InsuranceSummary` (hai khối BHYT và Bảo hiểm bảo lãnh độc lập; "Không tham gia" chỉ khi known và enrolled=false, "Chưa có thông tin" khi known=false hoặc enrolled=null, nhãn "Hết hạn" khi hạn trước ngày đối chiếu), `EncounterHistory` (giảm dần như server đã sắp; tóm tắt, ngày giờ, mã lượt, bác sĩ, badge; rỗng ghi "Chưa có lịch sử khám"), `StatusBadge`, `format.ts`.
  - Nút **Tạo phiếu khám** và **Xem phiếu** đều tắt, có chú thích: "Chưa có lịch khám để tạo phiếu" hoặc "Chờ nền ca khám nhiều phiên (ưu tiên 1)"; "Chờ dữ liệu phiếu từ ưu tiên 1". Không điều hướng, không sinh ID.
  - `history-controller.ts`: `createHistoryLoader<T extends {id}>(fetchDetail)`. Load mới hủy load trước; kết quả và lỗi của load cũ trả null; lỗi của load hiện tại ném lên; `dispose` hủy và chặn mọi cập nhật. Thuần TS, không React.
- **Lý do:** Phần độc lập của Task 5 plan Dashboard & Bệnh nhân. Popup toàn phiếu, endpoint chi tiết phiếu và `projectHistoricalEncounter` chưa làm vì cần dữ liệu phiếu của ưu tiên 1.
- **File:** `src/app/benh-nhan/[patientId]/*`, `src/client/patient/*`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/client/patient/history-controller.test.ts`: trước khi có loader FAIL (không import được module), sau đó 5/5 PASS (A chậm B nhanh chỉ B; lỗi A sau B không hiện; lỗi B retry được; dispose). Bộ test clinic hiện có vẫn xanh. `npm run lint` sạch file mới; `npx tsc --noEmit` chỉ còn 3 lỗi có sẵn. Chưa chạy `next dev` và chưa xem trong trình duyệt.
- **Ảnh hưởng:** Chưa có theme `ef_*` trên nhánh này nên dùng token hiện có (`primary`, `muted`, `xem`, `accent`, `navy`, đỏ Tailwind cho "hủy"). Badge trạng thái là bản riêng trong `src/client/patient/`, hợp nhất với badge dashboard khi có. Ngày đối chiếu tuổi/hạn bảo hiểm lấy từ lịch đang chọn nếu nằm trong lịch đủ điều kiện, không thì hôm nay.

### Dashboard lịch khám: repository, service và API đọc, độc lập với ưu tiên 1 (Task 2)
- **Loại:** Tính năng, Dữ liệu
- **Thay đổi:**
  - Thêm `src/server/clinic/`: `ports.ts` (cổng `ClinicActor`, `EncounterRef`, `EncounterSource`), `fixture-source.ts` (adapter DEMO sinh EncounterRef giả từ `encounter_status` trong fixture lịch và từ `data/clinic/encounters-demo.json`), `guard.ts` (`assertLocalDemoRequest` tối thiểu: chỉ localhost/127.0.0.1/[::1], từ chối cross-origin với 403), `demo-actor.ts` (actor demo BS01 ở CS01, lấy phía server), `repository.ts` (chỉ đọc, validate Zod, lỗi store ném 500 chứ không trả rỗng), `service.ts` (`loadDashboard`, `loadAppointment`, `loadPatientPage`), `errors.ts`, `http.ts` (bọc GET: guard, no-store, dịch lỗi 400/403/404/500).
  - Ba route GET: `/api/clinic/dashboard?date=`, `/api/clinic/appointments/[appointmentId]`, `/api/clinic/patients/[patientId]?appointment_id=`. Ngày sai 400, lịch/bệnh nhân ngoài bác sĩ-cơ sở hoặc PID giả 404 như nhau, lỗi store 500 không kèm totals.
  - Lịch sử khám = mọi phiếu đã lưu cùng cơ sở (gồm bác sĩ khác), loại lượt đang chọn, sắp mới nhất trước. `has_prior_encounter` không tính phiếu của chính lượt đó. Tóm tắt dòng lịch sử lấy `summary` có sẵn, không có thì dùng lý do khám của lịch, không có nữa thì "Chưa có tóm tắt" (không bịa).
  - `src/shared/clinic/history.ts`: `sortHistory` (giảm dần theo thời điểm, trùng thì ID giảm dần) và `historyNavigation` (`previousId` là lượt mới hơn, `nextId` là lượt cũ hơn). `types.ts` thêm `HistorySummary`, `PatientPageData`.
  - `src/client/clinic/api.ts`: `getDashboard`, `getAppointment`, `getPatient` (`cache: "no-store"`, AbortSignal).
  - Dữ liệu giả mới: `data/clinic/directory-demo.json` (tên cơ sở, bác sĩ), `data/clinic/encounters-demo.json` (4 lượt khám cũ giả).
- **Lý do:** Phần đọc của dashboard và hồ sơ bệnh nhân cần làm trước khi lớp clinical của ưu tiên 1 có trên nhánh này; làm sau một cổng để gộp sau chỉ cần thay adapter.
- **File:** `src/server/clinic/*`, `src/app/api/clinic/**`, `src/client/clinic/api.ts`, `src/shared/clinic/{history,types}.ts`, `data/clinic/{directory-demo,encounters-demo}.json`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/*.test.ts src/server/clinic/*.test.ts src/app/api/clinic/routes.test.ts` (34 test đạt), `npm run lint` sạch, `npx tsc --noEmit` chỉ còn 3 lỗi có sẵn (`RouteContext`, `LayoutProps`). Chưa chạy qua `npm run dev`.
- **Ảnh hưởng:** Chưa có giao diện dùng các API này. Để lại cho ưu tiên 1: thay `ClinicActor`/`demo-actor.ts`, `assertLocalDemoRequest` và `EncounterSource` demo bằng bản clinical thật; `appointment-context.ts`, endpoint chi tiết phiếu cũ và `eligibleAppointments` theo policy mở phiếu (hiện chỉ tạm: chưa hủy/kết thúc và không ở tương lai).

### Dashboard lịch khám: contracts và phép tính (Task 1)
- **Loại:** Tính năng, Dữ liệu
- **Thay đổi:**
  - Thêm `src/shared/clinic/types.ts` (DTO lịch khám, bệnh nhân, bảo hiểm, tổng số, `DashboardData`), `schema.ts` (Zod v4: ngày lịch thực, từ chối `2026-02-30`; timestamp bắt buộc có offset; status lạ bị từ chối; `scheduling_status` chỉ `scheduled`|`cancelled`), `schedule.ts` (hàm thuần: `toClinicDate`, `clinicPeriod`, `displayStatus`, `summarizeAppointments`, `sortAppointments`, `ageAt`, `selectDayAppointments`).
  - Ngày/giờ tính theo UTC+7 cố định bằng số học (không dùng Intl). Sáng [00:00,12:00), Chiều [12:00,24:00). `remaining` = chưa khám + đang khám + chờ CLS, `unfinished` là tập con của `remaining`; total = completed + remaining + cancelled + other + unknown. Lịch hủy nhưng Encounter đã đang khám/chờ CLS/hoàn thành là xung đột nên thành `unknown`. Ngày sinh tương lai trả "Chưa có thông tin" (không tuổi âm).
  - Fixture giả `data/clinic/patients.json`, `data/clinic/appointments.json` (2 bác sĩ, 2 cơ sở, 8 ca chuẩn ngày 2026-11-14, ca hôm qua chờ CLS, trùng giờ, thiếu ngày sinh, cả BHYT và bảo lãnh). Nhánh này chưa có Encounter nên mỗi dòng lịch có thêm trường fixture `encounter_status` (tên enum Encounter: `dang_kham`, `cho_kq_cls`, ...; `null` = chưa có Encounter). Ngày trong fixture cố định, chưa sinh theo đồng hồ.
  - `schedule.test.ts` có `eslint-disable no-restricted-imports` vì `src/shared` cấm `node:*` nhưng test cần `node:test`.
- **Lý do:** Task 1 của plan "Dashboard lịch khám và thông tin bệnh nhân"; cần nền tính số liệu đúng trước khi dựng giao diện.
- **File:** `src/shared/clinic/types.ts`, `src/shared/clinic/schema.ts`, `src/shared/clinic/schedule.ts`, `src/shared/clinic/schedule.test.ts`, `data/clinic/patients.json`, `data/clinic/appointments.json`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/schedule.test.ts`: trước khi có `schedule.ts` FAIL (1 fail, không import được module); sau khi implement 6/6 PASS. `npm run lint` sạch. `npx tsc --noEmit`: chỉ còn 3 lỗi có sẵn (`RouteContext`, `LayoutProps` ở `src/app/api/asr/[id]/route.ts`, `src/app/layout.tsx`), không do file mới.
- **Ảnh hưởng:** Chỉ thêm file mới, chưa nối vào giao diện; không đổi eval.
## 2026-11-12

### Luồng clinical task 2–5: JSON, riêng tư, AI, lưu và duyệt

- **Phạm vi:** Phiếu khám ngoại trú TMH và chỉ định dịch vụ. Kê đơn do bác sĩ thực hiện riêng; tạm hoãn cải tiến phân tách giọng và chờ ghi âm phòng khám.
- **Dữ liệu:** `config/clinical` là nguồn schema 1.1.0, có TypeScript sinh tự động, validator, adapter hai màn và repository JSON ghi nguyên tử/kiểm revision/lưu lịch sử. Clinical và private data được gitignore.
- **Riêng tư/AI:** Lọc text cục bộ và server, ticket chờ kiểm tra thủ công trước model; trích xuất có schema, quote/role/số/bên/phủ định và chống Rx lọt vào text tự do. Lưu artifact đã lọc, retry có giới hạn và không gọi lại khi provider lỗi. Endpoint raw `/api/extract` trả 410.
- **Giao diện:** Xem transcript và nháp, áp dụng có kiểm soát, giữ sửa tay; Lưu nháp và Lưu phiếu/chỉ định dùng cùng API, tải lại theo URL hồ sơ. Có giai đoạn chẩn đoán kèm, bên/vị trí dịch vụ và thông tin chung chỉ định. Duyệt phía server, chỉ in bản đã duyệt; sửa tiếp làm mất hiệu lực duyệt.
- **Tích hợp:** Gom root `app` STT vào `src/app` để tránh Next.js bỏ qua eForm. Giữ engine STT hiện có.
- **Xác minh:** 113 test đạt; typecheck, lint, schema check và production build đạt. Chrome headless kiểm luồng privacy → mock → áp dụng → lưu/tải lại → duyệt/in và chặn in sau sửa, không lỗi JavaScript. Chưa gọi model trả phí hay kiểm chất lượng trên ghi âm thật.
- **Giới hạn:** Dữ liệu giả, chưa có auth/HIS thật; bộ lọc quy tắc cần kiểm tra thủ công, chưa phải khử định danh tự động đã kiểm định. Hướng dẫn: `docs/CLINICAL-WORKFLOW.md`.

### Phiếu mẫu theo bệnh (9/9): sửa lỗi sau review
- **Loại:** Sửa lỗi
- **Thay đổi:** Sửa 6 lỗi do agent review toàn bộ thay đổi chỉ ra.
  - **Nghiêm trọng:** chỗ `[số]` chưa điền bị thay bằng chữ "số" khi chi tiết có từ bỏ dấu thành "so" ("sổ mũi"). Ô đó mất ngoặc và hiện tím như AI chắc chắn. Giờ chỉ chỗ có lựa chọn `a|b` mới được chọn.
  - "sốt 2 ngày" không còn thành "Sốt 2 độ": nhiệt độ phải là số sau "sốt" không đứng trước đơn vị thời gian, trong khoảng 35–42.
  - "phải/trái" chỉ tính là bên khi đứng sau từ chỉ vị trí (tai, mũi, bên, họng, amidan, hạch, má, nhĩ, thanh) hoặc đứng riêng một vế. Ví dụ "phải nhỏ mũi" không còn chọn bên phải. "hai bên" khớp "2 bên".
  - `EformScreen`: dùng `gopTruongMoi` và cập nhật chỉ định, thuốc theo dạng hàm, để ô bác sĩ sửa và dòng thêm, xóa trong lúc chờ AI không bị ghi đè hay mất.
  - Gọi AI lỗi khi dùng mẫu kèm chi tiết thì vẫn điền theo mẫu bằng quy tắc (`ketQuaTheoQuyTac`), kèm thông báo đỏ.
  - Mã ICD của mẫu chỉ dùng khi chẩn đoán LLM trả về vẫn chứa chẩn đoán của mẫu (`icdTheoMau`). Ví dụ "vh cấp, chẩn đoán viêm amidan cấp" không còn gắn mã viêm họng.
- **Lý do:** Review cuối của cả loạt thay đổi. 9 lỗi nhỏ để lại, xem mục Ảnh hưởng.
- **File:** `src/shared/eform/phieu-mau.ts`, `src/shared/eform/phieu-mau.test.ts`, `src/shared/eform/dien-phieu.ts`, `src/shared/eform/dien-phieu.test.ts`, `src/client/eform/EformScreen.tsx`, `src/client/eform/TroLyAi.tsx`, `README.md`
- **Kiểm tra:**
  - 9 test mới tái hiện đúng các lỗi và fail trước khi sửa; sau khi sửa, `npm test` 51/51 pass.
  - `npm run lint`, `npx tsc --noEmit` sạch, `npm run build` thành công.
  - `npm run eval -- --rule-only` giống hệt lúc bắt đầu; `npm run eval-mau` không đổi (68,5% / 72,5%).
  - Playwright với Gemini (1 lượt), câu "vtg cấp, tai T, sốt 2 ngày, sổ mũi": khám toàn thân giữ "Sốt [số] độ" (vàng), khám chuyên khoa "Màng nhĩ trái…", chẩn đoán "…tai trái", ICD H66.0, báo "Còn 1 chỗ cần điền".
  - Chưa thử trên trình duyệt trường hợp AI lỗi (cần làm Gemini lỗi) và trường hợp gõ trong lúc chờ; hai trường hợp này có test cho phần hàm thuần.
- **Ảnh hưởng:** Lỗi nhỏ chưa sửa:
  - Mẫu có hẹn "Khi có bất thường" vẫn đổi Hẹn tái khám thành "Có" (không có ngày, vàng).
  - Gọi lại mẫu báo "Bỏ qua 3 ô" vì ô Khám các bộ phận khác bị đếm dù trùng giá trị.
  - Gọi lại mẫu mà không điền được gì vẫn lưu bản để hoàn tác.
  - "Mẫu: vtg cấp" (dấu hai chấm) và "vtg-cấp" không nhận ra mẫu.
  - Câu tự do mở đầu bằng bí danh giống triệu chứng ("Ráy tai nhiều…") bị hiểu là gọi mẫu.
  - "viêm thanh quản cấp tính" còn dư chữ "tính" nên tốn 1 lượt LLM.
  - `eval-mau` gửi cả câu `input_mau` thay vì phần sau tên mẫu.
  - Luật lint cho file test tắt hết `no-restricted-imports`.
  - `[số] tháng` lấy số đầu tiên trước "tháng" ("18 tháng tuổi").

### Phiếu mẫu theo bệnh (8/9): viết lại kịch bản thử với bác sĩ theo cách gọi mẫu
- **Loại:** Tài liệu
- **Thay đổi:** Viết lại `docs/kich-ban-thu-bac-si.md`.
  - **Phần cho bác sĩ:** còn 4 bước (gõ hoặc nói tên mẫu → Điền → kiểm tra 3 tab, sửa chỗ vàng → Lưu). Kịch bản mới:
    - M1: chỉ tên mẫu.
    - M2: tên mẫu kèm chi tiết.
    - M3: nói.
    - M4: phiếu đã có chữ.
    - M5: bệnh chưa có mẫu.
    - M6: thuốc trùng dị ứng.
    - Giữ A1 rút gọn (đọc cả ca) để so thời gian. Bỏ A2–A4 và B1–B4 cũ.
  - **Phần cho người điều phối:**
    - Lúc nào cần LLM.
    - Bảng số đo `npm run eval-mau`, ghi rõ là ước tính.
    - Cảnh báo câu khám có sẵn trong mẫu ("màng nhĩ 2 bên bình thường") và quy tắc nhận tên mẫu.
    - Bảng ghi chép thêm cột "Chữ nào trong mẫu phải sửa", "Ô nào không đọc mà vẫn Lưu".
    - Câu hỏi Mom Test về bộ viết tắt điều dưỡng đang dùng.
  - README cập nhật câu mô tả tài liệu này.
- **Lý do:** Chủ dự án thấy phần bác sĩ đọc cả ca quá dài. Thực tế điều dưỡng dùng phần mềm gõ tắt ra đoạn mẫu chung, bác sĩ chỉ sửa vài chữ. Kịch bản mới thử đúng cách làm đó.
- **File:** `docs/kich-ban-thu-bac-si.md`, `README.md`
- **Kiểm tra:** Đối chiếu tên nút trong tài liệu với code: ✨ Điền vào phiếu, Mẫu theo bệnh:, ✓ Đúng, ↶ Hoàn tác lần AI điền, 🎤 Bắt đầu nói, ⏹ Dừng nghe, "· Mẫu <id>" ở `/ket-qua`. Kiểm tra cuối cả loạt: `npm run lint`, `npx tsc --noEmit` sạch; `npm test` 41/41; `npm run build` thành công; `npm run eval -- --rule-only` giống hệt lúc bắt đầu (diff rỗng); `npm run eval-mau` mức 1 68,5%, mức 2 72,5%.

### Phiếu mẫu theo bệnh (7/9): mở rộng lên 39 mẫu
- **Loại:** Dữ liệu
- **Thay đổi:**
  - `data/eform/phieu-mau.json` thêm 25 mẫu, tổng 39:
    - Tai: nhọt ống tai, nấm ống tai, viêm tai giữa ứ dịch, tắc vòi tai, thủng màng nhĩ, chóng mặt tư thế kịch phát lành tính, bệnh Ménière, viêm dây thần kinh tiền đình, điếc đột ngột, nghe kém tuổi già.
    - Mũi: viêm mũi họng cấp, viêm mũi xoang mạn, polyp mũi, vẹo vách ngăn, quá phát cuốn mũi, nhọt tiền đình mũi, chảy máu mũi, dị vật mũi.
    - Họng, thanh quản: viêm họng mạn, viêm amidan mạn, áp xe quanh amidan, viêm thanh quản mạn, hạt xơ dây thanh, polyp dây thanh, hóc xương.
  - Danh mục thuốc bệnh viện soạn tay `data/catalog/thuoc.json` thêm 2 thuốc giả: TH-034 Clotrimazol nhỏ tai 1%, TH-035 Acid tranexamic 500 mg. Danh mục thật có các hoạt chất này nhưng nhiều sản phẩm trùng tên nên khớp không chắc.
  - Test dữ liệu nâng ngưỡng lên ít nhất 30 mẫu.
- **Lý do:** Người dùng muốn 30–40 bệnh, càng nhiều càng tốt.
- **File:** `data/eform/phieu-mau.json`, `data/catalog/thuoc.json`, `src/server/du-lieu/phieu-mau.test.ts`
- **Kiểm tra:**
  - `npm test` fail khi mới nâng ngưỡng 30 mà chưa thêm mẫu; sau khi thêm thì 41/41 pass. Mọi mẫu tra được ICD, mọi chỉ định và thuốc khớp chắc; đã in mã kiểm tra bằng mắt, ví dụ Ménière H81.0, Flunarizin khớp danh mục thật.
  - `npm run eval -- --rule-only` giống hệt trước (diff rỗng), `npm run eval-mau` không đổi.
  - Playwright: "mẫu meniere", "chảy máu cam", "hóc xương cá" điền đúng mẫu và ICD (H81.0, R04.0, T17.2), console không lỗi.
  - `npm run lint`, `npx tsc --noEmit` sạch.
- **Ảnh hưởng:** Nội dung mẫu là dữ liệu giả, soạn theo kiến thức lâm sàng chung, liều chỉ để minh họa, chưa có bác sĩ duyệt.

### Phiếu mẫu theo bệnh (6/9): đo mẫu đúng sẵn bao nhiêu (`npm run eval-mau`)
- **Loại:** Tính năng, Dữ liệu
- **Thay đổi:**
  - Tách phần chấm điểm của `scripts/eval.ts` sang `scripts/cham-diem.ts`, thêm hàm `chamNhap`. Output của `npm run eval` giữ nguyên.
  - Thêm `scripts/eval-mau.ts` (`npm run eval-mau`, mặc định mock), chấm 2 mức: chỉ có mẫu, và mẫu kèm câu chi tiết ngắn.
  - `CaseData` có thêm `mau_id`, `input_mau`. 10 ca có mẫu được thêm 2 khóa này (ca-09 u bã đậu chưa có mẫu).
  - `dienChoTrong` nhận thêm đơn vị `giờ`, `kg`, vì mẫu dị vật tai và mẫu trẻ em dùng.
  - Mẫu không ghi `so_luong: 1` cho chỉ định nữa (eForm tự hiểu là 1; trước đó bị tính 18 lần "Thừa").
- **Lý do:** Người dùng muốn biết mẫu điền đúng khoảng bao nhiêu phần trăm, để bác sĩ chỉ cần kiểm tra và sửa.
- **File:** `scripts/cham-diem.ts` (mới), `scripts/eval.ts`, `scripts/eval-mau.ts` (mới), `package.json`, `src/shared/types.ts`, `src/shared/eform/phieu-mau.ts`, `src/shared/eform/phieu-mau.test.ts`, `data/eform/phieu-mau.json`, `data/cases/ca-01…08, ca-10, ca-11` (thêm `mau_id`, `input_mau`), `README.md` (mục Đo phiếu mẫu, quy ước đơn vị), `CLAUDE.md`
- **Kiểm tra:** `npm run eval -- --rule-only` trước và sau khi tách: `diff` không khác dòng nào. `npm test` 41/41 (test giờ/kg fail trước khi sửa). `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval-mau` (mock), 10/11 ca có mẫu:
  - **Mức 1, chỉ có mẫu: 68,5%** chung (70,5% không tính tiền sử). Phiếu khám 38,9%, Chỉ định 97,4%, Đơn thuốc 76,3%.
  - **Mức 2, mẫu kèm chi tiết, quy tắc: 72,5%** (74,6%). Phiếu khám 53,7%.
  - Ô yếu nhất: bệnh sử, khám toàn thân, khám chuyên khoa, lời dặn, vì bên tai, con số, câu chữ của từng ca khác mẫu. Hẹn tái khám, hướng điều trị, mã chỉ định gần như đúng hết.
  - Chưa chạy mức 2 với Gemini.
- **Ảnh hưởng:** Đây là ước tính, vì cả mẫu lẫn đáp án đều do nhóm soạn. File `data/cases/*.json` của 10 ca bị ghi lại bằng `json.dumps`: object một dòng giờ bung ra nhiều dòng, nội dung không đổi ngoài 2 khóa mới. Muốn giữ định dạng cũ thì khôi phục rồi chỉ thêm 2 khóa.

### Phiếu mẫu theo bệnh (5/9): gọi mẫu kèm chi tiết, 1 lượt LLM
- **Loại:** Tính năng
- **Thay đổi:**
  - Phía client: câu có tên mẫu và chi tiết phía sau ("vtg cấp, tai T, 3n, sốt 38,5") thì `TroLyAi` gọi `goiAiDienNhap(chiTiet, …, mau.id)`. `ExtractRequest` có thêm `mau_id`.
  - `/api/extract`: lấy mẫu bằng `timMauGoc`, không có thì trả 400 "Không tìm thấy mẫu này, hãy tải lại trang.". Mẫu được truyền xuống `runPipeline(…, { mau })` và `extractDraft`.
  - LLM: `buildUserPrompt(text, previousError, mau)` nối thêm thẻ `<phieu_mau>` cùng lời dặn giữ nguyên câu chữ, chỉ thay chỗ trống, sửa đúng chỗ bác sĩ nói. Kết quả của LLM được chạy thêm `dienChoTrongNhap` cho chỗ trống còn sót.
  - `mock`: chỉ chạy `dienChoTrongNhap`.
  - Mã vẫn gán qua `applyCatalogMatch` như mọi nháp.
- **Lý do:** Bác sĩ chỉ nói vài chi tiết riêng của bệnh nhân, phần còn lại lấy từ mẫu. Lần thử đầu, `gemini-3.5-flash-lite` điền "sốt 38,5" nhưng bỏ sót "tai T" (khám chuyên khoa, chẩn đoán còn `[phải|trái|2 bên]`), nên phải thêm bước quy tắc sau LLM.
- **File:** `src/shared/api.ts`, `src/client/api.ts`, `src/app/api/extract/route.ts`, `src/server/ai/pipeline.ts`, `src/server/ai/llm/index.ts`, `src/server/ai/prompt.ts`, `src/server/ai/prompt.test.ts` (mới), `src/server/ai/pipeline.test.ts` (mới), `src/client/eform/TroLyAi.tsx`, `README.md`
- **Kiểm tra:** `npm test` 40/40 pass: test prompt có mẫu, test mock thay chỗ trống và khớp mã, test chi tiết không hiểu thì giữ ngoặc; các test này fail trước khi sửa code. `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval -- --rule-only` không đổi. Playwright với Gemini (2 lượt): lần đầu bỏ sót bên tai, sau khi thêm quy tắc thì khám toàn thân "Sốt 38,5 độ", khám chuyên khoa "Màng nhĩ trái…", chẩn đoán "Viêm tai giữa cấp tai trái", ICD H66.0, lời dặn và hướng điều trị giữ nguyên mẫu, thông báo không còn chỗ cần điền.
- **Ảnh hưởng:** Mỗi lần gọi mẫu kèm chi tiết tốn 1 lượt LLM (free tier 500 lượt/ngày). Chỉ có tên mẫu thì không tốn lượt nào.

### Phiếu mẫu theo bệnh (4/9): gọi mẫu bằng tên ngay trong eForm, không gọi LLM
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Cột Trợ lý AI (`TroLyAi.tsx`): khi bấm Điền, kiểm tra câu bằng `timPhieuMau` trước.
    - Khớp một mẫu: đổ mẫu vào phiếu, không gọi API.
    - Khớp nhiều mẫu: hiện nút "Dùng mẫu: …" để chọn.
    - Không khớp: chạy luồng AI tách như cũ.
  - Đang gõ dở thì hiện "Mẫu theo bệnh:" với tối đa 5 tên, bấm là điền. Chữ gợi ý trong ô nhập đổi thành ví dụ gọi mẫu.
  - `EformScreen.aiDien(result, text, mau?)`: có mẫu thì gọi `dienPhieu` với `chiOTrong` và mã ICD của mẫu, thêm ô Khám các bộ phận khác khi ô đó trống. Thông báo riêng: "Đã điền theo mẫu …: N ô, X chỉ định, Y thuốc. Bỏ qua K ô đã có chữ. Còn M chỗ cần điền (tô vàng)."
  - `dienPhieu`: ở chế độ `chiOTrong`, ô đã đúng giá trị của mẫu thì không đếm là vừa điền, để lần gọi lại không báo "1 ô".
  - Số đo lượt thử có thêm `mau_id` (`src/shared/metrics.ts`, `/api/sessions`, cột CSV). Trang Kết quả hiện "· Mẫu <id>".
- **Lý do:** Bác sĩ chỉ gõ hoặc nói tên mẫu, sau đó kiểm tra và sửa thay vì đọc cả ca.
- **File:** `src/client/eform/TroLyAi.tsx`, `src/client/eform/EformScreen.tsx`, `src/shared/eform/dien-phieu.ts`, `src/shared/eform/dien-phieu.test.ts`, `src/shared/metrics.ts`, `src/app/api/sessions/route.ts`, `src/client/ket-qua/ResultsView.tsx`, `README.md` (mục Gọi phiếu mẫu theo bệnh)
- **Kiểm tra:** `npm test` 34/34 pass (test "ô đã đúng giá trị mẫu" fail trước khi sửa). `npm run lint`, `npx tsc --noEmit` sạch. Playwright trên dev server:
  - "mẫu viêm tai giữa cấp" → báo "11 ô, 2 chỉ định, 2 thuốc. Bỏ qua 2 ô đã có chữ. Còn 4 chỗ cần điền". Lý do khám và bệnh sử có sẵn của ca giả giữ nguyên, ngày tái khám 2026-11-16, ICD H66.0. Không có request `/api/extract`.
  - Augmentin hiện cảnh báo dị ứng Penicillin.
  - Gọi lại "vtg cấp" không thêm dòng trùng.
  - Gõ "viêm t" hiện 5 gợi ý; bấm "Viêm tai ngoài" thì điền luôn và xóa chữ.
  - Lưu thì `/ket-qua` hiện "Nhập thật · Mẫu viem-tai-ngoai", provider `mau`.
  - Câu kể cả ca (có "chẩn đoán viêm họng cấp") vẫn gọi `/api/extract` (1 lượt Gemini).
  - Console không có lỗi. Đã xóa lượt thử và đơn thói quen do lần kiểm tra này ghi ra.
- **Ảnh hưởng:** Câu bắt đầu bằng tên một mẫu (ví dụ "Viêm tai ngoài 4 ngày nay…") giờ được hiểu là gọi mẫu. Số đo cũ không có `mau_id`, trang Kết quả vẫn đọc được.

### Phiếu mẫu theo bệnh (3/9): đổ phiếu chỉ vào ô trống, chỗ trống tô vàng
- **Loại:** Tính năng
- **Thay đổi:** `dienPhieu` (`src/shared/eform/dien-phieu.ts`) nhận thêm tham số thứ năm `tuyChon: { chiOTrong?, icd? }`. Không truyền thì chạy như cũ.
  - `chiOTrong` (dùng cho phiếu mẫu): ô đã có chữ thì giữ nguyên và đưa vào `boQua`, bất kể chữ đó từ đâu ra (dữ liệu cũ, AI điền lần trước, bác sĩ gõ). Riêng ô Hẹn tái khám: giá trị mặc định "Không" chưa phải lựa chọn của ai, nên mẫu vẫn được đổi thành "Có" và đặt ngày; bác sĩ đã tự chọn thì giữ.
  - `icd`: dùng mã đã tra sẵn từ mẫu thay cho gợi ý ICD theo từ khóa.
  - Ở mọi chế độ, ô còn chỗ trống `[...]` được đánh dấu "xem" (tô vàng) thay vì "ai".
- **Lý do:** Người dùng chốt "mẫu chỉ điền ô còn trống". Ca giả trên eForm có sẵn lý do khám, bệnh sử (điều dưỡng nhập) và hẹn tái khám "Không" mặc định.
- **File:** `src/shared/eform/dien-phieu.ts`, `src/shared/eform/dien-phieu.test.ts` (mới)
- **Kiểm tra:** `npm test` 33/33 pass; 4 test mới fail trước khi sửa code, 2 test về hẹn tái khám pass cả trước lẫn sau để giữ quy tắc cũ. `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval -- --rule-only` không đổi.
- **Ảnh hưởng:** Luồng AI tách cả đoạn không đổi, trừ việc ô có `[...]` giờ tô vàng.

### Phiếu mẫu theo bệnh (2/9): 14 mẫu đầu tiên, nạp và gán mã ở server
- **Loại:** Dữ liệu, Tính năng
- **Thay đổi:**
  - Thêm `data/eform/phieu-mau.json` với 14 mẫu giả, phủ các bệnh trong 11 ca mẫu và 12 bộ gợi ý theo chẩn đoán: viêm tai giữa cấp (người lớn, trẻ em), viêm tai giữa mạn đợt cấp, viêm tai ngoài, nút ráy tai, dị vật tai, ù tai nghe kém, viêm mũi xoang cấp, viêm mũi dị ứng, viêm họng cấp, viêm amidan cấp, viêm VA trẻ em, viêm thanh quản cấp, trào ngược họng thanh quản. Chưa có mẫu cho u bã đậu (ca-09).
  - Mỗi mẫu có đủ 8 ô phiếu khám, ô khám bộ phận khác, chỉ định và đơn thuốc. Mẫu không ghi mã: `icd_ten` là tên ICD10 đúng như trong danh mục.
  - `src/server/du-lieu/phieu-mau.ts` (`loadPhieuMauGoc`, `timMauGoc`, `loadPhieuMau`) gán mã một lần khi nạp trang, dùng `applyCatalogMatch` (chỉ định, thuốc), `applyTotals` (tổng số lượng) và `maIcdTheoTen` mới trong `src/shared/eform/icd.ts` (tra ICD theo tên trùng khít, bỏ dấu). `EformData` có thêm `phieuMau`.
- **Lý do:** Bộ mẫu để bác sĩ gọi bằng tên thay vì đọc cả ca. Mã vẫn chỉ do code khớp danh mục gán (quy tắc 3).
- **File:** `data/eform/phieu-mau.json` (mới), `src/server/du-lieu/phieu-mau.ts` (mới), `src/server/du-lieu/phieu-mau.test.ts` (mới, test dữ liệu), `src/shared/eform/icd.ts`, `src/shared/eform/icd.test.ts` (mới), `src/shared/eform/types.ts`, `src/server/du-lieu/eform.ts`, `README.md` (bảng file `data/eform/`)
- **Kiểm tra:** Chạy `npm test` khi chưa có code thì fail; sau đó 26/26 pass. Mọi mẫu tra được ICD, mọi chỉ định và thuốc khớp chắc (ví dụ viêm tai giữa cấp: H66.0, DV-TMH-003, 21.64, TH-001 tổng 14, TH-013 tổng 9). `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval -- --rule-only` không đổi (Phiếu khám nói 97,1%, gõ tắt 98,1%; Chỉ định nói 92,9%; Đơn thuốc nói 99,1%). Trang `/` vẫn trả 200.
- **Ảnh hưởng:** Nội dung mẫu soạn theo cách viết của ca mẫu và kiến thức lâm sàng chung. Chưa đối chiếu hướng dẫn của Bộ Y tế, chưa có bác sĩ duyệt. Không sửa `data/tham-khao/nguon.json` vì file đó do `npm run cao-du-lieu` ghi lại mỗi lần cào.

### Phiếu mẫu theo bệnh (1/9): nhận lệnh gọi mẫu, điền chỗ trống; thêm `npm test`
- **Loại:** Tính năng
- **Thay đổi:** Thêm `src/shared/eform/phieu-mau.ts` (TS thuần, chạy được cả trình duyệt lẫn server), gồm:
  - Kiểu `PhieuMauGoc` (một mẫu trong `data/eform/phieu-mau.json`, sẽ có ở bước sau) và `PhieuMau` (mẫu đã khớp mã).
  - `timPhieuMau`: nhận tên mẫu hoặc bí danh, có dấu hay không dấu. Chỉ nhận khi tên đứng đầu câu (có thể có "mẫu", "điền mẫu", "theo mẫu" phía trước) hoặc đứng ngay sau chữ "mẫu". Vì vậy câu kể cả ca có nhắc tên bệnh không bị nhầm là gọi mẫu, và "máu" không bị hiểu là "mẫu". Tên dài nhất thắng; hai mẫu cùng khớp thì trả `nhieu` để hỏi lại. Phần còn lại của câu là chi tiết; nếu chỉ còn từ đệm ("nhé") thì coi như không có chi tiết.
  - `goiYTenMau`: gợi ý tối đa 5 tên mẫu khi đang gõ.
  - `dienChoTrong` / `dienChoTrongNhap`: thay `[phải|trái|2 bên]` và `[số] ngày|tuần|tháng|độ|lần` theo chi tiết bác sĩ nói, bung viết tắt trước (`T`→trái, `3n`→3 ngày). Không hiểu, hoặc có nhiều hơn một lựa chọn cùng xuất hiện, thì giữ nguyên chỗ trống.
  - Thêm lệnh `npm test` (`node:test` chạy qua `tsx --conditions=react-server`, không thêm thư viện). `eslint.config.mjs` cho file `*.test.ts` import `node:*`.
- **Lý do:** Bác sĩ chỉ cần gõ hoặc nói một câu ngắn như "mẫu viêm tai giữa cấp", AI điền cả phiếu theo mẫu của bệnh đó, bác sĩ chỉ kiểm tra. Bước này làm phần lõi, chưa nối vào giao diện.
- **File:** `src/shared/eform/phieu-mau.ts` (mới), `src/shared/eform/phieu-mau.test.ts` (mới), `package.json`, `eslint.config.mjs`, `README.md` (mục Test), `CLAUDE.md` (lệnh `npm test`)
- **Kiểm tra:** `npm test`: 16/16 pass (đã chạy thấy fail khi chưa có module). `npm run lint`, `npx tsc --noEmit` sạch.

### Tạm ẩn trang Trình diễn
- **Loại:** Giao diện
- **Thay đổi:** Gỡ link "Trình diễn" khỏi thanh đầu (`Header.tsx`). `src/app/trinh-dien/page.tsx` giờ gọi `notFound()` nên mở `/trinh-dien` ra 404. Vẫn giữ code `src/client/trinh-dien/`, `src/server/du-lieu/trinh-dien.ts`, `data/eform/trinh-dien.json` và các nhánh `kichBan` trong `EformScreen`. Muốn bật lại thì khôi phục `page.tsx`, cách làm ghi trong chú thích của file.
- **Lý do:** Chủ dự án muốn tạm cắt trang này để tập trung vào phiếu mẫu theo bệnh trong eForm.
- **File:** `src/client/chung/Header.tsx`, `src/app/trinh-dien/page.tsx`, `README.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npm run lint` và `npx tsc --noEmit` sạch. Dev server: `/` trả 200, HTML chỉ còn link `/` và `/ket-qua`; `/trinh-dien` trả 404.
- **Ảnh hưởng:** Gần như không làm eForm nhẹ hơn: Next chỉ biên dịch một route khi có người mở nó, và phần dính vào eForm chỉ là vài nhánh `kichBan` nhỏ.

### Gemini free tier: dùng `gemini-3.5-flash-lite`
- **Loại:** Cấu hình
- **Thay đổi:** Đổi `GEMINI_MODEL` trong `.env.local` (không commit) sang `gemini-3.5-flash-lite`. Ghi model nên dùng với key miễn phí vào `README.md`, `.env.example`, `docs/kich-ban-thu-bac-si.md` (sửa giới hạn cũ "5 lượt/phút" thành 15 lượt/phút, 500 lượt/ngày). Không đổi code.
- **Lý do:** Key miễn phí đã hết hạn mức của các model mạnh. Thử 1 lượt bằng ca `ca-01` (lời nói) qua pipeline: `gemini-3.5-flash` báo 503 quá tải; `gemini-3.8-flash` báo 504 sau khoảng 88 giây vì suy nghĩ quá lâu (thêm `thinkingLevel: LOW` thì chỉ mất 2,3 giây, nhưng chưa đưa vào code); `gemma-4-31b-it` mất 75–85 giây khi chạy được, hay lỗi 500/503, giới hạn 16K token/phút; `gemma-4-26b-a4b-it` lỗi 500. `gemini-3.5-flash-lite` mất 2,6 giây, JSON đúng schema ngay lần đầu.
- **File:** `.env.local` (không commit), `.env.example`, `README.md`, `docs/kich-ban-thu-bac-si.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chạy 1 lượt `runPipeline` với ca `ca-01`: 10 trường phiếu khám đúng, chỉ định ra mã `20.13`, 3 thuốc khớp mã, tổng số lượng 28 và 9 đúng. Chưa chạy `npm run eval -- --provider=gemini` cho cả bộ ca.
- **Ảnh hưởng:** Phải khởi động lại `npm run dev` thì mới nhận model mới. Chất lượng trên cả bộ ca chưa đo, mới thử 1 ca.

## 2026-11-11

### Ghi phần bảo hiểm bác sĩ hỏi: "thanh toán BHYT có điều kiện"
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/tham-khao/bao-hiem-thanh-toan-co-dieu-kien-2026-11-11.md`: lời bác sĩ (không biết dịch vụ nào bên nào trả, trả bao nhiêu, muốn loại bảo hiểm hiện ra), gom các ghi nhận BHYT cũ (03/11, khung tích BHYT ở bước 2 màn Chỉ định, quầy tiếp đón), tra cứu điều kiện/tỷ lệ thanh toán thuốc (TT 37/2024) và dịch vụ kỹ thuật (TT 39/2024), bảng các nguồn trả ở Vinmec (BHYT, bảo lãnh tư nhân, kết hợp), 5 giả thuyết chỗ vướng G1–G5, câu hỏi Mom Test cho bác sĩ và phòng BHYT, hướng làm nếu chọn. Thêm dòng vào mục lục `docs/tham-khao/README.md`.
- **Lý do:** Bác sĩ TMH hỏi nhóm có làm phần bảo hiểm y tế không. Chưa đổi code.
- **File:** `docs/tham-khao/bao-hiem-thanh-toan-co-dieu-kien-2026-11-11.md`, `docs/tham-khao/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chỉ tài liệu. Phần luật là tra cứu ban đầu, chưa được phòng BHYT xác nhận.

### Trang Trình diễn: 4 kiểu tương tác với máy trên cùng một ca; hiểu lệnh "kê như mọi khi"
- **Loại:** Tính năng
- **Thay đổi:**
  - Trang mới `/trinh-dien` (link "Trình diễn" trên thanh đầu). Thanh chọn 4 kiểu: 1 Máy điền sẵn, 2 Bấm một lần, 3 Nói một câu, 4 Nghe cả buổi khám. Thẻ giải thích có 5 ô: Giống như, Lúc nào, Bác sĩ làm, Máy làm, Bác sĩ cần kiểm tra; có nút ẩn/hiện. Nút "↺ Làm lại từ đầu". Mỗi lần chọn kiểu, `EformScreen` mở lại với `kichBan`: kiểu 1 đã có nháp AI của câu mẫu (pipeline `mock`, đổ vào phiếu ở server, không gọi LLM); kiểu 2 đã chọn H66.1 và mở tab Đơn thuốc với 3 đơn đã kê giả; kiểu 3 đã chọn H66.1, ô nhập có sẵn câu lệnh; kiểu 4 có nút "▶ Bắt đầu nghe buổi khám" phát lại 12 câu hội thoại giả vào ô nhập, mỗi câu khoảng 1,4 giây, có nút Dừng. Ở trang này Lưu không ghi số đo hay đơn đã kê.
  - Lệnh "kê như mọi khi", "như lần trước", "đơn quen"… (`nhuMoiKhi` trong `src/shared/eform/thoi-quen.ts`) dùng được ở mọi trang: sau khi AI điền, thêm các dòng thuốc, chỉ định bác sĩ hay kê (từ một nửa số lần trở lên) cho chẩn đoán chính lên trước dòng AI tách, bỏ dòng trùng. Thông báo cho biết đã lấy bao nhiêu dòng, hoặc chưa có đơn đã kê cho mã đó. `TroLyAi` gửi kèm đoạn chữ trong `onDien`.
  - Prompt LLM thêm quy tắc cho hội thoại `BS:`/`BN:`: lời bệnh nhân chỉ dùng cho lý do khám, bệnh sử, tiền sử.
  - Kịch bản ở `data/eform/trinh-dien.json` (dữ liệu giả, liều minh họa).
- **Lý do:** Chủ dự án không biết trình bày thế nào để bác sĩ hiểu "tương tác với AI" nghĩa là gì, trước buổi họp bác sĩ đề nghị mà chủ dự án chủ trì. Chọn làm chế độ trình diễn trước tài liệu in.
- **File:** `src/app/trinh-dien/page.tsx` (mới), `src/client/trinh-dien/TrinhDienScreen.tsx` (mới), `src/server/du-lieu/trinh-dien.ts` (mới), `data/eform/trinh-dien.json` (mới), `src/client/eform/EformScreen.tsx` (`kichBan`, `trangThaiDau`, `dongQuen`, không ghi khi trình diễn), `src/client/eform/TroLyAi.tsx` (`vanBanDau`, `hoiThoai`, `onDien(result, text)`), `src/shared/eform/thoi-quen.ts` (`nhuMoiKhi`), `src/shared/eform/types.ts` (`TrinhDienData`, `KieuTuongTac`, `KichBan`), `src/server/ai/prompt.ts`, `src/client/chung/Header.tsx`, `README.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run eval -- --rule-only` không đổi (Phiếu khám nói 97,1%, gõ tắt 98,1%; Chỉ định nói 92,9%; Đơn thuốc nói 99,1%). Playwright trên dev server (`gemini-3.5-flash`), màn 1536×682: kiểu 1 mở ra có 3 chỉ định, 2 thuốc, 3 chỗ cần xem lại; kiểu 2 hiện "Đơn anh/chị đã kê 3 lần trước", Ciprofloxacin và Paracetamol "kê 2/3 lần" được tích, Ofloxacin "kê 1/3 lần" không tích; kiểu 3 bấm Điền (1 lần gọi Gemini) ra Ciprofloxacin, Paracetamol (từ đơn quen) và Cetirizin 10 mg (từ câu nói); kiểu 4 phát đủ 12 câu, bấm Điền (Gemini báo 503 một lần, bấm lại thì được) ra tiền sử lấy từ lời bệnh nhân, khám chuyên khoa, chẩn đoán, lời dặn lấy từ lời bác sĩ, 3 chỉ định, 2 thuốc. Trang `/` không lỗi console. Lần đầu tính nháp kiểu 1 trong component client thì gặp lỗi hydration (lúc SSR mã ICD ra rỗng, trình duyệt ra H66.3; chưa rõ nguyên nhân), nên chuyển sang tính ở server. Chưa chạy eval LLM cho quy tắc hội thoại mới (tốn phí).
- **Ảnh hưởng:** Ở trang chính, câu có "như mọi khi" giờ thêm cả bộ thuốc quen. Khi kê tùy ý thì đây là hành vi mới. Thẻ giải thích chiếm chỗ trên màn thấp, nên ẩn đi trước khi bấm Điền. Lỗi hydration ở trên có thể còn ở chỗ khác nếu sau này để component client gọi `goiYIcd` lúc render đầu.

### Ghi thêm ý "AI hỗ trợ chẩn đoán để đỡ bỏ sót" vào phản hồi bác sĩ
- **Loại:** Tài liệu
- **Thay đổi:** `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md` thêm ý 5 vào bảng, thêm mục "Ý 5": lý do chưa nên làm dạng gợi ý chẩn đoán (rủi ro hỗ trợ quyết định lâm sàng, chưa biết thực tế bỏ sót gì, báo nhiều quá thì bị bỏ qua), đề xuất bản hẹp "cờ đỏ, cân nhắc loại trừ" bằng rule do bác sĩ đưa, 3 ví dụ ghi rõ chưa được bác sĩ xác nhận. Thêm 3 câu hỏi Mom Test. Mục lục `docs/tham-khao/README.md` cập nhật mô tả.
- **Lý do:** Chủ dự án báo thêm ý kiến này sau buổi xem prototype và muốn ghi vào file phản hồi.
- **File:** `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`, `docs/tham-khao/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đọc lại, không có tên hay thông tin bệnh nhân. Không đổi code.

### Gợi ý "Đơn anh/chị đã kê" theo thói quen từng bác sĩ
- **Loại:** Tính năng
- **Thay đổi:**
  - Bấm Lưu khi phiếu có mã ICD10 chính (ra viện, chưa có thì ban đầu) và có ít nhất một dòng chỉ định hoặc thuốc: ghi các dòng đó (bỏ cột nguồn, ứng viên) và lời dặn qua `POST /api/thoi-quen` vào `data/thoi-quen/<tài khoản>.json`. Kiểm tra bằng zod, thời điểm do server ghi, mỗi tài khoản giữ 200 lần gần nhất. Mỗi lượt mở phiếu có một id (`crypto.randomUUID`), Lưu lại thì ghi đè. Lỗi ghi thì thông báo "Chưa ghi được đơn vào gợi ý theo thói quen".
  - Khung "✨ Gợi ý theo chẩn đoán" ở tab Chỉ định và Đơn thuốc: với mỗi mã ICD đang chọn, nếu tài khoản đã kê cho cùng mã chính thì nhóm "Đơn anh/chị đã kê N lần trước" đứng đầu. Dòng xếp theo số lần kê, liều lấy từ lần gần nhất, có nhãn "kê x/N lần". Dòng kê từ một nửa số lần trở lên được tích sẵn; khi có nhóm này thì bộ mẫu chung không tích sẵn. Mã đã lưu không còn trong danh mục thì bỏ mã, dòng hiện vàng. Dấu ✨ trên tab cũng tính nhóm này. Câu khi trống đổi thành "Chưa có bộ mẫu hay đơn anh/chị đã kê cho …".
  - Tài khoản là `ca.dang_nhap`; thêm `?bs=<tài khoản>` trên URL để đổi (chỉ nhận chữ, số, `_`, `-`; tên này là tên file).
- **Lý do:** Bác sĩ xem prototype hỏi kê đơn có cá nhân hóa không, vì mỗi bác sĩ có thói quen kê khác nhau (`docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`). Chủ dự án duyệt làm.
- **File:** `src/shared/eform/thoi-quen.ts` (mới), `src/server/du-lieu/thoi-quen.ts` (mới), `src/app/api/thoi-quen/route.ts` (mới), `src/shared/eform/goi-y.ts` (thêm `cuaToi` vào `MauGoiY`), `src/shared/eform/types.ts` (`thoiQuen`), `src/shared/api.ts` (`LuuThoiQuenRequest`), `src/client/api.ts` (`luuThoiQuen`, nhận 204), `src/server/du-lieu/eform.ts`, `src/app/page.tsx` (`searchParams`), `src/client/eform/EformScreen.tsx`, `src/client/eform/GoiYTheoChanDoan.tsx`, `.gitignore`, `README.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Playwright trên dev server đang chạy, `/?bs=user_test`, không bấm Điền nên không gọi LLM: chọn H66.1, thêm Ciprofloxacin nhỏ tai và Paracetamol bằng ô Tìm thuốc, Lưu → file `data/thoi-quen/user_test.json` có 1 lần kê đúng 2 thuốc. Tải lại, chọn H66.1, tab Đơn thuốc hiện "Đơn anh/chị đã kê 1 lần trước", hai dòng "kê 1/1 lần" được tích sẵn, header hiện `user_test`. Đã xóa file thử. Chưa thử nhiều lần kê khác nhau để xem thứ tự và tích sẵn theo tỉ lệ.
- **Ảnh hưởng:** Không đổi tách/khớp nên không chạy eval. Bác sĩ thấy nhóm mới chỉ sau khi đã Lưu ít nhất một lần cho cùng chẩn đoán. Liều lưu là liều bác sĩ đã Lưu, kể cả khi chưa sửa chỗ vàng.

### Đo và sửa chữ nhận dạng giọng nói
- **Loại:** Tính năng
- **Thay đổi:**
  - `npm run eval-giong-noi`: đưa từng file `.wav` trong `data/giong-noi/` qua đúng luồng VAD của `server/ai/asr.ts` (gửi mẩu 0,4 giây), so với `input_noi` của ca cùng id (hoặc file `.txt` cùng tên). In WER (so cả dấu, số đổi thành chữ bằng `src/shared/giong-noi/so.ts`), số mã dịch vụ và thuốc bộ tách quy tắc vẫn ra so với câu gốc, số dòng thuốc trùng liều/lần/ngày, và số từ bộ sửa đổi nhầm trên câu gốc. Chữ thô lưu ở `<tên>.tho.json` để chạy lại nhanh (`--nhan-lai` để bỏ, `--chi-tiet` để in từng câu).
  - `npm run tao-am-thanh-mau` (chỉ Windows): giọng "Microsoft An" đọc `input_noi` của 11 ca thành `<id>.tts.wav` qua `scripts/tts-windows.ps1` (WinRT), tên thuốc đổi sang cách bác sĩ đọc trước khi đọc.
  - Bước sửa chữ `src/shared/giong-noi/sua-chu.ts` chạy trên trình duyệt cho mọi câu chốt (Zipformer và Web Speech) trong `TroLyAi.tsx`, bảng ở `config/sua-chu-giong-noi.json` (nạp qua `loadSuaChu`, truyền xuống bằng `EformData.suaChu`). Ba bước: thay cụm hay nghe nhầm có điều kiện từ trước/sau ("thai" thành "tai" trừ "có thai", "mang thai"…; "chạy mủ" thành "chảy mủ"; "chẩn" thành "chẩn đoán"…); thay tên thuốc bằng so gần đúng với cách đọc tiếng Việt (bỏ dấu, gộp x/s, d/gi/r, ph/f…, ngưỡng 0,72, chỉ khi gần đó có dấu hiệu kê đơn); đổi số chữ thành chữ số khi đứng trước đơn vị hoặc là số nhiều chữ. Dấu câu cuối từ được tách riêng để quy tắc vẫn khớp với câu Web Speech.
  - `server/ai/sherpa-onnx-node.d.ts` thêm `readWave`. `.gitignore` bỏ qua `data/giong-noi/*` trừ README.
- **Lý do:** Bác sĩ nói chỉ cần chuyển giọng nói thành chữ cho tốt là đủ. Trước đó chưa có cách đo độ chính xác, và số do model trả dạng chữ ("năm trăm mi li gam") nên bộ tách không đọc được liều nào.
- **File:** `CLAUDE.md` (lệnh thường dùng), `scripts/eval-giong-noi.ts` (mới), `scripts/tao-am-thanh-mau.ts` (mới), `scripts/tts-windows.ps1` (mới), `src/shared/giong-noi/sua-chu.ts` (mới), `src/shared/giong-noi/so.ts` (mới), `config/sua-chu-giong-noi.json` (mới), `data/giong-noi/README.md` (mới), `src/server/du-lieu/config.ts`, `src/server/du-lieu/eform.ts`, `src/shared/eform/types.ts`, `src/client/eform/TroLyAi.tsx`, `src/server/ai/sherpa-onnx-node.d.ts`, `package.json`, `.gitignore`, `README.md`, `docs/cau-truc-du-an.md`, `docs/kich-ban-thu-bac-si.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run eval-giong-noi` trên 11 file giọng máy: WER 21,4% → 10,5%, Mã 7/42 → 22/42, Liều 0/24 → 11/24, sửa nhầm trên câu gốc 0 từ. Thử ngưỡng 0,66 (sửa nhầm 24 từ, Mã 18/42) và 0,6 (sửa nhầm 57 từ) nên giữ 0,72. Chạy thử các câu "năm 2015", "3 năm nay", "có thai 3 tháng", "130 trên 80", "0,9%", "một ít nước", "thanh quản" thì đều ra đúng. Hotword sherpa-onnx (`modified_beam_search`, tách token qua bpe vocab tự sinh) chạy được nhưng không đổi kết quả kể cả điểm 10, nên không dùng. Chưa thử trên giao diện với micro thật, chưa đo bằng giọng người.
- **Ảnh hưởng:** Chữ trong ô nhập khác chữ tạm đang hiện lúc nói (chữ tạm chưa sửa). Giọng máy đọc "tai" như "thai" và đọc tên thuốc khác người, nên một phần bảng `thay` có thể chỉ khớp lỗi của giọng máy; cần ghi âm giọng thật (`data/giong-noi/README.md`) để chỉnh. `npm run eval -- --rule-only` không đổi vì không sửa bộ tách.

### Ghi phản hồi của bác sĩ sau khi xem prototype
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`: nhận xét gần nguyên văn (chỉ cần voice-to-text tốt; mức cao hơn là ghi âm cả cuộc trò chuyện; không phải ca nào cũng kê đơn, chỉ định; kê đơn nên cá nhân hóa), bảng ý và việc đã làm, câu hỏi cần hỏi thêm. Thêm dòng vào mục lục `docs/tham-khao/README.md`.
- **Lý do:** Chủ dự án chụp trang sổ tay ghi nhận xét, duyệt làm mục 1 và 4, không làm mục 3.
- **File:** `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`, `docs/tham-khao/README.md`
- **Kiểm tra:** Đọc lại, không có tên bác sĩ hay thông tin bệnh nhân. Ảnh sổ tay gốc không đưa vào repo.

### Thêm kịch bản thử với bác sĩ
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/kich-ban-thu-bac-si.md`. Phần 1 in ra cho bác sĩ: các bước trên Trợ lý AI, kịch bản A đọc theo mẫu (A1 nói và A2 gõ tắt ca 11, A3 viêm họng có Augmentin trùng dị ứng Penicillin lấy từ ca 3, A4 ù tai lấy từ ca 8; A3, A4 đổi "anh" thành "chị" và bỏ "ừ, à" cho khớp bệnh nhân giả trên phiếu), kịch bản B bác sĩ tự nói 3 ca theo thói quen và một lần "Điền thêm". Phần 2 cho người điều phối: chuẩn bị (`zipformer`, giới hạn 5 lượt/phút của Gemini miễn phí), những chỗ đã biết là yếu (nghe sai tên thuốc, khoảng 29% từ sai khi thử bằng giọng đọc máy; "đổi liều" thuốc đã có không có tác dụng và không báo), bảng ghi chép và câu hỏi sau buổi thử theo kiểu hỏi việc đã xảy ra. README thêm link ở mục Đo lường và Cấu trúc thư mục.
- **Lý do:** Chủ dự án hỏi kịch bản test cho bác sĩ đọc nằm ở đâu; trước đó chỉ có câu mẫu dạng JSON trong `data/cases/` lẫn với đáp án eval.
- **File:** `docs/kich-ban-thu-bac-si.md`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đối chiếu nhãn nút với `src/client/eform/TroLyAi.tsx` và `src/client/chung/MicButton.tsx`. Kiểm tra Strepsils không có trong `data/catalog/` và `data/tham-khao/`, Augmentin có 2 hàm lượng nên thiếu hàm lượng sẽ "chưa chắc". Chưa chạy thử các kịch bản trên giao diện.
- **Ảnh hưởng:** Không đổi code hay điểm eval. Câu A3, A4 khác chút so với `data/cases/`, eval không dùng file này.

### Tạm ẩn các bảng "Thông tin khai thác" trên phiếu khám
- **Loại:** Giao diện
- **Thay đổi:** Thêm hằng `HIEN_THONG_TIN_KHAI_THAC = false` ở đầu `src/client/eform/EformForm.tsx`. Khi `false`, phiếu khám không hiện bảng lịch sử các lần khám trước dưới ô Tiền sử bản thân, Tiền sử gia đình, Bệnh sử (kèm nút Copy và ✨ AI tóm tắt), cũng không hiện dòng "Lịch sử dị ứng", nút "Lấy LS dị ứng từ hệ thống khác" và bảng lịch sử dị ứng. Không có nút bật lại trên giao diện. Các ô nhập vẫn gõ được, AI vẫn điền vào như cũ. Cảnh báo dị ứng đỏ trên header vẫn giữ. Code `LichSuBlock.tsx`, `tom-tat.ts` và dữ liệu `lich_su` trong `data/eform/ca-gia.json` giữ nguyên.
- **Lý do:** Chủ dự án muốn buổi thử tập trung vào phần AI điền phiếu. Ẩn chứ không xóa để hiện lại được dễ dàng.
- **File:** `src/client/eform/EformForm.tsx`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Mở `/` bằng playwright (dev server `LLM_PROVIDER=gemini`): không còn chữ "Thông tin khai thác", "Lịch sử dị ứng", "AI tóm tắt" hay nút Copy nào. Ô Tiền sử bản thân, Bệnh sử vẫn hiện, cảnh báo "Dị ứng: Penicillin" vẫn có. Console không lỗi. Không đổi logic tách/khớp nên không chạy eval.
- **Ảnh hưởng:** Bác sĩ không Copy được tiền sử, bệnh sử, dị ứng từ lần khám trước. Muốn hiện lại thì đổi hằng thành `true`.

### Nạp danh mục thật: 367 mã ICD10, 486 kỹ thuật, khoảng 4.770 thuốc; ô chọn đổi thành ô gõ tìm
- **Loại:** Dữ liệu
- **Thay đổi:**
  - `src/server/du-lieu/danh-muc.ts` (mới) ghép danh mục bệnh viện soạn tay ở `data/catalog/` (đánh dấu `uu_tien`, đứng trước) với danh mục thật ở `data/tham-khao/`. Thuốc lưu hành gộp các số đăng ký trùng tên, hàm lượng và dạng bào chế (4.914 → khoảng 4.770), hàm lượng trống hoặc quá dài thì rút từ hoạt chất. ICD10 chỉ giữ mã chi tiết nhất (433 → 367), từ khóa gợi ý lấy từ `data/eform/icd10.json`. Kết quả được nhớ theo giờ sửa file. `loadCatalogs` chuyển từ `config.ts` sang file này.
  - `data/catalog/dich-vu.json`: 19 dịch vụ giả có kỹ thuật tương ứng trong TT 23/2024 đổi sang mã và tên thật, tên cũ chuyển vào `ten_khac` (ví dụ `DV-TMH-002` → `20.13` Nội soi tai mũi họng, `DV-TMH-028` → `22.121` Tổng phân tích tế bào máu ngoại vi bằng máy đếm laser, `DV-TMH-015` CT xương thái dương → `18.158` CLVT tai - xương đá 1-32 dãy). 11 mục TT 23 không có vẫn giữ mã `DV-TMH-*`. Thuốc giữ mã `TH-*`.
  - `data/cases/`: `expected` của 7 ca đổi mã và tên dịch vụ theo bảng trên. `data/eform/icd10.json`: tên 28 mã đổi theo ICD-10 bản 2026.
  - `src/shared/match.ts`: `matchCatalog` khớp hai tầng theo thứ tự trùng tên ở danh mục bệnh viện → trùng tên ở danh mục thật → tìm mờ bệnh viện → tìm mờ danh mục thật. Không tầng nào chắc thì gộp ứng viên của cả hai. `CatalogItem` thêm `uu_tien`.
  - Giao diện: `src/client/eform/TimDanhMuc.tsx` (mới) là ô gõ để tìm (bàn phím lên/xuống/Enter/Esc, tối đa 30 kết quả, nhãn **DM BV**), thay mọi `<select>` liệt kê cả danh mục ở Tìm dịch vụ, Tìm thuốc, ô chọn lại khi AI chưa chắc, Chẩn đoán ban đầu/ra viện, Chẩn đoán kèm theo. Ô ICD đơn có nút × để bỏ mã. `EformData` thêm `vietTat` để ô tìm hiểu từ viết tắt.
- **Lý do:** Chủ dự án thấy thiếu dữ liệu: ứng dụng chỉ có 30 dịch vụ, 33 thuốc, 28 mã ICD giả trong khi danh mục thật đã cào về nhưng chưa nạp. Thuốc thật chỉ có tên biệt dược, không có tên bác sĩ hay gọi, và nhiều hãng trùng tên, nên vẫn cần danh mục bệnh viện soạn tay để khớp chắc. `<select>` 5.000 dòng thì không chọn được.
- **File:** `src/server/du-lieu/danh-muc.ts` (mới), `src/server/du-lieu/config.ts`, `src/server/du-lieu/eform.ts`, `src/shared/match.ts`, `src/shared/types.ts`, `src/shared/eform/types.ts`, `src/client/eform/TimDanhMuc.tsx` (mới), `src/client/eform/ChiDinhTab.tsx`, `src/client/eform/DonThuocTab.tsx`, `src/client/eform/IcdField.tsx`, `data/catalog/dich-vu.json`, `data/eform/icd10.json`, `data/cases/ca-01-viem-tai-giua-cap-tre.json`, `data/cases/ca-02-viem-mui-xoang-cap.json`, `data/cases/ca-04-viem-amidan.json`, `data/cases/ca-05-viem-va-tre.json`, `data/cases/ca-07-di-vat-tai.json`, `data/cases/ca-08-u-tai-nghe-kem.json`, `data/cases/ca-11-viem-tai-giua-man-dot-cap.json`, `data/tham-khao/README.md`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run eval -- --rule-only` trước và sau giống hệt: Phiếu khám nói 97,1% / gõ tắt 98,1%, Chỉ định nói 92,9% / gõ tắt 100%, Đơn thuốc nói 99,1% / gõ tắt 98,1%. Thử khớp: "Klacid Forte", "Betaserc 24mg", "Levocetirizin 5mg" ra số đăng ký thật; "Paracetamol 500mg", "Medrol 16mg", "Augmentin 625 mg" ra thuốc bệnh viện; "đo thính lực lời" ra `21.61`; "Montelukast 10mg" chưa chắc, cho chọn trong các biệt dược. 12 bộ mẫu gợi ý vẫn khớp chắc hết. Playwright mở `/`: gõ "viem tai giua" ở Chẩn đoán ban đầu ra các mã H65/H66, Enter chọn được; tab Đơn thuốc gõ "montelukast" ra biệt dược thật; console không có lỗi.
- **Ảnh hưởng:** Dữ liệu trang tải về trình duyệt tăng lên khoảng 800 KB (thuốc chiếm khoảng 730 KB). Bác sĩ chọn được mọi kỹ thuật, thuốc lưu hành, mã ICD trong phạm vi TMH đã cào. Thuốc ngoài danh mục bệnh viện nói tên gốc thường sẽ ra "chưa chắc" vì nhiều biệt dược cùng hoạt chất. Danh mục thuốc thật mới có tối đa 100 số đăng ký mỗi hoạt chất (ví dụ chưa có Augmentin 625 mg viên). Chưa đo lại độ chính xác với LLM thật.

### Bỏ các thông báo và ghi chú của prototype trên giao diện
- **Loại:** Giao diện
- **Thay đổi:**
  - Bỏ dải vàng "Prototype – chỉ dùng dữ liệu giả…" dưới header (xóa `src/client/chung/Banner.tsx`), chip "Dữ liệu giả, mô phỏng" ở header bệnh nhân, chữ "(DỮ LIỆU GIẢ)" ở tiêu đề Báo cáo y tế, "(mô phỏng màn Medication ordering)" ở tab Đơn thuốc. Bỏ "– Prototype" ở tên trang và thanh trên cùng; link "Mô phỏng eForm ngoại trú" đổi thành "eForm ngoại trú".
  - Không hiện nhãn **Dữ liệu cũ** nữa (`SourceBadge` trả về rỗng với nguồn `cu`, bỏ khỏi chú giải, Đánh giá ban đầu, Thông tin khai thác). Ô dữ liệu cũ vẫn nền xám nhạt; nguồn `cu` vẫn dùng để tính "Đã sửa".
  - Bỏ "(tự động)" ở nhãn Bác sĩ khám, Phòng khám, Bác sĩ chính.
  - Cột Trợ lý AI: bỏ câu hướng dẫn đầu cột, chip "Chế độ AI" (trùng với thanh trên cùng), dòng "Giữ nguyên nội dung bác sĩ đã nhập…", dòng cuối "Mã ICD10… không do AI tự nghĩ ra". Bỏ dòng "Nhận dạng trên máy (Zipformer)…" dưới nút micro.
  - Bỏ dòng giải thích ở Gợi ý ICD10, Gợi ý mẫu câu, Gợi ý theo chẩn đoán ("Mô phỏng bằng bộ mẫu giả…"), AI tóm tắt ("Mô phỏng bằng rule · Gộp…", "Bác sĩ đọc và sửa trước khi chèn…").
  - Thông báo ngắn lại: Lưu chỉ còn "Đã lưu." (lỗi ghi số đo vẫn báo); bỏ đuôi "Bác sĩ duyệt/kiểm tra lại trước khi Lưu"; In ngay không báo trước nữa; bỏ tiền tố "Mô phỏng:" ở các nút chưa nối hệ thống.
  - Giữ lại: cảnh báo chỗ `[ ]` chưa chọn, cảnh báo dị ứng, câu khi chưa có dữ liệu, ghi chú "Chỉ hoạt động khi trạng thái là Chờ KQ CLS", báo thiếu model giọng nói, dấu "DỮ LIỆU GIẢ – BẢN MÔ PHỎNG" trên bản in.
- **Lý do:** Chủ dự án muốn giao diện tối giản, bỏ các thông báo, ghi chú kiểu "prototype chỉ dùng dữ liệu giả", "dữ liệu cũ", "tự động". Các giới hạn vẫn ghi trong README.
- **File:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/client/chung/Banner.tsx` (xóa), `src/client/chung/Header.tsx`, `src/client/chung/MicButton.tsx`, `src/client/eform/EformHeader.tsx`, `src/client/eform/EformScreen.tsx`, `src/client/eform/EformContext.tsx`, `src/client/eform/EformForm.tsx`, `src/client/eform/fields.tsx`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/GoiYTheoChanDoan.tsx`, `src/client/eform/GoiYIcdPanel.tsx`, `src/client/eform/MauCauPanel.tsx`, `src/client/eform/LichSuBlock.tsx`, `src/client/eform/DonThuocTab.tsx`, `src/client/eform/ChiDinhTab.tsx`, `src/client/eform/BaoCaoDialog.tsx`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Playwright mở `/`, nạp câu mẫu kiểu gõ tắt rồi Điền vào phiếu (LLM_PROVIDER đang là gemini): cột AI hiện đủ số trường, chỗ cần xem lại, nút chỉ định/thuốc; quét chữ trên trang không còn "dữ liệu giả", "dữ liệu cũ", "tự động", "Lưu ý" (chỉ còn tên cơ sở giả "Cơ sở mô phỏng" trong dữ liệu ca).
- **Ảnh hưởng:** Người thử không còn được nhắc trên màn hình rằng đây là dữ liệu giả; cần dặn miệng khi cho bác sĩ thử. Bác sĩ không còn thấy câu báo khi AI giữ nguyên ô đã gõ.

### Bỏ qua `.claude/settings.local.json` khỏi git
- **Loại:** Cấu hình
- **Thay đổi:** `.gitignore` thêm `/.claude/settings.local.json`. Đây là file cấu hình Claude Code riêng của từng người, không commit. Chủ dự án dùng file này để chặn (`permissions.deny`) 3 connector claude.ai không liên quan đến dự án là Vercel, Canva, Supabase.
- **Lý do:** 3 connector này nạp hơn 300 tool vào mọi phiên làm việc trên dự án, làm context nặng thêm mà không dùng tới. Connector gắn với tài khoản claude.ai của từng người nên chặn ở file local, không đặt trong `.claude/settings.json` chung.
- **File:** `.gitignore`, `docs/CHANGELOG.md`
- **Kiểm tra:** `git check-ignore -v .claude/settings.local.json` khớp dòng mới. Ngay sau khi tạo file, phiên Claude Code báo gỡ 337 tool của 3 connector.

### Thanh đáy eForm tách lại 2 tầng như EMR, ghim ở mọi khổ màn
- **Loại:** Giao diện
- **Thay đổi:** Thanh dưới đáy (`EformScreen.tsx`) trước gộp một hàng (nút thao tác, trạng thái, Lưu) và chỉ ghim từ khổ `lg`. Giờ tách 2 tầng theo ảnh chụp EMR: tầng trên là dải 7 trạng thái dạng nút tròn (đang chọn nền xanh, khổ điện thoại thì vuốt ngang), tầng dưới là ← Quay lại, Báo cáo y tế, In ngay, nút Lưu dài bên phải (tối đa `max-w-sm`), nút ↑. Ghim `sticky bottom-0` ở mọi khổ màn; khổ điện thoại nút Quay lại chỉ còn mũi tên (có `aria-label`). Biến `--cao-day` giữ 5.75rem cho khớp chiều cao mới (cột Trợ lý AI dùng để tính chiều cao tối đa).
- **Lý do:** Chủ dự án báo thanh đáy bị mất và form khác ảnh EMR trong `temp-1/`. Dưới 1024 px thanh không ghim nên trôi xuống cuối trang; trên EMR thật thanh luôn ở đáy và có 2 tầng.
- **File:** `src/client/eform/EformScreen.tsx`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Playwright + Chrome ở 1778, 900, 390 px, cuộn giữa trang: thanh đáy luôn ghim ở đáy màn, 2 tầng, không xuống dòng chữ trong nút. Chạy lại bài thử chức năng (Báo cáo y tế, khóa khi Hoàn thành khám, chặn khi chưa Lưu, In ngay): kết quả như mục dưới, không lỗi console.
- **Ảnh hưởng:** Khổ điện thoại thanh đáy chiếm khoảng 92 px cố định ở đáy màn. Sinh hiệu vẫn nằm ở header (khác EMR, nơi sinh hiệu là các ô xám trong mục 1), giữ theo đợt làm mới giao diện trước.

### eForm: In ngay in thật, Báo cáo y tế có chẩn đoán chính, Hoàn thành khám khóa phiếu
- **Loại:** Tính năng, Sửa lỗi, Giao diện
- **Thay đổi:**
  - **In ngay** (trước chỉ báo "bản demo không in phiếu") gọi `window.print()`. Thành phần mới `src/client/eform/BanIn.tsx` ẩn trên màn hình, chỉ hiện khi in: hành chính, sinh hiệu, các trường phiếu khám đã có chữ (kể cả tiền sử, dị ứng, hẹn tái khám, tình trạng ra viện), chẩn đoán chính và kèm theo dạng "mã – tên", bảng chỉ định, bảng đơn thuốc, chỗ ký bác sĩ, dấu "DỮ LIỆU GIẢ – BẢN MÔ PHỎNG". Phần còn lại của trang, header và banner prototype có `print:hidden`; `globals.css` thêm `@page` khổ A4 lề 15 mm. Còn chỗ AI chưa chắc thì báo trước khi in.
  - **Báo cáo y tế** (`BaoCaoDialog.tsx`) thêm khối hành chính (họ tên, giới, PID, thời gian khám, bác sĩ khám, dị ứng) và chẩn đoán chính (ra viện, chưa có thì ban đầu) kèm nhãn nguồn. Hàm dùng chung: `nhanIcd` (`IcdField.tsx`), `ngayGio`, `chanDoanChinh` (`BanIn.tsx`); `moTaLieu` trong `DonThuocTab.tsx` được export để bản in dùng.
  - **Hoàn thành khám** khóa phiếu khám, chỉ định, đơn thuốc và cột Trợ lý AI bằng `<fieldset disabled>`, hiện dòng "🔒 … phiếu chỉ đọc"; chọn lại Đang khám để mở. Còn thay đổi chưa Lưu (so tham chiếu dữ liệu lúc Lưu gần nhất, ban đầu là lúc mở trang) thì không cho chọn và báo bấm Lưu trước. Ô nhập bị khóa mờ đi (`disabled:opacity-70` trong `fields.tsx`). Đổi trạng thái chỉ bỏ tích Chuyển nội soi khi đang tích.
  - Sửa ký hiệu giới tính viết cứng ♀ trong header: giờ ♂ cho Nam, ♀ cho Nữ, giới khác không có ký hiệu.
  - Câu báo khi Lưu đổi thành "Đã lưu (mô phỏng): nội dung phiếu chỉ giữ trên trang này, tải lại trang là mất." Câu cũ "không gửi đi đâu" sai vì Lưu có gửi số đo lượt thử về server.
- **Lý do:** Rà phiếu khám theo yêu cầu của chủ dự án: các nút ở thanh đáy (trạng thái, Báo cáo y tế, In ngay) gần như không làm gì, trong khi nhật ký thực địa cho thấy ca nào bác sĩ cũng in phiếu khám và đơn thuốc lúc kết thúc. Báo cáo y tế thiếu chẩn đoán chính nên khó tin; đưa vào là giả định, cần hỏi bác sĩ hoặc xem một bản BCYT thật.
- **File:** `src/client/eform/BanIn.tsx` (mới), `src/client/eform/EformScreen.tsx`, `src/client/eform/BaoCaoDialog.tsx`, `src/client/eform/EformHeader.tsx`, `src/client/eform/IcdField.tsx`, `src/client/eform/DonThuocTab.tsx`, `src/client/eform/fields.tsx`, `src/client/chung/Header.tsx`, `src/client/chung/Banner.tsx`, `src/app/globals.css`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Chạy script Playwright với Chrome 1440 px trên dev server (`LLM_PROVIDER=mock`): header hiện "♀ Nữ"; Báo cáo y tế có khối hành chính và mục chẩn đoán; chọn Hoàn thành khám khi chưa sửa thì ô Lý do đến khám và ô Trợ lý AI bị khóa, chọn Đang khám mở lại; sửa Lý do rồi chọn Hoàn thành khám thì bị chặn kèm thông báo, Lưu xong thì khóa được; nạp câu mẫu kiểu nói → Điền → In ngay gọi print một lần, báo còn 3 chỗ chưa chắc; giả lập media print và xuất PDF A4: chỉ còn bản in, đủ 3 chỉ định, 2 thuốc, mã ICD và tên. Không có lỗi console. Không ghi file vào `data/sessions/` (không Lưu sau khi AI điền). Chưa thử in ra máy in thật, chưa xem khổ điện thoại, không cần chạy eval (không đổi logic tách/khớp).
- **Ảnh hưởng:** Bác sĩ thử nghiệm thấy phiếu bị khóa sau Hoàn thành khám. Trên EMR thật chưa rõ trạng thái này có khóa phiếu không. Bản in là bố cục tự đặt, không theo mẫu phiếu in thật của Vinmec.

### Bỏ trang "Màn hình làm việc", eForm lên `/`, nút Lưu trên eForm ghi số đo lượt thử
- **Loại:** Tính năng, Dọn dẹp, Cấu hình, Tài liệu
- **Thay đổi:**
  - Trang eForm chuyển từ `/eform` lên `/` (`src/app/page.tsx`). Link cũ `/eform` chuyển về `/` bằng `redirects()` trong `next.config.ts` (không permanent).
  - Bỏ trang "Màn hình làm việc" cũ và code chỉ trang đó dùng: `src/client/workspace/` (Workspace, FormPanel, trang-thai), `src/client/chung/{DynamicField,CatalogPicker}.tsx`, `src/app/eform/page.tsx`, `config/forms/hanh-chinh.json`, `loadAppConfig`/`loadHanhChinh` trong `src/server/du-lieu/config.ts`, kiểu `AppConfig` trong `src/shared/types.ts`, `computeWarnings` (cảnh báo thiếu trường, thiếu mã, trẻ em chưa có cân nặng) trong `src/shared/validate.ts`. Các khóa tuổi, cân nặng trong `config/canh-bao.json` còn đó nhưng không dùng.
  - Header của prototype (`src/client/chung/Header.tsx`) giờ hiện trên mọi trang, còn 2 link: "Mô phỏng eForm ngoại trú" (`/`) và "Kết quả thử nghiệm". Trên eForm nó cuộn đi khi kéo xuống, header bệnh nhân vẫn ghim.
  - Nút "← Quay lại" ở đáy eForm trước dẫn về trang cũ, giờ chỉ báo mô phỏng.
  - Đo lường trên eForm: `TroLyAi.tsx` báo `onBatDau` khi gõ, bấm 🎤 hoặc bấm câu mẫu. Sau khi AI điền, lần bấm Lưu đầu tiên gọi `luuLuotThu` (`/api/sessions`), ghi một lượt vào `data/sessions/`; Lưu tiếp không ghi thêm (tải lại trang để thử lượt mới). Cách đếm ở `src/shared/eform/do-luong.ts` (mới): trường AI điền tính theo từng trường phiếu khám, dòng chỉ định/thuốc AI thêm tính mỗi dòng một mục; sửa hoặc xóa dòng AI là "sửa"; dòng bác sĩ thêm (kể cả từ gợi ý theo chẩn đoán) là "bổ sung"; cảnh báo = chỗ còn "cần xem lại" + thuốc trùng nhóm dị ứng. Dòng AI có cờ mới `tu_ai` (`src/shared/eform/dien-phieu.ts`) để vẫn nhận ra khi bác sĩ đã sửa. Hoàn tác lần AI điền thì trừ cả số đếm.
  - `EformData.cauMau` thêm `id` (`ca-11`) để ghi `ca_mau_id`.
  - Thông báo trống ở trang Kết quả đổi thành hướng dẫn Lưu trên eForm. Sửa chú thích còn nhắc "trang chính".
  - README (chạy ở đâu, mục "Thêm hoặc sửa trường form": giao diện eForm không sinh từ JSON, "Đo lường" viết lại theo eForm, "Mô phỏng eForm ngoại trú", "Cấu trúc thư mục"), `docs/cau-truc-du-an.md`, `CLAUDE.md` cập nhật theo.
- **Lý do:** Chủ dự án thấy hai màn cùng chức năng gây rối, muốn chạy project là vào thẳng prototype eForm, giữ header và trang Kết quả. Trang Kết quả chỉ có dữ liệu từ nút Xác nhận của trang cũ, nên chủ dự án chọn cho nút Lưu trên eForm ghi số đo thay thế.
- **File:** `src/app/page.tsx`, `src/app/eform/page.tsx` (xóa), `next.config.ts`, `src/client/chung/Header.tsx`, `src/client/chung/DynamicField.tsx` (xóa), `src/client/chung/CatalogPicker.tsx` (xóa), `src/client/workspace/*` (xóa), `src/client/eform/EformScreen.tsx`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/fields.tsx`, `src/client/ket-qua/ResultsView.tsx`, `src/shared/eform/do-luong.ts` (mới), `src/shared/eform/dien-phieu.ts`, `src/shared/eform/types.ts`, `src/shared/types.ts`, `src/shared/validate.ts`, `src/server/du-lieu/config.ts`, `src/server/du-lieu/eform.ts`, `config/forms/hanh-chinh.json` (xóa), `README.md`, `docs/cau-truc-du-an.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint`, `npm run build` sạch (còn route `/`, `/ket-qua`, `/api/*`). `npm run eval -- --rule-only` giống hệt trước: Phiếu khám nói 97,1% / gõ tắt 98,1%, Chỉ định nói 92,9% / gõ tắt 100%, Đơn thuốc nói 99,1% / gõ tắt 98,1%. Chạy `next start` với `LLM_PROVIDER=mock` cổng 3100, mở bằng Chrome 1536 px: `/eform` chuyển về `/`, header hiện. Lượt 1: câu mẫu kiểu nói → Điền vào phiếu (14 trường, 3 chỉ định, 2 thuốc) → Lưu: file ghi `noi`, `tu_ca_mau: true`, `ca-11`, AI điền 19, sửa 0, khớp 5/5, cảnh báo 3; Lưu lần 2 báo đã ghi, không thêm file. Lượt 2 (tải lại): gõ tay → Điền (7 trường, 1 chỉ định, 1 thuốc) → sửa Lý do đến khám, xóa dòng chỉ định → Lưu: `go`, AI điền 9, sửa 2, khớp 1/2, cảnh báo 2. `/ket-qua` hiện đủ lượt. Khi kéo xuống, header bệnh nhân ghim top 0, cột AI ghim, không cuộn ngang. Đã xóa 2 file thử. Chưa xem ở khổ 390px (cửa sổ Chrome không đổi kích thước được), chưa thử ghi âm thật qua micro.
- **Ảnh hưởng:** Lượt cũ trong `data/sessions/` vẫn hiện ở trang Kết quả nhưng cách đếm khác (theo từng ô của form JSON), không so trực tiếp được với lượt mới. Mất cảnh báo "trẻ em có kê đơn chưa có cân nặng" (chỉ trang cũ có). Thêm trường vào `config/forms/*.json` giờ không tự hiện trên giao diện nữa.

### Làm mới giao diện `/eform`: header bệnh nhân, thẻ mục, cột Trợ lý AI 3 bước
- **Loại:** Giao diện, Cấu hình
- **Thay đổi:**
  - Giữ nguyên các mục, trường, thứ tự, 3 tab và các trạng thái lượt khám của EMR; chỉ đổi cách trình bày. Bỏ font Arial ép riêng cho trang, dùng Be Vietnam Pro 14px như phần còn lại của prototype.
  - Màu: `config/theme.json` bỏ 7 khóa `emr_*` (xanh, cam, ngọc lam của EMR), thêm `ef_nen`, `ef_vien`, `ef_chu`, `ef_phu`, `ef_xanh`, `ef_dam`, `ef_do`; `globals.css` đổi biến Tailwind tương ứng (`ef-*`, thêm `ef-xanh-nhat`, `ef-do-nhat`). `xem` đổi `#D97706` → `#B45309` cho chữ vàng đủ tương phản trên nền trắng. Tím AI giữ nguyên.
  - `EformHeader`: một dòng tên bệnh nhân, giới, PID, lượt khám, nhãn dị ứng đỏ, Menu; dòng dưới là sinh hiệu (chuyển từ mục Đánh giá chung lên, kèm BMI tự tính), "Đánh giá ban đầu" dạng bảng thả xuống, lần sửa cuối, Xem LSKB, Mở rộng. Header và thanh dưới chỉ ghim từ khổ `lg` trở lên; ở khổ điện thoại chúng cuộn theo trang thay vì che màn hình.
  - `fields.tsx`: nút, ô nhập, nhãn nguồn dạng viên tròn; ô do AI điền có vạch tím bên trái, ô AI chưa chắc có vạch vàng; nhãn "cần xem lại" có nút **✓ Đúng ngay tại trường** (trước đây chỉ có ở cột AI). Mục (`Section`) thành thẻ trắng có tiêu đề chữ thay cho thanh xanh đậm; lựa chọn Có/Không thành thẻ bấm (`RADIO`); thêm hằng `BTN_CHINH`, `TH`, `TD`, `NHOM` dùng chung.
  - `TroLyAi`: thanh 3 bước (Nói hoặc gõ → AI điền → Duyệt, Lưu); mỗi lúc chỉ một nút tô đậm (micro, rồi Điền, rồi phần duyệt); nút Điền có vòng quay khi đang chạy, Ctrl+Enter để điền; sau khi điền có thanh tiến độ tím/vàng, danh sách chỗ cần xem lại (Xem, ✓ Đúng), các trường đã điền thu gọn, nút mở tab Chỉ định/Đơn thuốc, hoàn tác. Cột cao vừa nội dung, không còn khoảng trắng thừa. Chữ đã nói vẫn giữ trong ô sau khi điền; nói hoặc gõ thêm thì nút đổi thành "Điền thêm vào phiếu".
  - `EformScreen`: tiêu đề trái, tab gạch chân, chú giải cùng hàng; thanh dưới gom về một hàng, nút Lưu xanh kèm số chỗ còn cần xem lại. Đổi tên tab "Phiếu khám ngoại trú" → "Phiếu khám" (tiêu đề trang đã ghi đủ).
  - `ChiDinhTab`, `DonThuocTab`, `LichSuBlock`, `IcdField`, các khối gợi ý, `BaoCaoDialog`: cùng màu và kiểu bảng mới; dòng AI điền trong bảng có vạch tím/vàng ở ô đầu.
  - `MicButton` (dùng chung): thêm tùy chọn `onStop` và `giaoDien` (lớp CSS và nhãn nút). Không truyền thì giữ kiểu cũ, nên trang `/` không đổi.
- **Lý do:** Chủ dự án chưa ưng giao diện `/eform`: trông thô, luồng dùng khó hiểu, cột Trợ lý AI nghèo nàn, quá giống EMR cũ. Đã chọn giữ cấu trúc phiếu để bác sĩ vẫn nhận ra, chỉ làm mới trình bày và luồng duyệt AI.
- **File:** `config/theme.json`, `src/app/globals.css`, `src/client/chung/MicButton.tsx`, `src/client/eform/{EformScreen,EformHeader,TroLyAi,EformForm,fields,IcdField,LichSuBlock,ChiDinhTab,DonThuocTab,GoiYTheoChanDoan,GoiYIcdPanel,MauCauPanel,BaoCaoDialog}.tsx`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint`, `npm run build` sạch. Chạy `next dev` với `LLM_PROVIDER=mock`, mở bằng playwright ở 1440×900: `/eform` bấm "kiểu nói" → Điền vào phiếu: 14 trường, 3 cần xem lại, 3 chỉ định, 2 thuốc; bấm Xem cuộn đúng tới ô Chẩn đoán ban đầu; bấm ✓ Đúng tại trường thì cột AI và nút Lưu cùng giảm còn 2; tab Chỉ định, Đơn thuốc hiện đúng gợi ý theo chẩn đoán và cảnh báo dị ứng Augmentin. Khổ 390px: không cuộn ngang, header không che phiếu. Trang `/` vẫn như cũ. Console không lỗi. Chưa thử ghi âm thật qua micro (trạng thái đang nghe có viền đỏ).
- **Ảnh hưởng:** Không đổi logic điền, khớp danh mục hay eval. Ai đang dùng lớp `emr-*` trong nhánh khác phải đổi sang `ef-*`.

### Bật plugin `frontend-design` cho dự án
- **Loại:** Cấu hình
- **Thay đổi:** `.claude/settings.json` thêm `frontend-design@claude-plugins-official` vào `enabledPlugins`. Plugin này có skill thiết kế giao diện (chọn bảng màu, kiểu chữ, bố cục, tự chụp màn hình kiểm tra), Claude dùng khi làm lại giao diện. CLAUDE.md thêm tên plugin vào mục "Plugin dùng trong dự án".
- **Lý do:** Chủ dự án chưa ưng giao diện `/eform` và muốn có skill cải thiện giao diện. Trước đây plugin chỉ bật ở cấu hình cá nhân trên một máy; khai báo ở cấp dự án để đồng đội clone repo về cũng có.
- **File:** `.claude/settings.json`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Skill `frontend-design:frontend-design` gọi được trong phiên Claude Code. Không ảnh hưởng code ứng dụng.

### Tái cấu trúc: tách FE (`src/client`), BE (`src/server`), dùng chung (`src/shared`)
- **Loại:** Dọn dẹp, Phụ thuộc, Cấu hình, Tài liệu
- **Thay đổi:**
  - Vẫn một app Next, chỉ chuyển file (bằng `git mv`, giữ lịch sử). `app/` → `src/app/`; `components/` → `src/client/` chia theo trang (`chung/`, `workspace/`, `eform/`, `ket-qua/`); `lib/llm/`, `pipeline.ts`, `prompt.ts`, `schema.ts`, `asr.ts` → `src/server/ai/`; `lib/config.ts`, `sessions.ts`, `lib/eform/load.ts` → `src/server/du-lieu/` (`load.ts` đổi tên thành `eform.ts`); `types`, `normalize`, `match`, `validate`, `metrics` và phần còn lại của `lib/eform/` → `src/shared/`; `lib/workspace.ts` → `src/client/workspace/trang-thai.ts`. `tsconfig.json`: `@/*` trỏ vào `./src/*`.
  - Thêm `src/shared/api.ts`: kiểu request/response của `/api/extract`, `/api/sessions`, `/api/asr` và hằng `ASR_SAMPLE_RATE`, `ASR_MAX_SECONDS`. Trước đây `MicButton.tsx` chép lại hai hằng này và kiểu kết quả ASR ("khớp với lib/asr.ts"), client lấy `PipelineResult` từ file server; giờ cả hai phía dùng chung một chỗ. Route `/api/asr` dùng `satisfies` để bắt lệch kiểu.
  - Thêm `src/client/api.ts` (`goiAiDienNhap`, `luuLuotThu`): gom đoạn `fetch` `/api/extract` đang lặp ở `Workspace.tsx` và `TroLyAi.tsx`, và `fetch` `/api/sessions`. Thông báo lỗi giữ nguyên như cũ; khác duy nhất là server trả về không phải JSON thì hiện thông báo mặc định thay cho lỗi `SyntaxError`.
  - `countFields` chuyển từ `metrics.ts` sang `client/workspace/trang-thai.ts` vì nó đếm trên trạng thái màn hình (`RowsState`); `metrics.ts` giờ không phụ thuộc giao diện.
  - Chặn import sai chiều: thêm `import "server-only"` (phụ thuộc mới `server-only` 0.0.1) ở `server/ai/pipeline.ts`, `server/ai/llm/index.ts`, `server/ai/asr.ts`, ba file `server/du-lieu/`; `eslint.config.mjs` thêm `no-restricted-imports`: `src/client` không import `src/server`, `src/server` không import `src/client`, `src/shared` không import React, Next, `node:*` hay hai thư mục kia.
  - `npm run eval` đổi thành `tsx --conditions=react-server scripts/eval.ts` (không có cờ này thì `server-only` báo lỗi ngoài Next). `scripts/eval.ts` import theo `@/`.
  - Sửa chú thích còn nhắc đường dẫn cũ (`globals.css`, `sherpa-onnx-node.d.ts`, `shared/eform/goi-y.ts`, `shared/eform/types.ts`, `_ghi_chu` trong `data/eform/goi-y-theo-chan-doan.json`).
  - Tài liệu mới `docs/cau-truc-du-an.md`: sơ đồ thư mục, chiều import, AI nằm ở đâu (AI thật ở `src/server/ai/`, AI bằng rule ở `src/shared/eform/`), luồng chính, bảng thành phần dùng lại được, thêm mới thì đặt ở đâu, cách tách hai app sau này. README: viết lại "Cấu trúc thư mục", đổi `lib/match.ts` → `src/shared/match.ts`. CLAUDE.md: viết lại "Kiến trúc nhanh".
- **Lý do:** Chủ dự án yêu cầu tách BE riêng, FE riêng, rõ AI đặt ở đâu và cái gì dùng lại được. Chọn một app chia thư mục thay vì hai app riêng (monorepo) vì hai app phải chạy hai server, xử lý CORS và đổi `/eform` sang gọi API, tốn công mà prototype chưa cần; ranh giới hiện tại đủ để tách sau.
- **File:** `src/**` (toàn bộ file chuyển từ `app/`, `components/`, `lib/`), `src/shared/api.ts`, `src/client/api.ts`, `src/client/workspace/Workspace.tsx`, `src/client/workspace/trang-thai.ts`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/EformScreen.tsx`, `src/client/chung/MicButton.tsx`, `src/shared/metrics.ts`, `src/server/ai/{asr,pipeline}.ts`, `src/server/ai/llm/index.ts`, `src/server/du-lieu/{config,eform,sessions}.ts`, `src/app/api/asr/route.ts`, `src/app/api/asr/[id]/route.ts`, `src/app/globals.css`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `scripts/eval.ts`, `data/eform/goi-y-theo-chan-doan.json`, `docs/cau-truc-du-an.md`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint`, `npm run build` sạch (đủ 8 route). Thử file tạm import sai chiều: lint báo đủ 4 lỗi (client → server, shared → react, `node:fs`, client), rồi xóa file. `npm run eval -- --rule-only` ra **giống hệt từng dòng** với bản trước khi chuyển (so bằng worktree ở commit `27e2625`): Phiếu khám nói 97,1% / gõ tắt 98,1%, Chỉ định nói 92,9% / gõ tắt 100%, Đơn thuốc nói 99,1% / gõ tắt 98,1%. Chạy `next dev` với `LLM_PROVIDER=mock`, mở bằng playwright: `/eform` bấm Câu mẫu (nói) → Điền vào phiếu: 14 trường, 3 cần xem lại, 3 chỉ định, 2 thuốc, nút 🎤 nhận chế độ Zipformer (`/api/asr` trả `sanSang: true`); `/` chọn ca 1 gõ tắt → AI điền nháp → Xác nhận: "Đã lưu lượt thử", file trong `data/sessions/` đúng số đếm (đã xóa file thử); `/ket-qua` tải được. Console không lỗi. Chưa thử ghi âm thật qua micro.
- **Ảnh hưởng:** Không đổi hành vi hay điểm eval. Ai đang có nhánh sửa file ở `app/`, `components/`, `lib/` sẽ bị xung đột khi gộp: git nhận ra file đổi tên, nhưng đường dẫn import phải sửa theo bảng trên. Dev server đang chạy phải khởi động lại (đã xóa `.next/` cũ). Script mới cần import code server thì chạy bằng `tsx --conditions=react-server`.

## 2026-11-10

### Nhận dạng giọng nói trên máy bằng Zipformer (`ASR_PROVIDER=zipformer`)
- **Loại:** Tính năng, Phụ thuộc, Cấu hình
- **Thay đổi:**
  - Thêm phụ thuộc `sherpa-onnx-node` (2.0.1, kèm gói native `sherpa-onnx-win-x64`), khai báo `serverExternalPackages` trong `next.config.ts` để Node nạp trực tiếp file `.node`.
  - `scripts/tai-model-giong-noi.ts` + lệnh `npm run tai-model-giong-noi`: tải `sherpa-onnx-zipformer-vi-30M-int8-2026-02-09` (~26 MB, từ release công khai của k2-fsa/sherpa-onnx, gốc là model hynt/Zipformer-30M-RNNT-6000h) và `silero_vad.onnx` về `models/`, giải nén bằng `tar` có sẵn. Đã có thì bỏ qua.
  - **Chữ hiện ra trong lúc nói như Web Speech** dù model là loại không streaming, bằng cách nhận dạng hai lớp trong một phiên (`lib/asr.ts`, lớp `PhienNhanDang`): trình duyệt gửi mẩu âm thanh mỗi 0,4 giây; khi VAD thấy đang có tiếng nói thì nhận dạng lại phần câu đang nói dở để trả **chữ tạm**; khi Silero VAD thấy ngắt nghỉ ≥ 0,5 giây (câu tối đa 20 giây) thì nhận dạng cả câu và trả **câu chốt**. Chữ in hoa của model được đổi sang chữ thường, viết hoa chữ đầu, thêm dấu chấm cuối câu. `OfflineRecognizer` tạo một lần (2 luồng CPU, greedy search). Phiên giữ trong bộ nhớ server, tối đa 10 phút, bỏ sau 60 giây không nhận thêm âm thanh; âm thanh không được ghi ra file. `lib/sherpa-onnx-node.d.ts` khai báo kiểu tối thiểu vì gói không kèm `.d.ts`.
  - API: `GET /api/asr` trả chế độ đang dùng và model đã sẵn chưa; `POST /api/asr` mở phiên, trả `id`; `POST /api/asr/[id]` nhận PCM 16-bit mono 16 kHz (mỗi mẩu ≤ 10 giây), trả `{ chot, tam }`; `DELETE /api/asr/[id]` chốt câu cuối và xóa phiên.
  - `components/MicButton.tsx`: hỏi `GET /api/asr`; chế độ `zipformer` (`ZipformerMic`) thu âm bằng AudioWorklet ở 16 kHz (trình duyệt không hỗ trợ thì hạ mẫu bằng nội suy), gửi mẩu theo hàng đợi đúng thứ tự, hiện chữ tạm in nghiêng dưới nút và đưa từng câu chốt vào ô nhập qua `onText` như Web Speech. Nút hiện đồng hồ, "Đang mở micro…", "Đang chốt câu cuối…". Web Speech cũ giữ nguyên thành `WebSpeechMic`; chọn `zipformer` mà chưa có model thì tự dùng Web Speech và báo dưới nút. Dùng chung cho trang chính và `/eform`.
  - (Bản đầu trong cùng ngày làm kiểu ghi âm xong mới nhận dạng; chủ dự án yêu cầu phải vừa nói vừa hiện chữ nên đổi sang phiên như trên, bỏ API nhận cả đoạn.)
  - `.env.example` thêm `ASR_PROVIDER=web` (mặc định). `.gitignore` thêm `/models`.
  - README: viết lại phần "Nhập giọng nói", thêm script và thư mục vào cấu trúc. CLAUDE.md: thêm lệnh `tai-model-giong-noi`.
- **Lý do:** Chủ dự án thử Web Speech thấy nghe kém, yêu cầu dùng Zipformer. Thêm lợi ích: âm thanh không gửi lên Google.
- **File:** `package.json`, `package-lock.json`, `next.config.ts`, `lib/asr.ts`, `lib/sherpa-onnx-node.d.ts`, `app/api/asr/route.ts`, `app/api/asr/[id]/route.ts`, `components/MicButton.tsx`, `scripts/tai-model-giong-noi.ts`, `.env.example`, `.gitignore`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run tai-model-giong-noi` tải và giải nén được (sửa lỗi GNU tar của Git Bash hiểu `D:\…` là máy từ xa bằng cách chạy tar trong thư mục `models/`). Chạy model trên 3 file mẫu kèm model: 1,6–3,7 giây âm thanh nhận dạng trong 31–57 ms, đúng nội dung. Script tạm mô phỏng trình duyệt: ghép 3 file kèm 1 giây im lặng, gửi vào phiên từng mẩu 0,4 giây: chữ tạm dài dần sau mỗi mẩu ("Rồi cũng hỗ" → "Rồi cũng hỗ trợ" → …), mỗi lần 20–60 ms; câu chốt ra 0,5–0,8 giây sau khi dứt lời, đúng 3 câu có dấu chấm; kết thúc phiên thì phiên bị xóa. **Chưa thử qua trình duyệt và Next** vì dev server của chủ dự án đang chạy ở cổng 3000 (Next 16 không cho chạy server thứ hai cùng thư mục), cần khởi động lại để nạp `next.config.ts` và `.env.local` mới. **Chưa đo độ chính xác với câu tóm tắt TMH** (tên thuốc, thuật ngữ) so với Web Speech.
- **Ảnh hưởng:** Mặc định vẫn là `web`, không đổi gì nếu không đặt `ASR_PROVIDER`. Người kéo repo về muốn dùng Zipformer phải chạy `npm run tai-model-giong-noi`. Chữ tạm của Zipformer cập nhật theo nhịp 0,4 giây (Web Speech mượt hơn một chút); chữ tạm và câu chốt có thể khác nhau ít (ví dụ "tivi" / "tv") vì câu chốt được nhận dạng lại trên đoạn đã cắt.

### Gợi ý chỉ định và đơn thuốc theo chẩn đoán trên `/eform`
- **Loại:** Tính năng, Giao diện, Dữ liệu, Cấu hình
- **Thay đổi:**
  - Thêm khung "✨ Gợi ý theo chẩn đoán" (`components/eform/GoiYTheoChanDoan.tsx`) ở đầu tab Chỉ định dịch vụ và tab Đơn thuốc. Khung đọc mã ICD10 đang chọn (ra viện → ban đầu → kèm theo), tìm bộ mẫu khớp, liệt kê theo từng chẩn đoán kèm ô tích. Bác sĩ tích chọn rồi bấm "Thêm N mục đã chọn"; không có gì tự thêm. Mục đã có trong danh sách hoặc trùng gợi ý phía trên bị làm mờ. Thuốc cùng nhóm dị ứng không tích sẵn, có cảnh báo đỏ. Tab Đơn thuốc có thêm nút "Chèn vào Lời dặn" cho lời dặn mẫu. Chưa có mã ICD hoặc chưa có bộ mẫu thì hiện hướng dẫn.
  - Tên tab Chỉ định / Đơn thuốc hiện ✨ khi có gợi ý (`EformScreen.tsx`), để bác sĩ đang ở phiếu khám biết.
  - Dữ liệu `data/eform/goi-y-theo-chan-doan.json`: 12 bộ mẫu giả phủ 22/28 mã ICD của trang eForm, chưa có H81.1, J32.9, J33.9, J34.2, R04.0, T17.1 (viêm tai giữa cấp/mạn, viêm tai ngoài, nút ráy, dị vật tai, nghe kém/ù tai, viêm xoang cấp, viêm mũi dị ứng, viêm họng, viêm amidan, khàn tiếng, trào ngược). Chỉ ghi tên; `lib/eform/goi-y.ts` (`khopBoMau`) gán mã bằng `matchCatalog` của `lib/match.ts` lúc nạp trang (`lib/eform/load.ts`), khớp chưa chắc thì dòng là "xem". `chonBoMau` chọn bộ mẫu theo mã, không lặp.
  - Tách kiểm tra dị ứng ra `lib/eform/di-ung.ts` (`trungDiUng`) để đơn thuốc và gợi ý dùng chung; `DonThuocTab.tsx` gọi hàm này thay cho bản cũ trong file.
  - `lib/eform/types.ts`: `EformData` thêm `goiY`; sửa chú thích provider có `gemini`.
  - `.gitignore` thêm `/.playwright-mcp` (ảnh chụp và snapshot plugin playwright tạo ra khi kiểm tra giao diện).
  - README: thêm mô tả gợi ý theo chẩn đoán, file dữ liệu mới và module mới. CLAUDE.md: thêm gợi ý theo chẩn đoán vào mô tả `lib/eform/`.
- **Lý do:** Chủ dự án chọn làm tiếp phần gợi ý theo chẩn đoán. Quan sát thực địa: bác sĩ tìm dịch vụ chỉ định lâu (có ca ~23 phút), phải mở hồ sơ bệnh nhân khác để tra; màn chỉ định thật đã biết chẩn đoán nhưng không dùng để gợi ý.
- **File:** `components/eform/GoiYTheoChanDoan.tsx`, `components/eform/ChiDinhTab.tsx`, `components/eform/DonThuocTab.tsx`, `components/eform/EformScreen.tsx`, `lib/eform/goi-y.ts`, `lib/eform/di-ung.ts`, `lib/eform/load.ts`, `lib/eform/types.ts`, `data/eform/goi-y-theo-chan-doan.json`, `.gitignore`, `README.md`, `docs/CHANGELOG.md`, `CLAUDE.md`
- **Kiểm tra:** `npx tsc --noEmit` và `npm run lint` sạch. Script tạm nạp `loadEformData()`: cả 12 bộ mẫu khớp đủ mã dịch vụ/thuốc, mọi mã ICD trong bộ mẫu có trong `data/eform/icd10.json`. Mở `/eform` trên Chrome 1536 px, chế độ `gemini`: trước khi điền, khung hiện hướng dẫn chưa có ICD; bấm Câu mẫu (nói) → Điền vào phiếu (ICD H66.3, kèm theo J30.4) → hai tab hiện ✨; tab Đơn thuốc có 2 nhóm, Ciprofloxacin/Paracetamol "Đã có", Augmentin không tích và cảnh báo dị ứng Penicillin, 3 thuốc viêm mũi dị ứng tích sẵn; bấm Thêm → đơn 5 thuốc, Fexofenadin tổng 14; Chèn lời dặn → nút thành "Đã chèn"; tab Chỉ định: 3 dịch vụ H66.3 "Đã có", gợi ý thêm Nội soi mũi xoang. Console không lỗi. Chưa thử màn hình hẹp.
- **Ảnh hưởng:** Không đổi pipeline hay điểm eval (chỉ trang `/eform`). Liều trong bộ mẫu là minh họa, cần thay bằng dữ liệu bác sĩ đưa trước khi demo với bác sĩ.

### Thêm nhà cung cấp LLM `gemini`
- **Loại:** Tính năng, Phụ thuộc, Cấu hình
- **Thay đổi:**
  - Thêm `lib/llm/gemini.ts` dùng SDK `@google/genai` (bản 3.0.0): gửi system prompt qua `systemInstruction`, ép JSON bằng `responseMimeType: application/json` + `responseJsonSchema` (dùng chung schema với Anthropic/OpenAI). Báo lỗi rõ khi thiếu key/model, khi Gemini chặn yêu cầu (`blockReason`, `SAFETY`) hoặc bị cắt do hết token. Timeout 90 giây như hai provider kia.
  - Đăng ký `gemini` trong `lib/llm/index.ts`, nên tự có kiểm tra schema bằng zod và thử lại 1 lần như các provider khác. `npm run eval -- --provider=gemini` chạy được.
  - `.env.example` thêm `GEMINI_API_KEY`, `GEMINI_MODEL` (bắt buộc điền tên model, không đặt sẵn vì tên model Gemini đổi thường xuyên).
  - README: thêm dòng `gemini` vào bảng "Đổi nhà cung cấp AI" và phần cấu trúc thư mục. CLAUDE.md: thêm `gemini` vào lệnh eval tốn phí và sơ đồ kiến trúc. Sửa chú thích trong `lib/schema.ts` và `scripts/eval.ts`.
- **Lý do:** Chủ dự án chốt dùng LLM bên ngoài cho prototype vì thời gian có hạn, và định dùng API key Gemini.
- **File:** `lib/llm/gemini.ts`, `lib/llm/index.ts`, `lib/schema.ts`, `scripts/eval.ts`, `package.json`, `package-lock.json`, `.env.example`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit` và `npm run lint` sạch. Gọi thử 1 lượt câu nói mẫu của ca 11 qua `runPipeline`: `gemini-3.5-flash` nhận nguyên schema (`anyOf` với `null`, `additionalProperties: false`), mất 10,3 giây, ra 10 trường phiếu khám, 3 chỉ định, 2 thuốc, chẩn đoán đúng ý. `gemini-3.8-flash` trả lỗi 503 (quá tải) lúc thử. Chọn `gemini-3.5-flash` cho `.env.local`. Chưa chạy eval đầy đủ.
- **Ảnh hưởng:** Không đổi hành vi khi `LLM_PROVIDER` là `mock`, `anthropic` hay `openai`. Điểm eval không đổi.

### Cào danh mục thật (ICD-10, dịch vụ kỹ thuật, thuốc) về `data/tham-khao/`
- **Loại:** Dữ liệu, Tính năng
- **Thay đổi:**
  - Thêm `scripts/cao-du-lieu.ts` và lệnh `npm run cao-du-lieu` (`--bo-thuoc` để bỏ phần thuốc). Script tải CodeSystem của HL7 Vietnam VN Core IG và gọi API tra cứu số đăng ký công khai của Cục Quản lý Dược, lọc phần TMH, ghi ra `data/tham-khao/`.
  - `icd10-tmh.json`: 433 mã ICD-10 bản 2026 (TT 06/2026/TT-BYT) nhóm tai, mũi họng, thanh quản, u đầu cổ, dị vật... bao trùm cả 28 mã đang dùng ở `data/eform/icd10.json`.
  - `dich-vu-ky-thuat-tmh.json`: 486 kỹ thuật theo TT 23/2024/TT-BYT (toàn bộ chương 15 và phần liên quan của chẩn đoán hình ảnh, nội soi, thăm dò chức năng, xét nghiệm, phẫu thuật nội soi).
  - `thuoc-hoat-chat.json`: 960 mã hoạt chất (QĐ 7603/QĐ-BYT). `thuoc-luu-hanh-tmh.json`: 4.914 thuốc còn hiệu lực số đăng ký của 58 hoạt chất hay kê ở TMH, tối đa 100 thuốc mỗi hoạt chất.
  - `data/tham-khao/README.md` ghi nguồn, phạm vi lọc và giới hạn; `nguon.json` ghi ngày cào và số mục.
  - README: thêm `data/tham-khao/` và script vào phần cấu hình và cấu trúc thư mục. CLAUDE.md: thêm lệnh vào "Lệnh thường dùng".
- **Lý do:** Chủ dự án yêu cầu lên mạng lấy dữ liệu bệnh TMH, thuốc và dịch vụ chỉ định về thư mục data. Để riêng ở `data/tham-khao/` vì `data/catalog/` được ứng dụng tự nạp: thay vào đó sẽ đổi mã khớp danh mục và làm sai `expected` của 11 ca eval (đang dùng mã giả `DV-TMH-*`, `TH-*`).
- **File:** `scripts/cao-du-lieu.ts`, `package.json`, `data/tham-khao/{icd10-tmh,dich-vu-ky-thuat-tmh,thuoc-hoat-chat,thuoc-luu-hanh-tmh,nguon}.json`, `data/tham-khao/README.md`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npm run cao-du-lieu` chạy hết không lỗi; `npm run lint` sạch. Soi tay: không còn thuốc lọt do API tìm theo chuỗi con (Levofloxacin dưới "Ofloxacin", Desloratadin dưới "Loratadin", Esomeprazol dưới "Omeprazol", Methylprednisolon dưới "Prednisolon"); đã loại 2 kỹ thuật lọc nhầm ("xoang hang", "u não vòm sọ"). Chưa chạy eval vì ứng dụng không đọc dữ liệu mới.
- **Ảnh hưởng:** Không đổi hành vi ứng dụng hay điểm eval. Dữ liệu là danh mục công khai, không có thông tin bệnh nhân. HL7 Vietnam ghi chú tái phân phối bản chuẩn hóa cần phê duyệt trước khi dùng production.

### Trang `/eform` giống màn EMR, cột Trợ lý AI điền cả phiếu, chỉ định và đơn thuốc
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Giao diện `/eform` theo màn EMR thật (đối chiếu 2 ảnh chụp trong `temp-1/` và `docs/cau-truc-phieu-kham-ngoai-tru.md`): header có logo và dải cam "Bệnh án điện tử", Menu, dòng PID có nhãn giới và dị ứng, Xem LSKB, tiêu đề "Phiếu khám ngoại trú", thanh mục xanh đậm, ô chỉ đọc màu xám, font Arial, thanh đáy xanh gồm 7 nút trạng thái và các nút Quay lại / Báo cáo y tế / In ngay / Lưu. Bảng lịch sử có thêm nút Copy từng dòng. Thanh header của prototype ẩn trên trang này.
  - Thêm cột phải "✨ Trợ lý AI điền phiếu" (`components/eform/TroLyAi.tsx`): nói (mic) hoặc gõ tắt → `/api/extract` (pipeline có sẵn của trang chính) → điền 14 trường phiếu khám, chỉ định và đơn thuốc. Có danh sách trường đã điền với nút "xem →", đánh dấu "✓ Đúng", hoàn tác.
  - Thêm 2 tab Chỉ định dịch vụ (`ChiDinhTab.tsx`) và Đơn thuốc (`DonThuocTab.tsx`): sửa từng dòng, chọn lại khi khớp chưa chắc, thêm từ danh mục, tổng số lượng tự tính, cảnh báo thuốc cùng nhóm dị ứng.
  - `lib/eform/dien-phieu.ts`: đổ kết quả AI vào phiếu. Không ghi đè ô bác sĩ đã nhập; mã ICD10 do code chấm điểm gán (không từ LLM), luôn đánh dấu "cần xem lại"; hẹn tái khám tự tính ngày từ thời gian khám.
  - Thêm nguồn `xem` (AI chưa chắc) vào `lib/eform/types.ts`, màu vàng. Màu AI trên trang này đổi sang tím để không lẫn với xanh/cam của EMR.
  - `config/theme.json` thêm màu `emr_*`, `ai_tim`, `xem`; `app/globals.css` thêm token tương ứng.
  - `lib/eform/load.ts` nạp thêm danh mục dịch vụ/thuốc, quy tắc tính tổng, chế độ AI và câu mẫu.
  - Thêm ca mẫu `data/cases/ca-11-viem-tai-giua-man-dot-cap.json` (cùng bệnh nhân giả của trang eForm, dị ứng Penicillin nên đơn không có kháng sinh nhóm penicillin) để chế độ mock demo được đầy đủ.
  - README: viết lại phần "Mô phỏng eForm ngoại trú", số ca eval 10 → 11, giải thích khóa màu mới.
- **Lý do:** Chủ dự án muốn trang eForm giống EMR để bác sĩ dễ làm quen, khác ở chỗ AI điền hộ để bác sĩ thao tác ít nhất; đã chọn bố cục "cột trợ lý AI bên phải" trên mockup.
- **File:** `app/globals.css`, `components/Header.tsx`, `components/eform/{EformScreen,EformHeader,TroLyAi,ChiDinhTab,DonThuocTab,fields,EformForm,IcdField,LichSuBlock,GoiYIcdPanel,MauCauPanel,BaoCaoDialog}.tsx`, `lib/eform/{dien-phieu,types,load}.ts`, `config/theme.json`, `data/cases/ca-11-viem-tai-giua-man-dot-cap.json`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit` và `npm run lint` sạch. Mở `/eform` trên Chrome (1536 px): bấm Câu mẫu → Điền vào phiếu ra 14 trường, 3 trường vàng (ICD H66.3, H66.3, J30.4), 3 chỉ định và 2 thuốc khớp danh mục, Paracetamol tổng 15; "xem →" cuộn đúng ô; thêm Augmentin hiện cảnh báo dị ứng; điền thêm "Chỉ định nội soi." thành 4 dịch vụ (dòng mới màu vàng, có ô chọn lại); Hoàn tác về 3. Không có lỗi console. Chưa thử trên màn hình hẹp và chưa thử với LLM thật.
- **Ảnh hưởng:** Eval có 11 ca thay vì 10. Rule-only trước/sau: Phiếu khám nói 96,8% → 97,1%, gõ tắt 97,9% → 98,1%; Chỉ định nói 91,7% → 92,9%; Đơn thuốc nói 99,5% → 99,1%. Mock vẫn 100%.

### Quy ước: thông tin nhạy cảm để trong `temp-1/`
- **Loại:** Tài liệu
- **Thay đổi:**
  - Làm sạch `docs/tham-khao/`: tên tác giả (5 chỗ) → "tác giả (học viên thực tập)"; "người Nga", "hộ chiếu Nga", "tiếng Nga" (9 chỗ) → "nước ngoài" hoặc "ngôn ngữ trên hộ chiếu".
  - Bản gốc đầy đủ từ Claude Project chuyển vào `temp-1/vinmec-project/`: 10 file `.md`, gồm `context-thuc-tap-vinmec.md`, và `vinmec-project-docs.json` (chuyển từ `D:\Download\`).
  - Thêm quy tắc vào `CLAUDE.md` và ghi chú trong `docs/tham-khao/README.md`.
- **Lý do:** Chủ dự án yêu cầu: cái gì nhạy cảm thì ghi vào `temp-1/`.
- **File:** `docs/tham-khao/bao-cao-tuan-1-phan-1-2.md`, `docs/tham-khao/bao-cao-tuan-1-phan-4.md`, `docs/tham-khao/nhat-ky-day-du-tmh.md`, `docs/tham-khao/nhat-ky-quay-tiep-don-tmh.md`, `docs/tham-khao/README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** grep tên tác giả và chữ "Nga" trong `docs/tham-khao/*.md` không còn kết quả; `git status` không liệt kê `temp-1/`.

### Đưa tài liệu quan sát từ Claude Project "Vinmec" vào repo
- **Loại:** Tài liệu
- **Thay đổi:**
  - Thêm 5 file vào `docs/tham-khao/`: `nhat-ky-day-du-tmh.md`, `nhat-ky-day-du-tmh-tuan-2.md`, `nhat-ky-quay-tiep-don-tmh.md`, `bao-cao-tuan-1-phan-1-2.md`, `bao-cao-tuan-1-phan-4.md`. Nội dung giữ nguyên, chỉ sửa đường dẫn `claude/...` cho trỏ đúng vị trí trong repo.
  - Thêm `docs/tham-khao/README.md`: mục lục, thời gian quan sát, phần app liên quan, lưu ý dữ liệu.
  - `CLAUDE.md` trỏ tới `docs/tham-khao/`.
  - Không chép: `context-thuc-tap-vinmec.md` (hồ sơ cá nhân và tên người phụ trách CAIR, để ở `temp-1/` ngoài git), file HTML `vinmec-ai-sprint-ban-2.html` (1,7 MB) và 21 ảnh JPG.
  - Không thay 4 file đã có trong `docs/`: `cau-truc-phieu-kham-ngoai-tru.md` giống hệt bản trên project, các file còn lại là bản đã làm sạch (bỏ tên mentor, sửa đường dẫn).
- **Lý do:** Chủ dự án muốn tài liệu trong Claude Project dùng được khi làm việc trong repo.
- **File:** `docs/tham-khao/*.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Rà bằng grep tên người, PID, số điện thoại, email: không có thông tin bệnh nhân. Mọi liên kết `.md` trong `docs/tham-khao/` trỏ tới file có thật.

### Thiết lập Claude Code: plugin, quy tắc và bắt buộc ghi tài liệu
- **Loại:** Cấu hình
- **Thay đổi:**
  - Thêm `CLAUDE.md`: quy tắc dự án cho Claude (ghi tài liệu mọi thay đổi, chỉ dữ liệu giả, mã danh mục chỉ do code gán, đọc docs Next 16 trước khi code), lệnh thường dùng, kiến trúc nhanh. File này nạp `AGENTS.md`.
  - Thêm skill `ghi-tai-lieu` (`.claude/skills/ghi-tai-lieu/SKILL.md`): mẫu mục CHANGELOG và bảng "đổi gì thì cập nhật tài liệu nào".
  - Thêm hook `Stop` (`.claude/hooks/check-docs.mjs`): khi Claude định kết thúc lượt, nếu còn file không phải tài liệu (ngoài `docs/`, `*.md`, `.claude/`) được sửa sau lần cập nhật `docs/CHANGELOG.md` gần nhất thì chặn lại và yêu cầu ghi tài liệu. Chỉ nhắc một lần mỗi lượt để tránh lặp.
  - Bật 5 plugin ở phạm vi project trong `.claude/settings.json`:
    - `typescript-lsp`: Claude thấy lỗi kiểu và nhảy định nghĩa trong TS/TSX. Cần cài `npm i -g typescript-language-server typescript` (đã cài trên máy này, bản 6.0.3).
    - `playwright`: mở trình duyệt để xem thật các trang `/`, `/eform`, `/ket-qua` sau khi sửa giao diện.
    - `security-guidance`: cảnh báo lỗ hổng (XSS, lộ secret, injection) khi sửa code; phù hợp vì app gọi API LLM và xử lý nội dung y tế.
    - `claude-md-management`: rà soát và cập nhật `CLAUDE.md` khi quy ước thay đổi.
    - `commit-commands`: lệnh `/commit`, `/commit-push-pr` cho git.
  - Các plugin đã có sẵn ở phạm vi người dùng và vẫn dùng được: `superpowers`, `context7` (tra docs Next 16, Tailwind 4, SDK), `frontend-design`, `andrej-karpathy-skills`, `document-skills`.
- **Lý do:** Yêu cầu từ chủ dự án: cài plugin/skill phù hợp, đặt quy tắc cho Claude và mọi thay đổi nhỏ nhất đều phải có tài liệu.
  - `README.md`: thêm `docs/`, `.claude/` vào phần cấu trúc thư mục và trỏ tới `docs/CHANGELOG.md`, `CLAUDE.md`.
- **File:** `CLAUDE.md`, `README.md`, `.claude/settings.json`, `.claude/hooks/check-docs.mjs`, `.claude/skills/ghi-tai-lieu/SKILL.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chạy thử hook bằng `echo '{}' | node .claude/hooks/check-docs.mjs`: trả về `decision: block` khi `.gitignore` sửa mà chưa ghi; trả về rỗng khi `stop_hook_active: true`.

### Bỏ qua thư mục `temp-1/` và `.superpowers/` khỏi git
- **Loại:** Cấu hình
- **Thay đổi:** Thêm `/temp-1` và `/.superpowers` vào `.gitignore`.
- **Lý do:** `temp-1/` là thư mục làm việc tạm và chứa thông tin nhạy cảm. `.superpowers/` chứa mockup nháp khi thiết kế lại giao diện `/eform` cho giống EMR.
- **File:** `.gitignore`
- **Kiểm tra:** `git status` không còn liệt kê `temp-1/` hay `.superpowers/`.
