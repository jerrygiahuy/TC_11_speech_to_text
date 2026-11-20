# Cải thiện gán người nói với model hiện có

Ngày 2026-11-13. Người dùng yêu cầu tiếp tục cải thiện gán người nói; giữ Zipformer, Silero và bộ diarization ONNX cục bộ, chưa cài Community-1. Không gửi audio/transcript bên ngoài, không tự suy vai trò bác sĩ/bệnh nhân.

## Gói công việc

1. Agent speaker_accuracy: stt/diarization.py và test_diarization.py. TDD cho hồ sơ giọng ổn định, chống nhập nhầm hai cụm vào một ID, nhận diện mơ hồ, gán từ sát ranh giới và lấy đoạn sạch không chồng giọng. Giữ tương thích session/deepcopy.
2. Agent chính: kiểm tra baseline model thật, tích hợp, tài liệu và smoke. Baseline hiện có: mẫu Việt cùng người 5+3 giây giữ ID1, hội thoại ghép A/B/A có thứ tự1/2/1. Đây là mẫu có cấu trúc biết trước, không phải độ chính xác trên bệnh nhân.
3. Một lượt reviewer GPT-6-luna, context riêng, chỉ đọc các file thay đổi, tối đa5 lỗi cụ thể. Chỉ chạy lại test khi có sửa lỗi.

## Tiêu chí

- Bỏ fallback450ms kéo từ trong khoảng trống sang người bên cạnh.
- Lượt nối tiếp khác người không bị đánh dấu nhầm nói chồng; chồng giọng thực sự giữ overlap và speaker unknown.
- Đoạn embedding quá ngắn/hỏng/mơ hồ không làm hỏng hồ sơ giọng; cập nhật prototype chỉ từ bằng chứng đủ mạnh.
- ID ổn định khi thứ tự local cluster đổi; không ép hai local clusters đồng thời vào cùng ID.
- Lấy được phần sạch của lượt có chồng giọng một phần, không bỏ toàn bộ lượt dài.
- Tất cả Python tests và smoke native đạt, không sửa transcript để ép test đạt.

## Giới hạn và checkpoint

Chưa có bản gán người nói thủ công cho file bệnh nhân Tim mạch; chưa thể công bố mức tăng accuracy/DER. Tăng unknown có thể là đánh đổi cần thiết để giảm gán nhầm. Ngưỡng cần được đánh giá trên dữ liệu thật trước triển khai lâm sàng.

Baseline native đã đạt. Hoàn tất:60 Python tests và native smoke đạt. Hai lỗi review (coverage cộng trùng và norm overflow) đã được tái hiện bằng test đỏ rồi sửa trong phiên chính khi worker chạm hạn mức. Test rollback khi diarization thất bại đạt. sau đó chạy `.venv-stt/Scripts/python.exe -m pytest stt/tests -q` và `.venv-stt/Scripts/python.exe -m stt.diarization_smoke`. Backend vẫn tắt theo yêu cầu trước.
