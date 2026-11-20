# Community-1 local tùy chọn

Phạm vi: Community-1 phân tách người nói; KHÔNG phải khử nhiễu. Giữ Zipformer+Silero. Chỉ hậu xử lý file; micro thời gian thực giữ ONNX hiện tại. Không cài DeepFilterNet trong thay đổi này.

- Agent community_local (GPT-6-luna): adapter subprocess + worker offline CPU + unit tests; không nạp torch vào backend.
- Agent chính: API/HTTP header/UI chọn chế độ, setup isolated venv/download pinned repo, tài liệu và kiểm thử tích hợp.
- Test giả lập không chứng minh chất lượng model. Weights đã tải; smoke thật đang chờ đủ RAM.

Luồng: file WAV canonical -> Zipformer/Silero -> giải phóng Zipformer -> Community-1 tiến trình riêng -> map timestamp từ sang vùng người nói -> trả kết quả. Lock backend một tác vụ. Giữ vùng overlap thật, không dùng exclusive để che overlap. Tắt telemetry, HF offline tại inference, weights đường dẫn local; tải weights chỉ qua script setup không có bệnh án.

Máy Ultra5 225H,16GB RAM, Intel Arc; RAM trống3.2GB lúc kiểm tra. Guard admission4GiB trống là lựa chọn bảo thủ, không phải yêu cầu RAM chính thức hoặc bảo đảm không OOM. Không dùng CUDA trên Intel. Chưa có throughput/peakRAM thật. Chỉ opt-in và không bật mặc định.

Checkpoint hiện tại: runtime và weights đã có. Backend giữ tắt. Không đưa token vào chat hoặc repo. Nếu runtime chưa cài hoặc weights chưa đủ, API báo lỗi rõ không fallback âm thầm. Các đoạn bên dưới ghi lại lịch sử kiểm chứng; trạng thái mới nhất nằm cuối tài liệu.


Kiểm chứng tích hợp:74 Python tests,127 TS tests, typecheck/lint đạt. Reviewer không có finding cụ thể. Script tải model trả COMMUNITY_ACCESS_REQUIRED vì không có HF token. Runtime CPU đã cài torch2.8.0+cpu, đang cài các dependency pyannote4.0.7 trong venv riêng; chưa có weights và chưa chạy inference/benchmark thật. Cần xác nhận import runtime sau installer hoàn tất. Giữ backend tắt.


Runtime đã cài hoàn tất và kiểm tra import đạt: pyannote.audio4.0.7/torch2.8.0+cpu/CUDAfalse; dependency freeze được lưu. TorchCodec thiếu FFmpeg có warning, worker dùng PCM tensor thay decoder. Còn thiếu HF access/weights nên chưa inference thật, chưa benchmark peakRAM. Tiếp tục: HF login+accept -> download_community -> thử mẫu ngắn trước bệnh án. Không cần cài lại runtime.


Cập nhật sau CLI auth: đã tải đủ10 file Community-1, kiểm SHA256 theo manifest đạt. Model local ready=True. Chưa chạy inference thật vì guard báo COMMUNITY_MEMORY_LOW (RAM trống2.41GiB<4GiB). Không hạ guard và không đóng ứng dụng của người dùng. Tiếp tục khi RAM đủ: thử mẫu WAV ngắn công khai rồi đo runtime/peakRAM trước file bệnh nhân.

Tiếp tục sau compact (2026-11-13): RAM trống 2.52GiB, guard vẫn chặn worker. Kiểm SHA256 lại 10/10 file đạt, chạy lại 74 Python tests và 4 proxy tests đều đạt. Không thay code, không bật backend, không chạy inference khi thiếu RAM. Việc còn lại: smoke model thật, đo thời gian/peakRAM, rồi đánh giá gán người nói với nhãn chuẩn; chưa có kết luận về chất lượng trên audio Tim mạch.
