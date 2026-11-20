# Lớp NER PhoBERT cho bộ che PII: plan triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm một lớp NER chạy local (PhoBERT-base fine-tune trên PhoNER_COVID19 bản theo từ) vào sau bộ rule R1–R8. Lớp này chỉ được thêm đoạn che và mặc định tắt cho tới khi `npm run eval-pii` chứng minh nó có ích.

**Architecture:** Huấn luyện một lần trong `.venv-ner-train`, xuất ONNX int8 vào `models/ner/phobert-phoner/`. Khi chạy, dịch vụ Python có endpoint `POST /ner`: tách từ bằng VnCoreNLP, gắn nhãn bằng onnxruntime, trả về vị trí ký tự. Server Next gọi `/ner` trước khi che rồi truyền các đoạn vào `chePii`. Ở đó các đoạn NER được lọc, rồi thêm vào **sau** mọi rule bằng hàm `add` sẵn có. Chốt chặn R11 giữ nguyên là lớp cuối.

**Tech Stack:** Python 3 + FastAPI (`stt/`); onnxruntime, tokenizers, py_vncorenlp (Java 21) lúc chạy; torch CPU, transformers, seqeval lúc huấn luyện; TypeScript, node:test, tsx.

**Spec:** `docs/superpowers/plans/pending/2026-11-18-ner-phobert-design.md`

## Global Constraints

- Không commit dữ liệu PhoNER_COVID19 hay trọng số đã fine-tune; cả hai nằm dưới `models/ner/` (gitignore). Không đưa lên Hugging Face hay bất kỳ đâu ngoài máy.
- `.venv-stt` không bao giờ cài torch. Lúc chạy chỉ thêm `onnxruntime`, `tokenizers`, `py_vncorenlp`.
- Mô hình gốc mặc định `vinai/phobert-base` (v1, MIT). Tên mô hình gốc là tham số `--base-model`.
- NER chỉ thêm đoạn che, không bao giờ gỡ đoạn rule đã che. Không có NER thì kết quả `chePii` giống hệt hiện nay (chỉ khác chuỗi phiên bản).
- Nhãn NER được dùng: `NAME`→(R2, `NGƯỜI`), `LOCATION`→(R3, `ĐỊA_DANH`), `ORGANIZATION`→(R3, `NƠI_LÀM_VIỆC`), `PATIENT_ID`→(R6, `MÃ_ĐỊNH_DANH`). Mọi nhãn khác bị bỏ. Không dùng mã R9.
- `PII_NER=off|on`, mặc định `off`. `PII_NER_TIMEOUT_MS` mặc định `2000`. `NER_BACKEND_URL` mặc định bằng `STT_BACKEND_URL` (`http://127.0.0.1:8765`).
- `PII_POLICY_VERSION` = `"pii-auto-2"`.
- Văn bản thô và nội dung đoạn PII không bao giờ vào log (Python lẫn Next) hay nhật ký R13.
- Vị trí `start`/`end` mà `/ner` trả về tính theo **đơn vị UTF-16 trên chuỗi NFC**, khớp chỉ số chuỗi trong JS.
- Mọi file sửa đều phải có mục trong `docs/CHANGELOG.md` (skill `ghi-tai-lieu`). Tài liệu, thông báo lỗi bằng tiếng Việt.
- **Trước khi bắt đầu:** chạy `node .gitnexus/run.cjs analyze --index-only` (index đang chậm 7 commit). Chạy `impact` upstream trước khi sửa mỗi hàm. `redactPii` và `buildAuditEntry` có rủi ro **HIGH** (cả eForm lẫn `/demo-luong`), chỉ được thêm tham số hoặc trường **tùy chọn**. Trước mỗi commit chạy `detect-changes --scope all`.
- Nhánh hiện tại `demo-luong` còn nhiều thay đổi chưa commit, không thuộc việc này. Làm trên nhánh mới `ner-phobert`, và chỉ commit khi người dùng đồng ý.

## Review Focus

1. **Chữ có dấu dạng NFD hoặc tổ hợp** (dán từ Word, STT): vị trí NER phải khớp đúng chuỗi mà `chePii` che. Client NER chuẩn hóa NFC trước khi gửi, và `chePii` che trên đúng chuỗi NFC đó. Test ở Task 7.
2. **Phản hồi `/ner` hỏng** (đoạn vượt độ dài, `start >= end`, số mảng khác số đoạn văn, thiếu trường): đoạn sai bị bỏ, sai số mảng thì coi như `khong_chay`, không ném lỗi. Test ở Task 7.
3. **Lượt khám dài hơn một cửa sổ** (> 256 token): thực thể nằm vắt qua ranh giới cửa sổ vẫn ra **một** đoạn liền. Test ở Task 5.
4. **STT chạy nhưng thiếu mô hình NER** (`ner_ready:false`, 503) hoặc `PII_NER=off`: vẫn che bằng rule, nhật ký ghi đúng `khong_chay` hay `tat`. Khi `off` thì không có request nào tới `/ner`. Test ở Task 7.
5. **Ký tự ngoài BMP** (emoji trong lời gõ): vị trí UTF-16 từ Python vẫn khớp JS. Test ở Task 5.

---

### Task 1: Thử phụ thuộc lúc chạy và bộ tách từ

Phải chạy trước mọi việc: xác định `onnxruntime`, `tokenizers`, `py_vncorenlp` có ở chung `.venv-stt` với `sherpa-onnx` được không.

**Files:**
- Create: `stt/ner_probe.py`, `stt/ner_segment.py`
- Modify: `stt/requirements.txt`, `stt/requirements-lock.txt`, `.gitignore`
- Docs: `docs/CHANGELOG.md`

