# Thiết kế: lớp NER PhoBERT cho bộ che PII

Ngày 18/11/2026. Chỉ dùng dữ liệu giả trong repo. Dữ liệu huấn luyện PhoNER_COVID19 không vào repo.

## Bối cảnh và lý do

Bộ che hiện tại (`pii-auto-1`, `src/shared/clinical/pii/`) chỉ gồm regex và danh sách từ. Cả eForm (`src/server/clinical/privacy.ts`) và `/demo-luong` (`src/server/demo-luong/flow.ts`) đều gọi chung hàm `chePii`. Điểm yếu lớn nhất là dò tên người (R2, R11c):

- Tên phải có từ chỉ người đứng trước ("anh", "chị", "bé"…), hoặc đứng đầu câu và bắt đầu bằng họ phổ biến. Tên đứng một mình dễ lọt.
- Chữ thường trùng với họ ("cao", "hà", "lại") dễ bị che nhầm. Phần lớn danh sách từ dừng trong `redact.ts` sinh ra để vá hai lỗi này.

Mục tiêu là thêm một mô hình NER chạy local, hiểu ngữ cảnh, làm **lớp phụ** phía sau bộ rule, để bắt thêm tên người và địa danh mà rule bỏ sót, nhất là trong chữ STT viết thường, không có dấu câu.

Ngày 18/11/2026 người dùng xác nhận với hội đồng: dự án là **nghiên cứu, không thương mại hóa**. Vì vậy được dùng PhoNER_COVID19, bộ dữ liệu có giấy phép chỉ cho nghiên cứu hoặc giáo dục.

## Mục tiêu

- Fine-tune PhoBERT-base trên PhoNER_COVID19, chạy suy luận local trong dịch vụ `stt/` bằng ONNX Runtime.
- `chePii` nhận thêm các đoạn NER. Lớp NER **chỉ được thêm đoạn che, không được gỡ** đoạn nào bộ rule đã che. Chốt chặn R11 vẫn là lớp cuối.
- Có một bộ đo (`npm run eval-pii`) so rule đơn thuần với rule cộng NER. NER chỉ bật mặc định khi vượt qua điều kiện bật (D10).

## Không làm

- Không chạy NER trên trình duyệt và không gửi văn bản ra khỏi máy.
- Không thay thế hay nới bộ rule R1–R8 và chốt chặn R11.
- Không chạy NER theo từng câu STT trong lúc ghi âm (để giấu độ trễ). Sẽ làm sau nếu số đo cho thấy cần.
- Không dùng GPU, OpenVINO hay NPU. Không dùng PhoBERT-large.
- Không phát hành dữ liệu PhoNER hay trọng số đã fine-tune ra ngoài máy (Hugging Face, repo, file gửi kèm).

## Điều không được để xảy ra, dù vẫn "chạy được"

- NER che triệu chứng, bệnh, thuốc hay bộ phận cơ thể, làm AI mất nội dung lâm sàng ("viêm tai giữa", "hội chứng Ménière", "Kawasaki").
- NER lỗi hoặc tắt làm hỏng cả bước che, hoặc làm bản sạch kém hơn khi chỉ có rule.
- Văn bản thô hoặc đoạn PII lọt vào log của dịch vụ Python hay vào nhật ký R13.

## Ràng buộc

- Môi trường `.venv-stt` cố ý **không có torch** (`stt/requirements.txt`). Khi chạy chỉ được thêm `onnxruntime` và `tokenizers`.
- Máy đã cài Java (Microsoft OpenJDK 21, ngày 18/11/2026) để chạy bộ tách từ VnCoreNLP (giấy phép GPL-3.0). Java cần **cả lúc huấn luyện lẫn lúc chạy**, vì câu đưa vào mô hình phải được tách từ giống như dữ liệu huấn luyện. Máy không có GPU NVIDIA.
- RAM 16 GB, đang chia với Next, Zipformer, VAD, diarization và khử ồn. Lúc chạy, NER nên dùng dưới khoảng 600 MB.
- `start-stt.ps1` đặt `HF_HUB_OFFLINE=1`: khi chạy không được tải gì từ mạng. Mô hình được đặt sẵn bằng một script, theo mẫu các file `stt/download_*.py`.
- Giấy phép:
  - PhoNER_COVID19: chỉ nghiên cứu hoặc giáo dục, cấm phân phối lại, phải trích dẫn bài NAACL 2021 khi công bố.
  - `vinai/phobert-base` (v1): MIT.
  - `vinai/phobert-base-v2`: AGPL-3.0.

