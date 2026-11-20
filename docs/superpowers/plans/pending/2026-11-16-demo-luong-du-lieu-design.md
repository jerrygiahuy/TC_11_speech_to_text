# Màn demo luồng dữ liệu: STT → che PII tự động → AI → lưu → phiếu khám

Ngày: 16/11/2026. Trạng thái: **bản thiết kế chờ duyệt lần cuối**, chưa sửa code sản phẩm. Đã qua rà soát của người đọc độc lập; câu trả lời ở mục 12.

## 1. Mục đích

Một màn hình cho người xem thấy trọn luồng, từng bước:

1. Bác sĩ nói (hoặc phát file / kịch bản mẫu) → STT ra bản chép lời.
2. Bản chép lời **thô** còn thông tin định danh (dữ liệu giả).
3. Máy chủ **tự động** che theo bộ rule PII ở mục 5 → bản sạch.
4. Chỉ bản sạch được đưa cho AI: tóm tắt, phân tích, map vào dữ liệu có cấu trúc (`ClinicalExtraction`).
5. Lưu vào kho hồ sơ → đọc lại từ kho và hiện lên phiếu khám để bác sĩ xem, sửa, duyệt lần cuối.

**Bác sĩ không có thao tác nào giữa bước 2 và bước 4.** Lần kiểm tra duy nhất của bác sĩ là trên phiếu khám ở bước 5.

### Người xem và điều họ cần thấy

| Người xem | Câu cần chứng minh | Họ cần thấy gì |
|---|---|---|
| Bác sĩ, lãnh đạo bệnh viện | "Thông tin định danh không rời máy chủ bệnh viện; bác sĩ chỉ duyệt phiếu" | Chỗ tô đỏ biến thành nhãn xanh, đếm số mục đã che, phiếu điền sẵn, số thao tác của bác sĩ |
| Hội đồng kỹ thuật | "Luồng chạy thật trên máy chủ, có chốt chặn, có nhật ký kiểm tra" | Thời gian từng bước, số mục che theo loại rule, **nguyên văn** dữ liệu gửi AI, kết quả kiểm tra cấu trúc, bản ghi đã lưu kèm revision, phiên bản rule/prompt/schema |

Một màn, có công tắc **Chế độ: Bác sĩ / Lãnh đạo | Kỹ thuật**. Hai chế độ dùng chung một lượt chạy; chế độ Kỹ thuật chỉ mở rộng thêm chi tiết.

## 2. Mục tiêu, không làm, thất bại

**Mục tiêu**
- Chạy trọn 5 bước trong một lần bấm, xem được tiến độ theo thời gian thực.
- Bộ che PII tự động theo 14 rule (mục 5), có chốt chặn: nghi ngờ còn sót thì **không gọi AI**.
- Kết quả bước 5 đọc lại từ kho đã lưu, không phải từ bộ nhớ trình duyệt.
- Chạy được không cần mạng và không tốn phí (STT local hoặc kịch bản, AI = `mock`).

**Không làm trong đợt này**
- Không thay database (giữ kho file JSON có revision; SQLite là việc riêng nếu cần).
- Không bỏ bước duyệt thủ công trên eForm `/` (việc tiếp theo, sau khi bộ rule mới được đo).
- Không làm đăng nhập/phân quyền thật, không nối HIS thật.

**Thất bại nếu** (dù chạy được)
- Bản thô bị ghi xuống đĩa, log hoặc gửi ra ngoài máy chủ.
- Dữ liệu gửi AI còn một giá trị định danh đã biết của bệnh nhân/người nhà/bác sĩ.
- Che nhầm làm mất nội dung lâm sàng (tên thuốc, liều, bên tai, thời gian bệnh) khiến phiếu sai.
- Người xem phải đọc chữ nhỏ mới hiểu; chế độ Bác sĩ/Lãnh đạo không kể được câu chuyện trong 1 phút.

## 3. Ràng buộc

