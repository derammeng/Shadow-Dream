# Copy the built Shadow Dream plugin into the LiteLoaderQQNT plugins directory.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/install-plugin.ps1 -PluginsDir "C:\path\to\LiteLoaderQQNT\plugins"
# Quit QQ before installing.
param(
  [Parameter(Mandatory = $true)]
  [string]$PluginsDir
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'packages\qqnt\release\shadowdream'

if (-not (Test-Path $source)) {
  throw "Cannot find $source. Run npm run build:plugin first."
}
if (-not (Test-Path $PluginsDir)) {
  throw "LiteLoader plugins directory not found: $PluginsDir"
}

$target = Join-Path $PluginsDir 'shadowdream'
if (Test-Path $target) {
  # Keep backups outside plugins/: LiteLoader treats every directory with a
  # manifest.json as a plugin, so an adjacent .bak copy would be loaded too.
  $profileRoot = Split-Path -Parent ([IO.Path]::GetFullPath($PluginsDir))
  $backupRoot = Join-Path $profileRoot 'shadowdream-backups'
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $backup = Join-Path $backupRoot ("shadowdream." + (Get-Date -Format 'yyyyMMddHHmmss'))
  Move-Item -LiteralPath $target -Destination $backup
  Write-Host "Backed up the old version to $backup"
}

Copy-Item -LiteralPath $source -Destination $target -Recurse
Write-Host "Shadow Dream installed to $target"
Write-Host "Start QQ, sign in, and check the LiteLoader / Shadow Dream logs."
