"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { luuLuotThu, luuThoiQuen } from "@/client/api";
import { BanIn } from "@/client/eform/BanIn";
import { BaoCaoDialog } from "@/client/eform/BaoCaoDialog";
import { ChiDinhTab } from "@/client/eform/ChiDinhTab";
import { DonThuocTab } from "@/client/eform/DonThuocTab";
import { EformContext, MO_PHONG, type EformApi } from "@/client/eform/EformContext";
import { EformForm } from "@/client/eform/EformForm";
import { EformHeader } from "@/client/eform/EformHeader";
import { BTN_CHINH, BTN_OUTLINE, BcytTag, SourceBadge, anchorId } from "@/client/eform/fields";
import { splitCodes } from "@/client/eform/IcdField";
import { TroLyAi, type TabId } from "@/client/eform/TroLyAi";
import { dienPhieu, gopTruongMoi, type DongChiDinh, type DongThuoc, type KetQuaDien } from "@/shared/eform/dien-phieu";
import { demLuot } from "@/shared/eform/do-luong";
import { demChoTrong } from "@/shared/eform/mau-cau";
import { icdTheoMau, type PhieuMau } from "@/shared/eform/phieu-mau";
import { chiGiuCot, COT_CHI_DINH, COT_THUOC, ghepGoiY, goiYThoiQuen, hayKe, nhuMoiKhi } from "@/shared/eform/thoi-quen";
import type { EformData, KichBan, Nguon, Truong } from "@/shared/eform/types";
import type { PipelineResult } from "@/shared/api";
import type { InputMode } from "@/shared/metrics";

const TRANG_THAI_NOI_SOI = "Chờ KQ CLS";
/** Trạng thái này khóa phiếu (chỉ đọc); chọn lại trạng thái khác để sửa tiếp */
const TRANG_THAI_HOAN_THANH = "Hoàn thành khám";
const KHONG_CHI_DINH: DongChiDinh[] = [];
const KHONG_THUOC: DongThuoc[] = [];
const EMPTY: Truong = { value: "", nguon: null };
/** Chiều cao header và thanh dưới đáy (màn rộng), để cột Trợ lý AI ghim vừa khoảng giữa */
const KHUNG = { "--cao-dau": "5.75rem", "--cao-day": "5.75rem" } as CSSProperties;

const TABS: { id: TabId; nhan: string }[] = [
  { id: "phieu", nhan: "Phiếu khám" },
  { id: "chi_dinh", nhan: "Chỉ định dịch vụ" },
  { id: "don_thuoc", nhan: "Đơn thuốc" },
];

/** Số dòng chỉ định, thuốc AI đã thêm (cộng dồn qua các lần điền) và số dòng khớp chắc danh mục lúc thêm */
interface DongAi {
  tong: number;
  khop: number;
}

interface BanChup {
  fields: Record<string, Truong>;
  chiDinh: DongChiDinh[];
  donThuoc: DongThuoc[];
  ketQua: KetQuaDien | null;
  dongAi: DongAi;
}

/** Một lượt thử: từ lúc bắt đầu nói, gõ hoặc nạp câu mẫu đến lần bấm Lưu đầu tiên sau khi AI điền */
interface Luot {
  batDau: number | null;
  kieuNhap: InputMode;
  tuCaMau: boolean;
  provider: string;
  /** Phiếu mẫu đã gọi gần nhất trong lượt */
  mauId: string | null;
  /** Đã ghi số đo; muốn thử lượt mới thì tải lại trang */
  daGhi: boolean;
}

function initFields(values: Record<string, string>): Record<string, Truong> {
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, { value, nguon: value ? ("cu" as const) : null }]),
  );
}

/** Sửa tay vào dữ liệu cũ hoặc phần AI thêm thì chuyển thành "Đã sửa" */
function afterEdit(nguon: Nguon | null | undefined): Nguon {
  return nguon === "cu" || nguon === "ai" || nguon === "xem" || nguon === "sua" ? "sua" : "bs";
}

