# DeepFilterNet local: kế hoạch và checkpoint

Người dùng đã yêu cầu lập kế hoạch và triển khai ngay theo hướng đã thảo luận. Làm tại workspace hiện tại để giữ các thay đổi STT đang tích hợp; không commit thay đổi có sẵn của người dùng.

## Thiết kế

Giữ Zipformer/Silero; thêm DeepFilterNet3 CPU tùy chọn, mặc định tắt để so sánh trước/sau. Chọn executable Rust Windows chính thức thay Python/PyTorch để giảm dependency và RAM. Resample 16k → 48k cho model, bù độ trễ rồi về đúng số mẫu 16k; không thay timeline. Đây không phải phục hồi lời nói đã mất hoặc tách hai người nói chồng nhau.

File: khử nhiễu trước VAD/STT. Micro: khử nhiễu cửa sổ hồi cứu tối đa 25 giây trước VAD/STT; đây là cập nhật theo đoạn, chưa phải bộ lọc audio streaming từng frame. Dùng audio gốc cho phân tách người nói để tránh thay đặc trưng giọng. Chế độ khử nhiễu cố định khi mở session; retry không xử lý/lưu trùng. Community-1 vẫn hậu xử lý tuần tự trên audio gốc.

Không gọi cloud. WAV/JSON tạm chỉ local, xóa khi xử lý xong/lỗi thông thường; crash hệ điều hành vẫn có thể để lại file. Lỗi khử nhiễu phải báo rõ, không âm thầm fallback. Không thêm giới hạn upload. Backend giữ tắt sau kiểm chứng.

## Phân công

1. Agent denoise_runtime (GPT-6.1-sol/medium): native runtime official, adapter `DeepFilterDenoiser.ready/enhance`, test shape/delay/lỗi/cleanup, setup tải pin version/hash.
2. Agent chính: `stt/api.py`, `stt/diarized_sessions.py`, proxy và speaker client. Header `X-STT-Denoise: off|deepfilternet3`, mặc định off; session lưu mode. Unit/integration tests trước sửa.
3. Agent denoise_ui (GPT-6.1-sol/medium): tùy chọn tại `/stt`, bổ sung đường micro khử nhiễu trong màn khám, consent và lỗi.
4. Agent chính: smoke native model mẫu ngắn, benchmark thời gian/peakRAM; kiểm thử toàn bộ Python/TS, typecheck/lint; review độc lập giới hạn diff mới.

## Kiểm chứng

- Adapter giữ frame_count, sample_rate, utterance_ref, finite; lỗi an toàn và xóa file tạm.
- File/micro: VAD và STT nhận audio sạch; diarizer nhận audio gốc. Session retry không gọi denoiser hai lần, lỗi không commit state.
- Chế độ không hợp lệ trả 400; thiếu runtime trả 503; mặc định không khử nhiễu; mode cố định trong session.
- Native smoke chứng minh executable hoạt động local, không chứng minh giảm WER. Chưa có nhãn transcript chuẩn để tính độ chính xác.

## Tiến độ

- Đã xác nhận release chính thức v0.5.6 có Windows x86_64 executable; runtime agent đang kiểm CLI và cài đặt.
- API/UI đang triển khai song song; RAM trống trước đó khoảng 2.52GiB. Không hạ guard Community-1.
