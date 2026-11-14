# Shadow Dream installer (Windows)
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#   powershell -ExecutionPolicy Bypass -File .\install.ps1 --plugins-dir "C:\path\to\plugins"
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ExtraArgs
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js not found. Install Node.js 22+ first.'
}

& node scripts/install.mjs @ExtraArgs
exit $LASTEXITCODE