**Interfaces:**
- Produces:
  - Kết luận `CHUNG_VENV` hoặc `TACH_VENV`, ghi vào CHANGELOG và đầu file `stt/ner_probe.py`.
  - Trong `stt/ner_segment.py`: `model_dir() -> Path` (mặc định `models/ner/vncorenlp`, biến môi trường `NER_VNCORENLP_DIR`), `download() -> None`, và `make_segmenter() -> Callable[[str], list[str]]`. Hàm cuối trả các từ đã tách, âm tiết nối bằng `_`; thiếu Java hoặc thiếu mô hình thì ném `RuntimeError`.

- [ ] **Step 1:** Thêm `onnxruntime`, `tokenizers`, `py_vncorenlp` vào `stt/requirements.txt`. Cài vào `.venv-stt` bằng pip, rồi ghi lại phiên bản đã cài vào `requirements-lock.txt`.
- [ ] **Step 2:** Thêm `/models/ner/` và `/.venv-ner-train/` vào `.gitignore`.
- [ ] **Step 3:** Viết `stt/ner_probe.py`. Script làm lần lượt: nạp Zipformer qua `LocalEngine()`; tải mô hình VnCoreNLP (chỉ `wseg`) về `models/ner/vncorenlp` bằng `py_vncorenlp.download_model`; tách từ câu `"chị nguyễn thị lan ở thủ đức đau họng"`; tạo một phiên `onnxruntime.InferenceSession` trên `models/silero_vad.onnx`; in RSS của tiến trình sau mỗi bước.
- [ ] **Step 4:** Chạy `.venv-stt\Scripts\python -m stt.ner_probe` (từ thư mục gốc dự án). Mong đợi: không crash, câu ra dạng `chị nguyễn_thị_lan ở thủ_đức đau họng` (cụm có thể khác), RSS tăng thêm dưới 600 MB. Crash hoặc lỗi DLL thì kết luận `TACH_VENV`: gỡ ba gói khỏi `.venv-stt`, tạo `.venv-ner` riêng có fastapi, uvicorn và ba gói. Từ Task 5 trở đi, router NER chạy bằng `stt/ner_app.py` ở cổng `8766`, và `NER_BACKEND_URL` trỏ tới cổng đó.
- [ ] **Step 5:** Chạy `.venv-stt\Scripts\python -m pytest stt/tests -q`. Mong đợi: toàn bộ test cũ vẫn đạt.
- [ ] **Step 6:** Ghi CHANGELOG (kết luận, RSS đo được, phiên bản các gói). Commit nếu người dùng đồng ý.

### Task 2: Tải PhoNER_COVID19 có xác nhận giấy phép

**Files:**
- Create: `stt/download_phoner.py`, `stt/tests/test_download_phoner.py`
- Modify: `package.json` (thêm script `"ner:tai-du-lieu": "powershell -NoProfile -Command \".venv-ner-train\\Scripts\\python -m stt.download_phoner\""`, hoặc `.venv-stt` nếu chưa có môi trường huấn luyện)
- Docs: `docs/CHANGELOG.md`, `README.md`

**Interfaces:**
- Produces: các file `models/ner/phoner-covid19/{train,dev,test}_word.json` cùng `nguon.json` (`{repo, commit, sha256: {file: hash}, tai_luc}`). Hàm `data_dir() -> Path` (mặc định `models/ner/phoner-covid19`, biến môi trường `NER_DATA_DIR`).

- [ ] **Step 1: Viết test lỗi**

```python
def test_refuses_without_license_flag(tmp_path, capsys):
    with pytest.raises(SystemExit) as e:
        main(['--dir', str(tmp_path)])
    assert e.value.code == 2
    out = capsys.readouterr().out
    assert 'nghiên cứu hoặc giáo dục' in out and 'không phân phối lại' in out
    assert list(tmp_path.iterdir()) == []

def test_rejects_checksum_mismatch(tmp_path, monkeypatch):
    monkeypatch.setattr(download_phoner, 'fetch', lambda url: b'sai')
    with pytest.raises(RuntimeError, match='checksum'):
        main(['--dir', str(tmp_path), '--dong-y-giay-phep'])
    assert not any(p.suffix == '.json' for p in tmp_path.iterdir())
```

- [ ] **Step 2:** Chạy `pytest stt/tests/test_download_phoner.py -q`. Mong đợi: FAIL (chưa có module).
- [ ] **Step 3:** Viết `main(argv: list[str] | None = None) -> None` và `fetch(url: str) -> bytes`. Tải `data/word/{train,dev,test}_word.json` từ `raw.githubusercontent.com/VinAIResearch/PhoNER_COVID19/<COMMIT>/`. Hằng `COMMIT` và `SHA256` lấy từ commit `main` **tại thời điểm làm**, ghi cứng vào file theo mẫu `stt/download_vad.py`. Không có cờ `--dong-y-giay-phep` thì in điều khoản (nghiên cứu hoặc giáo dục, không phân phối lại, trích dẫn NAACL 2021) rồi thoát với mã 2.
- [ ] **Step 4:** Chạy test. Mong đợi: PASS. Chạy thật một lần có cờ đồng ý, kiểm tra có 3 file và `nguon.json`.
- [ ] **Step 5:** README thêm mục "Tải dữ liệu NER" (lệnh, điều khoản, trích dẫn). Ghi CHANGELOG. Commit nếu người dùng đồng ý.

### Task 3: Xử lý văn bản dùng chung cho huấn luyện và lúc chạy

Hàm thuần, không cần mô hình.

