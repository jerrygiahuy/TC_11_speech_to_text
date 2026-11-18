"use client";

import { useEffect, useRef, useState } from "react";
import { MicButton, type GiaoDienMic } from "@/client/chung/MicButton";
import { useEform } from "@/client/eform/EformContext";
import { BTN_OUTLINE } from "@/client/eform/fields";
import type { KetQuaDien } from "@/shared/eform/dien-phieu";
import { goiAiDienNhap } from "@/client/api";
import { goiYTenMau, ketQuaTheoQuyTac, timPhieuMau, type PhieuMau } from "@/shared/eform/phieu-mau";
import type { PipelineResult } from "@/shared/api";
import { suaChu } from "@/shared/giong-noi/sua-chu";
import type { InputMode } from "@/shared/metrics";

export type TabId = "phieu" | "chi_dinh" | "don_thuoc";

interface Props {
  ketQua: KetQuaDien | null;
  /** Mỗi lần AI điền: trả kết quả và đoạn chữ đã gửi để màn hình áp vào phiếu; gọi phiếu mẫu thì kèm mẫu */
  onDien: (result: PipelineResult, text: string, mau?: PhieuMau) => void;
  /** Bác sĩ bắt đầu nói, gõ hoặc nạp câu mẫu: mốc tính thời gian lượt thử */
  onBatDau: (kieuNhap: InputMode, tuCaMau: boolean) => void;
  onHoanTac: (() => void) | null;
  onGoTo: (id: string) => void;
  onOpenTab: (tab: TabId) => void;
  soChiDinh: number;
  soThuoc: number;
  /** Trang trình diễn kiểu 3: ô nhập có sẵn câu lệnh */
  vanBanDau?: string;
  /** Trang trình diễn kiểu 4: hội thoại giả, phát lại từng câu như máy đang nghe */
  hoiThoai?: { ai: "BS" | "BN"; cau: string }[];
}

/** Khoảng cách giữa hai câu khi phát lại hội thoại mẫu */
const NHIP_HOI_THOAI_MS = 1400;

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tim";
const NUT_CHINH = `w-full rounded-lg bg-tim py-2.5 text-sm font-semibold text-white hover:bg-tim/90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
const NUT_PHU = `w-full rounded-lg border border-tim-vien bg-white py-2.5 text-sm font-semibold text-tim hover:bg-tim-nhat disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
const NUT_CHU = "text-xs font-medium text-tim underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline";

const BUOC = ["Nói hoặc gõ", "AI điền", "Duyệt, Lưu"];

