# Interrupted Encounters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document authorizes planning only; do not start implementation automatically.

**Goal:** Một mã khám chứa nhiều phiên ghi âm đứt quãng; bác sĩ chuyển bệnh nhân an toàn và duyệt bổ sung vào cùng hồ sơ.

**Architecture:** Giữ repository JSON/revision hiện có, bổ sung ngữ cảnh mã khám do server quản lý, metadata phiên và các bản duyệt bất biến trong Encounter. Liên kết cố định phiên → transcript → run → quyết định áp dụng; UI và server cùng dùng bộ đề xuất thay đổi. Ghi âm chỉ hoạt động cho một lượt trên một lease thiết bị.

**Tech Stack:** Next.js 16.4.5 App Router, React 19.3.0, TypeScript, Zod/JSON Schema, local Zipformer/DeepFilterNet, node:test qua tsx; không thêm dependency nếu chưa cần.

**Spec:** [Thiết kế đi kèm](2026-11-14-interrupted-encounters-design.md), dựa trên [brainstorming](../../2026-11-14-interrupted-encounters-brainstorming.md).

**Status:** IN PROGRESS — người dùng yêu cầu triển khai ngày 14/11/2026, có phân công nhiều agent và ưu tiên tiết kiệm token. Chỉ đánh dấu checkbox khi có bằng chứng thực hiện; baseline trước sửa: 129 tests PASS, clinical:check PASS, lint PASS. Nhật ký triển khai: `.superpowers/sdd/2026-11-14-interrupted-encounters/progress.md`.

## Global Constraints

- Một mã khám thuộc một hồ sơ chung, nhiều phiên ghi âm; khóa tra cứu `(facility_id, appointment_id)`, UUID nội bộ giữ nguyên.
- Duyệt phiếu/chỉ định không kết thúc lượt khám; kết quả đến không tự hoàn tất lượt.
- Nội dung đã duyệt được giữ lịch sử; sửa phần nào chỉ yêu cầu duyệt lại phần đó.
- Giữ nguyên luồng kết quả CLS dạng link/kết luận ngắn và xem chi tiết ở hệ thống khác.
- Giữ nguyên chính sách xử lý nội bộ, privacy review trước khi lưu transcript; không lưu audio lâu dài hoặc gửi dữ liệu bệnh án ra ngoài.
- Chỉ prototype với dữ liệu giả; không biến persona demo thành tuyên bố xác thực HIS.
- Không sửa generated types bằng tay; schema mới `1.2.0` có migrator đọc `1.1.0`.
- Trước mỗi symbol edit chạy GitNexus impact upstream, báo HIGH/CRITICAL; UNKNOWN phải xác minh thêm. Trước commit chạy detect_changes, không chấp nhận partial/truncated là sạch.
- Đọc hướng dẫn Next.js cài trong `node_modules/next/dist/docs/` trước khi viết route/page; dynamic `params` và `searchParams` là Promise. Chỉ stage file của task, không dùng `git add .` vì working tree có nhiều thay đổi sẵn.

## Review Focus

1. Callback A đến muộn sau khi mở B: cả STT/privacy/AI phải thuộc A, không chỉ chặn hiển thị ở UI — Task 4, 6, 7.
2. Duyệt ban đầu vẫn tồn tại sau khi sửa kết luận; bản in phải thể hiện đúng version — Task 3, 7.
3. Hai tab mở cùng mã hoặc start cùng thiết bị đồng thời: một hồ sơ/một lease — Task 2, 4.
4. Lỗi flush/lưu và đóng tab: không báo đã lưu, không tự bỏ phần chưa duyệt — Task 4, 6, 8.
5. Nhắc lại dịch vụ so với chỉ định lặp có chủ đích: không nhân đôi, không ngăn chỉ định hợp lệ — Task 5, 7.

## Evidence và điểm cần kiểm tra lại khi bắt đầu

Đã query GitNexus repo `speech-to-navigation` và đọc source hiện tại. Chưa xác nhận index freshness bằng resource; source là bằng chứng cho hiện trạng, graph dùng định hướng rủi ro. Recheck/reindex trước thực thi nếu lệch working tree.

