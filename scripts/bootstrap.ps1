# Shadow Dream cloud installer (Windows)
#
# Default: download the slim installer bundle (runtime/build files only, no docs
# site / knowledge base, screenshots or tests). Falls back to the full source
# archive when the bundle is not available yet.
#
# Public repo:
#   irm https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.ps1 | iex
#
# With parameters (recommended):
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.ps1))) `
#     -Dir "$env:USERPROFILE\ShadowDream" `
#     -PluginsDir "C:\path\to\LiteLoaderQQNT\plugins" `
#     -WebUiToken "your-20-char-token"
#
# Environment variables (command-line parameters win):
#   SHADOWDREAM_DIR, SHADOWDREAM_REPO, SHADOWDREAM_REF, SHADOWDREAM_PLUGINS,
#   SHADOWDREAM_WEBUI_TOKEN, SHADOWDREAM_GITHUB_TOKEN, SHADOWDREAM_SOURCE,
#   SHADOWDREAM_BUNDLE_URL, SHADOWDREAM_ARCHIVE_URL
[CmdletBinding()]
param(
  [string]$Dir = $env:SHADOWDREAM_DIR,
  [string]$Repo = $env:SHADOWDREAM_REPO,
  [string]$Ref = $env:SHADOWDREAM_REF,
  [string]$PluginsDir = $env:SHADOWDREAM_PLUGINS,
  [string]$WebUiToken = $env:SHADOWDREAM_WEBUI_TOKEN,
  [string]$GithubToken = $env:SHADOWDREAM_GITHUB_TOKEN,
  [string]$Source = $env:SHADOWDREAM_SOURCE,
  [string]$BundleUrl = $env:SHADOWDREAM_BUNDLE_URL,
  [string]$ArchiveUrl = $env:SHADOWDREAM_ARCHIVE_URL,
  [switch]$NoToken
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Older Windows PowerShell 5.1 installations may not enable TLS 1.2 by default.
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {
  # Ignore: PowerShell 7 or restricted hosts do not need this.
}

if (-not $Dir) { $Dir = Join-Path $HOME 'ShadowDream' }
if (-not $Repo) { $Repo = 'derammeng/Shadow-Dream' }
if (-not $Ref) { $Ref = 'main' }
if (-not $Source) { $Source = 'auto' }
if ($Source -notin @('auto', 'slim', 'full')) {
  throw "Invalid -Source '$Source'. Use auto, slim or full."
}
if (-not $GithubToken) { $GithubToken = $env:SHADOWDREAM_TOKEN }
if (-not $GithubToken) { $GithubToken = $env:GITHUB_TOKEN }
if ($NoToken -and $WebUiToken) {
  throw '-NoToken and -WebUiToken cannot be used together.'
}

$BundleUrlSet = [bool]$BundleUrl
if (-not $BundleUrl) {
  $BundleUrl = "https://github.com/${Repo}/releases/download/install-latest/shadowdream-slim.zip"
}
if (-not $ArchiveUrl) {
  $ArchiveUrl = "https://github.com/${Repo}/archive/${Ref}.zip"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js not found. Install Node.js 22+ from https://nodejs.org/'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'npm.cmd not found. Reinstall Node.js 22+ (npm is bundled).'
}
$major = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($major -lt 22) { throw "Node.js 22+ required, current: $(& node -v)" }

# install.mjs resolves --plugins-dir from the process cwd; resolve it before
# changing into the install directory.
$Dir = [IO.Path]::GetFullPath($Dir)
if ($PluginsDir) { $PluginsDir = [IO.Path]::GetFullPath($PluginsDir) }
$dirRoot = [IO.Path]::GetPathRoot($Dir)
$homeRoot = [IO.Path]::GetFullPath($HOME)
if (
  [string]::Equals($Dir, $dirRoot, [StringComparison]::OrdinalIgnoreCase) -or
  [string]::Equals($Dir, $homeRoot, [StringComparison]::OrdinalIgnoreCase)
) {
  throw 'Install directory cannot be a drive root or HOME itself. Use a subdirectory.'
}

$trySlim = $false
switch ($Source) {
  'slim' { $trySlim = $true }
  'auto' { if ($Ref -eq 'main' -or $BundleUrlSet) { $trySlim = $true } }
}
if ($Source -eq 'slim' -and $Ref -ne 'main' -and -not $BundleUrlSet) {
  throw "The slim bundle tracks main and does not match -Ref $Ref. Use -Source full or -BundleUrl."
}

$script:Headers = @{}
if ($GithubToken) { $script:Headers['Authorization'] = "Bearer $GithubToken" }

function Save-File {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$OutFile
  )
  Write-Host "Downloading $Url"
  $request = @{
    Uri             = $Url
    OutFile         = $OutFile
    UseBasicParsing = $true
    TimeoutSec      = 600
  }
  if ($script:Headers.Count -gt 0) { $request['Headers'] = $script:Headers }
  Invoke-WebRequest @request
}

