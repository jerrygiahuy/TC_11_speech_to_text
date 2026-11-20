# Dashboard and Patient Information Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document authorizes planning only; do not start implementation automatically.

**Goal:** Thêm dashboard lịch khám theo ngày và hồ sơ bệnh nhân có lịch sử toàn phiếu, nối đúng lượt vào eform hiện có.

**Architecture:** Read model lịch hẹn/bệnh nhân riêng, join với Encounter đã lưu bằng facility/appointment; dùng một snapshot response cho lịch, danh sách và thống kê. Page server load dữ liệu, client xử lý view/dialog và refresh; thao tác mở phiếu dùng context/open-or-reuse của plan ca khám nhiều phiên. Popup lịch sử là view thuần chỉ đọc, không dựng editor.

**Tech Stack:** Next.js 16.4.5 App Router, React 19.3.0, TypeScript, Tailwind 4, Zod, local JSON, node:test qua tsx; không thêm dependency UI/calendar/test.

**Spec:** [Thiết kế dashboard và bệnh nhân](2026-11-14-dashboard-patient-design.md).

**Status:** PENDING — CHƯA TRIỂN KHAI. Hướng bố cục và cách tính đã được người dùng chốt; chi tiết kỹ thuật đề xuất trong hai tài liệu cần được duyệt trước khi sửa code ứng dụng. Không có test sản phẩm nào đã chạy trong lúc viết plan.

## Global Constraints

- Còn lại = chưa khám + đang khám + chờ kết quả CLS; đang khám/chưa hoàn tất là tập con của còn lại, không cộng hai số này.
- N là toàn bộ lịch hợp lệ của ngày, bác sĩ, cơ sở đang xem, bao gồm ca hủy và kết thúc khác.
- Một lịch tương ứng một lượt khám, không đếm số recording session.
- Mặc định ngày hôm nay theo `Asia/Ho_Chi_Minh`, bác sĩ và cơ sở lấy từ actor demo phía server.
- Danh sách lịch chính chia Sáng [00:00,12:00) và Chiều [12:00,24:00) theo giờ cơ sở.
- Giữ font Be Vietnam Pro, nền `ef_nen`, viền `ef_vien`, chữ `ef_chu`/`ef_phu`, thao tác `ef_xanh`, tiêu đề `ef_dam`.
- Body 15px; nội dung thường 13–14px, phụ 11–12px, tên/tiêu đề khối 18px như eform; số thống kê 24px.
- Giữ `/` cho eform, thêm `/dashboard` và `/benh-nhan/[patientId]`; mọi định danh ngoài hệ thống là chuỗi, giữ số 0 đầu.
- Chỉ dữ liệu giả local; giữ `assertLocalDemoRequest`, kiểm quyền server, chính sách dữ liệu hiện có.
- Không triển khai lại recording, approvals, changes hoặc migration trong plan hai màn hình.
- Toàn bộ phiếu cũ là toàn bộ dữ liệu clinical đã lưu; không bịa đơn thuốc từ kho thói quen hoặc từ AI.
- Đọc guide Next.js trong `node_modules/next/dist/docs/` trước code; dynamic `params`/`searchParams` là Promise.
- Trước mỗi symbol edit chạy impact upstream, báo HIGH/CRITICAL; UNKNOWN cần kiểm chứng thêm. Trước mỗi commit chạy detect_changes scope all, không coi partial/truncated là sạch. Chỉ stage file task, working tree có thay đổi sẵn.

## Review Focus

1. Giao ngày UTC/giờ Việt Nam, đúng 12:00 và ca chờ qua ngày: nhóm/ngày đếm đúng và không mất ca chờ — Task 1, 3.
2. Hủy lịch nhưng Encounter đã bắt đầu; trạng thái kết thúc khác/không biết: không coi là đã khám xong hay âm thầm bỏ tổng — Task 1, 3.
3. Giả patient/appointment/encounter/facility trong URL; lịch sử bác sĩ khác cùng cơ sở: policy đọc riêng, không nới quyền sửa — Task 2, 6.
4. Nhấn next/sau nhanh, mạng chậm/lỗi, history thay đổi: nội dung và index luôn cùng phiếu, không ghi vào hồ sơ — Task 5.
5. Hai tab tạo cùng lịch; rời eform còn mic/text chưa lưu: cùng UUID, không mất nội dung và không chuyển sai người — Task 6, 7.

## Bằng chứng hiện trạng và phạm vi khảo sát

