# Nghiệm thu trình duyệt: Dashboard lịch khám và popup lịch hẹn

Chạy `npx next dev -p 3101`, mở `http://localhost:3101/dashboard` bằng Playwright (Chromium). Dữ liệu giả trong `data/clinic/`, ngày thử là 14/11/2026 (ngày chạy). Ảnh chụp lưu ngoài repo. Chỉ ghi PASS khi đã chạy thật.

Phạm vi file này: Task 3 (dashboard) và Task 4 (popup lịch hẹn) của plan Dashboard và Bệnh nhân, ứng với nghiệm thu 1, 2, 3, 8 của thiết kế. Phần màn bệnh nhân (nghiệm thu 4 đến 7 của thiết kế, Task 5) nằm ở mục "Màn bệnh nhân" bên dưới.

## Task 3: Dashboard

| # | Kiểm tra | Kết quả |
| --- | --- | --- |
| 3.1 | Bộ 8 ca: tổng 8, Hoàn thành 2/8, Còn lại 4/8, Đang khám / chờ kết quả 2/8, Ca hủy 1, Kết thúc khác 1, Chưa xác định 0 | PASS (đọc từ trang thật) |
| 3.2 | Mỗi khối có list thật: đúng 2 / 4 / 2 dòng, mỗi dòng đúng mã LK-00000x và PID giữ số 0 đầu (000123...) | PASS |
| 3.3 | Nhãn "Đang khám / chờ kết quả" ghi rõ "Nằm trong số Còn lại, không cộng thêm"; ca 10:00 và 13:30 xuất hiện ở cả Còn lại và khối này | PASS |
| 3.4 | Khối cao cố định, nhiều ca thì cuộn trong khung (thay cho "Xem tất cả", đổi 16/11/2026) | Chưa kiểm với hơn 10 ca |
| 3.5 | Khối rỗng có thông báo riêng (ngày 13/11: "Chưa có ca nào hoàn thành.", khối ca ngày trước "Không có ca nào còn dở từ ngày trước.") | PASS |
| 3.6 | Dòng "Ca hủy: 1 · Kết thúc khác: 1 · Chưa xác định: 0" mở danh sách khi bấm; mục 0 bị tắt | PASS: bấm "Kết thúc khác" mở danh sách có ca nhập viện LK-000008 (aria-expanded=true) |
| 3.7 | Khối "Chưa hoàn tất từ ngày trước" hiện ca LK-000009 (13/11 16:00) khi xem 14/11, không tính vào N | PASS |
| 3.8 | Xem 13/11: N=1; ca LK-000009 nằm trong Còn lại và Đang khám / chờ kết quả, khối ngày trước rỗng | PASS |
| 3.9 | Danh sách chia Buổi sáng (5 lịch: 08:00, 08:30, 09:00, 09:00, 10:00) và Buổi chiều (3 lịch: 13:30, 14:00, 15:00); trùng giờ 09:00 sắp theo mã | PASS |
| 3.10 | Đúng mốc 12:00 | Chỉ có test đơn vị (`layout.test.ts`, `schedule.test.ts`); fixture không có ca 11:59/12:00 |
| 3.11 | Calendar: trục 07:00 đến 18:00, 8 khối, hai lịch 09:00 xếp cạnh nhau, ghi chú 30 phút (viền dưới nét đứt) và ghi chú trùng giờ | PASS |
| 3.12 | Nhãn "Bây giờ" hiện khi xem hôm nay (14:58 lúc chụp) | PASS; bị ẩn khi xem 15/11 (calendar, không có "Bây giờ") |
| 3.13 | Chú giải trạng thái đủ 9 mục, mỗi mục có nhãn chữ, luôn nằm trên cả list và calendar | PASS (ảnh `cal-1440.png`) |
| 3.14 | Không tràn ngang: 1440 (scrollWidth 1425 so với 1440 viewport), 1024 (1009 so với 1024), 390 (375 so với 390), cả list và calendar ở 390 | PASS (chênh lệch là thanh cuộn) |
| 3.15 | Nút Ngày trước / Hôm nay / Ngày sau / chọn ngày / Làm mới | PASS: Ngày sau chuyển 14 sang 15/11 (N=1, giữ view=calendar), Hôm nay quay về 14/11; nạp trực tiếp ?date=2026-11-13 đúng. Ngày trước và Làm mới đã thử, xem mục "Dashboard: đối chiếu bổ sung"; ô chọn ngày chưa thử |
| 3.16 | Đổi Danh sách / Lịch theo giờ cập nhật URL (`view=`) | PASS: bấm "Lịch theo giờ" đổi URL thành ?date=2026-11-14&view=calendar |
| 3.17 | Response làm mới của ngày A không ghi đè ngày B | Chưa kiểm trong trình duyệt. Cơ chế: mỗi ngày là một thể hiện (`key`), request bị hủy khi rời ngày và có số thứ tự |
| 3.18 | Lỗi và đang tải (`error.tsx`, `loading.tsx`) | Chưa kiểm |

