# Màn demo luồng dữ liệu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/demo-luong` chạy trọn STT → bản thô → che PII tự động (14 rule) → AI mock → lưu → phiếu khám nhiều phiên để bác sĩ sửa/duyệt, có hai chế độ xem Bác sĩ/Lãnh đạo và Kỹ thuật.

**Architecture:** Bộ rule PII là TS thuần ở `src/shared/clinical/pii/` (che + chốt chặn). Máy chủ có một bộ điều phối `runDemoFlow` (async generator sự kiện) ở `src/server/demo-luong/`, route `POST /api/demo-luong` trả stream NDJSON. Lưu bằng `ClinicalRepository` trỏ vào `data/demo-luong/encounters`, kèm file sidecar ghi nguồn từng ô; client đọc stream và vẽ 5 bước + phiếu.

**Tech Stack:** Next.js 16 App Router (route handler Node runtime, `ReadableStream`), React 19, Tailwind 4, `node:test` qua `npm test`, zod.

**Spec:** `docs/superpowers/plans/pending/2026-11-16-demo-luong-du-lieu-design.md`

## Global Constraints

- Chỉ dữ liệu giả. Không tên/PID/CCCD thật trong code, fixture, test, commit.
- Bản thô **không** được ghi đĩa, log hay đưa vào bất kỳ file nào trong `data/`. Chỉ đi trong stream về trình duyệt.
- Mã ICD/dịch vụ chỉ gán bởi `src/shared/match.ts` (qua `applyAiDraft`), không bởi AI.
- `src/client` không import `src/server`; kiểu dùng chung đặt ở `src/shared/demo-luong/types.ts`. `npm run lint` phải sạch.
- Phiên bản rule: `PII_POLICY_VERSION = "pii-auto-1"`.
- AI đợt này chỉ `mock`. Không thêm adapter nhà cung cấp.
- Thư mục dữ liệu runtime: `data/demo-luong/` (thêm vào `.gitignore`, trừ `data/demo-luong/kich-ban/` được commit).
- Trước khi viết route stream: đọc `node_modules/next/dist/docs/` phần Route Handlers/streaming.
- Trước khi sửa hàm có sẵn (`assertDataUseAllowed`, `extractClinical`, `Header`): chạy `node .gitnexus/run.cjs impact "<tên>" --direction upstream --repo .` và ghi rủi ro vào mô tả commit; HIGH/CRITICAL thì dừng báo chủ dự án.
- Mọi task kết thúc bằng một mục trong `docs/CHANGELOG.md` (skill `ghi-tai-lieu`); hook Stop chặn nếu thiếu.
- Nhãn giao diện, thông báo lỗi tiếng Việt.

## Review Focus

1. **Chữ STT toàn chữ thường, không dấu câu** → rule tên (R2) và chốt chặn (R11c) vẫn bắt "chị nguyễn thị giả" và "ông trần văn mô phỏng". Test ở Task 1 và Task 2.
2. **Giá trị đã biết viết không dấu hoặc tách khoảng trắng** ("nguyen thi gia", "0 9 1 2 …") → vẫn bị che hoặc bị chặn. Test ở Task 1 (R1) và Task 2 (R11b).
3. **Thuốc, liều, bên tai, thời gian bệnh không bị che nhầm** ("amoxicillin 500 mg ngày 2 lần, tai phải, đau 3 ngày nay") → giữ nguyên. Test ở Task 1.
4. **Ghi phiên mới sau khi bác sĩ sửa ô** → ô đó giữ giá trị bác sĩ, có cờ xung đột nếu AI nói khác; phiếu đã duyệt quay về nháp. Test ở Task 5.
5. **Lượt bị chặn hoặc lỗi giữa chừng** → không có file nào trong `data/demo-luong/` chứa chuỗi của bản thô; phiếu không đổi revision. Test ở Task 5.

---

### Task 1: Bộ che PII (R1–R8, R10)

