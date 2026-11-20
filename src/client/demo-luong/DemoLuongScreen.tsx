"use client";

import { useEffect, useRef, useState } from "react";
import { getPatient } from "@/client/clinic/api";
import { docPhieu, duyetPhieu, listKichBan, luuBanSua, streamDemoFlow, taoPhieu, xoaDuLieuDemo } from "@/client/demo-luong/api";
import type { ClinicalExtraction } from "@/shared/clinical/api";
import { isDemoError, type DemoEvent, type DemoPhieu, type DemoStep, type KichBanTomTat } from "@/shared/demo-luong/types";
import { BUOC, BUOC_TRONG, type BuocView, type CheDo, type SuKienLuot } from "./hien-thi";
import { DemoPhieuPanel } from "./DemoPhieuPanel";
import { NguonPicker, type Nguon, type WavSan } from "./NguonPicker";
import { SessionBar } from "./SessionBar";
import { StepRail } from "./StepRail";
import { TechDetails } from "./TechDetails";
import { BanSachPanel, BanThoPanel, type BanSachView, type BanThoView } from "./TranscriptPanels";
import { ThanhTren, type BenhNhanGia } from "./ThanhTren";

/** Phiếu đang mở, để tải lại trang vẫn về đúng phiếu (bản thô thì mất, đúng thiết kế). Chỉ mã phiếu và mã bệnh nhân giả. */
const KHOA_PHIEU = "demo-luong:phieu";
type PhieuDaMo = { id: string; benhNhan: string };

function docPhieuDaMo(): PhieuDaMo | null {
  try { const v = JSON.parse(sessionStorage.getItem(KHOA_PHIEU) ?? "null") as PhieuDaMo | null; return v?.id && v.benhNhan ? v : null; }
  catch { return null; }
}
function ghiPhieuDaMo(v: PhieuDaMo) {
  try { sessionStorage.setItem(KHOA_PHIEU, JSON.stringify(v)); } catch { /* trình duyệt chặn lưu tạm: bỏ qua */ }
}

/** Cập nhật trạng thái năm ô theo một sự kiện. */
function apSuKien(steps: Record<DemoStep, BuocView>, e: DemoEvent): Record<DemoStep, BuocView> {
  const next = { ...steps };
  const i = BUOC.findIndex(b => b.id === e.buoc);
  next[e.buoc] = { trang_thai: e.trang_thai === "loi" ? "loi" : e.trang_thai === "bi_chan" ? "bi_chan" : "xong", ms: e.ms };
  if (e.trang_thai === "xong" && i + 1 < BUOC.length) next[BUOC[i + 1].id] = { trang_thai: "dang", ms: null };
  if (e.trang_thai === "bi_chan") { next.ai = { trang_thai: "bo_qua", ms: null }; next.luu = { trang_thai: "bo_qua", ms: null }; }
  return next;
}

const loiCua = (e: unknown, macDinh: string) => (e instanceof Error && e.message ? e.message : macDinh);

