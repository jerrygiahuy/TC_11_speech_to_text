# Silero VAD + Zipformer: kế hoạch multi-agent

Ngày: 2026-11-13. Phạm vi đã chốt: giữ Zipformer, thêm Silero VAD cho micro và tải file; chưa cài Community-1, chưa thêm bộ khử nhiễu. VAD chọn lời nói, không làm sạch tiếng nhiễu chồng giọng.

## Kiến trúc và tiêu chí

Backend dùng Silero ONNX qua sherpa-onnx hiện có, không thêm PyTorch. Chọn khoảng lời nói trước ASR, có padding bảo vệ đầu/cuối từ. Timestamp trả về phải quy đổi về bản ghi gốc; diarization tiếp tục dùng waveform gốc. Mỗi request reset trạng thái VAD, inference được bảo vệ bởi engine lock hiện có. Thiếu/hỏng model phải báo lỗi rõ, không âm thầm quay lại RMS.

## Phân công và thứ tự

| Gói | Agent / model | Sở hữu | Đầu ra và kiểm chứng |
| --- | --- | --- | --- |
| A: backend | silero_impl / kế thừa model điều phối | stt/vad.py, download_vad, API, session, setup và Python tests | Unit test khoảng lời nói, bỏ qua khoảng lặng, timestamp đúng; test API/session; smoke ONNX thật |
| B: tích hợp | agent chính / model phiên hiện tại | giao diện health, lỗi VAD, client retry, đánh giá phần cứng | Không bật nhận dạng khi thiếu VAD; lỗi cấu hình không retry; TS test/typecheck/lint |
| C: review có giới hạn | GPT-6-luna / medium, context riêng | chỉ đọc diff liên quan | Tối đa 5 lỗi có bằng chứng; không đọc lại toàn repo; không sửa file |
| D: chốt | agent chính | checkpoint và báo cáo | Xử lý lỗi review, chạy lại test bị ảnh hưởng, công bố giới hạn đo lường |

A và B chạy song song, C sau A+B, D sau C. Không phân thêm agent cho cùng file. Model mạnh chỉ dùng khi reviewer tìm vấn đề khó về timestamp/native runtime; không nâng model chỉ để đọc log hoặc viết tài liệu.

## Quy tắc tiết kiệm token

- Tối đa 2 worker cùng lúc; tái dùng agent thay vì tạo lại toàn bộ ngữ cảnh.
- Giao đường dẫn, hợp đồng, tiêu chí cụ thể; reviewer dùng context riêng và báo cáo dưới 250 từ.
- Chạy test mục tiêu trước; chỉ một lượt toàn bộ khi tích hợp; chỉ chạy lại khi có sửa đổi liên quan.
- Không chạy hai model STT/diarization lớn để so sánh trong giai đoạn này.
- Không commit/ghi đè các thay đổi có sẵn của người dùng.

## Phần cứng và Community-1

Máy đã đo: Intel Core Ultra 5 225H, 14 nhân, RAM khoảng 15.4 GiB, GPU Intel Arc 130T. RAM còn trống khoảng 1.7 GiB ở thời điểm kiểm tra. Community-1 hỗ trợ CPU; chưa benchmark trên máy này. Không mặc định GPU Intel chạy đường CUDA. Nếu thử sau: chạy hậu xử lý tuần tự, đo peak RAM/thời gian trên đoạn ngắn trước khi thử toàn file. Chưa tải/cài Community-1.

## Checkpoint tiếp tục

- B: đã xong, 3 client tests đạt; tổng 115 TS tests đạt, typecheck/lint đạt.
- A: hoàn tất backend, tải model có checksum, setup/start/docs; 53 Python tests đạt. Native smoke lời nói=1 khoảng, zero/nhiễu tổng hợp=0.
- C: GPT-6-luna đã review giới hạn, không phát hiện lỗi cụ thể; D: kiểm chứng và tích hợp đã xong. Chưa benchmark độ chính xác transcript; backend vẫn tắt theo yêu cầu trước đó.
- Khi resume: đọc file này, git status, stt/vad.py, stt/tests/test_vad.py; không làm lại phần đã đạt trừ khi code đổi.
- Lệnh backend: .venv-stt/Scripts/python.exe -m pytest stt/tests -q
- Lệnh native smoke: .venv-stt/Scripts/python.exe -m stt.vad_smoke
- Lệnh TS: node node_modules/tsx/dist/cli.mjs --conditions=react-server --test "src/**/*.test.ts" "lib/**/*.test.ts"
- Không có cơ chế bảo đảm agent tự khởi động đúng mốc reset token. Nếu runtime ngắt, checkpoint này là nguồn tiếp tục; không coi chờ là đã hoàn thành.