**Files:**
- Create: `src/shared/clinical/pii/types.ts`, `src/shared/clinical/pii/redact.ts`, `src/shared/clinical/pii/ho-viet.ts`, `src/shared/clinical/pii/index.ts`
- Test: `src/shared/clinical/pii/redact.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PII_POLICY_VERSION = "pii-auto-1";
  export type PiiRule = "R1"|"R2"|"R3"|"R4"|"R5"|"R6"|"R7"|"R8";
  export type PiiLabelKind = "BỆNH_NHÂN"|"NGƯỜI_NHÀ"|"BÁC_SĨ"|"NƠI_LÀM_VIỆC"|"NGƯỜI"|"ĐỊA_DANH"|"NGÀY"|"LIÊN_HỆ"|"MÃ_ĐỊNH_DANH"|"THÔNG_TIN_NHẠY_CẢM"|"NỘI_DUNG_NGOÀI_KHÁM"|"TUỔI"|"GIỚI_TÍNH";
  export interface KnownIdentifier { value: string; kind: "BỆNH_NHÂN"|"NGƯỜI_NHÀ"|"BÁC_SĨ"|"NƠI_LÀM_VIỆC"|"MÃ_ĐỊNH_DANH"|"LIÊN_HỆ"|"ĐỊA_DANH" }
  export interface PiiSpan { rule: PiiRule; kind: PiiLabelKind; start: number; end: number; label: string } // start/end trên bản thô
  export interface RedactionResult { raw: string; clean: string; spans: PiiSpan[]; counts: Record<PiiRule, number> }
  export function redactPii(raw: string, known: KnownIdentifier[]): RedactionResult;
  export function foldVietnamese(text: string): string; // bỏ dấu, đ→d, chữ thường, gộp khoảng trắng
  export const HO_VIET: readonly string[]; // ~100 họ, dạng chữ thường có dấu
  ```
- Nhãn R10: `[KIND_n]`, `n` đếm theo thứ tự xuất hiện trong lượt cho từng giá trị khác nhau (cùng giá trị → cùng nhãn). Bệnh nhân và bác sĩ dùng `[BỆNH_NHÂN]`, `[BÁC_SĨ]` không số. Không băm từ giá trị.

- [ ] **Step 1: Viết test thất bại** — `redact.test.ts`, mỗi rule một `test()`:
  - R1: known `[{value:"Nguyễn Thị Giả",kind:"BỆNH_NHÂN"}]`; input `"chị nguyen thi gia đau tai"` → `clean === "chị [BỆNH_NHÂN] đau tai"`, `counts.R1 === 1`, span `{start:4,end:18}`.
  - R1 người nhà: known `{value:"Trần Văn Chồng",kind:"NGƯỜI_NHÀ"}` xuất hiện 2 lần → cả hai là `[NGƯỜI_NHÀ_1]`.
  - R2: `"con tôi tên là lê minh bé, bị sổ mũi"` → `"con tôi tên là [NGƯỜI_1], bị sổ mũi"`; `"bác sĩ ơi ông phạm văn hàng xóm cũng bị"` → chứa `[NGƯỜI_1]`, không chứa `"phạm"`.
  - R3: `"nhà ở số 12 đường lê lợi phường bến thành"` → không còn `"lê lợi"`, `"bến thành"`, `"12"`; `"quê ở huyện mỹ đức"` → `[ĐỊA_DANH_1]`.
  - R4: `"sinh ngày 10/03/1978, đau tai 3 ngày nay"` → chứa `[NGÀY]` và còn nguyên `"3 ngày nay"`.
  - R5: số `0912 345 678`, email, `https://vi.du`, `192.168.1.10` → đều `[LIÊN_HỆ_n]`.
  - R6: `"cccd 001234567890"`, `"biển số 29A-123.45"`, `"pid GIA-000123"`, `"số tài khoản 0123456789"` → `[MÃ_ĐỊNH_DANH_n]`.
  - R7: `"quốc tịch nhật"`, `"theo đạo thiên chúa"`, `"đã ly hôn"` → `[THÔNG_TIN_NHẠY_CẢM_n]`.
  - R8: `"chuyện vay tiền nhà hàng xóm"` → `[NỘI_DUNG_NGOÀI_KHÁM]`; `"mẹ tôi bị ung thư vòm họng"` giữ nguyên.
  - Giữ nguyên: `"amoxicillin 500 mg ngày 2 lần, tai phải, sốt 38,5 độ, đau 3 ngày nay"` → `clean === raw`, `spans.length === 0`.
  - Tuổi/giới tính (như bộ cũ): `"bệnh nhân nữ 47 tuổi"` → chứa `[GIỚI_TÍNH]`, `[TUỔI]`, span gắn `rule: "R7"`.
  - Mọi span: `raw.slice(start,end)` khác rỗng, các span không chồng nhau.