Impact khảo sát: `applyAiDraft` **HIGH**, 2 caller trực tiếp, 4 process và 2 module; ảnh hưởng `applyClinical` ở EformScreen, `apply`/`saveClinical` ở service và POST encounters. `saveClinical` LOW, caller POST encounters; `EformScreen` LOW, 2 caller trực tiếp trong luồng Page. Không dùng các kết quả khảo sát này thay impact tại thời điểm thực thi.

Đọc lại các điểm nối: `src/server/clinical/{repository,service,privacy,extraction}.ts`, `src/shared/clinical/{schema,types,api,eform,apply-ai}.ts`, `src/client/eform/{EformScreen,TroLyAi,BanIn}.tsx`, `src/client/chung/{MicButton,DenoisedMic}.tsx`, `src/server/du-lieu/eform.ts`, `src/app/page.tsx`. `data/sessions` hiện là metrics lượt thử, không dùng làm kho phiên ghi âm lâm sàng.

## File Structure

Các file mới tập trung dưới `src/shared/clinical/`, `src/server/clinical/`, `src/client/eform/` và routes hiện có. Không tái cấu trúc engine STT hoặc viết lại EformScreen toàn bộ.

- Contracts/migration: `config/clinical/{common,encounter,transcript}.schema.json`, `src/shared/clinical/{types,schema,api}.ts`; mới `recording.ts`, `approvals.ts`, `changes.ts`; server `migrations.ts`.
- Context/lookup: mới `src/server/clinical/encounter-context.ts`, fixtures `data/eform/encounter-contexts.json`; sửa repository/service/eform loader.
- Session lifecycle: mới `src/server/clinical/recording-service.ts`, `src/client/eform/recording-controller.ts`.
- Approval/merge: mới `src/server/clinical/approval-service.ts`; sửa apply-ai, eform adapter, privacy/extraction.
- UI: mới `EncounterSwitcher.tsx`, `RecordingSessions.tsx`, `ClinicalChanges.tsx`; sửa EformScreen, TroLyAi, BanIn và microphone adapters.
- Routes/client: mở rộng `/api/clinical/encounters`, thêm `/api/clinical/recordings` và `/api/clinical/changes`; sửa privacy/extract/approve, client APIs và Page.
- Test mới đặt cùng module dạng `*.test.ts`; kiểm thử browser ghi kịch bản trong docs, dùng công cụ browser sẵn có, không buộc cài framework mới.

### Task 1: Contracts và migration không mất dữ liệu

**Files:** Modify các clinical schemas, `schema.ts`, `api.ts`, generated `types.ts`, `scripts/generate-clinical-types.mjs` nếu cần hỗ trợ schema mới; Create `recording.ts`, `approvals.ts`, `changes.ts`, `src/server/clinical/migrations.ts`; Test `migrations.test.ts`, `src/shared/clinical/schema.test.ts` và cập nhật fixture/check trong `docs/task-2/` nếu đang pin schema.

**Interfaces:** `RecordingSession` theo spec; `ApprovalVersion { id, scope, snapshot, digest, approved_by, approved_at }`; `ClinicalChange { id, scope, item_id, field_path, before, after, encounter_id, recording_session_id, run_id, segment_ids }`; `ClinicalChangeSet { id, encounter_id, base_revision, run_id, changes }`. `migrateEncounter(value: unknown): Encounter` trả 1.2.0; không I/O. Các type dùng JSON-safe values, không dùng `any` cho snapshot.

Content state thêm `discarded`; metadata có `content_revision`, `reviewed_content_revision` và `reviewed_digest`, không chứa raw text chưa kiểm tra.

- [ ] Viết test fail: migrate bản 1.1 có duyệt → còn ID/patient/appointment/nội dung và một legacy approval; không có nguồn ghi âm → danh sách phiên rỗng, không bịa phiên; migrate lần hai cho kết quả tương đương. Parse 1.2 từ chối session ID trùng, thời gian đảo và source tham chiếu session không thuộc hồ sơ.
- [ ] Run `npx tsx --conditions=react-server --test src/server/clinical/migrations.test.ts src/shared/clinical/schema.test.ts`; xác nhận fail đúng vì contract chưa có.
- [ ] Thêm schema 1.2, pure migrator, parser/emptyEncounter tương thích; đọc migration trước parse tại repository. Sinh types bằng `npm run clinical:types`. Không ép tất cả artifact cũ thành session mới hoặc phá khả năng đọc run 1.1.
- [ ] Chạy lại test và `npm run clinical:check`; expected PASS. Bổ sung test load run cũ nếu validator dùng chung bị đổi version.
- [ ] Chạy detect_changes đầy đủ; xem diff và commit riêng các file task sau khi kiểm đạt.

