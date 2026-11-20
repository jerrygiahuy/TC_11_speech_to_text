# Thiết kế: một lượt khám, nhiều phiên ghi âm

**Trạng thái: IN PROGRESS — người dùng yêu cầu triển khai cùng plan ngày 14/11/2026.**

Nguồn yêu cầu: [brainstorming](../../2026-11-14-interrupted-encounters-brainstorming.md).

## Mục tiêu đã chốt

Một bệnh nhân có mã khám do bệnh viện cấp trước khi khám. Trong cùng mã khám, bác sĩ có thể khám ban đầu, duyệt phiếu/chỉ định, cho bệnh nhân đi xét nghiệm 1–3 tiếng, khám người khác, rồi mở lại đúng lượt cũ để bổ sung kết luận và hướng điều trị. Mỗi lần gặp có phiên ghi âm riêng. Không tự đóng lượt khi dừng microphone hay duyệt chỉ định.

Chọn hướng 1: cập nhật hồ sơ theo từng phiên. AI chỉ đề xuất; thay đổi vào nội dung đã duyệt cần bác sĩ duyệt riêng, giữ lịch sử và nguồn.

## Các hướng đã cân nhắc

1. **Cập nhật từng phiên — người dùng đã chọn.** Bảo toàn phần đã duyệt, kiểm soát thay đổi và các chỉ định đã có. Đổi lại cần so sánh dữ liệu và quản lý phiên bản duyệt.
2. Tạo lại toàn bộ bản nháp từ tất cả phiên. Có ngữ cảnh xuyên suốt nhưng dễ đề xuất lại chỉ định, khó giữ chỉnh sửa của bác sĩ; không chọn.

## Hiện trạng đã kiểm tra

- Next.js 16.4.5, React 19.3.0, TypeScript, Zod, node:test qua tsx; repository JSON một instance.
- `Encounter.id` là UUID nội bộ; `patient_id` là mã bệnh nhân; `appointment_id` đang nhận mã lượt khám của fixture. Không dùng mã bệnh viện làm tên file.
- Có `dang_kham`, `cho_kq_cls`, `hoan_thanh_kham` và các trạng thái kết thúc khác. Revision và lịch sử đã tồn tại.
- `ClinicalRepository.update()` hiện xóa duyệt chung mỗi lần lưu. `approveClinical()` duyệt toàn bộ phiếu/chỉ định. Cần thay đổi để giữ các bản đã duyệt trước đó.
- `readClinical()`/`seed()` và `loadEformData()` vẫn lấy một ca mẫu cố định; privacy cũng dùng danh tính fixture. Phải chọn và kiểm tra ngữ cảnh bệnh nhân ở server.
- `applyAiDraft()` hiện merge dữ liệu và có thể thay giá trị scalar. UI và server có hai đường merge khác nhau. Cần cùng dùng một tập thay đổi được bác sĩ lựa chọn.
- Microphone hiện trả chuỗi text, không mang định danh lượt khám. Có đường Zipformer và đường DeepFilterNet cần kiểm tra đồng thời.
- Audio hiện được xử lý local, không lưu lâu dài. Chỉ transcript đã kiểm tra riêng tư được lưu trong artifact AI.

## Phạm vi và các quyết định kỹ thuật đề xuất

Đây là lựa chọn của người lập plan, chưa phải yêu cầu người dùng đã xác nhận riêng:

1. Triển khai trước trong prototype local với ít nhất hai bệnh nhân giả và một bệnh nhân có hai mã khám. Tạo adapter ngữ cảnh để sau này nối HIS; không xây tích hợp HIS thật hoặc bỏ giới hạn dữ liệu giả.
2. Bản này lưu **metadata phiên ghi âm và bản chép lời đã được kiểm tra**, giữ nguyên chính sách không lưu audio lâu dài. Lưu/nghe lại WAV là phạm vi bổ sung, chưa được quyết định trong brainstorming. Không hiển thị nút nghe lại nếu không có audio.
3. Một thiết bị được đại diện bằng `device_id` sinh trong trình duyệt; server cấp lease có heartbeat để ngăn hai tab ghi đồng thời. Đây là bảo vệ trong prototype, không tuyên bố nhận diện thiết bị vật lý hoặc điều phối cả bệnh viện.
4. Trạng thái chờ có thể kéo dài qua ngày, không tự hết hạn sau 3 tiếng. Không tự hoàn tất khi có kết quả; bác sĩ chủ động tiếp tục/hoàn tất. Không thêm quy trình mở lại lượt đã hoàn tất ở đợt này.

## Định danh và lưu trữ

