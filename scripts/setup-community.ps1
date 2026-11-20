param([switch]$SkipModel)
$ErrorActionPreference = 'Stop'
$communityRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $communityRoot
$communityPython = Join-Path $communityRoot '.venv-community\Scripts\python.exe'
if (!(Test-Path -LiteralPath $communityPython)) {
    python -m venv .venv-community
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create Community-1 venv.' }
}
& $communityPython -m pip install torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -ne 0) { throw 'Community-1 CPU torch installation failed.' }
& $communityPython -m pip install -r stt/requirements-community-lock.txt
if ($LASTEXITCODE -ne 0) { throw 'Community-1 dependencies installation failed.' }
if (!$SkipModel) {
    & $communityPython -m stt.download_community
    if ($LASTEXITCODE -ne 0) { throw 'Community-1 weights unavailable. Accept model conditions and authenticate Hugging Face locally, then rerun.' }
}
Write-Host 'Optional Community-1 runtime prepared. Inference stays local; model weights and free RAM are also required.'