### Task 2: Mở đúng mã khám và hỗ trợ nhiều bệnh nhân demo

**Files:** Create `encounter-context.ts`, fixture `data/eform/encounter-contexts.json`, `encounter-context.test.ts`; Modify `repository.ts`, `repository.test.ts`, `service.ts`, `service.test.ts`, `src/server/du-lieu/eform.ts`.

**Interfaces:** `resolveEncounterContext(actor: ClinicalActor, appointmentId: string): EncounterContext`; `openEncounter(context: EncounterContext): Encounter`; `findByAppointment(facilityId: string, appointmentId: string): Encounter | null`; `listOpenEncounters(actor: ClinicalActor): EncounterSummary[]`. `EncounterSummary` gồm id, appointment_id, patient_id, tên hiển thị từ context server, status, updated_at. `readClinical` nhận actor để kiểm ngữ cảnh thay vì cố định ca-gia.

- [ ] Viết test fail: A và B có hai hồ sơ; mở A lần hai trả cùng UUID; cùng bệnh nhân có mã A2 tạo hồ sơ khác; giữ mã `000123`; hai open song song cùng mã chỉ tạo một hồ sơ; khác facility không gom; patient mismatch bị từ chối.
- [ ] Run `npx tsx --conditions=react-server --test src/server/clinical/encounter-context.test.ts src/server/clinical/repository.test.ts src/server/clinical/service.test.ts`; xác nhận các case mới fail.
- [ ] Implement lookup/create có khóa theo facility/mã khám và recheck dưới khóa. Context/doctor lấy server-side; data.ca trong UI phải được nạp lại theo lượt, gồm tên để masking, tuổi/giới và kết quả/link cũ. Giữ wrapper demo cũ cho các trang trình diễn không tham gia luồng mới.
- [ ] Chạy lại suite; assert user/facility không có quyền không thể đọc/write/apply vào lượt khác. Không dùng query `patient_id` làm quyền truy cập.
- [ ] detect_changes và commit file task sau khi PASS.

### Task 3: Duyệt theo phạm vi và bản in theo version

**Files:** Create `src/shared/clinical/approvals.ts`, `approvals.test.ts`, `src/server/clinical/approval-service.ts`, `approval-service.test.ts`; Modify `repository.ts`, `service.ts`, `src/shared/clinical/eform.ts`.

**Interfaces:** `approvalScopeForPath(fieldPath: string, itemId?: string): ApprovalScope`; `approvalState(record: Encounter, scope: ApprovalScope): 'unapproved' | 'current' | 'changed'`; `approveScopes(actor, request: { id, expected_revision, scopes, acknowledged_issues: true }): ClinicalResponse`; `transitionEncounter(actor, request: { id, expected_revision, action: 'wait' | 'resume' | 'complete' }): ClinicalResponse`. Dùng type actor/response đã có từ Task 2 và client API, khai báo request types ở shared api.

- [ ] Viết test fail: duyệt initial_note và một order rồi đổi conclusion vẫn giữ hai duyệt trước; sửa bệnh sử làm initial_note changed; approval snapshot cũ deep-equal; duyệt không đổi dang_kham; wait không đòi chẩn đoán xác định; complete bị chặn khi còn pending/recording/unapproved current scopes; completed không nhận start/resume thông thường.
- [ ] Run test mới bằng `npx tsx --conditions=react-server --test src/shared/clinical/approvals.test.ts src/server/clinical/approval-service.test.ts` và xác nhận fail.
- [ ] Implement scope mapping theo spec, snapshot/digest và lịch sử bất biến. Dừng xóa toàn bộ duyệt khi metadata phiên/thời gian thay đổi. Legacy `audit.approved_*` chỉ compatibility cho toàn bản hiện hành, không là nguồn duy nhất cho order approval; không tái duyệt order cũ khi thêm kết luận. Sửa validation duyệt ban đầu để không bắt điền kết luận cuối.
- [ ] Run suite và tests repository/service hiện có; expected PASS. Kiểm tra mọi field đang editable được ánh xạ scope rõ ràng, không fallback âm thầm bỏ kiểm duyệt.
- [ ] detect_changes và commit file task sau khi PASS.

