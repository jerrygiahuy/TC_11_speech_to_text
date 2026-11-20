# Kết quả kiểm chứng STT — 2026-11-11

## Sửa lỗi Illegal invocation khi bắt đầu phiên micro

`Window.fetch` bị gọi qua thuộc tính của `SpeakerSessionClient`, nhận sai receiver. Đã bọc lời gọi để native fetch không nhận đối tượng phiên làm `this`, áp dụng cả gửi audio, finalize và cleanup. Regression mô phỏng ràng buộc receiver của trình duyệt đã tái hiện đúng lỗi trước sửa và qua sau sửa; tổng 16 test TypeScript, lint và build đều qua. Chưa thu lại bằng micro vật lý trong lượt sửa này.

- Python 3.12.10, Node.js 26.4.0, Windows, sherpa-onnx 1.13.8 CPU.
- 49 test Python qua: chuẩn WAV/energy gate gốc P-018, adapter normalization/hotwords, API thành công, audio lỗi, im lặng, quá dung lượng, model thiếu, concurrency và cấu hình thuật ngữ.
- 15 test TypeScript qua: WAV header/sample bytes, giới hạn file, proxy khi backend ngắt, bảo toàn lỗi, upload, chia PCM liên tục, hàng đợi tuần tự, kết thúc/cancel và quá tải.
- `npm run lint` qua; `npm run build` qua cả compile, TypeScript và route generation.
- `npm run eval` của dự án cũ qua 10 ca × 2 kiểu nhập trong chế độ mock; không dùng kết quả này để khẳng định độ chính xác model STT.
- Model thật đã nhận dạng 3 file upstream, không dùng adapter giả:

| File | Độ dài | Suy luận | Transcript |
|---|---:|---:|---|
| `0.wav` | 3740 ms | 135 ms | rồi cũng hỗ trợ cho lâu lâu cũng cho gạo cho này kia |
| `1.wav` | 2400 ms | 80 ms | những nơi đã khống chế được căn bệnh |
| `2.wav` | 1550 ms | 85 ms | âm lượng tivi giảm |

- Kiểm tra trình duyệt thật tại `/stt`: hiển thị model sẵn sàng, chọn `1.wav`, chuyển đổi file và nhận dạng qua Next proxy + FastAPI, hiện đúng transcript, audio 2.40 giây và suy luận 79 ms. Nút sao chép được bật sau khi có kết quả.
- Dịch vụ nền đã khởi động bằng script dự án. Các giá trị thời gian chỉ là số đo các lượt thử trên máy này, không phải benchmark độ chính xác hoặc cam kết độ trễ.
- Chưa thu thử bằng micro vật lý của người dùng; cần bạn cấp quyền và nói khi quay lại. Luồng upload đã kiểm chứng end-to-end.
- Bộ test Python có một cảnh báo deprecation từ Starlette TestClient về httpx; không ảnh hưởng các test đang qua.
- Review độc lập không phát hiện lỗi critical/important; góp ý bổ sung tài liệu đã được xử lý.

## Bổ sung phiên liên tục và gần real time

- Bỏ giới hạn 30 giây cho micro; giữ một AudioWorklet mở suốt phiên, chia đoạn theo khoảng nghỉ ~600ms (sau ít nhất 1s âm thanh) hoặc tối đa 5 giây.
- Test PCM 75 giây kiểm chứng đủ mọi mẫu, đúng thứ tự và đoạn cuối; test điều phối 35 giây xác nhận callback kết quả chạy khi micro chưa đóng, sau đó flush đủ phần cuối.
- Test quá tải với 14 đoạn và một đoạn flush cuối: tự dừng micro, xử lý đúng thứ tự toàn bộ hàng đợi + overflow, `onStopped` gọi đúng một lần. Test cancel xác nhận đóng pipeline và bỏ kết quả đến muộn.
- Đây là kiểm thử luồng với pipeline giả lập, chưa phải phép đo độ trễ của micro vật lý/trình duyệt thực tế. Giao diện thực tế đã reload và xác nhận model sẵn sàng cùng nút phiên micro mới.
- (Thời TMH, trước 20/11/2026.) Native model thật nhận thành công cả 3 WAV mẫu khi bật hotwords y khoa (`tai mũi họng`, `viêm xoang`, `amoxicillin`); kết quả khớp baseline. Chưa có audio chuyên khoa có ground truth để đo cải thiện độ chính xác.
- Giới hạn 30 giây vẫn áp dụng cho file tải lên, không áp dụng cho tổng thời gian phiên micro. Đã bổ sung diarization như ghi bên dưới; không tự gán vai bác sĩ/bệnh nhân.


## Bổ sung phân biệt hai người nói

- Model segmentation pyannote 3.0 + speaker embedding NeMo TitaNet-Small ONNX, CPU. SHA-256 pin trong downloader; không thêm PyTorch hoặc dịch vụ cloud.
- 49 test Python +15 test TypeScript qua: thêm timestamp token/BPE, đổi giọng giữa đoạn, profile ổn định, người nói chưa rõ/nói chồng, 5+3 revision, session API, idempotent retry, thứ tự, giới hạn RAM, capacity/expiry, proxy metadata và client cleanup.
- Review độc lập tìm được hai lỗi cụ thể: từ có timestamp dao động qua mốc chốt bị mất/lặp; hai giọng nói chồng cùng chưa xác định bị gộp thành không chồng. Cả hai có regression fail rồi pass sau khi sửa.
- Native smoke tiếng Việt: audio cùng giọng dài 8s gửi5+3 cho transcript **khớp hoàn toàn** nhận dạng một lần8s, mọi từ speaker1. Đây là audio upstream ghép lặp để kiểm tra cơ chế, chưa phải benchmark câu y khoa tự nhiên.
- Native acoustic smoke A/B/A tiếng Việt: vùng giọng1 khoảng0.03–8.06s, giọng2 khoảng8.79–13.08s (có một khoảng nghỉ), giọng1 khoảng13.82–17.36s. Profile giọng1/2 được giữ ổn định.
- Live session API qua Next.js: lần1 `audio_ms=5000`, lần2 `audio_ms=8000`, cùngspeaker1, finalize và cleanup thành công.
- Trình duyệt upload `test-two-vi.wav` dài17.54s: ba lượt người nói1 →2 →1, text đúng nhóm giọng tương ứng; tổng STT inference834ms trong lượt thử. Đây không phải tổng độ trễ end-to-end và không phải cam kết hiệu năng.
- Bộ test vẫn có một cảnh báo Starlette/httpx deprecation. Chưa kiểm thử micro hai người trực tiếp, chất lượng diarization trên nhiều giọng Việt hoặc nhận dạng hội thoại y khoa tự nhiên. Overlap/short/noisy speech có thể không được phân loại chính xác; timestamp là ước lượng phát token, chưa phải forced alignment.