**Files:**
- Create: `stt/ner_text.py`, `stt/tests/test_ner_text.py`

**Interfaces:**
- Produces:
  - `stt_style(words: list[str], tags: list[str]) -> tuple[list[str], list[str]]`: viết thường, bỏ token chỉ gồm dấu câu (`.,;:!?…"'()-`) và nhãn tương ứng.
  - `word_offsets(text: str, words: list[str]) -> list[tuple[int, int]]`: vị trí ký tự (code point, trên `text` NFC) của từng từ đã tách, trong đó `_` nối âm tiết.
  - `to_utf16(text: str, offset: int) -> int`.
  - `bio_spans(tags: list[str], scores: list[float]) -> list[tuple[int, int, str, float]]`: trả về `(word_start, word_end_exclusive, entity_type, mean_score)`. `I-X` đứng sau `O` được coi như `B-X`.

- [ ] **Step 1: Viết test lỗi**

```python
def test_stt_style_lowercases_and_drops_punct():
    assert stt_style(['Bệnh_nhân', 'Nguyễn_Văn_A', ',', 'ở', 'Hà_Nội', '.'],
                     ['O', 'B-NAME', 'O', 'O', 'B-LOCATION', 'O']) == (
        ['bệnh_nhân', 'nguyễn_văn_a', 'ở', 'hà_nội'], ['O', 'B-NAME', 'O', 'B-LOCATION'])

def test_word_offsets_maps_underscored_words_back():
    text = 'chị  nguyễn thị lan,ở thủ đức'
    assert word_offsets(text, ['chị', 'nguyễn_thị_lan', ',', 'ở', 'thủ_đức']) == [(0, 3), (5, 19), (19, 20), (20, 21), (22, 29)]

def test_word_offsets_raises_on_mismatch():
    with pytest.raises(ValueError):
        word_offsets('đau họng', ['đau', 'tai'])

def test_to_utf16_counts_astral_as_two():
    assert to_utf16('😀 lan', 2) == 3

def test_bio_spans_merges_and_tolerates_orphan_i():
    assert bio_spans(['O', 'B-NAME', 'I-NAME', 'O', 'I-LOCATION'], [1, 1.0, 0.5, 1, 0.75]) == [(1, 3, 'NAME', 0.75), (4, 5, 'LOCATION', 0.75)]
```

- [ ] **Step 2:** Chạy `pytest stt/tests/test_ner_text.py -q`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết các hàm. `word_offsets` dò tuần tự: bỏ khoảng trắng, so từng âm tiết (tách từ bằng `_`) không phân biệt hoa thường, cho phép giữa các âm tiết có một hoặc nhiều khoảng trắng.
- [ ] **Step 4:** Chạy test. Mong đợi: PASS. Commit nếu người dùng đồng ý (CHANGELOG gộp vào Task 4).

### Task 4: Script huấn luyện, xuất ONNX và chạy thử nhỏ

**Files:**
- Create: `stt/ner_train.py`, `stt/requirements-ner-train.txt`, `scripts/setup-ner-train.ps1`
- Modify: `package.json` (`"ner:setup-train"`, `"ner:train"`)
- Docs: `docs/CHANGELOG.md`, `README.md`

**Interfaces:**
- Consumes: `stt_style` (Task 3), dữ liệu Task 2.
- Produces: thư mục `models/ner/phobert-phoner/` gồm `model.int8.onnx`, `tokenizer.json`, `labels.json` (danh sách nhãn BIO theo chỉ số) và `meta.json`:
  ```json
  {"base_model": "vinai/phobert-base", "data_commit": "...", "trained_at": "ISO",
   "model_sha256": "...", "max_len": 256, "stride": 64, "nguong": 0.5,
   "f1": {"test": 0.0, "test_stt": 0.0}, "precision_at_nguong_dev_stt": 0.0}
  ```
  Checkpoint nằm ở `models/ner/checkpoints/`.

- [ ] **Step 1:** `stt/requirements-ner-train.txt` gồm torch (bản CPU), transformers, seqeval, onnx, onnxruntime, tokenizers. `scripts/setup-ner-train.ps1` tạo `.venv-ner-train` rồi cài file đó.
- [ ] **Step 2:** Viết `stt/ner_train.py` với các tham số: `--base-model` (mặc định `vinai/phobert-base`), `--epochs 5`, `--batch 16`, `--lr 5e-5`, `--max-len 256`, `--probe-steps N`, `--resume`, `--max-train N`, `--out` (mặc định `models/ner/phobert-phoner`). Cách làm:
  - Tập train là bản gốc nối thêm bản `stt_style`. Tập dev và test giữ riêng hai bản `gốc` và `stt`.
  - Dùng `AutoModelForTokenClassification`. Chỉ gắn nhãn subword đầu tiên của mỗi từ, các subword còn lại nhận nhãn `-100`.
  - Dùng `Trainer` với `save_strategy="epoch"`, `eval_strategy="epoch"`, `load_best_model_at_end=True`, `metric_for_best_model="f1_dev_stt"`. `--resume` truyền vào `resume_from_checkpoint`.
  - `--probe-steps N` chạy N bước, in số giây mỗi bước và thời gian dự kiến cho cả lần huấn luyện, rồi thoát.
  - Xuất ONNX bằng `torch.onnx.export` (trục động cho batch và độ dài), lượng tử hóa bằng `onnxruntime.quantization.quantize_dynamic` (QInt8).
  - Ngưỡng `nguong`: chọn giá trị nhỏ nhất trong `{0.3, 0.4, …, 0.9}` mà precision theo thực thể trên dev-stt từ 0,85 trở lên. Không giá trị nào đạt thì dùng `0.5`.
  - Ghi `meta.json` gồm sha256 của file int8 và F1 seqeval trên test gốc, test stt.