- [ ] **Step 2: Chạy** `npm test -- src/shared/clinical/pii/redact.test.ts` → FAIL (module chưa có).
- [ ] **Step 3: Viết `redactPii`.** Thứ tự: R1 (so khớp trên `foldVietnamese` của cả hai phía, ánh xạ vị trí về bản thô) → R6 → R5 → R4 → R3 → R7 → R8 → R2 → tuổi/giới tính. Gom span, bỏ span bị span trước phủ, rồi dựng `clean` từ phải sang trái. Dùng lại các regex hữu ích trong `src/shared/clinical/privacy.ts` (chép, không import ngược để `redactTranscript` cũ không đổi). R2: từ chỉ người (`anh|chị|ông|bà|cô|chú|bác|bé|em|con|cháu|tên là|tên`) hoặc đầu câu, theo sau bởi một họ trong `HO_VIET` (so trên dạng fold) và 1–3 âm tiết tiếp → che cả cụm họ + tên; không cần chữ hoa.
- [ ] **Step 4: Chạy lại** → PASS. `npm run lint` sạch.
- [ ] **Step 5: CHANGELOG + commit** `feat(pii): bộ che PII tự động R1–R8 pii-auto-1`.

### Task 2: Chốt chặn R11, đồng ý R14, nhật ký R13

**Files:**
- Create: `src/shared/clinical/pii/gate.ts`, `src/shared/clinical/pii/audit.ts`
- Modify: `src/shared/clinical/pii/index.ts` (export)
- Test: `src/shared/clinical/pii/gate.test.ts`

**Interfaces:**
- Consumes: `RedactionResult`, `KnownIdentifier`, `foldVietnamese`, `HO_VIET` (Task 1).
- Produces:
  ```ts
  export type GateReason = "R11a_gia_tri_da_biet"|"R11b_day_so_dai"|"R11c_ten_rieng_con_sot"|"R11d_email_url";
  export interface GateResult { passed: boolean; reasons: { reason: GateReason; excerpt: string }[] } // excerpt lấy từ bản SẠCH, ≤ 40 ký tự
  export function checkResidualPii(clean: string, known: KnownIdentifier[], allowlist: ReadonlySet<string>): GateResult;
  export type AiRoute = "external_allowed" | "local_only";
  export function aiRouteFor(consent: boolean): AiRoute; // R14
  export interface PiiAuditEntry { at: string; encounter_id: string; session_sequence: number; policy_version: typeof PII_POLICY_VERSION; counts: Record<PiiRule, number>; gate: GateResult["passed"]; gate_reasons: GateReason[]; ai_route: AiRoute; provider: string; model: string; clean_sha256: string }
  export function buildAuditEntry(input: Omit<PiiAuditEntry, "at"> & { now: string }): PiiAuditEntry; // clean_sha256 do máy chủ băm sẵn (node:crypto)
  ```
- R11 điều kiện (spec mục 5): (a) fold của bất kỳ `known.value` dài > 2 xuất hiện trong fold của `clean`; (b) `/\d(?:[\s.-]?\d){5,}/` sau khi bỏ nhãn `[…]`; (c) một họ trong `HO_VIET` + ≥1 âm tiết, không nằm trong nhãn và không thuộc `allowlist` (fold); (d) email hoặc `https?://`.

- [ ] **Step 1: Test thất bại** — mỗi điều kiện một test có `passed === false` và đúng `reason`; một test `clean` sạch từ ca chuẩn → `passed === true, reasons.length === 0`; test (c): `"thủng màng nhĩ, viêm tai giữa"` qua; `"gặp lý hoài an ở chợ"` bị chặn; một cụm bắt đầu bằng họ nhưng có trong `allowlist` (fold, ví dụ `"cao huyết áp"` với `cao` là họ) **qua**. `aiRouteFor(false) === "local_only"`. `buildAuditEntry` không có trường nào chứa chuỗi của bản thô (kiểm bằng `JSON.stringify(entry).includes("nguyen")` false với dữ liệu test).
- [ ] **Step 2: Chạy** `npm test -- src/shared/clinical/pii/gate.test.ts` → FAIL.
- [ ] **Step 3: Viết** `checkResidualPii`, `aiRouteFor`, `buildAuditEntry`.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: CHANGELOG + commit** `feat(pii): chốt chặn R11, R14, nhật ký R13`.

### Task 3: Dữ liệu giả, kịch bản mẫu, danh sách giá trị đã biết

