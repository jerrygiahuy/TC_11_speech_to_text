# Âm thanh để đo nhận dạng giọng nói

Thư mục này chứa file `.wav` để chạy `npm run eval-giong-noi`. Các file âm thanh và chữ thô đã lưu (`*.tho.json`) **không đưa lên git**, chỉ có README này.

## Tạo file mẫu bằng giọng máy (Windows)

```bash
npm run tao-am-thanh-mau            # mỗi ca trong data/cases/ thành <id>.tts.wav
npm run tao-am-thanh-mau -- --ghi-de  # tạo lại
```

Giọng "Microsoft An" của Windows đọc câu `input_noi`, tên thuốc được đổi sang cách bác sĩ đọc (cách đọc đầu tiên trong `config/sua-chu-giong-noi.json`). Giọng máy khác người thật nhiều (đọc "tai" nghe như "thai"), nên điểm trên file này chỉ để so trước và sau một lần sửa.

## Tự ghi âm (nên làm)

1. Đọc to câu `input_noi` của một ca trong `data/cases/` (hoặc lời mẫu trong `docs/kich-ban-thu-bac-si.md`). **Chỉ đọc nội dung giả.**
2. Lưu thành WAV **16 kHz, mono, PCM 16-bit**, đặt tên bắt đầu bằng id ca, ví dụ `ca-03.thanh.wav`. Đổi định dạng bằng ffmpeg: `ffmpeg -i ghi-am.m4a -ar 16000 -ac 1 ca-03.thanh.wav`.
3. Đọc câu khác câu trong ca thì đặt file `.txt` cùng tên (`ca-03.thanh.txt`) chứa đúng câu đã đọc.

Giọng nói là dữ liệu cá nhân: ghi âm của người thật chỉ để trên máy, không gửi đi, không đưa vào `docs/`.