GitNexus repo `speech-to-navigation`, list_repos cho index tại 2026-11-13T15:29:00.616Z. Đã query clinical/eform và context EformScreen/readClinical, đối chiếu source đang làm việc. Chưa xác nhận freshness so với toàn bộ thay đổi uncommitted; CLI status không trả kết quả hoàn chỉnh trong lần khảo sát. Phải xác minh/reindex trước thực thi; không xem graph như chứng minh đầy đủ hiện trạng.

Impact khảo sát upstream depth 2: `EformScreen` LOW, 2 caller trực tiếp (`Page`, `TrinhDienScreen`), một nhóm process Page; `loadEformData` **CRITICAL**, 4 caller trực tiếp (`Page`, `readClinical`, `saveClinical`, `loadTrinhDienData`), 7 symbol ảnh hưởng trong giới hạn khảo sát, 6 nhóm process. Luồng đọc/lưu/duyệt/API và trình diễn đều cần hồi quy khi thay loader/context. Không dùng riskSharedAxes LOW để hạ cảnh báo CRITICAL. Đây không thay thế impact tại thời điểm sửa.

Đã đọc Next guide `01-app/01-getting-started/03-layouts-and-pages.md`, `01-app/03-api-reference/03-file-conventions/route.md`; người triển khai đọc tiếp page, dynamic routes, navigation theo phần sửa. Đã đối chiếu `src/app/{page,layout,globals.css}`, Header, EformScreen, EformContext, BanIn, clinical repository/service/api/eform và hai tài liệu pending interrupted-encounters.

## Phụ thuộc và thứ tự

Đây là một tính năng nối hai màn hình chung dữ liệu, không tách thành hai backend độc lập.

- Task 1–5 có thể phát triển read-only bằng actor/context fixture đã được thống nhất; không phải bản hoàn tất end-to-end.
- Trước Task 6 phải nghiệm thu phần context/open-or-reuse và bảo vệ rời/chuyển ca trong [plan nhiều phiên](2026-11-14-interrupted-encounters.md), gồm API action open, loader đúng bệnh nhân, privacy/AI bound đúng context và microphone/content guard. Không tự coi pending plan là implementation có sẵn.
- Nếu dependency chưa được duyệt/triển khai: giữ nút create/continue ở trạng thái chưa khả dụng trong preview và ghi rõ blocker; không dựng đường tạo giả để báo hoàn thành. Hoàn tất plan này cần dependency được cung cấp, không âm thầm nhận triển khai toàn bộ plan khác.

## File Structure và contracts

**Mới — dữ liệu và nghiệp vụ đọc**

- `src/shared/clinic/types.ts`: DTO bên dưới; `schema.ts`: Zod fixture/query validation.
- `src/shared/clinic/schedule.ts`, `schedule.test.ts`: timezone, status, số liệu, sắp xếp, tuổi.
- `src/shared/clinic/history.ts`, `history.test.ts`: thứ tự history, điều hướng, view model toàn phiếu.
- `src/server/clinic/repository.ts`, `repository.test.ts`: đọc patients/appointment metadata, join context và Encounter read-only.
- `src/server/clinic/service.ts`, `service.test.ts`: authorize, dashboard/patient/detail DTO.
- `src/server/clinic/appointment-context.ts`, `appointment-context.test.ts`: lookup/policy chung cho màn đọc và clinical action open, join context của dependency với metadata lịch và hồ sơ bệnh nhân.
- `data/clinic/patients.json`: hồ sơ bệnh nhân và bảo hiểm giả; `data/clinic/appointments.json`: thời gian/nội dung/trạng thái lịch, tham chiếu khóa trong `data/eform/encounter-contexts.json` của dependency. Context là nguồn chủ sở hữu patient/facility/doctor; metadata không được ghi đè chủ sở hữu.

**Mới — route/client**

- `src/app/dashboard/{page.tsx,loading.tsx,error.tsx}`; `src/app/benh-nhan/[patientId]/{page.tsx,loading.tsx,error.tsx,not-found.tsx}`.
- `src/app/api/clinic/dashboard/route.ts`, `appointments/[appointmentId]/route.ts`, `patients/[patientId]/route.ts`, `patients/[patientId]/encounters/[encounterId]/route.ts`, `src/app/api/clinic/routes.test.ts` (gọi trực tiếp các handler với Request).
- `src/client/clinic/api.ts`: typed no-store fetch và AbortSignal.
- `src/client/clinic/ClinicDialog.tsx`, `AppointmentDialog.tsx`, `AppointmentRow.tsx`, `AppointmentActions.tsx`.
- `src/client/dashboard/{DashboardScreen,EncounterGroup,AppointmentList,DayCalendar,StatusLegend}.tsx`.
- `src/client/patient/{PatientScreen,InsuranceSummary,EncounterHistory,EncounterHistoryDialog,HistoricalEncounterView,AppointmentPicker}.tsx`.
- `src/client/patient/history-controller.ts`, `history-controller.test.ts`: chống response chậm; độc lập React để test node.
- `src/client/clinic/open-appointment.ts`, `open-appointment.test.ts`: resolve action chọn lịch/mở lại; client không sinh Encounter.
- `docs/testing/2026-11-14-dashboard-patient.md`: browser acceptance checklist và kết quả khi thực thi.