**Files:**
- Modify: `data/clinic/patients.json` (mỗi bệnh nhân thêm `dong_y_xu_ly_ai: { trang_thai: boolean, luc: string }`, `nguoi_nha: [{ ho_ten, quan_he, dien_thoai }]`, `noi_lam_viec`, `dia_chi`, `dien_thoai` — giả), schema đọc fixture tương ứng ở `src/shared/clinic/schema.ts`.
- Create: `data/demo-luong/kich-ban/ca-chuan.json`, `ca-chua-dong-y.json`, `ca-bi-chan.json`
- Create: `src/server/demo-luong/known-identifiers.ts`, `src/server/demo-luong/kich-ban.ts`
- Create: `src/shared/demo-luong/types.ts`
- Modify: `.gitignore` (`data/demo-luong/*` và `!data/demo-luong/kich-ban/`)
- Test: `src/server/demo-luong/kich-ban.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/shared/demo-luong/types.ts
  export type DemoSource = { kind: "kich_ban"; id: string } | { kind: "audio" };
  export interface KichBan { id: string; ten: string; benh_nhan_id: string; mode: "conversation" | "dictation"; dong_y_override?: boolean; doan: { vai_tro: "bac_si"|"benh_nhan"|"nguoi_nha"; text: string }[]; expected: { phai_che: string[]; phai_giu: string[]; bi_chan: boolean } }
  export type DemoStep = "stt" | "ban_tho" | "che" | "ai" | "luu";
  export type DemoEvent =
    | { buoc: "stt"; trang_thai: "xong"; ms: number; du_lieu: { engine: string; text: string; audio_ms: number | null } }
    | { buoc: "ban_tho"; trang_thai: "xong"; ms: number; du_lieu: { raw: string; spans: PiiSpan[]; mode: "conversation" | "dictation" } }
    | { buoc: "che"; trang_thai: "xong" | "bi_chan"; ms: number; du_lieu: { clean: string; counts: Record<PiiRule, number>; gate: GateResult; ai_route: AiRoute; dong_y: { trang_thai: boolean; luc: string | null } } }
    | { buoc: "ai"; trang_thai: "xong" | "loi"; ms: number; du_lieu: { provider: string; model: string; prompt_version: string; payload_preview: string; extraction?: ClinicalExtraction; loi?: string } }
    | { buoc: "luu"; trang_thai: "xong" | "loi"; ms: number; du_lieu: { phieu: DemoPhieu; file: string; sha256: string; audit: PiiAuditEntry; loi?: string } };
  export interface DemoFieldSource { nguon: "ai" | "bac_si"; phien: number | null; xung_dot?: { phien: number; gia_tri_ai: string } }
  export interface DemoPhieu { encounter_id: string; appointment_id: string; revision: number; status: string; duyet: { luc: string; boi: string } | null; sessions: { sequence: number; at: string; counts: Record<PiiRule, number>; clean: string }[]; snapshot: EformSnapshot; sources: Record<string, DemoFieldSource> }
  // src/server/demo-luong/known-identifiers.ts
  export function knownIdentifiersFor(patientId: string): { known: KnownIdentifier[]; consent: { trang_thai: boolean; luc: string | null } };
  // src/server/demo-luong/kich-ban.ts
  export function listKichBan(): Pick<KichBan, "id" | "ten" | "benh_nhan_id">[];
  export function loadKichBan(id: string): KichBan; // id chỉ [a-z0-9-], lỗi ClinicalError 404
  ```
  `EformSnapshot` lấy từ kiểu hiện có của `projectEform` (`src/shared/clinical/eform.ts`).
- `knownIdentifiersFor` gom: họ tên + PID bệnh nhân, mã khám, điện thoại, địa chỉ, nơi làm việc, từng `nguoi_nha` (tên + điện thoại), bác sĩ/điều dưỡng trong `data/eform/ca-gia.json` và `data/clinic/directory-demo.json`.
- Ca chuẩn có đủ: họ tên bệnh nhân, số điện thoại, địa chỉ, tên người nhà, ngày sinh, CCCD giả, quốc tịch, tiền sử gia đình, thuốc + liều + bên tai; chia 2 phần hợp cho 2 phiên (lý do khám/bệnh sử; khám/chỉ định). Ca bị chặn có tên người lạ đứng trơ sau một họ nhưng gắn vào từ khóa R2 không bắt được (ví dụ giữa câu không có từ chỉ người, nhưng có họ → R11c bắt).

