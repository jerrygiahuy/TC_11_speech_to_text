# Thiết kế: R3 chỉ coi "đường" là tên đường khi có dấu hiệu nơi chốn

Ngày 18/11/2026. Thiết kế ngắn (thay đổi nhỏ), người dùng đã chọn cách A.

## Vì sao

Người dùng thấy tên bệnh bị che thành địa danh: "đái tháo đường…", "tiểu đường…", "đường huyết tăng…". Đã kiểm và lỗi **không do NER**. Với 20 câu bệnh có chữ "đường", NER không gán địa danh cho câu nào. Lỗi do rule R3 trong `src/shared/clinical/pii/redact.ts`:

- R3 coi mọi "đường" là đầu một tên đường, rồi che thêm tối đa 3 âm tiết sau đó. Tên bệnh chỉ thoát nhờ một danh sách loại trừ viết tay: chữ đứng trước như "tháo", "tiểu", "hạ"…; chữ đứng sau như "huyết", "hô hấp", "mổ"…
- Cụm ngoài danh sách thì bị che. Ba ca đã thấy:
  - "đái **đường biến chứng thận**";
  - "nhiễm trùng **đường tiểu tái phát**";
  - "em ở **đường láng**" bị che lan sang dòng sau, nuốt chữ "người" ở đầu dòng kế tiếp.

## Mục tiêu, không làm, điều phải tránh

- **Mục tiêu:** cụm y khoa có chữ "đường" không bị che, kể cả cụm chưa có trong danh sách nào. Địa chỉ có dấu hiệu nơi chốn vẫn được che như cũ.
- **Không làm:** sửa R2 che lấn sang chữ kế tiếp ("nguyễn thị tâm **dị**"). Không làm dữ liệu huấn luyện NER. Hai việc này làm sau.
- **Phải tránh:** lộ địa chỉ trong kịch bản và test đang có. "nhà ở số 12 đường lê lợi phường bến thành" và "số 12 đường mẫu" phải vẫn bị che y nguyên.

## Các cách đã cân nhắc

- **A (được chọn).** Chỉ nhận "đường" là tên đường khi có dấu hiệu nơi chốn đứng trước. Cụm y khoa mới tự động an toàn. Đổi lại, câu thiếu dấu hiệu ("bé đi đường nguyễn trãi bị ngã") thì R3 không che, phải nhờ NER (NER mặc định bật và bắt được "đường láng", điểm 0,92).
- **B.** Thêm cụm vào danh sách loại trừ. Cụm "đường + chữ" trong y khoa không có giới hạn, nên lỗi sẽ quay lại.
- **C.** Bỏ "đường" khỏi R3, giao hẳn cho NER. Khi STT không chạy thì tên đường lọt hoàn toàn.

## Thiết kế

1. Tách "đường" khỏi danh sách từ hành chính chung (`ADMIN_WORDS`). "Phố", "ngõ", "phường", "quận"… giữ nguyên cách cũ.
2. Thêm một lượt quét R3 riêng cho "đường". Lượt này chỉ khớp khi ngay trước "đường", trên cùng một dòng, có một trong các dấu hiệu sau:
   - "ở", "tại", "sống (ở)", "địa chỉ (là)";
   - "nhà", có thể kèm một từ chỉ người ("nhà em", "nhà tôi");
   - số nhà: "số 12", "12", "12a", "12/3", "số nhà 12";
   - hoặc ngay sau "đường" là "số" kèm số ("đường số 5").

   Phần được che vẫn là "đường" cộng tối đa 3 âm tiết, hoặc một con số, giống cũ. Danh sách loại trừ hiện có vẫn giữ làm lớp chặn thứ hai, cho trường hợp như "tổn thương ở đường giữa".
3. Mọi biểu thức R3 dùng khoảng trắng **không gồm xuống dòng**, nên không còn che lan sang dòng sau. Phạm vi gồm biểu thức từ hành chính, biểu thức "đường" mới và biểu thức "quê / sống ở / địa chỉ".
4. **Test** (viết trước, phải đỏ trước khi sửa), trong `src/shared/clinical/pii/redact.test.ts`:
   - **Không che:** "ông nhà em bị đái đường biến chứng thận", "nhiễm trùng đường tiểu tái phát", "trên đường đi học bé bị ngã", "viêm đường sinh dục", "đường dẫn lưu còn ít dịch".
   - **Vẫn che:** "nhà em đường nguyễn trãi", "số 12 đường lê lợi", "chị ở đường láng", "ở đường số 5". Các test đang có phải giữ nguyên kết quả.
   - **Không lan dòng:** "em ở đường láng\nngười nhà khai…" chỉ che "đường láng".
5. **Đo:** chạy `npm run eval-pii` (chỉ rule) và `--ner` trước và sau khi sửa. Câu STT, kịch bản và số che nhầm không được xấu đi. Thêm vào `data/pii-eval/cau-stt.json` vài câu bệnh có "đường" (phần không được che) và một câu địa chỉ không có dấu hiệu nơi chốn (phần phải che, để thấy NER gánh). Chạy thêm `npm run eval -- --rule-only` để chắc bộ tách không đổi.
6. **Tài liệu:** CHANGELOG ghi số đo trước và sau. `docs/CLINICAL-WORKFLOW.md` thêm một dòng về R3 nếu có mô tả R3.

## Để lại cho người làm

Danh sách dấu hiệu nơi chốn chính xác: có thể thêm "gần", "đầu", "cuối" nếu test cho thấy cần. Mặc định chưa thêm, vì "trên đường", "gần đường" thường là lời kể chứ không phải địa chỉ.
