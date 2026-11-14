# Shadow Dream cloud installer (Windows)
# Public repo:
#   irm https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.ps1 | iex
# Private repo:
#   $env:SHADOWDREAM_TOKEN = "ghp_xxx"; irm ... | iex
param(
  [string]$Dir = $env:SHADOWDREAM_DIR,
  [string]$Repo = $env:SHADOWDREAM_REPO,
  [string]$Ref = $env:SHADOWDREAM_REF,
  [string]$PluginsDir = $env:SHADOWDREAM_PLUGINS,
  [string]$Token = $env:SHADOWDREAM_TOKEN,
  [switch]$NoToken
)

$ErrorActionPreference = 'Stop'
if (-not $Dir) { $Dir = Join-Path $HOME 'ShadowDream' }
if (-not $Repo) { $Repo = 'derammeng/Shadow-Dream' }
if (-not $Ref) { $Ref = 'main' }
if (-not $Token) { $Token = $env:GITHUB_TOKEN }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js not found. Install Node.js 22+ from https://nodejs.org/'
}
$major = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($major -lt 22) { throw "Node.js 22+ required, current: $(& node -v)" }

Write-Host "Shadow Dream cloud installer"
Write-Host "Repo: $Repo"
Write-Host "Ref:  $Ref"
Write-Host "Dir:  $Dir"

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("shadowdream-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $archive = Join-Path $tmp 'source.zip'
  $url = "https://github.com/$Repo/archive/$Ref.zip"
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  Write-Host "Downloading..."
  try {
    Invoke-WebRequest -Uri $url -OutFile $archive -Headers $headers -UseBasicParsing
  } catch {
    throw "Download failed. For a private repository set SHADOWDREAM_TOKEN (GitHub PAT with repo read access), or make the repository public. $($_.Exception.Message)"
  }

  Expand-Archive -LiteralPath $archive -DestinationPath $tmp -Force
  $src = Get-ChildItem -LiteralPath $tmp -Directory |
    Where-Object { $_.Name -like '*Shadow-Dream*' } |
    Select-Object -First 1
  if (-not $src -or -not (Test-Path (Join-Path $src.FullName 'package.json'))) {
    throw 'Archive does not look like Shadow Dream (package.json missing).'
  }

  if ((Test-Path $Dir) -and (Get-ChildItem -LiteralPath $Dir -Force | Select-Object -First 1)) {
    $backup = "$Dir.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Backing up existing install to $backup"
    Move-Item -LiteralPath $Dir -Destination $backup
  }
  New-Item -ItemType Directory -Path $Dir -Force | Out-Null
  Copy-Item -Path (Join-Path $src.FullName '*') -Destination $Dir -Recurse -Force
  Set-Location -LiteralPath $Dir

  Write-Host 'Installing dependencies...'
  & npm.cmd install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  Write-Host 'Building...'
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

  $installArgs = @('scripts/install.mjs', '--skip-install', '--skip-build', '--no-zip')
  if ($PluginsDir) { $installArgs += @('--plugins-dir', $PluginsDir) }
  if ($env:SHADOWDREAM_WEBUI_TOKEN) { $installArgs += @('--token', $env:SHADOWDREAM_WEBUI_TOKEN) }
  if ($NoToken) { $installArgs += '--no-token' }
  & node @installArgs
  if ($LASTEXITCODE -ne 0) { throw 'install.mjs failed' }

  Write-Host ''
  Write-Host "Installed: $Dir"
  Write-Host 'WebUI: http://127.0.0.1:3000/webui/'
} finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