/** Bác sĩ có thể nói nhiều lần: chỉ lấy dòng mới chưa trùng mã (hoặc tên khi chưa có mã) với các dòng đã có */
function dongMoi<T extends { ma: string; ten: string }>(cu: T[], moi: T[]): T[] {
  const khoa = (row: T) => row.ma || row.ten.toLowerCase();
  const daCo = new Set(cu.map(khoa));
  return moi.filter((row) => !daCo.has(khoa(row)));
}

/** Gộp danh sách trường AI đã điền qua các lần; lần mới ghi đè lần cũ */
function gopKetQua(cu: KetQuaDien | null, moi: KetQuaDien): KetQuaDien {
  if (!cu) return moi;
  const idMoi = new Set(moi.daDien.map((item) => item.id));
  return { ...moi, daDien: [...moi.daDien, ...cu.daDien.filter((item) => !idMoi.has(item.id))] };
}

function nowText(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Trạng thái lúc mở phiếu. Trang /trinh-dien truyền kichBan: kiểu 1 mở ra đã có nháp AI (server đổ sẵn),
 * kiểu 2 và 3 đã chọn sẵn chẩn đoán; kiểu 2 mở thẳng tab Đơn thuốc.
 */
function trangThaiDau(data: EformData, kichBan?: KichBan) {
  const fields = initFields(data.ca.gia_tri);
  const td = data.trinhDien;
  if (td && (kichBan === 2 || kichBan === 3)) {
    const ten = data.icd10.find((item) => item.ma === td.icd)?.ten ?? "";
    fields.icd_ra_vien = { value: td.icd, nguon: "bs" };
    fields.mo_ta_ra_vien = { value: ten, nguon: "bs" };
  }
  if (td && kichBan === 1) {
    const kq = td.phieuMau;
    const them = [...kq.chiDinh, ...kq.donThuoc];
    return {
      fields: { ...fields, ...kq.truong },
      chiDinh: kq.chiDinh,
      donThuoc: kq.donThuoc,
      ketQua: kq,
      dongAi: { tong: them.length, khop: them.filter((row) => row.nguon === "ai").length },
      tab: "phieu" as TabId,
    };
  }
  return { fields, chiDinh: KHONG_CHI_DINH, donThuoc: KHONG_THUOC, ketQua: null, dongAi: { tong: 0, khop: 0 }, tab: (kichBan === 2 ? "don_thuoc" : "phieu") as TabId };
}

export function EformScreen({ data, kichBan }: { data: EformData; kichBan?: KichBan }) {
  const [dau] = useState(() => trangThaiDau(data, kichBan));
  const [fields, setFields] = useState(dau.fields);
  const [chiDinh, setChiDinh] = useState(dau.chiDinh);
  const [donThuoc, setDonThuoc] = useState(dau.donThuoc);
  // Dữ liệu lúc Lưu gần nhất (ban đầu là lúc mở phiếu); khác tham chiếu nghĩa là có thay đổi chưa Lưu
  const [banLuu, setBanLuu] = useState(() => ({ fields, chiDinh, donThuoc }));
  const [ketQua, setKetQua] = useState<KetQuaDien | null>(dau.ketQua);
  const [banChup, setBanChup] = useState<BanChup | null>(null);
  const [dongAi, setDongAi] = useState<DongAi>(dau.dongAi);
  const [luot, setLuot] = useState<Luot>({
    batDau: null,
    kieuNhap: "go",
    tuCaMau: false,
    provider: data.provider,
    mauId: null,
    daGhi: false,
  });
  const [tab, setTab] = useState<TabId>(dau.tab);
  // Một lượt mở phiếu là một lần kê: Lưu lại nhiều lần thì server ghi đè, không đếm thêm vào thói quen
  const [idLuotKham] = useState(() => crypto.randomUUID());
  const [trangThai, setTrangThai] = useState(data.ca.trang_thai);
  const [lastEdit, setLastEdit] = useState(data.ca.chinh_sua_cuoi);
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }, []);

  const api = useMemo<EformApi>(
    () => ({
      data,
      notify,
      get: (id) => fields[id] ?? EMPTY,
      edit: (id, value) =>
        setFields((prev) => ({ ...prev, [id]: { value, nguon: afterEdit(prev[id]?.nguon) } })),
      put: (id, value, nguon) => setFields((prev) => ({ ...prev, [id]: { value, nguon } })),
      append: (id, text, nguon) =>
        setFields((prev) => {
          const current = prev[id]?.value ?? "";
          return {
            ...prev,
            [id]: { value: current ? `${current}\n${text}` : text, nguon: nguon ?? afterEdit(prev[id]?.nguon) },
          };
        }),
    }),
    [data, fields, notify],
  );

  /** "Kê như mọi khi": các dòng bác sĩ hay kê cho chẩn đoán chính (trên phiếu, chưa có thì mã AI vừa gán) */
  const dongQuen = (kq: KetQuaDien) => {
    const icd =
      splitCodes(api.get("icd_ra_vien").value)[0] ??
      splitCodes(api.get("icd_ban_dau").value)[0] ??
      splitCodes(kq.truong.icd_ra_vien?.value ?? "")[0];
    const quen = icd ? goiYThoiQuen([icd], data.thoiQuen, data.danhMuc)[0] : undefined;
    if (!quen) return { icd, chiDinh: [], donThuoc: [] };
    const lay = <T extends { ma: string; ten: string }>(rows: T[]) => rows.filter((row) => hayKe(quen, row)).map((row) => ({ ...row, tu_ai: true }));
    return { icd, chiDinh: lay(quen.chiDinh), donThuoc: lay(quen.donThuoc) };
  };

  const aiDien = (result: PipelineResult, text: string, mau?: PhieuMau) => {
    const kq = mau
      ? dienPhieu(result.draft, result.matches, data, api.get, { chiOTrong: true, icd: icdTheoMau(mau, result.draft) })
      : dienPhieu(result.draft, result.matches, data, api.get);
    if (mau?.khamKhac) {
      // Ô Khám các bộ phận khác không có trong schema LLM: lấy thẳng từ mẫu, chỉ khi ô đang trống
      const nhan = "Khám các bộ phận khác";
      if (api.get("kham_khac").value.trim()) kq.boQua.push(nhan);
      else {
        const nguon = demChoTrong(mau.khamKhac) > 0 ? "xem" : "ai";
        kq.truong.kham_khac = { value: mau.khamKhac, nguon };
        kq.daDien.push({ id: "kham_khac", nhan, nguon });
      }
    }
    const quen = nhuMoiKhi(text) ? dongQuen(kq) : null;
    // Dòng quen đứng trước, dòng AI tách từ câu nói thêm vào sau; trùng mã hay tên thì bỏ
    const quenChiDinh = dongMoi(chiDinh, quen?.chiDinh ?? []);
    const quenThuoc = dongMoi(donThuoc, quen?.donThuoc ?? []);
    const themChiDinh = [...quenChiDinh, ...dongMoi([...chiDinh, ...quenChiDinh], kq.chiDinh)];
    const themThuoc = [...quenThuoc, ...dongMoi([...donThuoc, ...quenThuoc], kq.donThuoc)];
    const them = [...themChiDinh, ...themThuoc];
    setBanChup({ fields, chiDinh, donThuoc, ketQua, dongAi });
    // fields, chiDinh, donThuoc ở đây là lúc gửi; bác sĩ sửa gì trong lúc chờ AI thì giữ phần đó
    setFields((prev) => gopTruongMoi(prev, fields, kq.truong));
    setChiDinh((prev) => [...prev, ...dongMoi(prev, themChiDinh)]);
    setDonThuoc((prev) => [...prev, ...dongMoi(prev, themThuoc)]);
    setKetQua((prev) => gopKetQua(prev, kq));
    setDongAi({ tong: dongAi.tong + them.length, khop: dongAi.khop + them.filter((row) => row.nguon === "ai").length });
    setLuot((prev) => ({ ...prev, provider: result.provider, mauId: mau?.id ?? prev.mauId }));
    setTab("phieu");
    const ghiChuQuen = !quen
      ? ""
      : quenChiDinh.length + quenThuoc.length > 0
        ? ` Đã lấy ${quenThuoc.length} thuốc, ${quenChiDinh.length} chỉ định anh/chị hay kê cho ${quen.icd}.`
        : ` Chưa có đơn anh/chị đã kê cho ${quen.icd ?? "chẩn đoán này"} nên chưa lấy được bộ quen.`;
    if (mau) {
      const choTrong = Object.values(kq.truong).reduce((tong, o) => tong + demChoTrong(o.value), 0);
      notify(
        `Đã điền theo mẫu ${mau.ten}: ${kq.daDien.length} ô, ${themChiDinh.length} chỉ định, ${themThuoc.length} thuốc.` +
          (kq.boQua.length > 0 ? ` Bỏ qua ${kq.boQua.length} ô đã có chữ.` : "") +
          (choTrong > 0 ? ` Còn ${choTrong} chỗ cần điền (tô vàng).` : "") +
          ghiChuQuen,
      );
      return;
    }
    notify(`AI đã điền ${kq.daDien.length} trường, ${themChiDinh.length} chỉ định, ${themThuoc.length} thuốc.${ghiChuQuen}`);
  };

  const hoanTac = () => {
    if (!banChup) return;
    setFields(banChup.fields);
    setChiDinh(banChup.chiDinh);
    setDonThuoc(banChup.donThuoc);
    setKetQua(banChup.ketQua);
    setDongAi(banChup.dongAi);
    setBanChup(null);
    notify("Đã hoàn tác lần AI điền.");
  };

  const goTo = (id: string) => {
    setTab("phieu");
    // Đợi tab phiếu khám hiện ra rồi mới cuộn và đặt con trỏ vào ô
    setTimeout(() => {
      const el = document.getElementById(anchorId(id));
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLElement>("textarea, select, input")?.focus({ preventScroll: true });
    }, 50);
  };

  const chuaLuu = fields !== banLuu.fields || chiDinh !== banLuu.chiDinh || donThuoc !== banLuu.donThuoc;
  const khoa = trangThai === TRANG_THAI_HOAN_THANH;

  const changeStatus = (next: string) => {
    if (next === TRANG_THAI_HOAN_THANH && chuaLuu) {
      notify("Phiếu còn thay đổi chưa Lưu. Bấm Lưu trước khi chọn Hoàn thành khám.");
      return;
    }
    setTrangThai(next);
    if (next !== TRANG_THAI_NOI_SOI && fields.chuyen_noi_soi?.value) api.put("chuyen_noi_soi", "", null);
  };

  const conXem =
    Object.values(fields).filter((f) => f.nguon === "xem").length +
    [...chiDinh, ...donThuoc].filter((row) => row.nguon === "xem").length;

  const batDauNhap = (kieuNhap: InputMode, tuCaMau: boolean) =>
    setLuot((prev) =>
      prev.daGhi
        ? prev
        : {
            ...prev,
            batDau: prev.batDau ?? Date.now(),
            kieuNhap: prev.kieuNhap === "noi" ? "noi" : kieuNhap,
            tuCaMau: prev.tuCaMau || tuCaMau,
          },
    );

  /** Ghi số đo lượt thử vào data/sessions/ (chỉ số đếm), hiện ở trang Kết quả thử nghiệm. Trả câu báo thêm */
  const ghiLuot = async (): Promise<string> => {
    if (!ketQua) return "";
    if (luot.daGhi) return "";
    try {
      await luuLuotThu({
        kieu_nhap: luot.kieuNhap,
        tu_ca_mau: luot.tuCaMau,
        ca_mau_id: luot.tuCaMau ? data.cauMau.id : null,
        mau_id: luot.mauId,
        provider: luot.provider,
        thoi_gian_giay: luot.batDau === null ? 0 : Math.round((Date.now() - luot.batDau) / 100) / 10,
        ...demLuot(fields, ketQua.daDien, dongAi.tong, chiDinh, donThuoc, data.danhMuc.thuoc, data.ca.canh_bao_di_ung),
        so_muc_danh_muc: dongAi.tong,
        so_muc_khop: dongAi.khop,
        so_muc_khong_khop: dongAi.tong - dongAi.khop,
      });
      setLuot((prev) => ({ ...prev, daGhi: true }));
      return "";
    } catch {
      return " Chưa ghi được số đo lượt thử, hãy bấm Lưu lại.";
    }
  };

  /** Ghi đơn và chỉ định theo chẩn đoán chính vào thói quen của tài khoản đang đăng nhập. Trả câu báo thêm */
  const ghiThoiQuen = async (): Promise<string> => {
    const icdChinh = splitCodes(api.get("icd_ra_vien").value)[0] ?? splitCodes(api.get("icd_ban_dau").value)[0];
    if (!icdChinh || chiDinh.length + donThuoc.length === 0) return "";
    try {
      await luuThoiQuen({
        tai_khoan: data.ca.dang_nhap,
        don: {
          id: idLuotKham,
          icd_chinh: icdChinh,
          chi_dinh: chiDinh.map((row) => chiGiuCot(row, COT_CHI_DINH)),
          don_thuoc: donThuoc.map((row) => chiGiuCot(row, COT_THUOC)),
          loi_dan: api.get("loi_dan").value,
        },
      });
      return "";
    } catch {
      return " Chưa ghi được đơn vào gợi ý theo thói quen.";
    }
  };

  const save = async () => {
    setLastEdit({ nguoi: data.ca.dang_nhap, luc: nowText() });
    setBanLuu({ fields, chiDinh, donThuoc });
    if (data.trinhDien) {
      notify("Đã lưu (trình diễn: không ghi số đo hay đơn đã kê).");
      return;
    }
    const ghiChu = (await ghiLuot()) + (await ghiThoiQuen());
    notify("Đã lưu." + ghiChu);
  };

  const soDong = { chi_dinh: chiDinh.length, don_thuoc: donThuoc.length, phieu: 0 };
  // Có gợi ý khớp chẩn đoán (đơn đã kê hoặc bộ mẫu) thì đánh dấu ✨ trên tab, để bác sĩ đang ở phiếu khám biết
  const boMau = ghepGoiY(
    [...new Set(["icd_ra_vien", "icd_ban_dau", "icd_kem_theo"].flatMap((id) => splitCodes(api.get(id).value)))],
    data,
  ).map((item) => item.mau);
  const coGoiY = {
    phieu: false,
    chi_dinh: boMau.some((mau) => mau.chiDinh.length > 0),
    don_thuoc: boMau.some((mau) => mau.donThuoc.length > 0),
  };

  return (
    <EformContext.Provider value={api}>
      <div className="flex flex-1 flex-col bg-ef-nen text-sm text-ef-chu print:hidden" style={KHUNG}>
        <EformHeader lastEdit={lastEdit} expanded={expanded} onToggleExpand={() => setExpanded((open) => !open)} />

        <div className={`mx-auto grid w-full flex-1 items-start gap-5 px-4 pb-8 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] ${expanded ? "" : "max-w-[90rem]"}`}>
          <main className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-ef-vien">
              <div>
                <h1 className="text-xl font-semibold text-ef-dam">Phiếu khám ngoại trú</h1>
                <div role="tablist" className="mt-2 flex flex-wrap gap-1">
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.id}
                      onClick={() => setTab(item.id)}
                      className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ef-xanh ${
                        tab === item.id ? "border-ef-xanh font-semibold text-ef-dam" : "border-transparent text-ef-phu hover:text-ef-dam"
                      }`}
                    >
                      {item.nhan}
                      {coGoiY[item.id] && (
                        <span className="text-tim" title="Có gợi ý theo chẩn đoán">
                          ✨
                        </span>
                      )}
                      {item.id !== "phieu" && soDong[item.id] > 0 && (
                        <span className="rounded-full bg-tim px-1.5 text-[11px] font-semibold leading-[18px] text-white">{soDong[item.id]}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {tab === "phieu" && (
                <div className="flex flex-wrap items-center gap-1.5 pb-2.5 text-xs text-ef-phu">
                  <span>Chú giải:</span>
                  <SourceBadge nguon="ai" />
                  <SourceBadge nguon="xem" />
                  <SourceBadge nguon="sua" />
                  <BcytTag />
                </div>
              )}
            </div>

            {khoa && (
              <p role="status" className="rounded-lg border border-ef-vien bg-white px-4 py-2.5 text-[13px] text-ef-chu">
                🔒 Lượt khám đã <strong>Hoàn thành khám</strong>, phiếu chỉ đọc. Muốn sửa, chọn lại trạng thái <strong>Đang khám</strong>.
              </p>
            )}

            {/* fieldset disabled khóa mọi ô nhập và nút bên trong khi phiếu đã hoàn thành */}
            <fieldset disabled={khoa} className="contents">
              {tab === "phieu" && <EformForm noiSoiEnabled={trangThai === TRANG_THAI_NOI_SOI} />}
              {tab === "chi_dinh" && <ChiDinhTab rows={chiDinh} onChange={setChiDinh} />}
              {tab === "don_thuoc" && <DonThuocTab rows={donThuoc} onChange={setDonThuoc} />}
            </fieldset>
          </main>

          <fieldset disabled={khoa} className="contents">
            <TroLyAi
              ketQua={ketQua}
              onDien={aiDien}
              onBatDau={batDauNhap}
              onHoanTac={banChup ? hoanTac : null}
              onGoTo={goTo}
              onOpenTab={setTab}
              soChiDinh={chiDinh.length}
              soThuoc={donThuoc.length}
              vanBanDau={kichBan === 3 ? data.trinhDien?.lenh : undefined}
              hoiThoai={kichBan === 4 ? data.trinhDien?.hoiThoai : undefined}
            />
          </fieldset>
        </div>

        {toast && (
          <div role="status" className="fixed bottom-20 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-lg bg-ef-dam px-4 py-2.5 text-sm text-white shadow-lg">
            {toast}
          </div>
        )}

        {/* Thanh đáy 2 tầng như EMR: dải trạng thái lượt khám, rồi hàng nút thao tác. Ghim ở mọi khổ màn */}
        <div className="sticky bottom-0 z-30 border-t border-ef-vien bg-white/95 shadow-[0_-2px_8px_rgba(26,37,51,0.06)] backdrop-blur">
          <div className="border-b border-ef-vien/70 bg-ef-nen/70">
            <div
              role="radiogroup"
              aria-label="Trạng thái lượt khám"
              className="mx-auto flex gap-1.5 overflow-x-auto px-4 py-1.5 sm:flex-wrap sm:justify-center sm:px-6"
            >
              {data.tuyChon.trang_thai.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={trangThai === item}
                  onClick={() => changeStatus(item)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ef-xanh ${
                    trangThai === item
                      ? "border-ef-xanh bg-ef-xanh font-semibold text-white"
                      : "border-ef-vien bg-white text-ef-chu hover:border-ef-phu/50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto flex items-center gap-1.5 px-4 py-2 sm:gap-2 sm:px-6">
            <button
              type="button"
              aria-label="Quay lại"
              className={`${BTN_OUTLINE} whitespace-nowrap`}
              onClick={() => notify(MO_PHONG)}
            >
              ←<span className="hidden sm:inline"> Quay lại</span>
            </button>
            <button type="button" className={`${BTN_OUTLINE} whitespace-nowrap`} onClick={() => setShowReport(true)}>
              Báo cáo y tế
            </button>
            <button type="button" className={`${BTN_OUTLINE} whitespace-nowrap`} onClick={() => window.print()} title="In phiếu khám, chỉ định và đơn thuốc">
              In ngay
            </button>
            <button type="button" className={`${BTN_CHINH} ml-auto inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap sm:max-w-sm`} onClick={save}>
              Lưu
              {conXem > 0 && (
                <span className="rounded-full bg-xem-nhat px-2 py-px text-[11px] font-semibold text-xem" title="Số chỗ AI chưa chắc, bác sĩ nên xem lại trước khi Lưu">
                  {conXem} cần xem lại
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Lên đầu trang"
              className={BTN_OUTLINE}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              ↑
            </button>
          </div>
        </div>

        {showReport && <BaoCaoDialog onClose={() => setShowReport(false)} />}
      </div>

      <BanIn chiDinh={chiDinh} donThuoc={donThuoc} trangThai={trangThai} />
    </EformContext.Provider>
  );
}
