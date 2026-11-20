# Cấu trúc màn kê đơn trên OH – từ ảnh chụp 09/11/2026 (chiều, ~14:00)

> Khảo sát tại PK Tai Mũi Họng (09/11/2026); cấu trúc màn EMR dùng chung các khoa, giữ làm tham khảo cho CardioNote.
Đi kèm cau-truc-phieu-kham-ngoai-tru.md và cau-truc-man-chi-dinh-dich-vu.md.
Quy ước: BS = bác sĩ, BN = bệnh nhân. Không ghi tên riêng (BN, BS kê đơn) trong bản nộp.

---

## Màn 1 – Chọn thuốc & danh sách đơn (Medication ordering)

**Header lượt khám (Visit Details)**
- Khám Ngoại trú; HHN – BV ĐKQT Vinmec Times City; họ tên BN.
- Ward: (trống) · Location: HHN – Phòng Khám Mắt · Security: Caregivers.
- Chỉ số BN: Height / Weight / BSA / IBW / CrCl → **tất cả "Unknown"**.
- Dòng order: ngày kê – tên BS – <Primary Physician> – Inactive, General, Online – @ HHN – Phòng Khám Tai Mũi Họng.

**Khung Orderable Items (tìm thuốc)**
- Tab: Quick · My favorites · My Formulary · Search · Browser.
- Scope: Enterprise · Filter (ô gõ tên thuốc) · nút Search · More Filters…

**Khung Orderable Item Detail (chi tiết thuốc đang chọn)**
- Tab: Common Dosages · Inventory · Identification.
- Non-inventory – patient specific / Inventory – stock item; Item in inventory.
- Selling Prices (Charge Type, Selling Price) → ảnh chụp: "This item has no selling price".
- Item Locations: Company = Vinmec Times City Hospital; Store · Qty. on Hand · Bin Location (trống).

**Khung Orders (đơn của BN)**
- Group by: Active · lọc: Not dispensed ☑, External medications ☑, My Orders Only ☐, Inactive ☐, Display last 50, OPD/Discharge Rx items, IPD Rx items.
- Cột: ! · Prescription · Dose · Start Date/Time · Status · Supply · Rx Quantity · Last supplied · Prescriber.
- Ví dụ dòng có sẵn: Cefprozil 500mg – lời dặn **song ngữ tự sinh** ("HHN-Uống 1 viên nén (500 mg) mỗi lần, 2 lần mỗi ngày vào buổi sáng và tối. Đường dùng: Đường miệng / Take 1 tablet (500 mg)/time, 2 times a day in the morning and evening. Route: Oral") – start 05/11/2026 20:00 – **Active – Not dispensed** – 10 viên nén – BS khác kê.

**Khung Medication Related Problems (cảnh báo)**: "No Alerts Found".

**Nút**: Renew · Cancel · Resume · Custom Order · View · Confirm · Put on hold · More. Order Session: Review Orders · Submit · Close. Ô Note.

---

## Màn 2 – Chi tiết liều một thuốc (ví dụ Amoxicillin 875mg + Clavulanate 125mg)

- Medication (☑ tên thuốc) · **Problem: trống** (đơn không gắn chẩn đoán).
- Tab: Dosage · Admin. Schedule · Labelling and MAR · Dispensing · Dispensing History · Event History.

| Trường | Giá trị trong ảnh |
|---|---|
| Dose entry | Standard |
| Route | OR – Đường miệng |
| Dosage type | None |
| Dose | 875 mg amoxicillin ⇄ 1 viên nén (có nút máy tính quy đổi) |
| Frequency | 2 lần/ngày (sáng, tối) |
| When required (PRN) | ☐ |
| Ghi chú cách dùng | cùng bữa ăn |
| Start (Administration Schedule) | 09/11/2026 18:00 · ☐ Ongoing · ☐ Modify schedule |
| Supply Qty | 14 viên nén |
| Number of refills | Refills not allowed |
| Supply length | 7 Days · ☐ Administer now |
| Administration Method / Admin. verb | Uống |
| Admin. type | Tiêu chuẩn |
| Hold on | (trống) |
| Additional Information: MAR / Patient / Pharmacy | (trống) |

