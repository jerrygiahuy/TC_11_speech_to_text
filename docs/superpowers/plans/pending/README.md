# Các plan chưa triển khai

Thư mục này chứa các plan mới chưa bắt đầu thực hiện và tài liệu thiết kế đi kèm.

| Plan | Trạng thái | Thiết kế |
| --- | --- | --- |
| [CardioNote: sản phẩm riêng cho Trung tâm Tim mạch](2026-11-20-cardionote-tim-mach.md) | Đang triển khai: Task 0–10 và review giữa kỳ (kèm sửa) xong (20/11); đang làm Task 11 | Spec: `handoff/claude/02`–`06`, `config/forms/phieu-kham-ngoai-tru.json` |
| [WER CLI: micro và file audio](2026-11-13-wer-cli.md) | Chưa triển khai | [Thiết kế WER CLI](2026-11-13-wer-cli-design.md) |
| [Một lượt khám, nhiều phiên ghi âm](2026-11-14-interrupted-encounters.md) | Đang triển khai — server Task 1–6 đã có test; còn client/giao diện (Task 7) và nghiệm thu (Task 8), việc còn lại ở cuối plan | [Thiết kế lượt khám đứt quãng](2026-11-14-interrupted-encounters-design.md) |
| [Dashboard lịch khám và thông tin bệnh nhân](2026-11-14-dashboard-patient.md) | Đang triển khai — Task 1–6 đã làm (đọc phiếu thật, xem phiếu cũ, mở/tiếp tục phiếu); còn Task 7 (nghiệm thu, mục chưa kiểm ghi ở `docs/testing/2026-11-14-dashboard-patient.md`) | [Thiết kế dashboard và bệnh nhân](2026-11-14-dashboard-patient-design.md) |
| [eForm dùng bộ che PII R1–R14](2026-11-17-eform-pii-r1-r14.md) | Đã triển khai Task 1–6 (17/11): test, tsc, eslint src đạt, đã kiểm trình duyệt 5 ca; còn thử micro thật, chưa chuyển khỏi `pending/` | [Thiết kế eForm R1–R14](2026-11-17-eform-pii-r1-r14-design.md) |
| [Lớp NER PhoBERT cho bộ che PII](2026-11-18-ner-phobert.md) | Đã triển khai Task 1–10 (18/11): đã huấn luyện (F1 test 0,956), rule cộng NER bắt được 64,9% câu STT so với 29,7% khi chỉ dùng rule, đã kiểm trình duyệt; chưa commit, mặc định vẫn `PII_NER=off` chờ người dùng quyết, chưa chuyển khỏi `pending/` | [Thiết kế NER PhoBERT](2026-11-18-ner-phobert-design.md) |
| [Sửa R3 "đường" và R2 che lấn](2026-11-18-sua-r2-r3.md) | Đã triển khai Task 0–3 (18/11): che nhầm câu STT 9/84 → 0/84, test đạt, chưa commit, chưa chuyển khỏi `pending/` | [Thiết kế R3 "đường"](2026-11-18-r3-duong-design.md); R2 thiết kế trong plan |
| [Màn demo luồng dữ liệu và che PII tự động](2026-11-16-demo-luong-du-lieu.md) | Đã triển khai Task 1–8 (17/11): test, lint, build đạt, đã kiểm trình duyệt; còn thử micro thật với STT, chưa chuyển khỏi `pending/` | [Thiết kế demo luồng dữ liệu](2026-11-16-demo-luong-du-lieu-design.md) |

Khi bắt đầu thực hiện, cập nhật trạng thái tại đây. Khi hoàn tất, chuyển cả plan và thiết kế ra khỏi `pending`, đồng thời cập nhật các đường dẫn tham chiếu.

Các plan cũ đã triển khai vẫn ở thư mục cha. Community-1 đã có phần triển khai nhưng còn chờ kiểm chứng native/RAM, nên không được xếp thành plan chưa bắt đầu. DeepFilterNet đã triển khai và kiểm chứng; WER CLI là công việc mới chưa làm.
