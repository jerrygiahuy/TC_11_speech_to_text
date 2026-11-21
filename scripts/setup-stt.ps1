param([switch]$SkipModel, [switch]$SkipWeb)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
New-Item -ItemType Directory -Force (Join-Path $projectRoot '.tmp') | Out-Null
$env:TEMP = Join-Path $projectRoot '.tmp'
$env:TMP = $env:TEMP
$env:PYTHONUTF8 = '1'
$python = Join-Path $projectRoot '.venv-stt\Scripts\python.exe'
if (!(Test-Path -LiteralPath $python)) {
    python -m venv .venv-stt
    if ($LASTEXITCODE -ne 0) { throw 'Python venv failed. Install Python 3.12+ and retry.' }
}
& $python -m pip install -r stt/requirements-lock.txt --cache-dir .cache-stt/pip
if ($LASTEXITCODE -ne 0) { throw 'STT dependency installation failed.' }
if (!$SkipWeb) {
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
}
if (!$SkipModel) {
    & $python -m stt.download_model
    if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Rerun this script to resume.' }
    & $python -m stt.download_diarization
    if ($LASTEXITCODE -ne 0) { throw 'Diarization model download failed. Rerun this script to resume.' }
    & $python -m stt.download_vad
    if ($LASTEXITCODE -ne 0) { throw 'Silero VAD model download failed.' }
    & $python -m stt.smoke
    if ($LASTEXITCODE -ne 0) { throw 'Real STT model smoke test failed.' }
    & $python -m stt.diarization_smoke
    if ($LASTEXITCODE -ne 0) { throw 'Real diarization smoke test failed.' }
}
Write-Host 'Setup complete. Run npm run stt:start and open http://localhost:3000/stt'
