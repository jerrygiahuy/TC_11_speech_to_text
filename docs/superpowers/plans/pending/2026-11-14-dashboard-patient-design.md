# Thiết kế dashboard lịch khám và thông tin bệnh nhân

**Trạng thái:** PENDING — đã chốt hướng bố cục và cách tính số liệu; tài liệu chi tiết chờ duyệt cùng plan. Chưa triển khai code.

**Ngày:** 2026-11-14. **Đối tượng:** bác sĩ khám ngoại trú trong prototype hiện tại.

## 1. Mục tiêu và quyết định đã chốt

Hai màn hình nối luồng Dashboard → chi tiết lịch hẹn → thông tin bệnh nhân → eform hiện tại. Bác sĩ theo dõi tiến độ khám trong ngày, tìm đúng lượt khám và đối chiếu phiếu cũ trước khi tạo phiếu.

Người dùng đã chọn **ưu tiên lịch làm việc**: trên là số liệu kèm danh sách ca, dưới là lịch hẹn chuyển Calendar/List. Đã đồng ý **còn lại = chưa khám + đang khám + chờ kết quả CLS**; đang khám/chưa hoàn tất là tập con của còn lại, không cộng hai số này. Ca hủy thống kê riêng.

Các yêu cầu đã nêu: từng nhóm số liệu có list item; list lịch hẹn chia sáng/chiều, giờ tăng dần; trạng thái có màu và chú thích; click ca mở popup lịch hẹn đủ mã ca, mã bệnh nhân, tên, tuổi, giờ hẹn, bác sĩ, nội dung; bệnh nhân từng khám có link vào hồ sơ. Màn bệnh nhân có tên, ngày sinh, giới tính, BHYT/bảo hiểm bảo lãnh, nút tạo phiếu; lịch sử mới nhất trước; popup toàn bộ phiếu cũ có trước/sau, một phiếu thì khóa cả hai. Giao diện khớp màu, font và cỡ chữ hiện tại.

## 2. Các hướng đã cân nhắc

1. **Ưu tiên lịch làm việc — đã chọn.** Nhìn được tiến độ và thứ tự giờ hẹn trên cùng trang. Đổi lại một ca đang khám xuất hiện ở cả nhóm còn lại và nhóm chưa hoàn tất; nhãn phải nói rõ quan hệ tập con.
2. **Ưu tiên hàng đợi.** Ba danh sách chiếm phần chính, calendar ở tab riêng. Hợp với xử lý hàng đợi nhưng giảm khả năng quan sát lịch theo giờ; không chọn.

Phần dưới là quyết định đề xuất của người lập thiết kế, chưa coi là xác nhận riêng của người dùng. Dùng để có một plan cụ thể, có thể duyệt và sửa.

## 3. Hiện trạng và ràng buộc