/** Màn /demo-luong: STT → bản thô → che PII tự động → AI (mock) → phiếu đã lưu; nhiều phiên trong một phiếu, bác sĩ chỉ duyệt. */
export function DemoLuongScreen() {
  const [cheDo, setCheDo] = useState<CheDo>("bac_si");
  const [kichBan, setKichBan] = useState<KichBanTomTat[]>([]);
  const [benhNhan, setBenhNhan] = useState<Record<string, BenhNhanGia>>({});
  const [benhNhanId, setBenhNhanId] = useState<string | null>(null);
  const [phieu, setPhieu] = useState<DemoPhieu | null>(null);
  const [nguon, setNguon] = useState<Nguon>("kich_ban");
  const [kbId, setKbId] = useState("");
  const [phan, setPhan] = useState<number | "tat_ca" | null>(null);
  const [wav, setWav] = useState<WavSan | null>(null);
  const [steps, setSteps] = useState(BUOC_TRONG);
  const [events, setEvents] = useState<SuKienLuot>({});
  const [dangChay, setDangChay] = useState(false);
  const [dangMo, setDangMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [mo, setMo] = useState<DemoStep | null>(null);
  const [dangXem, setDangXem] = useState<number | null>(null);
  const [banTho, setBanTho] = useState<Record<number, BanThoView>>({});
  const [banChay, setBanChay] = useState<Record<number, ClinicalExtraction>>({});
  const [thaoTac, setThaoTac] = useState(0);
  const [dangSua, setDangSua] = useState(false);
  const [luot, setLuot] = useState(0);
  const khoiTao = useRef(false);
  const dieuKhien = useRef<AbortController | null>(null);

  useEffect(() => () => dieuKhien.current?.abort(), []);

  function datLaiLuot() {
    setDangSua(false); setSteps(BUOC_TRONG); setEvents({}); setDangXem(null); setBanTho({}); setBanChay({}); setThaoTac(0); setMo(null); setWav(null);
  }

  async function moPhieuMoi(pid: string) {
    setDangMo(true); setLoi(null); setPhieu(null); datLaiLuot();
    try {
      const p = await taoPhieu(pid);
      setPhieu(p); setBenhNhanId(pid); ghiPhieuDaMo({ id: p.encounter_id, benhNhan: pid });
    } catch (e) { setLoi(loiCua(e, "Không tạo được phiếu demo.")); }
    finally { setDangMo(false); }
  }

  // Mở trang: đọc danh sách kịch bản, hồ sơ bệnh nhân giả (tên, cờ đồng ý), rồi mở lại phiếu cũ hoặc tạo phiếu đầu tiên.
  useEffect(() => {
    if (khoiTao.current) return;
    khoiTao.current = true;
    void (async () => {
      let ds: KichBanTomTat[] = [];
      try { ds = await listKichBan(); setKichBan(ds); }
      catch (e) { setLoi(loiCua(e, "Không đọc được danh sách kịch bản.")); return; }
      const ids = [...new Set(ds.map(k => k.benh_nhan_id))];
      void Promise.all(ids.map(async id => {
        try {
          // Hồ sơ giả có thêm `dong_y_xu_ly_ai` (schema tùy chọn), kiểu PatientProfile chưa khai báo nên đọc lỏng.
          const { patient } = await getPatient(id);
          const c = (patient as typeof patient & { dong_y_xu_ly_ai?: { trang_thai: boolean; luc: string } }).dong_y_xu_ly_ai;
          return [id, { id, ten: patient.full_name, dong_y: c ? { trang_thai: c.trang_thai, luc: c.luc } : null }] as const;
        } catch { return [id, { id, ten: id, dong_y: null }] as const; }
      })).then(rows => setBenhNhan(Object.fromEntries(rows)));
      const macDinh = ds.find(k => k.id === "ca-chuan") ?? ds[0];
      const cu = docPhieuDaMo();
      if (cu) {
        try {
          const p = await docPhieu(cu.id);
          setPhieu(p); setBenhNhanId(cu.benhNhan);
          setKbId((ds.find(k => k.benh_nhan_id === cu.benhNhan) ?? macDinh)?.id ?? "");
          return;
        } catch { /* phiếu đã bị xóa: tạo mới */ }
      }
      if (!macDinh) { setLoi("Chưa có kịch bản mẫu nào trong data/demo-luong/kich-ban/."); return; }
      setKbId(macDinh.id);
      await moPhieuMoi(macDinh.benh_nhan_id);
    })();
    // Chỉ chạy một lần khi mở trang (StrictMode gọi hai lần: khoiTao chặn lần sau).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kb = kichBan.find(k => k.id === kbId);
  const phanTuDong: number | "tat_ca" = kb?.phien.length ? kb.phien[Math.min(phieu?.sessions.length ?? 0, kb.phien.length - 1)] : "tat_ca";
  const phanChon = phan ?? phanTuDong;

  function chonBenhNhan(pid: string) {
    if (pid === benhNhanId) return;
    setThongBao(null);
    if (kb?.benh_nhan_id !== pid) setKbId(kichBan.find(k => k.benh_nhan_id === pid)?.id ?? "");
    setPhan(null);
    void moPhieuMoi(pid);
  }

  function chonKichBan(id: string) {
    setKbId(id); setPhan(null); setThongBao(null);
    const k = kichBan.find(x => x.id === id);
    // Kịch bản của bệnh nhân khác: API trả 409, nên mở phiếu mới cho đúng bệnh nhân đó thay vì báo lỗi.
    if (k && k.benh_nhan_id !== benhNhanId) {
      setThongBao(`Kịch bản này thuộc bệnh nhân giả ${benhNhan[k.benh_nhan_id]?.ten ?? k.benh_nhan_id}: đã mở phiếu khám mới cho bệnh nhân đó.`);
      void moPhieuMoi(k.benh_nhan_id);
    }
  }

  async function xoaDemo() {
    if (!benhNhanId || !window.confirm("Xóa toàn bộ dữ liệu demo (phiếu, phiên, lượt AI, nhật ký trong data/demo-luong/)? Kịch bản mẫu được giữ.")) return;
    try { await xoaDuLieuDemo(); setThongBao("Đã xóa dữ liệu demo."); await moPhieuMoi(benhNhanId); }
    catch (e) { setLoi(loiCua(e, "Không xóa được dữ liệu demo.")); }
  }

  async function ghiPhienMoi() {
    if (!phieu || dangChay) return;
    let input: Parameters<typeof streamDemoFlow>[1];
    if (nguon === "kich_ban") {
      if (!kb) return;
      input = { kichBan: kb.id, ...(phanChon === "tat_ca" ? {} : { phien: phanChon }) };
    } else {
      if (!wav) return;
      input = { wav: wav.blob };
    }
    const ctrl = new AbortController();
    dieuKhien.current = ctrl;
    setDangChay(true); setLoi(null); setThongBao(null); setDangXem(null); setEvents({}); setLuot(n => n + 1);
    setSteps({ ...BUOC_TRONG, stt: { trang_thai: "dang", ms: null } });
    let tho: BanThoView | null = null;
    let ai: ClinicalExtraction | null = null;
    let cuoi = false;
    try {
      await streamDemoFlow(phieu.encounter_id, input, e => {
        setEvents(ev => ({ ...ev, [e.buoc]: e }) as SuKienLuot);
        setSteps(s => apSuKien(s, e));
        if (e.trang_thai === "loi" || e.trang_thai === "bi_chan") cuoi = true;
        if (e.buoc === "ban_tho" && e.trang_thai === "xong") tho = { raw: e.du_lieu.raw, spans: e.du_lieu.spans, mode: e.du_lieu.mode };
        if (e.buoc === "ai" && e.trang_thai === "xong") ai = e.du_lieu.extraction;
        if (e.buoc === "luu") {
          cuoi = true;
          if (e.du_lieu.phieu) setPhieu(e.du_lieu.phieu);
          if (e.trang_thai === "xong") {
            const seq = e.du_lieu.audit.session_sequence;
            const t = tho, a = ai;
            if (t) setBanTho(m => ({ ...m, [seq]: t }));
            if (a) setBanChay(m => ({ ...m, [seq]: a }));
          }
        }
      }, ctrl.signal);
      if (!cuoi) setLoi("Luồng dừng giữa chừng, chưa có kết quả cuối.");
      if (nguon !== "kich_ban") setWav(null);
      setPhan(null);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setLoi(loiCua(e, "Không chạy được luồng demo."));
    } finally {
      setSteps(s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.trang_thai === "dang" ? { trang_thai: "cho", ms: null } : v])) as Record<DemoStep, BuocView>);
      if (dieuKhien.current === ctrl) dieuKhien.current = null;
      setDangChay(false);
    }
  }

  async function luuSua(fields: Record<string, string>): Promise<boolean> {
    if (!phieu) return false;
    try { setPhieu(await luuBanSua(phieu.encounter_id, phieu.revision, fields)); setThaoTac(n => n + 1); setLoi(null); return true; }
    catch (e) { setLoi(loiCua(e, "Không lưu được bản sửa.")); await docLai(phieu.encounter_id); return false; }
  }
  async function duyet(): Promise<boolean> {
    if (!phieu) return false;
    try { setPhieu(await duyetPhieu(phieu.encounter_id, phieu.revision)); setThaoTac(n => n + 1); setLoi(null); return true; }
    catch (e) { setLoi(loiCua(e, "Không duyệt được phiếu demo.")); await docLai(phieu.encounter_id); return false; }
  }
  /** Lưu/duyệt lỗi (thường là 409 vì revision đã đổi): đọc lại phiếu để lần bấm sau dùng đúng revision, giữ thông báo lỗi. */
  async function docLai(id: string) {
    try { setPhieu(await docPhieu(id)); } catch { /* giữ bản đang có */ }
  }

  // Hai cột giữa: phiên đang chọn trên thanh phiên, hoặc lượt vừa chạy.
  const xemPhien = dangXem !== null ? phieu?.sessions.find(s => s.sequence === dangXem) : undefined;
  const evTho = events.ban_tho && !isDemoError(events.ban_tho) ? events.ban_tho : null;
  const evChe = events.che && !isDemoError(events.che) ? events.che : null;
  const tho: BanThoView | null = xemPhien ? banTho[xemPhien.sequence] ?? null : evTho && { raw: evTho.du_lieu.raw, spans: evTho.du_lieu.spans, mode: evTho.du_lieu.mode };
  const sach: BanSachView | null = xemPhien
    ? { clean: xemPhien.clean, counts: xemPhien.counts, gate: { passed: true, reasons: [] }, tuChe: (xemPhien.auto_masked ?? []).map(reason => ({ reason })) }
    : evChe && { clean: evChe.du_lieu.clean, counts: evChe.du_lieu.counts, gate: evChe.du_lieu.gate, tuChe: evChe.du_lieu.auto_masked ?? [] };
  const thoGhiChu = xemPhien && !banTho[xemPhien.sequence]
    ? `Bản thô của phiên ${xemPhien.sequence} không còn: chỉ giữ trong bộ nhớ trình duyệt và đã mất khi tải lại trang. Bản đã che bên cạnh đọc lại từ kho.`
    : undefined;
  const dongY = evChe?.du_lieu.dong_y ?? (benhNhanId ? benhNhan[benhNhanId]?.dong_y ?? null : null);
  const khoaGhi = !phieu || dangMo || dangSua || (nguon === "kich_ban" ? !kb : !wav);
  const lyDoKhoa = dangSua
    ? "Đang sửa phiếu: bấm “Lưu bản sửa” hoặc “Hủy” trước khi ghi phiên mới."
    : nguon !== "kich_ban" && !wav ? (nguon === "micro" ? "Thu âm xong rồi bấm “▶ Ghi phiên mới”." : "Chọn một file WAV trước.") : null;
  const benhNhanDs = [...new Set(kichBan.map(k => k.benh_nhan_id))].map(id => benhNhan[id] ?? { id, ten: id, dong_y: null });

  return (
    <main className="flex-1 bg-ef-nen text-ef-chu">
      <div className="mx-auto max-w-[1500px] space-y-3 px-4 py-4">
        <ThanhTren
          cheDo={cheDo} onCheDo={c => { setCheDo(c); if (c === "bac_si") setMo(null); }}
          benhNhan={benhNhanDs} benhNhanId={benhNhanId} onBenhNhan={chonBenhNhan}
          dongY={dongY} khoa={dangChay || dangMo}
          onPhieuMoi={() => benhNhanId && void moPhieuMoi(benhNhanId)} onXoa={() => void xoaDemo()}
        />
        <NguonPicker
          nguon={nguon} onNguon={n => { setNguon(n); setWav(null); }}
          kichBan={kichBan} kbId={kbId} onKichBan={chonKichBan} benhNhan={benhNhan}
          phan={phanChon} onPhan={setPhan} wav={wav} onWav={setWav} khoa={dangChay || dangMo}
        />
        {cheDo === "bac_si" && (
          <p className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-[17px] font-semibold text-on-accent">
            🔒 Thông tin định danh không rời máy chủ bệnh viện
            <span className="ml-2 text-sm font-normal text-ef-phu">Máy chủ tự che trước khi đưa cho AI; bác sĩ chỉ duyệt phiếu.</span>
          </p>
        )}
        <StepRail steps={steps} events={events} cheDo={cheDo} open={mo} onToggle={id => setMo(m => (m === id ? null : id))} />
        {cheDo === "ky_thuat" && mo && <TechDetails step={mo} events={events} phieu={phieu} />}
        <SessionBar
          sessions={phieu?.sessions ?? []} dangXem={dangXem} coBanTho={seq => !!banTho[seq]} onChon={setDangXem}
          onGhi={() => void ghiPhienMoi()} dangChay={dangChay} khoaGhi={khoaGhi} lyDoKhoa={lyDoKhoa}
        />
        {thongBao && <p role="status" className="rounded-md border border-ef-xanh/40 bg-ef-xanh-nhat px-3 py-2 text-[13px] text-ef-dam">{thongBao}</p>}
        {loi && <p role="alert" className="rounded-md border border-ef-do/40 bg-ef-do-nhat px-3 py-2 text-[13px] text-ef-do">{loi}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <BanThoPanel data={tho} ghiChu={thoGhiChu} cheDo={cheDo} />
          <BanSachPanel data={sach} animKey={`${luot}-${dangXem ?? "luot"}`} cheDo={cheDo} />
          <DemoPhieuPanel
            key={phieu?.encounter_id ?? "trong"} phieu={phieu} cheDo={cheDo} thaoTac={thaoTac} banChay={banChay}
            onLuu={luuSua} onDuyet={duyet} dangGhi={dangChay} onDangSua={setDangSua}
          />
        </div>
      </div>
    </main>
  );
}