## Task 4: Popup lịch hẹn

Ảnh lưu ngoài repo (thư mục scratchpad của phiên): `cal-1440.png`, `list-390.png`, `dialog-390.png`.

| # | Kiểm tra | Kết quả |
| --- | --- | --- |
| 4.1 | Click dòng (list) mở popup; Enter trên dòng đang focus cũng mở | PASS |
| 4.2 | Popup đủ trường: mã lịch/lượt, UUID hồ sơ (nếu có), PID giữ 000123, họ tên, tuổi, ngày sinh, giờ hẹn kèm giờ kết thúc, bác sĩ, trạng thái, nội dung đầy đủ | PASS (LK-000001, LK-000004, LK-000007) |
| 4.3 | Tuổi theo ngày hẹn: sinh 15/11/2000, hẹn 14/11/2026 là 25 tuổi (chưa qua sinh nhật); thiếu ngày sinh ghi "Chưa có thông tin" | PASS |
| 4.4 | Mở từ calendar, kể cả khối lịch trùng giờ LK-000004 | PASS (390px). Mở từ khối ca ngày trước, Ca hủy/Kết thúc khác, Còn lại, Đang khám: chưa mở riêng, chỉ mở từ danh sách Sáng/Chiều |
| 4.5 | Tab 3 lần vẫn ở trong popup | PASS |
| 4.6 | Escape đóng, trả focus về đúng dòng đã mở, mở khóa cuộn nền (`body.style.overflow` là `hidden` khi mở, rỗng khi đóng) | PASS |
| 4.7 | Click vùng nội dung không đóng; click nền (click có target là chính `<dialog>`) đóng | PASS nhưng bằng sự kiện tổng hợp, chưa nhấp chuột thật vào ::backdrop |
| 4.8 | Lỗi tải (giả lập 500 một lần) hiện lỗi và nút Thử lại; Thử lại tải được | PASS |
| 4.9 | Link "Xem thông tin bệnh nhân" khi có lượt trước; "Thông tin bệnh nhân" kèm "Chưa có lịch sử khám" khi chưa có | PASS: LK-000001 và LK-000004 thuộc nhóm đầu; LK-000007 (PID 000125) hiện nhánh thứ hai |
| 4.10 | Link `/benh-nhan/000123?appointment_id=LK-000001&return_to=%2Fdashboard%3Fdate%3D2026-11-14%26view%3Dlist` | PASS: đã bấm và tới đúng trang (xem D.1 bên dưới) |
| 4.11 | Nút Tạo/Mở phiếu khám tắt kèm "Chờ nền ca khám nhiều phiên (ưu tiên 1)"; ca hủy không có nút | PASS |
| 4.12 | Popup 390px gần toàn màn hình, đọc được | PASS (ảnh `dialog-390.png`) |
| 4.13 | Nội dung rất dài; slow fetch A rồi B | Chưa kiểm. Popup là modal nên không mở B khi A còn mở; chống kết quả muộn bằng khóa `id#lần thử` và AbortController, chưa thử có độ trễ |
| 4.14 | Click nền bằng chuột thật, Shift+Tab, Tab quay vòng qua phần tử cuối | Chưa kiểm |

## Màn bệnh nhân (kiểm ngày 2026-11-14, Task 5 phần đã làm)