- Next.js 16.4.5 App Router, React 19.3.0, TypeScript, Tailwind 4, Zod; test `node:test` qua tsx. Đọc docs đi kèm Next trước khi viết code; `params`/`searchParams` là Promise.
- `/` hiện render `EformScreen`, nhận `?bs=` và `?ho_so=`. Thêm `/dashboard` và `/benh-nhan/[patientId]`, giữ địa chỉ eform hiện tại.
- `loadEformData()` vẫn đọc `data/eform/ca-gia.json`; `readClinical()` và save kiểm quyền theo ca mẫu. Chỉ truyền `ho_so` không đủ để hỗ trợ nhiều bệnh nhân.
- `Encounter` đã có UUID, patient/appointment/facility, thời điểm và trạng thái; chưa có mô hình lịch hẹn, hồ sơ nhân khẩu/bảo hiểm và query lịch sử đáp ứng yêu cầu. `lich_su` trong Encounter là tiền sử/dị ứng, không phải danh sách toàn bộ lần khám.
- `BanIn` phụ thuộc `useEform` và bị ẩn khi xem màn hình; không nhúng thẳng component này vào popup. Tạo view chỉ đọc từ dữ liệu đã lưu, không mount editor/AI/microphone.
- Kho clinical hiện không lưu đơn thuốc; tests chủ động từ chối `don_thuoc`. “Toàn bộ phiếu khám cũ” ở đợt này gồm đầy đủ dữ liệu clinical đã lưu, chỉ định, kết quả được lưu, trạng thái/duyệt và tóm tắt; không bịa đơn thuốc từ kho thói quen. Nếu phiếu nguồn không có phần nào, ghi “Không có dữ liệu lưu” thay vì khẳng định chưa kê/chưa làm.
- Chỉ dữ liệu giả local; giữ `assertLocalDemoRequest`, kiểm quyền server, chính sách dữ liệu hiện có. Không xây HIS, auth thật, đặt/hủy/đổi lịch, lịch tuần/tháng, kéo thả lịch hoặc AI kê đơn trong phạm vi này.
- Giữ font Be Vietnam Pro, nền `ef_nen`, viền `ef_vien`, chữ `ef_chu`/`ef_phu`, thao tác `ef_xanh`, tiêu đề `ef_dam`. Body 15px; nội dung thường 13–14px, phụ 11–12px, tên/tiêu đề khối 18px như eform; số thống kê 24px là phân cấp mới được đề xuất. Dùng lại kiểu nút/spacing/radius từ `fields.tsx` và `EformHeader.tsx`, không thêm bộ UI/font/calendar dependency.

## 4. Phụ thuộc thiết kế ca khám nhiều phiên

Tham chiếu [thiết kế một lượt khám nhiều phiên](2026-11-14-interrupted-encounters-design.md) và [plan tương ứng](2026-11-14-interrupted-encounters.md), hiện đều PENDING. Không mô tả các chức năng đó như đã triển khai.

Trước khi nối nút tạo/mở eform, cần hoàn tất và nghiệm thu phần dùng chung của plan đó: ngữ cảnh actor/server, resolve bệnh nhân/lượt, open-or-reuse duy nhất theo `(facility_id, appointment_id)`, đọc/lưu đúng chủ sở hữu và chuyển bệnh nhân an toàn. Giữ UUID nội bộ, mã khám dạng chuỗi có số 0 đầu. Quyền xem lịch sử cùng cơ sở là policy riêng; không bỏ kiểm quyền editor để đọc hồ sơ bác sĩ khác.

Không triển khai lại recording, approvals, changes hoặc migration trong plan hai màn hình. Có thể làm UI/read model bằng fixture trước, nhưng không nghiệm thu end-to-end nếu context và bảo vệ khi rời ca chưa xong. Ca `cho_kq_cls` không tự hoàn tất; dừng mic hoặc duyệt phiếu không đổi số đã khám xong.

## 5. Dashboard

### Phạm vi và bố cục

Mặc định ngày hôm nay theo `Asia/Ho_Chi_Minh`, bác sĩ và cơ sở lấy từ actor demo phía server. Có chọn ngày, nút Hôm nay và chuyển ngày trước/sau. Không thêm bộ chọn toàn viện trong đợt này. Thanh điều hướng chung thêm Dashboard; bệnh nhân vào từ lịch hẹn/hồ sơ, không thêm menu bệnh nhân không có ngữ cảnh.

1. Tiêu đề “Lịch khám”, ngày và bác sĩ/cơ sở.
2. Tổng lịch và ba khối **Đã hoàn thành x/N**, **Còn lại y/N**, **Đang khám / chờ kết quả z/N**; mỗi khối có list item thật bên dưới, mặc định tối đa 5 và nút “Xem tất cả (n)” mở rộng ngay khối. Có trạng thái rỗng riêng; không buộc click số mới thấy danh sách.
3. Dòng “Ca hủy: c · Kết thúc khác: k · Chưa xác định: u” có thể mở danh sách tương ứng. Nhắc “Đang khám/chờ kết quả nằm trong số còn lại”.
4. Lịch hẹn chuyển **Lịch theo giờ / Danh sách**. Đề xuất mặc định Danh sách để đọc nội dung nhanh; calendar là lịch một ngày theo trục giờ. Cả hai dùng cùng tập dữ liệu, cùng màu và popup.
5. Chú thích đủ các trạng thái đang hỗ trợ, luôn thấy cạnh khu vực lịch; màu đi cùng nhãn chữ, không dựa riêng vào màu.