- Chỉ dữ liệu giả (quy tắc 2 của `CLAUDE.md`). Kịch bản demo chứa PII **giả** được viết riêng.
- Mã danh mục (ICD, dịch vụ) chỉ gán bởi `src/shared/match.ts`, không để AI điền.
- `src/client` không import `src/server`; kiểu request/response đặt trong `src/shared/`.
- Next.js 16: đọc `node_modules/next/dist/docs/` trước khi viết route handler trả stream.
- Luật BVDLCN 91/2025/QH15 (hiệu lực 01/01/2026) và Nghị định 356/2025/NĐ-CP; tham chiếu HIPAA Safe Harbor (45 CFR §164.514(b)(2)) làm danh mục kỹ thuật. Chi tiết ở mục 5.
- Hiện trạng code cần biết:
  - STT là backend Python tại `STT_BACKEND_URL` (mặc định `127.0.0.1:8765`), gọi qua `lib/stt/proxy.ts`, chỉ nhận `audio/wav`.
  - `redactTranscript` (`src/shared/clinical/privacy.ts`) là bộ che quy tắc hiện có; `PrivacyTickets` (`src/server/clinical/privacy.ts`) buộc bước *prepare → approve* có `consent` của người duyệt.
  - `extractClinical` (`src/server/clinical/extraction.ts`) **hiện luôn chạy `mockClinicalExtraction`**, model ghi cứng `clinical-rules-2`, và `assertDataUseAllowed` chặn mọi đích `external` với bệnh án cấp 2. Tức là đường clinical chưa từng gọi LLM thật.
  - Hồ sơ bệnh nhân giả `data/clinic/patients.json` chưa có trường đồng ý xử lý AI.
  - `data/giong-noi/` chưa có file WAV (tạo bằng `npm run tao-am-thanh-mau`).

## 4. Các hướng đã cân nhắc

| Hướng | Mô tả | Đánh đổi | Kết luận |
|---|---|---|---|
| **1. API điều phối, đẩy tiến độ dạng stream** | Một endpoint chạy 5 bước trên máy chủ, mỗi bước xong gửi một sự kiện về màn hình | Thêm một API mới; đúng với câu "che trên máy chủ, AI không thấy bản thô"; có số đo thời gian thật | **Đã chọn** |
| 2. Trình duyệt gọi lần lượt API có sẵn | Ít code mới | Trình duyệt giữ bản thô và điều khiển luồng; API có sẵn bắt buộc duyệt tay nên vẫn phải sửa | Bỏ |
| 3. Gắn vào eForm | Dùng lại giao diện có sẵn | eForm đã dày, người xem không thấy rõ từng bước | Bỏ |

Cách làm sạch: đã chọn **A — che nhiều lớp tự động, chặn khi nghi ngờ** (thay vì chạy LLM trong mạng bệnh viện hoặc kết hợp). Lý do: chạy được ngay với mock, khi gắn model thật không phải đổi luồng.

## 5. Bộ rule PII

Module mới, đề xuất `src/shared/clinical/pii/` (TS thuần, dùng được cả hai phía; phía máy chủ là nơi quyết định). Phiên bản rule mới: `pii-auto-1`. Mỗi rule có mã, loại nhãn, căn cứ; mỗi lần che trả về `{rule, loai, start, end}` để hiện tô màu và đếm.