- [ ] **Step 3:** Chạy thử nhỏ: `.venv-ner-train\Scripts\python -m stt.ner_train --max-train 64 --epochs 1 --out .tmp/ner-smoke`. Mong đợi: thư mục `.tmp/ner-smoke/` có đủ 4 file, `meta.json` có `model_sha256` dài 64 ký tự. Không yêu cầu F1 cao.
- [ ] **Step 4:** Chạy `--probe-steps 50` trên toàn bộ dữ liệu, ghi thời gian dự kiến vào CHANGELOG.
- [ ] **Step 5:** README thêm mục "Huấn luyện NER" (cắm sạc, cần khoảng 4 GB RAM trống, `--resume` khi bị ngắt). Ghi CHANGELOG. Commit nếu người dùng đồng ý.
- [ ] **Step 6: Huấn luyện thật. Cần người dùng cho phép chạy, vì máy bận 1–4 giờ.** Bật giữ máy không ngủ, rồi chạy `npm run ner:train` dưới nền. Xong thì ghi F1, ngưỡng và thời gian thật vào CHANGELOG.

### Task 5: Endpoint `/ner` trong dịch vụ Python

**Files:**
- Create: `stt/ner.py`, `stt/ner_api.py`, `stt/tests/test_ner.py`; tạo thêm `stt/ner_app.py` chỉ khi Task 1 kết luận `TACH_VENV`
- Modify: `stt/api.py` (thêm tham số `ner=None` cho `create_app`, gắn router, `/health` thêm `ner_ready`)
- Docs: `docs/STT.md`, `docs/CHANGELOG.md`

**Interfaces:**
- Consumes: `make_segmenter` (Task 1); `word_offsets`, `to_utf16`, `bio_spans` (Task 3); các file mô hình (Task 4).
- Produces:
  - `class LocalNer(segment: Callable[[str], list[str]] | None = None, tagger: WordTagger | None = None, meta: dict | None = None)`, có `ready() -> bool`, `meta() -> dict` và `tag(texts: list[str]) -> list[list[dict]]`. Mỗi đoạn là `{"start": int, "end": int, "nhan": str, "diem": float}`, vị trí tính theo UTF-16 trên NFC.
  - `class OnnxWordTagger(model_dir: Path)` có `tag_words(words: list[str]) -> list[tuple[str, float]]`, dùng tokenizers và onnxruntime.
  - Hàm thuần `windows(n: int, size: int, stride: int) -> list[tuple[int, int]]`.
  - `create_ner_router(ner: LocalNer) -> APIRouter`.
  - `POST /ner` nhận `{"texts": [str]}` (tối đa 50 phần tử, mỗi phần tử tối đa 50.000 ký tự). Thành công trả 200 `{"model_sha256", "nguong", "ket_qua": [[span]]}`. Mô hình chưa sẵn sàng trả 503 `{"detail": "NER_NOT_READY"}`. Đầu vào sai trả 400 `NER_INPUT_INVALID`.

- [ ] **Step 1: Viết test lỗi**

```python
class FakeTagger:
    def tag_words(self, words):
        return [('B-NAME', .9) if w == 'nguyễn_thị_lan' else ('O', 1.0) for w in words]

def fake_segment(text):
    return text.replace('nguyễn thị lan', 'nguyễn_thị_lan').split()

def test_ner_endpoint_returns_utf16_offsets(caplog):
    ner = LocalNer(fake_segment, FakeTagger(), {'model_sha256': 'x' * 64, 'nguong': 0.5})
    with TestClient(create_app(Engine(), vad=AllSpeech(), ner=ner)) as c:
        r = c.post('/ner', json={'texts': ['😀 chị nguyễn thị lan đau họng']})
    assert r.status_code == 200
    assert r.json()['ket_qua'] == [[{'start': 7, 'end': 21, 'nhan': 'NAME', 'diem': 0.9}]]
    assert 'nguyễn' not in caplog.text

def test_ner_not_ready_is_503_and_health_reports_it():
    with TestClient(create_app(Engine(), vad=AllSpeech(), ner=LocalNer())) as c:
        assert c.post('/ner', json={'texts': ['a']}).json() == {'detail': 'NER_NOT_READY'}
        assert c.get('/health').json()['ner_ready'] is False

def test_rejects_bad_input():
    ner = LocalNer(fake_segment, FakeTagger(), {'model_sha256': 'x' * 64, 'nguong': 0.5})
    with TestClient(create_app(Engine(), vad=AllSpeech(), ner=ner)) as c:
        for body in [{}, {'texts': 'a'}, {'texts': ['a'] * 51}, {'texts': ['a' * 50_001]}]:
            assert c.post('/ner', json=body).status_code == 400

def test_windows_cover_all_tokens_with_overlap():
    assert windows(10, 4, 2) == [(0, 4), (2, 6), (4, 8), (6, 10)]
    assert windows(3, 4, 2) == [(0, 3)]

def test_entity_across_window_boundary_is_one_span():
    # OnnxWordTagger ghép cửa sổ: từ nằm trong vùng chồng lấn lấy dự đoán từ cửa sổ mà từ đó xa mép hơn
    tags = stitch_windows([(0, 4), (2, 6)], [['O', 'O', 'B-NAME', 'I-NAME'], ['B-NAME', 'I-NAME', 'I-NAME', 'O']], 6)
    assert bio_spans([t for t, _ in tags], [s for _, s in tags]) == [(2, 5, 'NAME', 1.0)]
```

