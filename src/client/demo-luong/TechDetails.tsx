"use client";

import type { ReactNode } from "react";
import { PII_POLICY_VERSION } from "@/shared/clinical/pii";
import { isDemoError, type DemoPhieu, type DemoStep } from "@/shared/demo-luong/types";
import { TH, TD } from "@/client/eform/fields";
import { BUOC, RUI_RO_R2, RULES, TEN_LY_DO_CHAN, TEN_RULE, gioVN, tongDaChe, type SuKienLuot } from "./hien-thi";
import { nhanNer } from "@/shared/clinical/pii/nhan";

function Dong({ nhan, children }: { nhan: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-3 py-1 sm:grid-cols-[12rem_1fr]">
      <dt className="text-[13px] font-semibold text-ef-phu">{nhan}</dt>
      <dd className="min-w-0 break-words text-[13px] text-ef-chu">{children}</dd>
    </div>
  );
}

function Json({ value, nhan }: { value: unknown; nhan: string }) {
  return (
    <details className="mt-2 rounded border border-ef-vien bg-ef-nen">
      <summary className="cursor-pointer px-3 py-1.5 text-[13px] font-semibold text-ef-dam">{nhan}</summary>
      <pre className="max-h-96 overflow-auto px-3 py-2 font-mono text-[12px] leading-5 text-ef-chu">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

const RuiRo = () => <p className="mt-2 rounded border border-xem/40 bg-xem-nhat px-3 py-1.5 text-[13px] text-xem">{RUI_RO_R2}</p>;

function BangRule({ counts }: { counts: Partial<Record<string, number>> }) {
  return (
    <table className="mt-1 w-full border-collapse text-[13px]">
      <thead><tr><th className={TH}>Mã</th><th className={TH}>Rule</th><th className={`${TH} text-right`}>Số mục</th></tr></thead>
      <tbody>
        {RULES.map(r => (
          <tr key={r} className={counts[r] ? "" : "text-ef-phu"}>
            <td className={`${TD} font-mono`}>{r}</td><td className={TD}>{TEN_RULE[r]}</td><td className={`${TD} text-right tabular-nums`}>{counts[r] ?? 0}</td>
          </tr>
        ))}
        <tr className="font-semibold"><td className={TD} colSpan={2}>Tổng</td><td className={`${TD} text-right tabular-nums`}>{tongDaChe(counts)}</td></tr>
      </tbody>
    </table>
  );
}

/** Panel chi tiết của một ô bước (chỉ ở chế độ Kỹ thuật). */
export function TechDetails({ step, events, phieu }: { step: DemoStep; events: SuKienLuot; phieu: DemoPhieu | null }) {
  const ten = BUOC.find(b => b.id === step);
  const e = events[step];
  let body: ReactNode;
  if (!e) body = <p className="text-[13px] text-ef-phu">Bước này chưa chạy trong lượt đang xem.</p>;
  else if (isDemoError(e)) {
    body = (
      <dl>
        <Dong nhan="Lỗi">{e.du_lieu.loi}</Dong>
        <Dong nhan="Thời gian">{e.ms} ms</Dong>
        {e.du_lieu.payload_preview && <Json nhan="Nguyên văn dữ liệu định gửi AI" value={e.du_lieu.payload_preview} />}
        {e.du_lieu.audit && <Json nhan="Dòng nhật ký R13" value={e.du_lieu.audit} />}
      </dl>
    );
  } else if (e.buoc === "stt") {
    body = (
      <dl>
        <Dong nhan="Engine">{e.du_lieu.engine === "kich-ban" ? "kich-ban (chữ có sẵn, bỏ qua STT)" : e.du_lieu.engine}</Dong>
        <Dong nhan="Thời lượng âm thanh">{e.du_lieu.audio_ms === null ? "—" : `${e.du_lieu.audio_ms} ms`}</Dong>
        <Dong nhan="Thời gian xử lý">{e.ms} ms</Dong>
        <Dong nhan="Âm thanh">Không lưu (R9); STT chạy trên máy chủ bệnh viện</Dong>
      </dl>
    );
  } else if (e.buoc === "ban_tho") {
    const theoRule: Partial<Record<string, number>> = {};
    for (const s of e.du_lieu.spans) theoRule[s.rule] = (theoRule[s.rule] ?? 0) + 1;
    body = (
      <>
        <dl>
          <Dong nhan="Chế độ vai trò">{e.du_lieu.mode === "conversation" ? "conversation (nhãn BS/BN có sẵn)" : "dictation (mọi đoạn là bác sĩ)"}</Dong>
          <Dong nhan="Số đoạn nhạy cảm">{e.du_lieu.spans.length}</Dong>
          <Dong nhan="Thời gian">{e.ms} ms</Dong>
          <Dong nhan="Lưu trữ">Chỉ đi trong stream về trình duyệt, không ghi đĩa, không ghi log</Dong>
        </dl>
        <BangRule counts={theoRule} />
        <RuiRo />
      </>
    );
  } else if (e.buoc === "che") {
    const d = e.du_lieu;
    body = (
      <>
        <dl>
          <Dong nhan="Phiên bản rule">{PII_POLICY_VERSION}</Dong>
          {d.auto_masked.length > 0 && (
            <Dong nhan="Tự che phần còn sót">
              <ul className="list-inside list-disc">{d.auto_masked.map((r, i) => <li key={i}>{TEN_LY_DO_CHAN[r.reason] ?? r.reason}: <code className="rounded bg-ef-nen px-1">{r.excerpt}</code></li>)}</ul>
            </Dong>
          )}
          <Dong nhan="Chốt chặn R11">{d.gate.passed ? (d.auto_masked.length ? "Qua (sau khi tự che)" : "Qua") : "Chặn — tự che vẫn còn sót, dừng ở bước ③, không gửi AI"}</Dong>
          {!d.gate.passed && (
            <Dong nhan="Lý do">
              <ul className="list-inside list-disc">{d.gate.reasons.map((r, i) => <li key={i}>{TEN_LY_DO_CHAN[r.reason] ?? r.reason}: <code className="rounded bg-ef-do-nhat px-1 text-ef-do">{r.excerpt}</code></li>)}</ul>
            </Dong>
          )}
          <Dong nhan="Đồng ý AI (R14)">{d.dong_y.trang_thai ? "✓" : "✗"} lúc tiếp đón, {gioVN(d.dong_y.luc)}</Dong>
          <Dong nhan="Đường AI">{d.ai_route === "external_allowed" ? "external_allowed (được gửi AI ngoài sau R11)" : "local_only (chỉ chạy bộ tách local)"}</Dong>
          <Dong nhan="Lớp NER">{nhanNer(d.ner)}</Dong>
          <Dong nhan="Thời gian">{e.ms} ms</Dong>
        </dl>
        <BangRule counts={d.counts} />
        <RuiRo />
      </>
    );
  } else if (e.buoc === "ai") {
    const d = e.du_lieu;
    body = (
      <>
        <dl>
          <Dong nhan="Provider / model">{d.provider} / {d.model}</Dong>
          <Dong nhan="Phạm vi">
            {events.che && !isDemoError(events.che) && events.che.du_lieu.ai_route === "local_only"
              ? "Không được gửi AI ngoài — chạy bộ tách local"
              : d.provider === "mock" ? "Mock — chưa rời máy chủ" : "Đã gửi AI ngoài (chỉ bản đã che)"}
          </Dong>
          <Dong nhan="Prompt version">{d.prompt_version}</Dong>
          <Dong nhan="Schema">{d.extraction.draft.schema_version}</Dong>
          <Dong nhan="Policy version">{d.extraction.transcript.privacy.policy_version} · privacy {d.extraction.transcript.privacy.trang_thai}</Dong>
          <Dong nhan="Kiểm cấu trúc">
            Đạt (validateClinicalExtraction) · {d.extraction.draft.bang_chung.length} bằng chứng · {d.extraction.draft.can_xem_lai.length} cờ cần xem lại
          </Dong>
          <Dong nhan="Mã băm đầu vào">{d.extraction.input_digest}</Dong>
          <Dong nhan="Thời gian">{e.ms} ms</Dong>
        </dl>
        <Json nhan="Nguyên văn dữ liệu gửi AI (payload_preview)" value={d.payload_preview} />
        <Json nhan="Kết quả AI (ClinicalExtraction.draft)" value={d.extraction.draft} />
      </>
    );
  } else {
    const d = e.du_lieu;
    body = (
      <>
        <dl>
          <Dong nhan="File">{d.file}</Dong>
          <Dong nhan="SHA-256 file">{d.sha256}</Dong>
          <Dong nhan="Revision">{d.phieu.revision}</Dong>
          <Dong nhan="Thời gian">{e.ms} ms</Dong>
        </dl>
        <Json nhan="Dòng nhật ký R13" value={JSON.stringify(d.audit)} />
        <Json nhan="Bản ghi DemoPhieu đọc lại từ kho" value={d.phieu} />
      </>
    );
  }
  return (
    <section className="rounded-lg border border-ef-xanh/40 bg-white px-4 py-3" aria-label={`Chi tiết ${ten?.ten ?? step}`}>
      <h3 className="mb-1 text-[14px] font-semibold text-ef-dam">{ten?.so} {ten?.ten} · chi tiết kỹ thuật</h3>
      {body}
      {step === "luu" && phieu && !e && <Json nhan="Bản ghi DemoPhieu hiện tại" value={phieu} />}
    </section>
  );
}