| Mã | Rule | Nhãn thay thế | Căn cứ |
|---|---|---|---|
| R1 | Che định danh của **bệnh nhân, người nhà, người sống cùng, nơi làm việc**. Danh sách giá trị đã biết lấy từ hồ sơ đang mở (họ tên, PID, mã khám, số điện thoại, địa chỉ, tên người nhà, nơi làm việc, tên bác sĩ/điều dưỡng). So khớp không phân biệt hoa thường, có và không dấu | `[BỆNH_NHÂN]`, `[NGƯỜI_NHÀ_n]`, `[BÁC_SĨ]`, `[NƠI_LÀM_VIỆC]` | HIPAA Safe Harbor (định danh của cá nhân và người thân, chủ lao động, người cùng hộ); NĐ 356 (quan hệ gia đình) |
| R2 | Họ tên, tên gọi khác chưa có trong danh sách (theo từ khóa "tên là", "anh/chị/ông/bà/cô/chú + Tên Riêng") | `[NGƯỜI_n]` | HIPAA (A); NĐ 356 |
| R3 | Địa danh nhỏ hơn cấp tỉnh: số nhà, đường, phường/xã, quận/huyện, thôn/ấp, quê quán, nơi sinh. Không cần từ khóa "địa chỉ" | `[ĐỊA_DANH_n]` | HIPAA (B) |
| R4 | Mốc ngày gắn với bệnh nhân (sinh, nhập/xuất viện, khám, mất). **Giữ** khoảng thời gian bệnh ("3 ngày nay", "từ tuần trước") | `[NGÀY]` | HIPAA (C) |
| R5 | Số điện thoại, fax, email, URL, địa chỉ IP | `[LIÊN_HỆ]` | HIPAA (D, E, F, N, O) |
| R6 | CCCD/CMND, hộ chiếu, BHYT, PID, mã hồ sơ, mã khám, số tài khoản/thẻ ngân hàng, giấy phép lái xe, biển số xe, số seri thiết bị | `[MÃ_ĐỊNH_DANH]` | HIPAA (G–M); NĐ 356 |
| R7 | Quốc tịch, dân tộc, tôn giáo, quan điểm chính trị, xu hướng tình dục, tình trạng hôn nhân | `[THÔNG_TIN_NHẠY_CẢM]` | NĐ 356 (dữ liệu nhạy cảm) |
| R8 | Chuyện đời tư, bí mật gia đình ngoài phạm vi khám. **Giữ** tiền sử bệnh gia đình ("mẹ bị ung thư vòm") nhưng bỏ tên | `[NỘI_DUNG_NGOÀI_KHÁM]` | NĐ 356 |
| R9 | **Audio không rời máy chủ**: STT chạy local, audio không lưu, chỉ chữ đã che đi tiếp | — | HIPAA (P); NĐ 356 (sinh trắc học) |
| R10 | Nhãn **không suy ra được danh tính** (số thứ tự trong lượt, không băm từ giá trị). Bảng nhãn → giá trị chỉ ở bộ nhớ máy chủ trong lượt chạy, không gửi AI, không ghi log, không lưu | — | HIPAA §164.514(c); ISO/IEC 20889 |
| R11 | **Chốt chặn trước khi gọi AI.** Không gọi nếu bản sạch còn: (a) bất kỳ giá trị nào của R1 (kể cả dạng không dấu), (b) dãy từ 6 chữ số trở lên, (c) cụm Tên Riêng viết hoa ≥ 2 từ không có trong danh mục thuốc/thuật ngữ cho phép, (d) email/URL. Khi chặn: dừng ở bước 3, hiện lý do theo mã rule, không ghi gì ra ngoài | — | Luật 91/2025 Điều 14 khoản 6, Điều 20 |
| R12 | **Tối thiểu dữ liệu**: chỉ gửi đoạn hội thoại đã che + phiên bản prompt/schema. Thông tin hành chính trên phiếu lấy từ hồ sơ, không nhờ AI trích | — | Luật 91/2025 Điều 3, Điều 30; ISO/IEC 29100 |
| R13 | **Nhật ký kiểm tra**: mỗi lượt ghi số mục đã che theo mã rule, phiên bản rule, mã băm bản gửi AI, kết quả R11, provider/model. Không ghi giá trị thật | — | Luật 91/2025 Điều 14 khoản 6a |
| R14 | Bệnh nhân **chưa đồng ý** xử lý AI (cờ `dong_y_xu_ly_ai` lấy lúc tiếp đón) thì không gọi AI ngoài; chỉ chạy bộ tách quy tắc local | — | Luật 91/2025 Điều 26 |

Cũng che như hiện nay: tuổi và giới tính (đã có trong hồ sơ, AI không cần; giảm rủi ro ghép với bệnh hiếm). Giữ nguyên: tên thuốc, liều, đơn vị, số đo sinh hiệu, bên trái/phải, thời gian bệnh. Hai điểm này là **lựa chọn của người thiết kế**, sửa được.

Danh mục cho phép ở R11(c): tên thuốc từ danh mục thuốc hiện có, tên dịch vụ, thuật ngữ TMH. Người làm chọn nguồn cụ thể trong `data/`.

## 6. Luồng máy chủ