- [ ] **Step 1: Test thất bại** — với mỗi kịch bản: `redactPii(join(doan), knownIdentifiersFor(benh_nhan_id).known)` → mọi chuỗi `expected.phai_che` không còn trong `clean` (so fold), mọi `expected.phai_giu` còn nguyên; `checkResidualPii(...).passed === !expected.bi_chan`. Thêm test `loadKichBan("../x")` ném lỗi 404.
- [ ] **Step 2: Chạy** `npm test -- src/server/demo-luong/kich-ban.test.ts` → FAIL.
- [ ] **Step 3: Viết dữ liệu và hai module.** Danh mục cho phép R11c: tên thuốc (`data/` danh mục thuốc hiện có) + tên dịch vụ + danh sách thuật ngữ TMH nhỏ trong `kich-ban.ts`; export `demoAllowlist(): ReadonlySet<string>` (fold).
- [ ] **Step 4: Chạy lại + `npm test` toàn bộ** (fixture patients đổi không làm vỡ test clinic) → PASS.
- [ ] **Step 5: CHANGELOG + commit** `feat(demo-luong): kịch bản giả, cờ đồng ý AI, giá trị đã biết`.

### Task 4: Nới chính sách dữ liệu cho bản đã khử nhận dạng

**Files:**
- Modify: `src/shared/clinical/data-policy.ts`, `src/server/clinical/extraction.ts`
- Modify: `docs/DATA-USE-POLICY.md`
- Test: `src/shared/clinical/data-policy.test.ts`, `src/server/clinical/extraction.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DataLevel = "public" | "masked_internal" | "deidentified" | "restricted";
  export interface DeidentificationProof { policy_version: "pii-auto-1"; gate_passed: true; consent: boolean }
  export function classifyData(text: string, source?: "clinical" | "public_reference", proof?: DeidentificationProof): DataLevel; // proof hợp lệ + không restricted → "deidentified"
  // assertDataUseAllowed: "deidentified" + external → cho phép khi consent; "deidentified" + !consent + external → ném "Bệnh nhân chưa đồng ý xử lý AI — chỉ được chạy bộ tách local."
  // ClinicalExtractionOptions thêm: deidentification?: DeidentificationProof; noCache?: boolean
  ```
  `extractClinical`: khi có `deidentification`, truyền vào `classifyData`; khi `noCache` thì bỏ đọc `cache`/`run-index` (vẫn ghi run như cũ). Đường cũ (không truyền proof) **giữ nguyên hành vi**.

- [ ] **Step 1: Impact** `node .gitnexus/run.cjs impact "assertDataUseAllowed" --direction upstream --repo .` và tương tự `extractClinical`; ghi kết quả.
- [ ] **Step 2: Test thất bại** — `classifyData("…", "clinical", proof)` → `"deidentified"`; với text restricted vẫn `"restricted"`; `assertDataUseAllowed("deidentified","external",true)` không ném; `(…,false)` ném đúng thông báo; `("masked_internal","external",true)` **vẫn ném** như cũ. `extractClinical` với `noCache: true` gọi hai lần cùng input → hai `run_id` khác nhau; không `noCache` → cùng `run_id` (hành vi cũ).
- [ ] **Step 3: Chạy** các test → FAIL.
- [ ] **Step 4: Sửa code.** Cập nhật `DATA-USE-POLICY.md`: thêm cấp `deidentified`, 14 rule, căn cứ (Luật 91/2025 Điều 2.1, 14.6, 20, 26, 30; NĐ 356/2025; HIPAA §164.514(b)(2)), câu "tự động không chứng minh ẩn danh tuyệt đối", phạm vi: chỉ luồng `/demo-luong`; eForm `/` giữ bước duyệt thủ công.
- [ ] **Step 5: Chạy** `npm test` toàn bộ + `npm run lint` → PASS.
- [ ] **Step 6: CHANGELOG + commit** `feat(policy): cấp deidentified cho bản qua chốt chặn pii-auto-1`.

### Task 5: Bộ điều phối và kho phiếu demo

**Files:**
- Create: `src/server/demo-luong/store.ts`, `src/server/demo-luong/merge.ts`, `src/server/demo-luong/flow.ts`
- Test: `src/server/demo-luong/store.test.ts`, `src/server/demo-luong/flow.test.ts`