- Giữ UUID nội bộ `Encounter.id`; tra cứu duy nhất bằng `(facility_id, appointment_id)`. Mã khám dạng chuỗi giữ số 0 đầu. Cùng mã nhưng khác cơ sở không bị gom; cùng mã/cơ sở mà khác bệnh nhân phải báo lỗi, không sửa chủ sở hữu.
- `ClinicalActor { doctorId, facilityId }` lấy ở server từ adapter demo. `EncounterContext { appointmentId, patientId, facilityId, doctorId, data: EformData }` lấy từ danh sách lượt khám server; client không được tự khai patient ID để thay hồ sơ.
- Mở mã đã có phải trả đúng hồ sơ cũ, kể cả hai yêu cầu mở đồng thời. Khóa tạo theo khóa tra cứu, và kiểm tra lại dưới khóa. Không lấy danh sách “đang chờ” để thay cho tính duy nhất.
- Schema clinical nâng từ `1.1.0` lên `1.2.0`, sinh lại types từ JSON schema. Thêm `recording_sessions`, `approval_versions`, `change_decisions`; gắn recording ID vào transcript/run/source. Mỗi session chứa ID, thứ tự, giờ bắt đầu/kết thúc, trạng thái, lý do dừng, reviewed transcript và revision của transcript nếu có.
- Metadata phiên và các quyết định nằm trong aggregate Encounter để một lần cập nhật được bảo vệ bởi khóa/revision hiện có. Run artifacts là bất biến, có định danh encounter/session, được ghi trước khi gắn vào hồ sơ; artifact mồ côi không đồng nghĩa đã áp dụng.
- Dữ liệu 1.1.0 đọc qua migrator thuần, không tự ghi lại file lúc đọc. Giữ duyệt cũ thành một bản duyệt legacy khi có; không bịa giờ ghi âm hoặc phiên cũ nếu không có nguồn. Ghi version mới khi người dùng lưu. Không làm mất dữ liệu cũ hay sửa generated types bằng tay.

## Vòng đời và chuyển bệnh nhân

- Lượt khám: `dang_kham → cho_kq_cls → dang_kham → hoan_thanh_kham`; có thể lặp chờ/tiếp tục. Các trạng thái kết thúc khác vẫn giữ nguyên semantics cũ và chặn ghi âm. Kiểm tra chuyển trạng thái ở server, không chỉ khóa UI.
- Phiên ghi âm: `opening → recording → finalizing → stopped`; lỗi/crash thành `interrupted`. Không gắn việc duyệt riêng tư vào trạng thái microphone; lưu trạng thái nội dung riêng `empty | awaiting_review | reviewed`.
- Mỗi start chụp cố định `{encounterId, recordingSessionId, generation}`. Mọi callback STT, privacy ticket, AI run và quyết định áp dụng dùng định danh này. Run của A gửi vào B bị từ chối ở server.
- Khi chuyển bệnh nhân: dừng microphone, flush câu cuối, chờ lưu metadata và nội dung đã duyệt; nếu còn text chưa kiểm tra thì yêu cầu hoàn tất kiểm tra hoặc chủ động bỏ phần chưa lưu. Mặc định chặn chuyển khi chưa xử lý xong; không âm thầm bỏ dữ liệu.
- Nếu dừng/lưu thất bại: không báo đã lưu, không mở microphone cho B; cho retry hoặc lựa chọn bỏ phần chưa lưu có xác nhận. Không cần chờ AI hoàn tất để chuyển nếu phiên đã dừng và dữ liệu đủ điều kiện đã lưu.
- Chốt microphone và chốt nội dung là hai thao tác riêng: phiên đã stopped vẫn cho phép attach bản chép lời được duyệt sau đó hoặc ghi quyết định bỏ phần chưa lưu. Quyết định bỏ không xóa transcript đã lưu trước đó; ghi nhận actor, thời gian và phiên bản nội dung, dùng request ID để retry không lặp. Sau khi bỏ, trạng thái nội dung là `discarded`, không cản hoàn tất lượt vì còn awaiting_review.
- Mỗi lần sửa text tăng `content_revision`, vô hiệu ticket đang chờ và đồng ý cũ. Ticket duyệt gắn đúng encounter/session/content_revision/digest bản text đã lọc; attach/extract kiểm lại binding và từ chối ticket phiên bản cũ. Nội dung đã lưu là bất biến theo revision, chỉnh sau đó tạo bản mới và không làm mất nguồn của run cũ.
- Kết quả AI đến muộn được giữ trong artifact của A và hiện khi mở A; không gọi callback cập nhật form B. Định danh A/B không gửi cho model như một phần nội dung hội thoại.
- Khi tab đóng đột ngột, lease hết hạn; lần mở lại đánh dấu phiên cũ interrupted. Khôi phục bản đã lưu gần nhất, thông báo phần chưa lưu có thể mất. Không hứa phục hồi audio hoặc text chưa qua kiểm tra.