Chạy trên `http://localhost:3101` bằng Playwright (Chromium), dữ liệu giả trong `data/clinic/`. Kết quả đọc từ accessibility snapshot và `innerText` của trang thật. Không có ảnh chụp lưu trong repo; snapshot tạm đã xóa sau khi ghi kết quả.

| # | Kiểm tra | Kết quả |
| --- | --- | --- |
| 5.1 | `/benh-nhan/000123?appointment_id=LK-000001&return_to=%2Fdashboard%3Fdate%3D2026-11-14%26view%3Dlist`: BHYT "Có tham gia" (BHYT Mẫu · Mức 80%, mã MAU-0001, hiệu lực 01/01/2026 – 31/12/2026); bảo lãnh "Không tham gia"; tuổi 25 khi sinh 15/11/2000 và đối chiếu 14/11/2026 | PASS |
| 5.1b | Link "← Về dashboard" giữ ngày/view (`/dashboard?date=2026-11-14&view=list`); đã bấm, quay về đúng ngày và view | PASS |
| 5.1c | Nút "Tạo phiếu khám" tắt, có chú thích "Chờ nền ca khám nhiều phiên (ưu tiên 1)" | PASS |
| 5.1d | Lịch sử giảm dần: 14/11/2026 10:00, 20/10/2026 09:00, 05/09/2026 14:30; nút "Xem phiếu" tắt | PASS |
| 5.2 | `/benh-nhan/000124`: BHYT "Không tham gia"; bảo lãnh "Hết hạn" (hiệu lực 01/06/2026 – 31/10/2026, trước 14/11/2026); tuổi "2 tháng" (sinh 14/09/2026) | PASS |
| 5.3 | `/benh-nhan/000125`: ngày sinh, tuổi, giới tính đều "Chưa có thông tin"; BHYT và bảo lãnh cũng "Chưa có thông tin" | PASS |
| 5.4 | `/benh-nhan/999999` và `/benh-nhan/000123?appointment_id=XXX`: đều hiện "Không tìm thấy bệnh nhân" và link về dashboard, không có dữ liệu giả | PASS |
| 5.5 | `/benh-nhan/000123?return_to=https://evil.example`: link "← Về dashboard" có href `/dashboard` | PASS |
| 5.6 | Không tràn ngang trên `/benh-nhan/000123`: 1440px (scrollWidth 1440 = clientWidth), 1024px (1024 = 1024), 390px (375 = 375). Chỉ kiểm trang bệnh nhân, không kiểm lại dashboard ở 390px trong lượt này | PASS |
| 5.6b | Lịch sử rỗng (`/benh-nhan/000125`) hiện "Chưa có lịch sử khám" | PASS |
| 5.7 | Network trên `/benh-nhan/000123`: chỉ GET (trang, `_next` asset, font). Không POST, không gọi `/api/*`, không gọi mic hay AI | PASS |

Chú ý: Playwright không tạo lượt tải dữ liệu từ API cho trang bệnh nhân, vì trang gọi thẳng service ở server (RSC), nên không có request `/api/clinic/patients/*` nào trên trang này.

### Dashboard: đối chiếu bổ sung (mục 7 của lượt này)