Mỗi dòng ca trong mọi danh sách: giờ, tên, mã lượt/PID, nội dung ngắn và badge trạng thái; giờ tăng dần, trùng giờ thì mã lịch tăng dần. Danh sách lịch chính chia **Sáng [00:00,12:00)** và **Chiều [12:00,24:00)** theo giờ cơ sở, giữ ca ngoài giờ thường lệ. Nội dung dài cắt trên row nhưng popup có toàn bộ.

Calendar hiển thị mọi lịch của ngày; không giấu lịch trùng giờ, xếp cạnh nhau hoặc chồng thành nhóm có danh sách mở được. Nếu không có giờ kết thúc, block 30 phút chỉ là độ dài hiển thị, không khẳng định thời lượng khám. Trục giờ bao phủ toàn bộ lịch (tối thiểu 07:00–18:00), có nhãn “Bây giờ” chỉ khi xem hôm nay.

### Đếm và trạng thái

Một lịch tương ứng một lượt khám, không đếm số recording session. N là toàn bộ lịch hợp lệ của ngày, bác sĩ, cơ sở đang xem, bao gồm ca hủy và kết thúc khác. Hiển thị tổng và các nhóm loại trừ nhau sao cho **N = hoàn thành + còn lại + hủy + kết thúc khác + chưa xác định**. Nhóm chưa hoàn tất nằm trong còn lại. N=0 hiển thị 0/0, không chia lấy phần trăm.

| Trạng thái hiển thị | Nguồn | Nhóm đếm | Màu đề xuất từ theme |
| --- | --- | --- | --- |
| Chưa khám | lịch `scheduled`, chưa có Encounter | Còn lại | `ef_phu`, nền `ef_nen` |
| Đang khám | Encounter `dang_kham` | Còn lại + chưa hoàn tất | `ef_xanh`, nền xanh nhạt |
| Chờ kết quả CLS | `cho_kq_cls` | Còn lại + chưa hoàn tất | `xem`, nền vàng đất nhạt |
| Hoàn thành | `hoan_thanh_kham` | Hoàn thành | `accent`, nền nhạt, chữ teal đủ tương phản |
| Hủy khám | lịch `cancelled` hoặc Encounter `khong_kham` | Hủy | `ef_do`, nền đỏ nhạt |
| Nhập viện / Chuyển cấp cứu / Chuyển cơ sở | ba trạng thái kết thúc tương ứng | Kết thúc khác | `ef_dam` / `ef_do` / `primary`, nhãn riêng |
| Chưa xác định | giá trị lạ, quan hệ dữ liệu xung đột | Chưa xác định | `ef_phu`, viền nét đứt |

`khong_kham` hiển thị nhãn chính xác “Không khám”, dùng nhóm hủy trong thống kê nhưng không bịa lý do hủy. Không gộp chuyển viện/nhập viện vào hoàn thành hoặc còn lại. Nếu đã có Encounter hợp lệ thì status của Encounter là nguồn tiến độ; lịch cancelled đi kèm Encounter đã bắt đầu là xung đột, đưa vào chưa xác định thay vì che ca đang khám.

Ca đang khám/chờ từ ngày trước không thuộc N hôm nay; có khối riêng **“Chưa hoàn tất từ ngày trước”**, sắp giờ hẹn tăng dần, mở cùng popup. Điều này giữ ca chờ qua ngày có thể tìm lại mà không làm sai tổng lịch hôm nay.

### Popup lịch hẹn