**Sửa khi tích hợp:** `src/client/chung/Header.tsx` thêm Dashboard và active state cho patient; `src/app/page.tsx` và `src/client/eform/EformScreen.tsx` chỉ khi cần nối context/return link còn thiếu sau dependency; `src/server/clinical/repository.ts` thêm read list scoped nếu dependency chưa cung cấp. Không sửa generated clinical types hoặc BanIn để dựng popup.

### DTO dùng chung

Định nghĩa trong `src/shared/clinic/types.ts` (import `Encounter` và `EformSnapshot` bằng type, không kéo module server vào client):

```ts
type ClinicDate = string; // YYYY-MM-DD, schema kiểm ngày lịch thực
type DisplayStatus = 'scheduled' | 'in_progress' | 'waiting_results' |
  'completed' | 'cancelled' | 'admitted' | 'emergency_transfer' |
  'facility_transfer' | 'unknown';
type InsuranceKind = 'bhyt' | 'bao_lanh';
interface InsuranceInfo {
  known: boolean; enrolled: boolean | null; provider: string | null;
  plan: string | null; member_code: string | null;
  valid_from: ClinicDate | null; valid_to: ClinicDate | null;
}
interface PatientProfile {
  id: string; facility_id: string; full_name: string;
  date_of_birth: ClinicDate | null; gender: string | null;
  insurance: Record<InsuranceKind, InsuranceInfo>;
}
interface Appointment {
  id: string; facility_id: string; patient_id: string; doctor_id: string;
  starts_at: string; ends_at: string | null; content: string;
  scheduling_status: 'scheduled' | 'cancelled';
}
interface AppointmentItem {
  appointment: Appointment; patient: PatientProfile; doctor_name: string;
  encounter_id: string | null; status: DisplayStatus;
  has_prior_encounter: boolean;
}
interface DashboardTotals {
  total: number; completed: number; remaining: number; unfinished: number;
  cancelled: number; other: number; unknown: number;
}
interface DashboardData {
  date: ClinicDate; timezone: 'Asia/Ho_Chi_Minh';
  doctor: { id: string; name: string }; facility: { id: string; name: string };
  appointments: AppointmentItem[]; carriedOpenItems: AppointmentItem[];
  totals: DashboardTotals; fetchedAt: string;
}
interface HistorySummary {
  id: string; appointment_id: string | null; encounter_at: string;
  summary: string; doctor_name: string; status: DisplayStatus;
}
interface PatientPageData {
  patient: PatientProfile; eligibleAppointments: AppointmentItem[];
  history: HistorySummary[]; selectedAppointmentId: string | null;
}
interface HistoricalEncounterDetail {
  record: Encounter; snapshot: EformSnapshot;
  patient: PatientProfile; identity_source: 'current_profile' | 'encounter_snapshot';
  doctor_name: string; facility_name: string;
}
```

Appointment.id là mã lượt khám ngoài hệ thống, ánh xạ Encounter.appointment_id; không thêm mã phiên ghi âm vào lịch. Display status unknown chấp nhận dữ liệu đã tồn tại không hiểu được, nhưng schema fixture mới từ chối status lạ. HistoricalEncounterDetail.record được loại AI runs/nguồn transcript khỏi DTO gửi client bằng view model ở Task 5; record đầy đủ chỉ dùng trong server projection, không serialize nguyên aggregate. Task 5 chốt wire DTO rõ bên dưới.

### Task 1: Contracts và phép tính lịch khám

**Files:** Create `src/shared/clinic/{types,schema,schedule}.ts`, `schedule.test.ts`, fixtures `data/clinic/{patients,appointments}.json`; bổ sung context fixture dependency với đúng khóa tham chiếu nếu đã tồn tại.

