# Tạo .venv-ner-train cho việc fine-tune PhoBERT (plan NER, Task 4). Không động vào .venv-stt.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$env:PYTHONUTF8 = '1'
$python = Join-Path $projectRoot '.venv-ner-train\Scripts\python.exe'
if (!(Test-Path -LiteralPath $python)) {
    python -m venv .venv-ner-train
    if ($LASTEXITCODE -ne 0) { throw 'Không tạo được .venv-ner-train. Cài Python 3.12+ rồi chạy lại.' }
}
& $python -m pip install torch --index-url https://download.pytorch.org/whl/cpu --cache-dir .cache-ner/pip
if ($LASTEXITCODE -ne 0) { throw 'Cài torch (CPU) thất bại.' }
& $python -m pip install -r stt/requirements-ner-train.txt --cache-dir .cache-ner/pip
if ($LASTEXITCODE -ne 0) { throw 'Cài thư viện huấn luyện thất bại.' }
Write-Host 'Đã tạo .venv-ner-train. Tải dữ liệu: npm run ner:tai-du-lieu -- --dong-y-giay-phep'