Endpoint mới: `POST /api/demo-luong` (Node runtime, `assertLocalDemoRequest`). Trả về **stream NDJSON**, mỗi dòng là một sự kiện `{ buoc, trang_thai, ms, du_lieu }`. Kiểu sự kiện đặt ở `src/shared/demo-luong/types.ts`.

Đầu vào (một trong ba):
- `audio/wav` (ghi từ micro hoặc file chọn) → gọi STT qua `lib/stt/proxy.ts`.
- `kich_ban`: mã một kịch bản mẫu → đọc chữ có sẵn, bỏ qua STT (dùng khi không có backend STT).
- Kèm `benh_nhan_id` để lấy danh sách giá trị đã biết (R1) và cờ đồng ý (R14).

| Bước | Máy chủ làm | Sự kiện gửi về |
|---|---|---|
| 1. STT | Chuyển audio sang chữ, không lưu audio | Chữ, thời lượng audio, thời gian xử lý, engine |
| 2. Bản thô | Ghép đoạn, gán vai trò nếu có nhãn | Bản thô **kèm vị trí các đoạn nhạy cảm và mã rule** để màn hình tô đỏ. Chỉ gửi về màn hình, không ghi đĩa/log |
| 3. Che + chốt chặn | Chạy R1–R8, R10; rồi R11, R14 | Bản sạch, đếm theo rule, kết quả chốt chặn. Nếu chặn: sự kiện `bi_chan` kèm lý do, **dừng luồng** |
| 4. AI | Gọi AI với bản sạch (R12), kiểm cấu trúc bằng `validateClinicalExtraction`, khớp danh mục bằng `match.ts` | Nguyên văn payload gửi AI, provider/model/prompt version, kết quả kiểm cấu trúc, `ClinicalExtraction` |
| 5. Lưu | Ghi hồ sơ (revision mới) + nhật ký R13, rồi **đọc lại** từ kho | Bản ghi đọc lại, số revision, đường dẫn file, mã băm |

Bước 4 dùng lại `extractClinical` nhưng cần một lối vào mới không đi qua `PrivacyTickets.approve` thủ công: transcript đã che được đánh dấu `privacy.trang_thai = "passed"` **bởi chốt chặn R11**, có ghi `policy_version = pii-auto-1`. `assertDataUseAllowed` được nới đúng một chỗ: dữ liệu đã qua R11 và có R14 được coi là đã khử nhận dạng (Luật 91/2025 Điều 2 khoản 1). Mặc định provider vẫn là `mock`.

Kho lưu: dùng `ClinicalRepository` sẵn có, trỏ vào thư mục riêng `data/demo-luong/` (gitignore) để demo không trộn với hồ sơ prototype. Có nút "Xóa dữ liệu demo".

## 7. Màn hình

Trang mới `/demo-luong`, link trên thanh đầu. Bố cục máy bàn:

```
┌ Thanh trên: [Chế độ: Bác sĩ/Lãnh đạo | Kỹ thuật]  Bệnh nhân giả ▾  Đồng ý AI: ✓ (lúc tiếp đón)  [↺ Làm lại] ┐
│ Nguồn: (● Micro) (○ File WAV) (○ Kịch bản mẫu ▾)        [▶ Chạy toàn luồng]                                │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ①Ghi âm ──▶ ②Bản chép lời ──▶ ③Bản đã che ──▶ ④AI phân tích ──▶ ⑤Phiếu đã lưu   (mỗi ô: trạng thái, ms) │
├──────────────────────────────┬──────────────────────────────┬─────────────────────────────────────────────┤
│ Bản thô                       │ Bản đã che                    │ Phiếu khám (đọc lại từ kho)                │
│ "...chị [Nguyễn Thị Giả]..."  │ "...chị [BỆNH_NHÂN]..."       │ Lý do khám / Bệnh sử / Chẩn đoán + ICD     │
│  (đỏ, rê chuột thấy mã rule)  │  (xanh, cùng vị trí)          │ Câu nguồn, cờ cần kiểm tra                  │
│                               │ "Đã che 7 mục · chặn: không"  │ [Sửa] [Lưu bản sửa] [Duyệt]  rev 2          │
└──────────────────────────────┴──────────────────────────────┴─────────────────────────────────────────────┘
```

