# Community-1 cục bộ, hậu xử lý file

Community-1 phân tách người nói; không lọc tiếng nhiễu, không chuyển audio thành chữ. Zipformer/Silero vẫn làm STT. Chỉ chọn Community-1 cho file tải lên; micro realtime giữ diarization ONNX hiện có.

## Tài nguyên máy đã kiểm tra

Core Ultra5 225H,14 nhân, RAM khoảng15.4GiB, GPU Intel Arc130T. RAM trống khoảng3.2GiB lúc bắt đầu tích hợp. Không dùng CUDA trên Intel. Community-1 hỗ trợ CPU, nhưng chưa có peakRAM/thời gian thật trên máy này. Có thể gây áp lực RAM/paging khi nhiều ứng dụng đang mở; không bảo đảm không quá tải.

Chạy tuần tự trong lock STT: Zipformer nhận dạng -> giải phóng recognizer -> worker Community-1 dùng CPU2 luồng -> thoát tiến trình, trả RAM. Không nạp PyTorch vào backend STT. Guard yêu cầu ít nhất4GiB RAM trống trước worker là lựa chọn bảo thủ, không phải yêu cầu chính thức hoặc bảo đảm chống OOM. Không thay giới hạn dung lượng/thời lượng upload.

## Cài đặt

1. Runtime riêng: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-community.ps1 -SkipModel`.
2. Chấp nhận điều kiện model tại https://huggingface.co/pyannote/speaker-diarization-community-1 bằng tài khoản của bạn. Không cung cấp token qua chat hoặc commit vào repo.
3. Đăng nhập cục bộ: `.venv-community/Scripts/hf.exe auth login`.
4. Tải weights: `.venv-community/Scripts/python.exe -m stt.download_community`. Script pin revision tải về và ghi manifest SHA256.
5. Khởi động lại backend và chọn Community-1 ở mục phân tách người nói cho file trên `/stt`.

`models/community-1` và `.venv-community` được gitignore. Không thay `.venv-stt`. Chưa có quyền HF thì runtime có thể cài nhưng model vẫn chưa sẵn sàng; không coi unit test giả lập là smoke model thật.

## Riêng tư và vận hành

Inference chỉ load đường dẫn weights local; HF offline và telemetry tắt trước import. Internet cần khi cài package/tải weights, không cần để gửi audio phân tích. Không dùng pyannoteAI cloud/precision-2. Giữ diarization có overlap thật để không giấu các đoạn nói chồng.

Worker dùng WAV tạm cục bộ và JSON vùng giọng trong TemporaryDirectory, xóa khi hoàn tất hoặc lỗi được xử lý; tắt/crash hệ điều hành có thể để lại file tạm. Không lưu lịch sử audio. Chỉ gửi đường dẫn local giữa hai tiến trình; không truyền token vào command line. Áp dụng consent và policy nội bộ hiện có.

`community_ready` báo có cấu hình weights và executable local; không chứng minh đủ toàn bộ weights, runtime import được, RAM đủ hoặc độ chính xác. Lỗi không fallback âm thầm sang model khác. Cấu hình timeout mặc định1800 giây là giới hạn tác vụ worker, không phải thời lượng audio tối đa.

## Kiểm chứng còn thiếu

Sau khi có weights: thử mẫu ngắn công khai, đo elapsed/peak working set và RAM hệ thống trước khi chạy bản ghi528 giây. Chỉ đánh giá DER/độ chính xác sau khi có nhãn người nói chuẩn. Chưa có benchmark nên chưa khẳng định cải thiện trên bản ghi Tim mạch.


Runtime đã cài và import thực tế đạt: pyannote.audio4.0.7, torch2.8.0+cpu, CUDA=false. Lock dependency nằm tại stt/requirements-community-lock.txt. Windows hiện cảnh báo bộ giải mã TorchCodec/FFmpeg không sẵn sàng; worker chủ động đọc PCM WAV bằng thư viện wave rồi đưa tensor vào pipeline (đúng phương án in-memory của pyannote), không dùng bộ giải mã đó. Cảnh báo này không phải smoke weights/model inference thành công; cần xác minh đầy đủ sau khi tải weights.


Cập nhật ngày 2026-11-13: đăng nhập CLI và tải weights đã hoàn tất. Kiểm tra lại SHA256 cả 10 file theo `provision.json` đạt; revision `3533c8cf8e369892e6b79ff1bf80f7b0286a54ee`. Model local ready=True. Bộ kiểm thử STT đạt 74/74; proxy đạt 4/4. Đây là kiểm chứng tích hợp, chưa phải inference thật.

Lần kiểm tra tiếp theo sau compact vẫn trả COMMUNITY_MEMORY_LOW: RAM trống 2.52GiB so với guard 4GiB. Chưa khởi chạy worker, chưa có số đo chất lượng/tốc độ/peakRAM. Không hạ guard hoặc đóng ứng dụng của người dùng. Backend vẫn tắt. Khi có đủ RAM, bước tiếp theo là chạy mẫu WAV ngắn trước khi thử bản ghi bệnh nhân.
