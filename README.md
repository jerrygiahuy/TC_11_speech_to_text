# CardioNote – Prototype phiếu khám ngoại trú

> **CardioNote** là prototype trợ lý điền Phiếu khám ngoại trú và Chỉ định dịch vụ cho **Trung tâm Tim mạch** (100% Tim mạch, không còn nội dung Tai Mũi Họng; test `src/shared/khong-con-tmh.test.ts` chặn lại). Bác sĩ nói hoặc gõ tắt, máy che thông tin cá nhân, AI (mặc định `mock`) điền nháp, bác sĩ sửa, lưu, duyệt và in. Hồ sơ dùng schema `2.0.0`; hồ sơ schema `1.x` (bản Tai Mũi Họng cũ) bị từ chối.
>
> **Dữ liệu TC-11:** bộ 60 ca giả lập nằm tại [data/cardiology](data/cardiology/README.md). Danh mục chính thức của Trung tâm Tim mạch chưa được nạp: ICD-10, dịch vụ, thuốc đều là danh mục mock (xem mục "Cấu hình khác" ở phần Thêm hoặc sửa trường form).

**Luồng CardioNote:** chọn lượt khám (hoặc từ `/dashboard`) → gõ hội thoại hoặc ghi âm → bộ che PII → AI mock điền nháp → bác sĩ **Áp dụng**, sửa → **Lưu** → **Duyệt** → **In**. Thiếu thông tin thì để trống, không nút nào được chọn.

**Chạy trên macOS (không có PowerShell):** `npm run stt:setup` và `stt:start` là PowerShell nên làm tay: `uv venv --python 3.12 .venv-stt`, `uv pip install --python .venv-stt/bin/python -r stt/requirements-lock.txt`, tải model bằng `.venv-stt/bin/python -m stt.download_model` (cùng `download_diarization`, `download_vad`), rồi `PYTHONUTF8=1 HF_HUB_OFFLINE=1 .venv-stt/bin/python -m uvicorn stt.api:app --host 127.0.0.1 --port 8765` và `npm run dev`. Mô hình NER PhoBERT chưa có nếu chưa huấn luyện, khi đó bộ che PII chạy bằng rule.

**Luồng hiện tại (17/11/2026):** STT → máy chủ che PII tự động (R1–R14, chốt chặn R11) → AI tạo JSON phiếu khám và chỉ định → bác sĩ sửa, lưu, duyệt và in. **Kê đơn ngoài scope**, do bác sĩ làm riêng. Hướng dẫn đầy đủ: [docs/CLINICAL-WORKFLOW.md](docs/CLINICAL-WORKFLOW.md). Sơ đồ draw.io hai luồng chính (nói → phiếu khám, gõ tắt) và bước lọc dữ liệu nhạy cảm R1–R14: [docs/so-do/luong-chinh.drawio](docs/so-do/luong-chinh.drawio). Mở bằng app.diagrams.net hoặc draw.io desktop. eForm và `/demo-luong` cùng gọi một hàm che `chePii` (`src/shared/clinical/pii/pipeline.ts`); `/stt` chỉ nhận dạng giọng nói, không che. Thử nhanh một câu hay một file transcript qua đúng hàm đó: `npm run thu-che-pii -- "câu cần thử"` hoặc `npm run thu-che-pii -- --file temp-1/x.txt`.

## Demo luồng dữ liệu (`/demo-luong`)