- **Chế độ Bác sĩ/Lãnh đạo:** ba cột như trên, chữ lớn, hiệu ứng đỏ → xanh, một dòng khẳng định "Thông tin định danh không rời máy chủ bệnh viện", và bộ đếm "Bác sĩ thao tác: 1 lần (duyệt phiếu)".
- **Chế độ Kỹ thuật:** mỗi ô bước mở được ra panel chi tiết: thời gian, đếm theo mã rule (bảng), nguyên văn payload gửi AI, phiên bản rule/prompt/schema, kết quả kiểm cấu trúc, JSON bản ghi đã lưu, dòng nhật ký R13.
- **Bị chặn ở R11:** ô ③ đỏ, hiện lý do theo mã rule, ô ④ ⑤ xám "Không gửi AI". Có một kịch bản mẫu cố ý gây chặn để trình diễn.
- **Bước 5:** sửa và lưu tạo revision mới; Duyệt dùng luồng duyệt sẵn có nếu khớp, nếu không thì ghi người/thời gian duyệt từ persona demo.
- Chiều hẹp (điện thoại): các cột xếp dọc; không cần tối ưu sâu.

## 8. Kịch bản mẫu

`data/demo-luong/kich-ban/*.json` (giả, commit được), tối thiểu 3 ca:
1. Ca chuẩn: có tên bệnh nhân, số điện thoại, địa chỉ, tên người nhà, ngày sinh, CCCD giả, quốc tịch, tiền sử gia đình, thuốc + liều + bên tai.
2. Ca bệnh nhân chưa đồng ý AI (R14): luồng chạy bộ tách local.
3. Ca bị chặn (R11): một tên riêng lạ không có trong danh sách và không bắt được bằng từ khóa.

Mỗi ca có `expected` (các đoạn phải che, các cụm phải giữ) để test.

## 9. Thay đổi chính sách và tài liệu

- `docs/DATA-USE-POLICY.md`: bỏ yêu cầu người kiểm tra tích đồng ý ở bước lọc **cho luồng demo**; thêm 14 rule, căn cứ pháp lý, định nghĩa "đã khử nhận dạng = qua R11", R14 thay cho checkbox consent. Ghi rõ: tự động không chứng minh ẩn danh tuyệt đối.
- `docs/CLINICAL-WORKFLOW.md`, `README.md`, `docs/cau-truc-du-an.md`: thêm trang `/demo-luong`.
- `data/clinic/patients.json`: thêm `dong_y_xu_ly_ai` (+ thời điểm) và vài giá trị người nhà/nơi làm việc giả cho R1.

## 10. Kiểm thử

- Unit test từng rule R1–R8 (che đúng, giữ đúng thuốc/liều/bên/thời gian bệnh) và R11 (mỗi điều kiện chặn có test riêng), chạy bằng `npm test`.
- Test endpoint: thứ tự sự kiện, dừng khi chặn, không có file nào chứa bản thô sau một lượt (quét `data/demo-luong/`), R14 không gọi provider ngoài.
- Đo trên các ca `expected`: tỉ lệ che đúng, che thừa; ghi vào CHANGELOG. `npm run eval -- --rule-only` trước/sau nếu đụng tới bộ tách.
- Mở `/demo-luong` trong trình duyệt, chạy cả 3 kịch bản và một lượt micro nếu backend STT chạy.

## 11. Để người làm tự quyết

- Cách cắt module rule, tên hàm, cấu trúc sự kiện chi tiết.
- Thư viện hiệu ứng (ưu tiên CSS thuần).
- Cách đọc stream ở client.
- Nguồn danh mục cho phép ở R11(c).

## 12. Quyết định sau bước rà soát

Người thiết kế tự quyết (sửa được):