**Interfaces:** `toClinicDate(iso: string): ClinicDate`; `clinicPeriod(iso: string): 'morning' | 'afternoon'`; `displayStatus(scheduling: Appointment['scheduling_status'], encounterStatus: string | null): DisplayStatus`; `summarizeAppointments(items: AppointmentItem[]): DashboardTotals`; `sortAppointments(items: AppointmentItem[]): AppointmentItem[]`; `ageAt(dob: ClinicDate | null, date: ClinicDate): string`; `selectDayAppointments(items: AppointmentItem[], date: ClinicDate): { appointments: AppointmentItem[]; carriedOpenItems: AppointmentItem[] }`. Hàm thuần, không I/O, không mutate input; truyền thời gian cụ thể, không gọi Date.now ẩn trong tests.

- [ ] Viết test `counts_fixture_and_subset`: bộ 8 lịch ở spec → deepEqual totals `{ total:8, completed:2, remaining:4, unfinished:2, cancelled:1, other:1, unknown:0 }`; unfinished ID chính xác nằm trong remaining. Thêm `counts_empty_unknown_and_all_terminal`: rỗng 0/0, unknown có đếm, chuyển viện không thành completed.
- [ ] Viết `local_day_noon_and_carryover`: `2026-11-13T17:00:00Z` thuộc 14/11; `04:59:59Z` sáng, `05:00:00Z` chiều; ca chờ 13/11 nằm carriedOpenItems, không trong N ngày 14; future không vào carryover. `conflicting_cancelled_active_is_unknown`: cancelled + dang_kham → unknown; cancelled không Encounter → cancelled; khong_kham → cancelled với nhãn Không khám trong UI.
- [ ] Viết `stable_order_and_age`: trùng giờ sắp ID; giữ `000123`; DOB 2000-11-15, hẹn 2026-11-14 → 25 tuổi; DOB 2026-09-14 → 2 tháng; null → Chưa có thông tin; ngày sinh tương lai không tạo tuổi âm. Invalid `2026-02-30`/timestamp thiếu offset bị schema từ chối.
- [ ] Chạy `npx tsx --conditions=react-server --test src/shared/clinic/schedule.test.ts`, xác nhận fail do module/hành vi chưa có.
- [ ] Implement signatures, mapping và palette chính xác theo spec; fixtures ít nhất hai bác sĩ, hai cơ sở, bệnh nhân mới/cũ, cả hai bảo hiểm, 8 ca chuẩn, ca hôm qua, trùng giờ, thiếu DOB. Lịch demo sinh ngày theo clock inject/offset fixture để mở ngày hiện tại vẫn có dữ liệu; tests dùng ngày cố định, không sửa ngày phiếu cũ.
- [ ] Chạy lại test, expected PASS; xem fixture không chứa bệnh nhân thật. Impact/detect_changes rồi commit riêng task khi đạt.

### Task 2: Repository, policy đọc và API

**Files:** Create `src/server/clinic/{repository,service,appointment-context}.ts`, ba test đồng vị trí, bốn route API và `src/app/api/clinic/routes.test.ts`, `src/client/clinic/api.ts`; Modify clinical repository nếu thiếu method scoped read-only.

**Interfaces:** `loadDashboard(actor: ClinicalActor, date: ClinicDate): DashboardData`; `loadAppointment(actor: ClinicalActor, appointmentId: string): AppointmentItem`; `loadPatientPage(actor: ClinicalActor, patientId: string, selectedAppointmentId?: string): PatientPageData`; `loadHistoricalEncounter(actor: ClinicalActor, patientId: string, encounterId: string): HistoricalEncounterDetail` (server-only). Actor import từ dependency; adapter lấy actor server, không lấy patient/facility từ client làm quyền. Repository `listByFacility(facilityId: string): Encounter[]` nếu chưa có; mọi kết quả vẫn qua policy trước DTO. `getDashboard(date, signal?)`, `getAppointment(id, signal?)`, `getPatient(id, appointmentId?, signal?)`, `getHistoricalEncounter(patientId, encounterId, signal?)` trong client api, Promise DTO tương ứng; hàm cuối trả wire DTO Task 5, không aggregate.

`resolveClinicAppointment(actor: ClinicalActor, appointmentId: string, now: string): { context: EncounterContext; item: AppointmentItem; eligibility: { canOpen: boolean; reason: 'eligible' | 'cancelled' | 'future' | 'terminal' | 'unknown' } }` ở appointment-context.ts. Quyền sở hữu sai trả lỗi 404; context identity từ dependency là chuẩn, metadata sai bị từ chối. Dùng cùng lookup cho eligibleAppointments và action open ở Task 6. Dependency resolveEncounterContext không import lookup ngược lại: lookup gọi raw resolver, action open gọi lookup rồi openEncounter(context) dưới cơ chế khóa của dependency; tái kiểm eligibility/terminal bên trong khóa trước khi tạo/reuse để tránh race với chuyển trạng thái. Không tạo vòng import clinical service ↔ clinic service.