| # | Kiểm tra | Kết quả |
| --- | --- | --- |
| D.1 | Dashboard `date=2026-11-14&view=list` → bấm dòng LK-000001 → popup → "Xem thông tin bệnh nhân" đi tới `/benh-nhan/000123?appointment_id=LK-000001&return_to=...`, tiêu đề "Bệnh nhân Mẫu A" | PASS |
| D.1b | Từ màn bệnh nhân bấm "Về dashboard" quay về `/dashboard?date=2026-11-14&view=list` | PASS |
| D.2 | "‹ Ngày trước": 14/11 sang 13/11, giữ `view=list`. Ngày 13/11: tổng 1, Còn lại 1/1 (LK-000009 16:00, PID 000126), Đang khám/chờ kết quả 1/1, khối ngày trước "0 ca" (không lặp ca) | PASS |
| D.3 | Nút "Làm mới": có request `GET /api/clinic/dashboard?date=2026-11-13` trả 200. Nhãn "Cập nhật lúc" vẫn 15:06 vì cùng phút, nên không phân biệt được thời điểm làm mới | Một phần: gọi lại được, cập nhật nhãn thời gian không kiểm được trong cùng phút |
| D.4 | Chuyển "Lịch theo giờ" đổi URL thành `view=calendar`, nút có `aria-pressed=true` | PASS |
| D.5 | Mốc 12:00 (nhóm Sáng/Chiều): giờ hẹn trong fixture là 08:00, 08:30, 09:00, 10:00, 13:30, 14:00, 15:00, 16:00 (13/11 và 14/11). Không có 11:59 hay 12:00 | Không có dữ liệu để kiểm. Đã có test đơn vị `layout.test.ts` và `schedule.test.ts` |
| D.6 | "Xem tất cả" khi khối có hơn 5 dòng: không khối nào trong các ngày đã xem (13/11, 14/11) có hơn 5 dòng | Fixture không có. Logic `items.slice(0, 5)` chưa chạy nút |
| D.7 | Ô "Chọn ngày" (textbox) | Chưa thử trong lượt này |

