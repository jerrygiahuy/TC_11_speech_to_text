// Đọc số thành chữ tiếng Việt, để so chữ nhận dạng giọng nói (model trả chữ) với câu gốc (viết bằng số).
const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function docDuoiNghin(n: number, day: boolean): string[] {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;
  const out: string[] = [];
  if (tram > 0 || day) out.push(CHU_SO[tram], "trăm");
  if (chuc === 0) {
    if (donVi > 0 && out.length > 0) out.push("lẻ");
  } else if (chuc === 1) out.push("mười");
  else out.push(CHU_SO[chuc], "mươi");
  if (donVi === 0) return out;
  if (donVi === 1 && chuc > 1) out.push("mốt");
  else if (donVi === 5 && chuc > 0) out.push("lăm");
  else out.push(CHU_SO[donVi]);
  return out;
}

/** Số nguyên không âm thành chữ: 37 → "ba mươi bảy", 500 → "năm trăm", 1250 → "một nghìn hai trăm năm mươi" */
export function docSo(n: number): string {
  if (n === 0) return "không";
  const nhom: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) nhom.unshift(x % 1000);
  const ten = ["", "nghìn", "triệu", "tỷ"];
  const out: string[] = [];
  nhom.forEach((g, i) => {
    if (g === 0) return;
    out.push(...docDuoiNghin(g, i > 0), ten[nhom.length - 1 - i]);
  });
  return out.filter(Boolean).join(" ");
}

/** Thay mọi số trong câu bằng chữ: "sốt 37,8 độ" → "sốt ba mươi bảy phẩy tám độ" */
export function soThanhChu(text: string): string {
  return text.replace(/\d+(?:[.,]\d+)?/g, (so) => {
    const [nguyen, le] = so.split(/[.,]/);
    const phan = [docSo(Number(nguyen))];
    if (le !== undefined) phan.push("phẩy", le.length <= 2 && !le.startsWith("0") ? docSo(Number(le)) : [...le].map((c) => CHU_SO[Number(c)]).join(" "));
    return ` ${phan.join(" ")} `;
  });
}