/** Thanh 3 bước: bước đang làm tô tím, bước đã qua có dấu ✓ */
function CacBuoc({ hienTai, xong }: { hienTai: number; xong: boolean }) {
  return (
    <ol className="flex items-center gap-1.5 text-xs" aria-label="Các bước">
      {BUOC.map((nhan, i) => {
        const so = i + 1;
        const daQua = so < hienTai || (so === hienTai && xong);
        const dangLam = so === hienTai && !xong;
        return (
          <li key={nhan} className="flex min-w-0 flex-1 items-center gap-1.5" aria-current={dangLam ? "step" : undefined}>
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                daQua ? "bg-tim text-white" : dangLam ? "bg-tim-nhat text-tim ring-2 ring-tim" : "bg-ef-nen text-ef-phu ring-1 ring-ef-vien"
              }`}
            >
              {daQua ? "✓" : so}
            </span>
            <span className={`truncate ${dangLam ? "font-semibold text-ef-chu" : "text-ef-phu"}`}>{nhan}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Cột phải: bác sĩ nói hoặc gõ tắt một lần, AI điền cả phiếu khám, chỉ định và đơn thuốc */
export function TroLyAi({ ketQua, onDien, onBatDau, onHoanTac, onGoTo, onOpenTab, soChiDinh, soThuoc, vanBanDau, hoiThoai }: Props) {
  const { data, get, put } = useEform();
  const [text, setText] = useState(vanBanDau ?? "");
  /** Số câu hội thoại mẫu đã phát; null là chưa bấm phát */
  const [daPhat, setDaPhat] = useState<number | null>(null);
  const hen = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dangPhat = hoiThoai !== undefined && daPhat !== null && daPhat < hoiThoai.length;

  // Phát lại từng câu: mỗi nhịp thêm một dòng "BS: …" hoặc "BN: …" vào ô nhập
  useEffect(() => {
    if (!hoiThoai || daPhat === null || daPhat >= hoiThoai.length) return;
    hen.current = setTimeout(() => {
      const { ai, cau } = hoiThoai[daPhat];
      setText((cu) => (cu ? `${cu}\n${ai}: ${cau}` : `${ai}: ${cau}`));
      setDaPhat(daPhat + 1);
    }, daPhat === 0 ? 300 : NHIP_HOI_THOAI_MS);
    return () => clearTimeout(hen.current);
  }, [hoiThoai, daPhat]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Đoạn chữ của lần điền gần nhất, để biết bác sĩ đã nói hoặc gõ thêm chưa */
  const [daGui, setDaGui] = useState("");

  /** Mẫu bác sĩ gọi nhưng trùng tên nhiều mẫu: hiện nút để chọn */
  const [luaChon, setLuaChon] = useState<PhieuMau[] | null>(null);

  /** Đổ phiếu mẫu vào phiếu: chỉ có tên mẫu thì không gọi API, có chi tiết thì gọi AI một lần để thay chỗ trống */
  async function dungMau(mau: PhieuMau, chuDaGui: string, chiTiet = "") {
    setLuaChon(null);
    setError(null);
    if (!chiTiet) {
      onDien(mau.ketQua, chuDaGui, mau);
      setDaGui(chuDaGui);
      return;
    }
    setLoading(true);
    try {
      onDien(await goiAiDienNhap(chiTiet, "AI không điền được phiếu.", mau.id), chuDaGui, mau);
      setDaGui(chuDaGui);
    } catch (err) {
      // AI lỗi (quá tải, hết lượt) thì vẫn điền theo mẫu, chỗ trống thay bằng quy tắc
      onDien(ketQuaTheoQuyTac(mau, chiTiet, data.vietTat), chuDaGui, mau);
      setDaGui(chuDaGui);
      const lyDo = err instanceof Error ? err.message : "Không gọi được AI.";
      setError(`${lyDo} Đã điền theo mẫu, chi tiết chỉ thay được bên, số ngày, nhiệt độ; hãy kiểm tra các chỗ vàng.`);
    } finally {
      setLoading(false);
    }
  }

  async function dien() {
    if (!text.trim() || loading) return;
    const goi = timPhieuMau(text, data.phieuMau);
    if (goi?.loai === "nhieu") {
      setLuaChon(goi.cacMau);
      return;
    }
    if (goi?.loai === "mot") {
      await dungMau(goi.mau, text, goi.conLai);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onDien(await goiAiDienNhap(text, "AI không điền được phiếu."), text);
      setDaGui(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI không điền được phiếu.");
    } finally {
      setLoading(false);
    }
  }

  // Trường AI chưa chắc mà bác sĩ đã sửa thì không còn ở trạng thái "xem"
  const conXem = ketQua?.daDien.filter((item) => get(item.id).nguon === "xem") ?? [];
  const daXong = ketQua?.daDien.filter((item) => get(item.id).nguon !== "xem") ?? [];
  const tong = ketQua?.daDien.length ?? 0;
  const coChu = text.trim().length > 0;
  const chuMoi = coChu && text !== daGui;
  // Đang gõ dở tên bệnh mà chưa khớp mẫu nào: gợi ý vài tên mẫu để bấm
  const tenGoiY = chuMoi && !loading && !timPhieuMau(text, data.phieuMau) ? goiYTenMau(text, data.phieuMau) : [];
  const buoc = dangPhat ? 1 : chuMoi || loading ? 2 : ketQua ? 3 : 1;

  // Mỗi lúc chỉ một nút nổi bật: chưa có gì thì nút micro, có chữ mới thì nút Điền, đã điền thì phần duyệt
  const giaoDienMic: GiaoDienMic = {
    nut: `w-full rounded-lg py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-70 ${FOCUS}`,
    dangNghe: "border border-ef-do bg-ef-do-nhat text-ef-do",
    cho: chuMoi || ketQua ? "border border-tim-vien bg-white text-tim hover:bg-tim-nhat" : "bg-tim text-white hover:bg-tim/90",
    nhan: coChu || ketQua ? "🎤 Nói thêm" : "🎤 Bắt đầu nói",
  };

  return (
    <aside className="flex flex-col self-start rounded-xl border border-tim-vien bg-white text-[13px] shadow-[0_1px_2px_rgba(26,37,51,0.06)] lg:sticky lg:top-[calc(var(--cao-dau)+1rem)] lg:max-h-[calc(100vh-var(--cao-dau)-var(--cao-day)-2rem)] lg:overflow-y-auto">
      <div className="space-y-3 border-b border-tim-vien/60 bg-tim-nhat px-4 py-3">
        <h2 className="text-[15px] font-semibold text-tim">✨ Trợ lý AI điền phiếu</h2>
        <CacBuoc hienTai={buoc} xong={buoc === 3 && conXem.length === 0} />
      </div>

      <div className="space-y-3 px-4 py-4">
        {hoiThoai && (
          <div className="rounded-lg border border-tim-vien bg-tim-nhat/60 p-3">
            {daPhat === null ? (
              <button
                type="button"
                className={NUT_CHINH}
                onClick={() => {
                  setText("");
                  setDaPhat(0);
                  onBatDau("noi", true);
                }}
              >
                ▶ Bắt đầu nghe buổi khám
              </button>
            ) : dangPhat ? (
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-ef-do motion-reduce:animate-none" />
                <span role="status" className="flex-1 font-semibold text-ef-chu">
                  Đang nghe buổi khám… {daPhat}/{hoiThoai.length} câu
                </span>
                <button type="button" className={`${BTN_OUTLINE} py-0.5`} onClick={() => setDaPhat(hoiThoai.length)}>
                  ⏹ Dừng
                </button>
              </div>
            ) : (
              <p role="status" className="font-semibold text-ef-chu">
                ⏹ Đã nghe xong buổi khám. Bấm Điền vào phiếu.
              </p>
            )}
            <p className="mt-1.5 text-xs text-ef-phu">Giả lập: phát lại hội thoại soạn sẵn, không dùng micro.</p>
          </div>
        )}

        {!hoiThoai && <MicButton
          giaoDien={giaoDienMic}
          onStart={() => {
            setError(null);
            onBatDau("noi", false);
          }}
          onText={(chunk) => {
            const cau = suaChu(chunk, data.suaChu);
            setText((current) => (current ? `${current} ${cau}` : cau));
          }}
        />}

        <div className="relative">
          <textarea
            aria-label="Nội dung bác sĩ nói hoặc gõ tắt"
            rows={chuMoi ? 6 : ketQua ? 2 : 4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setLuaChon(null);
              onBatDau("go", false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void dien();
            }}
            placeholder="Gõ tên mẫu, VD: mẫu viêm tai giữa cấp, tai T, 3n. Hoặc gõ tắt cả ca: LD: đau tai P 4n. TMH: … CĐ: … Đơn: …"
            className="w-full rounded-lg border border-ef-vien bg-white px-3 py-2 text-sm leading-6 text-ef-chu outline-none placeholder:text-ef-phu/80 focus:border-tim focus:ring-2 focus:ring-tim/20"
          />
        </div>

        {tenGoiY.length > 0 && !luaChon && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ef-phu">
            <span>Mẫu theo bệnh:</span>
            {tenGoiY.map((mau) => (
              <button key={mau.id} type="button" className={NUT_CHU} onClick={() => {
                  void dungMau(mau, mau.ten);
                  setText("");
                }}>
                {mau.ten}
              </button>
            ))}
          </div>
        )}

        {luaChon && (
          <div role="group" aria-label="Chọn mẫu" className="space-y-1.5 rounded-lg border border-tim-vien bg-tim-nhat/60 p-3">
            <p className="text-xs font-semibold text-ef-chu">Tên này khớp nhiều mẫu, chọn một:</p>
            {luaChon.map((mau) => (
              <button key={mau.id} type="button" className={NUT_PHU} onClick={() => void dungMau(mau, text, timPhieuMau(text, data.phieuMau)?.conLai ?? "")}>
                Dùng mẫu: {mau.ten}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ef-phu">
          <span>Thử câu mẫu:</span>
          <button type="button" className={NUT_CHU} onClick={() => { setText(data.cauMau.noi); onBatDau("noi", true); }} disabled={!data.cauMau.noi}>
            kiểu nói
          </button>
          <button type="button" className={NUT_CHU} onClick={() => { setText(data.cauMau.goTat); onBatDau("go", true); }} disabled={!data.cauMau.goTat}>
            kiểu gõ tắt
          </button>
          {coChu && (
            <button type="button" className={`${NUT_CHU} ml-auto text-ef-phu`} onClick={() => setText("")}>
              Xóa chữ
            </button>
          )}
        </div>

        {(chuMoi || loading) && !dangPhat && (
          <button type="button" onClick={dien} disabled={loading} className={NUT_CHINH}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />
                AI đang điền…
              </span>
            ) : ketQua ? (
              "✨ Điền thêm vào phiếu"
            ) : (
              "✨ Điền vào phiếu"
            )}
          </button>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-ef-do-nhat px-3 py-2 text-xs text-ef-do">
            {error}
          </p>
        )}
      </div>

      {ketQua && (
        <div className="space-y-3 border-t border-ef-vien px-4 py-4">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-ef-chu">Đã điền {tong} trường</p>
              <p className={`text-xs font-medium ${conXem.length > 0 ? "text-xem" : "text-tim"}`}>
                {conXem.length > 0 ? `Còn ${conXem.length} chỗ cần xem lại` : "Đã xem hết chỗ chưa chắc"}
              </p>
            </div>
            <div
              className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-ef-nen"
              role="img"
              aria-label={`${daXong.length} trường chắc chắn, ${conXem.length} trường cần xem lại`}
            >
              <span className="bg-tim transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${tong ? (daXong.length / tong) * 100 : 0}%` }} />
              <span className="bg-xem/70" style={{ width: `${tong ? (conXem.length / tong) * 100 : 0}%` }} />
            </div>
          </div>

          {conXem.length > 0 && (
            <ul className="space-y-1.5">
              {conXem.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg border border-xem/40 bg-xem-nhat py-1.5 pl-3 pr-1.5">
                  <span className="min-w-0 flex-1 font-medium leading-snug text-ef-chu">
                    {item.nhan}
                  </span>
                  <button type="button" className={`${BTN_OUTLINE} py-0.5`} onClick={() => onGoTo(item.id)}>
                    Xem
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border border-xem/50 bg-white px-2.5 py-0.5 text-[13px] font-semibold text-xem hover:bg-xem-nhat ${FOCUS}`}
                    title="Giá trị đã đúng, bỏ đánh dấu cần xem lại"
                    onClick={() => put(item.id, get(item.id).value, "ai")}
                  >
                    ✓ Đúng
                  </button>
                </li>
              ))}
            </ul>
          )}

          <details className="group rounded-lg border border-ef-vien" open={conXem.length === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-ef-chu">
              <span className="font-medium">{daXong.length} trường AI đã điền</span>
              <span aria-hidden className="text-ef-phu transition-transform group-open:rotate-180 motion-reduce:transition-none">
                ▾
              </span>
            </summary>
            <ul className="border-t border-ef-vien px-1 py-1">
              {daXong.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onGoTo(item.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-tim-nhat"
                  >
                    <span aria-hidden className="text-tim">
                      ✓
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ef-chu">{item.nhan}</span>
                    <span className="text-xs text-ef-phu">Xem</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={NUT_PHU} onClick={() => onOpenTab("chi_dinh")}>
              {soChiDinh} chỉ định
            </button>
            <button type="button" className={NUT_PHU} onClick={() => onOpenTab("don_thuoc")}>
              {soThuoc} thuốc
            </button>
          </div>

          {onHoanTac && (
            <button type="button" className="w-full py-1 text-xs font-medium text-ef-phu hover:text-ef-chu hover:underline" onClick={onHoanTac}>
              ↶ Hoàn tác lần AI điền
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
