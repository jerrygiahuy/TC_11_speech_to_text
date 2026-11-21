---
name: ghi-tai-lieu
description: Ghi tài liệu cho mọi thay đổi trong dự án (code, config JSON, dữ liệu mẫu, dependency, script). Dùng ngay sau khi sửa bất kỳ file nào không phải tài liệu, kể cả sửa một dòng, đổi tên biến hay chỉnh màu, và trước khi báo xong việc hoặc commit.
---

# Ghi tài liệu thay đổi

Quy tắc dự án: **không có thay đổi nào quá nhỏ để bỏ qua.** Mỗi lần sửa phải để lại dấu vết trong `docs/CHANGELOG.md`.

## Bước 1: Thêm mục vào `docs/CHANGELOG.md`

Mục mới đặt **trên cùng**, dưới tiêu đề ngày hôm nay (`## YYYY-MM-DD`; chưa có thì tạo). Mẫu:

```markdown
### <Tóm tắt một dòng>
- **Loại:** Tính năng | Sửa lỗi | Cấu hình | Dữ liệu | Giao diện | Tài liệu | Dọn dẹp | Phụ thuộc
- **Thay đổi:** làm gì, ở mức người đọc hiểu được mà không cần mở diff.
- **Lý do:** vì sao cần đổi (yêu cầu của ai, lỗi gì, quan sát nào).
- **File:** `đường/dẫn/file.ts`, `config/...json`
- **Kiểm tra:** cách xác nhận (lệnh `npm run lint`, `npm run eval`, trang nào, bấm gì). Chưa kiểm tra thì ghi rõ "Chưa kiểm tra".
- **Ảnh hưởng:** (nếu có) điểm eval thay đổi, dữ liệu cũ cần sửa, hành vi bác sĩ thấy khác đi.
```

Viết tiếng Việt, ngắn, cụ thể. Không ghi dữ liệu bệnh nhân thật, API key hay tên riêng.

## Bước 2: Cập nhật tài liệu liên quan

| Nếu thay đổi... | Thì cập nhật |
|---|---|
| Cách cài, chạy, biến môi trường, lệnh npm | `README.md` (phần Cài đặt / Đổi nhà cung cấp AI) và `.env.example` |
| Trường form, khóa JSON trong `config/` | `README.md` phần "Thêm hoặc sửa trường form" |
| Ca mẫu, eval, cách tính điểm | `README.md` phần "Thêm ca mẫu" / "Chấm điểm" |
| Trang `/eform`, file trong `data/eform/` | `README.md` phần "Mô phỏng eForm ngoại trú" |
| Thêm/xóa/đổi tên thư mục hoặc module | `README.md` phần "Cấu trúc thư mục" |
| Hiểu biết mới về màn hình EMR thật | file tương ứng trong `docs/cau-truc-*.md` |
| Quy ước làm việc với Claude | `CLAUDE.md` |

## Bước 3: Tự kiểm tra

- Mục CHANGELOG có đủ Thay đổi, Lý do, File, Kiểm tra.
- Mọi file bị sửa đều xuất hiện trong dòng **File** của một mục nào đó.
- Tài liệu không còn câu nào mâu thuẫn với code mới.

Hook `Stop` (`.claude/hooks/check-docs.mjs`) sẽ chặn kết thúc lượt nếu còn file sửa sau lần cập nhật CHANGELOG gần nhất.