## Sửa theo review (2026-11-14, chạy `next dev -p 3101 -H 127.0.0.1`)
- PASS: `/dashboard?date=2026-11-14` ở 1440px và 390px, cả view danh sách và lịch theo giờ: không tràn ngang; tiêu đề trang và tiêu đề khối đều 18px.
- PASS: mở popup LK-000001, đóng, mở lại với API chậm 800ms: popup hiện "Đang tải lịch hẹn…" ngay, không hiện lại dữ liệu cũ; sau đó hiện dữ liệu.
- PASS: `curl -H "Host: evil.example"` vào `/api/clinic/dashboard` trả 403; vào `/benh-nhan/000123` nội dung là lỗi 403 đi qua error boundary (mã HTTP vẫn 200 do Next streaming), không phải notFound.
- Chưa kiểm sâu: gõ từng ký tự vào ô ngày để thấy năm trung gian (chỉ kiểm bằng test thuần `isCompleteClinicDate`; gõ lại cùng ngày không đổi URL); khối calendar ca ngắn (chỉ kiểm bằng test `layoutDay`, fixture không có ca <20 phút).
- Để lại, chờ ưu tiên 1: cờ `not_examined` (#5) và `eligibleAppointments` tạm (#10, đã ghi rõ trong code).

## Chưa kiểm (tổng hợp, tính đến 2026-11-14)

- 3.4, D.6: "Xem tất cả" trên khối lớn hơn 5 dòng (fixture không có).
- 3.10, D.5: mốc 12:00 với ca thật ở 11:59 và 12:00 (fixture không có).
- 3.17: làm mới với hai ngày chạy đua, response cũ không ghi đè (chưa có độ trễ giả lập).
- 3.18: trạng thái lỗi và đang tải của dashboard (`error.tsx`, `loading.tsx`).
- 4.13: slow fetch A rồi B trong popup (chưa có độ trễ giả lập).
- 4.14: click nền bằng chuột thật vào `::backdrop`, Shift+Tab, Tab quay vòng qua phần tử cuối.
- D.3: làm mới thấy nhãn "Cập nhật lúc" đổi (cần chờ qua phút khác hoặc đọc thời gian từ response).
- D.7: ô chọn ngày.
- 5.6 ở 390px cho trang bệnh nhân với lịch sử dài (chỉ có 3 dòng ở fixture).
- Nút Tạo phiếu khám và Xem phiếu không bấm được, đúng theo thiết kế của lượt này.

## Cập nhật 2026-11-16: dữ liệu clinical thật, xem phiếu cũ, mở phiếu

Dữ liệu trên trang nay là `data/clinic/` theo định danh clinical (PID `GIA-*`); các bảng cũ ở trên ghi theo bộ 8 ca đã chuyển sang `data/clinic-test/` (chỉ còn dùng cho test đơn vị). Chạy `next dev -p 3101`, mở bằng `localhost`.

| # | Kiểm tra | Kết quả |
| --- | --- | --- |
| E.1 | `/dashboard?date=2026-11-16`: tổng 5, Còn lại 4/5, Đang khám/chờ KQ 2/5, hủy 1; ca LK-GIA-0451 (15/11 16:00, chờ KQ) ở khối chưa hoàn tất từ ngày trước; mã lượt `000123` giữ nguyên | PASS (đọc text trang thật) |
| E.2 | Popup LK-GIA-0457 có nút "Mở phiếu khám"; bấm tạo hồ sơ và chuyển `/?ho_so=<UUID>`; eForm hiện Nguyễn Thị Giả, LK-GIA-0457 | PASS |
| E.3 | `/benh-nhan/GIA-000123?appointment_id=LK-GIA-0456`: lịch sử 3 phiếu, loại phiếu của lịch đang chọn; "Xem phiếu" mở phiếu 20/10 đủ mục (lý do, khám, chẩn đoán J30.4, chỉ định, kết luận), ghi rõ mục thiếu và "Bản nháp" | PASS |
| E.4 | Mới hơn/Cũ hơn: 2/3 sang 3/3 khóa "Cũ hơn", quay lại 2/3; chỉ request GET tới `/api/clinic/patients/.../encounters/...` | PASS |
| E.5 | `/benh-nhan/GIA-000123` không chọn lịch: "Tạo phiếu khám" mở hộp chọn 2 lịch (LK-GIA-0456, LK-GIA-0457) | PASS |
| E.6 | Mở bằng `127.0.0.1` khi chạy `next dev -H 127.0.0.1` | eForm báo "Nguồn yêu cầu không hợp lệ" (guard lớp clinical); dùng `localhost` |
| E.7 | Hai tab bấm mở cùng lúc; rời eForm khi còn micro/chưa lưu; phiếu cũ đã duyệt hiện "Đã duyệt"; ca hủy/hoàn thành không có nút mở trên UI | Chưa kiểm trong trình duyệt (server từ chối ca hủy/hoàn thành/tương lai có test `open.test.ts`) |

### Kiểm bổ sung 2026-11-16 (nghiệm thu Task 7)

| # | Kiểm tra | Kết quả |
| --- | --- | --- |
| F.1 | `npm run build` | PASS: liệt kê `/dashboard`, `/benh-nhan/[patientId]`, `/api/clinic/appointments/[appointmentId]/open`, `/api/clinic/patients/[patientId]/encounters/[encounterId]` |
| F.2 | Ba POST mở cùng lúc cho LK-GIA-0458 (bằng curl): cả ba trả cùng một `encounter_id`; thư mục `data/clinical/encounters` vẫn 4 hồ sơ, không tạo trùng | PASS (không phải hai tab thật, nhưng cùng đường tranh chấp ở server) |
| F.3 | POST mở: LK-GIA-0459 (hủy) 409, LK-GIA-0461 (ngày mai) 409, LK-GIA-0450 (hoàn thành) 409, LK-GIA-0451 (chờ KQ, chưa có ngữ cảnh khám) 409, LK-GIA-0460 (bác sĩ khác) 404, mã không tồn tại 404; không tạo hồ sơ mới | PASS |
| F.4 | Dashboard 375px (list và calendar): `scrollWidth` 375 = `innerWidth` 375 | PASS |
| F.5 | Màn bệnh nhân và popup phiếu cũ ở 375px | Chưa kiểm xong: trình duyệt trong app không hoàn tất tải trang bệnh nhân ở cỡ mobile giả lập (kẹt ở "Đang tải hồ sơ bệnh nhân…"); trang trả 200 qua curl |
| F.6 | `detect_changes` (đã làm mới chỉ mục): 37 file, 98 symbol, 59 luồng, mức "critical" do số lượng thay đổi của chính tính năng; phần lớp clinical chỉ thêm hàm `findEncounterContextIdentity`, không sửa hàm cũ | Đã xem |
| F.7 | Hai tab thật; rời eForm khi còn micro/chưa lưu; phiếu cũ đã duyệt hiện "Đã duyệt"; ca chờ từ hôm trước tiếp tục được (LK-GIA-0451 hiện không mở được vì chưa có ngữ cảnh khám mẫu) | Chưa kiểm |