**Interfaces:**
- Consumes: Task 1–4; `ClinicalRepository`, `createWalkInContext`, `openEncounter(context, store)`, `applyAiDraft`, `projectEform`, `extractClinical`, `parseTranscript`.
- Produces:
  ```ts
  // store.ts — gốc mặc định path.join(process.cwd(),"data","demo-luong")
  export interface DemoStore { root: string; repo: ClinicalRepository }
  export function demoStore(root?: string): DemoStore;
  export function createDemoPhieu(store: DemoStore, patientId: string): DemoPhieu;
  export function readDemoPhieu(store: DemoStore, encounterId: string): DemoPhieu; // đọc từ đĩa
  export function saveDoctorEdit(store: DemoStore, encounterId: string, expectedRevision: number, fields: Record<string, string>): DemoPhieu; // sources[key] = {nguon:"bac_si", phien:null}; xóa duyet
  export function approveDemoPhieu(store: DemoStore, encounterId: string, expectedRevision: number): DemoPhieu; // duyet = {luc, boi: persona demo}
  export function resetDemoData(store: DemoStore): void; // xóa encounters/, meta/, runs/, transcripts/, audit/, giữ kich-ban/
  // merge.ts
  export function mergeSession(phieu: DemoPhieu, before: EformSnapshot, after: EformSnapshot, sequence: number): Pick<DemoPhieu, "snapshot" | "sources">;
  // flow.ts
  export interface DemoFlowInput { encounterId: string; source: DemoSource; audio?: Uint8Array; transcribe?: (wav: Uint8Array) => Promise<{ text: string; engine: string; audio_ms: number | null }> }
  export function runDemoFlow(store: DemoStore, input: DemoFlowInput, now?: () => number): AsyncGenerator<DemoEvent>;
  ```
- Sidecar: `data/demo-luong/meta/<encounterId>.json` chứa `{ sources, sessions, duyet }` (bản đã che, không bản thô). Nhật ký: `data/demo-luong/audit/<encounterId>.ndjson`, một dòng `PiiAuditEntry` mỗi phiên.
- `runDemoFlow`: stt (kịch bản: ghép `doan` thành text, engine `"kich-ban"`; audio: gọi `transcribe`, mode `dictation`) → ban_tho (`redactPii`) → che (`checkResidualPii`, `aiRouteFor`; nếu chặn: phát `bi_chan`, ghi audit với `gate:false`, **return**) → ai: dựng `Transcript` (segments từ `doan`/dictation: `vai_tro` theo kịch bản hoặc `bac_si`, `nguon_vai_tro: "he_thong"`, `privacy: { trang_thai: "passed", policy_version: PII_POLICY_VERSION, processed_at }`), gọi `extractClinical("demo", { approvedTranscript: () => t, directory: store.root, noCache: true, deidentification: {…, consent} })`, `payload_preview` = JSON các segment đã che → luu: `repo.update(...)` với `applyAiDraft` + thêm `RecordingSession` (`sequence` kế tiếp, `state:"stopped"`, `content_state:"reviewed"`, `reviewed_digest` = sha256 bản sạch, `device_id:"demo-luong"`), rồi `mergeSession` trên `projectEform` trước/sau, xóa `duyet` nếu đang có, ghi sidecar + audit, phát `luu` với `readDemoPhieu` (đọc lại từ đĩa) và `sha256` của file encounter.
- `mergeSession`: ô có `sources[k].nguon === "bac_si"` giữ giá trị `before`; nếu `after[k]` khác và khác rỗng → `xung_dot = { phien: sequence, gia_tri_ai }`. Ô khác đổi giá trị → `{ nguon:"ai", phien: sequence }`.

- [ ] **Step 1: Test thất bại `store.test.ts`** (thư mục tạm `fs.mkdtempSync`): `createDemoPhieu` → `revision ≥ 1`, `sessions.length === 0`; `saveDoctorEdit` với revision cũ → lỗi 409; `approveDemoPhieu` rồi `saveDoctorEdit` → `duyet === null`; `resetDemoData` giữ `kich-ban/`.
- [ ] **Step 2: Test thất bại `flow.test.ts`**:
  - ca chuẩn: thứ tự `buoc` = `["stt","ban_tho","che","ai","luu"]`, `che.trang_thai === "xong"`, `luu.du_lieu.phieu.sessions.length === 1`.
  - chạy phiên 2 sau khi `saveDoctorEdit` ô `ly_do_kham` = `"BS sửa"` → ô vẫn `"BS sửa"`, `sources.ly_do_kham.nguon === "bac_si"`, có `xung_dot.phien === 2` nếu phiên 2 có lý do khám khác; `sessions.length === 2`; `duyet === null` nếu đã duyệt trước đó.
  - ca bị chặn: sự kiện cuối là `che`/`bi_chan`, không có `ai`/`luu`; revision phiếu không đổi.
  - ca chưa đồng ý: `che.du_lieu.ai_route === "local_only"`, `ai.du_lieu.provider === "mock"`.
  - **Không rò bản thô:** sau cả ba ca, đọc đệ quy mọi file trong `store.root` (trừ `kich-ban/`), không file nào chứa fold của bất kỳ `expected.phai_che`, và không có file `.wav`/audio nào (R9).
  - audio: `transcribe` giả trả `"chị nguyễn thị giả đau tai phải ba ngày"` → `ban_tho.du_lieu.mode === "dictation"`, bản sạch có `[BỆNH_NHÂN]`.
