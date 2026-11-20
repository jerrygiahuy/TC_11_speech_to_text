# Thiết kế công cụ WER chạy bằng lệnh

Ngày: 2026-11-13. Trạng thái: đề xuất, chưa triển khai.

## Yêu cầu đã xác nhận

Người dùng muốn plan kiểm thử WER bằng micro hoặc file audio kèm bản chép chuẩn, đồng thời có hướng cải thiện các lỗi STT. Người dùng đã chọn **chỉ script chạy bằng lệnh**, không thêm giao diện `/stt`.

## Cách tiếp cận

- Script dùng trực tiếp Python runtime hiện có: không cần bật HTTP backend, dễ tái lập cấu hình và lưu kết quả local. Chọn hướng này theo yêu cầu người dùng.
- CLI gọi HTTP backend: tái dùng API nhưng phụ thuộc dịch vụ đang chạy và khó cố định cấu hình từng thử nghiệm. Không chọn cho phiên bản đầu.
- Giao diện `/stt`: tiện thao tác trực quan nhưng vượt lựa chọn hiện tại. Không triển khai.

Các lựa chọn kỹ thuật dưới đây là đề xuất của người lập plan, chưa phải quyết định người dùng đã duyệt từng chi tiết.

## Đầu vào và phép so sánh

1. `file`: đường dẫn WAV và TXT UTF-8/UTF-8 BOM. Đây là thao tác đọc file local, không upload qua mạng. Các định dạng nén khác hoãn lại để không kéo thêm ffmpeg/codec.
2. `mic`: chọn thiết bị, thu đúng thời lượng người dùng chỉ định; tải bản chuẩn từ đường dẫn TXT. Thu **một lần**, so sánh hai mode trên cùng PCM.
3. `score`: chấm bản nhận dạng TXT có sẵn với bản chuẩn; không tải model, không mở micro.
4. `devices`: liệt kê thiết bị thu local, không mở thu hay tải model.

`--pipeline batch`: DeepFilterNet tùy chọn → Silero VAD → Zipformer, chấm một transcript cho toàn file. Đây là đường đo đã dùng với `test_1`; không chạy diarization.

`--pipeline session`: replay tuần tự các chunk tối đa 5 giây qua `SessionStore.process`/`finalize`, cửa sổ cuốn 25 giây, đối chiếu revision và ghép toàn bộ từ cuối cùng. Dùng diarizer ONNX trên audio gốc. Đây là mô phỏng xử lý session phía server, **không** đo truyền mạng, lịch phát chunk của trình duyệt hay latency micro trực tiếp. File và bản thu micro đều có thể chạy cả hai pipeline; không gộp hai pipeline thành một điểm WER.

Micro native dùng `sounddevice==0.5.6`; Windows wheel cung cấp PortAudio. Không thay `lib/stt/microphone.ts` hoặc `openContinuousSession`. Capture native không có cùng cấu hình DSP với trình duyệt: trình duyệt hiện bật echo cancellation/noise suppression/auto gain; OS/driver vẫn có thể xử lý tín hiệu native. Ghi rõ khác biệt này trong report.

## Chuẩn hóa và metric

