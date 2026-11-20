# Bàn giao của Claude Code — TC_11 Phiếu khám ngoại trú Tim mạch

Thực hiện theo `PLAN_TC11_CLAUDE_CODE.md` (thư mục cha của repo), phục vụ `PLAN_TC11_PHIEU_KHAM_NGOAI_TRU.md` bước 1 và 2 cùng phần chuẩn bị dữ liệu. Người nhận là Codex (triển khai) và nhóm (gửi câu hỏi cho bác sĩ). Ngày lập: 2026-11-19.

## Đọc theo thứ tự

| File | Nội dung | Mục plan |
|---|---|---|
| `01-ra-soat-anh.md` | 24 ảnh nhóm theo phần phiếu; nhãn, kiểu ô, lựa chọn, đơn vị theo mã ảnh; chỗ thiếu bằng chứng | 1 |
| `02-bang-anh-xa.md` | **Bảng ánh xạ chính**: nhãn gốc → khóa eForm / khóa AI → nguồn → khi thiếu → eForm → bản in → mã ảnh → mức xác minh. Kèm danh sách chỗ phải sửa trong code (B1–B12) và chỗ lệch với bộ 60 ca | 2 |
| `03-cau-hoi-bac-si.md` | 13 câu cho bác sĩ, 4 câu cho IT, mặc định tạm cho từng câu | 1, 2 |
| `04-ca-kiem-thu.md` | 3 ca: SYN-CARDIO-013 (khám mới), SYN-CARDIO-001 (tái khám), SYN-CARDIO-039 (đọc bổ sung), đầu ra mong đợi từng trường | 2 |
| `05-du-lieu-thay-tmh.md` | Đề xuất dữ liệu Tim mạch (ca mặc định, lịch hẹn, mẫu câu, ICD, dịch vụ, thuốc, STT), mỗi mục có nhãn SEEN / DATASET / MOCK / ẨN; đề xuất xử lý file hậu tố ` 2` | 3 |
| `06-phu-luc-kiem-ke-tmh.md` | Kiểm kê nơi còn nạp dữ liệu TMH, có `file:line` | 3 |

## Năm điểm Codex cần biết trước

1. **Giữ riêng hai mục khám.** "Khám tim mạch, hô hấp" là trường mới, chưa có trong config, schema AI, eForm hay bản in. "Khám chuyên khoa" bỏ cấu trúc tai/mũi/vòm/họng.
2. **Không chép chẩn đoán ban đầu sang ra viện.** Hiện `dien-phieu.ts` làm việc này, và cả 60 ca mock cũng ghi như vậy trong `reference_note`.
3. **Chưa có thông tin khác với "Không"** ở dị ứng, thuốc đang dùng và hẹn tái khám. Khi thiếu thông tin thì không chọn nút nào. Schema AI đã có `chua_de_cap` và `null`, nhưng eForm và mapper vẫn coi hẹn tái khám có mặc định "Không".
4. **Sinh hiệu là dữ liệu lượt khám do ĐD đo.** AI không ghi đè sinh hiệu.
5. **Danh mục ICD đang nạp là TMH**, không có mã tim mạch. Mọi mã trong ca kiểm thử sẽ không khớp cho đến khi thay danh mục (mục 3 của `05`).

## Quyền riêng tư

- Ảnh nguồn là ảnh EMR thật. Ảnh chỉ được đọc cục bộ, không chép vào repo.
- File bàn giao chỉ có nhãn, cấu trúc và tên mục danh mục. Không có tên, PID, mã lượt, tài khoản bác sĩ, sinh hiệu, thuốc hay kết quả của người bệnh.
- Mọi giá trị trong `04` lấy từ bộ ca tổng hợp `SYN-*`.

## Quyết định Claude đã tự đưa ra

| # | Quyết định | Lý do | Nếu sai thì mất gì |
|---|---|---|---|
| R1 | Ghi bàn giao vào `handoff/claude/` trên cây làm việc hiện tại của repo, **không tạo worktree hay nhánh mới** | Repo không có nhánh `dev` (CLAUDE.md quy tắc 6 bắt buộc tạo nhánh từ `dev`). Chỉ có 1 commit gốc, còn phần lớn code và `data/cardiology/` chưa commit, nên worktree tạo từ HEAD sẽ thiếu đúng phần cần đọc. Bàn giao chỉ là file `.md` mới, không sửa file nào khác | Nếu Codex cần thư mục này trong worktree của mình: chép thư mục, hoặc commit sau khi chủ repo tạo `dev` |
| R2 | Đếm 24 ảnh gồm 21 ảnh thư mục con và 3 ảnh phiếu ĐD ở thư mục cha | Plan ghi 24 ảnh trong thư mục con, thực tế có 21 | Nếu 3 ảnh ĐD ngoài phạm vi: chỉ mất phần ghi chú nguồn sinh hiệu |
| R3 | Đầu ra mong đợi của ba ca khác `reference_note` ở chẩn đoán ra viện, chẩn đoán kèm theo, sinh hiệu, `da_xu_ly` | Plan yêu cầu "chỉ điền khi có căn cứ từ nguồn hoặc bác sĩ xác nhận" | Nếu bác sĩ muốn ra viện mặc định bằng ban đầu (Q8): sửa 3 dòng trong `04` và bỏ B4 |
| R4 | Giao phần kiểm kê TMH (`06`) cho sub-agent Sonnet chỉ đọc. Claude đã kiểm lại các phát hiện chính | CLAUDE.md quy tắc 7 | Những mục ghi "chưa xác minh" trong `06` cần kiểm lại khi sửa |