### Task 4: Phiên ghi âm bền vững và lease giữa các tab

**Files:** Create `src/server/clinical/recording-service.ts`, `recording-service.test.ts`; Modify `src/shared/clinical/recording.ts`, repository methods tương ứng và tests.

**Interfaces:** `startRecording(actor, { encounter_id, expected_revision, device_id, client_request_id }): { record, session, lease_token }`; `heartbeatRecording(actor, { encounter_id, session_id, lease_token }): { expires_at }`; `finalizeRecording(actor, { encounter_id, session_id, lease_token, expected_revision, reason, transcript_ticket?: string }): ClinicalResponse`; `recoverInterruptedRecordings(actor, deviceId: string): void`. Tất cả input có shared type; không trả lease token trong list/history.

Chốt nội dung độc lập lease đã đóng: `updateRecordingContent(actor, { encounter_id, session_id, expected_revision, content_revision, client_request_id, action: 'invalidate' | 'attach_reviewed' | 'discard', transcript_ticket?: string }): ClinicalResponse`. `invalidate` tăng content_revision nhưng không lưu raw text; attach yêu cầu ticket cùng revision/digest; discard có xác nhận rõ trên UI, không xóa bản đã lưu. Retry cùng client_request_id trả kết quả thao tác cũ, không lặp quyết định hoặc tăng revision lần nữa.

- [ ] Test fail: A1 dừng rồi A2 cùng encounter có thứ tự khác; hai tab start đồng thời cùng device một bên nhận 409; heartbeat 10 giây, TTL 30 giây với fake clock; hết lease/restart đánh dấu interrupted trước khi cấp mới; retry cùng client_request_id/finalize không tạo trùng; session A/token A không dùng cho B; raw transcript bị từ chối lưu.
- [ ] Run `npx tsx --conditions=react-server --test src/server/clinical/recording-service.test.ts`; xác nhận fail.
- [ ] Implement metadata nằm trong Encounter, server-owned timestamp/state và lease JSON riêng trong `data/clinical/recording-leases/`. Dùng thứ tự khóa cố định device rồi encounter để tránh deadlock; start ghi lease reservation trước metadata, mọi lỗi/crash phục hồi reservation hết hạn, không hai owner cùng hiệu lực. Artifact transcript chỉ lấy từ ticket đã duyệt và bound đúng phiên; không tự coi transcript rỗng là lỗi phiên âm thanh.
- [ ] Chạy tests với fake clock/fault injection cho lỗi ghi giữa reservation/metadata; không cần đợi TTL thật. Session dừng microphone nhưng chưa privacy-review hiện awaiting_review, không giả reviewed. Chặn metadata update gây mất sửa form khi revision xung đột.
- [ ] Test attach sau stopped vẫn lưu được, retry finalize không khóa attach; discard chuyển content state thành discarded và bỏ chặn hoàn tất, giữ nguyên reviewed transcript cũ. Test invalidate không ghi raw text, ticket cũ không attach được sau content_revision tăng.
- [ ] detect_changes và commit file task sau khi PASS.

### Task 5: Một bộ đề xuất thay đổi dùng chung cho UI và server

**Files:** Create `src/shared/clinical/changes.ts`, `changes.test.ts`; Modify `apply-ai.ts`, `apply-ai.test.ts`, `eform.ts`, `src/server/clinical/service.ts`, `service.test.ts`.

**Interfaces:** `proposeClinicalChanges(base: Encounter, run: ClinicalExtraction): ClinicalChangeSet`; `applyClinicalChanges(base: Encounter, changeSet: ClinicalChangeSet, acceptedIds: string[], context: { now: string; doctorId: string; newId: () => string }): Encounter`. Server tự dựng change set từ run đã lưu và base revision, không tin before/after client gửi. Giữ adapter preview cho chỗ dùng aiEformPatch nhưng không có đường auto-merge vượt duyệt mới.