- Profile cố định `vi-whitespace-v1`: NFC, chữ thường, bỏ nhãn `Bác sĩ:`/`Bệnh nhân:` ở đầu dòng; dấu câu/ngăn cách thành khoảng trắng; giữ chữ, số và dấu tiếng Việt. Tách token bằng cùng quy tắc `[^\W_]+` của lượt đo trước.
- Không đổi cách viết số, đơn vị, tên thuốc, từ đệm, từ lặp, `hông` thành `không` hoặc `bi a` thành `bia` trong profile chính.
- `jiwer==4.0.0` tính edit distance, S/D/I và alignment trên các chuỗi đã chuẩn hóa. Giữ cả transcript nguyên văn và transcript chuẩn hóa; report ghi phiên bản thư viện/profile.
- WER = `(S+D+I)/N`; không clamp về 100%. Reference rỗng sau chuẩn hóa là lỗi input; hypothesis rỗng với N>0 được tính N deletions, WER 100%.
- Evaluation cho phép audio toàn zero qua canonicalization (`allow_silence=True`) để VAD trả no_speech và scorer tính deletions khi reference có nội dung; không coi runtime lỗi là no_speech. Mẫu im lặng có reference rỗng không gán phần trăm WER, cần phép đo hallucination riêng ngoài phiên bản đầu.
- Corpus WER = tổng S/D/I chia tổng N, không trung bình các phần trăm. Không nối nhiều bản thu thành một chuỗi để align xuyên ranh giới mẫu. Báo riêng từng pipeline/mode/cấu hình.
- Corpus A/B delta chỉ tính trên **giao các sample ID thành công ở cả hai mode**, cùng hash audio/reference/config tương ứng. Xuất paired coverage và danh sách ID bị loại; không lấy hai tập thành công khác nhau để kết luận cải thiện. Nếu thiếu mẫu thì comparison=partial; giao rỗng thì delta=null. Aggregate riêng từng mode vẫn phải ghi coverage riêng.
- CER là metric phụ, dùng chuỗi normalized và bỏ khoảng trắng; định nghĩa này phải xuất trong report. CER không thay WER.
- Nhãn người nói, timestamp, `final` không phải từ để chấm. Chỉ chấm transcript cuối cùng; kết quả lỗi/dở dang không được hiện như một phép đo đạt.
- Bản chuẩn chỉ được đưa vào scorer **sau** nhận dạng; không dùng làm hotwords, prompt hoặc sửa transcript. Đóng băng hash bản chuẩn trước mỗi run.

## Tính tái lập và lưu trữ

- Chuẩn hóa audio một lần về PCM16 mono 16 kHz bằng resample_poly; giữ cùng số mẫu và hash PCM cho mọi mode so sánh. Không áp giới hạn 30 giây hoặc giới hạn upload.
- Snapshot hotwords hiện hành vào thư mục tạm private trước inference; mọi chunk/mode đọc cùng snapshot. Ghi hash nguồn và hash snapshot. Cấu hình không đổi giữa hai mode, trừ lựa chọn denoise.
- Mỗi run ghi model ID/revision, package versions, hash model/config/hotwords/audio/reference, VAD parameters, native executable SHA, source rate/channels, pipeline, kích thước chunk, các thời gian và cảnh báo clipping/overflow.
- `mic/file` yêu cầu `--consent-local` trước mở thiết bị/đọc audio cho inference; đây là xác nhận vận hành, không phải hệ thống chứng nhận quyền sử dụng dữ liệu. Không gửi dữ liệu ra cloud hoặc Web Speech.
- Mặc định chỉ in summary, không transcript. Chỉ ghi report/transcript khi có `--output-root .tmp/wer`; tự tạo run-ID con duy nhất, không ghi đè run cũ. Chỉ ghi WAV khi thêm `--save-audio`; cờ này bắt buộc đi kèm output-root. Không lưu report vào docs/Git mặc định.
- Audio micro ở bộ nhớ khi không yêu cầu lưu. WAV native tạm theo adapter hiện tại được dọn khi thành công/lỗi. Báo rõ report xuất theo yêu cầu sẽ còn trên đĩa cho đến khi người dùng xóa; OS crash có thể để lại file tạm.
- Thiếu model/runtime, overflow thiết bị, Ctrl+C, đứt thiết bị hoặc lỗi session: đóng handle/engine, dọn temp, exit khác 0; không fallback và không tính WER cho audio thiếu.

## Bản chuẩn và bộ dữ liệu

Với micro đọc bài: giữ bản bài đọc làm tham chiếu ban đầu, nghe bản thu và sửa thành **lời thực sự đã nói** nếu người đọc bỏ/đổi từ. Không tính lỗi đọc bài là lỗi STT. Với hội thoại tự nhiên: chép tay từ đúng bản thu rồi kiểm tra lại trước chấm.

`test_1` đã được xem kết quả nên dùng làm development/regression, không dùng làm tập test độc lập để tuyên bố cải thiện. Mốc hiện có: 59.612s, N=185, batch off 7/185=3.7838%, DFN3 6/185=3.2432%. Chỉ so lại chính xác khi hashes/cấu hình/normalization khớp; khác phiên bản phải báo drift.