- [ ] Viết `scoped_dashboard_and_history`: actor A chỉ thấy lịch A/cơ sở A; xem history bệnh nhân cùng cơ sở có cả phiếu bác sĩ B theo policy đọc; cơ sở khác/PID giả không trả dữ liệu; editor vẫn từ chối sửa ca không được phân công. `metadata_cannot_change_context_owner`: metadata patient/doctor/facility sai context bị từ chối, không join nhầm.
- [ ] Viết `reading_never_creates_encounter`: load dashboard/detail/patient/history không gọi create/update và không đổi revision/file; đọc legacy giữ migrator của dependency. `history_is_saved_encounters`: tiền sử/dị ứng không tạo lượt history; loại selected appointment; có lượt trước mới bật has_prior_encounter, phiếu hiện tại không tự coi là lần khám trước.
- [ ] Test handler bằng Request: date sai 400; scope/id không tồn tại 404; remote/cross-origin 403; lỗi store trả lỗi khác 2xx, không totals rỗng giả. GET có no-store và không trả AI artifacts/transcript; local guard áp dụng cả server page entry khi load trực tiếp, không chỉ API. Dùng headers/host policy thống nhất prototype, không suy ra auth HIS.
- [ ] Test `lookup_eligibility_and_identity`: scheduled hôm nay được mở; cancelled/future/terminal/unknown không được mở; ca chờ hôm trước được tiếp tục; tên/PID/doctor/facility không khớp giữa context/profile/metadata bị từ chối; cùng lookup dùng cho list và open adapter, không hai bảng quyền độc lập.
- [ ] Run `npx tsx --conditions=react-server --test src/server/clinic/repository.test.ts src/server/clinic/service.test.ts src/server/clinic/appointment-context.test.ts src/app/api/clinic/routes.test.ts`, expected FAIL trước implement.
- [ ] Implement join và services; `selectedAppointmentId` phải thuộc patient/actor/cơ sở, sai trả 404; current profile/insurance lấy từ patients; thời gian hẹn lấy metadata; trạng thái tiến độ lấy Encounter. Kết thúc Task 2 API history tạm server-only; chỉ expose wire đã project ở Task 5, không release endpoint dump aggregate.
- [ ] Run lại tests, PASS; impact/detect_changes và commit riêng task. Nếu dependency actor chưa có, chỉ dùng test adapter rõ tên demo, chưa nối public create/edit.

### Task 3: Dashboard với list và calendar ngày

**Files:** Create `src/app/dashboard/{page.tsx,loading.tsx,error.tsx}`, `src/client/dashboard/{DashboardScreen,EncounterGroup,AppointmentList,DayCalendar,StatusLegend}.tsx`, `src/client/clinic/AppointmentRow.tsx`; Modify `src/client/chung/Header.tsx`; Create `docs/testing/2026-11-14-dashboard-patient.md`.

**Interfaces:** `DashboardScreen({ initialData: DashboardData, initialView: 'list' | 'calendar' })`; `AppointmentRow({ item: AppointmentItem, onOpen: (id: string) => void })`; `EncounterGroup({ title: string, items: AppointmentItem[], total: number, onOpen })`; `AppointmentList({ items, onOpen })`; `DayCalendar({ items, date, onOpen })`; `StatusLegend()`; onOpen đi vào AppointmentDialog của Task 4. Tất cả props callbacks/arrays dùng type đã khai báo, không nhân bản status logic.

- [ ] Thêm checklist browser với fixture 8 ca: số đúng, ba list hiển thị sẵn tối đa 5 và expand không đổi count; dòng hủy/kết thúc khác/unknown mở danh sách; empty nhóm có thông báo; nhãn unfinished là tập con. Đặt bước kiểm tra trước khi xây UI để có tiêu chí fail rõ.
- [ ] Implement page await searchParams `date`/`view`; mặc định hôm nay/list; dashboard title/bác sĩ/cơ sở, nút ngày trước/sau/Hôm nay, Làm mới; state date/view lưu URL để quay lại giữ vị trí. refresh response cũ của ngày A không ghi đè ngày B.
- [ ] Implement ba nhóm số liệu và khối carryover; tất cả dùng cùng DashboardData. Thêm Header link; patient active Dashboard, không bịa link tới patient ID cố định. Không biến `/` thành dashboard.
- [ ] Implement list Sáng/Chiều đúng spec, calendar trục ngày, block mặc định 30 phút khi ends_at null với chú thích thời lượng hiển thị; mọi lịch trùng giờ hiện/mở được, trục bao phủ ca ngoài 07–18h; chú thích đủ màu/nhãn, marker Bây giờ chỉ hôm nay.
- [ ] Dùng browser kiểm trước/sau với fixture ở 1440/1024/390px; keyboard Enter mở row placeholder/Task 4 dialog; contrast badge đủ đọc, không tràn ngang trang. Ghi ảnh/kết quả và lỗi thực vào checklist; không tuyên bố PASS khi chưa chạy. Run `npx tsc --noEmit`, expected 0 error mới; impact/detect_changes rồi commit file task.