- [ ] Test fail: AI không ghi đè trường bác sĩ sửa/đã duyệt nếu chưa chọn; accept một field chỉ đổi field đó; null/chua_de_cap giữ cũ; stale base revision/old value nhận 409; apply cùng quyết định retry không lặp; run B vào A bị từ chối.
- [ ] Thêm test dịch vụ: nhắc lại cùng mã/bên/vị trí/số lượng không thêm order; thiếu mã hoặc khác số lượng vào danh sách cần đối chiếu; order đã duyệt không bị AI sửa/hủy; thao tác bác sĩ tạo order lặp có lý do tạo stable ID mới.
- [ ] Run `npx tsx --conditions=react-server --test src/shared/clinical/changes.test.ts src/shared/clinical/apply-ai.test.ts src/server/clinical/service.test.ts`; xác nhận fail các case mới.
- [ ] Implement đề xuất stable ID + nguồn theo session/run/segment, tách mention cũ khỏi ý định đặt mới; lưu accept/reject theo revision trong change_decisions. Không dùng array index làm danh tính order hay tạo nhóm chỉ định mồ côi khi mọi item đã trùng. Giữ chẩn đoán ban đầu và xác định theo giai đoạn.
- [ ] Chạy lại test; chứng minh snapshot preview tương ứng đúng kết quả apply server. Chặn đường luuHoSo cũ gửi ai_run_ids để bypass acceptedIds.
- [ ] detect_changes và commit file task sau khi PASS; lưu ý impact HIGH của applyAiDraft.

### Task 6: Nối context vào privacy, extraction và API

**Files:** Modify `src/server/clinical/{privacy,extraction}.ts` và tests; `src/shared/clinical/api.ts`; `src/app/api/clinical/{privacy,extract,approve}/route.ts`, `encounters/route.ts`, `encounters/[id]/route.ts`; Create `recordings/route.ts`, `changes/route.ts` và `route.test.ts` tương ứng; Modify `src/client/{api,clinical-api}.ts`.

**Interfaces:** GET encounters trả `{ encounters: EncounterSummary[] }`; POST encounters action open nhận `{ appointment_id }`, action save giữ expected_revision; POST recordings action start/heartbeat/finalize; POST changes action propose/decide nhận `{ encounter_id, expected_revision, run_id, accepted_ids, rejected_ids }` ở decide; POST approve nhận scopes; POST encounters action transition nhận wait/resume/complete. Response lỗi giữ `{ error }`, status 400/403/404/409/422 theo loại hiện có.

POST recordings bổ sung action content với contract updateRecordingContent của Task 4. Privacy prepare/approve mang content_revision; ticket server lưu digest bản lọc đã duyệt. Mọi edit sau đó phải invalidate revision trước khi attach/extract bản mới; API từ chối ticket cũ với 409 và yêu cầu kiểm tra lại. Digest do server tính, không tin digest client.

- [ ] Test fail: prepare/approve/extract ticket A/session A không dùng cho B; tên nhận diện lấy đúng bệnh nhân server; run metadata/digest/cache gồm encounter/session/transcript revision; hai bệnh nhân nói cùng câu không dùng chung binding run; cache hit vẫn kiểm ticket; ticket TTL hiện có 10 phút không cần sống suốt 3 giờ chờ.
- [ ] Run tests privacy/extraction và route tests mới; xác nhận case binding fail.
- [ ] Implement binding ticket với `{encounter_id, recording_session_id}`; định danh chỉ dùng routing/authorization ngoài prompt. Lưu immutable artifact trước khi gắn metadata. Đọc run cũ vẫn được, nhưng không tự áp vào session khác; run legacy chỉ mở trong hồ sơ đã tham chiếu nó. Backend recheck actor/ownership cho mọi action, giữ local/origin guard và policy hiện tại.
- [ ] Implement client typed APIs cho các action trên, giữ AbortSignal cho load và request ID chống response cũ. GET danh sách không trả transcript/lease. Thêm body limits vào route trước parse, không log patient text.
- [ ] Run targeted suite; fake deferred extraction của A hoàn tất trong khi request B hoạt động phải lưu dưới A và trả binding A, không đổi hồ sơ B. Verify malformed IDs, forbidden actor và stale revision.
- [ ] Test duyệt text revision 1 rồi sửa thành revision 2: attach/extract bằng ticket revision 1 bị từ chối; revision 2 sau review mới thành công; run revision 1 đã hoàn tất trước edit vẫn đọc được dưới đúng nguồn lịch sử nhưng không tự áp bản stale.
- [ ] detect_changes và commit file task sau khi PASS.

