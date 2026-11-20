// Dòng chẩn đoán cho bản in và báo cáo: in riêng chẩn đoán ban đầu và chẩn đoán ra viện, dòng trống thì bỏ.
export interface DongChanDoanIn {
  nhan: string;
  noiDung: string;
}

/** nhanIcd: đổi mã ICD10 thành chữ hiển thị (mã + tên) */
export function dongChanDoanIn(get: (id: string) => { value: string }, nhanIcd: (ma: string) => string): DongChanDoanIn[] {
  const dong = (nhan: string, maId: string, moTaId: string): DongChanDoanIn => ({
    nhan,
    noiDung: [nhanIcd(get(maId).value.trim()), get(moTaId).value.trim()].filter(Boolean).join(". "),
  });
  return [dong("Chẩn đoán ban đầu", "icd_ban_dau", "mo_ta_ban_dau"), dong("Chẩn đoán ra viện", "icd_ra_vien", "mo_ta_ra_vien")].filter((item) => item.noiDung);
}