### Task 4: Popup lịch hẹn và đường vào bệnh nhân

**Files:** Create `src/client/clinic/{ClinicDialog,AppointmentDialog,AppointmentActions}.tsx`; Modify `DashboardScreen.tsx` gắn dialog; Test bổ sung `src/shared/clinic/schedule.test.ts`, `src/server/clinic/service.test.ts` và checklist browser.

**Interfaces:** `ClinicDialog({ open: boolean, title: string, onClose: () => void, children: ReactNode })`; `AppointmentDialog({ appointmentId: string | null, returnTo: string, onClose: () => void })`; `AppointmentActions({ item: AppointmentItem, returnTo: string })`. returnTo chỉ cho đường nội bộ hợp lệ từ app, không nhận external redirect.

- [ ] Bổ sung assertions: detail đủ trường, PID/mã `000123` còn nguyên, tuổi birthday boundary theo Task 1; has_prior_encounter false khi chỉ có phiếu selected, true khi tồn tại phiếu trước khác; không mất bệnh nhân mới khi không có lịch sử.
- [ ] Run tests schedule/service, xác nhận case mới fail trước implement; implement detail fetch no-store có abort/loading/error/retry, dùng cùng dialog từ mọi row và calendar.
- [ ] Dựng field layout đúng spec; link “Xem thông tin bệnh nhân” cho bệnh nhân cũ, “Thông tin bệnh nhân” + chưa có lịch sử cho mới; link `/benh-nhan/<encoded PID>?appointment_id=<encoded ID>&return_to=<internal dashboard URL>`. Không dùng tên làm định danh.
- [ ] Implement ClinicDialog bằng native dialog hoặc focus management React phù hợp: focus trap, Escape, đóng/khôi phục focus, khóa scroll nền, aria-modal, cuộn nội dung, click nền chỉ đóng khi target thực là backdrop. Không dùng dependency mới.
- [ ] Browser kiểm popup từ từng nhóm/calendar, dữ liệu dài/thiếu DOB, slow fetch A→B, keyboard và màn hẹp. Khi dependency open chưa xong nút create/continue disabled, không điều hướng ca mẫu. Chạy lại tests/typecheck; impact/detect_changes và commit riêng.

### Task 5: Hồ sơ bệnh nhân và xem toàn bộ phiếu cũ

**Files:** Create patient page/loading/error/not-found, `src/client/patient/{PatientScreen,InsuranceSummary,EncounterHistory,EncounterHistoryDialog,HistoricalEncounterView}.tsx`, `history-controller.ts`, `history-controller.test.ts`, `src/shared/clinic/{history.ts,history.test.ts}`; Modify shared types, server service/history endpoint và test.

**Interfaces:** `sortHistory(items: HistorySummary[]): HistorySummary[]`; `historyNavigation(ids: string[], selectedId: string): { index: number; previousId: string | null; nextId: string | null }`; `projectHistoricalEncounter(detail: HistoricalEncounterDetail): HistoricalEncounterViewModel`; `HistoricalEncounterView({ value: HistoricalEncounterViewModel })`; `EncounterHistoryDialog({ patientId: string, items: HistorySummary[], selectedId: string | null, onClose: () => void })`.

`HistoricalEncounterViewModel` (wire DTO) trong shared types: `{ id, appointment_id, revision, encounter_at, status, patient, identity_source, doctor_name, facility_name, sections: Array<{ id: string; title: string; rows: Array<{ label: string; value: string }> }>, approval: { state: 'draft' | 'approved' | 'changed'; label: string }, missingSections: string[] }`. Dùng strings/nullability từ spec, `sections` chứa mọi trường clinical có ý nghĩa lâm sàng đã lưu, không contains `record`/ai_runs/nguon transcript. Project server-side trước endpoint; không gửi HistoricalEncounterDetail thô.

`createHistoryLoader(fetchDetail: (patientId: string, encounterId: string, signal: AbortSignal) => Promise<HistoricalEncounterViewModel>): { load(patientId: string, encounterId: string): Promise<{ id: string; value: HistoricalEncounterViewModel } | null>; dispose(): void }`; stale/aborted result trả null, lỗi hiện tại throw. Dialog chỉ render value khi value.id bằng selectedId.

