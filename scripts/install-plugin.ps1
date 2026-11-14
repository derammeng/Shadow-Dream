# 把构建好的 Shadow Dream 插件复制到 LiteLoaderQQNT 的 plugins 目录。
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/install-plugin.ps1 -PluginsDir "C:\path\to\LiteLoaderQQNT\plugins"
# 安装前请退出 QQ。
param(
  [Parameter(Mandatory = $true)]
  [string]$PluginsDir
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'packages\qqnt\release\shadowdream'

if (-not (Test-Path $source)) {
  throw "找不到 $source，请先执行 npm run build:plugin"
}
if (-not (Test-Path $PluginsDir)) {
  throw "LiteLoader 插件目录不存在：$PluginsDir"
}

$target = Join-Path $PluginsDir 'shadowdream'
if (Test-Path $target) {
  $backup = "$target.bak.$(Get-Date -Format yyyyMMddHHmmss)"
  Move-Item -LiteralPath $target -Destination $backup
  Write-Host "旧版本已备份到 $backup"
}

Copy-Item -LiteralPath $source -Destination $target -Recurse
Write-Host "Shadow Dream 已安装到 $target"
Write-Host "请启动 QQ，登录后查看 LiteLoader / Shadow Dream 日志。"
