param(
    [string]$Python = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Python) {
    $Python = Join-Path $projectRoot ".venv-stt/Scripts/python.exe"
}
if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) {
    throw "STT Python environment missing. Run scripts/setup-stt.ps1 first, or pass -Python."
}

Push-Location $projectRoot
try {
    & $Python -m pip install -r stt/requirements-denoise.txt
    if ($LASTEXITCODE -ne 0) { throw "DENOISE_DEPENDENCY_INSTALL_FAILED" }
    & $Python -m stt.download_denoise
    if ($LASTEXITCODE -ne 0) { throw "DENOISE_DOWNLOAD_FAILED" }
    & $Python -c "from stt.denoise import DeepFilterDenoiser; assert DeepFilterDenoiser().ready(), 'DENOISE_NOT_READY'; print('DeepFilterNet3 native CPU runtime ready; backend remains off until explicitly started.')"
    if ($LASTEXITCODE -ne 0) { throw "DENOISE_NOT_READY" }
}
finally {
    Pop-Location
}