- [ ] **Step 3: Chạy** `npm test -- src/server/demo-luong/` → FAIL.
- [ ] **Step 4: Viết** `store.ts`, `merge.ts`, `flow.ts`.
- [ ] **Step 5: Chạy lại + `npm test` + `npm run lint`** → PASS.
- [ ] **Step 6: CHANGELOG + commit** `feat(demo-luong): bộ điều phối 5 bước và kho phiếu nhiều phiên`.

### Task 6: API

**Files:**
- Create: `src/app/api/demo-luong/route.ts` (POST chạy luồng), `src/app/api/demo-luong/phieu/route.ts` (POST tạo, DELETE xóa dữ liệu demo), `src/app/api/demo-luong/phieu/[id]/route.ts` (GET đọc, PATCH lưu bản sửa), `src/app/api/demo-luong/phieu/[id]/duyet/route.ts` (POST), `src/app/api/demo-luong/kich-ban/route.ts` (GET danh sách)
- Modify: `src/client/api.ts` hoặc tạo `src/client/demo-luong/api.ts`
- Test: `src/app/api/demo-luong/routes.test.ts`

**Interfaces:**
- Consumes: Task 5.
- Produces (HTTP):
  - `POST /api/demo-luong?phieu=<uuid>&kich_ban=<id>` (body rỗng) hoặc `?phieu=<uuid>` với body `audio/wav` → `200`, `Content-Type: application/x-ndjson`, mỗi dòng một `DemoEvent`. Audio > 20 MB → 413. Gọi STT qua `proxyStt` dựng `Request` nội bộ; STT lỗi → một dòng `{buoc:"stt",trang_thai:"loi",…}` rồi đóng stream.
  - `POST /api/demo-luong/phieu` body `{ benh_nhan_id }` → `DemoPhieu`. `DELETE` → `204`.
  - `GET /api/demo-luong/phieu/[id]` → `DemoPhieu`; `PATCH` body `{ expected_revision, fields }` → `DemoPhieu`; `POST …/duyet` body `{ expected_revision }` → `DemoPhieu`.
  - Mọi route: `export const runtime = "nodejs"`, `assertLocalDemoRequest`, lỗi qua `clinicalResponse`, header `Cache-Control: no-store`.
  - Client: `streamDemoFlow(phieuId: string, input: { kichBan: string } | { wav: Blob }, onEvent: (e: DemoEvent) => void, signal?: AbortSignal): Promise<void>` và các hàm gọi CRUD trên.

- [ ] **Step 1: Đọc** `node_modules/next/dist/docs/` mục Route Handlers (streaming, dynamic params kiểu Promise).
- [ ] **Step 2: Test thất bại** — gọi trực tiếp handler với `Request` giả host localhost: POST ca chuẩn → đọc hết body, tách dòng, `JSON.parse` từng dòng, 5 sự kiện; request không phải local → 403; `kich_ban=../x` → 404 trong JSON lỗi (trước khi mở stream); PATCH revision cũ → 409.
- [ ] **Step 3: Chạy** → FAIL. **Step 4: Viết route + client API.** **Step 5: Chạy lại + lint** → PASS.
- [ ] **Step 6: CHANGELOG + commit** `feat(demo-luong): API stream và phiếu demo`.

### Task 7: Giao diện `/demo-luong`

**Files:**
- Create: `src/app/demo-luong/page.tsx`, `src/client/demo-luong/DemoLuongScreen.tsx`, `StepRail.tsx`, `TranscriptPanels.tsx`, `SessionBar.tsx`, `DemoPhieuPanel.tsx`, `TechDetails.tsx`
- Modify: `src/client/chung/Header.tsx` (thêm `{ href: "/demo-luong", label: "Demo luồng dữ liệu" }`)

