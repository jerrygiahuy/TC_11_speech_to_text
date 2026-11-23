# Bộ dữ liệu giả lập ngoại trú Trung tâm Tim mạch

## Mục đích

Bộ dữ liệu này dùng để phát triển và đánh giá luồng hội thoại giả lập → transcript → bản nháp phiếu khám → bác sĩ kiểm tra. Tất cả bản ghi đều là dữ liệu tổng hợp, dùng mã `SYN-*`, không sao chép PID, họ tên, ngày sinh, nội dung khám hoặc thông tin định danh từ tài liệu nguồn.

## Phạm vi

- Bối cảnh: khám ngoại trú Tim mạch.
- Số lượng: 60 tình huống tổng hợp.
- Trạng thái bản ghi: 20 `COMPLETE`, 20 `MISSING`, 20 `RECOVERED`.
- Đầu ra tham chiếu: lý do khám, bệnh sử, tiền sử, dị ứng, thuốc đang dùng, sinh hiệu, khám lâm sàng, chẩn đoán, kết quả cận lâm sàng, kế hoạch và tái khám.
- Các trường `draft_note`, `reviewed_note`, `review_time_seconds` và `error_tags` để trống cho đến khi có lần thử thực tế.

## File

| File | Nội dung |
|---|---|
| `schema/opd-synthetic-case.schema.json` | JSON Schema của một tình huống chuẩn hóa |
| `data-dictionary.json` | Từ điển trường, kiểu, nguồn và mức xác minh |
| `exam-library.json` | Thư viện mẫu câu khám toàn thân và tim mạch, hô hấp |
| `synthetic-cases.jsonl` | Dữ liệu chuẩn cho pipeline, mỗi dòng là một JSON object |
| `synthetic-cases.csv` | Bản phẳng để mở bằng Excel hoặc Google Sheets |
| `dataset-summary.json` | Thống kê phiên bản và phân bố dữ liệu |

## Quy ước xác minh

- `SEEN`: trường hoặc lựa chọn đã có trong danh sách trường của phiếu khám.
- `PROPOSED`: trường được đề xuất trong schema tổng hợp và còn cần xác nhận với bác sĩ hoặc IT.
- `SPRINT_SPEC`: trường phục vụ đánh giá prototype theo báo cáo tuần 2.
- `SYNTHETIC`: giá trị do script tạo, không đại diện một người bệnh thật.

Các quy tắc bắt buộc, mapping DB và khoảng hợp lệ trong tài liệu nguồn vẫn là đặc tả đề xuất. Dataset này không khẳng định đã khớp schema HIS/EMR vận hành.

## Tạo lại dữ liệu

```bash
node scripts/generate-cardiology-data.mjs
```

Script tạo dữ liệu xác định, không dùng mạng và không đọc hồ sơ bệnh nhân.

## Kiểm tra nhanh

```bash
node scripts/generate-cardiology-data.mjs --check
```

Lệnh kiểm tra số dòng, mã duy nhất, phân bố trạng thái, điều kiện huyết áp, dữ liệu phục hồi và các trường đo phải để trống.
