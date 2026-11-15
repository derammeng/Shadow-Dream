# Package packages/qqnt/release/shadowdream into an installable zip.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/package-plugin.ps1
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'packages\qqnt\release\shadowdream'
$target = Join-Path $root 'packages\qqnt\release\shadowdream.zip'

if (-not (Test-Path $source)) {
  throw "Cannot find $source. Run npm run build:plugin first."
}
if (Test-Path $target) { Remove-Item $target -Force }
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $target -CompressionLevel Optimal
Write-Host "Created $target"