## Các cách đã cân nhắc

| Cách | Đánh đổi | Kết quả |
|---|---|---|
| PhoBERT-base + PhoNER_COVID19 | Dữ liệu thật do người gắn nhãn, có nhãn kiểu y tế (`NAME`, `PATIENT_ID`, `LOCATION`…). Nhưng là văn bản tin tức, khác giọng STT. Giấy phép chỉ cho nghiên cứu. | **Người dùng chọn** sau khi dự án chuyển sang nghiên cứu |
| PhoBERT-base + dữ liệu giả tự sinh | Giấy phép sạch, đúng giọng STT. Nhưng dễ học thuộc mẫu, độ chính xác trên câu lạ thấp hơn dữ liệu người gắn nhãn. | Bỏ vì không còn ràng buộc thương mại. Có thể trộn thêm sau như một bước tăng cường |
| GLiNER đa ngôn ngữ (Apache-2.0) | Không cần huấn luyện. Nhưng nặng (~1 GB RAM, 150–500 ms mỗi câu) và chưa ai đo với tiếng Việt viết thường. | Bỏ |

## Quyết định

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Mô hình gốc là `vinai/phobert-base` (v1, MIT). Tên mô hình gốc là một tham số của script huấn luyện, đổi sang v2 chỉ cần sửa một giá trị. | v2 tốt hơn một chút nhưng theo AGPL. Dùng v1 thì nếu sau này quay lại thương mại, không phải đổi giấy phép phần mô hình gốc. *(Tôi tự quyết.)* |
| D2 | Huấn luyện trên **bản theo từ** của PhoNER_COVID19 (`data/word/*`). Lúc chạy, văn bản được tách từ bằng RDRSegmenter của VnCoreNLP (giống cách VinAI tách dữ liệu), rồi vị trí từng từ được quy ngược về vị trí ký tự trên bản gốc. Không tách được từ (thiếu Java, bộ tách lỗi) thì coi như NER không chạy (D11), **không** đưa câu chưa tách vào mô hình. | PhoBERT được huấn luyện sẵn trên văn bản đã tách từ, nên bản theo từ cho kết quả tốt nhất. Người dùng yêu cầu cài Java để làm theo hướng này (18/11). |
| D3 | Script `stt/download_phoner.py` tải dữ liệu từ GitHub của VinAI về `models/ner/phoner-covid19/` (gitignore). Script **in điều khoản giấy phép** và chỉ chạy khi có cờ `--dong-y-giay-phep`. | Không phân phối lại dữ liệu. Người tải phải chủ động đồng ý điều khoản. |
| D4 | Huấn luyện **local trên CPU**, trong môi trường riêng `.venv-ner-train` (torch CPU, transformers, seqeval; khai báo ở `stt/requirements-ner-train.txt`). Script là `stt/ner_train.py`. Môi trường chạy `.venv-stt` không cài thêm torch. | Dữ liệu không rời máy, không cần tài khoản Colab. Ước tính 1–4 giờ, chưa đo. Script chạy thử khoảng 50 bước trước để in thời gian dự kiến. Lưu checkpoint sau mỗi epoch và chạy tiếp được từ checkpoint, nên máy bị tắt giữa chừng chỉ mất tối đa một epoch. Khi huấn luyện cần cắm sạc và đóng bớt server để có khoảng 4 GB RAM trống. |
| D5 | **Tăng cường dữ liệu cho giống STT:** mỗi câu huấn luyện có thêm một bản viết thường, bỏ dấu câu, nhãn giữ nguyên. Tập dev và test cũng có bản tương tự để đo. | PhoNER là văn bản báo chí có chữ hoa. Chữ STT của dự án viết thường. Chữ bác sĩ gõ thì có chữ hoa, nên giữ cả hai dạng. |
| D6 | Đầu ra huấn luyện: `models/ner/phobert-phoner/` gồm `model.int8.onnx`, `tokenizer.json`, `labels.json` và `meta.json`. `meta.json` ghi mô hình gốc, phiên bản dữ liệu, ngày, sha256 của file ONNX, và F1 trên test gốc lẫn test dạng STT. | Biết chính xác mô hình nào đang chạy và nó tốt tới đâu. |
| D7 | **Lúc chạy:** `stt/ner.py` dùng onnxruntime và tokenizers. Endpoint `POST /ner` nhận `{texts: string[]}` và trả về, cho từng văn bản, `[{start, end, nhan, diem}]` theo vị trí ký tự. Câu dài được cắt cửa sổ có chồng lấn. `/health` thêm trường `ner_ready`. Thiếu mô hình thì dịch vụ vẫn chạy, chỉ báo `ner_ready: false`. **Không log nội dung văn bản.** | Dùng lại dịch vụ local đã có. Mô hình nạp một lần khi khởi động. |
| D8 | **Lấy những nhãn nào:** `NAME` → `NGƯỜI` (R2); `LOCATION` → `ĐỊA_DANH` (R3); `ORGANIZATION` → `NƠI_LÀM_VIỆC`; `PATIENT_ID` → `MÃ_ĐỊNH_DANH` (R6). Bỏ `SYMPTOM_AND_DISEASE`, `TRANSPORTATION`, `OCCUPATION`, `DATE`, `AGE`, `GENDER`. | Không che nội dung lâm sàng. Ngày, tuổi, giới tính đã có rule chặt (R4, R7), để NER che thêm thì dễ mất mốc thời gian lâm sàng. Nghề nghiệp hiện cũng không che. *(OCCUPATION là chỗ tôi tự quyết.)* |
| D9 | **Gộp vào bộ che:** `chePii` nhận thêm tham số tùy chọn là các đoạn NER của từng phần văn bản. Các đoạn này được thêm **sau** mọi rule bằng hàm `add` sẵn có trong `redact.ts`: phần chồng lên đoạn đã che bị cắt, phần còn lại vẫn được che, nhãn đánh số như R10. Một đoạn NER bị bỏ nếu điểm dưới ngưỡng, nằm trọn trong allowlist lâm sàng (`clinicalAllowlist()` cộng `DEFAULT_CLINICAL_ALLOWLIST`), hoặc ngắn hơn 2 ký tự. Mỗi đoạn mang cờ `nguon: "ner"`. Không dùng mã R9, vì R9 đã có nghĩa "audio không rời máy chủ". | `chePii` vẫn là TypeScript thuần trong `src/shared`. Phía server gọi NER rồi truyền đoạn vào. Thứ tự "rule trước, NER sau" bảo đảm NER không thể làm mất đoạn rule đã che. Cả ba nơi gọi đều nhận NER: eForm (`PrivacyTickets.check` qua `bound-privacy.ts`, chuyển sang async), `/demo-luong` (`flow.ts`) và `npm run thu-che-pii` (cờ `--ner`), để kết quả thử giống hai trang. |
| D10 | **Bật hay tắt:** biến môi trường `PII_NER=off|on`, mặc định `off`. Chỉ đổi mặc định sang `on` khi bộ đo D12 cho thấy trên bộ kiểm tra viết tay: **tỷ lệ bắt được tăng** và **số lần che nhầm từ lâm sàng không tăng**. Ngưỡng điểm (D9) chọn trên tập dev và ghi vào `meta.json`. | Không đưa vào luồng chính một thứ chưa đo. |
| D11 | **Khi NER lỗi:** server gọi `/ner` với thời gian chờ tối đa (mặc định 2 giây). Lỗi, quá thời gian hay `ner_ready: false` thì vẫn che bằng rule như hiện tại. Nhật ký R13 thêm trường `ner: { trang_thai: "chay" | "khong_chay" | "tat", model_sha256?, so_doan? }`. Trường này không chứa nội dung. Phiên bản chính sách tăng lên `pii-auto-2` (rule giữ nguyên, có thêm lớp NER tùy chọn). | Lớp NER hỏng thì độ an toàn quay về đúng mức hiện nay, không kém hơn. Nhật ký cho biết lượt nào thiếu lớp NER. |
| D12 | **Bộ đo `npm run eval-pii`:** chạy trên hai nguồn. Một là bộ câu giả viết tay kiểu STT ở `data/pii-eval/*.json`, mỗi câu có `phai_che` và `khong_duoc_che` (từ lâm sàng dễ bị che nhầm). Hai là các ca `data/demo-luong/kich-ban/*.json` (`expected.phai_che`). In ra tỷ lệ bắt được, số lần che nhầm và độ trễ p50/p95, cho rule đơn thuần và cho rule cộng NER. Tôi soạn khoảng 60 câu đầu tiên; người dùng hoặc bác sĩ duyệt và bổ sung. Bộ câu này viết độc lập với PhoNER. | Thước đo là "tốt hơn rule trên chữ của dự án", không phải điểm F1 trên PhoNER. |
| D13 | **Kiểm thử:** test Node cho phần gộp đoạn NER (không gỡ đoạn rule; lọc theo allowlist và ngưỡng; nhãn đánh số đúng; không có NER thì kết quả giống hệt `pii-auto-1`). Test Python cho `/ner` (cắt cửa sổ, vị trí ký tự với chữ có dấu, không log nội dung, thiếu mô hình thì `ner_ready: false`). Test server cho trường hợp NER lỗi hoặc quá thời gian. | Khóa các bảo đảm ở D9 và D11. |
| D14 | **Tài liệu:** CHANGELOG; README (lệnh tải dữ liệu, huấn luyện, bật NER); `docs/STT.md` (endpoint `/ner`); `docs/DATA-USE-POLICY.md` (dự án là nghiên cứu, điều khoản PhoNER, trích dẫn, cấm phát hành trọng số); `.gitignore` (`/models/ner/`, `.venv-ner-train`). | Quy tắc bắt buộc của dự án. Bên đánh giá nghiên cứu cần biết nguồn gốc dữ liệu. |