Mở **[http://localhost:3000/demo-luong](http://localhost:3000/demo-luong)** để trình diễn trọn luồng: ① ghi âm (micro, file WAV hoặc kịch bản mẫu trong `data/demo-luong/kich-ban/`) → ② bản thô (tô đỏ, rê chuột thấy mã rule) → ③ bản đã che tự động (nhãn xanh, chốt chặn R11; còn sót thì tự che thêm rồi kiểm lại, xem kịch bản `ca-tu-che`) → ④ AI (mock) → ⑤ phiếu đọc lại từ kho để bác sĩ sửa và duyệt. Một phiếu có nhiều phiên ghi âm; "+ Phiếu khám mới" mở phiếu khác. Công tắc **Bác sĩ / Lãnh đạo | Kỹ thuật**: chế độ Kỹ thuật mở chi tiết từng bước (đếm theo rule, nguyên văn dữ liệu gửi AI, phiên bản rule/prompt/schema, JSON phiếu, dòng nhật ký). Bản thô chỉ nằm trong bộ nhớ trình duyệt; dữ liệu chạy lưu ở `data/demo-luong/` (gitignore), nút "Xóa dữ liệu demo" xóa sạch. Nguồn micro/WAV cần dịch vụ STT local (`npm run stt:start`).

## Đăng ký giọng bác sĩ (`/giong-bac-si`)

Mở **[http://localhost:3000/giong-bac-si](http://localhost:3000/giong-bac-si)** (mục "Giọng bác sĩ" trên thanh menu), bấm **Bắt đầu thu**, đọc đoạn mẫu khoảng 30 giây, bấm dừng. STT backend tạo đặc trưng giọng TitaNet và chỉ lưu dãy số đó ở `data/giong-bac-si/<mã bác sĩ>.json` (gitignore), không lưu âm thanh; nút "Xóa giọng đã đăng ký" xóa file. Mã bác sĩ do máy chủ xác định (actor demo `user_bs01`). Sau đó, mỗi lần ghi âm trên eForm, khi dừng máy so giọng Người nói 1/2 với giọng đã đăng ký (giống ≥ 0,6 và hơn giọng kia ≥ 0,15) để gắn BS/BN; chưa đăng ký hoặc không khớp rõ thì đoán theo nội dung lời nói. Cần `npm run stt:start`. Đặc trưng giọng là dữ liệu sinh trắc học: chỉ đăng ký giọng của chính mình. Chi tiết: [docs/STT.md](docs/STT.md) mục "Đăng ký giọng bác sĩ".

## Lớp NER che PII (mặc định bật)

Một mô hình PhoBERT-base fine-tune trên PhoNER_COVID19 chạy local, đứng sau bộ rule R1–R8, để bắt thêm tên người, địa danh, tổ chức mà rule bỏ sót. Lớp này chỉ được thêm đoạn che, không gỡ đoạn nào. Thiết kế: [2026-11-18-ner-phobert-design.md](docs/superpowers/plans/pending/2026-11-18-ner-phobert-design.md); plan: [2026-11-18-ner-phobert.md](docs/superpowers/plans/pending/2026-11-18-ner-phobert.md). Cần JDK (OpenJDK 21) và `JAVA_HOME` cho bộ tách từ VnCoreNLP (GPL-3.0).

**Tải dữ liệu huấn luyện.** PhoNER_COVID19 của VinAI chỉ được dùng cho nghiên cứu hoặc giáo dục, không phân phối lại dưới mọi hình thức, và phải trích dẫn bài NAACL 2021 ("COVID-19 Named Entity Recognition for Vietnamese") khi công bố kết quả. Dự án là nghiên cứu (xác nhận ngày 18/11/2026). Lệnh dưới đây in điều khoản và chỉ tải khi có cờ đồng ý. Dữ liệu được ghim commit và mã băm, lưu ở `models/ner/phoner-covid19/` (gitignore), kèm `nguon.json`:

```bash
npm run ner:tai-du-lieu -- --dong-y-giay-phep
```

**Huấn luyện (một lần, trên CPU).** Môi trường riêng `.venv-ner-train` có torch bản CPU; `.venv-stt` không bao giờ có torch:

```bash
npm run ner:setup-train
```

```bash
npm run ner:train -- --probe-steps 50
```

```bash
npm run ner:train
```

Lệnh đầu tạo môi trường. Lệnh thứ hai đo thời gian dự kiến: trên Core Ultra 5 225H ra 1,79 giây/bước, 629 bước/epoch, nên 5 epoch mất khoảng 1,6 giờ, chưa tính đánh giá sau mỗi epoch. Lệnh thứ ba huấn luyện thật. Trong lúc huấn luyện:
- cắm sạc, đóng bớt server để có khoảng 4 GB RAM trống;
- không tắt máy, không khởi động lại, không gập nắp. Script tự chặn chế độ ngủ khi máy rảnh trong lúc chạy, nhưng chọn Sleep bằng tay thì máy vẫn ngủ.

Checkpoint lưu sau mỗi epoch ở `models/ner/checkpoints/`. Bị ngắt thì chạy `npm run ner:train -- --resume`, chỉ mất tối đa một epoch.

Kết quả nằm ở `models/ner/phobert-phoner/`: `model.int8.onnx` (khoảng 135 MB), `tokenizer.json`, `labels.json` và `meta.json` (F1, ngưỡng, sha256). Mô hình không được phát hành ra ngoài vì giấy phép PhoNER. Lần huấn luyện ngày 18/11/2026 mất 1 giờ 46 phút (5 epoch). F1 theo thực thể trên tập test là 0,956 với chữ gốc và 0,933 với bản viết thường kiểu STT. Ngưỡng điểm là 0,3.

Hai điều chỉnh khi chuẩn bị dữ liệu:
- PhoNER chỉ gắn nhãn `NAME` cho tên bệnh nhân. Script gắn lại `NAME` cho tên người đầy đủ (viết hoa mọi âm tiết, bắt đầu bằng họ trong `ho-viet.ts`).
- Mỗi câu có thêm bản viết thường, bỏ dấu câu, được tách từ lại bằng VnCoreNLP cho giống chữ STT lúc chạy.

**Bật, tắt NER.** NER bật mặc định từ 18/11/2026 (không đặt `PII_NER` cũng là bật); muốn tắt thì đặt `PII_NER=off` trong `.env.local`. Cần chạy STT (`npm run stt:start`; terminal phải có `JAVA_HOME`, nếu không `/health` vẫn báo `ner_ready` nhưng lời gọi đầu `/ner` sẽ lỗi và máy chủ chỉ che bằng rule); dịch vụ STT phục vụ `POST /ner` khi có mô hình ở `models/ner/phobert-phoner/` (`/health` báo `ner_ready`). Máy chủ Next gọi NER trước khi che (chờ tối đa `PII_NER_TIMEOUT_MS`, mặc định 2000 ms); STT không chạy, NER lỗi, quá giờ hay tắt thì che bằng rule như cũ và nhật ký R13 ghi `ner.trang_thai`. eForm và `/demo-luong` (chế độ Kỹ thuật) hiện một dòng "NER: đã chạy (n đoạn) / không chạy, chỉ dùng rule / tắt". Thử một câu: `npm run thu-che-pii -- --ner "câu"`.

## Thử nghiệm STT local từ P-018

Mở **[http://localhost:3000/stt](http://localhost:3000/stt)** để thử model **Zipformer tiếng Việt INT8**, chạy CPU qua sherpa-onnx. Trang này có phiên micro liên tục, trả văn bản dần trong lúc nói, tải file âm thanh và thời gian suy luận. Phần STT được tách riêng từ P-018; không mang theo TTS, LLM, tin nhắn hay điều khiển xe.

Trong PowerShell tại thư mục dự án:

```powershell
# Máy này đã được cài dependency và tải trọng số trong lần tách code.
# Chạy lại sau khi khởi động máy hoặc khi dịch vụ đã dừng:
npm run stt:start

# Cài đầy đủ trên máy mới: cần Python 3.12+ và Node.js 20.12+.
npm run stt:setup
```

`stt:setup` tạo `.venv-stt`, cài thư viện theo `stt/requirements-lock.txt`, tải riêng model STT tại revision cố định và chạy nhận dạng file mẫu thật. Cần internet khi cài/tải lần đầu. Sau đó, nhận dạng chạy local, không cần API key, GPU hoặc internet.

`stt:start` chạy backend ở `127.0.0.1:8765` và Next.js ở `127.0.0.1:3000` dưới nền. Có thể chạy lại lệnh để dùng dịch vụ đang hoạt động. Log và PID nằm trong `logs/`. Nếu đã chạy Next.js bằng `npm run dev`, chỉ cần khởi động backend:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-stt.ps1 -BackendOnly
```

Micro cần Chrome/Edge, localhost hoặc HTTPS và quyền micro. Phiên micro không có giới hạn thời gian: âm thanh được tách tại khoảng nghỉ hoặc tối đa mỗi 5 giây, trả text dần và nối theo thứ tự. Bấm “Kết thúc phiên” để dừng micro và nhận nốt các đoạn còn lại. File tải lên không giới hạn thời lượng/dung lượng ở ứng dụng, hỗ trợ WAV/MP3/M4A/WebM/Ogg/FLAC tùy bộ giải mã của trình duyệt. Trình duyệt đổi âm thanh sang WAV PCM16 mono 16 kHz trước khi gửi tới backend. Âm thanh và văn bản chỉ nằm trong bộ nhớ; không ghi lịch sử bản thu.

Thêm thuật ngữ bằng cách sửa `config/stt-hotwords.json`, đặt danh sách trong `phrases` (xem ví dụ trong docs/STT.md). Danh sách áp dụng từ đoạn nhận dạng tiếp theo, không cần huấn luyện lại. Đã tích hợp phân biệt 2 giọng và gắn từ theo timestamp: nhãn Người nói 1/2 giữ trong phiên. Trên eForm, dừng ghi thì nhãn tự đổi thành BS/BN (so giọng bác sĩ đã đăng ký ở `/giong-bac-si`, hoặc đoán theo nội dung lời nói). Text tạm thời được sửa/ghép lại khi nhận thêm âm thanh, nên một lượt nói 8 giây bị gửi thành 5+3 giây vẫn hiển thị liền mạch.

File mẫu có sẵn tại `models/stt/zipformer-vi/test_wavs/` sau khi setup. Chi tiết nguồn code, API, kiểm thử, chạy thủ công và giới hạn: **[docs/STT.md](docs/STT.md)**.

Bác sĩ **nói** hoặc **gõ tắt** một đoạn tóm tắt; AI tách ra và điền nháp **Phiếu khám và Chỉ định dịch vụ** sau bước kiểm tra riêng tư; bác sĩ duyệt, sửa rồi xác nhận.

> **Chỉ dùng dữ liệu giả, không nhập thông tin bệnh nhân thật.**
> **Danh mục thật (ICD-10, kỹ thuật, thuốc lưu hành) chỉ để tham khảo; danh mục bệnh viện, liều thuốc và bộ mẫu là dữ liệu minh họa. Không dùng cho lâm sàng.**

## Cài đặt và chạy

Cần Node.js 20.12 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:3000 bằng Chrome: trang đầu là **Mô phỏng eForm ngoại trú** (link cũ `/eform` tự chuyển về đây). Thanh trên cùng có link sang **Kết quả thử nghiệm** (`/ket-qua`). Mặc định chạy chế độ `mock`, không cần internet hay API key.

## Đổi nhà cung cấp AI

Sao chép `.env.example` thành `.env.local`, rồi sửa:

| `LLM_PROVIDER` | Cần thêm | Ghi chú |
|---|---|---|
| `mock` (mặc định) | Không | Câu trùng ca mẫu trả kết quả soạn sẵn, câu khác tách bằng quy tắc đơn giản. Dùng làm dự phòng khi demo. |
| `anthropic` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Trả JSON theo schema, sai schema thì thử lại 1 lần. |
| `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` | Trả JSON theo schema, sai schema thì thử lại 1 lần. |
| `gemini` | `GEMINI_API_KEY`, `GEMINI_MODEL` | Key lấy ở Google AI Studio. Trả JSON theo schema (`responseJsonSchema`), sai schema thì thử lại 1 lần. Key miễn phí nên đặt `GEMINI_MODEL=gemini-3.5-flash-lite` (khoảng 2–3 giây/lượt). Gemma 4 (`gemma-4-31b-it`, `gemma-4-26b-a4b-it`) mất 75–85 giây/lượt và hay lỗi 500. `gemini-3.8-flash` với mức suy nghĩ mặc định bị 504 sau khoảng 90 giây. |

Các trang `/dashboard`, `/benh-nhan/...` và API `/api/clinic/*` chỉ kiểm header Host/Origin/Sec-Fetch-Site (chặn trình duyệt gọi chéo origin và DNS rebinding); client không phải trình duyệt tự đặt được Host nên không bị chặn. Muốn máy khác trong mạng không vào được, chạy `npx next dev -H 127.0.0.1` (đừng dùng `-H 0.0.0.0`), nhưng hãy mở trang bằng `localhost`: eForm gọi guard của lớp clinical và báo "Nguồn yêu cầu không hợp lệ" nếu truy cập bằng `127.0.0.1`.

Dashboard (`/dashboard`) và hồ sơ bệnh nhân (`/benh-nhan/<PID>`) đọc phiếu khám thật của lớp clinical (`data/clinical/encounters`) cùng 4 phiếu cũ giả trong `data/clinic/history/` (tạo lại bằng `npm run tao-du-lieu-tim-mach`). Lịch, bệnh nhân và danh bạ nằm ở `data/clinic/`, cùng định danh với `data/eform/encounter-contexts.json`; lịch chỉ mở được phiếu khi có ngữ cảnh khám tương ứng. Từ popup lịch hẹn hoặc màn bệnh nhân bấm "Mở phiếu khám" để sang eForm đúng bệnh nhân; "Xem phiếu" ở lịch sử mở toàn bộ phiếu cũ ở chế độ chỉ đọc. Bộ 8 ca dùng cho test nằm ở `data/clinic-test/`.

Khởi động lại `npm run dev` sau khi sửa `.env.local`. Header của ứng dụng hiện chế độ đang dùng.

## Nhập giọng nói

Nút micro trên **màn hình làm việc cũ** dùng Web Speech API của Chrome (`vi-VN`), chạy trên localhost. Trình duyệt không hỗ trợ thì nút 🎤 tự ẩn và chỉ còn ô gõ. Trang **`/stt`** ở trên dùng model Zipformer local riêng.
Có hai chế độ, chọn bằng `ASR_PROVIDER` trong `.env.local`:

| `ASR_PROVIDER` | Cách chạy | Ghi chú |
|---|---|---|
| `web` (mặc định) | Web Speech API của Chrome (`vi-VN`), hiện chữ ngay khi đang nói | **Gửi âm thanh lên Google, cần internet.** Trình duyệt không hỗ trợ thì nút 🎤 tự ẩn |
| `zipformer` | Trình duyệt gửi âm thanh mỗi 0,4 giây lên `/api/asr` của chính prototype; model Zipformer tiếng Việt (`csukuangfj/sherpa-onnx-zipformer-vi-int8-2025-04-20`, encoder ~70 MB, ở `models/stt/zipformer-vi/`, dùng chung với trang `/stt`) nhận dạng trên máy. Đang nói thì hiện chữ tạm (in nghiêng dưới nút); ngắt nghỉ ~0,5 giây thì Silero VAD chốt câu và đưa vào ô | **Âm thanh không ra khỏi máy và không được lưu**, không cần internet. Tối đa 10 phút mỗi lần bấm |

Bật `zipformer`:

```bash
npm run tai-model-giong-noi   # tải Zipformer ~70 MB về models/stt/zipformer-vi/ (kiểm SHA-256) và Silero VAD về models/; không đưa lên git, đã có thì bỏ qua
```

rồi thêm `ASR_PROVIDER=zipformer` vào `.env.local` và khởi động lại `npm run dev`. Chưa tải model thì nút 🎤 tự quay về Web Speech và báo dưới nút.

Model Zipformer bản tiếng Việt là loại không streaming (nghe hết một đoạn mới nhận dạng), nên chữ tạm có được là nhờ nhận dạng lại phần câu đang nói dở sau mỗi mẩu; mỗi lần chỉ mất vài chục mili giây. Model trả chữ in hoa, không dấu câu; server đổi sang chữ thường, viết hoa chữ đầu và thêm dấu chấm cuối mỗi câu chốt. Gói `sherpa-onnx-node` là gói native, được khai báo ở `serverExternalPackages` trong `next.config.ts`.

### Sửa chữ sau nhận dạng

Mỗi câu chốt (cả Zipformer lẫn Web Speech) đi qua `src/shared/giong-noi/sua-chu.ts` trên trình duyệt trước khi vào ô nhập. Bảng sửa ở `config/sua-chu-giong-noi.json`, sửa rồi tải lại trang là có hiệu lực:

| Khóa | Làm gì |
|---|---|
| `thay` | Thay cụm hay nghe nhầm: `sai` (các cách nghe nhầm) thành `dung`. Có `tru_khi_truoc`, `tru_khi_sau` (từ ngay trước/sau thì không thay: "có thai" giữ nguyên) và `chi_khi_sau` (chỉ thay khi từ sau là một trong các từ này: "suốt" thành "sốt" chỉ khi sau là "nhẹ", "cao", số). Áp theo thứ tự trong file |
| `tu_chuyen_khoa` | Tên thuốc: `dung` là tên chuẩn ghi vào ô, `doc` là cách bác sĩ đọc bằng âm tiết tiếng Việt ("pa ra xê ta mon"). So gần đúng sau khi bỏ dấu và gộp âm gần nhau (x/s, d/gi/r, ph/f…) |
| `nguong_giong` | Độ giống tối thiểu để thay tên thuốc (0,72; thấp hơn thì bắt đầu sửa nhầm câu đúng) |
| `dau_hieu_thuoc` | Tên thuốc chỉ được thay khi trong 4 từ phía sau có một từ này hoặc một con số, hoặc từ ngay trước là "đơn", "thuốc", hoặc hai từ ngay trước là "dị ứng" (nên "dị ứng pen xi lin" thành "dị ứng Penicillin", còn "phản ứng pen xi lin" giữ nguyên). Thiếu điều kiện này thì một cụm từ thường nói có âm gần giống tên thuốc bị thay nhầm thành tên thuốc |

Cuối cùng số đọc thành chữ được đổi sang chữ số khi đứng trước đơn vị (ngày, lần, viên, mg, độ…) hoặc là số nhiều chữ: "năm trăm mi li gam" thành "500 mg", "ba mươi tám phẩy năm độ" thành "38,5 độ". "hai bên", "một ít", "năm nay" giữ nguyên.

### Đo nhận dạng giọng nói

```bash
npm run tao-am-thanh-mau     # Windows: giọng máy đọc 11 ca thành data/giong-noi/<id>.tts.wav
npm run eval-giong-noi       # thêm --chi-tiet để in từng câu, --nhan-lai để nhận dạng lại từ đầu
npm run thu-che-pii -- "câu" # thử bộ che PII dùng chung (eForm, /demo-luong); --file đường/dẫn.txt để thử cả file
```

Mỗi file `.wav` trong `data/giong-noi/` đi qua đúng luồng VAD của ứng dụng rồi được so với câu `input_noi` của ca cùng id. Script in cho chữ thô và chữ sau khi sửa: **WER** (tỉ lệ từ sai, so cả dấu, số đổi thành chữ ở hai phía), **Mã** (số mã dịch vụ, mã thuốc bộ tách quy tắc vẫn ra đúng so với khi tách câu gốc), **Liều** (số dòng thuốc có liều, số lần/ngày, số ngày trùng câu gốc), và **Sửa nhầm trên câu gốc** (bộ sửa chạy trên câu đúng mà đổi mất bao nhiêu từ, nên bằng 0). Chữ thô được lưu cạnh file âm thanh nên chỉnh bảng sửa rồi chạy lại chỉ mất vài giây. Cách tự ghi âm để đo bằng giọng thật: `data/giong-noi/README.md`.

Kết quả trên giọng máy ngày 2026-11-11: WER 21,4% thành 10,5%, Mã 7/42 thành 22/42, Liều 0/24 thành 11/24, sửa nhầm 0. **Giọng máy khác người thật**, nên các số này chỉ để so trước và sau một lần sửa. Hotword của sherpa-onnx (ưu tiên cụm từ ngay lúc giải mã) đã thử với `modified_beam_search` nhưng không thấy tác dụng trên model này, nên chưa dùng.

**Dù dùng chế độ nào, chỉ dùng với dữ liệu giả.**

## Thêm hoặc sửa trường form

**Luồng mới:** sửa `config/clinical/*.schema.json`, chạy `npm run clinical:types` và `npm run clinical:check`. Các config/forms và eval bên dưới là bộ thử pipeline cũ, không còn là hợp đồng endpoint trích xuất hiện tại.

`clinical:check` phần thứ hai gọi `python3 docs/task-2/verify.py` và cần gói Python `jsonschema`. Nếu thiếu, lệnh báo `ModuleNotFoundError: jsonschema`. Phiên bản được ghim trong `stt/requirements-dev.txt` (`jsonschema==4.26.0`). Cài vào môi trường của dự án, không cài vào Python của máy: `uv pip install --python .venv-stt/bin/python -r stt/requirements-dev.txt`, rồi chạy `.venv-stt/bin/python docs/task-2/verify.py` (hoặc kích hoạt `.venv-stt` để `python3` trỏ vào đó rồi chạy `npm run clinical:check`). Lệnh không tự cài gói.

Các trường AI tách ra nằm trong JSON ở `config/forms/`. Schema gửi cho LLM, prompt, chế độ `mock` và eval đều sinh từ các file này.

**Giao diện eForm không sinh từ JSON.** Thêm trường mới vào JSON thì AI sẽ tách được ngay (thấy trong eval), nhưng muốn trường hiện trên phiếu thì phải nối thêm: trường phiếu khám vào bảng `ANH_XA` trong `src/shared/eform/dien-phieu.ts` và vào ô tương ứng ở `src/client/eform/EformForm.tsx`; cột chỉ định, thuốc vào `dienPhieu` và `ChiDinhTab.tsx` / `DonThuocTab.tsx`.

| File | Nội dung |
|---|---|
| `phieu-kham.json` | Các trường phiếu khám ngoại trú |
| `chi-dinh.json` | Các trường một dòng chỉ định |
| `ke-don.json` | Các trường một dòng thuốc |

Ví dụ thêm trường "Mạch" vào phiếu khám, chèn vào mảng `fields` của `phieu-kham.json`:

```json
{ "id": "mach", "label": "Mạch (lần/phút)", "type": "number", "required": false,
  "hint": "Chỉ điền khi bác sĩ nói", "ai_fill": true, "mock_keywords": ["mạch"] }
```

| Khóa | Ý nghĩa |
|---|---|
| `id` | Mã trường, không trùng trong một form |
| `label`, `hint` | Nhãn và gợi ý; `hint` cũng được đưa vào prompt cho LLM |
| `type` | `text`, `textarea`, `number`, `date`, hoặc `select` (kèm `"options": ["A", "B"]`) |
| `required` | Đánh dấu trường bắt buộc trong schema; giao diện eForm hiện chưa dùng khóa này |
| `ai_fill` | `false` thì AI không điền |
| `mock_keywords` | Không bắt buộc. Từ khóa để chế độ `mock` nhận ra phần này trong câu tự do. Dùng cụm cụ thể ("khám tim phổi"), không dùng từ trần ("tim") vì bộ tách cắt câu tại mọi từ khóa. Trường `ai_fill: false` có từ khóa chỉ là điểm dừng (cắt đoạn trước, bỏ nội dung), ví dụ `diem_dung_di_ung` trong `phieu-kham.json` |

Trường mã có thêm `catalog` (tên danh mục), `name_field` (trường tên) và `strength_field` (trường hàm lượng, nếu có) để pipeline biết khớp danh mục nào bằng trường nào. Không đặt `ai_fill: true` cho trường mã: mã chỉ được gán bởi code khớp danh mục ở `src/shared/match.ts`.

Các cấu hình khác:

- `config/viet-tat.json`: bảng từ viết tắt (đã bỏ các viết tắt TMH như NS, KD, NMSL; có THA, HA, ĐTĐ, ECG, RLLM, NMCT, BTTMCB, SAT). Khóa một chữ cái phân biệt hoa thường và phải đứng riêng thành từ.
- `config/canh-bao.json`: cách tính tổng số lượng thuốc (`tinh_tong`). Các khóa tuổi trẻ em, cân nặng là của cảnh báo trên trang cũ đã bỏ, hiện không dùng.
- `config/theme.json`: màu giao diện. Các khóa `ef_*` là màu của trang eForm (nền, viền, chữ, xanh thao tác chính, đỏ dị ứng), `ai_tim` là màu tím đánh dấu phần AI điền, `xem` là màu vàng đất "cần xem lại".
- Danh mục ứng dụng nạp từ `src/server/du-lieu/danh-muc.ts`, hiện chỉ có danh mục Tim mạch soạn tay (mock, mỗi mục có `"mock": true`):
  - `data/catalog/dich-vu.json`: 10 dịch vụ cận lâm sàng `DV-TM-001` đến `DV-TM-010`, có `ten_khac`.
  - `data/catalog/thuoc.json`: 9 thuốc đang dùng của bộ ca (mã `TH-TM-*`).
  - `data/eform/icd10.json`: 11 mã ICD-10 Tim mạch, mỗi mã có từ khóa `manh` và `vua` để gợi ý.
  - Danh mục Tim mạch hiện đều là mock (mỗi mục có `"mock": true`, không dùng trong lâm sàng); bộ lọc cào `scripts/cao-du-lieu.ts` vẫn là bộ lọc TMH cũ nên chưa dùng, việc cào lại danh mục Tim mạch thật để sau. Chưa có danh mục thật Tim mạch. `data/tham-khao/` (cào bằng `npm run cao-du-lieu`) không còn được nạp.
  - Mục soạn tay được đánh dấu `uu_tien` và khớp trước. Thứ tự khớp (`matchCatalog`): trùng tên hoặc tên khác → tìm mờ.

Lưu ý với file `ca-*.json` đã có: thêm trường mới thì nên bổ sung giá trị vào `expected` để điểm eval không bị tính là "Thừa".

## Thêm ca mẫu

Tạo file JSON mới trong `data/cases/`, chép từ một ca có sẵn:

```json
{
  "id": "ca-01-tang-huyet-ap",
  "ten": "Tên hiển thị của ca",
  "hanh_chinh": { "ho_ten": "Tên giả", "tuoi": 30, "gioi": "Nam", "can_nang": 60 },
  "input_noi": "Câu bác sĩ nói tự nhiên...",
  "input_go_tat": "Phiên bản gõ tắt...",
  "expected": {
    "phieu_kham": { "ly_do_kham": "...", "chan_doan_chinh": "..." },
    "chi_dinh": [ { "ma_dich_vu": "DV-TM-001", "ten_dich_vu": "Điện tim thường" } ],
    "ke_don": []
  }
}
```

Ca mới tự vào eval. Bộ có 10 ca Tim mạch (`ca-01-tang-huyet-ap` … `ca-10-kham-truoc-thu-thuat`), mỗi chẩn đoán chính một ca, dựng từ bản `COMPLETE` đầu tiên của nhóm trong `data/cardiology/synthetic-cases.jsonl`; `expected` theo bảng ánh xạ `handoff/claude/02-bang-anh-xa.md` (chỉ định và đơn thuốc để rỗng vì hội thoại không kê mới). Trang eForm chỉ dùng câu mẫu của `ca-01-tang-huyet-ap` (cùng bệnh nhân giả, nút "Thử câu mẫu"); `hanh_chinh` hiện không dùng. Trong `expected`, trường không được nói thì bỏ qua; với dòng khớp danh mục thì ghi đúng tên và mã theo danh mục.

## Đo lường

Kịch bản cho buổi thử với bác sĩ (gọi phiếu mẫu theo bệnh, một ca đọc cả đoạn để so sánh, số đo mẫu đúng sẵn, bảng ghi chép, câu hỏi sau buổi thử) ở `docs/kich-ban-thu-bac-si.md`.

Trên trang eForm, khi AI đã điền ít nhất một lần, lần bấm **Lưu** đầu tiên ghi một lượt thử thành file JSON trong `data/sessions/` (thông báo dưới đáy có câu "Đã ghi số đo lượt thử"). Bấm Lưu nữa thì không ghi thêm; muốn thử lượt mới thì tải lại trang. Chưa áp dụng AI thì không ghi metrics; hồ sơ clinical vẫn được lưu bình thường. File metrics chỉ chứa số đếm (thời gian, số trường AI điền, số trường sửa, số mục khớp danh mục, kiểu nhập), **không chứa nội dung phiếu hay thông tin bệnh nhân**.

Trang **Kết quả thử nghiệm** có bảng các lượt, số liệu trung bình và nút xuất CSV. Lượt dùng "Thử câu mẫu" không có thời gian nhập thật nên mặc định không tính vào số trung bình; có ô đánh dấu để tính cả.

- Thời gian: từ lúc bắt đầu nhập (gõ ký tự đầu, bấm 🎤 hoặc bấm câu mẫu) đến lúc bấm Lưu.
- Kiểu nhập: "Nói" nếu trong lượt có bấm 🎤 hoặc dùng câu mẫu kiểu nói, còn lại là "Gõ".
- AI điền: số trường phiếu khám AI điền cộng số dòng chỉ định, thuốc AI thêm (mỗi dòng tính một mục), cộng dồn qua các lần "Điền thêm".
- Đã sửa: trường AI điền mà bác sĩ đã sửa, cộng dòng AI thêm mà bác sĩ đã sửa hoặc xóa. Bấm "✓ Đúng" không tính là sửa.
- Bổ sung: ô bác sĩ tự gõ vào chỗ trống, cộng dòng bác sĩ tự thêm (kể cả chọn từ "Gợi ý theo chẩn đoán").
- Khớp danh mục: tính trên các dòng AI thêm, tại thời điểm AI điền, trước khi bác sĩ sửa.
- Cảnh báo: số chỗ còn "cần xem lại" lúc Lưu, cộng số thuốc trùng nhóm dị ứng.
- Hoàn tác lần AI điền thì số đếm của lần đó cũng bị trừ.
- Lượt ghi trước ngày 2026-11-11 đến từ trang "Màn hình làm việc" cũ (đã bỏ), cách đếm trên từng ô của form JSON nên không so trực tiếp được với lượt mới.

## Chấm điểm (eval)

```bash
npm run eval                          # dùng LLM_PROVIDER trong .env.local (mặc định mock)
npm run eval -- --rule-only           # chỉ chạy bộ tách bằng quy tắc, làm mốc so sánh
npm run eval -- --provider=anthropic  # chọn nhà cung cấp, tốn phí API (22 lượt gọi)
```

Script chạy cả 11 ca (bản nói và bản gõ tắt) qua pipeline, in độ chính xác theo từng phần và từng trường.

- **Chính xác = Đúng / (Đúng + Sai + Thiếu + Thừa).** Trường cả hai bên đều trống không được tính.
- **Thừa** là pipeline điền trường bác sĩ không nói, cần đặc biệt chú ý.
- Văn bản tự do được coi là đúng khi giống nhau từ 70% số từ trở lên **và** trùng khít các con số cùng bên phải/trái.
- Ở chế độ `mock`, ca mẫu trả kết quả soạn sẵn nên điểm gần 100% là đương nhiên, chỉ để kiểm tra pipeline. Muốn có số đo có ý nghĩa, hãy dùng `--rule-only` hoặc LLM thật.

### Đo phiếu mẫu (`npm run eval-mau`)

```bash
npm run eval-mau                       # mock: không tốn lượt gọi
npm run eval-mau -- --provider=gemini  # mức 2 gọi LLM thật, mỗi ca có mẫu 1 lượt
```

Chấm phiếu mẫu (`data/eform/phieu-mau.json`) so với `expected` của các ca có `mau_id` trong `data/cases/`, cùng cách chấm với `npm run eval` (phần chấm dùng chung ở `scripts/cham-diem.ts`). **Mức 1** là chỉ có mẫu, tức bác sĩ chỉ gõ tên mẫu. **Mức 2** là mẫu kèm câu chi tiết ngắn `input_mau` của ca (ví dụ `"vtg cấp trẻ em, tai P, 3n, sốt 38"`). Script in thêm số "không tính tiền sử", vì mẫu không điền tiền sử, ô đó bác sĩ Copy từ lần khám trước. Đây chỉ là **ước tính**: mẫu và đáp án đều do nhóm soạn, số thật phải đo khi bác sĩ thử.

### Chấm bộ che PII (`npm run eval-pii`)

Lệnh này chấm `chePii` trên hai nguồn:
- 60 câu giả kiểu chữ STT trong `data/pii-eval/cau-stt.json` (viết thường, không dấu câu, không có hồ sơ). Mỗi câu ghi `phai_che` và `khong_duoc_che`. Bộ câu cần bác sĩ duyệt và bổ sung.
- Các kịch bản `/demo-luong`, chấm theo `expected.phai_che` / `phai_giu`.

Kết quả in ra gồm tỷ lệ bắt được, số che nhầm và độ trễ p50/p95. Không tốn phí, không gọi LLM. Thêm `--ner` để so thêm với rule cộng NER (cần STT chạy, có mô hình); thêm `--chi-tiet` để liệt kê mã câu còn sót. Mốc ngày 18/11/2026, chỉ rule: câu STT bắt được 11/37 (29,7%), che nhầm 2/73; kịch bản bắt được 13/13. Rule cộng NER: câu STT bắt được 24/37 (64,9%), che nhầm vẫn 2/73; kịch bản vẫn 13/13, 0/8; p95 khoảng 23 ms với câu STT và 100 ms với kịch bản (khi STT đã nạp mô hình; lời gọi đầu mất khoảng 1 giây).

```bash
npm run eval-pii -- --ner
```

### Test (`npm test`)

`npm test` chạy các file `src/**/*.test.ts` và `lib/**/*.test.ts` bằng `node:test` qua `tsx` (không cần thư viện test riêng, có cờ `--conditions=react-server` nên test được cả code `src/server`). Test được import `node:*` kể cả trong `src/shared` (`eslint.config.mjs` tắt luật import cho `*.test.ts`).

## Mô phỏng eForm ngoại trú

Trang `/` có hai tab **Phiếu khám** và **Chỉ định dịch vụ**, dữ liệu giả. Giao diện theo Excel Phiếu khám ngoại trú Tim mạch (CardioNote): Đánh giá chung, Nơi giới thiệu, Lý do, Tiền sử, Dị ứng, Bệnh sử, **Thuốc đang dùng** (chưa hỏi thì không nút nào được chọn, có danh sách thuốc và nút **+ Thêm thuốc**, lưu cùng hồ sơ), Khám lâm sàng (Khám toàn thân, Khám chuyên khoa là ô chữ thường, **Khám tim mạch, hô hấp**; hai ô khám có nút **Mở thư viện tham khảo** lấy câu từ `data/cardiology/exam-library.json`, tick câu hoặc **Chọn tất cả** rồi **Chọn** để chèn thành các dòng `- ...`), Chẩn đoán, **Các xét nghiệm, thăm dò chính**. Bản in tách riêng **Chẩn đoán ban đầu** và **Chẩn đoán ra viện** (dòng trống thì bỏ), thêm Thuốc đang dùng và Khám tim mạch, hô hấp; sinh hiệu chưa đo hiện "chưa đo", BMI để trống khi thiếu chiều cao hoặc cân nặng. Trợ lý bên phải có bước lọc/xem lại transcript trước model và bước áp dụng bản nháp. Bác sĩ tự kê đơn trong quy trình riêng.

Trang chính mở theo **mã khám**: thanh **Lượt khám** ở đầu trang chuyển giữa các bệnh nhân (đang khám, chờ kết quả) hoặc mở mã khác; mỗi mã khám là một hồ sơ có nhiều phiên ghi âm. Nút **Lưu phiếu & chỉ định** ghi hồ sơ JSON có revision; **Tải bản lưu** và URL `?ho_so=...` khôi phục đúng hồ sơ. Duyệt theo từng phần (phiếu ban đầu, kết luận, tóm tắt, từng chỉ định); sửa phần nào chỉ phần đó cần duyệt lại. **Chờ kết quả**, **Tiếp tục khám**, **Hoàn tất lượt khám** đổi trạng thái lượt khám, tách khỏi việc duyệt. Đề xuất của AI hiện thành danh sách để bác sĩ chấp nhận hoặc từ chối từng mục. Chỉ in được khi mọi phần đã duyệt đúng bản đang lưu. Chuyển lượt khi phiếu chưa lưu hoặc còn nội dung chưa kiểm tra sẽ bị chặn hoặc hỏi lại.

Chi tiết endpoint, data model, riêng tư, nguồn dẫn, model và các giới hạn: [CLINICAL-WORKFLOW.md](docs/CLINICAL-WORKFLOW.md). Các nút kết nối hệ thống ngoài vẫn là mô phỏng. Mô tả eForm/pipeline cũ được giữ tại [tư liệu lịch sử](docs/legacy-eform-before-clinical.md).

## Config phiếu khám ngoại trú (Tim mạch) từ Excel

Trang riêng `/phieu-kham-ngoai-tru` (lưu JSON, API `/api/phieu-kham-ngoai-tru`) đã bỏ ngày 2026-11-20: phiếu khám đã gộp vào eForm chính `/`. Còn lại `config/forms/phieu-kham-ngoai-tru.json` là nguồn danh sách 49 trường gốc, dùng cho `excelKeys` / `EXCEL_MAP` (`src/shared/clinical/excel-coverage.ts`) qua `src/shared/phieu-kham-ngoai-tru/{types,config}.ts`.

- **Sinh lại fixture từ bộ 60 ca:** `npm run tao-du-lieu-tim-mach` sinh lại ngữ cảnh lượt khám (`data/eform/encounter-contexts.json`), lịch hẹn và 4 phiếu cũ giả từ `data/cardiology/synthetic-cases.jsonl`; thêm `-- --check` để chỉ so với file trên đĩa.
- **Sinh lại config từ Excel:** `python3 scripts/nhap-excel-phieu-kham.py "<file.xlsx>" config/forms/phieu-kham-ngoai-tru.json` (cần `pip install openpyxl`; đọc sheet `PhieuKhamNgoaiTru` của Excel "Danh sách field – Phiếu khám ngoại trú (Tim mạch)"). Thêm/sửa trường thì sinh lại JSON rồi cập nhật `excel-coverage.ts` nếu cần.

## Cấu trúc thư mục

```
config/         cấu hình form, màu, viết tắt, cảnh báo
data/catalog/   danh mục bệnh viện soạn tay (khớp trước danh mục thật)
data/cases/     ca giả
data/sessions/  kết quả các lượt thử (tự sinh, không đưa lên git)
data/thoi-quen/ đơn từng tài khoản bác sĩ đã Lưu, cho gợi ý theo thói quen (tự sinh, không đưa lên git)
data/giong-noi/ file âm thanh để đo nhận dạng giọng nói (tự sinh hoặc tự ghi, không đưa lên git, trừ README)
data/eform/     ca giả, danh mục và quy tắc của trang eForm
data/tham-khao/ danh mục thật cào từ nguồn công khai, ứng dụng nạp kèm data/catalog/
src/app/        trang và API (định tuyến Next, mỏng)
src/client/     giao diện chạy trên trình duyệt: chung/ (Header, MicButton), eform/ (trang chủ), trinh-dien/ (trang Trình diễn), ket-qua/, api.ts (gọi API)
src/server/ai/  AI thật: pipeline, prompt, schema, llm/ (mock, rules, anthropic, openai, gemini), asr.ts (Zipformer)
src/shared/phieu-kham-ngoai-tru/ kiểu và config của danh sách trường Excel (types.ts, config.ts), dùng cho excelKeys
src/server/du-lieu/ nạp config và data, lưu lượt thử và đơn đã kê, dữ liệu trang Trình diễn (trinh-dien.ts)
src/shared/     dùng chung hai phía: kiểu, khớp danh mục, chuẩn hóa, tính tổng, đo lường, api.ts (hợp đồng FE–BE)
src/shared/eform/ rule của trang eForm: tóm tắt, gợi ý ICD10, mẫu câu, gợi ý theo chẩn đoán và theo thói quen (thoi-quen.ts), cảnh báo dị ứng, đổ kết quả AI vào phiếu, đếm số đo lượt thử (do-luong.ts)
src/shared/giong-noi/ sửa chữ sau nhận dạng giọng nói (sua-chu.ts), đọc số thành chữ để chấm (so.ts)
scripts/eval.ts chấm điểm
scripts/eval-giong-noi.ts đo nhận dạng giọng nói trên data/giong-noi/
scripts/thu-che-pii.ts thử bộ che PII dùng chung chePii trên một câu hoặc file, chỉ in ra màn hình
scripts/tao-am-thanh-mau.ts (+ tts-windows.ps1) giọng máy Windows đọc các ca thành file âm thanh mẫu
scripts/cao-du-lieu.ts cào danh mục công khai về data/tham-khao/ (bộ lọc TMH cũ, chưa dùng)
scripts/tai-model-giong-noi.ts tải model Zipformer và Silero VAD về models/
models/         model nhận dạng giọng nói (tự tải, không đưa lên git)
docs/           quan sát thực địa, cấu trúc màn hình EMR, kịch bản thử với bác sĩ, CHANGELOG.md
.claude/        cấu hình Claude Code: plugin, hook, skill
```

Chi tiết ranh giới FE/BE, AI đặt ở đâu, cái gì dùng lại được và thêm mới thì đặt ở đâu: xem `docs/cau-truc-du-an.md`. `npm run lint` chặn import sai chiều (giao diện không được import `src/server`).

Mọi thay đổi đều được ghi trong `docs/CHANGELOG.md`. Quy tắc làm việc với Claude Code xem `CLAUDE.md`.
