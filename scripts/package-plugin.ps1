# 把 packages/qqnt/release/shadowdream 打成可安装的 zip。
# 用法：powershell -ExecutionPolicy Bypass -File scripts/package-plugin.ps1
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'packages\qqnt\release\shadowdream'
$target = Join-Path $root 'packages\qqnt\release\shadowdream.zip'

if (-not (Test-Path $source)) {
  throw "找不到 $source，请先执行 npm run build:plugin"
}
if (Test-Path $target) { Remove-Item $target -Force }
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $target -CompressionLevel Optimal
Write-Host "已生成 $target"