Đề xuất pilot 20 đoạn (30–90s/đoạn), tối thiểu 3 người đọc và điều kiện sạch/quạt/xa micro; đây là mục tiêu thu mẫu ban đầu, không phải ngưỡng đủ để khẳng định thống kê. Tách dev/test theo người nói và bản thu trước tuning; giữ ít nhất một phần test chưa xem kết quả. Thêm câu tên thuốc gần âm, số/liều/đơn vị và phủ định; chấm thủ công các cụm này ngoài WER.

## Hướng cải thiện, có đối chứng

| Lỗi đã thấy | Giả thuyết cần kiểm chứng | Thử nghiệm và điều kiện chấp nhận |
| --- | --- | --- |
| Thiếu `anh có` ở đầu | Audio gốc đã thiếu; VAD cắt onset; hoặc decoder bỏ từ | Nghe 0–3s, xem VAD spans; cùng audio chạy có/không VAD và thêm 0.3–0.5s silence trước file làm đối chứng. Chỉ chỉnh padding/ngưỡng nếu chứng minh onset bị cắt; kiểm tra im lặng/nhiễu không sinh chữ. Không chèn lại hai từ bằng luật. |
| `amlodipine` → `amlopin` | Từ đã có trong hotwords nhưng boost/ngữ cảnh/BPE/âm học chưa đủ | Kiểm tra hotwords thực sự được truyền; thử tập hotwords gọn theo chuyên khoa và score 0, 1.0, 1.5, 2.0 trên dev; kiểm tra sample không nhắc từ và các tên gần âm. Không tự thay tên thuốc bằng fuzzy matching. |
| `có tuần` → `cả tuần` | Nhiễu, decoder hoặc phát âm; DFN3 sửa đúng 1 lỗi trên mẫu này | A/B cùng audio trên nhiều bản thu; không mặc định bật DFN3 chỉ dựa trên test_1. Chấp nhận nếu lỗi giảm trên held-out và không tăng lỗi quan trọng/latency quá mức người dùng chấp nhận. |
| `bia` → `bi a` | Ranh giới token/từ hoặc giải mã | Xem token/timestamp quanh từ, thử decoder/hotwords theo ngữ cảnh trên dev. Nếu có lớp sửa trình bày, giữ nguyên raw và báo WER raw/corrected riêng. |
| `không` → `hông` | Phát âm vùng miền, bản chuẩn hoặc giải mã | Nghe lại và thống nhất chuẩn chép. Không replace toàn cục `hông` → `không`; từ `hông` có thể nằm trong nội dung khác. Câu phủ định và câu không phủ định phải là test đối chứng riêng. |

Thứ tự: kiểm tra ground truth/audio → đo baseline → kiểm tra capture/VAD → thử hotwords/decoder → đánh giá denoise → chỉ cân nhắc model local khác hoặc fine-tuning sau khi có dữ liệu nhãn đủ và kết quả held-out. Fine-tuning không nằm trong triển khai công cụ đo. Không hứa STT đúng 100%.

## Tiêu chí hoàn tất

- File+reference, micro+reference và score-only chạy được bằng lệnh; đầu vào không đổi khi A/B.
- Batch/session có nhãn rõ, session ghép revision/final đúng, thiếu dữ liệu không được chấm như thành công.
- Test metrics, canonicalization, device/error cleanup, isolation config, output privacy và fake session đều đạt.
- Native regression test_1 có report/hash hoặc lý do drift; native micro chỉ được đánh dấu đạt sau một lần thu thật do người dùng thao tác, không dùng fixture để thay cho kiểm chứng thiết bị.
- Chỉ thêm công cụ đo; không chỉnh mặc định STT, danh sách thuốc, DSP trình duyệt hoặc micro màn khám trong giai đoạn này.

## Nguồn kỹ thuật

- [Hugging Face: ASR evaluation, normalization và corpus WER](https://huggingface.co/learn/audio-course/chapter5/evaluation).
- [JiWER 4.0.0](https://pypi.org/project/jiwer/4.0.0/) và [alignment API](https://jitsi.github.io/jiwer/usage/).
- [sounddevice 0.5.6](https://pypi.org/project/sounddevice/0.5.6/), [Windows installation](https://python-sounddevice.readthedocs.io/en/latest/installation.html), [RawInputStream/overflow](https://python-sounddevice.readthedocs.io/en/latest/api/raw-streams.html).
- [sherpa-onnx hotwords: transducer + modified_beam_search](https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html).