Mở từ mọi list item hoặc calendar bằng click/Enter. Hiện mã lịch/mã lượt và UUID hồ sơ nếu đã có (phân biệt lượt khám với phiên ghi âm), PID, họ tên, tuổi tại ngày hẹn, ngày giờ hẹn, bác sĩ, nội dung đầy đủ, trạng thái và ngày sinh nếu cần đối chiếu. Tuổi tính theo ngày sinh/ngày hẹn, không hardcode; thiếu ngày sinh ghi “Chưa có thông tin”, dưới một tuổi dùng tháng.

Nếu có Encounter cũ của bệnh nhân trước lượt đang chọn, hiện link “Xem thông tin bệnh nhân”; không dùng riêng cờ boolean nhập tay. Bệnh nhân mới hiện “Chưa có lịch sử khám” và vẫn có nút “Thông tin bệnh nhân” để vào hồ sơ cơ bản rồi tạo phiếu. Đề xuất thêm nút **Mở phiếu khám** cho Encounter hiện có, **Tạo phiếu khám** cho lịch chưa khám; không cho tạo trên lịch hủy/kết thúc khác hoặc tạo lại ca hoàn thành. Nút hoàn thành dẫn xem phiếu chỉ đọc.

## 6. Thông tin bệnh nhân

### Thông tin cơ bản và tạo phiếu

Header có link về dashboard giữ ngày/view, họ tên, PID, ngày sinh, tuổi, giới tính. Khối bảo hiểm tách **BHYT** và **Bảo hiểm bảo lãnh**, có thể có cả hai; mỗi mục gồm đơn vị/chương trình, mã thẻ/hợp đồng nếu có, khoảng hiệu lực. Phân biệt “Không tham gia” (dữ liệu xác nhận không có) với “Chưa có thông tin”; quá hạn có nhãn hết hạn. Không suy luận quyền lợi/thanh toán.

Nút **Tạo phiếu khám** dùng lịch của bệnh nhân/bác sĩ/cơ sở đang có; không phát sinh mã khám bệnh viện giả ở client. Nếu từ lịch hẹn truyền `appointment_id` làm gợi ý và server kiểm lại. Một lịch đủ điều kiện thì mở trực tiếp; nhiều lịch thì dialog chọn lịch (mã, giờ, bác sĩ, nội dung); không có lịch thì nút disabled kèm “Chưa có lịch khám để tạo phiếu”. Lịch tương lai không mở khám trong bản đầu; lịch hôm nay chưa khám được tạo, lịch đã bắt đầu từ hôm trước được tiếp tục. Lịch đã có hồ sơ đổi hành động thành **Tiếp tục phiếu khám**, trả cùng UUID; double-click/hai tab không tạo hai hồ sơ. Thành công điều hướng `/?ho_so=<UUID>` kèm ngữ cảnh bác sĩ demo hợp lệ theo adapter hiện hành; server load đúng bệnh nhân trước render, không lóe ca mẫu.

### Lịch sử và xem toàn phiếu

Danh sách **các lượt khám đã có phiếu lưu** trong cùng cơ sở mà actor được phép đọc; bao gồm phiếu chưa hoàn tất với badge, không coi chúng là phiếu hoàn thành. Không đưa lịch chưa khám/hủy không có phiếu vào lịch sử. Nếu có appointment đang chọn, loại chính lượt đó khỏi danh sách “trước đó”; vào trực tiếp không có appointment thì hiện tất cả phiếu đã lưu. Sắp `encounter_at` giảm dần, tie-break ID giảm dần; mỗi row có nội dung tóm tắt (ưu tiên `tom_tat`, fallback lý do khám, không tự tạo tóm tắt bằng AI), ngày giờ, mã lượt, bác sĩ và trạng thái.

