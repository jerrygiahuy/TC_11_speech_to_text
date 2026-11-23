# Chuyển Excel danh sách field Phiếu khám ngoại trú (Tim mạch) thành config/forms/phieu-kham-ngoai-tru.json.
# Chạy: python3 scripts/nhap-excel-phieu-kham.py "<file.xlsx>" config/forms/phieu-kham-ngoai-tru.json (cần: pip install openpyxl)
import openpyxl,sys,json,re
src,out=sys.argv[1],sys.argv[2]
ws=openpyxl.load_workbook(src,data_only=True)["PhieuKhamNgoaiTru"]
rows=[r for r in ws.iter_rows(min_row=2,values_only=True) if any(c is not None for c in r)]
KIEU={"Số":"so","Chữ ngắn":"chu_ngan","Chữ dài":"chu_dai","Ngày giờ":"ngay_gio","Chọn 1":"chon_1","Chọn nhiều":"chon_nhieu","Bảng lặp":"bang_lap","Nút":"nut"}
CACH={"Tự động":"tu_dong","Chọn":"chon","Gõ tay":"go_tay","Chỉ đọc":"chi_doc","Bấm":"bam"}
TF={"Có":"co","Không":"khong","Chưa rõ":"chua_ro"}
def s(v): return None if v is None or str(v).strip()=="" else str(v).strip()
def opts(v):
    v=s(v)
    if not v: return None
    if "cần hỏi" in v or v.startswith("Chưa rõ") or v=="Danh mục ICD-10": return None
    return [re.sub(r"^Khám toàn thân:\s*","",x.strip()) for x in v.split(";") if x.strip()]
phan_list=[]; cur_parent=None; pidx={}
for r in rows:
    phan,muc,nhan,khoa,kieu,vd,dd,cach,bb,ai,gt,bd=(list(r)+[None]*12)[:12]
    phan=s(phan); muc=s(muc); nhan=s(nhan); khoa=s(khoa)
    if phan not in pidx:
        pidx[phan]={"tieu_de":phan,"muc":[]}; phan_list.append(pidx[phan]); mi={}
    P=pidx[phan]
    m=P["muc"][-1] if P["muc"] and P["muc"][-1]["tieu_de"]==muc else None
    if m is None: m={"tieu_de":muc,"truong":[]}; P["muc"].append(m)
    f={"nhan":nhan,"khoa":khoa,"kieu":KIEU[s(kieu)],"vi_du":s(vd),"dinh_dang":s(dd),"cach_nhap":CACH[s(cach)],
       "bat_buoc":TF.get(s(bb)),"ai_dien":TF.get(s(ai)),"gia_tri_cho_phep":opts(gt),"bien_doi":s(bd)}
    if s(gt) and f["gia_tri_cho_phep"] is None: f["ghi_chu_gia_tri"]=s(gt)
    f={k:v for k,v in f.items() if v is not None}
    child=nhan.startswith("↳")
    if child:
        f["nhan"]=re.sub(r"^↳\s*","",nhan)
        if f["kieu"]=="nut":
            f["nhan"]=re.sub(r"^(nút|link):\s*","",f["nhan"])
            (cur_parent if cur_parent else m).setdefault("nut",[]).append(f["nhan"]); continue
        f["nhan"]=re.sub(r"^cột( \d+)?:\s*","",f["nhan"])
        if cur_parent and cur_parent["kieu"]=="bang_lap":
            f["khoa"]=f["khoa"].split("].",1)[1]
            cur_parent.setdefault("cot",[]).append(f); continue
        # child chọn nhiều (mẫu câu) gắn vào mục
    if f["kieu"]=="nut": m.setdefault("nut",[]).append(f["nhan"]); continue
    if "," in f["khoa"]: f["khoa_con"]=[x.strip() for x in f["khoa"].split(",")]; f["khoa"]="huyet_ap"
    if f["khoa"].endswith("[]"): f["khoa"]=f["khoa"][:-2]
    m["truong"].append(f)
    if f["kieu"]=="bang_lap": cur_parent=f
    elif not child: cur_parent=f
# thuoc_dang_dung không có cột trong Excel: suy ra từ lich_su_thuoc
for P in phan_list:
  for m in P["muc"]:
    for f in m["truong"]:
      if f["khoa"]=="thuoc_dang_dung" and "cot" not in f:
        f["cot"]=[{"nhan":"Tên thuốc, hàm lượng, dạng","khoa":"ten_thuoc","kieu":"chu_ngan"},{"nhan":"Liều dùng","khoa":"lieu","kieu":"chu_ngan"},{"nhan":"Đường dùng","khoa":"duong_dung","kieu":"chu_ngan"},{"nhan":"Ghi chú","khoa":"ghi_chu","kieu":"chu_ngan"}]
        f["ghi_chu_cot"]="Excel không liệt kê cột; tạm suy ra từ bảng lich_su_thuoc, cần xác nhận"
doc={"_nguon":"Danh sách field – Phiếu khám ngoại trú (Tim mạch), sheet PhieuKhamNgoaiTru","_ghi_chu":"Sinh một lần từ Excel. Ví dụ giá trị là dữ liệu tự bịa trong Excel.","phien_ban":1,"phan":phan_list}
json.dump(doc,open(out,"w"),ensure_ascii=False,indent=2)
n=sum(len(m["truong"]) for P in phan_list for m in P["muc"]); c=sum(len(f.get("cot",[])) for P in phan_list for m in P["muc"] for f in m["truong"])
print("truong",n,"cot",c,"nut",sum(len(m.get("nut",[]))+sum(len(f.get("nut",[])) for f in m["truong"]) for P in phan_list for m in P["muc"]))
for P in phan_list:
  for m in P["muc"]:
    print(P["tieu_de"],"/",m["tieu_de"],":",", ".join(f["khoa"]+("["+",".join(x["khoa"] for x in f.get("cot",[]))+"]" if f.get("cot") else "") for f in m["truong"]))