## Cập nhật và duyệt từng phần

- Chia phạm vi duyệt: `initial_note` (lý do/bệnh sử/tiền sử/khám và chẩn đoán ban đầu), `service_order:<stable-id>` (từng chỉ định), `conclusion` (nhận định kết quả/chẩn đoán xác định/hướng điều trị/lời dặn/hẹn), `summary` (tóm tắt). Ánh xạ đường dẫn nằm ở một module dùng chung; nhóm khác không bị mất duyệt khi chỉ nhóm này thay đổi.
- Mỗi approval version lưu ID, scope, nội dung snapshot, digest, người/thời gian duyệt và nguồn. Không sửa hoặc xóa bản đã duyệt. Bản hiện tại khác digest đã duyệt được ghi “Có thay đổi chưa duyệt”; bản cũ vẫn xem/in được với nhãn phiên bản.
- Tập đề xuất dùng stable item ID, gồm giá trị cũ/mới, nguồn phiên/run/segment và expected revision. Cùng một logic dùng cho preview và apply ở server. Không áp dụng khi revision hoặc giá trị nền đã thay đổi.
- Mọi thay đổi AI cần lựa chọn của bác sĩ; phần đã duyệt phải hiển thị cũ/mới và duyệt lại đúng scope sau khi áp dụng. Chấp nhận một thay đổi không đồng nghĩa duyệt tất cả. Thông tin null/chưa đề cập không xóa thông tin cũ.
- Nhắc lại dịch vụ đã có không tạo chỉ định mới. Chỉ tự nhận diện trùng khi có mã dịch vụ, bên, vị trí, số lượng và thông số liên quan khớp; trường thiếu/mơ hồ phải đưa vào mục cần đối chiếu. Bác sĩ có thể chủ động tạo chỉ định lặp có lý do, không cấm xét nghiệm lặp hợp lệ.
- Không hủy/sửa chỉ định đã duyệt bằng AI. Giữ cách xử lý riêng hiện tại; không thêm gửi chỉ định HIS trong phạm vi này.
- “Duyệt” không đổi trạng thái lượt khám. “Chờ kết quả” không bắt buộc phải có chẩn đoán xác định. Hoàn tất cần bản hiện tại được lưu/duyệt theo yêu cầu khám hiện hành, không còn phiên đang ghi/chốt hoặc thay đổi chưa xử lý; server kiểm lại.
- Giữ nguyên quy trình kê đơn thủ công, không bổ sung AI kê đơn.

## Kết quả cận lâm sàng và phần hoãn

Giữ nguyên link hoặc kết luận ngắn được trả về phần mềm; bác sĩ xem chi tiết trên hệ thống khác. Không tải/nhúng hệ thống nguồn, không thêm OCR hoặc đồng bộ mới. Mong muốn làm việc trong một ứng dụng đã ghi vào brainstorming để bàn ở phiên khác.

## Điều kiện nghiệm thu

1. A1 → duyệt ban đầu/chỉ định → chờ → B1 → hoàn tất B → mở lại A → A2 → duyệt bổ sung → hoàn tất A. Đúng hai phiên thuộc A và một phiên thuộc B.
2. Reload trong lúc A chờ vẫn thấy hồ sơ, nội dung đã lưu, lịch sử phiên và bản duyệt ban đầu.
3. STT/AI A trả chậm khi mở B không sửa B; gửi nhầm run/ticket hoặc giả mạo patient/context bị từ chối.
4. Bổ sung kết luận không mất duyệt chỉ định; thay bệnh sử chỉ làm phần ban đầu cần duyệt lại; mọi bản đã duyệt cũ còn nguyên.
5. Nhắc lại xét nghiệm không nhân đôi; chỉ định lặp có chủ đích vẫn thực hiện được qua thao tác riêng.
6. Hai tab cùng mở/start/save không tạo hai hồ sơ cùng mã, hai microphone cùng lease hoặc âm thầm ghi đè revision.
7. Lỗi lưu/flush, ticket hết hạn, browser crash, audio trống đều có trạng thái thật; không báo thành công giả.
8. Không đổi luồng xem kết quả chi tiết, không lưu raw audio/transcript trái chính sách hiện có.