Popup lớn hiển thị **toàn bộ phiếu khám đã lưu**: nhận diện bệnh nhân tại lần khám nếu nguồn có, sinh hiệu, lý do/bệnh sử/tiền sử/dị ứng, khám toàn thân/chuyên khoa/khác, chẩn đoán ban đầu/xác định/kèm theo, kết quả đã lưu, chỉ định và trạng thái duyệt, hướng điều trị/lời dặn/hẹn, tình trạng ra viện, tóm tắt, người/giờ lưu và duyệt. Trình bày trường dữ liệu clinical chưa có trên editor trong mục “Thông tin lưu bổ sung” với nhãn rõ; không dump raw JSON, AI runs, transcript, lease hoặc metadata kỹ thuật. Phiếu chưa duyệt có nhãn Bản nháp. Không dùng danh mục/đơn thuốc hiện tại để thay nội dung cũ; ưu tiên display đã lưu, mã lạ vẫn hiển thị mã gốc.

Đợt này xem bản lưu hiện tại của từng lượt; không thêm trình duyệt mọi revision/approval version. Dữ liệu cũ thiếu nhân khẩu tại thời điểm khám phải ghi rõ thông tin nhận diện lấy từ hồ sơ hiện tại, không giả snapshot lịch sử.

Nút **Trước = phiếu mới hơn**, **Sau = phiếu cũ hơn**, theo đúng thứ tự list; hiện “i / n” và ngày/mã phiếu. Khóa Trước ở đầu, Sau ở cuối, cả hai khi chỉ một item. Không vòng về đầu. Khi chuyển: reset scroll nội dung, có loading và lỗi/retry; hủy request trước hoặc kiểm ID để response chậm không đè phiếu mới. Lỗi không nhảy sang item khác và vẫn cho chuyển tiếp. Giữ snapshot thứ tự ID lúc mở, refresh khi đóng/mở lại; không tự đổi vị trí trong lúc bác sĩ đọc.

Mọi popup có tiêu đề, nút đóng, Escape, focus trap/khôi phục focus, role dialog và aria-modal, khóa cuộn nền, cuộn nội dung riêng; trên màn hẹp gần toàn màn hình. Trước/sau có accessible label rõ, không chỉ biểu tượng. View chỉ đọc không gọi API save/approve/extract hay bật mic.

## 7. Hợp đồng dữ liệu và kiến trúc đề xuất

Read model riêng dưới `src/shared/clinic/` và services `src/server/clinic/`; không nhét nhân khẩu/bảo hiểm/lịch hẹn vào generated Encounter schema chỉ để dựng dashboard.

- `PatientProfile`: ID dạng chuỗi, facility, tên, `date_of_birth: YYYY-MM-DD | null`, giới tính nullable, insurance records và `insurance_known` theo từng loại. Không gắn patient ID thành tên file tùy ý.
- `Appointment`: ID/mã lượt chuỗi, facility, patient, doctor, `starts_at` ISO có offset, `ends_at` nullable, nội dung, scheduling status scheduled/cancelled; Encounter liên kết bằng facility/appointment. Mỗi khóa chỉ một lịch.
- `AppointmentItem`: appointment + patient display + doctor display + encounter ID nullable + display status + `has_prior_encounter`.
- `DashboardData`: date, timezone, doctor/facility display, appointments, carriedOpenItems, totals (total/completed/remaining/unfinished/cancelled/other/unknown), fetchedAt.
- `PatientPageData`: patient, eligibleAppointments và history summaries, `selectedAppointmentId` nullable. Quyền xem history cùng cơ sở trong demo; quyền chỉnh sửa vẫn giới hạn actor/phân công của context.
- `HistoricalEncounterDetail`: record đầy đủ đã authorize, patient display có provenance current/snapshot, tên bác sĩ/cơ sở, dữ liệu view chỉ đọc và available sections. Không gửi AI artifacts hay lease ra endpoint lịch sử.

Read services nhận `ClinicalActor` từ adapter pending. Local JSON fixtures có schema Zod; read repository không tạo Encounter khi xem lịch. Endpoint đọc dùng no-store, không cache lẫn actor. Đề xuất GET `/api/clinic/dashboard?date=YYYY-MM-DD`, `/api/clinic/appointments/[appointmentId]`, `/api/clinic/patients/[patientId]`, `/api/clinic/patients/[patientId]/encounters/[encounterId]`; POST mở phiếu dùng endpoint clinical action open của plan phụ thuộc, không tạo API cạnh tranh.

