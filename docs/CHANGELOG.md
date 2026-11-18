# Nhật ký thay đổi

Mỗi thay đổi, dù nhỏ, đều có một mục ở đây. Mục mới nhất ở trên cùng. Cách ghi xem `.claude/skills/ghi-tai-lieu/SKILL.md`.

## 2026-11-14

### Sửa các phát hiện review dashboard và hồ sơ bệnh nhân
- **Loại:** Sửa lỗi, Bảo mật, Giao diện
- **Thay đổi:**
  - Trang `/benh-nhan/[patientId]` gọi `assertLocalDemoPage` (403 vào error boundary, không `notFound`). `page-guard.ts` chuyển cả header Host sang guard; thêm `page-guard.test.ts`.
  - `guard.ts` bỏ phụ thuộc `request.url` (Next dựng từ hostname cấu hình của server): chỉ dựa Host/Origin/Sec-Fetch-Site, thiếu Host là 403. Comment nêu đúng phạm vi: chặn cross-origin và DNS rebinding từ trình duyệt, không chặn client tự đặt Host; nên chạy `next dev -H 127.0.0.1` (ghi vào README). `routes.test.ts` dùng URL local + header khác.
  - `service.ts` `buildItem`: Encounter gắn đúng mã lịch nhưng lệch bệnh nhân/cơ sở/bác sĩ là lỗi dữ liệu 500, không gắn nhầm. `has_prior_encounter` chỉ tính phiếu cùng bệnh nhân có `encounter_at` trước giờ hẹn của lịch đang xem (phiếu 13:30 không còn là lượt trước của lịch 08:00).
  - `EncounterHistory`: nhãn "Mã lượt" hiện `appointment_id`, ẩn khi null.
  - `selectDayAppointments`: ca `unknown` có Encounter của ngày trước được mang sang `carriedOpenItems`.
  - `AppointmentDialog`: đóng thì tăng bộ đếm, mở lại cùng lịch không hiện kết quả/lỗi cũ.
  - `clinic/api.ts`: 200 mà body không phải JSON thì ném lỗi tiếng Việt thay vì `{}`.
  - `DashboardScreen`: ô chọn ngày chỉ điều hướng khi ngày đầy đủ, có thật, năm >= 1900 (`isCompleteClinicDate` mới ở `format.ts`).
  - Cỡ chữ: tiêu đề trang và tiêu đề khối 18px. `layoutDay` vẽ tối thiểu 20 phút (`MIN_BLOCK_MINUTES`) nên ca ngắn xếp cạnh khối kế tiếp thay vì bị đè.
  - Để lại, chờ ưu tiên 1: cờ `not_examined` (#5) và `eligibleAppointments` tạm (#10).
- **Lý do:** Phát hiện của review (Opus) trên nhánh priority-plan-2.
- **File:** `src/app/benh-nhan/[patientId]/page.tsx`, `src/app/api/clinic/routes.test.ts`, `src/server/clinic/{guard,page-guard,page-guard.test,service,service.test}.ts`, `src/shared/clinic/{schedule,layout,format}.ts` và test tương ứng, `src/client/{clinic/AppointmentDialog,clinic/api,dashboard/DashboardScreen,dashboard/EncounterGroup,patient/EncounterHistory}.tsx`, `README.md`, `docs/cau-truc-du-an.md`, `docs/testing/2026-11-14-dashboard-patient.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** bộ test clinic 60/60 PASS (trước đó 53 + test mới); `npm run lint` và `npx tsc --noEmit` exit 0; kiểm trình duyệt ở 1440/390px xem docs/testing.
- **Ảnh hưởng:** Request thiếu header Host nay bị 403 (trình duyệt luôn gửi Host).

### Kiểm tra trình duyệt màn bệnh nhân và đối chiếu dashboard (kiểm thử)
- **Loại:** Tài liệu
- **Thay đổi:**
  - Chạy `next dev -p 3101` và kiểm bằng Playwright (Chromium) trên dữ liệu giả: `/benh-nhan/000123` (có lịch, BHYT có tham gia, bảo lãnh không tham gia), `/benh-nhan/000124` (bảo lãnh hết hạn, tuổi tính bằng tháng), `/benh-nhan/000125` (thiếu thông tin, lịch sử rỗng), `/benh-nhan/999999` và `appointment_id=XXX` (không tìm thấy), `return_to` ra ngoài (link về `/dashboard`).
  - Đối chiếu dashboard: popup LK-000001 → "Xem thông tin bệnh nhân" → "Về dashboard" giữ ngày và view; "Ngày trước" sang 13/11 giữ view; "Làm mới" gọi lại API; chuyển "Lịch theo giờ".
  - Ghi kết quả PASS/FAIL/chưa kiểm vào `docs/testing/2026-11-14-dashboard-patient.md`: mục "Màn bệnh nhân", mục "Dashboard: đối chiếu bổ sung" và mục "Chưa kiểm" tổng hợp. Sửa câu phạm vi và hai dòng cũ (3.15, 4.10) cho khớp.
  - Không sửa code ứng dụng.
- **Lý do:** Nghiệm thu trình duyệt cho màn bệnh nhân (Task 5) và các mục dashboard còn thiếu, theo yêu cầu kiểm tra thật trước khi báo xong.
- **File:** `docs/testing/2026-11-14-dashboard-patient.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đã chạy thật trên `http://localhost:3101`: 1440, 1024 và 390px không tràn ngang trên trang bệnh nhân; Network trang bệnh nhân chỉ có GET. Các mục không kiểm được (fixture không có ca 11:59/12:00 và khối quá 5 dòng; slow fetch; click nền bằng chuột thật) ghi rõ trong tài liệu, không ghi PASS.
- **Ảnh hưởng:** Không đổi code. Bug phát hiện trong lượt này: không có.

### Gộp badge trạng thái và định dạng ngày của màn bệnh nhân vào bản dùng chung (refactor)
- **Loại:** Dọn dẹp
- **Thay đổi:**
  - Xóa `src/client/patient/StatusBadge.tsx` (kèm TODO "hợp nhất"). `EncounterHistory` dùng `StatusBadge` của `src/client/clinic/status.tsx`, truyền `{ status, encounter_id: null }` vì lịch sử không có mã lượt: nhãn "Hủy khám" giữ như cũ, không đổi thành "Không khám".
  - Xóa `src/client/patient/format.ts`. Chuyển các hàm còn thiếu sang `src/shared/clinic/format.ts`: `NO_INFO`, `formatOptionalClinicDate` (thay `formatDate`: null là "Chưa có thông tin", chuỗi lạ giữ nguyên), `formatClinicDateTimeLenient` (thay `formatDateTime`: timestamp lạ trả nguyên chuỗi thay vì ném lỗi), `formatGender`.
  - `src/shared/clinic/schedule.ts` dùng chung `NO_INFO` từ `format.ts` thay hằng số trùng.
  - `PatientScreen`, `InsuranceSummary`, `EncounterHistory` import từ shared.
  - Thêm test cho ba hàm mới trong `src/shared/clinic/format.test.ts`.
- **Lý do:** Hai cặp trùng chức năng (badge trạng thái và định dạng ngày) đã có TODO hợp nhất từ Task 5.
- **File:** `src/client/patient/{StatusBadge.tsx,format.ts}` (xóa), `src/client/patient/{EncounterHistory,InsuranceSummary,PatientScreen}.tsx`, `src/shared/clinic/{format,format.test,schedule}.ts`, `docs/CHANGELOG.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/*.test.ts src/server/clinic/*.test.ts src/app/api/clinic/routes.test.ts src/client/patient/*.test.ts`: baseline 50/50 PASS, sau refactor 53/53 PASS (3 test mới). `npx eslint .` exit 0. `npx tsc --noEmit` exit 0, không có lỗi (không còn 3 lỗi có sẵn như các mục trước ghi). Chưa kiểm tra trên trình duyệt ở bước này.
- **Ảnh hưởng:** Badge trạng thái ở màn bệnh nhân nhỏ hơn về đệm và cỡ chữ (theo bản dashboard: `px-1.5 text-[11px] rounded-sm`), nhãn và màu không đổi. Hành vi ngày/giờ với dữ liệu hợp lệ không đổi.

### Dashboard lịch khám: popup lịch hẹn và đường vào hồ sơ bệnh nhân (Task 4)
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - `src/client/clinic/ClinicDialog.tsx`: hộp thoại modal dùng `<dialog>` gốc (focus trap, Escape, aria-modal do trình duyệt lo), thêm khôi phục focus, khóa cuộn nền, cuộn nội dung riêng, chỉ đóng khi bấm đúng nền, gần toàn màn hình ở màn hẹp.
  - `AppointmentDialog.tsx`: gọi `getAppointment` (no-store, AbortController), có loading, lỗi và Thử lại; kết quả gắn khóa `id#lần thử` nên kết quả muộn của lịch khác không hiện. Hiện mã lịch/lượt, UUID hồ sơ nếu có, PID, họ tên, tuổi theo ngày hẹn, ngày sinh, giờ hẹn, bác sĩ, trạng thái, nội dung đầy đủ.
  - `AppointmentActions.tsx`: link "Xem thông tin bệnh nhân" (có lượt trước) hoặc "Thông tin bệnh nhân" kèm "Chưa có lịch sử khám"; href `/benh-nhan/<PID>?appointment_id=&return_to=` qua `patientHref` (`safeReturnTo` chỉ nhận đường nội bộ). Nút Tạo/Mở phiếu khám tắt, chú thích "Chờ nền ca khám nhiều phiên (ưu tiên 1)"; không điều hướng ca mẫu, không sinh Encounter hay UUID.
  - `DashboardScreen` gắn dialog, thay dòng "Đã chọn lịch" tạm của Task 3.
- **Lý do:** Task 4 plan Dashboard và Bệnh nhân. `safeReturnTo` và test đã có từ commit Task 3 (`src/shared/clinic/links.ts`).
- **File:** `src/client/clinic/{ClinicDialog,AppointmentDialog,AppointmentActions}.tsx`, `src/client/dashboard/DashboardScreen.tsx`, `docs/testing/2026-11-14-dashboard-patient.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/*.test.ts src/server/clinic/*.test.ts src/app/api/clinic/routes.test.ts` 45/45 PASS, `npm run lint` sạch, `npx tsc --noEmit` chỉ 3 lỗi có sẵn. Trình duyệt thật: mở bằng click/Enter, Tab giữ trong popup, Escape trả focus và mở khóa cuộn, lỗi/Thử lại, 390px; mục chưa kiểm ghi ở checklist (click nền thật, slow fetch, Shift+Tab).
- **Ảnh hưởng:** Chưa có nút mở phiếu thật; chờ nền ca khám nhiều phiên của ưu tiên 1.

### Dashboard lịch khám: trang /dashboard với danh sách và lịch theo giờ (Task 3)
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Trang `src/app/dashboard/` (`page.tsx`, `loading.tsx`, `error.tsx`): server page chờ `searchParams` (`date`, `view`), mặc định hôm nay giờ Việt Nam và `list`, ngày sai quay về hôm nay. Gọi thẳng `loadDashboard` với actor demo; chạy guard local qua `src/server/clinic/page-guard.ts` (dựng Request từ Host/Origin/Sec-Fetch-Site rồi dùng `assertLocalDemoRequest`).
  - `src/client/dashboard/`: `DashboardScreen` (tiêu đề, ngày, nút Ngày trước/Hôm nay/Ngày sau/chọn ngày/Làm mới, tổng N, ba khối, dòng hủy/kết thúc khác/chưa xác định, khối ca ngày trước, chuyển Danh sách / Lịch theo giờ lưu trong URL), `EncounterGroup` (tối đa 5 dòng, "Xem tất cả", khối rỗng) và `OtherEncounters`, `AppointmentList` (Sáng/Chiều), `DayCalendar` (trục 07 đến 18 giờ, mở rộng khi có ca ngoài giờ, khối 30 phút khi thiếu giờ kết thúc, lịch trùng giờ xếp cạnh nhau, nhãn "Bây giờ" chỉ hôm nay), `StatusLegend`.
  - `src/client/clinic/status.tsx` (nhãn và màu 9 trạng thái, "Không khám" khi Encounter `khong_kham`), `AppointmentRow.tsx`.
  - `src/shared/clinic/`: `format.ts` (giờ/ngày VN, cộng ngày, thứ), `layout.ts` (`groupAppointments`, `splitByPeriod`, `layoutDay`), `links.ts` (`safeReturnTo`, `dashboardHref`, `patientHref`) cùng test.
  - `Header.tsx`: thêm link "Lịch khám"; đường dẫn `/benh-nhan/*` cũng sáng mục này. Không đổi `/`.
  - Làm mới: mỗi ngày là một thể hiện riêng (`key` theo ngày), request bị hủy khi rời trang hoặc khi bấm lại, có số thứ tự nên response cũ không ghi đè; lỗi làm mới giữ số liệu cũ kèm cảnh báo, không đưa về 0.
- **Lý do:** Task 3 plan Dashboard và Bệnh nhân. Popup lịch hẹn (Task 4) làm ở mục sau; tạm thời bấm dòng chỉ hiện dòng "Đã chọn lịch".
- **File:** `src/app/dashboard/*`, `src/client/dashboard/*`, `src/client/clinic/{status.tsx,AppointmentRow.tsx}`, `src/client/chung/Header.tsx`, `src/server/clinic/page-guard.ts`, `src/shared/clinic/{format,layout,links}.ts` và test, `docs/testing/2026-11-14-dashboard-patient.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** test mới `format/links/layout` trước khi có module FAIL, sau đó PASS (toàn bộ `src/shared/clinic/*.test.ts` 19+ test). `npm run lint` sạch ở file mới, `npx tsc --noEmit` chỉ còn 3 lỗi có sẵn. Trình duyệt thật ở 1440/1024/390px: số 8/2/4/2/1/1 đúng, không tràn ngang; kết quả chi tiết và mục chưa kiểm ở `docs/testing/2026-11-14-dashboard-patient.md`.
- **Ảnh hưởng:** Theme `ef_*` chưa có trên nhánh này, dùng token hiện có (`emr-navy`, `emr-blue`, `xem`, `accent`, `primary`, `ink`, `muted`, đỏ `#c9302c` như eform). Chưa kiểm "Xem tất cả" với dữ liệu thật (không khối nào quá 5 dòng).

### Hồ sơ bệnh nhân: màn /benh-nhan/[patientId], danh sách lịch sử, bộ điều phối tải phiếu cũ (Task 5, phần độc lập)
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Trang `src/app/benh-nhan/[patientId]/` (`page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`): server page chờ `params` và `searchParams` (`appointment_id`, `return_to`), gọi thẳng `loadPatientPage` với actor demo (không fetch API nội bộ). Service trả 404 (PID giả, lịch không thuộc bác sĩ/bệnh nhân) thì ra trang not-found; lỗi khác vào error boundary (nút Thử lại, không dữ liệu giả). `return_to` đi qua `safeReturnTo` (`src/shared/clinic/links.ts`).
  - `src/client/patient/`: `PatientScreen` (link "Về dashboard", họ tên, PID giữ số 0 đầu, ngày sinh, tuổi theo ngày hẹn hoặc hôm nay, giới tính), `InsuranceSummary` (hai khối BHYT và Bảo hiểm bảo lãnh độc lập; "Không tham gia" chỉ khi known và enrolled=false, "Chưa có thông tin" khi known=false hoặc enrolled=null, nhãn "Hết hạn" khi hạn trước ngày đối chiếu), `EncounterHistory` (giảm dần như server đã sắp; tóm tắt, ngày giờ, mã lượt, bác sĩ, badge; rỗng ghi "Chưa có lịch sử khám"), `StatusBadge`, `format.ts`.
  - Nút **Tạo phiếu khám** và **Xem phiếu** đều tắt, có chú thích: "Chưa có lịch khám để tạo phiếu" hoặc "Chờ nền ca khám nhiều phiên (ưu tiên 1)"; "Chờ dữ liệu phiếu từ ưu tiên 1". Không điều hướng, không sinh ID.
  - `history-controller.ts`: `createHistoryLoader<T extends {id}>(fetchDetail)`. Load mới hủy load trước; kết quả và lỗi của load cũ trả null; lỗi của load hiện tại ném lên; `dispose` hủy và chặn mọi cập nhật. Thuần TS, không React.
- **Lý do:** Phần độc lập của Task 5 plan Dashboard & Bệnh nhân. Popup toàn phiếu, endpoint chi tiết phiếu và `projectHistoricalEncounter` chưa làm vì cần dữ liệu phiếu của ưu tiên 1.
- **File:** `src/app/benh-nhan/[patientId]/*`, `src/client/patient/*`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/client/patient/history-controller.test.ts`: trước khi có loader FAIL (không import được module), sau đó 5/5 PASS (A chậm B nhanh chỉ B; lỗi A sau B không hiện; lỗi B retry được; dispose). Bộ test clinic hiện có vẫn xanh. `npm run lint` sạch file mới; `npx tsc --noEmit` chỉ còn 3 lỗi có sẵn. Chưa chạy `next dev` và chưa xem trong trình duyệt.
- **Ảnh hưởng:** Chưa có theme `ef_*` trên nhánh này nên dùng token hiện có (`primary`, `muted`, `xem`, `accent`, `navy`, đỏ Tailwind cho "hủy"). Badge trạng thái là bản riêng trong `src/client/patient/`, hợp nhất với badge dashboard khi có. Ngày đối chiếu tuổi/hạn bảo hiểm lấy từ lịch đang chọn nếu nằm trong lịch đủ điều kiện, không thì hôm nay.

### Dashboard lịch khám: repository, service và API đọc, độc lập với ưu tiên 1 (Task 2)
- **Loại:** Tính năng, Dữ liệu
- **Thay đổi:**
  - Thêm `src/server/clinic/`: `ports.ts` (cổng `ClinicActor`, `EncounterRef`, `EncounterSource`), `fixture-source.ts` (adapter DEMO sinh EncounterRef giả từ `encounter_status` trong fixture lịch và từ `data/clinic/encounters-demo.json`), `guard.ts` (`assertLocalDemoRequest` tối thiểu: chỉ localhost/127.0.0.1/[::1], từ chối cross-origin với 403), `demo-actor.ts` (actor demo BS01 ở CS01, lấy phía server), `repository.ts` (chỉ đọc, validate Zod, lỗi store ném 500 chứ không trả rỗng), `service.ts` (`loadDashboard`, `loadAppointment`, `loadPatientPage`), `errors.ts`, `http.ts` (bọc GET: guard, no-store, dịch lỗi 400/403/404/500).
  - Ba route GET: `/api/clinic/dashboard?date=`, `/api/clinic/appointments/[appointmentId]`, `/api/clinic/patients/[patientId]?appointment_id=`. Ngày sai 400, lịch/bệnh nhân ngoài bác sĩ-cơ sở hoặc PID giả 404 như nhau, lỗi store 500 không kèm totals.
  - Lịch sử khám = mọi phiếu đã lưu cùng cơ sở (gồm bác sĩ khác), loại lượt đang chọn, sắp mới nhất trước. `has_prior_encounter` không tính phiếu của chính lượt đó. Tóm tắt dòng lịch sử lấy `summary` có sẵn, không có thì dùng lý do khám của lịch, không có nữa thì "Chưa có tóm tắt" (không bịa).
  - `src/shared/clinic/history.ts`: `sortHistory` (giảm dần theo thời điểm, trùng thì ID giảm dần) và `historyNavigation` (`previousId` là lượt mới hơn, `nextId` là lượt cũ hơn). `types.ts` thêm `HistorySummary`, `PatientPageData`.
  - `src/client/clinic/api.ts`: `getDashboard`, `getAppointment`, `getPatient` (`cache: "no-store"`, AbortSignal).
  - Dữ liệu giả mới: `data/clinic/directory-demo.json` (tên cơ sở, bác sĩ), `data/clinic/encounters-demo.json` (4 lượt khám cũ giả).
- **Lý do:** Phần đọc của dashboard và hồ sơ bệnh nhân cần làm trước khi lớp clinical của ưu tiên 1 có trên nhánh này; làm sau một cổng để gộp sau chỉ cần thay adapter.
- **File:** `src/server/clinic/*`, `src/app/api/clinic/**`, `src/client/clinic/api.ts`, `src/shared/clinic/{history,types}.ts`, `data/clinic/{directory-demo,encounters-demo}.json`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/*.test.ts src/server/clinic/*.test.ts src/app/api/clinic/routes.test.ts` (34 test đạt), `npm run lint` sạch, `npx tsc --noEmit` chỉ còn 3 lỗi có sẵn (`RouteContext`, `LayoutProps`). Chưa chạy qua `npm run dev`.
- **Ảnh hưởng:** Chưa có giao diện dùng các API này. Để lại cho ưu tiên 1: thay `ClinicActor`/`demo-actor.ts`, `assertLocalDemoRequest` và `EncounterSource` demo bằng bản clinical thật; `appointment-context.ts`, endpoint chi tiết phiếu cũ và `eligibleAppointments` theo policy mở phiếu (hiện chỉ tạm: chưa hủy/kết thúc và không ở tương lai).

### Dashboard lịch khám: contracts và phép tính (Task 1)
- **Loại:** Tính năng, Dữ liệu
- **Thay đổi:**
  - Thêm `src/shared/clinic/types.ts` (DTO lịch khám, bệnh nhân, bảo hiểm, tổng số, `DashboardData`), `schema.ts` (Zod v4: ngày lịch thực, từ chối `2026-02-30`; timestamp bắt buộc có offset; status lạ bị từ chối; `scheduling_status` chỉ `scheduled`|`cancelled`), `schedule.ts` (hàm thuần: `toClinicDate`, `clinicPeriod`, `displayStatus`, `summarizeAppointments`, `sortAppointments`, `ageAt`, `selectDayAppointments`).
  - Ngày/giờ tính theo UTC+7 cố định bằng số học (không dùng Intl). Sáng [00:00,12:00), Chiều [12:00,24:00). `remaining` = chưa khám + đang khám + chờ CLS, `unfinished` là tập con của `remaining`; total = completed + remaining + cancelled + other + unknown. Lịch hủy nhưng Encounter đã đang khám/chờ CLS/hoàn thành là xung đột nên thành `unknown`. Ngày sinh tương lai trả "Chưa có thông tin" (không tuổi âm).
  - Fixture giả `data/clinic/patients.json`, `data/clinic/appointments.json` (2 bác sĩ, 2 cơ sở, 8 ca chuẩn ngày 2026-11-14, ca hôm qua chờ CLS, trùng giờ, thiếu ngày sinh, cả BHYT và bảo lãnh). Nhánh này chưa có Encounter nên mỗi dòng lịch có thêm trường fixture `encounter_status` (tên enum Encounter: `dang_kham`, `cho_kq_cls`, ...; `null` = chưa có Encounter). Ngày trong fixture cố định, chưa sinh theo đồng hồ.
  - `schedule.test.ts` có `eslint-disable no-restricted-imports` vì `src/shared` cấm `node:*` nhưng test cần `node:test`.
- **Lý do:** Task 1 của plan "Dashboard lịch khám và thông tin bệnh nhân"; cần nền tính số liệu đúng trước khi dựng giao diện.
- **File:** `src/shared/clinic/types.ts`, `src/shared/clinic/schema.ts`, `src/shared/clinic/schedule.ts`, `src/shared/clinic/schedule.test.ts`, `data/clinic/patients.json`, `data/clinic/appointments.json`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsx --conditions=react-server --test src/shared/clinic/schedule.test.ts`: trước khi có `schedule.ts` FAIL (1 fail, không import được module); sau khi implement 6/6 PASS. `npm run lint` sạch. `npx tsc --noEmit`: chỉ còn 3 lỗi có sẵn (`RouteContext`, `LayoutProps` ở `src/app/api/asr/[id]/route.ts`, `src/app/layout.tsx`), không do file mới.
- **Ảnh hưởng:** Chỉ thêm file mới, chưa nối vào giao diện; không đổi eval.
## 2026-11-12

### Phiếu mẫu theo bệnh (9/9): sửa lỗi sau review
- **Loại:** Sửa lỗi
- **Thay đổi:** Sửa 6 lỗi do agent review toàn bộ thay đổi chỉ ra.
  - **Nghiêm trọng:** chỗ `[số]` chưa điền bị thay bằng chữ "số" khi chi tiết có từ bỏ dấu thành "so" ("sổ mũi"). Ô đó mất ngoặc và hiện tím như AI chắc chắn. Giờ chỉ chỗ có lựa chọn `a|b` mới được chọn.
  - "sốt 2 ngày" không còn thành "Sốt 2 độ": nhiệt độ phải là số sau "sốt" không đứng trước đơn vị thời gian, trong khoảng 35–42.
  - "phải/trái" chỉ tính là bên khi đứng sau từ chỉ vị trí (tai, mũi, bên, họng, amidan, hạch, má, nhĩ, thanh) hoặc đứng riêng một vế. Ví dụ "phải nhỏ mũi" không còn chọn bên phải. "hai bên" khớp "2 bên".
  - `EformScreen`: dùng `gopTruongMoi` và cập nhật chỉ định, thuốc theo dạng hàm, để ô bác sĩ sửa và dòng thêm, xóa trong lúc chờ AI không bị ghi đè hay mất.
  - Gọi AI lỗi khi dùng mẫu kèm chi tiết thì vẫn điền theo mẫu bằng quy tắc (`ketQuaTheoQuyTac`), kèm thông báo đỏ.
  - Mã ICD của mẫu chỉ dùng khi chẩn đoán LLM trả về vẫn chứa chẩn đoán của mẫu (`icdTheoMau`). Ví dụ "vh cấp, chẩn đoán viêm amidan cấp" không còn gắn mã viêm họng.
- **Lý do:** Review cuối của cả loạt thay đổi. 9 lỗi nhỏ để lại, xem mục Ảnh hưởng.
- **File:** `src/shared/eform/phieu-mau.ts`, `src/shared/eform/phieu-mau.test.ts`, `src/shared/eform/dien-phieu.ts`, `src/shared/eform/dien-phieu.test.ts`, `src/client/eform/EformScreen.tsx`, `src/client/eform/TroLyAi.tsx`, `README.md`
- **Kiểm tra:**
  - 9 test mới tái hiện đúng các lỗi và fail trước khi sửa; sau khi sửa, `npm test` 51/51 pass.
  - `npm run lint`, `npx tsc --noEmit` sạch, `npm run build` thành công.
  - `npm run eval -- --rule-only` giống hệt lúc bắt đầu; `npm run eval-mau` không đổi (68,5% / 72,5%).
  - Playwright với Gemini (1 lượt), câu "vtg cấp, tai T, sốt 2 ngày, sổ mũi": khám toàn thân giữ "Sốt [số] độ" (vàng), khám chuyên khoa "Màng nhĩ trái…", chẩn đoán "…tai trái", ICD H66.0, báo "Còn 1 chỗ cần điền".
  - Chưa thử trên trình duyệt trường hợp AI lỗi (cần làm Gemini lỗi) và trường hợp gõ trong lúc chờ; hai trường hợp này có test cho phần hàm thuần.
- **Ảnh hưởng:** Lỗi nhỏ chưa sửa:
  - Mẫu có hẹn "Khi có bất thường" vẫn đổi Hẹn tái khám thành "Có" (không có ngày, vàng).
  - Gọi lại mẫu báo "Bỏ qua 3 ô" vì ô Khám các bộ phận khác bị đếm dù trùng giá trị.
  - Gọi lại mẫu mà không điền được gì vẫn lưu bản để hoàn tác.
  - "Mẫu: vtg cấp" (dấu hai chấm) và "vtg-cấp" không nhận ra mẫu.
  - Câu tự do mở đầu bằng bí danh giống triệu chứng ("Ráy tai nhiều…") bị hiểu là gọi mẫu.
  - "viêm thanh quản cấp tính" còn dư chữ "tính" nên tốn 1 lượt LLM.
  - `eval-mau` gửi cả câu `input_mau` thay vì phần sau tên mẫu.
  - Luật lint cho file test tắt hết `no-restricted-imports`.
  - `[số] tháng` lấy số đầu tiên trước "tháng" ("18 tháng tuổi").

### Phiếu mẫu theo bệnh (8/9): viết lại kịch bản thử với bác sĩ theo cách gọi mẫu
- **Loại:** Tài liệu
- **Thay đổi:** Viết lại `docs/kich-ban-thu-bac-si.md`.
  - **Phần cho bác sĩ:** còn 4 bước (gõ hoặc nói tên mẫu → Điền → kiểm tra 3 tab, sửa chỗ vàng → Lưu). Kịch bản mới:
    - M1: chỉ tên mẫu.
    - M2: tên mẫu kèm chi tiết.
    - M3: nói.
    - M4: phiếu đã có chữ.
    - M5: bệnh chưa có mẫu.
    - M6: thuốc trùng dị ứng.
    - Giữ A1 rút gọn (đọc cả ca) để so thời gian. Bỏ A2–A4 và B1–B4 cũ.
  - **Phần cho người điều phối:**
    - Lúc nào cần LLM.
    - Bảng số đo `npm run eval-mau`, ghi rõ là ước tính.
    - Cảnh báo câu khám có sẵn trong mẫu ("màng nhĩ 2 bên bình thường") và quy tắc nhận tên mẫu.
    - Bảng ghi chép thêm cột "Chữ nào trong mẫu phải sửa", "Ô nào không đọc mà vẫn Lưu".
    - Câu hỏi Mom Test về bộ viết tắt điều dưỡng đang dùng.
  - README cập nhật câu mô tả tài liệu này.
- **Lý do:** Chủ dự án thấy phần bác sĩ đọc cả ca quá dài. Thực tế điều dưỡng dùng phần mềm gõ tắt ra đoạn mẫu chung, bác sĩ chỉ sửa vài chữ. Kịch bản mới thử đúng cách làm đó.
- **File:** `docs/kich-ban-thu-bac-si.md`, `README.md`
- **Kiểm tra:** Đối chiếu tên nút trong tài liệu với code: ✨ Điền vào phiếu, Mẫu theo bệnh:, ✓ Đúng, ↶ Hoàn tác lần AI điền, 🎤 Bắt đầu nói, ⏹ Dừng nghe, "· Mẫu <id>" ở `/ket-qua`. Kiểm tra cuối cả loạt: `npm run lint`, `npx tsc --noEmit` sạch; `npm test` 41/41; `npm run build` thành công; `npm run eval -- --rule-only` giống hệt lúc bắt đầu (diff rỗng); `npm run eval-mau` mức 1 68,5%, mức 2 72,5%.

### Phiếu mẫu theo bệnh (7/9): mở rộng lên 39 mẫu
- **Loại:** Dữ liệu
- **Thay đổi:**
  - `data/eform/phieu-mau.json` thêm 25 mẫu, tổng 39:
    - Tai: nhọt ống tai, nấm ống tai, viêm tai giữa ứ dịch, tắc vòi tai, thủng màng nhĩ, chóng mặt tư thế kịch phát lành tính, bệnh Ménière, viêm dây thần kinh tiền đình, điếc đột ngột, nghe kém tuổi già.
    - Mũi: viêm mũi họng cấp, viêm mũi xoang mạn, polyp mũi, vẹo vách ngăn, quá phát cuốn mũi, nhọt tiền đình mũi, chảy máu mũi, dị vật mũi.
    - Họng, thanh quản: viêm họng mạn, viêm amidan mạn, áp xe quanh amidan, viêm thanh quản mạn, hạt xơ dây thanh, polyp dây thanh, hóc xương.
  - Danh mục thuốc bệnh viện soạn tay `data/catalog/thuoc.json` thêm 2 thuốc giả: TH-034 Clotrimazol nhỏ tai 1%, TH-035 Acid tranexamic 500 mg. Danh mục thật có các hoạt chất này nhưng nhiều sản phẩm trùng tên nên khớp không chắc.
  - Test dữ liệu nâng ngưỡng lên ít nhất 30 mẫu.
- **Lý do:** Người dùng muốn 30–40 bệnh, càng nhiều càng tốt.
- **File:** `data/eform/phieu-mau.json`, `data/catalog/thuoc.json`, `src/server/du-lieu/phieu-mau.test.ts`
- **Kiểm tra:**
  - `npm test` fail khi mới nâng ngưỡng 30 mà chưa thêm mẫu; sau khi thêm thì 41/41 pass. Mọi mẫu tra được ICD, mọi chỉ định và thuốc khớp chắc; đã in mã kiểm tra bằng mắt, ví dụ Ménière H81.0, Flunarizin khớp danh mục thật.
  - `npm run eval -- --rule-only` giống hệt trước (diff rỗng), `npm run eval-mau` không đổi.
  - Playwright: "mẫu meniere", "chảy máu cam", "hóc xương cá" điền đúng mẫu và ICD (H81.0, R04.0, T17.2), console không lỗi.
  - `npm run lint`, `npx tsc --noEmit` sạch.
- **Ảnh hưởng:** Nội dung mẫu là dữ liệu giả, soạn theo kiến thức lâm sàng chung, liều chỉ để minh họa, chưa có bác sĩ duyệt.

### Phiếu mẫu theo bệnh (6/9): đo mẫu đúng sẵn bao nhiêu (`npm run eval-mau`)
- **Loại:** Tính năng, Dữ liệu
- **Thay đổi:**
  - Tách phần chấm điểm của `scripts/eval.ts` sang `scripts/cham-diem.ts`, thêm hàm `chamNhap`. Output của `npm run eval` giữ nguyên.
  - Thêm `scripts/eval-mau.ts` (`npm run eval-mau`, mặc định mock), chấm 2 mức: chỉ có mẫu, và mẫu kèm câu chi tiết ngắn.
  - `CaseData` có thêm `mau_id`, `input_mau`. 10 ca có mẫu được thêm 2 khóa này (ca-09 u bã đậu chưa có mẫu).
  - `dienChoTrong` nhận thêm đơn vị `giờ`, `kg`, vì mẫu dị vật tai và mẫu trẻ em dùng.
  - Mẫu không ghi `so_luong: 1` cho chỉ định nữa (eForm tự hiểu là 1; trước đó bị tính 18 lần "Thừa").
- **Lý do:** Người dùng muốn biết mẫu điền đúng khoảng bao nhiêu phần trăm, để bác sĩ chỉ cần kiểm tra và sửa.
- **File:** `scripts/cham-diem.ts` (mới), `scripts/eval.ts`, `scripts/eval-mau.ts` (mới), `package.json`, `src/shared/types.ts`, `src/shared/eform/phieu-mau.ts`, `src/shared/eform/phieu-mau.test.ts`, `data/eform/phieu-mau.json`, `data/cases/ca-01…08, ca-10, ca-11` (thêm `mau_id`, `input_mau`), `README.md` (mục Đo phiếu mẫu, quy ước đơn vị), `CLAUDE.md`
- **Kiểm tra:** `npm run eval -- --rule-only` trước và sau khi tách: `diff` không khác dòng nào. `npm test` 41/41 (test giờ/kg fail trước khi sửa). `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval-mau` (mock), 10/11 ca có mẫu:
  - **Mức 1, chỉ có mẫu: 68,5%** chung (70,5% không tính tiền sử). Phiếu khám 38,9%, Chỉ định 97,4%, Đơn thuốc 76,3%.
  - **Mức 2, mẫu kèm chi tiết, quy tắc: 72,5%** (74,6%). Phiếu khám 53,7%.
  - Ô yếu nhất: bệnh sử, khám toàn thân, khám chuyên khoa, lời dặn, vì bên tai, con số, câu chữ của từng ca khác mẫu. Hẹn tái khám, hướng điều trị, mã chỉ định gần như đúng hết.
  - Chưa chạy mức 2 với Gemini.
- **Ảnh hưởng:** Đây là ước tính, vì cả mẫu lẫn đáp án đều do nhóm soạn. File `data/cases/*.json` của 10 ca bị ghi lại bằng `json.dumps`: object một dòng giờ bung ra nhiều dòng, nội dung không đổi ngoài 2 khóa mới. Muốn giữ định dạng cũ thì khôi phục rồi chỉ thêm 2 khóa.

### Phiếu mẫu theo bệnh (5/9): gọi mẫu kèm chi tiết, 1 lượt LLM
- **Loại:** Tính năng
- **Thay đổi:**
  - Phía client: câu có tên mẫu và chi tiết phía sau ("vtg cấp, tai T, 3n, sốt 38,5") thì `TroLyAi` gọi `goiAiDienNhap(chiTiet, …, mau.id)`. `ExtractRequest` có thêm `mau_id`.
  - `/api/extract`: lấy mẫu bằng `timMauGoc`, không có thì trả 400 "Không tìm thấy mẫu này, hãy tải lại trang.". Mẫu được truyền xuống `runPipeline(…, { mau })` và `extractDraft`.
  - LLM: `buildUserPrompt(text, previousError, mau)` nối thêm thẻ `<phieu_mau>` cùng lời dặn giữ nguyên câu chữ, chỉ thay chỗ trống, sửa đúng chỗ bác sĩ nói. Kết quả của LLM được chạy thêm `dienChoTrongNhap` cho chỗ trống còn sót.
  - `mock`: chỉ chạy `dienChoTrongNhap`.
  - Mã vẫn gán qua `applyCatalogMatch` như mọi nháp.
- **Lý do:** Bác sĩ chỉ nói vài chi tiết riêng của bệnh nhân, phần còn lại lấy từ mẫu. Lần thử đầu, `gemini-3.5-flash-lite` điền "sốt 38,5" nhưng bỏ sót "tai T" (khám chuyên khoa, chẩn đoán còn `[phải|trái|2 bên]`), nên phải thêm bước quy tắc sau LLM.
- **File:** `src/shared/api.ts`, `src/client/api.ts`, `src/app/api/extract/route.ts`, `src/server/ai/pipeline.ts`, `src/server/ai/llm/index.ts`, `src/server/ai/prompt.ts`, `src/server/ai/prompt.test.ts` (mới), `src/server/ai/pipeline.test.ts` (mới), `src/client/eform/TroLyAi.tsx`, `README.md`
- **Kiểm tra:** `npm test` 40/40 pass: test prompt có mẫu, test mock thay chỗ trống và khớp mã, test chi tiết không hiểu thì giữ ngoặc; các test này fail trước khi sửa code. `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval -- --rule-only` không đổi. Playwright với Gemini (2 lượt): lần đầu bỏ sót bên tai, sau khi thêm quy tắc thì khám toàn thân "Sốt 38,5 độ", khám chuyên khoa "Màng nhĩ trái…", chẩn đoán "Viêm tai giữa cấp tai trái", ICD H66.0, lời dặn và hướng điều trị giữ nguyên mẫu, thông báo không còn chỗ cần điền.
- **Ảnh hưởng:** Mỗi lần gọi mẫu kèm chi tiết tốn 1 lượt LLM (free tier 500 lượt/ngày). Chỉ có tên mẫu thì không tốn lượt nào.

### Phiếu mẫu theo bệnh (4/9): gọi mẫu bằng tên ngay trong eForm, không gọi LLM
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Cột Trợ lý AI (`TroLyAi.tsx`): khi bấm Điền, kiểm tra câu bằng `timPhieuMau` trước.
    - Khớp một mẫu: đổ mẫu vào phiếu, không gọi API.
    - Khớp nhiều mẫu: hiện nút "Dùng mẫu: …" để chọn.
    - Không khớp: chạy luồng AI tách như cũ.
  - Đang gõ dở thì hiện "Mẫu theo bệnh:" với tối đa 5 tên, bấm là điền. Chữ gợi ý trong ô nhập đổi thành ví dụ gọi mẫu.
  - `EformScreen.aiDien(result, text, mau?)`: có mẫu thì gọi `dienPhieu` với `chiOTrong` và mã ICD của mẫu, thêm ô Khám các bộ phận khác khi ô đó trống. Thông báo riêng: "Đã điền theo mẫu …: N ô, X chỉ định, Y thuốc. Bỏ qua K ô đã có chữ. Còn M chỗ cần điền (tô vàng)."
  - `dienPhieu`: ở chế độ `chiOTrong`, ô đã đúng giá trị của mẫu thì không đếm là vừa điền, để lần gọi lại không báo "1 ô".
  - Số đo lượt thử có thêm `mau_id` (`src/shared/metrics.ts`, `/api/sessions`, cột CSV). Trang Kết quả hiện "· Mẫu <id>".
- **Lý do:** Bác sĩ chỉ gõ hoặc nói tên mẫu, sau đó kiểm tra và sửa thay vì đọc cả ca.
- **File:** `src/client/eform/TroLyAi.tsx`, `src/client/eform/EformScreen.tsx`, `src/shared/eform/dien-phieu.ts`, `src/shared/eform/dien-phieu.test.ts`, `src/shared/metrics.ts`, `src/app/api/sessions/route.ts`, `src/client/ket-qua/ResultsView.tsx`, `README.md` (mục Gọi phiếu mẫu theo bệnh)
- **Kiểm tra:** `npm test` 34/34 pass (test "ô đã đúng giá trị mẫu" fail trước khi sửa). `npm run lint`, `npx tsc --noEmit` sạch. Playwright trên dev server:
  - "mẫu viêm tai giữa cấp" → báo "11 ô, 2 chỉ định, 2 thuốc. Bỏ qua 2 ô đã có chữ. Còn 4 chỗ cần điền". Lý do khám và bệnh sử có sẵn của ca giả giữ nguyên, ngày tái khám 2026-11-16, ICD H66.0. Không có request `/api/extract`.
  - Augmentin hiện cảnh báo dị ứng Penicillin.
  - Gọi lại "vtg cấp" không thêm dòng trùng.
  - Gõ "viêm t" hiện 5 gợi ý; bấm "Viêm tai ngoài" thì điền luôn và xóa chữ.
  - Lưu thì `/ket-qua` hiện "Nhập thật · Mẫu viem-tai-ngoai", provider `mau`.
  - Câu kể cả ca (có "chẩn đoán viêm họng cấp") vẫn gọi `/api/extract` (1 lượt Gemini).
  - Console không có lỗi. Đã xóa lượt thử và đơn thói quen do lần kiểm tra này ghi ra.
- **Ảnh hưởng:** Câu bắt đầu bằng tên một mẫu (ví dụ "Viêm tai ngoài 4 ngày nay…") giờ được hiểu là gọi mẫu. Số đo cũ không có `mau_id`, trang Kết quả vẫn đọc được.

### Phiếu mẫu theo bệnh (3/9): đổ phiếu chỉ vào ô trống, chỗ trống tô vàng
- **Loại:** Tính năng
- **Thay đổi:** `dienPhieu` (`src/shared/eform/dien-phieu.ts`) nhận thêm tham số thứ năm `tuyChon: { chiOTrong?, icd? }`. Không truyền thì chạy như cũ.
  - `chiOTrong` (dùng cho phiếu mẫu): ô đã có chữ thì giữ nguyên và đưa vào `boQua`, bất kể chữ đó từ đâu ra (dữ liệu cũ, AI điền lần trước, bác sĩ gõ). Riêng ô Hẹn tái khám: giá trị mặc định "Không" chưa phải lựa chọn của ai, nên mẫu vẫn được đổi thành "Có" và đặt ngày; bác sĩ đã tự chọn thì giữ.
  - `icd`: dùng mã đã tra sẵn từ mẫu thay cho gợi ý ICD theo từ khóa.
  - Ở mọi chế độ, ô còn chỗ trống `[...]` được đánh dấu "xem" (tô vàng) thay vì "ai".
- **Lý do:** Người dùng chốt "mẫu chỉ điền ô còn trống". Ca giả trên eForm có sẵn lý do khám, bệnh sử (điều dưỡng nhập) và hẹn tái khám "Không" mặc định.
- **File:** `src/shared/eform/dien-phieu.ts`, `src/shared/eform/dien-phieu.test.ts` (mới)
- **Kiểm tra:** `npm test` 33/33 pass; 4 test mới fail trước khi sửa code, 2 test về hẹn tái khám pass cả trước lẫn sau để giữ quy tắc cũ. `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval -- --rule-only` không đổi.
- **Ảnh hưởng:** Luồng AI tách cả đoạn không đổi, trừ việc ô có `[...]` giờ tô vàng.

### Phiếu mẫu theo bệnh (2/9): 14 mẫu đầu tiên, nạp và gán mã ở server
- **Loại:** Dữ liệu, Tính năng
- **Thay đổi:**
  - Thêm `data/eform/phieu-mau.json` với 14 mẫu giả, phủ các bệnh trong 11 ca mẫu và 12 bộ gợi ý theo chẩn đoán: viêm tai giữa cấp (người lớn, trẻ em), viêm tai giữa mạn đợt cấp, viêm tai ngoài, nút ráy tai, dị vật tai, ù tai nghe kém, viêm mũi xoang cấp, viêm mũi dị ứng, viêm họng cấp, viêm amidan cấp, viêm VA trẻ em, viêm thanh quản cấp, trào ngược họng thanh quản. Chưa có mẫu cho u bã đậu (ca-09).
  - Mỗi mẫu có đủ 8 ô phiếu khám, ô khám bộ phận khác, chỉ định và đơn thuốc. Mẫu không ghi mã: `icd_ten` là tên ICD10 đúng như trong danh mục.
  - `src/server/du-lieu/phieu-mau.ts` (`loadPhieuMauGoc`, `timMauGoc`, `loadPhieuMau`) gán mã một lần khi nạp trang, dùng `applyCatalogMatch` (chỉ định, thuốc), `applyTotals` (tổng số lượng) và `maIcdTheoTen` mới trong `src/shared/eform/icd.ts` (tra ICD theo tên trùng khít, bỏ dấu). `EformData` có thêm `phieuMau`.
- **Lý do:** Bộ mẫu để bác sĩ gọi bằng tên thay vì đọc cả ca. Mã vẫn chỉ do code khớp danh mục gán (quy tắc 3).
- **File:** `data/eform/phieu-mau.json` (mới), `src/server/du-lieu/phieu-mau.ts` (mới), `src/server/du-lieu/phieu-mau.test.ts` (mới, test dữ liệu), `src/shared/eform/icd.ts`, `src/shared/eform/icd.test.ts` (mới), `src/shared/eform/types.ts`, `src/server/du-lieu/eform.ts`, `README.md` (bảng file `data/eform/`)
- **Kiểm tra:** Chạy `npm test` khi chưa có code thì fail; sau đó 26/26 pass. Mọi mẫu tra được ICD, mọi chỉ định và thuốc khớp chắc (ví dụ viêm tai giữa cấp: H66.0, DV-TMH-003, 21.64, TH-001 tổng 14, TH-013 tổng 9). `npm run lint`, `npx tsc --noEmit` sạch. `npm run eval -- --rule-only` không đổi (Phiếu khám nói 97,1%, gõ tắt 98,1%; Chỉ định nói 92,9%; Đơn thuốc nói 99,1%). Trang `/` vẫn trả 200.
- **Ảnh hưởng:** Nội dung mẫu soạn theo cách viết của ca mẫu và kiến thức lâm sàng chung. Chưa đối chiếu hướng dẫn của Bộ Y tế, chưa có bác sĩ duyệt. Không sửa `data/tham-khao/nguon.json` vì file đó do `npm run cao-du-lieu` ghi lại mỗi lần cào.

### Phiếu mẫu theo bệnh (1/9): nhận lệnh gọi mẫu, điền chỗ trống; thêm `npm test`
- **Loại:** Tính năng
- **Thay đổi:** Thêm `src/shared/eform/phieu-mau.ts` (TS thuần, chạy được cả trình duyệt lẫn server), gồm:
  - Kiểu `PhieuMauGoc` (một mẫu trong `data/eform/phieu-mau.json`, sẽ có ở bước sau) và `PhieuMau` (mẫu đã khớp mã).
  - `timPhieuMau`: nhận tên mẫu hoặc bí danh, có dấu hay không dấu. Chỉ nhận khi tên đứng đầu câu (có thể có "mẫu", "điền mẫu", "theo mẫu" phía trước) hoặc đứng ngay sau chữ "mẫu". Vì vậy câu kể cả ca có nhắc tên bệnh không bị nhầm là gọi mẫu, và "máu" không bị hiểu là "mẫu". Tên dài nhất thắng; hai mẫu cùng khớp thì trả `nhieu` để hỏi lại. Phần còn lại của câu là chi tiết; nếu chỉ còn từ đệm ("nhé") thì coi như không có chi tiết.
  - `goiYTenMau`: gợi ý tối đa 5 tên mẫu khi đang gõ.
  - `dienChoTrong` / `dienChoTrongNhap`: thay `[phải|trái|2 bên]` và `[số] ngày|tuần|tháng|độ|lần` theo chi tiết bác sĩ nói, bung viết tắt trước (`T`→trái, `3n`→3 ngày). Không hiểu, hoặc có nhiều hơn một lựa chọn cùng xuất hiện, thì giữ nguyên chỗ trống.
  - Thêm lệnh `npm test` (`node:test` chạy qua `tsx --conditions=react-server`, không thêm thư viện). `eslint.config.mjs` cho file `*.test.ts` import `node:*`.
- **Lý do:** Bác sĩ chỉ cần gõ hoặc nói một câu ngắn như "mẫu viêm tai giữa cấp", AI điền cả phiếu theo mẫu của bệnh đó, bác sĩ chỉ kiểm tra. Bước này làm phần lõi, chưa nối vào giao diện.
- **File:** `src/shared/eform/phieu-mau.ts` (mới), `src/shared/eform/phieu-mau.test.ts` (mới), `package.json`, `eslint.config.mjs`, `README.md` (mục Test), `CLAUDE.md` (lệnh `npm test`)
- **Kiểm tra:** `npm test`: 16/16 pass (đã chạy thấy fail khi chưa có module). `npm run lint`, `npx tsc --noEmit` sạch.

### Tạm ẩn trang Trình diễn
- **Loại:** Giao diện
- **Thay đổi:** Gỡ link "Trình diễn" khỏi thanh đầu (`Header.tsx`). `src/app/trinh-dien/page.tsx` giờ gọi `notFound()` nên mở `/trinh-dien` ra 404. Vẫn giữ code `src/client/trinh-dien/`, `src/server/du-lieu/trinh-dien.ts`, `data/eform/trinh-dien.json` và các nhánh `kichBan` trong `EformScreen`. Muốn bật lại thì khôi phục `page.tsx`, cách làm ghi trong chú thích của file.
- **Lý do:** Chủ dự án muốn tạm cắt trang này để tập trung vào phiếu mẫu theo bệnh trong eForm.
- **File:** `src/client/chung/Header.tsx`, `src/app/trinh-dien/page.tsx`, `README.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npm run lint` và `npx tsc --noEmit` sạch. Dev server: `/` trả 200, HTML chỉ còn link `/` và `/ket-qua`; `/trinh-dien` trả 404.
- **Ảnh hưởng:** Gần như không làm eForm nhẹ hơn: Next chỉ biên dịch một route khi có người mở nó, và phần dính vào eForm chỉ là vài nhánh `kichBan` nhỏ.

### Gemini free tier: dùng `gemini-3.5-flash-lite`
- **Loại:** Cấu hình
- **Thay đổi:** Đổi `GEMINI_MODEL` trong `.env.local` (không commit) sang `gemini-3.5-flash-lite`. Ghi model nên dùng với key miễn phí vào `README.md`, `.env.example`, `docs/kich-ban-thu-bac-si.md` (sửa giới hạn cũ "5 lượt/phút" thành 15 lượt/phút, 500 lượt/ngày). Không đổi code.
- **Lý do:** Key miễn phí đã hết hạn mức của các model mạnh. Thử 1 lượt bằng ca `ca-01` (lời nói) qua pipeline: `gemini-3.5-flash` báo 503 quá tải; `gemini-3.8-flash` báo 504 sau khoảng 88 giây vì suy nghĩ quá lâu (thêm `thinkingLevel: LOW` thì chỉ mất 2,3 giây, nhưng chưa đưa vào code); `gemma-4-31b-it` mất 75–85 giây khi chạy được, hay lỗi 500/503, giới hạn 16K token/phút; `gemma-4-26b-a4b-it` lỗi 500. `gemini-3.5-flash-lite` mất 2,6 giây, JSON đúng schema ngay lần đầu.
- **File:** `.env.local` (không commit), `.env.example`, `README.md`, `docs/kich-ban-thu-bac-si.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chạy 1 lượt `runPipeline` với ca `ca-01`: 10 trường phiếu khám đúng, chỉ định ra mã `20.13`, 3 thuốc khớp mã, tổng số lượng 28 và 9 đúng. Chưa chạy `npm run eval -- --provider=gemini` cho cả bộ ca.
- **Ảnh hưởng:** Phải khởi động lại `npm run dev` thì mới nhận model mới. Chất lượng trên cả bộ ca chưa đo, mới thử 1 ca.

## 2026-11-11

### Ghi phần bảo hiểm bác sĩ hỏi: "thanh toán BHYT có điều kiện"
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/tham-khao/bao-hiem-thanh-toan-co-dieu-kien-2026-11-11.md`: lời bác sĩ (không biết dịch vụ nào bên nào trả, trả bao nhiêu, muốn loại bảo hiểm hiện ra), gom các ghi nhận BHYT cũ (03/11, khung tích BHYT ở bước 2 màn Chỉ định, quầy tiếp đón), tra cứu điều kiện/tỷ lệ thanh toán thuốc (TT 37/2024) và dịch vụ kỹ thuật (TT 39/2024), bảng các nguồn trả ở Vinmec (BHYT, bảo lãnh tư nhân, kết hợp), 5 giả thuyết chỗ vướng G1–G5, câu hỏi Mom Test cho bác sĩ và phòng BHYT, hướng làm nếu chọn. Thêm dòng vào mục lục `docs/tham-khao/README.md`.
- **Lý do:** Bác sĩ TMH hỏi nhóm có làm phần bảo hiểm y tế không. Chưa đổi code.
- **File:** `docs/tham-khao/bao-hiem-thanh-toan-co-dieu-kien-2026-11-11.md`, `docs/tham-khao/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chỉ tài liệu. Phần luật là tra cứu ban đầu, chưa được phòng BHYT xác nhận.

### Trang Trình diễn: 4 kiểu tương tác với máy trên cùng một ca; hiểu lệnh "kê như mọi khi"
- **Loại:** Tính năng
- **Thay đổi:**
  - Trang mới `/trinh-dien` (link "Trình diễn" trên thanh đầu). Thanh chọn 4 kiểu: 1 Máy điền sẵn, 2 Bấm một lần, 3 Nói một câu, 4 Nghe cả buổi khám. Thẻ giải thích có 5 ô: Giống như, Lúc nào, Bác sĩ làm, Máy làm, Bác sĩ cần kiểm tra; có nút ẩn/hiện. Nút "↺ Làm lại từ đầu". Mỗi lần chọn kiểu, `EformScreen` mở lại với `kichBan`: kiểu 1 đã có nháp AI của câu mẫu (pipeline `mock`, đổ vào phiếu ở server, không gọi LLM); kiểu 2 đã chọn H66.1 và mở tab Đơn thuốc với 3 đơn đã kê giả; kiểu 3 đã chọn H66.1, ô nhập có sẵn câu lệnh; kiểu 4 có nút "▶ Bắt đầu nghe buổi khám" phát lại 12 câu hội thoại giả vào ô nhập, mỗi câu khoảng 1,4 giây, có nút Dừng. Ở trang này Lưu không ghi số đo hay đơn đã kê.
  - Lệnh "kê như mọi khi", "như lần trước", "đơn quen"… (`nhuMoiKhi` trong `src/shared/eform/thoi-quen.ts`) dùng được ở mọi trang: sau khi AI điền, thêm các dòng thuốc, chỉ định bác sĩ hay kê (từ một nửa số lần trở lên) cho chẩn đoán chính lên trước dòng AI tách, bỏ dòng trùng. Thông báo cho biết đã lấy bao nhiêu dòng, hoặc chưa có đơn đã kê cho mã đó. `TroLyAi` gửi kèm đoạn chữ trong `onDien`.
  - Prompt LLM thêm quy tắc cho hội thoại `BS:`/`BN:`: lời bệnh nhân chỉ dùng cho lý do khám, bệnh sử, tiền sử.
  - Kịch bản ở `data/eform/trinh-dien.json` (dữ liệu giả, liều minh họa).
- **Lý do:** Chủ dự án không biết trình bày thế nào để bác sĩ hiểu "tương tác với AI" nghĩa là gì, trước buổi họp bác sĩ đề nghị mà chủ dự án chủ trì. Chọn làm chế độ trình diễn trước tài liệu in.
- **File:** `src/app/trinh-dien/page.tsx` (mới), `src/client/trinh-dien/TrinhDienScreen.tsx` (mới), `src/server/du-lieu/trinh-dien.ts` (mới), `data/eform/trinh-dien.json` (mới), `src/client/eform/EformScreen.tsx` (`kichBan`, `trangThaiDau`, `dongQuen`, không ghi khi trình diễn), `src/client/eform/TroLyAi.tsx` (`vanBanDau`, `hoiThoai`, `onDien(result, text)`), `src/shared/eform/thoi-quen.ts` (`nhuMoiKhi`), `src/shared/eform/types.ts` (`TrinhDienData`, `KieuTuongTac`, `KichBan`), `src/server/ai/prompt.ts`, `src/client/chung/Header.tsx`, `README.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run eval -- --rule-only` không đổi (Phiếu khám nói 97,1%, gõ tắt 98,1%; Chỉ định nói 92,9%; Đơn thuốc nói 99,1%). Playwright trên dev server (`gemini-3.5-flash`), màn 1536×682: kiểu 1 mở ra có 3 chỉ định, 2 thuốc, 3 chỗ cần xem lại; kiểu 2 hiện "Đơn anh/chị đã kê 3 lần trước", Ciprofloxacin và Paracetamol "kê 2/3 lần" được tích, Ofloxacin "kê 1/3 lần" không tích; kiểu 3 bấm Điền (1 lần gọi Gemini) ra Ciprofloxacin, Paracetamol (từ đơn quen) và Cetirizin 10 mg (từ câu nói); kiểu 4 phát đủ 12 câu, bấm Điền (Gemini báo 503 một lần, bấm lại thì được) ra tiền sử lấy từ lời bệnh nhân, khám chuyên khoa, chẩn đoán, lời dặn lấy từ lời bác sĩ, 3 chỉ định, 2 thuốc. Trang `/` không lỗi console. Lần đầu tính nháp kiểu 1 trong component client thì gặp lỗi hydration (lúc SSR mã ICD ra rỗng, trình duyệt ra H66.3; chưa rõ nguyên nhân), nên chuyển sang tính ở server. Chưa chạy eval LLM cho quy tắc hội thoại mới (tốn phí).
- **Ảnh hưởng:** Ở trang chính, câu có "như mọi khi" giờ thêm cả bộ thuốc quen. Khi kê tùy ý thì đây là hành vi mới. Thẻ giải thích chiếm chỗ trên màn thấp, nên ẩn đi trước khi bấm Điền. Lỗi hydration ở trên có thể còn ở chỗ khác nếu sau này để component client gọi `goiYIcd` lúc render đầu.

### Ghi thêm ý "AI hỗ trợ chẩn đoán để đỡ bỏ sót" vào phản hồi bác sĩ
- **Loại:** Tài liệu
- **Thay đổi:** `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md` thêm ý 5 vào bảng, thêm mục "Ý 5": lý do chưa nên làm dạng gợi ý chẩn đoán (rủi ro hỗ trợ quyết định lâm sàng, chưa biết thực tế bỏ sót gì, báo nhiều quá thì bị bỏ qua), đề xuất bản hẹp "cờ đỏ, cân nhắc loại trừ" bằng rule do bác sĩ đưa, 3 ví dụ ghi rõ chưa được bác sĩ xác nhận. Thêm 3 câu hỏi Mom Test. Mục lục `docs/tham-khao/README.md` cập nhật mô tả.
- **Lý do:** Chủ dự án báo thêm ý kiến này sau buổi xem prototype và muốn ghi vào file phản hồi.
- **File:** `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`, `docs/tham-khao/README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đọc lại, không có tên hay thông tin bệnh nhân. Không đổi code.

### Gợi ý "Đơn anh/chị đã kê" theo thói quen từng bác sĩ
- **Loại:** Tính năng
- **Thay đổi:**
  - Bấm Lưu khi phiếu có mã ICD10 chính (ra viện, chưa có thì ban đầu) và có ít nhất một dòng chỉ định hoặc thuốc: ghi các dòng đó (bỏ cột nguồn, ứng viên) và lời dặn qua `POST /api/thoi-quen` vào `data/thoi-quen/<tài khoản>.json`. Kiểm tra bằng zod, thời điểm do server ghi, mỗi tài khoản giữ 200 lần gần nhất. Mỗi lượt mở phiếu có một id (`crypto.randomUUID`), Lưu lại thì ghi đè. Lỗi ghi thì thông báo "Chưa ghi được đơn vào gợi ý theo thói quen".
  - Khung "✨ Gợi ý theo chẩn đoán" ở tab Chỉ định và Đơn thuốc: với mỗi mã ICD đang chọn, nếu tài khoản đã kê cho cùng mã chính thì nhóm "Đơn anh/chị đã kê N lần trước" đứng đầu. Dòng xếp theo số lần kê, liều lấy từ lần gần nhất, có nhãn "kê x/N lần". Dòng kê từ một nửa số lần trở lên được tích sẵn; khi có nhóm này thì bộ mẫu chung không tích sẵn. Mã đã lưu không còn trong danh mục thì bỏ mã, dòng hiện vàng. Dấu ✨ trên tab cũng tính nhóm này. Câu khi trống đổi thành "Chưa có bộ mẫu hay đơn anh/chị đã kê cho …".
  - Tài khoản là `ca.dang_nhap`; thêm `?bs=<tài khoản>` trên URL để đổi (chỉ nhận chữ, số, `_`, `-`; tên này là tên file).
- **Lý do:** Bác sĩ xem prototype hỏi kê đơn có cá nhân hóa không, vì mỗi bác sĩ có thói quen kê khác nhau (`docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`). Chủ dự án duyệt làm.
- **File:** `src/shared/eform/thoi-quen.ts` (mới), `src/server/du-lieu/thoi-quen.ts` (mới), `src/app/api/thoi-quen/route.ts` (mới), `src/shared/eform/goi-y.ts` (thêm `cuaToi` vào `MauGoiY`), `src/shared/eform/types.ts` (`thoiQuen`), `src/shared/api.ts` (`LuuThoiQuenRequest`), `src/client/api.ts` (`luuThoiQuen`, nhận 204), `src/server/du-lieu/eform.ts`, `src/app/page.tsx` (`searchParams`), `src/client/eform/EformScreen.tsx`, `src/client/eform/GoiYTheoChanDoan.tsx`, `.gitignore`, `README.md`, `docs/cau-truc-du-an.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Playwright trên dev server đang chạy, `/?bs=user_test`, không bấm Điền nên không gọi LLM: chọn H66.1, thêm Ciprofloxacin nhỏ tai và Paracetamol bằng ô Tìm thuốc, Lưu → file `data/thoi-quen/user_test.json` có 1 lần kê đúng 2 thuốc. Tải lại, chọn H66.1, tab Đơn thuốc hiện "Đơn anh/chị đã kê 1 lần trước", hai dòng "kê 1/1 lần" được tích sẵn, header hiện `user_test`. Đã xóa file thử. Chưa thử nhiều lần kê khác nhau để xem thứ tự và tích sẵn theo tỉ lệ.
- **Ảnh hưởng:** Không đổi tách/khớp nên không chạy eval. Bác sĩ thấy nhóm mới chỉ sau khi đã Lưu ít nhất một lần cho cùng chẩn đoán. Liều lưu là liều bác sĩ đã Lưu, kể cả khi chưa sửa chỗ vàng.

### Đo và sửa chữ nhận dạng giọng nói
- **Loại:** Tính năng
- **Thay đổi:**
  - `npm run eval-giong-noi`: đưa từng file `.wav` trong `data/giong-noi/` qua đúng luồng VAD của `server/ai/asr.ts` (gửi mẩu 0,4 giây), so với `input_noi` của ca cùng id (hoặc file `.txt` cùng tên). In WER (so cả dấu, số đổi thành chữ bằng `src/shared/giong-noi/so.ts`), số mã dịch vụ và thuốc bộ tách quy tắc vẫn ra so với câu gốc, số dòng thuốc trùng liều/lần/ngày, và số từ bộ sửa đổi nhầm trên câu gốc. Chữ thô lưu ở `<tên>.tho.json` để chạy lại nhanh (`--nhan-lai` để bỏ, `--chi-tiet` để in từng câu).
  - `npm run tao-am-thanh-mau` (chỉ Windows): giọng "Microsoft An" đọc `input_noi` của 11 ca thành `<id>.tts.wav` qua `scripts/tts-windows.ps1` (WinRT), tên thuốc đổi sang cách bác sĩ đọc trước khi đọc.
  - Bước sửa chữ `src/shared/giong-noi/sua-chu.ts` chạy trên trình duyệt cho mọi câu chốt (Zipformer và Web Speech) trong `TroLyAi.tsx`, bảng ở `config/sua-chu-giong-noi.json` (nạp qua `loadSuaChu`, truyền xuống bằng `EformData.suaChu`). Ba bước: thay cụm hay nghe nhầm có điều kiện từ trước/sau ("thai" thành "tai" trừ "có thai", "mang thai"…; "chạy mủ" thành "chảy mủ"; "chẩn" thành "chẩn đoán"…); thay tên thuốc bằng so gần đúng với cách đọc tiếng Việt (bỏ dấu, gộp x/s, d/gi/r, ph/f…, ngưỡng 0,72, chỉ khi gần đó có dấu hiệu kê đơn); đổi số chữ thành chữ số khi đứng trước đơn vị hoặc là số nhiều chữ. Dấu câu cuối từ được tách riêng để quy tắc vẫn khớp với câu Web Speech.
  - `server/ai/sherpa-onnx-node.d.ts` thêm `readWave`. `.gitignore` bỏ qua `data/giong-noi/*` trừ README.
- **Lý do:** Bác sĩ nói chỉ cần chuyển giọng nói thành chữ cho tốt là đủ. Trước đó chưa có cách đo độ chính xác, và số do model trả dạng chữ ("năm trăm mi li gam") nên bộ tách không đọc được liều nào.
- **File:** `CLAUDE.md` (lệnh thường dùng), `scripts/eval-giong-noi.ts` (mới), `scripts/tao-am-thanh-mau.ts` (mới), `scripts/tts-windows.ps1` (mới), `src/shared/giong-noi/sua-chu.ts` (mới), `src/shared/giong-noi/so.ts` (mới), `config/sua-chu-giong-noi.json` (mới), `data/giong-noi/README.md` (mới), `src/server/du-lieu/config.ts`, `src/server/du-lieu/eform.ts`, `src/shared/eform/types.ts`, `src/client/eform/TroLyAi.tsx`, `src/server/ai/sherpa-onnx-node.d.ts`, `package.json`, `.gitignore`, `README.md`, `docs/cau-truc-du-an.md`, `docs/kich-ban-thu-bac-si.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run eval-giong-noi` trên 11 file giọng máy: WER 21,4% → 10,5%, Mã 7/42 → 22/42, Liều 0/24 → 11/24, sửa nhầm trên câu gốc 0 từ. Thử ngưỡng 0,66 (sửa nhầm 24 từ, Mã 18/42) và 0,6 (sửa nhầm 57 từ) nên giữ 0,72. Chạy thử các câu "năm 2015", "3 năm nay", "có thai 3 tháng", "130 trên 80", "0,9%", "một ít nước", "thanh quản" thì đều ra đúng. Hotword sherpa-onnx (`modified_beam_search`, tách token qua bpe vocab tự sinh) chạy được nhưng không đổi kết quả kể cả điểm 10, nên không dùng. Chưa thử trên giao diện với micro thật, chưa đo bằng giọng người.
- **Ảnh hưởng:** Chữ trong ô nhập khác chữ tạm đang hiện lúc nói (chữ tạm chưa sửa). Giọng máy đọc "tai" như "thai" và đọc tên thuốc khác người, nên một phần bảng `thay` có thể chỉ khớp lỗi của giọng máy; cần ghi âm giọng thật (`data/giong-noi/README.md`) để chỉnh. `npm run eval -- --rule-only` không đổi vì không sửa bộ tách.

### Ghi phản hồi của bác sĩ sau khi xem prototype
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`: nhận xét gần nguyên văn (chỉ cần voice-to-text tốt; mức cao hơn là ghi âm cả cuộc trò chuyện; không phải ca nào cũng kê đơn, chỉ định; kê đơn nên cá nhân hóa), bảng ý và việc đã làm, câu hỏi cần hỏi thêm. Thêm dòng vào mục lục `docs/tham-khao/README.md`.
- **Lý do:** Chủ dự án chụp trang sổ tay ghi nhận xét, duyệt làm mục 1 và 4, không làm mục 3.
- **File:** `docs/tham-khao/phan-hoi-bac-si-prototype-2026-11-11.md`, `docs/tham-khao/README.md`
- **Kiểm tra:** Đọc lại, không có tên bác sĩ hay thông tin bệnh nhân. Ảnh sổ tay gốc không đưa vào repo.

### Thêm kịch bản thử với bác sĩ
- **Loại:** Tài liệu
- **Thay đổi:** Thêm `docs/kich-ban-thu-bac-si.md`. Phần 1 in ra cho bác sĩ: các bước trên Trợ lý AI, kịch bản A đọc theo mẫu (A1 nói và A2 gõ tắt ca 11, A3 viêm họng có Augmentin trùng dị ứng Penicillin lấy từ ca 3, A4 ù tai lấy từ ca 8; A3, A4 đổi "anh" thành "chị" và bỏ "ừ, à" cho khớp bệnh nhân giả trên phiếu), kịch bản B bác sĩ tự nói 3 ca theo thói quen và một lần "Điền thêm". Phần 2 cho người điều phối: chuẩn bị (`zipformer`, giới hạn 5 lượt/phút của Gemini miễn phí), những chỗ đã biết là yếu (nghe sai tên thuốc, khoảng 29% từ sai khi thử bằng giọng đọc máy; "đổi liều" thuốc đã có không có tác dụng và không báo), bảng ghi chép và câu hỏi sau buổi thử theo kiểu hỏi việc đã xảy ra. README thêm link ở mục Đo lường và Cấu trúc thư mục.
- **Lý do:** Chủ dự án hỏi kịch bản test cho bác sĩ đọc nằm ở đâu; trước đó chỉ có câu mẫu dạng JSON trong `data/cases/` lẫn với đáp án eval.
- **File:** `docs/kich-ban-thu-bac-si.md`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Đối chiếu nhãn nút với `src/client/eform/TroLyAi.tsx` và `src/client/chung/MicButton.tsx`. Kiểm tra Strepsils không có trong `data/catalog/` và `data/tham-khao/`, Augmentin có 2 hàm lượng nên thiếu hàm lượng sẽ "chưa chắc". Chưa chạy thử các kịch bản trên giao diện.
- **Ảnh hưởng:** Không đổi code hay điểm eval. Câu A3, A4 khác chút so với `data/cases/`, eval không dùng file này.

### Tạm ẩn các bảng "Thông tin khai thác" trên phiếu khám
- **Loại:** Giao diện
- **Thay đổi:** Thêm hằng `HIEN_THONG_TIN_KHAI_THAC = false` ở đầu `src/client/eform/EformForm.tsx`. Khi `false`, phiếu khám không hiện bảng lịch sử các lần khám trước dưới ô Tiền sử bản thân, Tiền sử gia đình, Bệnh sử (kèm nút Copy và ✨ AI tóm tắt), cũng không hiện dòng "Lịch sử dị ứng", nút "Lấy LS dị ứng từ hệ thống khác" và bảng lịch sử dị ứng. Không có nút bật lại trên giao diện. Các ô nhập vẫn gõ được, AI vẫn điền vào như cũ. Cảnh báo dị ứng đỏ trên header vẫn giữ. Code `LichSuBlock.tsx`, `tom-tat.ts` và dữ liệu `lich_su` trong `data/eform/ca-gia.json` giữ nguyên.
- **Lý do:** Chủ dự án muốn buổi thử tập trung vào phần AI điền phiếu. Ẩn chứ không xóa để hiện lại được dễ dàng.
- **File:** `src/client/eform/EformForm.tsx`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Mở `/` bằng playwright (dev server `LLM_PROVIDER=gemini`): không còn chữ "Thông tin khai thác", "Lịch sử dị ứng", "AI tóm tắt" hay nút Copy nào. Ô Tiền sử bản thân, Bệnh sử vẫn hiện, cảnh báo "Dị ứng: Penicillin" vẫn có. Console không lỗi. Không đổi logic tách/khớp nên không chạy eval.
- **Ảnh hưởng:** Bác sĩ không Copy được tiền sử, bệnh sử, dị ứng từ lần khám trước. Muốn hiện lại thì đổi hằng thành `true`.

### Nạp danh mục thật: 367 mã ICD10, 486 kỹ thuật, khoảng 4.770 thuốc; ô chọn đổi thành ô gõ tìm
- **Loại:** Dữ liệu
- **Thay đổi:**
  - `src/server/du-lieu/danh-muc.ts` (mới) ghép danh mục bệnh viện soạn tay ở `data/catalog/` (đánh dấu `uu_tien`, đứng trước) với danh mục thật ở `data/tham-khao/`. Thuốc lưu hành gộp các số đăng ký trùng tên, hàm lượng và dạng bào chế (4.914 → khoảng 4.770), hàm lượng trống hoặc quá dài thì rút từ hoạt chất. ICD10 chỉ giữ mã chi tiết nhất (433 → 367), từ khóa gợi ý lấy từ `data/eform/icd10.json`. Kết quả được nhớ theo giờ sửa file. `loadCatalogs` chuyển từ `config.ts` sang file này.
  - `data/catalog/dich-vu.json`: 19 dịch vụ giả có kỹ thuật tương ứng trong TT 23/2024 đổi sang mã và tên thật, tên cũ chuyển vào `ten_khac` (ví dụ `DV-TMH-002` → `20.13` Nội soi tai mũi họng, `DV-TMH-028` → `22.121` Tổng phân tích tế bào máu ngoại vi bằng máy đếm laser, `DV-TMH-015` CT xương thái dương → `18.158` CLVT tai - xương đá 1-32 dãy). 11 mục TT 23 không có vẫn giữ mã `DV-TMH-*`. Thuốc giữ mã `TH-*`.
  - `data/cases/`: `expected` của 7 ca đổi mã và tên dịch vụ theo bảng trên. `data/eform/icd10.json`: tên 28 mã đổi theo ICD-10 bản 2026.
  - `src/shared/match.ts`: `matchCatalog` khớp hai tầng theo thứ tự trùng tên ở danh mục bệnh viện → trùng tên ở danh mục thật → tìm mờ bệnh viện → tìm mờ danh mục thật. Không tầng nào chắc thì gộp ứng viên của cả hai. `CatalogItem` thêm `uu_tien`.
  - Giao diện: `src/client/eform/TimDanhMuc.tsx` (mới) là ô gõ để tìm (bàn phím lên/xuống/Enter/Esc, tối đa 30 kết quả, nhãn **DM BV**), thay mọi `<select>` liệt kê cả danh mục ở Tìm dịch vụ, Tìm thuốc, ô chọn lại khi AI chưa chắc, Chẩn đoán ban đầu/ra viện, Chẩn đoán kèm theo. Ô ICD đơn có nút × để bỏ mã. `EformData` thêm `vietTat` để ô tìm hiểu từ viết tắt.
- **Lý do:** Chủ dự án thấy thiếu dữ liệu: ứng dụng chỉ có 30 dịch vụ, 33 thuốc, 28 mã ICD giả trong khi danh mục thật đã cào về nhưng chưa nạp. Thuốc thật chỉ có tên biệt dược, không có tên bác sĩ hay gọi, và nhiều hãng trùng tên, nên vẫn cần danh mục bệnh viện soạn tay để khớp chắc. `<select>` 5.000 dòng thì không chọn được.
- **File:** `src/server/du-lieu/danh-muc.ts` (mới), `src/server/du-lieu/config.ts`, `src/server/du-lieu/eform.ts`, `src/shared/match.ts`, `src/shared/types.ts`, `src/shared/eform/types.ts`, `src/client/eform/TimDanhMuc.tsx` (mới), `src/client/eform/ChiDinhTab.tsx`, `src/client/eform/DonThuocTab.tsx`, `src/client/eform/IcdField.tsx`, `data/catalog/dich-vu.json`, `data/eform/icd10.json`, `data/cases/ca-01-viem-tai-giua-cap-tre.json`, `data/cases/ca-02-viem-mui-xoang-cap.json`, `data/cases/ca-04-viem-amidan.json`, `data/cases/ca-05-viem-va-tre.json`, `data/cases/ca-07-di-vat-tai.json`, `data/cases/ca-08-u-tai-nghe-kem.json`, `data/cases/ca-11-viem-tai-giua-man-dot-cap.json`, `data/tham-khao/README.md`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run eval -- --rule-only` trước và sau giống hệt: Phiếu khám nói 97,1% / gõ tắt 98,1%, Chỉ định nói 92,9% / gõ tắt 100%, Đơn thuốc nói 99,1% / gõ tắt 98,1%. Thử khớp: "Klacid Forte", "Betaserc 24mg", "Levocetirizin 5mg" ra số đăng ký thật; "Paracetamol 500mg", "Medrol 16mg", "Augmentin 625 mg" ra thuốc bệnh viện; "đo thính lực lời" ra `21.61`; "Montelukast 10mg" chưa chắc, cho chọn trong các biệt dược. 12 bộ mẫu gợi ý vẫn khớp chắc hết. Playwright mở `/`: gõ "viem tai giua" ở Chẩn đoán ban đầu ra các mã H65/H66, Enter chọn được; tab Đơn thuốc gõ "montelukast" ra biệt dược thật; console không có lỗi.
- **Ảnh hưởng:** Dữ liệu trang tải về trình duyệt tăng lên khoảng 800 KB (thuốc chiếm khoảng 730 KB). Bác sĩ chọn được mọi kỹ thuật, thuốc lưu hành, mã ICD trong phạm vi TMH đã cào. Thuốc ngoài danh mục bệnh viện nói tên gốc thường sẽ ra "chưa chắc" vì nhiều biệt dược cùng hoạt chất. Danh mục thuốc thật mới có tối đa 100 số đăng ký mỗi hoạt chất (ví dụ chưa có Augmentin 625 mg viên). Chưa đo lại độ chính xác với LLM thật.

### Bỏ các thông báo và ghi chú của prototype trên giao diện
- **Loại:** Giao diện
- **Thay đổi:**
  - Bỏ dải vàng "Prototype – chỉ dùng dữ liệu giả…" dưới header (xóa `src/client/chung/Banner.tsx`), chip "Dữ liệu giả, mô phỏng" ở header bệnh nhân, chữ "(DỮ LIỆU GIẢ)" ở tiêu đề Báo cáo y tế, "(mô phỏng màn Medication ordering)" ở tab Đơn thuốc. Bỏ "– Prototype" ở tên trang và thanh trên cùng; link "Mô phỏng eForm ngoại trú" đổi thành "eForm ngoại trú".
  - Không hiện nhãn **Dữ liệu cũ** nữa (`SourceBadge` trả về rỗng với nguồn `cu`, bỏ khỏi chú giải, Đánh giá ban đầu, Thông tin khai thác). Ô dữ liệu cũ vẫn nền xám nhạt; nguồn `cu` vẫn dùng để tính "Đã sửa".
  - Bỏ "(tự động)" ở nhãn Bác sĩ khám, Phòng khám, Bác sĩ chính.
  - Cột Trợ lý AI: bỏ câu hướng dẫn đầu cột, chip "Chế độ AI" (trùng với thanh trên cùng), dòng "Giữ nguyên nội dung bác sĩ đã nhập…", dòng cuối "Mã ICD10… không do AI tự nghĩ ra". Bỏ dòng "Nhận dạng trên máy (Zipformer)…" dưới nút micro.
  - Bỏ dòng giải thích ở Gợi ý ICD10, Gợi ý mẫu câu, Gợi ý theo chẩn đoán ("Mô phỏng bằng bộ mẫu giả…"), AI tóm tắt ("Mô phỏng bằng rule · Gộp…", "Bác sĩ đọc và sửa trước khi chèn…").
  - Thông báo ngắn lại: Lưu chỉ còn "Đã lưu." (lỗi ghi số đo vẫn báo); bỏ đuôi "Bác sĩ duyệt/kiểm tra lại trước khi Lưu"; In ngay không báo trước nữa; bỏ tiền tố "Mô phỏng:" ở các nút chưa nối hệ thống.
  - Giữ lại: cảnh báo chỗ `[ ]` chưa chọn, cảnh báo dị ứng, câu khi chưa có dữ liệu, ghi chú "Chỉ hoạt động khi trạng thái là Chờ KQ CLS", báo thiếu model giọng nói, dấu "DỮ LIỆU GIẢ – BẢN MÔ PHỎNG" trên bản in.
- **Lý do:** Chủ dự án muốn giao diện tối giản, bỏ các thông báo, ghi chú kiểu "prototype chỉ dùng dữ liệu giả", "dữ liệu cũ", "tự động". Các giới hạn vẫn ghi trong README.
- **File:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/client/chung/Banner.tsx` (xóa), `src/client/chung/Header.tsx`, `src/client/chung/MicButton.tsx`, `src/client/eform/EformHeader.tsx`, `src/client/eform/EformScreen.tsx`, `src/client/eform/EformContext.tsx`, `src/client/eform/EformForm.tsx`, `src/client/eform/fields.tsx`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/GoiYTheoChanDoan.tsx`, `src/client/eform/GoiYIcdPanel.tsx`, `src/client/eform/MauCauPanel.tsx`, `src/client/eform/LichSuBlock.tsx`, `src/client/eform/DonThuocTab.tsx`, `src/client/eform/ChiDinhTab.tsx`, `src/client/eform/BaoCaoDialog.tsx`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Playwright mở `/`, nạp câu mẫu kiểu gõ tắt rồi Điền vào phiếu (LLM_PROVIDER đang là gemini): cột AI hiện đủ số trường, chỗ cần xem lại, nút chỉ định/thuốc; quét chữ trên trang không còn "dữ liệu giả", "dữ liệu cũ", "tự động", "Lưu ý" (chỉ còn tên cơ sở giả "Cơ sở mô phỏng" trong dữ liệu ca).
- **Ảnh hưởng:** Người thử không còn được nhắc trên màn hình rằng đây là dữ liệu giả; cần dặn miệng khi cho bác sĩ thử. Bác sĩ không còn thấy câu báo khi AI giữ nguyên ô đã gõ.

### Bỏ qua `.claude/settings.local.json` khỏi git
- **Loại:** Cấu hình
- **Thay đổi:** `.gitignore` thêm `/.claude/settings.local.json`. Đây là file cấu hình Claude Code riêng của từng người, không commit. Chủ dự án dùng file này để chặn (`permissions.deny`) 3 connector claude.ai không liên quan đến dự án là Vercel, Canva, Supabase.
- **Lý do:** 3 connector này nạp hơn 300 tool vào mọi phiên làm việc trên dự án, làm context nặng thêm mà không dùng tới. Connector gắn với tài khoản claude.ai của từng người nên chặn ở file local, không đặt trong `.claude/settings.json` chung.
- **File:** `.gitignore`, `docs/CHANGELOG.md`
- **Kiểm tra:** `git check-ignore -v .claude/settings.local.json` khớp dòng mới. Ngay sau khi tạo file, phiên Claude Code báo gỡ 337 tool của 3 connector.

### Thanh đáy eForm tách lại 2 tầng như EMR, ghim ở mọi khổ màn
- **Loại:** Giao diện
- **Thay đổi:** Thanh dưới đáy (`EformScreen.tsx`) trước gộp một hàng (nút thao tác, trạng thái, Lưu) và chỉ ghim từ khổ `lg`. Giờ tách 2 tầng theo ảnh chụp EMR: tầng trên là dải 7 trạng thái dạng nút tròn (đang chọn nền xanh, khổ điện thoại thì vuốt ngang), tầng dưới là ← Quay lại, Báo cáo y tế, In ngay, nút Lưu dài bên phải (tối đa `max-w-sm`), nút ↑. Ghim `sticky bottom-0` ở mọi khổ màn; khổ điện thoại nút Quay lại chỉ còn mũi tên (có `aria-label`). Biến `--cao-day` giữ 5.75rem cho khớp chiều cao mới (cột Trợ lý AI dùng để tính chiều cao tối đa).
- **Lý do:** Chủ dự án báo thanh đáy bị mất và form khác ảnh EMR trong `temp-1/`. Dưới 1024 px thanh không ghim nên trôi xuống cuối trang; trên EMR thật thanh luôn ở đáy và có 2 tầng.
- **File:** `src/client/eform/EformScreen.tsx`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Playwright + Chrome ở 1778, 900, 390 px, cuộn giữa trang: thanh đáy luôn ghim ở đáy màn, 2 tầng, không xuống dòng chữ trong nút. Chạy lại bài thử chức năng (Báo cáo y tế, khóa khi Hoàn thành khám, chặn khi chưa Lưu, In ngay): kết quả như mục dưới, không lỗi console.
- **Ảnh hưởng:** Khổ điện thoại thanh đáy chiếm khoảng 92 px cố định ở đáy màn. Sinh hiệu vẫn nằm ở header (khác EMR, nơi sinh hiệu là các ô xám trong mục 1), giữ theo đợt làm mới giao diện trước.

### eForm: In ngay in thật, Báo cáo y tế có chẩn đoán chính, Hoàn thành khám khóa phiếu
- **Loại:** Tính năng, Sửa lỗi, Giao diện
- **Thay đổi:**
  - **In ngay** (trước chỉ báo "bản demo không in phiếu") gọi `window.print()`. Thành phần mới `src/client/eform/BanIn.tsx` ẩn trên màn hình, chỉ hiện khi in: hành chính, sinh hiệu, các trường phiếu khám đã có chữ (kể cả tiền sử, dị ứng, hẹn tái khám, tình trạng ra viện), chẩn đoán chính và kèm theo dạng "mã – tên", bảng chỉ định, bảng đơn thuốc, chỗ ký bác sĩ, dấu "DỮ LIỆU GIẢ – BẢN MÔ PHỎNG". Phần còn lại của trang, header và banner prototype có `print:hidden`; `globals.css` thêm `@page` khổ A4 lề 15 mm. Còn chỗ AI chưa chắc thì báo trước khi in.
  - **Báo cáo y tế** (`BaoCaoDialog.tsx`) thêm khối hành chính (họ tên, giới, PID, thời gian khám, bác sĩ khám, dị ứng) và chẩn đoán chính (ra viện, chưa có thì ban đầu) kèm nhãn nguồn. Hàm dùng chung: `nhanIcd` (`IcdField.tsx`), `ngayGio`, `chanDoanChinh` (`BanIn.tsx`); `moTaLieu` trong `DonThuocTab.tsx` được export để bản in dùng.
  - **Hoàn thành khám** khóa phiếu khám, chỉ định, đơn thuốc và cột Trợ lý AI bằng `<fieldset disabled>`, hiện dòng "🔒 … phiếu chỉ đọc"; chọn lại Đang khám để mở. Còn thay đổi chưa Lưu (so tham chiếu dữ liệu lúc Lưu gần nhất, ban đầu là lúc mở trang) thì không cho chọn và báo bấm Lưu trước. Ô nhập bị khóa mờ đi (`disabled:opacity-70` trong `fields.tsx`). Đổi trạng thái chỉ bỏ tích Chuyển nội soi khi đang tích.
  - Sửa ký hiệu giới tính viết cứng ♀ trong header: giờ ♂ cho Nam, ♀ cho Nữ, giới khác không có ký hiệu.
  - Câu báo khi Lưu đổi thành "Đã lưu (mô phỏng): nội dung phiếu chỉ giữ trên trang này, tải lại trang là mất." Câu cũ "không gửi đi đâu" sai vì Lưu có gửi số đo lượt thử về server.
- **Lý do:** Rà phiếu khám theo yêu cầu của chủ dự án: các nút ở thanh đáy (trạng thái, Báo cáo y tế, In ngay) gần như không làm gì, trong khi nhật ký thực địa cho thấy ca nào bác sĩ cũng in phiếu khám và đơn thuốc lúc kết thúc. Báo cáo y tế thiếu chẩn đoán chính nên khó tin; đưa vào là giả định, cần hỏi bác sĩ hoặc xem một bản BCYT thật.
- **File:** `src/client/eform/BanIn.tsx` (mới), `src/client/eform/EformScreen.tsx`, `src/client/eform/BaoCaoDialog.tsx`, `src/client/eform/EformHeader.tsx`, `src/client/eform/IcdField.tsx`, `src/client/eform/DonThuocTab.tsx`, `src/client/eform/fields.tsx`, `src/client/chung/Header.tsx`, `src/client/chung/Banner.tsx`, `src/app/globals.css`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. Chạy script Playwright với Chrome 1440 px trên dev server (`LLM_PROVIDER=mock`): header hiện "♀ Nữ"; Báo cáo y tế có khối hành chính và mục chẩn đoán; chọn Hoàn thành khám khi chưa sửa thì ô Lý do đến khám và ô Trợ lý AI bị khóa, chọn Đang khám mở lại; sửa Lý do rồi chọn Hoàn thành khám thì bị chặn kèm thông báo, Lưu xong thì khóa được; nạp câu mẫu kiểu nói → Điền → In ngay gọi print một lần, báo còn 3 chỗ chưa chắc; giả lập media print và xuất PDF A4: chỉ còn bản in, đủ 3 chỉ định, 2 thuốc, mã ICD và tên. Không có lỗi console. Không ghi file vào `data/sessions/` (không Lưu sau khi AI điền). Chưa thử in ra máy in thật, chưa xem khổ điện thoại, không cần chạy eval (không đổi logic tách/khớp).
- **Ảnh hưởng:** Bác sĩ thử nghiệm thấy phiếu bị khóa sau Hoàn thành khám. Trên EMR thật chưa rõ trạng thái này có khóa phiếu không. Bản in là bố cục tự đặt, không theo mẫu phiếu in thật của Vinmec.

### Bỏ trang "Màn hình làm việc", eForm lên `/`, nút Lưu trên eForm ghi số đo lượt thử
- **Loại:** Tính năng, Dọn dẹp, Cấu hình, Tài liệu
- **Thay đổi:**
  - Trang eForm chuyển từ `/eform` lên `/` (`src/app/page.tsx`). Link cũ `/eform` chuyển về `/` bằng `redirects()` trong `next.config.ts` (không permanent).
  - Bỏ trang "Màn hình làm việc" cũ và code chỉ trang đó dùng: `src/client/workspace/` (Workspace, FormPanel, trang-thai), `src/client/chung/{DynamicField,CatalogPicker}.tsx`, `src/app/eform/page.tsx`, `config/forms/hanh-chinh.json`, `loadAppConfig`/`loadHanhChinh` trong `src/server/du-lieu/config.ts`, kiểu `AppConfig` trong `src/shared/types.ts`, `computeWarnings` (cảnh báo thiếu trường, thiếu mã, trẻ em chưa có cân nặng) trong `src/shared/validate.ts`. Các khóa tuổi, cân nặng trong `config/canh-bao.json` còn đó nhưng không dùng.
  - Header của prototype (`src/client/chung/Header.tsx`) giờ hiện trên mọi trang, còn 2 link: "Mô phỏng eForm ngoại trú" (`/`) và "Kết quả thử nghiệm". Trên eForm nó cuộn đi khi kéo xuống, header bệnh nhân vẫn ghim.
  - Nút "← Quay lại" ở đáy eForm trước dẫn về trang cũ, giờ chỉ báo mô phỏng.
  - Đo lường trên eForm: `TroLyAi.tsx` báo `onBatDau` khi gõ, bấm 🎤 hoặc bấm câu mẫu. Sau khi AI điền, lần bấm Lưu đầu tiên gọi `luuLuotThu` (`/api/sessions`), ghi một lượt vào `data/sessions/`; Lưu tiếp không ghi thêm (tải lại trang để thử lượt mới). Cách đếm ở `src/shared/eform/do-luong.ts` (mới): trường AI điền tính theo từng trường phiếu khám, dòng chỉ định/thuốc AI thêm tính mỗi dòng một mục; sửa hoặc xóa dòng AI là "sửa"; dòng bác sĩ thêm (kể cả từ gợi ý theo chẩn đoán) là "bổ sung"; cảnh báo = chỗ còn "cần xem lại" + thuốc trùng nhóm dị ứng. Dòng AI có cờ mới `tu_ai` (`src/shared/eform/dien-phieu.ts`) để vẫn nhận ra khi bác sĩ đã sửa. Hoàn tác lần AI điền thì trừ cả số đếm.
  - `EformData.cauMau` thêm `id` (`ca-11`) để ghi `ca_mau_id`.
  - Thông báo trống ở trang Kết quả đổi thành hướng dẫn Lưu trên eForm. Sửa chú thích còn nhắc "trang chính".
  - README (chạy ở đâu, mục "Thêm hoặc sửa trường form": giao diện eForm không sinh từ JSON, "Đo lường" viết lại theo eForm, "Mô phỏng eForm ngoại trú", "Cấu trúc thư mục"), `docs/cau-truc-du-an.md`, `CLAUDE.md` cập nhật theo.
- **Lý do:** Chủ dự án thấy hai màn cùng chức năng gây rối, muốn chạy project là vào thẳng prototype eForm, giữ header và trang Kết quả. Trang Kết quả chỉ có dữ liệu từ nút Xác nhận của trang cũ, nên chủ dự án chọn cho nút Lưu trên eForm ghi số đo thay thế.
- **File:** `src/app/page.tsx`, `src/app/eform/page.tsx` (xóa), `next.config.ts`, `src/client/chung/Header.tsx`, `src/client/chung/DynamicField.tsx` (xóa), `src/client/chung/CatalogPicker.tsx` (xóa), `src/client/workspace/*` (xóa), `src/client/eform/EformScreen.tsx`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/fields.tsx`, `src/client/ket-qua/ResultsView.tsx`, `src/shared/eform/do-luong.ts` (mới), `src/shared/eform/dien-phieu.ts`, `src/shared/eform/types.ts`, `src/shared/types.ts`, `src/shared/validate.ts`, `src/server/du-lieu/config.ts`, `src/server/du-lieu/eform.ts`, `config/forms/hanh-chinh.json` (xóa), `README.md`, `docs/cau-truc-du-an.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint`, `npm run build` sạch (còn route `/`, `/ket-qua`, `/api/*`). `npm run eval -- --rule-only` giống hệt trước: Phiếu khám nói 97,1% / gõ tắt 98,1%, Chỉ định nói 92,9% / gõ tắt 100%, Đơn thuốc nói 99,1% / gõ tắt 98,1%. Chạy `next start` với `LLM_PROVIDER=mock` cổng 3100, mở bằng Chrome 1536 px: `/eform` chuyển về `/`, header hiện. Lượt 1: câu mẫu kiểu nói → Điền vào phiếu (14 trường, 3 chỉ định, 2 thuốc) → Lưu: file ghi `noi`, `tu_ca_mau: true`, `ca-11`, AI điền 19, sửa 0, khớp 5/5, cảnh báo 3; Lưu lần 2 báo đã ghi, không thêm file. Lượt 2 (tải lại): gõ tay → Điền (7 trường, 1 chỉ định, 1 thuốc) → sửa Lý do đến khám, xóa dòng chỉ định → Lưu: `go`, AI điền 9, sửa 2, khớp 1/2, cảnh báo 2. `/ket-qua` hiện đủ lượt. Khi kéo xuống, header bệnh nhân ghim top 0, cột AI ghim, không cuộn ngang. Đã xóa 2 file thử. Chưa xem ở khổ 390px (cửa sổ Chrome không đổi kích thước được), chưa thử ghi âm thật qua micro.
- **Ảnh hưởng:** Lượt cũ trong `data/sessions/` vẫn hiện ở trang Kết quả nhưng cách đếm khác (theo từng ô của form JSON), không so trực tiếp được với lượt mới. Mất cảnh báo "trẻ em có kê đơn chưa có cân nặng" (chỉ trang cũ có). Thêm trường vào `config/forms/*.json` giờ không tự hiện trên giao diện nữa.

### Làm mới giao diện `/eform`: header bệnh nhân, thẻ mục, cột Trợ lý AI 3 bước
- **Loại:** Giao diện, Cấu hình
- **Thay đổi:**
  - Giữ nguyên các mục, trường, thứ tự, 3 tab và các trạng thái lượt khám của EMR; chỉ đổi cách trình bày. Bỏ font Arial ép riêng cho trang, dùng Be Vietnam Pro 14px như phần còn lại của prototype.
  - Màu: `config/theme.json` bỏ 7 khóa `emr_*` (xanh, cam, ngọc lam của EMR), thêm `ef_nen`, `ef_vien`, `ef_chu`, `ef_phu`, `ef_xanh`, `ef_dam`, `ef_do`; `globals.css` đổi biến Tailwind tương ứng (`ef-*`, thêm `ef-xanh-nhat`, `ef-do-nhat`). `xem` đổi `#D97706` → `#B45309` cho chữ vàng đủ tương phản trên nền trắng. Tím AI giữ nguyên.
  - `EformHeader`: một dòng tên bệnh nhân, giới, PID, lượt khám, nhãn dị ứng đỏ, Menu; dòng dưới là sinh hiệu (chuyển từ mục Đánh giá chung lên, kèm BMI tự tính), "Đánh giá ban đầu" dạng bảng thả xuống, lần sửa cuối, Xem LSKB, Mở rộng. Header và thanh dưới chỉ ghim từ khổ `lg` trở lên; ở khổ điện thoại chúng cuộn theo trang thay vì che màn hình.
  - `fields.tsx`: nút, ô nhập, nhãn nguồn dạng viên tròn; ô do AI điền có vạch tím bên trái, ô AI chưa chắc có vạch vàng; nhãn "cần xem lại" có nút **✓ Đúng ngay tại trường** (trước đây chỉ có ở cột AI). Mục (`Section`) thành thẻ trắng có tiêu đề chữ thay cho thanh xanh đậm; lựa chọn Có/Không thành thẻ bấm (`RADIO`); thêm hằng `BTN_CHINH`, `TH`, `TD`, `NHOM` dùng chung.
  - `TroLyAi`: thanh 3 bước (Nói hoặc gõ → AI điền → Duyệt, Lưu); mỗi lúc chỉ một nút tô đậm (micro, rồi Điền, rồi phần duyệt); nút Điền có vòng quay khi đang chạy, Ctrl+Enter để điền; sau khi điền có thanh tiến độ tím/vàng, danh sách chỗ cần xem lại (Xem, ✓ Đúng), các trường đã điền thu gọn, nút mở tab Chỉ định/Đơn thuốc, hoàn tác. Cột cao vừa nội dung, không còn khoảng trắng thừa. Chữ đã nói vẫn giữ trong ô sau khi điền; nói hoặc gõ thêm thì nút đổi thành "Điền thêm vào phiếu".
  - `EformScreen`: tiêu đề trái, tab gạch chân, chú giải cùng hàng; thanh dưới gom về một hàng, nút Lưu xanh kèm số chỗ còn cần xem lại. Đổi tên tab "Phiếu khám ngoại trú" → "Phiếu khám" (tiêu đề trang đã ghi đủ).
  - `ChiDinhTab`, `DonThuocTab`, `LichSuBlock`, `IcdField`, các khối gợi ý, `BaoCaoDialog`: cùng màu và kiểu bảng mới; dòng AI điền trong bảng có vạch tím/vàng ở ô đầu.
  - `MicButton` (dùng chung): thêm tùy chọn `onStop` và `giaoDien` (lớp CSS và nhãn nút). Không truyền thì giữ kiểu cũ, nên trang `/` không đổi.
- **Lý do:** Chủ dự án chưa ưng giao diện `/eform`: trông thô, luồng dùng khó hiểu, cột Trợ lý AI nghèo nàn, quá giống EMR cũ. Đã chọn giữ cấu trúc phiếu để bác sĩ vẫn nhận ra, chỉ làm mới trình bày và luồng duyệt AI.
- **File:** `config/theme.json`, `src/app/globals.css`, `src/client/chung/MicButton.tsx`, `src/client/eform/{EformScreen,EformHeader,TroLyAi,EformForm,fields,IcdField,LichSuBlock,ChiDinhTab,DonThuocTab,GoiYTheoChanDoan,GoiYIcdPanel,MauCauPanel,BaoCaoDialog}.tsx`, `README.md`, `docs/cau-truc-du-an.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint`, `npm run build` sạch. Chạy `next dev` với `LLM_PROVIDER=mock`, mở bằng playwright ở 1440×900: `/eform` bấm "kiểu nói" → Điền vào phiếu: 14 trường, 3 cần xem lại, 3 chỉ định, 2 thuốc; bấm Xem cuộn đúng tới ô Chẩn đoán ban đầu; bấm ✓ Đúng tại trường thì cột AI và nút Lưu cùng giảm còn 2; tab Chỉ định, Đơn thuốc hiện đúng gợi ý theo chẩn đoán và cảnh báo dị ứng Augmentin. Khổ 390px: không cuộn ngang, header không che phiếu. Trang `/` vẫn như cũ. Console không lỗi. Chưa thử ghi âm thật qua micro (trạng thái đang nghe có viền đỏ).
- **Ảnh hưởng:** Không đổi logic điền, khớp danh mục hay eval. Ai đang dùng lớp `emr-*` trong nhánh khác phải đổi sang `ef-*`.

### Bật plugin `frontend-design` cho dự án
- **Loại:** Cấu hình
- **Thay đổi:** `.claude/settings.json` thêm `frontend-design@claude-plugins-official` vào `enabledPlugins`. Plugin này có skill thiết kế giao diện (chọn bảng màu, kiểu chữ, bố cục, tự chụp màn hình kiểm tra), Claude dùng khi làm lại giao diện. CLAUDE.md thêm tên plugin vào mục "Plugin dùng trong dự án".
- **Lý do:** Chủ dự án chưa ưng giao diện `/eform` và muốn có skill cải thiện giao diện. Trước đây plugin chỉ bật ở cấu hình cá nhân trên một máy; khai báo ở cấp dự án để đồng đội clone repo về cũng có.
- **File:** `.claude/settings.json`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Skill `frontend-design:frontend-design` gọi được trong phiên Claude Code. Không ảnh hưởng code ứng dụng.

### Tái cấu trúc: tách FE (`src/client`), BE (`src/server`), dùng chung (`src/shared`)
- **Loại:** Dọn dẹp, Phụ thuộc, Cấu hình, Tài liệu
- **Thay đổi:**
  - Vẫn một app Next, chỉ chuyển file (bằng `git mv`, giữ lịch sử). `app/` → `src/app/`; `components/` → `src/client/` chia theo trang (`chung/`, `workspace/`, `eform/`, `ket-qua/`); `lib/llm/`, `pipeline.ts`, `prompt.ts`, `schema.ts`, `asr.ts` → `src/server/ai/`; `lib/config.ts`, `sessions.ts`, `lib/eform/load.ts` → `src/server/du-lieu/` (`load.ts` đổi tên thành `eform.ts`); `types`, `normalize`, `match`, `validate`, `metrics` và phần còn lại của `lib/eform/` → `src/shared/`; `lib/workspace.ts` → `src/client/workspace/trang-thai.ts`. `tsconfig.json`: `@/*` trỏ vào `./src/*`.
  - Thêm `src/shared/api.ts`: kiểu request/response của `/api/extract`, `/api/sessions`, `/api/asr` và hằng `ASR_SAMPLE_RATE`, `ASR_MAX_SECONDS`. Trước đây `MicButton.tsx` chép lại hai hằng này và kiểu kết quả ASR ("khớp với lib/asr.ts"), client lấy `PipelineResult` từ file server; giờ cả hai phía dùng chung một chỗ. Route `/api/asr` dùng `satisfies` để bắt lệch kiểu.
  - Thêm `src/client/api.ts` (`goiAiDienNhap`, `luuLuotThu`): gom đoạn `fetch` `/api/extract` đang lặp ở `Workspace.tsx` và `TroLyAi.tsx`, và `fetch` `/api/sessions`. Thông báo lỗi giữ nguyên như cũ; khác duy nhất là server trả về không phải JSON thì hiện thông báo mặc định thay cho lỗi `SyntaxError`.
  - `countFields` chuyển từ `metrics.ts` sang `client/workspace/trang-thai.ts` vì nó đếm trên trạng thái màn hình (`RowsState`); `metrics.ts` giờ không phụ thuộc giao diện.
  - Chặn import sai chiều: thêm `import "server-only"` (phụ thuộc mới `server-only` 0.0.1) ở `server/ai/pipeline.ts`, `server/ai/llm/index.ts`, `server/ai/asr.ts`, ba file `server/du-lieu/`; `eslint.config.mjs` thêm `no-restricted-imports`: `src/client` không import `src/server`, `src/server` không import `src/client`, `src/shared` không import React, Next, `node:*` hay hai thư mục kia.
  - `npm run eval` đổi thành `tsx --conditions=react-server scripts/eval.ts` (không có cờ này thì `server-only` báo lỗi ngoài Next). `scripts/eval.ts` import theo `@/`.
  - Sửa chú thích còn nhắc đường dẫn cũ (`globals.css`, `sherpa-onnx-node.d.ts`, `shared/eform/goi-y.ts`, `shared/eform/types.ts`, `_ghi_chu` trong `data/eform/goi-y-theo-chan-doan.json`).
  - Tài liệu mới `docs/cau-truc-du-an.md`: sơ đồ thư mục, chiều import, AI nằm ở đâu (AI thật ở `src/server/ai/`, AI bằng rule ở `src/shared/eform/`), luồng chính, bảng thành phần dùng lại được, thêm mới thì đặt ở đâu, cách tách hai app sau này. README: viết lại "Cấu trúc thư mục", đổi `lib/match.ts` → `src/shared/match.ts`. CLAUDE.md: viết lại "Kiến trúc nhanh".
- **Lý do:** Chủ dự án yêu cầu tách BE riêng, FE riêng, rõ AI đặt ở đâu và cái gì dùng lại được. Chọn một app chia thư mục thay vì hai app riêng (monorepo) vì hai app phải chạy hai server, xử lý CORS và đổi `/eform` sang gọi API, tốn công mà prototype chưa cần; ranh giới hiện tại đủ để tách sau.
- **File:** `src/**` (toàn bộ file chuyển từ `app/`, `components/`, `lib/`), `src/shared/api.ts`, `src/client/api.ts`, `src/client/workspace/Workspace.tsx`, `src/client/workspace/trang-thai.ts`, `src/client/eform/TroLyAi.tsx`, `src/client/eform/EformScreen.tsx`, `src/client/chung/MicButton.tsx`, `src/shared/metrics.ts`, `src/server/ai/{asr,pipeline}.ts`, `src/server/ai/llm/index.ts`, `src/server/du-lieu/{config,eform,sessions}.ts`, `src/app/api/asr/route.ts`, `src/app/api/asr/[id]/route.ts`, `src/app/globals.css`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `scripts/eval.ts`, `data/eform/goi-y-theo-chan-doan.json`, `docs/cau-truc-du-an.md`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint`, `npm run build` sạch (đủ 8 route). Thử file tạm import sai chiều: lint báo đủ 4 lỗi (client → server, shared → react, `node:fs`, client), rồi xóa file. `npm run eval -- --rule-only` ra **giống hệt từng dòng** với bản trước khi chuyển (so bằng worktree ở commit `27e2625`): Phiếu khám nói 97,1% / gõ tắt 98,1%, Chỉ định nói 92,9% / gõ tắt 100%, Đơn thuốc nói 99,1% / gõ tắt 98,1%. Chạy `next dev` với `LLM_PROVIDER=mock`, mở bằng playwright: `/eform` bấm Câu mẫu (nói) → Điền vào phiếu: 14 trường, 3 cần xem lại, 3 chỉ định, 2 thuốc, nút 🎤 nhận chế độ Zipformer (`/api/asr` trả `sanSang: true`); `/` chọn ca 1 gõ tắt → AI điền nháp → Xác nhận: "Đã lưu lượt thử", file trong `data/sessions/` đúng số đếm (đã xóa file thử); `/ket-qua` tải được. Console không lỗi. Chưa thử ghi âm thật qua micro.
- **Ảnh hưởng:** Không đổi hành vi hay điểm eval. Ai đang có nhánh sửa file ở `app/`, `components/`, `lib/` sẽ bị xung đột khi gộp: git nhận ra file đổi tên, nhưng đường dẫn import phải sửa theo bảng trên. Dev server đang chạy phải khởi động lại (đã xóa `.next/` cũ). Script mới cần import code server thì chạy bằng `tsx --conditions=react-server`.

## 2026-11-10

### Nhận dạng giọng nói trên máy bằng Zipformer (`ASR_PROVIDER=zipformer`)
- **Loại:** Tính năng, Phụ thuộc, Cấu hình
- **Thay đổi:**
  - Thêm phụ thuộc `sherpa-onnx-node` (2.0.1, kèm gói native `sherpa-onnx-win-x64`), khai báo `serverExternalPackages` trong `next.config.ts` để Node nạp trực tiếp file `.node`.
  - `scripts/tai-model-giong-noi.ts` + lệnh `npm run tai-model-giong-noi`: tải `sherpa-onnx-zipformer-vi-30M-int8-2026-02-09` (~26 MB, từ release công khai của k2-fsa/sherpa-onnx, gốc là model hynt/Zipformer-30M-RNNT-6000h) và `silero_vad.onnx` về `models/`, giải nén bằng `tar` có sẵn. Đã có thì bỏ qua.
  - **Chữ hiện ra trong lúc nói như Web Speech** dù model là loại không streaming, bằng cách nhận dạng hai lớp trong một phiên (`lib/asr.ts`, lớp `PhienNhanDang`): trình duyệt gửi mẩu âm thanh mỗi 0,4 giây; khi VAD thấy đang có tiếng nói thì nhận dạng lại phần câu đang nói dở để trả **chữ tạm**; khi Silero VAD thấy ngắt nghỉ ≥ 0,5 giây (câu tối đa 20 giây) thì nhận dạng cả câu và trả **câu chốt**. Chữ in hoa của model được đổi sang chữ thường, viết hoa chữ đầu, thêm dấu chấm cuối câu. `OfflineRecognizer` tạo một lần (2 luồng CPU, greedy search). Phiên giữ trong bộ nhớ server, tối đa 10 phút, bỏ sau 60 giây không nhận thêm âm thanh; âm thanh không được ghi ra file. `lib/sherpa-onnx-node.d.ts` khai báo kiểu tối thiểu vì gói không kèm `.d.ts`.
  - API: `GET /api/asr` trả chế độ đang dùng và model đã sẵn chưa; `POST /api/asr` mở phiên, trả `id`; `POST /api/asr/[id]` nhận PCM 16-bit mono 16 kHz (mỗi mẩu ≤ 10 giây), trả `{ chot, tam }`; `DELETE /api/asr/[id]` chốt câu cuối và xóa phiên.
  - `components/MicButton.tsx`: hỏi `GET /api/asr`; chế độ `zipformer` (`ZipformerMic`) thu âm bằng AudioWorklet ở 16 kHz (trình duyệt không hỗ trợ thì hạ mẫu bằng nội suy), gửi mẩu theo hàng đợi đúng thứ tự, hiện chữ tạm in nghiêng dưới nút và đưa từng câu chốt vào ô nhập qua `onText` như Web Speech. Nút hiện đồng hồ, "Đang mở micro…", "Đang chốt câu cuối…". Web Speech cũ giữ nguyên thành `WebSpeechMic`; chọn `zipformer` mà chưa có model thì tự dùng Web Speech và báo dưới nút. Dùng chung cho trang chính và `/eform`.
  - (Bản đầu trong cùng ngày làm kiểu ghi âm xong mới nhận dạng; chủ dự án yêu cầu phải vừa nói vừa hiện chữ nên đổi sang phiên như trên, bỏ API nhận cả đoạn.)
  - `.env.example` thêm `ASR_PROVIDER=web` (mặc định). `.gitignore` thêm `/models`.
  - README: viết lại phần "Nhập giọng nói", thêm script và thư mục vào cấu trúc. CLAUDE.md: thêm lệnh `tai-model-giong-noi`.
- **Lý do:** Chủ dự án thử Web Speech thấy nghe kém, yêu cầu dùng Zipformer. Thêm lợi ích: âm thanh không gửi lên Google.
- **File:** `package.json`, `package-lock.json`, `next.config.ts`, `lib/asr.ts`, `lib/sherpa-onnx-node.d.ts`, `app/api/asr/route.ts`, `app/api/asr/[id]/route.ts`, `components/MicButton.tsx`, `scripts/tai-model-giong-noi.ts`, `.env.example`, `.gitignore`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit`, `npm run lint` sạch. `npm run tai-model-giong-noi` tải và giải nén được (sửa lỗi GNU tar của Git Bash hiểu `D:\…` là máy từ xa bằng cách chạy tar trong thư mục `models/`). Chạy model trên 3 file mẫu kèm model: 1,6–3,7 giây âm thanh nhận dạng trong 31–57 ms, đúng nội dung. Script tạm mô phỏng trình duyệt: ghép 3 file kèm 1 giây im lặng, gửi vào phiên từng mẩu 0,4 giây: chữ tạm dài dần sau mỗi mẩu ("Rồi cũng hỗ" → "Rồi cũng hỗ trợ" → …), mỗi lần 20–60 ms; câu chốt ra 0,5–0,8 giây sau khi dứt lời, đúng 3 câu có dấu chấm; kết thúc phiên thì phiên bị xóa. **Chưa thử qua trình duyệt và Next** vì dev server của chủ dự án đang chạy ở cổng 3000 (Next 16 không cho chạy server thứ hai cùng thư mục), cần khởi động lại để nạp `next.config.ts` và `.env.local` mới. **Chưa đo độ chính xác với câu tóm tắt TMH** (tên thuốc, thuật ngữ) so với Web Speech.
- **Ảnh hưởng:** Mặc định vẫn là `web`, không đổi gì nếu không đặt `ASR_PROVIDER`. Người kéo repo về muốn dùng Zipformer phải chạy `npm run tai-model-giong-noi`. Chữ tạm của Zipformer cập nhật theo nhịp 0,4 giây (Web Speech mượt hơn một chút); chữ tạm và câu chốt có thể khác nhau ít (ví dụ "tivi" / "tv") vì câu chốt được nhận dạng lại trên đoạn đã cắt.

### Gợi ý chỉ định và đơn thuốc theo chẩn đoán trên `/eform`
- **Loại:** Tính năng, Giao diện, Dữ liệu, Cấu hình
- **Thay đổi:**
  - Thêm khung "✨ Gợi ý theo chẩn đoán" (`components/eform/GoiYTheoChanDoan.tsx`) ở đầu tab Chỉ định dịch vụ và tab Đơn thuốc. Khung đọc mã ICD10 đang chọn (ra viện → ban đầu → kèm theo), tìm bộ mẫu khớp, liệt kê theo từng chẩn đoán kèm ô tích. Bác sĩ tích chọn rồi bấm "Thêm N mục đã chọn"; không có gì tự thêm. Mục đã có trong danh sách hoặc trùng gợi ý phía trên bị làm mờ. Thuốc cùng nhóm dị ứng không tích sẵn, có cảnh báo đỏ. Tab Đơn thuốc có thêm nút "Chèn vào Lời dặn" cho lời dặn mẫu. Chưa có mã ICD hoặc chưa có bộ mẫu thì hiện hướng dẫn.
  - Tên tab Chỉ định / Đơn thuốc hiện ✨ khi có gợi ý (`EformScreen.tsx`), để bác sĩ đang ở phiếu khám biết.
  - Dữ liệu `data/eform/goi-y-theo-chan-doan.json`: 12 bộ mẫu giả phủ 22/28 mã ICD của trang eForm, chưa có H81.1, J32.9, J33.9, J34.2, R04.0, T17.1 (viêm tai giữa cấp/mạn, viêm tai ngoài, nút ráy, dị vật tai, nghe kém/ù tai, viêm xoang cấp, viêm mũi dị ứng, viêm họng, viêm amidan, khàn tiếng, trào ngược). Chỉ ghi tên; `lib/eform/goi-y.ts` (`khopBoMau`) gán mã bằng `matchCatalog` của `lib/match.ts` lúc nạp trang (`lib/eform/load.ts`), khớp chưa chắc thì dòng là "xem". `chonBoMau` chọn bộ mẫu theo mã, không lặp.
  - Tách kiểm tra dị ứng ra `lib/eform/di-ung.ts` (`trungDiUng`) để đơn thuốc và gợi ý dùng chung; `DonThuocTab.tsx` gọi hàm này thay cho bản cũ trong file.
  - `lib/eform/types.ts`: `EformData` thêm `goiY`; sửa chú thích provider có `gemini`.
  - `.gitignore` thêm `/.playwright-mcp` (ảnh chụp và snapshot plugin playwright tạo ra khi kiểm tra giao diện).
  - README: thêm mô tả gợi ý theo chẩn đoán, file dữ liệu mới và module mới. CLAUDE.md: thêm gợi ý theo chẩn đoán vào mô tả `lib/eform/`.
- **Lý do:** Chủ dự án chọn làm tiếp phần gợi ý theo chẩn đoán. Quan sát thực địa: bác sĩ tìm dịch vụ chỉ định lâu (có ca ~23 phút), phải mở hồ sơ bệnh nhân khác để tra; màn chỉ định thật đã biết chẩn đoán nhưng không dùng để gợi ý.
- **File:** `components/eform/GoiYTheoChanDoan.tsx`, `components/eform/ChiDinhTab.tsx`, `components/eform/DonThuocTab.tsx`, `components/eform/EformScreen.tsx`, `lib/eform/goi-y.ts`, `lib/eform/di-ung.ts`, `lib/eform/load.ts`, `lib/eform/types.ts`, `data/eform/goi-y-theo-chan-doan.json`, `.gitignore`, `README.md`, `docs/CHANGELOG.md`, `CLAUDE.md`
- **Kiểm tra:** `npx tsc --noEmit` và `npm run lint` sạch. Script tạm nạp `loadEformData()`: cả 12 bộ mẫu khớp đủ mã dịch vụ/thuốc, mọi mã ICD trong bộ mẫu có trong `data/eform/icd10.json`. Mở `/eform` trên Chrome 1536 px, chế độ `gemini`: trước khi điền, khung hiện hướng dẫn chưa có ICD; bấm Câu mẫu (nói) → Điền vào phiếu (ICD H66.3, kèm theo J30.4) → hai tab hiện ✨; tab Đơn thuốc có 2 nhóm, Ciprofloxacin/Paracetamol "Đã có", Augmentin không tích và cảnh báo dị ứng Penicillin, 3 thuốc viêm mũi dị ứng tích sẵn; bấm Thêm → đơn 5 thuốc, Fexofenadin tổng 14; Chèn lời dặn → nút thành "Đã chèn"; tab Chỉ định: 3 dịch vụ H66.3 "Đã có", gợi ý thêm Nội soi mũi xoang. Console không lỗi. Chưa thử màn hình hẹp.
- **Ảnh hưởng:** Không đổi pipeline hay điểm eval (chỉ trang `/eform`). Liều trong bộ mẫu là minh họa, cần thay bằng dữ liệu bác sĩ đưa trước khi demo với bác sĩ.

### Thêm nhà cung cấp LLM `gemini`
- **Loại:** Tính năng, Phụ thuộc, Cấu hình
- **Thay đổi:**
  - Thêm `lib/llm/gemini.ts` dùng SDK `@google/genai` (bản 3.0.0): gửi system prompt qua `systemInstruction`, ép JSON bằng `responseMimeType: application/json` + `responseJsonSchema` (dùng chung schema với Anthropic/OpenAI). Báo lỗi rõ khi thiếu key/model, khi Gemini chặn yêu cầu (`blockReason`, `SAFETY`) hoặc bị cắt do hết token. Timeout 90 giây như hai provider kia.
  - Đăng ký `gemini` trong `lib/llm/index.ts`, nên tự có kiểm tra schema bằng zod và thử lại 1 lần như các provider khác. `npm run eval -- --provider=gemini` chạy được.
  - `.env.example` thêm `GEMINI_API_KEY`, `GEMINI_MODEL` (bắt buộc điền tên model, không đặt sẵn vì tên model Gemini đổi thường xuyên).
  - README: thêm dòng `gemini` vào bảng "Đổi nhà cung cấp AI" và phần cấu trúc thư mục. CLAUDE.md: thêm `gemini` vào lệnh eval tốn phí và sơ đồ kiến trúc. Sửa chú thích trong `lib/schema.ts` và `scripts/eval.ts`.
- **Lý do:** Chủ dự án chốt dùng LLM bên ngoài cho prototype vì thời gian có hạn, và định dùng API key Gemini.
- **File:** `lib/llm/gemini.ts`, `lib/llm/index.ts`, `lib/schema.ts`, `scripts/eval.ts`, `package.json`, `package-lock.json`, `.env.example`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit` và `npm run lint` sạch. Gọi thử 1 lượt câu nói mẫu của ca 11 qua `runPipeline`: `gemini-3.5-flash` nhận nguyên schema (`anyOf` với `null`, `additionalProperties: false`), mất 10,3 giây, ra 10 trường phiếu khám, 3 chỉ định, 2 thuốc, chẩn đoán đúng ý. `gemini-3.8-flash` trả lỗi 503 (quá tải) lúc thử. Chọn `gemini-3.5-flash` cho `.env.local`. Chưa chạy eval đầy đủ.
- **Ảnh hưởng:** Không đổi hành vi khi `LLM_PROVIDER` là `mock`, `anthropic` hay `openai`. Điểm eval không đổi.

### Cào danh mục thật (ICD-10, dịch vụ kỹ thuật, thuốc) về `data/tham-khao/`
- **Loại:** Dữ liệu, Tính năng
- **Thay đổi:**
  - Thêm `scripts/cao-du-lieu.ts` và lệnh `npm run cao-du-lieu` (`--bo-thuoc` để bỏ phần thuốc). Script tải CodeSystem của HL7 Vietnam VN Core IG và gọi API tra cứu số đăng ký công khai của Cục Quản lý Dược, lọc phần TMH, ghi ra `data/tham-khao/`.
  - `icd10-tmh.json`: 433 mã ICD-10 bản 2026 (TT 06/2026/TT-BYT) nhóm tai, mũi họng, thanh quản, u đầu cổ, dị vật... bao trùm cả 28 mã đang dùng ở `data/eform/icd10.json`.
  - `dich-vu-ky-thuat-tmh.json`: 486 kỹ thuật theo TT 23/2024/TT-BYT (toàn bộ chương 15 và phần liên quan của chẩn đoán hình ảnh, nội soi, thăm dò chức năng, xét nghiệm, phẫu thuật nội soi).
  - `thuoc-hoat-chat.json`: 960 mã hoạt chất (QĐ 7603/QĐ-BYT). `thuoc-luu-hanh-tmh.json`: 4.914 thuốc còn hiệu lực số đăng ký của 58 hoạt chất hay kê ở TMH, tối đa 100 thuốc mỗi hoạt chất.
  - `data/tham-khao/README.md` ghi nguồn, phạm vi lọc và giới hạn; `nguon.json` ghi ngày cào và số mục.
  - README: thêm `data/tham-khao/` và script vào phần cấu hình và cấu trúc thư mục. CLAUDE.md: thêm lệnh vào "Lệnh thường dùng".
- **Lý do:** Chủ dự án yêu cầu lên mạng lấy dữ liệu bệnh TMH, thuốc và dịch vụ chỉ định về thư mục data. Để riêng ở `data/tham-khao/` vì `data/catalog/` được ứng dụng tự nạp: thay vào đó sẽ đổi mã khớp danh mục và làm sai `expected` của 11 ca eval (đang dùng mã giả `DV-TMH-*`, `TH-*`).
- **File:** `scripts/cao-du-lieu.ts`, `package.json`, `data/tham-khao/{icd10-tmh,dich-vu-ky-thuat-tmh,thuoc-hoat-chat,thuoc-luu-hanh-tmh,nguon}.json`, `data/tham-khao/README.md`, `README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npm run cao-du-lieu` chạy hết không lỗi; `npm run lint` sạch. Soi tay: không còn thuốc lọt do API tìm theo chuỗi con (Levofloxacin dưới "Ofloxacin", Desloratadin dưới "Loratadin", Esomeprazol dưới "Omeprazol", Methylprednisolon dưới "Prednisolon"); đã loại 2 kỹ thuật lọc nhầm ("xoang hang", "u não vòm sọ"). Chưa chạy eval vì ứng dụng không đọc dữ liệu mới.
- **Ảnh hưởng:** Không đổi hành vi ứng dụng hay điểm eval. Dữ liệu là danh mục công khai, không có thông tin bệnh nhân. HL7 Vietnam ghi chú tái phân phối bản chuẩn hóa cần phê duyệt trước khi dùng production.

### Trang `/eform` giống màn EMR, cột Trợ lý AI điền cả phiếu, chỉ định và đơn thuốc
- **Loại:** Tính năng, Giao diện
- **Thay đổi:**
  - Giao diện `/eform` theo màn EMR thật (đối chiếu 2 ảnh chụp trong `temp-1/` và `docs/cau-truc-phieu-kham-ngoai-tru.md`): header có logo và dải cam "Bệnh án điện tử", Menu, dòng PID có nhãn giới và dị ứng, Xem LSKB, tiêu đề "Phiếu khám ngoại trú", thanh mục xanh đậm, ô chỉ đọc màu xám, font Arial, thanh đáy xanh gồm 7 nút trạng thái và các nút Quay lại / Báo cáo y tế / In ngay / Lưu. Bảng lịch sử có thêm nút Copy từng dòng. Thanh header của prototype ẩn trên trang này.
  - Thêm cột phải "✨ Trợ lý AI điền phiếu" (`components/eform/TroLyAi.tsx`): nói (mic) hoặc gõ tắt → `/api/extract` (pipeline có sẵn của trang chính) → điền 14 trường phiếu khám, chỉ định và đơn thuốc. Có danh sách trường đã điền với nút "xem →", đánh dấu "✓ Đúng", hoàn tác.
  - Thêm 2 tab Chỉ định dịch vụ (`ChiDinhTab.tsx`) và Đơn thuốc (`DonThuocTab.tsx`): sửa từng dòng, chọn lại khi khớp chưa chắc, thêm từ danh mục, tổng số lượng tự tính, cảnh báo thuốc cùng nhóm dị ứng.
  - `lib/eform/dien-phieu.ts`: đổ kết quả AI vào phiếu. Không ghi đè ô bác sĩ đã nhập; mã ICD10 do code chấm điểm gán (không từ LLM), luôn đánh dấu "cần xem lại"; hẹn tái khám tự tính ngày từ thời gian khám.
  - Thêm nguồn `xem` (AI chưa chắc) vào `lib/eform/types.ts`, màu vàng. Màu AI trên trang này đổi sang tím để không lẫn với xanh/cam của EMR.
  - `config/theme.json` thêm màu `emr_*`, `ai_tim`, `xem`; `app/globals.css` thêm token tương ứng.
  - `lib/eform/load.ts` nạp thêm danh mục dịch vụ/thuốc, quy tắc tính tổng, chế độ AI và câu mẫu.
  - Thêm ca mẫu `data/cases/ca-11-viem-tai-giua-man-dot-cap.json` (cùng bệnh nhân giả của trang eForm, dị ứng Penicillin nên đơn không có kháng sinh nhóm penicillin) để chế độ mock demo được đầy đủ.
  - README: viết lại phần "Mô phỏng eForm ngoại trú", số ca eval 10 → 11, giải thích khóa màu mới.
- **Lý do:** Chủ dự án muốn trang eForm giống EMR để bác sĩ dễ làm quen, khác ở chỗ AI điền hộ để bác sĩ thao tác ít nhất; đã chọn bố cục "cột trợ lý AI bên phải" trên mockup.
- **File:** `app/globals.css`, `components/Header.tsx`, `components/eform/{EformScreen,EformHeader,TroLyAi,ChiDinhTab,DonThuocTab,fields,EformForm,IcdField,LichSuBlock,GoiYIcdPanel,MauCauPanel,BaoCaoDialog}.tsx`, `lib/eform/{dien-phieu,types,load}.ts`, `config/theme.json`, `data/cases/ca-11-viem-tai-giua-man-dot-cap.json`, `README.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** `npx tsc --noEmit` và `npm run lint` sạch. Mở `/eform` trên Chrome (1536 px): bấm Câu mẫu → Điền vào phiếu ra 14 trường, 3 trường vàng (ICD H66.3, H66.3, J30.4), 3 chỉ định và 2 thuốc khớp danh mục, Paracetamol tổng 15; "xem →" cuộn đúng ô; thêm Augmentin hiện cảnh báo dị ứng; điền thêm "Chỉ định nội soi." thành 4 dịch vụ (dòng mới màu vàng, có ô chọn lại); Hoàn tác về 3. Không có lỗi console. Chưa thử trên màn hình hẹp và chưa thử với LLM thật.
- **Ảnh hưởng:** Eval có 11 ca thay vì 10. Rule-only trước/sau: Phiếu khám nói 96,8% → 97,1%, gõ tắt 97,9% → 98,1%; Chỉ định nói 91,7% → 92,9%; Đơn thuốc nói 99,5% → 99,1%. Mock vẫn 100%.

### Quy ước: thông tin nhạy cảm để trong `temp-1/`
- **Loại:** Tài liệu
- **Thay đổi:**
  - Làm sạch `docs/tham-khao/`: tên tác giả (5 chỗ) → "tác giả (học viên thực tập)"; "người Nga", "hộ chiếu Nga", "tiếng Nga" (9 chỗ) → "nước ngoài" hoặc "ngôn ngữ trên hộ chiếu".
  - Bản gốc đầy đủ từ Claude Project chuyển vào `temp-1/vinmec-project/`: 10 file `.md`, gồm `context-thuc-tap-vinmec.md`, và `vinmec-project-docs.json` (chuyển từ `D:\Download\`).
  - Thêm quy tắc vào `CLAUDE.md` và ghi chú trong `docs/tham-khao/README.md`.
- **Lý do:** Chủ dự án yêu cầu: cái gì nhạy cảm thì ghi vào `temp-1/`.
- **File:** `docs/tham-khao/bao-cao-tuan-1-phan-1-2.md`, `docs/tham-khao/bao-cao-tuan-1-phan-4.md`, `docs/tham-khao/nhat-ky-day-du-tmh.md`, `docs/tham-khao/nhat-ky-quay-tiep-don-tmh.md`, `docs/tham-khao/README.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** grep tên tác giả và chữ "Nga" trong `docs/tham-khao/*.md` không còn kết quả; `git status` không liệt kê `temp-1/`.

### Đưa tài liệu quan sát từ Claude Project "Vinmec" vào repo
- **Loại:** Tài liệu
- **Thay đổi:**
  - Thêm 5 file vào `docs/tham-khao/`: `nhat-ky-day-du-tmh.md`, `nhat-ky-day-du-tmh-tuan-2.md`, `nhat-ky-quay-tiep-don-tmh.md`, `bao-cao-tuan-1-phan-1-2.md`, `bao-cao-tuan-1-phan-4.md`. Nội dung giữ nguyên, chỉ sửa đường dẫn `claude/...` cho trỏ đúng vị trí trong repo.
  - Thêm `docs/tham-khao/README.md`: mục lục, thời gian quan sát, phần app liên quan, lưu ý dữ liệu.
  - `CLAUDE.md` trỏ tới `docs/tham-khao/`.
  - Không chép: `context-thuc-tap-vinmec.md` (hồ sơ cá nhân và tên người phụ trách CAIR, để ở `temp-1/` ngoài git), file HTML `vinmec-ai-sprint-ban-2.html` (1,7 MB) và 21 ảnh JPG.
  - Không thay 4 file đã có trong `docs/`: `cau-truc-phieu-kham-ngoai-tru.md` giống hệt bản trên project, các file còn lại là bản đã làm sạch (bỏ tên mentor, sửa đường dẫn).
- **Lý do:** Chủ dự án muốn tài liệu trong Claude Project dùng được khi làm việc trong repo.
- **File:** `docs/tham-khao/*.md`, `CLAUDE.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Rà bằng grep tên người, PID, số điện thoại, email: không có thông tin bệnh nhân. Mọi liên kết `.md` trong `docs/tham-khao/` trỏ tới file có thật.

### Thiết lập Claude Code: plugin, quy tắc và bắt buộc ghi tài liệu
- **Loại:** Cấu hình
- **Thay đổi:**
  - Thêm `CLAUDE.md`: quy tắc dự án cho Claude (ghi tài liệu mọi thay đổi, chỉ dữ liệu giả, mã danh mục chỉ do code gán, đọc docs Next 16 trước khi code), lệnh thường dùng, kiến trúc nhanh. File này nạp `AGENTS.md`.
  - Thêm skill `ghi-tai-lieu` (`.claude/skills/ghi-tai-lieu/SKILL.md`): mẫu mục CHANGELOG và bảng "đổi gì thì cập nhật tài liệu nào".
  - Thêm hook `Stop` (`.claude/hooks/check-docs.mjs`): khi Claude định kết thúc lượt, nếu còn file không phải tài liệu (ngoài `docs/`, `*.md`, `.claude/`) được sửa sau lần cập nhật `docs/CHANGELOG.md` gần nhất thì chặn lại và yêu cầu ghi tài liệu. Chỉ nhắc một lần mỗi lượt để tránh lặp.
  - Bật 5 plugin ở phạm vi project trong `.claude/settings.json`:
    - `typescript-lsp`: Claude thấy lỗi kiểu và nhảy định nghĩa trong TS/TSX. Cần cài `npm i -g typescript-language-server typescript` (đã cài trên máy này, bản 6.0.3).
    - `playwright`: mở trình duyệt để xem thật các trang `/`, `/eform`, `/ket-qua` sau khi sửa giao diện.
    - `security-guidance`: cảnh báo lỗ hổng (XSS, lộ secret, injection) khi sửa code; phù hợp vì app gọi API LLM và xử lý nội dung y tế.
    - `claude-md-management`: rà soát và cập nhật `CLAUDE.md` khi quy ước thay đổi.
    - `commit-commands`: lệnh `/commit`, `/commit-push-pr` cho git.
  - Các plugin đã có sẵn ở phạm vi người dùng và vẫn dùng được: `superpowers`, `context7` (tra docs Next 16, Tailwind 4, SDK), `frontend-design`, `andrej-karpathy-skills`, `document-skills`.
- **Lý do:** Yêu cầu từ chủ dự án: cài plugin/skill phù hợp, đặt quy tắc cho Claude và mọi thay đổi nhỏ nhất đều phải có tài liệu.
  - `README.md`: thêm `docs/`, `.claude/` vào phần cấu trúc thư mục và trỏ tới `docs/CHANGELOG.md`, `CLAUDE.md`.
- **File:** `CLAUDE.md`, `README.md`, `.claude/settings.json`, `.claude/hooks/check-docs.mjs`, `.claude/skills/ghi-tai-lieu/SKILL.md`, `docs/CHANGELOG.md`
- **Kiểm tra:** Chạy thử hook bằng `echo '{}' | node .claude/hooks/check-docs.mjs`: trả về `decision: block` khi `.gitignore` sửa mà chưa ghi; trả về rỗng khi `stop_hook_active: true`.

### Bỏ qua thư mục `temp-1/` và `.superpowers/` khỏi git
- **Loại:** Cấu hình
- **Thay đổi:** Thêm `/temp-1` và `/.superpowers` vào `.gitignore`.
- **Lý do:** `temp-1/` là thư mục làm việc tạm và chứa thông tin nhạy cảm. `.superpowers/` chứa mockup nháp khi thiết kế lại giao diện `/eform` cho giống EMR.
- **File:** `.gitignore`
- **Kiểm tra:** `git status` không còn liệt kê `temp-1/` hay `.superpowers/`.