- [ ] Test `descending_and_bounded_navigation`: IDs mới→cũ; previous mới hơn/next cũ hơn; n=1 null cả hai; đầu/cuối khóa đúng; n=0 không mở dialog; tie-break ID giảm dần. `historical_projection_complete`: fixture đủ clinical fields → từng mục phiếu/chẩn đoán/kết quả/chỉ định/duyệt/sinh hiệu có giá trị nguồn; mã không còn trong catalog vẫn giữ display cũ; draft hiển thị Bản nháp.
- [ ] Test `no_fabricated_medications_or_identity`: không lấy kho thói quen; không có dữ liệu ghi rõ thiếu; profile hiện tại có provenance current_profile, không gắn là snapshot; không có AI runs/transcript trong wire DTO. Approval versions dùng adapter dependency để xác định changed/approved, không suy từ duy nhất audit nếu dependency đã đổi semantics.
- [ ] Test deferred promises trong history-controller: A chậm, B nhanh → chỉ B được áp dụng; A lỗi sau B không hiện lỗi ở B; dispose không cập nhật; lỗi B có retry B. API test kiểm nested encounter của patient khác bị 404 dù biết UUID.
- [ ] Run `npx tsx --conditions=react-server --test src/shared/clinic/history.test.ts src/client/patient/history-controller.test.ts src/server/clinic/service.test.ts src/app/api/clinic/routes.test.ts`, xác nhận FAIL trước implement; implement helpers/projection/loader theo signatures rồi run đến PASS.
- [ ] Dựng patient header, hai khối bảo hiểm known/enrolled/expiry độc lập, nút create placeholder, history row summary/date/doctor/status giảm dần. Null insurance không ghi Không tham gia. Rỗng không có popup; dữ liệu lỗi không giả không có history.
- [ ] Dựng popup đầy đủ sections, i/n, Trước/Sau khóa đúng, reset scroll sau chọn; không mount EformScreen/EformContext/BanIn. Chụp danh sách ID lúc mở, close/reopen cập nhật. Browser Network kiểm chỉ GET khi đọc/chuyển lịch sử, không mic/AI/save/approve; full content và keyboard/mobile đạt checklist.
- [ ] Run tests/typecheck; impact/detect_changes và commit riêng task.

### Task 6: Tạo/tiếp tục đúng phiếu eform

**Files:** Create `src/client/patient/AppointmentPicker.tsx`, `src/client/clinic/open-appointment.ts`, `open-appointment.test.ts`; Modify `AppointmentActions.tsx`, `PatientScreen.tsx`, client API adapter, `src/app/api/clinical/encounters/route.ts`, `src/server/clinical/service.ts` để nối lookup Task 2 vào action open; `src/app/page.tsx`, `EformScreen.tsx` chỉ cho phần còn thiếu sau dependency; bổ sung service/route tests và checklist.

**Gate:** Dependency context/open-or-reuse và guard chuyển/rời eform đã chạy đạt. Đọc lại diff của dependency, dùng API/actor thật của prototype, không copy/ghi đè implementation. `loadEformData` CRITICAL: nếu phải sửa thì impact lại và kiểm các caller đã nêu; ưu tiên adapter context có sẵn.

**Interfaces:** `chooseAppointment(items: AppointmentItem[], selectedAppointmentId?: string): { action: 'disabled' | 'open' | 'pick'; appointmentId: string | null }`; eligible items do server lọc theo actor/ngày/status, không tin array client để authorize. Client `openAppointment(appointmentId: string): Promise<{ encounterId: string }>` adapter POST `/api/clinical/encounters` action `open` body `{ action:'open', appointment_id }`, ánh xạ response dependency thành ID; tuyệt đối không tự sinh patient/facility/UUID. `AppointmentPicker({ items: AppointmentItem[], onSelect: (id: string) => void, onClose: () => void })`.