- **Chữ từ STT là chữ thường** (`stt/stt.py` hạ hết về chữ thường). Vì vậy R2 và R11(c) không được dựa vào chữ hoa. Thay bằng **từ điển họ người Việt** (khoảng 100 họ phổ biến) cộng từ chỉ người ("anh/chị/ông/bà/cô/chú/bé", "tên là", "con tôi"): một họ trong từ điển theo sau bởi 1–3 âm tiết được coi là tên. Áp dụng cho cả chữ thường lẫn chữ hoa. R1 (giá trị đã biết) vốn không phụ thuộc hoa thường. Rủi ro còn lại: tên không có họ và không có từ chỉ người đi trước. Ghi rõ điều này trên màn Kỹ thuật.
- **Vai trò người nói:** đầu vào micro/WAV mặc định chế độ `dictation` (bác sĩ đọc), mọi đoạn là `bac_si`. Kịch bản mẫu dùng chế độ `conversation` với nhãn `BS:`/`BN:` có sẵn. Phân tách người nói tự động không thuộc đợt này.
- **Bước 5:** bản nháp AI được **điền thẳng vào các ô của phiếu**, đánh dấu "AI điền". Bác sĩ sửa ô nào thì ô đó thành "bác sĩ sửa". Bấm Duyệt là thao tác bắt buộc duy nhất. Không đi qua bộ đề xuất thay đổi `changes/` (bộ đó vẫn dùng cho eForm).
- **Một phiếu, nhiều phiên ghi âm** (chủ dự án yêu cầu, 16/11): mỗi lần bấm "▶ Chạy" là **một phiên ghi âm mới trong phiếu đang mở**, dùng mô hình phiên sẵn có (`recording_session_id`, `generation`, `content_revision`, `recording-service.ts`). Phiếu đầu tiên tạo khi mở trang (theo kiểu `createWalkInContext`); nút **"+ Phiếu khám mới"** tạo phiếu khác cho cùng bệnh nhân giả. Mọi thứ lưu trong `data/demo-luong/`.
  - Ghép kết quả các phiên theo `applyAiDraft`: phiên sau không xóa dữ liệu phiên trước (giá trị rỗng/"chưa đề cập" bỏ qua); danh sách (triệu chứng, chỉ định) cộng thêm, bỏ trùng; ô **bác sĩ đã sửa không bao giờ bị ghi đè** — nếu phiên sau nói khác, ô đó hiện dấu "Phiên 2 nói khác" để bác sĩ xem khi duyệt, không thêm bước bắt buộc.
  - Mỗi ô ghi nguồn: "AI · phiên 1", "AI · phiên 2" hoặc "Bác sĩ sửa"; câu nguồn trỏ về đúng phiên.
  - Thanh phiên dưới sơ đồ 5 bước: `Phiên 1 ✓ · Phiên 2 ✓ · [▶ Ghi phiên mới]`; bấm vào một phiên xem lại bản thô (chỉ trong bộ nhớ trình duyệt lúc đang mở trang) và bản đã che (đọc từ kho) của phiên đó.
  - Đã duyệt rồi mà ghi phiên mới: phiếu quay về trạng thái nháp, cần duyệt lại (giống quy tắc "sửa sau duyệt" hiện có).
  - "rev" là revision của phiếu: tăng mỗi lần một phiên được ghép vào và mỗi lần bác sĩ lưu bản sửa. "↺ Làm lại" thay bằng "+ Phiếu khám mới".
- **Lưu bản đã che** (không lưu bản thô): transcript đã che và lượt AI ghi vào `data/demo-luong/` (truyền `directory` cho `extractClinical`). Nút "Xóa dữ liệu demo" xóa cả thư mục này. Bộ nhớ đệm theo mã băm **tắt cho demo** để mỗi lượt chạy lại thật và số đo thời gian là thật.

Chủ dự án quyết (16/11):

- **AI đợt này chỉ là `mock`.** Bước 4 gọi `mockClinicalExtraction` qua `extractClinical`; màn Kỹ thuật vẫn hiện nguyên văn bản đã che và prompt/schema version "sẽ gửi", ghi rõ "Mock — chưa rời máy chủ". Phần nới `assertDataUseAllowed` (qua R11 + R14 thì được gửi ra ngoài) viết và có unit test, nhưng chưa nối nhà cung cấp thật. R14 khi chưa đồng ý: hiện trạng thái "Không được gửi AI ngoài — chạy bộ tách local" (với mock thì kết quả như nhau, khác ở nhãn và nhật ký).
- Nối Anthropic/OpenAI/Gemini cho đường clinical là **đợt sau**: thêm prompt builder, adapter, cấu hình model, chấp thuận chi phí và cho dữ liệu đã che đi ra ngoài. Luồng 5 bước không đổi.