### Task 7: Giao diện chuyển lượt và controller microphone an toàn

**Files:** Create `src/client/eform/{EncounterSwitcher,RecordingSessions,ClinicalChanges}.tsx`, `recording-controller.ts`, `recording-controller.test.ts`; Modify `EformScreen.tsx`, `TroLyAi.tsx`, `BanIn.tsx`, `EformHeader.tsx`, `src/client/chung/{MicButton,DenoisedMic}.tsx`, `src/app/page.tsx`.

**Interfaces:** `RecordingHandle { stop(): Promise<void>; cancel(): void }`; microphone có async `beforeStart(): Promise<RecordingBinding>` và `onCaptureReady(handle: RecordingHandle): void` để parent thực sự await stop/flush ở cả hai backend. Callback `onText(text, binding)` luôn giữ binding chụp lúc start. `createRecordingController(deps): { start(encounterId): Promise<void>; stopAndSave(): Promise<void>; switchEncounter(nextId): Promise<void> }`; deps bọc start/finalize/heartbeat/privacy và UI state, injectable để test không cần microphone thật.

- [ ] Test fail controller: stop A → flush final words → await save → load B → mới cho start B; lỗi save giữ A và hiển thị retry; response open A chậm sau B không thay header/form; callback A tới muộn chỉ route A; hai backend đều tuân thủ thứ tự, không chỉ DeepFilterNet.
- [ ] Run `npx tsx --conditions=react-server --test src/client/eform/recording-controller.test.ts`; xác nhận fail.
- [ ] Implement switcher theo mã khám, danh sách đang khám/chờ, header luôn tên + mã bệnh nhân + mã khám; mở lượt trước khi microphone được phép start. Mount form/context riêng theo Encounter.id, chặn chuyển khi dữ liệu chưa lưu, không chỉ đổi URL và giữ data.ca của A. Heartbeat trong controller; lease conflict giữ micro tắt.
- [ ] Implement lịch sử phiên với giờ/trạng thái và transcript reviewed; session mới khi tiếp tục, không nối đồng hồ qua khoảng chờ. Không thêm nút nghe WAV. UI chỉ đánh dấu “đã lưu” sau server ack; hướng dẫn review/bỏ phần chưa duyệt trước khi chuyển, có lựa chọn ở lại. Cảnh báo điều hướng khi còn dữ liệu chưa lưu.
- [ ] Implement danh sách đề xuất cũ/mới, chọn accept/reject rồi save; UI dùng đúng change set server. Hiển thị trạng thái duyệt từng phần, tách nút “Chờ kết quả”, “Tiếp tục khám”, “Hoàn tất lượt khám”. Chặn hoàn tất khi chưa đủ điều kiện. BanIn chọn bản đã duyệt và in đúng snapshot; current draft không mang nhãn đã duyệt.
- [ ] Browser QA hai bệnh nhân giả: A1 duyệt/chờ, B1 hoàn tất, A2 bổ sung; kiểm header, reload, Ctrl+P, chưa duyệt và không nhân đôi order. Smoke trang trình diễn và STT độc lập để giữ compatibility props cũ.
- [ ] detect_changes và commit file task sau khi PASS.

### Task 8: Nghiệm thu, tài liệu và chuyển trạng thái plan

**Files:** Modify `docs/CLINICAL-WORKFLOW.md`; Create `docs/interrupted-encounters-acceptance.md`; cập nhật README pending khi được yêu cầu bắt đầu/hoàn tất, không chuyển file ngay lúc lập kế hoạch.

**Interfaces:** Chỉ sử dụng API/controller Task 2–7; không mở thêm tích hợp hoặc đổi engine.