---

## Nhận xét của người quan sát (cần kiểm chứng với BS)

1. **Thông tin BS thực sự cần nhập chỉ ~6 thứ**: thuốc, liều, số lần/ngày, thời điểm (sáng/tối), liên quan bữa ăn, số ngày. Supply Qty 14 = 1 viên × 2 lần × 7 ngày → hỏi hệ thống tự tính hay BS gõ.
2. **Nhiều trường kế thừa từ nội trú** (MAR, giờ bắt đầu 18:00, Administer now, Hold on, Ongoing) không cần cho đơn ngoại trú nhưng vẫn nằm trên form.
3. **Kiểm tra an toàn theo cơ thể không chạy được**: chiều cao/cân nặng/CrCl đều Unknown → không kiểm được liều theo cân nặng (quan trọng với BN nhi TMH) hay theo chức năng thận.
4. **Hai kháng sinh cùng Active**: Cefprozil kê 05/11 vẫn Active – Not dispensed, hôm nay kê thêm Amoxicillin/Clavulanate; khung cảnh báo "No Alerts Found" (có thể ảnh chụp trước khi thêm thuốc mới). Hỏi: BS có phải tự Cancel đơn cũ không? Hệ thống có cảnh báo trùng nhóm kháng sinh / dị ứng beta-lactam không?
5. **Đơn không gắn chẩn đoán** (Problem trống): chẩn đoán nằm ở EMR, thuốc ở OH → OH không biết thuốc kê cho bệnh gì. Đây là khoảng hở để bắc cầu EMR → OH.
6. **Đã có "My favorites" / "Common Dosages"**: hỏi BS có dùng không. Nếu có, gợi ý AI phải hơn favorites (theo chẩn đoán + lịch sử BN), không chỉ là danh sách thuốc hay dùng.
7. **Không thấy giá / tồn kho lúc kê** (no selling price, Qty on hand trống) → hỏi BS có biết thuốc còn trong kho không khi kê.
8. **Liều tính theo "mg hoạt chất ⇄ viên"**: hợp thuốc viên; khớp lời phàn nàn buổi sáng là thuốc bôi/nhỏ/xịt khó nhập.
9. Location ghi "Phòng Khám Mắt" trong khi order @ Phòng Khám TMH → hỏi: do liên chuyên khoa hay BN đăng ký nhiều phòng trong một lượt?

## Hướng AI rút ra
- **Kê đơn bằng một câu** (gõ hoặc nói): "Augmentin 1g, ngày 2 lần sáng tối, cùng bữa ăn, 7 ngày" → AI tách thành các trường Dose / Frequency / ghi chú / Supply length / Supply Qty, khớp với danh mục thuốc, BS chỉ xác nhận. Làm được trong bản mẫu.
- **Gợi ý đơn theo chẩn đoán lấy từ EMR**: điền sẵn thuốc + liều + lời dặn theo bộ mẫu bệnh hay gặp (câu hỏi số 2 cho BS).
- **Lớp kiểm tra an toàn**: cảnh báo đơn kháng sinh còn Active, thiếu cân nặng ở BN nhi, trùng nhóm thuốc.

## Câu hỏi cho BS / ĐD
1. Một đơn thường mất bao nhiêu click/phút? Trung bình mấy thuốc/đơn ở TMH?
2. Có dùng My favorites / Common Dosages không?
3. Supply Qty tự tính hay gõ tay?
4. Đơn cũ còn Active (ví dụ Cefprozil) xử lý thế nào khi đổi thuốc?
5. Cân nặng BN nhi nhập ở đâu, có ai nhập không?
6. Thuốc nhỏ tai / xịt mũi / bôi nhập vào những trường nào trên form này?