(Đưa `stitch_windows(wins, per_window_tags, n) -> list[tuple[str, float]]` vào `stt/ner.py`. Nhãn trong test được cho điểm 1.0.)

- [ ] **Step 2:** Chạy `pytest stt/tests/test_ner.py -q`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết code.
  - `LocalNer()` không có tham số thì tự nạp từ `models/ner/phobert-phoner` cộng VnCoreNLP. Thiếu file hay lỗi Java thì `ready()` trả `False` và không ném lỗi.
  - `tag()` làm lần lượt: chuẩn hóa NFC, tách từ, `word_offsets`, gắn nhãn, `bio_spans`, quy về vị trí ký tự rồi đổi sang UTF-16.
  - Không có `logger` nào in nội dung văn bản.
  - `OnnxWordTagger` dùng cửa sổ `max_len` và `stride` lấy từ `meta.json`.
- [ ] **Step 4:** Chạy `pytest stt/tests -q`. Mong đợi: tất cả đạt.
- [ ] **Step 5:** Kiểm tra với mô hình thật: chạy `npm run stt:start -- -BackendOnly`, rồi `Invoke-RestMethod -Method Post http://127.0.0.1:8765/ner -Body '{"texts":["hôm qua chị nguyễn thị lan ở thủ đức đưa bé đi khám"]}' -ContentType 'application/json'`. Mong đợi: có một đoạn `NAME` phủ "nguyễn thị lan", và in thời gian phản hồi.
- [ ] **Step 6:** `docs/STT.md` thêm mục endpoint `/ner`. Ghi CHANGELOG. Commit nếu người dùng đồng ý.

### Task 6: `chePii` nhận đoạn NER

**Files:**
- Modify: `src/shared/clinical/pii/types.ts`, `redact.ts`, `pipeline.ts`, `gate.ts` (export `coveredByAllowlist`), `index.ts`
- Create: `src/shared/clinical/pii/ner.ts`, `src/shared/clinical/pii/ner.test.ts`
- Docs: `docs/CHANGELOG.md`

**Interfaces:**
- Produces:
  - Trong `types.ts`:
    - `interface NerSpan { start: number; end: number; nhan: string; diem: number }`
    - `interface NerChapNhan { start: number; end: number; rule: PiiRule; kind: PiiLabelKind }`
    - `PiiSpan` thêm trường `nguon?: "ner"`.
  - Trong `ner.ts`:
    - `NER_SANG_NHAN: Record<string, [PiiRule, PiiLabelKind]>`, theo đúng bảng ở Global Constraints.
    - `locNer(text: string, spans: readonly NerSpan[], allowlist: ReadonlySet<string>, nguong: number): NerChapNhan[]`. Bỏ đoạn: không có trong bảng nhãn; `diem < nguong`; `start < 0`, `end > text.length` hoặc `start >= end`; ngắn hơn 2 ký tự sau khi cắt khoảng trắng; mọi token nằm trong `DEFAULT_CLINICAL_ALLOWLIST ∪ allowlist` (dùng `coveredByAllowlist`).
  - `redactPii(raw, known, extra?: readonly NerChapNhan[])`: các đoạn `extra` được đưa vào `add` **sau** `nameScan` và các rule tuổi/giới tính, mang `nguon: "ner"`. Ánh xạ vị trí bản thô sang bản gấp dùng một bảng ngược dựng từ `startMap`.
  - `chePii(input, known, allowlist, ner?: { spans: readonly NerSpan[][]; nguong: number })`: `spans[i]` thuộc đoạn văn thứ `i` (đã NFC). Độ dài `spans` khác số đoạn văn thì bỏ qua NER. `ChePiiResult` thêm `ner_chap_nhan: number`.

- [ ] **Step 1: Viết test lỗi** (`ner.test.ts`)

```ts
const ALLOW = new Set(["viêm tai giữa"]);
test("không có NER thì kết quả giống hệt bản cũ", () => {
  const t = "chị Nguyễn Thị Lan đau họng 3 ngày";
  assert.deepEqual(chePii(t, [], ALLOW), { ...chePii(t, [], ALLOW, { spans: [[]], nguong: 0.5 }) });
});
test("NER thêm tên rule bỏ sót, đánh số nhãn như R10", () => {
  const t = "hôm qua lan đưa bé đi khám";
  const r = chePii(t, [], ALLOW, { spans: [[{ start: 8, end: 11, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.clean, "hôm qua [NGƯỜI_1] đưa bé đi khám");
  assert.equal(r.spans.find((s) => s.nguon === "ner")?.rule, "R2");
  assert.equal(r.ner_chap_nhan, 1);
});
test("NER không gỡ được đoạn rule đã che, chồng một phần thì phần thừa vẫn che", () => {
  const t = "chị Nguyễn Thị Lan ở phường Bến Nghé";
  const base = chePii(t, [], ALLOW);
  const r = chePii(t, [], ALLOW, { spans: [[{ start: 4, end: 10, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.clean, base.clean);
});
test("bỏ đoạn dưới ngưỡng, nhãn lâm sàng, trong allowlist, vị trí sai", () => {
  const t = "viêm tai giữa phải, sốt cao";
  const spans = [[
    { start: 0, end: 13, nhan: "NAME", diem: 0.99 },                  // allowlist
    { start: 20, end: 27, nhan: "SYMPTOM_AND_DISEASE", diem: 0.99 },  // nhãn bị bỏ
    { start: 20, end: 27, nhan: "NAME", diem: 0.2 },                  // dưới ngưỡng
    { start: 5, end: 999, nhan: "NAME", diem: 0.9 },                  // vượt độ dài
    { start: 9, end: 9, nhan: "NAME", diem: 0.9 },                    // rỗng
  ]];
  assert.equal(chePii(t, [], ALLOW, { spans, nguong: 0.5 }).clean, t);
});
test("số mảng NER khác số đoạn văn thì bỏ qua NER", () => {
  const r = chePii(["lan đau", "họng đỏ"], [], ALLOW, { spans: [[{ start: 0, end: 3, nhan: "NAME", diem: 0.9 }]], nguong: 0.5 });
  assert.equal(r.ner_chap_nhan, 0);
});
```

