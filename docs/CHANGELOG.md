# Nhật ký thay đổi

Mỗi thay đổi, dù nhỏ, đều có một mục ở đây. Mục mới nhất ở trên cùng. Cách ghi xem `.claude/skills/ghi-tai-lieu/SKILL.md`.

## 2026-11-21

### Trạng thái hiện tại của CardioNote
- **Loại:** Tài liệu
- **Thay đổi:** Tóm tắt các nhóm chức năng của CardioNote (trợ lý AI giọng nói điền phiếu khám ngoại trú Tim mạch):
  - **Phiếu khám và chỉ định Tim mạch:** hồ sơ Encounter và đầu ra AI dùng schema `2.0.0`; hồ sơ có phiên bản schema không hỗ trợ (`1.x`) bị từ chối với thông báo "Hồ sơ schema 1.x không dùng được cho CardioNote.". Bảng phủ trường Excel ở `src/shared/clinical/excel-coverage.ts`. Danh mục ICD-10, dịch vụ, thuốc đều là mock.
  - **Nhận dạng giọng nói:** STT Zipformer chạy cục bộ; bộ sửa chữ thuật ngữ Tim mạch và từ vựng ưu tiên 56 cụm. Đo ngày 21/11 trên giọng máy đọc: WER sau sửa chữ 8,5% và 9,9% trên 6 câu không dùng để viết quy tắc (xem README, mục đo giọng nói).
  - **Che thông tin cá nhân:** bộ rule R1 đến R14 cộng lớp NER PhoBERT chạy cục bộ; chốt chặn R11 trước khi gửi AI.
  - **`/demo-luong`:** ba kịch bản (`ca-chuan`, `ca-tu-che`, `ca-chua-dong-y`) có kỳ vọng riêng trong `data/demo-luong/kich-ban/expected/`.
  - **Dữ liệu giả lập:** bộ 60 ca ở `data/cardiology/`, sinh lại ngữ cảnh lượt khám, lịch hẹn và phiếu cũ giả bằng `npm run tao-du-lieu-tim-mach`; 3 ca nghiệm thu tự động.
  - **Eval:** `npm run eval`, `npm run eval-mau`, `npm run eval-giong-noi`.
  - **Giao diện:** eForm `/`, bản in, `/demo-luong`, `/stt`, `/ket-qua` và các trang khác liệt kê trong mục Giao diện của README.
- **Lý do:** Nhật ký bắt đầu lại từ trạng thái hiện tại để người đọc nắm sản phẩm mà không cần đọc lịch sử từng bước.
- **File:** `docs/CHANGELOG.md`
- **Kiểm tra:** Đối chiếu từng nhóm với README và mã nguồn.
