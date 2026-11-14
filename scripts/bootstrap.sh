#!/usr/bin/env bash
# Shadow Dream 云端安装脚本
#
# 公开仓库：
#   bash <(curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh)
#
# 私有仓库需要 token：
#   SHADOWDREAM_TOKEN=ghp_xxx bash <(curl -fsSL ...)
#
# 可选环境变量：
#   SHADOWDREAM_DIR       安装目录，默认 ~/ShadowDream
#   SHADOWDREAM_REPO      GitHub 仓库，默认 derammeng/Shadow-Dream
#   SHADOWDREAM_REF       分支 / tag，默认 main
#   SHADOWDREAM_PLUGINS   LiteLoaderQQNT plugins 目录
#   SHADOWDREAM_WEBUI_TOKEN  指定 WebUI token
set -euo pipefail

REPO="${SHADOWDREAM_REPO:-derammeng/Shadow-Dream}"
REF="${SHADOWDREAM_REF:-main}"
DEST="${SHADOWDREAM_DIR:-$HOME/ShadowDream}"
TOKEN="${SHADOWDREAM_TOKEN:-${GITHUB_TOKEN:-}}"
PLUGINS_DIR="${SHADOWDREAM_PLUGINS:-}"
WEBUI_TOKEN="${SHADOWDREAM_WEBUI_TOKEN:-}"
NO_TOKEN=0

usage() {
  cat <<'EOF'
Shadow Dream 云端安装

用法：
  bash bootstrap.sh [选项]

选项：
  --dir <目录>         安装目录，默认 ~/ShadowDream
  --repo <owner/repo>  GitHub 仓库
  --ref <分支/tag>     默认 main
  --plugins-dir <目录> LiteLoaderQQNT 的 plugins 目录
  --token <token>      WebUI token
  --no-token           不生成 WebUI token
  -h, --help           显示帮助
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DEST="${2:?--dir 缺少参数}"; shift 2 ;;
    --repo) REPO="${2:?--repo 缺少参数}"; shift 2 ;;
    --ref) REF="${2:?--ref 缺少参数}"; shift 2 ;;
    --plugins-dir) PLUGINS_DIR="${2:?--plugins-dir 缺少参数}"; shift 2 ;;
    --token) WEBUI_TOKEN="${2:?--token 缺少参数}"; shift 2 ;;
    --no-token) NO_TOKEN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$1" >&2; usage >&2; exit 1 ;;
  esac
done

# 非交互 shell 通常不会加载 nvm，先尝试常见安装位置。
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  for candidate in "$HOME"/.nvm/versions/node/*/bin; do
    if [ -x "$candidate/node" ]; then
      PATH="$candidate:$PATH"
      break
    fi
  done
  export PATH
fi
if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js。请先安装 Node.js 22+：https://nodejs.org/" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "需要 Node.js 22+，当前是 $(node -v)" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "需要 curl。" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ARCHIVE="$TMP/source.tar.gz"
URL="https://api.github.com/repos/${REPO}/tarball/${REF}"

echo "Shadow Dream 云端安装"
echo "仓库：$REPO"
echo "分支：$REF"
echo "目录：$DEST"

CURL_ARGS=(-fL --retry 3 --retry-delay 2 --connect-timeout 20 -H "Accept: application/vnd.github+json" -o "$ARCHIVE" "$URL")
if [[ -n "$TOKEN" ]]; then
  CURL_ARGS=(-H "Authorization: Bearer $TOKEN" "${CURL_ARGS[@]}")
fi

if ! curl "${CURL_ARGS[@]}"; then
  echo
  echo "下载失败。" >&2
  echo "如果仓库是私有的，请先设置 SHADOWDREAM_TOKEN（GitHub PAT，至少 repo 读权限）。" >&2
  echo "或者把仓库设为公开，或把 bootstrap.sh 放到公开 gist / 文档站。" >&2
  exit 1
fi

tar -xzf "$ARCHIVE" -C "$TMP"
SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d -name '*Shadow-Dream*' | head -n 1)"
if [[ -z "$SRC" || ! -f "$SRC/package.json" ]]; then
  echo "压缩包结构异常，找不到 package.json。" >&2
  exit 1
fi

if [[ -d "$DEST" && -n "$(ls -A "$DEST" 2>/dev/null || true)" ]]; then
  BACKUP="${DEST}.bak.$(date +%Y%m%d%H%M%S)"
  echo "已有安装，备份到 $BACKUP"
  mv "$DEST" "$BACKUP"
fi
mkdir -p "$DEST"
cp -a "$SRC"/. "$DEST"/
cd "$DEST"

echo
echo "安装依赖..."
npm install --no-audit --no-fund
echo "构建..."
npm run build

ARGS=(--skip-install --skip-build --no-zip)
if [[ -n "$PLUGINS_DIR" ]]; then
  ARGS+=(--plugins-dir "$PLUGINS_DIR")
fi
if [[ -n "$WEBUI_TOKEN" ]]; then
  ARGS+=(--token "$WEBUI_TOKEN")
fi
if [[ "$NO_TOKEN" -eq 1 ]]; then
  ARGS+=(--no-token)
fi
node scripts/install.mjs "${ARGS[@]}"

echo
echo "安装完成：$DEST"
echo "WebUI：http://127.0.0.1:3000/webui/"