- [ ] **Step 2:** Chạy `npm test -- src/shared/clinical/pii/ner.test.ts`. Mong đợi: FAIL.
- [ ] **Step 3:** Viết code theo Interfaces. Chạy lại `impact` cho `redactPii` trước khi sửa, và báo rủi ro HIGH.
- [ ] **Step 4:** Chạy `npm test`. Mong đợi: `ner.test.ts` và các test PII cũ (`redact`, `gate`, `pipeline`, `kich-ban`, `flow`) đều đạt. Lỗi sẵn có ở `encounter-context.test.ts` vẫn là lỗi cũ.
- [ ] **Step 5:** Chạy `npm run lint` sạch. Ghi CHANGELOG. Commit nếu người dùng đồng ý.

### Task 7: Client NER phía server, nhật ký R13, phiên bản `pii-auto-2`

**Files:**
- Create: `src/server/clinical/ner-client.ts`, `src/server/clinical/ner-client.test.ts`
- Modify: `src/shared/clinical/pii/types.ts` (`PII_POLICY_VERSION = "pii-auto-2"`), `audit.ts`, `src/shared/clinical/data-policy.ts` (`DeidentificationProof.policy_version: typeof PII_POLICY_VERSION`); sửa chữ `"pii-auto-1"` trong `redact.test.ts`, `privacy.test.ts`, `extract-recording.test.ts`, `extraction.test.ts`, `data-policy.test.ts` và các chú thích liên quan
- Docs: `docs/CHANGELOG.md`, `.env.example`

**Interfaces:**
- Consumes: `NerSpan` (Task 6), `POST /ner` (Task 5).
- Produces:
  - `type NerTrangThai = "chay" | "khong_chay" | "tat"`
  - `type NerKetQua = { trang_thai: "chay"; spans: NerSpan[][]; nguong: number; model_sha256: string } | { trang_thai: "khong_chay" | "tat" }`
  - `goiNer(texts: readonly string[], opts?: { send?: typeof fetch; env?: NodeJS.ProcessEnv }): Promise<NerKetQua>`. Chuẩn hóa NFC trước khi gửi. `PII_NER` khác `"on"` thì trả `tat` mà không gọi mạng. Lỗi, quá thời gian, 503, hay phản hồi sai schema (kiểm bằng zod; `ket_qua.length !== texts.length`) đều trả `khong_chay`. Không log nội dung.
  - `PiiAuditEntry` thêm `ner?: { trang_thai: NerTrangThai; model_sha256?: string; so_doan?: number }`. `buildAuditEntry` sao chép từng trường (không dùng spread).

- [ ] **Step 1: Viết test lỗi** (`ner-client.test.ts`)

```ts
const on = { PII_NER: "on", NER_BACKEND_URL: "http://ner.test" } as NodeJS.ProcessEnv;
test("PII_NER tắt thì không gọi mạng", async () => {
  let called = false;
  const r = await goiNer(["a"], { env: {}, send: (async () => { called = true; }) as never });
  assert.deepEqual(r, { trang_thai: "tat" }); assert.equal(called, false);
});
test("503, lỗi mạng, sai schema, lệch số mảng đều là khong_chay", async () => {
  for (const send of [
    async () => Response.json({ detail: "NER_NOT_READY" }, { status: 503 }),
    async () => { throw new TypeError("fetch failed"); },
    async () => Response.json({ ket_qua: "x" }),
    async () => Response.json({ model_sha256: "a".repeat(64), nguong: 0.5, ket_qua: [] }),
  ]) assert.deepEqual(await goiNer(["a"], { env: on, send: send as typeof fetch }), { trang_thai: "khong_chay" });
});
test("gửi NFC và trả spans khi chạy", async () => {
  let body = "";
  const send = (async (_u: string, init: RequestInit) => { body = String(init.body);
    return Response.json({ model_sha256: "a".repeat(64), nguong: 0.6, ket_qua: [[{ start: 0, end: 3, nhan: "NAME", diem: 0.9 }]] }); }) as typeof fetch;
  const r = await goiNer(["làn"], { env: on, send });
  assert.equal(JSON.parse(body).texts[0], "làn");
  assert.equal(r.trang_thai, "chay");
});
test("buildAuditEntry giữ trường ner, bỏ trường lạ", () => {
  const e = buildAuditEntry({ ...base, ner: { trang_thai: "chay", model_sha256: "a".repeat(64), so_doan: 2, raw: "x" } as never });
  assert.deepEqual(e.ner, { trang_thai: "chay", model_sha256: "a".repeat(64), so_doan: 2 });
});
```

(`base` là một input `buildAuditEntry` hợp lệ, viết sẵn trong file test.)