- [ ] Viết `zero_one_many_and_selected`: 0 disabled, 1 open, nhiều pick; selected hợp lệ chọn đúng; selected người khác không fallback mở ca khác; completed/cancelled/future bị loại server, ca đang khám hôm trước cho tiếp tục.
- [ ] Integration test `open_reuses_and_preserves_owner`: double POST cùng mã, concurrent hai tab → cùng UUID; mã `000123` giữ nguyên; giả patient/actor không được đổi chủ; read/save/resume đúng người và revision. Dùng suite dependency cho khóa, không reimplement khóa.
- [ ] Integration test `direct_open_rechecks_eligibility`: gọi POST trực tiếp hoặc từ UI stale với lịch vừa hủy, tương lai, ca vừa hoàn thành, unknown → từ chối mở mới; lịch vừa chuyển terminal trước khi lấy khóa phải bị chặn sau khi lấy khóa. Đúng context lookup Task 2, không chỉ tin eligibleAppointments từng trả về trình duyệt.
- [ ] Run `npx tsx --conditions=react-server --test src/client/clinic/open-appointment.test.ts src/server/clinic/service.test.ts` và tests context/service/repository của dependency; case mới FAIL trước code.
- [ ] Implement create/continue action, disable khi pending request, dialog chọn lịch nếu nhiều; error/retry không sinh ID mới. Thành công mở `/?ho_so=<UUID>` theo context server, tên/PID/header/sinh hiệu/phiếu khớp một bệnh nhân ngay frame đầu, reload giữ đúng ca. Phiếu hoàn thành mở viewer chỉ đọc, không tạo lại.
- [ ] Nối return link eform về dashboard/patient qua guard dependency. Browser A đang ghi/chưa lưu → click Dashboard/back/change patient: dừng/flush/lưu hoặc lựa chọn bỏ rõ ràng, lỗi chặn chuyển đúng spec nhiều phiên. Không chỉ dựa vào beforeunload cho điều hướng nội bộ.
- [ ] Test browser: tạo từ bệnh nhân mới, tiếp tục ca chờ, nhiều lịch cùng PID, no eligible; hoàn tất ca rồi quay dashboard thấy count mới qua refresh/focus. Run tests/typecheck; impact/detect_changes và commit riêng task.

### Task 7: Kiểm chứng tích hợp và bàn giao

**Files:** Update `docs/testing/2026-11-14-dashboard-patient.md`, pending README/status và tài liệu liên kết khi thực sự hoàn thành; sửa file sản phẩm chỉ khi phát hiện lỗi, impact trước sửa.

**Consumes:** toàn bộ DTO/UI/actions Task 1–6 và dependency đã nghiệm thu. **Produces:** bằng chứng từng điều kiện nghiệm thu spec, danh sách giới hạn còn thực tế, không checkbox PASS suy đoán.

- [ ] Run `npm test`, `npm run clinical:check`, `npm run lint`, `npm run build`. Expected exit 0; nếu baseline có lỗi có sẵn thì ghi lệnh/output và phân biệt bằng baseline, không gọi toàn suite PASS khi chưa đạt. Không tự sửa thay đổi khác ngoài phạm vi để làm sạch working tree.
- [ ] Browser thực hiện đủ 8 mục nghiệm thu spec ở 1440/1024/390px, cả hai view; ghi counts/row IDs, ảnh popup, keyboard/focus, bảo hiểm, status legend, trùng giờ, ca qua ngày, n=0/1/nhiều history, stale fetch/lỗi/retry và create concurrency.
- [ ] Kiểm đầy đủ trường phiếu cũ so với dữ liệu nguồn bằng fixture giàu dữ liệu; Network không có mutation trong viewer; qua refresh dữ liệu cùng snapshot, không lóe ca mẫu/ghi đè A/B. Kiểm màu/font/cỡ chữ cạnh eform hiện tại trong cùng browser.
- [ ] Chạy GitNexus detect_changes scope all, xử lý partial/truncated bằng rerun/phân tích đầy đủ; xem diff task với source và caller CRITICAL. Vì working tree có nhiều thay đổi ban đầu, báo riêng ảnh hưởng thuộc feature, không quy tất cả thay đổi cho task này.
- [ ] Chỉ sau bằng chứng đạt mới cập nhật trạng thái, chuyển cặp design/plan khỏi pending theo README và sửa link tương ứng; commit file của feature sau graph check. Không tự triển khai/publish/merge trong plan này.

## Tự rà soát plan

- Dashboard/counts/carryover/calendar/list và chú thích: Task 1–4; popup đủ lịch hẹn và link bệnh nhân: Task 4.
- Nhân khẩu/bảo hiểm và lịch sử giảm dần: Task 2, 5; toàn phiếu/next/previous/một item: Task 5; create/continue: Task 6.
- Theme/font/responsive/a11y/loading/error: Task 3–5 và browser nghiệm thu Task 7.
- Năm Review Focus đều có case cụ thể; không tests hình thức chỉ kiểm component tồn tại. UI xác minh bằng browser thay vì thêm test framework chỉ cho layout.
- Phụ thuộc nhiều phiên giữ riêng; chưa có dependency thì không tuyên bố end-to-end hoàn tất. Plan không thực thi code, không cài package hoặc thay schema clinical trong giai đoạn lập tài liệu.