**Interfaces:**
- Consumes: client API Task 6; kiểu `src/shared/demo-luong/types.ts`.
- Bố cục và nội dung đúng spec mục 7 và mục 12: thanh trên (công tắc chế độ, chọn bệnh nhân giả, dòng "Đồng ý AI: ✓/✗ (lúc tiếp đón, <luc>)", nút "+ Phiếu khám mới"), chọn nguồn (Micro dùng `DenoisedMic`/`MicButton` sẵn có để lấy WAV · File WAV · Kịch bản mẫu), nút "▶ Ghi phiên mới", sơ đồ 5 bước có trạng thái và ms, thanh phiên, ba cột Bản thô (span đỏ, `title` = mã rule) / Bản đã che (nhãn xanh, "Đã che N mục · Chặn: không/có") / Phiếu.
- Chuỗi cố định: "Thông tin định danh không rời máy chủ bệnh viện" (chế độ Bác sĩ/Lãnh đạo); "Mock — chưa rời máy chủ" (ô ④ chế độ Kỹ thuật); "Không gửi AI" (ô ④⑤ khi bị chặn); "Bác sĩ thao tác: 1 lần (duyệt phiếu)" — đếm thật số lần bấm Lưu bản sửa/Duyệt trong phiếu; "Phiên N nói khác: <giá trị>" trên ô có `xung_dot`; nhãn nguồn ô "AI · phiên N" / "Bác sĩ sửa".
- Chế độ Kỹ thuật: mỗi ô bước mở `TechDetails` (bảng đếm theo rule, `payload_preview` nguyên văn, prompt/schema/policy version, kết quả kiểm cấu trúc, JSON `DemoPhieu`, dòng audit, ghi chú rủi ro còn lại của R2 với chữ thường).
- Bản thô giữ trong state React theo `sequence`, mất khi tải lại trang (ghi chú nhỏ dưới thanh phiên).
- Chiều hẹp < 768px: các cột xếp dọc.

- [ ] **Step 1: Viết các component** (dùng Tailwind theo giọng `src/client/eform/`).
- [ ] **Step 2: `npm run lint` + `npm run build`** → sạch.
- [ ] **Step 3: Kiểm trong trình duyệt** (`npm run dev`, mở `http://localhost:3000/demo-luong`): chạy ca chuẩn phần 1 → sửa một ô → chạy phần 2 → thấy "Phiên 2 nói khác" hoặc ô giữ giá trị bác sĩ, rev tăng; Duyệt → ghi phiên 3 → phiếu về nháp; ca bị chặn → ô ③ đỏ, ④⑤ "Không gửi AI"; ca chưa đồng ý → dòng đồng ý ✗ và nhãn local; chuyển chế độ Kỹ thuật xem đủ panel; "+ Phiếu khám mới" ra phiếu rev mới, sessions rỗng; khung 375px. Không có lỗi console. Chụp màn hình cả hai chế độ.
- [ ] **Step 4: Nếu backend STT chạy** (`npm run stt:start`): một lượt micro; nếu không, ghi "chưa thử micro" vào CHANGELOG.
- [ ] **Step 5: CHANGELOG + commit** `feat(demo-luong): màn demo hai chế độ xem`.

### Task 8: Tài liệu và đo

**Files:**
- Modify: `README.md` (trang mới, cấu trúc thư mục, lệnh), `docs/CLINICAL-WORKFLOW.md` (mục demo luồng, phân biệt với eForm), `docs/cau-truc-du-an.md`, `docs/superpowers/plans/PRIORITIES.md` (đưa plan này vào bảng), `docs/CHANGELOG.md`

- [ ] **Step 1:** Chạy `npm test`, `npm run lint`, `npm run build`, `npm run eval -- --rule-only` (đường cũ không đổi điểm) → ghi kết quả.
- [ ] **Step 2:** Bảng đo PII trên 3 kịch bản (số mục phải che / đã che / che thừa) vào CHANGELOG.
- [ ] **Step 3:** `node .gitnexus/run.cjs detect-changes --scope all --repo .` → không `partial`/`truncated`; ghi tóm tắt.
- [ ] **Step 4:** Cập nhật tài liệu, chuyển plan này khỏi `pending/` nếu đã nghiệm thu, commit `docs(demo-luong): tài liệu và số đo`.