## Để lại cho người xây

- Gọi VnCoreNLP thế nào: thư viện `py_vncorenlp` trong cùng tiến trình, hay một tiến trình Java riêng chỉ chạy tách từ. Chọn theo kết quả thử RAM và xung đột ở bước đầu tiên.
- Định dạng chính xác của file PhoNER (`.json` hay `.conll`) và cách đọc. Siêu tham số huấn luyện. Cách xuất ONNX và lượng tử hóa int8.
- Độ dài cửa sổ và độ chồng lấn khi cắt câu dài. Cách quy điểm từ token về đoạn.
- Cách nối Next với `/ner`: proxy trong `lib/stt/` hay gọi thẳng từ `src/server/`, miễn là chỉ server gọi.
- Đặt tên kiểu dữ liệu và chỗ hiện trạng thái NER trên giao diện. Cả hai trang chỉ cần một dòng ở phần chi tiết kỹ thuật hoặc trạng thái che: "NER: đã chạy / không chạy / tắt".

## Rủi ro

- **`onnxruntime` có thể xung đột DLL với `sherpa-onnx`** trong cùng `.venv-stt` trên Windows, vì sherpa-onnx tự mang bản onnxruntime riêng. Phải thử điều này **đầu tiên**, trước mọi việc khác. Nếu xung đột thì chạy NER trong một tiến trình hoặc môi trường riêng, như cách làm với `.venv-community`.
- **Khác giọng văn:** PhoNER là văn bản báo chí, còn chữ của dự án là lời nói qua STT. F1 trên PhoNER (bài báo ghi khoảng 0,9) sẽ không giữ được trên chữ STT. D5 và D12 giảm rủi ro này nhưng không loại bỏ nó.
- **Che thừa:** NER có thể gắn nhãn `NAME` hay `LOCATION` cho tên bệnh mang tên người hoặc tên địa danh. Allowlist lâm sàng (D9) và chỉ số "che nhầm" (D12) để bắt lỗi này.
- **Java lúc chạy tốn thêm RAM** (máy ảo Java cho bộ tách từ, ước tính vài trăm MB) và thêm một thành phần có thể hỏng. Bước thử đầu tiên phải đo cả RAM của onnxruntime cộng bộ tách từ.
- **Tách từ trên chữ STT viết thường, không có dấu câu** có thể kém hơn trên văn bản báo chí, kéo theo NER kém. Bộ đo D12 sẽ cho thấy điều này.
- **VnCoreNLP theo GPL-3.0:** dùng nội bộ cho nghiên cứu thì không sao. Nếu phát hành phần mềm có kèm VnCoreNLP thì phải theo điều khoản GPL.
- **RAM khi huấn luyện:** cần khoảng 4 GB trống, máy thường chỉ còn khoảng 2 GB.
- **Độ trễ trên lượt khám dài:** ước tính 1–2 giây cho khoảng 1.000 từ, chưa đo. Nếu chậm hơn thì làm việc chạy theo từng câu STT (đang ở mục "Không làm").
- **Giấy phép:** nếu dự án quay lại hướng thương mại thì phải huấn luyện lại mà không dùng PhoNER.