- [ ] **Step 2:** Chạy test. Mong đợi: FAIL.
- [ ] **Step 3:** Viết code. Chạy `impact` cho `buildAuditEntry` trước khi sửa (rủi ro HIGH): chỉ thêm trường tùy chọn. Tăng phiên bản và sửa các chuỗi `"pii-auto-1"` trong test.
- [ ] **Step 4:** Chạy `npm test` rồi `npm run lint`. Mong đợi: đạt (trừ lỗi cũ đã biết). Chạy `npm run clinical:check`: nếu các ví dụ trong `docs/task-2/` đòi đúng chuỗi phiên bản thì sửa ví dụ.
- [ ] **Step 5:** `.env.example` thêm `PII_NER=off`, `PII_NER_TIMEOUT_MS=2000`, `NER_BACKEND_URL=`. Ghi CHANGELOG. Commit nếu người dùng đồng ý.

### Task 8: Nối NER vào eForm, `/demo-luong` và `thu-che-pii`

**Files:**
- Modify:
  - `src/server/clinical/privacy.ts` (`PrivacyCheckInput.ner?`; `Entry` và `pii()` mang trạng thái NER)
  - `src/server/clinical/bound-privacy.ts` (thêm `checkRecordingPrivacyWithNer`)
  - `src/app/api/clinical/privacy/route.ts`
  - `src/server/clinical/extract-recording.ts` (đưa `ner` vào nhật ký)
  - `src/server/demo-luong/flow.ts`
  - `src/shared/demo-luong/types.ts` (sự kiện `che.du_lieu.ner`)
  - `src/shared/clinical/api.ts` (`PrivacyCheckResult.ner`)
  - `src/client/demo-luong/TechDetails.tsx`, `src/client/eform/TroLyAi.tsx` (một dòng trạng thái)
  - `scripts/thu-che-pii.ts` (cờ `--ner`)
- Test: `src/server/clinical/bound-privacy.test.ts`, `src/server/demo-luong/flow.test.ts`
- Docs: `docs/CHANGELOG.md`, `README.md`, `docs/CLINICAL-WORKFLOW.md`

**Interfaces:**
- Consumes: `goiNer`, `NerKetQua` (Task 7); `chePii(..., ner?)` (Task 6).
- Produces:
  - `PrivacyCheckInput.ner?: NerKetQua`. Khi `trang_thai === "chay"` thì truyền `{ spans, nguong }` vào `chePii`.
  - `PrivacyTickets.pii()` trả thêm `ner: PiiAuditEntry["ner"]`.
  - `checkRecordingPrivacyWithNer(actor, value, options & { ner?: typeof goiNer }): Promise<PrivacyCheckResult>`: kiểm schema, gọi `ner(texts)` với `texts = [text.trim()]`, rồi chuyển cho hàm `checkRecordingPrivacy` đồng bộ (thêm `options.nerKetQua`). Route dùng bản async. `checkRecordingPrivacy` cũ và mọi test dùng nó giữ nguyên.
  - `PrivacyCheckResult.ner: { trang_thai: NerTrangThai; so_doan: number }` (không có nội dung).
  - `runDemoFlow`: gọi `goiNer(parts.map(p => p.text))` ngay trước `chePii`. Có thể truyền thay bằng `input.ner?` khi test.
  - Giao diện hiện đúng một dòng: "NER: đã chạy (n đoạn)" / "NER: không chạy, chỉ dùng rule" / "NER: tắt".

- [ ] **Step 1: Viết test lỗi**

```ts
// bound-privacy.test.ts
test("eForm: NER chạy thì che thêm tên và ghi nhật ký ner", async () => {
  const ner = async () => ({ trang_thai: "chay", nguong: 0.5, model_sha256: "a".repeat(64),
    spans: [[{ start: 8, end: 11, nhan: "NAME", diem: 0.9 }]] }) as const;
  const r = await checkRecordingPrivacyWithNer(actor, { binding, text: "hôm qua lan đưa bé đi khám", mode: "conversation" }, { store, tickets, auditDirectory: audit, ner });
  assert.match(r.preview, /\[NGƯỜI_1\]/); assert.deepEqual(r.ner, { trang_thai: "chay", so_doan: 1 });
});
test("eForm: NER không chạy thì kết quả như rule đơn thuần", async () => {
  const text = "hôm qua đỗ quốc việt mua thuốc giúp";
  const r = await checkRecordingPrivacyWithNer(actor, { binding, text, mode: "conversation" }, { store, tickets, auditDirectory: audit, ner: async () => ({ trang_thai: "khong_chay" }) });
  assert.equal(r.preview, checkRecordingPrivacy(actor, { binding, text, mode: "conversation" }, { store, tickets: new PrivacyTickets(), auditDirectory: audit }).preview);
  assert.equal(r.ner.trang_thai, "khong_chay");
});
// flow.test.ts
test("demo-luong: nhật ký có trường ner, không có nội dung", async () => { /* chạy ca-chuan với input.ner trả khong_chay; dòng audit cuối có ner.trang_thai === "khong_chay" và không chứa fold của expected.phai_che */ });
```

- [ ] **Step 2:** Chạy test. Mong đợi: FAIL.
- [ ] **Step 3:** Viết code. Chạy `impact` cho `checkRecordingPrivacy`, `runDemoFlow`, `PrivacyTickets` trước khi sửa (đều LOW). Route `/api/clinical/privacy` chuyển sang `await checkRecordingPrivacyWithNer(...)`. `thu-che-pii --ner` gọi `goiNer` với `PII_NER=on` rồi in thêm trạng thái NER và các đoạn có `nguon: "ner"`.
- [ ] **Step 4:** Chạy `npm test`, `npm run lint`, `npm run build`. Mong đợi: đạt (trừ lỗi cũ đã biết).
- [ ] **Step 5:** Mở trình duyệt `/` (eForm) và `/demo-luong`, mỗi trang chạy hai lần: `PII_NER=off`, rồi `PII_NER=on` khi STT có mô hình. Mong đợi: dòng trạng thái NER đúng, bản đã che có thêm `[NGƯỜI_n]` cho tên rule bỏ sót. Chụp màn hình làm bằng chứng.
- [ ] **Step 6:** README thêm mục "Bật NER" (`PII_NER`, cần STT chạy). `docs/CLINICAL-WORKFLOW.md` thêm bước NER vào luồng che. Ghi CHANGELOG. Commit nếu người dùng đồng ý.