Write-Host 'Shadow Dream cloud installer'
Write-Host "Repo: $Repo"
Write-Host "Ref:  $Ref"
Write-Host "Dir:  $Dir"
Write-Host "Mode: $Source"

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("shadowdream-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $archive = Join-Path $tmp 'source.zip'
  $usedSource = 'full'

  if ($trySlim) {
    try {
      Save-File -Url $BundleUrl -OutFile $archive
      $usedSource = 'slim'
    } catch {
      Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
      if ($Source -eq 'slim') {
        throw "Slim bundle download failed: $BundleUrl. If the repository was just pushed, wait for GitHub Actions to publish it, or use -Source full. $($_.Exception.Message)"
      }
      Write-Warning "Slim bundle unavailable; falling back to the full source archive. $($_.Exception.Message)"
    }
  }

  if ($usedSource -eq 'full') {
    try {
      Save-File -Url $ArchiveUrl -OutFile $archive
    } catch {
      throw "Download failed: $ArchiveUrl. For a private repository set -GithubToken (GitHub PAT with repo read access). For GitHub connectivity issues use -BundleUrl / -ArchiveUrl with a mirror. $($_.Exception.Message)"
    }
  }

  $srcRoot = Join-Path $tmp 'src'
  Expand-Archive -LiteralPath $archive -DestinationPath $srcRoot -Force
  $src = $null
  if (Test-Path (Join-Path $srcRoot 'package.json')) {
    $src = Get-Item -LiteralPath $srcRoot
  } else {
    $src = Get-ChildItem -LiteralPath $srcRoot -Directory |
      Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } |
      Select-Object -First 1
  }
  if (-not $src) {
    throw 'Archive does not look like Shadow Dream (package.json missing).'
  }

  $bundleInfo = Join-Path $src.FullName 'install-bundle.json'
  if (Test-Path $bundleInfo) {
    $info = Get-Content -LiteralPath $bundleInfo -Raw | ConvertFrom-Json
    $commit = ''
    if ($info.commit) {
      $commit = [string]$info.commit
      if ($commit.Length -gt 7) { $commit = $commit.Substring(0, 7) }
    }
    $dirty = if ($info.dirty) { ' dirty' } else { '' }
    Write-Host "Bundle: $($info.kind) $commit$dirty"
  }

  if ((Test-Path $Dir) -and (Get-ChildItem -LiteralPath $Dir -Force | Select-Object -First 1)) {
    $backup = "$Dir.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Backing up existing install to $backup"
    Move-Item -LiteralPath $Dir -Destination $backup
  }
  New-Item -ItemType Directory -Path $Dir -Force | Out-Null
  Get-ChildItem -LiteralPath $src.FullName -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Dir -Recurse -Force
  }
  Set-Location -LiteralPath $Dir

  Write-Host 'Installing dependencies...'
  $lock = Join-Path $Dir 'package-lock.json'
  if (Test-Path $lock) {
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      Write-Warning 'npm ci failed; falling back to npm install.'
      & npm.cmd install --no-audit --no-fund
    }
  } else {
    & npm.cmd install --no-audit --no-fund
  }
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

  Write-Host 'Building...'
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

  $installArgs = @('scripts/install.mjs', '--skip-install', '--skip-build', '--no-zip')
  if ($PluginsDir) { $installArgs += @('--plugins-dir', $PluginsDir) }
  if ($WebUiToken) { $installArgs += @('--token', $WebUiToken) }
  if ($NoToken) { $installArgs += '--no-token' }
  & node @installArgs
  if ($LASTEXITCODE -ne 0) { throw 'install.mjs failed' }

  Write-Host ''
  Write-Host "Installed: $Dir"
  Write-Host "Bundle: $usedSource"
  Write-Host 'WebUI: http://127.0.0.1:3000/webui/'
  Write-Host 'Docs:  https://derammeng.github.io/Shadow-Dream/'
} finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