**Nguồn dữ liệu dùng chung cho đọc và mở phiếu:** `encounter-contexts.json` của dependency giữ khóa lượt và chủ sở hữu patient/facility/doctor cùng EformData; `data/clinic/appointments.json` chỉ bổ sung thời gian/nội dung/trạng thái lịch cho đúng khóa đó; `patients.json` giữ nhân khẩu/bảo hiểm. Một lookup server duy nhất `resolveClinicAppointment(actor, appointmentId, now)` join/validate các nguồn, từ chối mismatch tên/PID/bác sĩ/cơ sở thay vì âm thầm ghi đè. Lookup trả context đã kiểm tra và eligibility với lý do; dashboard/patient và API action open đều dùng lookup này. API open phải kiểm lại lịch hủy, ngày tương lai, trạng thái kết thúc, phân công và cơ sở ở thời điểm mở, kể cả gọi trực tiếp hoặc UI cũ. Không chỉ lọc eligible ở client. Không tạo hai bản fixture có quyền tự quyết khác nhau về chủ sở hữu lượt khám.

Page ban đầu load server, nút Làm mới và khi quay lại/focus trang tải lại số liệu; không polling/realtime đợt này. Các list, tổng và calendar cập nhật cùng một response snapshot. Invalid date trả 400; ngoài scope/không tồn tại trả 404 ở read endpoints; thiếu local boundary trả 403; conflict mở phiếu trả 409. Lỗi đọc dữ liệu không biến thành tổng 0 thành công.

## 8. Nghiệm thu

1. Bộ 8 lịch: 2 hoàn thành, 2 chưa khám, 1 đang khám, 1 chờ CLS, 1 hủy, 1 nhập viện → N=8, hoàn thành 2/8, còn lại 4/8, chưa hoàn tất 2/8, hủy 1, khác 1. Row ID của từng nhóm đúng bộ đếm.
2. List/calendar cùng tập lịch, thứ tự sáng/chiều đúng mốc 12:00; lịch trùng giờ đều mở được; các trạng thái có màu/nhãn/chú thích.
3. Mọi item mở đúng popup đủ thông tin; mã có số 0 đầu giữ nguyên; tuổi đúng ngày sinh và ngày hẹn.
4. Bệnh nhân cũ có link history, bệnh nhân mới vẫn vào hồ sơ/tạo phiếu; BHYT/bảo lãnh đồng thời, hết hạn và thiếu dữ liệu hiển thị đúng.
5. Chọn/tạo/tiếp tục đúng lịch, reload đúng người và đúng UUID, không tạo trùng khi retry/hai tab; ca hủy/hoàn thành không tạo phiếu mới.
6. History giảm dần, không lẫn người/cơ sở; popup đủ nội dung đã lưu và không sửa phiếu. N=1 khóa hai nút; N>1 khóa đúng hai đầu, response chậm không đè phiếu đang xem.
7. Ca chờ hôm qua vẫn thấy ở khối riêng; duyệt/dừng mic không tăng hoàn thành; quay lại dashboard sau hoàn tất cập nhật số liệu đúng.
8. Desktop 1440/1024 và mobile 390px đọc được, không tràn ngang trang; keyboard dùng được dialog, tương phản badge đủ đọc trên nền nhạt. Dữ liệu rỗng/lỗi/đang tải có giao diện riêng.

## 9. Điểm cần duyệt trong tài liệu

Các mặc định đề xuất cần đọc cùng plan: scope theo bác sĩ/cơ sở; calendar ngày và list mặc định; N bao gồm hủy/kết thúc khác; khối ca chờ qua ngày; tạo phiếu dựa lịch đã cấp mã; quyền đọc history cùng cơ sở; toàn phiếu là dữ liệu clinical đã lưu, không bao gồm đơn thuốc chưa được lưu trong hệ clinical. Mọi chi tiết còn lại về chia component/spacing để người triển khai chọn theo code hiện hành, miễn giữ hành vi và theme ở trên.