### Task 9: Bộ đo `npm run eval-pii`

**Files:**
- Create:
  - `data/pii-eval/cau-stt.json`: khoảng 60 câu **giả**, viết thường, không dấu câu, kiểu STT, viết độc lập với PhoNER
  - `src/shared/clinical/pii/danh-gia.ts`, `src/shared/clinical/pii/danh-gia.test.ts`
  - `scripts/eval-pii.ts`
- Modify: `package.json` (`"eval-pii": "tsx --conditions=react-server scripts/eval-pii.ts"`)
- Docs: `docs/CHANGELOG.md`, `README.md` (mục "Chấm điểm")

**Interfaces:**
- Consumes: `chePii`, `goiNer`, `clinicalAllowlist`, `loadKichBan`.
- Produces:
  - Mỗi mục trong `cau-stt.json` có dạng `{ id: string; text: string; phai_che: string[]; khong_duoc_che: string[] }`.
  - `danhGiaMotCau(clean: string, phaiChe: readonly string[], khongDuocChe: readonly string[]): { bat_duoc: number; tong_phai_che: number; che_nham: number }`. Một mục `phai_che` được tính là "bắt được" khi dạng gấp của nó không còn trong dạng gấp của `clean`. Một mục `khong_duoc_che` bị tính là "che nhầm" khi dạng gấp của nó không còn nguyên trong `clean`.
  - `scripts/eval-pii.ts [--ner]` in bảng: nguồn (`cau-stt`, `kich-ban`), tỷ lệ bắt được, số che nhầm, độ trễ p50/p95 (ms) của mỗi lượt `goiNer + chePii`. Chạy cả hai chế độ thì in thêm dòng chênh lệch.

- [ ] **Step 1: Viết test lỗi**

```ts
test("đếm bắt được và che nhầm theo dạng gấp", () => {
  assert.deepEqual(danhGiaMotCau("chị [NGƯỜI_1] sốt [NGƯỜI_2]", ["Nguyễn Thị Lan"], ["sốt cao"]), { bat_duoc: 1, tong_phai_che: 1, che_nham: 1 });
  assert.deepEqual(danhGiaMotCau("chị lan sốt cao", ["lan"], ["sốt cao"]), { bat_duoc: 0, tong_phai_che: 1, che_nham: 0 });
});
```

- [ ] **Step 2:** Chạy test. Mong đợi: FAIL. Viết `danhGiaMotCau`. Chạy lại. Mong đợi: PASS.
- [ ] **Step 3:** Soạn `cau-stt.json` gồm khoảng 60 câu giả: khoảng 25 câu có tên đứng một mình hoặc không có từ chỉ người phía trước, khoảng 10 câu có địa danh hoặc nơi làm việc, khoảng 15 câu bẫy ("sốt cao", "hà hơi", "khám lại", "cao huyết áp", "hội chứng ménière", "bệnh kawasaki"), khoảng 10 câu bình thường. Tất cả tên đều do ghép ngẫu nhiên.
- [ ] **Step 4:** Viết `scripts/eval-pii.ts`. Chạy `npm run eval-pii`. Mong đợi: in ra bảng cho chế độ chỉ có rule. Ghi số liệu vào CHANGELOG.
- [ ] **Step 5:** README thêm mục chấm `eval-pii`. Ghi CHANGELOG. Commit nếu người dùng đồng ý. **Nhờ người dùng hoặc bác sĩ duyệt và bổ sung bộ câu.**

### Task 10: Đo với NER, quyết định có bật hay không, hoàn tất tài liệu

**Files:**
- Modify: `docs/DATA-USE-POLICY.md`, `docs/STT.md`, `README.md`, `docs/superpowers/plans/pending/README.md`, `.env.example` (chỉ khi được phép bật), `docs/CHANGELOG.md`

- [ ] **Step 1:** Chạy STT với mô hình thật, rồi `PII_NER=on npm run eval-pii -- --ner`. Ghi bảng rule đối chiếu rule cộng NER vào CHANGELOG.
- [ ] **Step 2: Điều kiện bật.** Đạt khi trên `cau-stt` **và** `kich-ban`: tỷ lệ bắt được của rule cộng NER **lớn hơn** rule đơn thuần, **và** số che nhầm **không tăng**, **và** p95 dưới 2000 ms. Đạt thì **hỏi người dùng** trước khi đổi mặc định `PII_NER=on` trong `.env.example` và README. Không đạt thì giữ `off` và ghi lý do.
- [ ] **Step 3:** `docs/DATA-USE-POLICY.md` thêm: dự án là nghiên cứu (từ 18/11/2026); điều khoản PhoNER_COVID19 và trích dẫn NAACL 2021; cấm phát hành dữ liệu và trọng số đã fine-tune; VnCoreNLP theo GPL-3.0; NER chạy local, không gửi văn bản đi đâu.
- [ ] **Step 4:** Cập nhật trạng thái trong `pending/README.md`. Chạy `detect-changes --scope all`. Chạy lại toàn bộ: `npm test`, `npm run lint`, `pytest stt/tests -q`.
- [ ] **Step 5:** Ghi CHANGELOG. Commit nếu người dùng đồng ý.
