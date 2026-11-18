# Danh mục tham khảo cào từ nguồn công khai

Dữ liệu thật của Bộ Y tế và Cục Quản lý Dược, lọc phần liên quan Tai Mũi Họng. **Ứng dụng đã nạp** `icd10-tmh.json`, `dich-vu-ky-thuat-tmh.json`, `thuoc-luu-hanh-tmh.json` (từ 2026-11-11), ghép với danh mục bệnh viện soạn tay ở `data/catalog/` trong `src/server/du-lieu/danh-muc.ts`. `thuoc-hoat-chat.json` chưa dùng. Cào lại xong thì tải lại trang là thấy, không cần chuyển đổi.

Cào lại bằng `npm run cao-du-lieu` (khoảng 5 phút, phần thuốc chiếm gần hết) hoặc `npm run cao-du-lieu -- --bo-thuoc` (vài giây). Ngày cào và số mục ghi trong `nguon.json`. Bộ lọc nằm ở đầu `scripts/cao-du-lieu.ts`.

| File | Nội dung | Nguồn |
|---|---|---|
| `icd10-tmh.json` | 433 mã ICD-10 tiếng Việt: chương VIII (H60–H95), J00–J06, J30–J39, u ác vùng đầu cổ (C00–C14, C30–C32), dị tật tai mũi họng, dị vật, trào ngược, chóng mặt, khàn tiếng và một số mã lẻ (L72.1, G51.0, R04.0...). Gồm cả mã nhóm 3 ký tự (`chi_tiet: false`) | ICD-10 bản 2026 theo TT 06/2026/TT-BYT (áp dụng từ 01/07/2026), lấy từ CodeSystem `vn-icd10-cs` của HL7 Vietnam VN Core IG |
| `dich-vu-ky-thuat-tmh.json` | 486 kỹ thuật: toàn bộ chương 15 Tai Mũi Họng (403) và phần liên quan ở chương Điện quang, Nội soi, Thăm dò chức năng, Huyết học, Hóa sinh, Vi sinh, Phẫu thuật nội soi. `ma` là mã kỹ thuật theo TT 23/2024/TT-BYT (ví dụ `20.13` Nội soi tai mũi họng); mã `BS_*` là kỹ thuật bổ sung | TT 23/2024/TT-BYT (áp dụng đến hết 31/12/2027), CodeSystem `vn-dvkt-cs` của HL7 Vietnam, gốc từ dmkt.kcb.vn |
| `thuoc-hoat-chat.json` | 960 mã hoạt chất BHYT, toàn bộ danh mục (không lọc TMH). `ngung_dung: true` là mã đã bị loại | QĐ 7603/QĐ-BYT phụ lục 05, sửa bởi QĐ 4905/QĐ-BYT, CodeSystem `vn-drug-substance-cs` |
| `thuoc-luu-hanh-tmh.json` | 4.914 thuốc còn hiệu lực số đăng ký, thuộc 58 hoạt chất hay kê ở TMH (kháng sinh, kháng histamin, corticoid uống và xịt mũi, nhỏ mũi/tai, long đờm, giảm đau, chóng mặt, PPI). `ma` là số đăng ký, `tra_theo` là hoạt chất dùng để tra | API tra cứu số đăng ký công khai của Cục Quản lý Dược (dichvucong.dav.gov.vn) |

## Giới hạn

- **Thuốc chưa đầy đủ:** mỗi hoạt chất giữ tối đa 100 số đăng ký đầu tiên API trả về (Paracetamol có 2.224, Ofloxacin 1.110). Natri clorid chỉ giữ dạng nhỏ/xịt/rửa mũi. Hàm lượng và dạng bào chế để trống ở một số thuốc cũ vì nguồn không có, khi đó hàm lượng thường nằm trong `hoat_chat`.
- **Danh mục kỹ thuật lọc bằng từ khóa** ngoài chương 15, nên có thể sót hoặc thừa vài dòng. Chương Nhi khoa có bản trùng nhiều kỹ thuật TMH cho trẻ em, chưa lấy. TT 23/2024 không có mục "test nhanh liên cầu" riêng như danh mục giả.
- **Quyền sử dụng:** nội dung gốc là văn bản quy phạm pháp luật công khai, nhưng HL7 Vietnam ghi chú việc tái phân phối bản chuẩn hóa cần chủ sở hữu IG phê duyệt trước khi dùng production. Ở đây chỉ dùng tham khảo cho prototype.
- **Không dùng cho lâm sàng.** Không có liều dùng, chỉ định hay tương tác thuốc.