- [ ] Ghi và chạy kịch bản nghiệm thu đủ 8 mục của spec với mock nội bộ, hai bệnh nhân giả, một bệnh nhân có hai mã khám; A chờ qua ngày vẫn mở được, không dựa timer thật.
- [ ] Fault injection: pending final STT, stop lỗi, disk write lỗi, expired privacy ticket, browser reload giữa recording, hai tab cùng start/save. Assert không mất bản đã duyệt, không báo thành công giả và B không chứa text A.
- [ ] Run `npm test`, `npm run clinical:check`, `npm run lint`, `npm run build`; ghi kết quả thật và phân biệt lỗi có sẵn với regression. Kiểm STT local cả bật/tắt denoise nếu runtime có; nếu thiếu runtime ghi phần chưa xác minh, không tuyên bố nghiệm thu audio đã đạt.
- [ ] Cập nhật docs về các nút mới, lưu phiên, version in, giới hạn khôi phục và đề xuất chưa bao gồm lưu WAV/HIS thật. Giữ phần xem CLS như cũ, link lại chủ đề brainstorming đã hoãn.
- [ ] Chạy GitNexus detect_changes scope all đầy đủ và review diff; nếu partial/truncated thì rerun/khắc phục trước commit. Không stage thay đổi sẵn của công việc khác.
- [ ] Khi đã đạt nghiệm thu, cập nhật trạng thái và di chuyển plan + design ra khỏi pending, sửa liên kết tương đối và README. Không làm bước này chỉ vì đã viết xong tài liệu.

## Tự rà soát kế hoạch

- Phạm vi một mã/nhiều phiên và nhiều bệnh nhân: Task 1, 2, 4, 7.
- Duyệt ban đầu rồi bổ sung, bảo toàn dữ liệu: Task 3, 5, 7.
- Callback chậm, sai binding và concurrency: Task 2, 4, 6, 7, 8.
- Migration, privacy và luồng CLS không đổi: Task 1, 6, 8.
- Không triển khai trong đợt lập plan; không thêm nhúng hệ thống CLS, ghi audio lâu dài hoặc AI kê đơn.

## Tiến độ và việc còn lại (cập nhật 14/11/2026, để mở phiên mới làm tiếp)

Làm trên nhánh `stt` ở checkout chính. Chưa commit gì; khi commit chỉ stage file của task.

**Đã xong, có test (195 test, `tsc`, `eslint src`, `clinical:check`, `npm run build` đạt):** Task 1–6 (cả server và client), phần giao diện Task 5 (`ClinicalChanges`) và Task 7 (`EncounterWorkspace`, `EncounterSwitcher`, `RecordingSessions`, `EformScreen`, `TroLyAi`, `BanIn`, microphone nối `recording-controller`). Đã chạy thử trong trình duyệt với AI mock và nhập tay: mở A, kiểm tra riêng tư, bản nháp, chấp nhận đề xuất, Chờ kết quả, chuyển B, quay lại A, Tiếp tục khám, duyệt từng phần, tải lại trang. Chi tiết trong `docs/CHANGELOG.md` mục 2026-11-14.

**Còn lại (Task 8, nghiệm thu):**

- [ ] Thu âm bằng micro thật qua cả hai backend (cần `npm run tai-model-giong-noi`, hoặc STT local + DeepFilterNet): dừng, chữ cuối, chốt phiên, chuyển lượt.
- [ ] Kịch bản đủ 8 mục của spec: A1 duyệt/chờ, B1 hoàn tất, A2 bổ sung; một bệnh nhân có hai mã khám (`LK-GIA-0456`, `LK-GIA-0457`).
- [ ] Hai tab cùng bấm ghi âm hoặc cùng lưu; reload giữa lúc ghi; ticket hết hạn; lỗi dừng/ghi đĩa ở mức giao diện.
- [ ] Ctrl+P: bản in đúng bản đã duyệt (cần chỉ định có mã danh mục để duyệt đủ).
- [ ] Xem chữ của bản chép lời đã duyệt trong `RecordingSessions` (chưa có API đọc; hiện chỉ hiện thông tin bản).
- [ ] Cập nhật tài liệu người dùng cuối; sau khi đạt nghiệm thu mới chuyển plan và thiết kế ra khỏi `pending`.

**Lưu ý:** `npm run lint` quét cả `.claude/worktrees`, dùng `npx eslint src`. Đọc `node_modules/next/dist/docs/` trước khi viết code dùng API Next. `src/shared` phải là TS thuần.
