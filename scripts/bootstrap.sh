#!/usr/bin/env bash
# Shadow Dream 云端安装脚本
#
# 默认下载「精简安装包」（只含构建 / 运行需要的文件，不含文档站、截图和测试），
# 精简包不可用时自动回退到完整源码包。
#
# 基本用法：
#   curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
#     | bash -s -- --dir "$HOME/ShadowDream"
#
# 带参数（推荐）：
#   curl -fsSL .../scripts/bootstrap.sh | bash -s -- \
#     --dir "$HOME/ShadowDream" \
#     --plugins-dir "$HOME/.local/share/LiteLoaderQQNT/plugins" \
#     --webui-token "你的20位token"
#
# 可选环境变量（命令行参数优先）：
#   SHADOWDREAM_DIR             安装目录，默认 ~/ShadowDream
#   SHADOWDREAM_REPO            GitHub 仓库，默认 derammeng/Shadow-Dream
#   SHADOWDREAM_REF             分支 / tag，默认 main
#   SHADOWDREAM_PLUGINS         LiteLoaderQQNT plugins 目录
#   SHADOWDREAM_WEBUI_TOKEN     指定 WebUI token
#   SHADOWDREAM_GITHUB_TOKEN    私有仓库 GitHub PAT（兼容 SHADOWDREAM_TOKEN / GITHUB_TOKEN）
#   SHADOWDREAM_SOURCE          auto / slim / full，默认 auto
#   SHADOWDREAM_BUNDLE_URL      自定义精简包地址（镜像 / 自建）
#   SHADOWDREAM_ARCHIVE_URL     自定义完整源码包地址（镜像 / 自建）
set -euo pipefail

REPO="${SHADOWDREAM_REPO:-derammeng/Shadow-Dream}"
REF="${SHADOWDREAM_REF:-main}"
DEST="${SHADOWDREAM_DIR:-$HOME/ShadowDream}"
GITHUB_TOKEN_VALUE="${SHADOWDREAM_GITHUB_TOKEN:-${SHADOWDREAM_TOKEN:-${GITHUB_TOKEN:-}}}"
PLUGINS_DIR="${SHADOWDREAM_PLUGINS:-}"
WEBUI_TOKEN="${SHADOWDREAM_WEBUI_TOKEN:-}"
SOURCE="${SHADOWDREAM_SOURCE:-auto}"
BUNDLE_URL="${SHADOWDREAM_BUNDLE_URL:-}"
ARCHIVE_URL="${SHADOWDREAM_ARCHIVE_URL:-}"
BUNDLE_URL_SET=0
if [[ -n "$BUNDLE_URL" ]]; then
  BUNDLE_URL_SET=1
fi
NO_TOKEN=0
INSTALL_QQ=0
INSTALL_LITELOADER=0
INSTALL_XVFB=0
QQ_URL="${SHADOWDREAM_QQ_URL:-}"
LITELOADER_URL="${SHADOWDREAM_LITELOADER_URL:-}"
QQ_DIR="${SHADOWDREAM_QQ_DIR:-}"
LITELOADER_DIR="${SHADOWDREAM_LITELOADER_DIR:-}"

usage() {
  cat <<'EOF'
Shadow Dream 云端安装

用法：
  bash bootstrap.sh [选项]

选项：
  --dir <目录>           安装目录，默认 ~/ShadowDream
  --repo <owner/repo>    GitHub 仓库，默认 derammeng/Shadow-Dream
  --ref <分支/tag>       默认 main
  --plugins-dir <目录>   LiteLoaderQQNT 的 plugins 目录
  --webui-token <token>  WebUI token（--token 为兼容别名）
  --github-token <token> 私有仓库 GitHub PAT
  --source <模式>        auto / slim / full，默认 auto
  --bundle-url <url>     自定义精简安装包地址
  --archive-url <url>    自定义完整源码包地址
  --no-token             不生成 WebUI token
  --install-qq           自动下载并安装 Linux QQ（仅 Linux）
  --install-litelloader  自动安装 LiteLoaderQQNT 并注入 QQ（仅 Linux）
  --install-xvfb         自动安装 Xvfb 和 QQ 运行库（仅 Linux）
  --qq-url <url>         指定 QQ 安装包地址
  --liteloader-url <url> 指定 LiteLoaderQQNT 源码包地址
  --qq-dir <目录>        QQ 安装目录，默认 /opt/QQ
  --liteloader-dir <目录> LiteLoaderQQNT 目录
  -h, --help             显示帮助

说明：
  默认先下载精简安装包，仅包含构建和运行所需文件；不包含
  docs/、docs-site/（文档站 / 知识库）、截图、测试和 CI 配置。
  精简包不存在时自动回退完整源码包；--source slim 可强制只使用
  精简包，--source full 可强制使用完整源码包。

  默认不会自动安装 QQ、LiteLoaderQQNT、Xvfb；需要自动安装时
  显式加 --install-qq / --install-litelloader / --install-xvfb。
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir|--dest) DEST="${2:?$1 缺少参数}"; shift 2 ;;
    --repo) REPO="${2:?--repo 缺少参数}"; shift 2 ;;
    --ref) REF="${2:?--ref 缺少参数}"; shift 2 ;;
    --plugins-dir) PLUGINS_DIR="${2:?--plugins-dir 缺少参数}"; shift 2 ;;
    --webui-token|--token) WEBUI_TOKEN="${2:?$1 缺少参数}"; shift 2 ;;
    --github-token) GITHUB_TOKEN_VALUE="${2:?--github-token 缺少参数}"; shift 2 ;;
    --source)
      SOURCE="${2:?--source 缺少参数}"
      case "$SOURCE" in
        auto|slim|full) ;;
        *) echo "无效的 --source：$SOURCE（可选 auto / slim / full）" >&2; exit 1 ;;
      esac
      shift 2
      ;;
    --bundle-url) BUNDLE_URL="${2:?--bundle-url 缺少参数}"; BUNDLE_URL_SET=1; shift 2 ;;
    --archive-url) ARCHIVE_URL="${2:?--archive-url 缺少参数}"; shift 2 ;;
    --no-token) NO_TOKEN=1; shift ;;
    --install-qq|--with-qq) INSTALL_QQ=1; shift ;;
    --install-litelloader|--install-liteloader|--with-litelloader) INSTALL_LITELOADER=1; shift ;;
    --install-xvfb|--with-xvfb) INSTALL_XVFB=1; shift ;;
    --qq-url) QQ_URL="${2:?--qq-url 缺少参数}"; shift 2 ;;
    --liteloader-url) LITELOADER_URL="${2:?--liteloader-url 缺少参数}"; shift 2 ;;
    --qq-dir) QQ_DIR="${2:?--qq-dir 缺少参数}"; shift 2 ;;
    --liteloader-dir) LITELOADER_DIR="${2:?--liteloader-dir 缺少参数}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "${HOME:-}" ]]; then
  echo "HOME 未设置，无法确定默认安装目录；请用 --dir 指定。" >&2
  exit 1
fi
if [[ "$NO_TOKEN" -eq 1 && -n "$WEBUI_TOKEN" ]]; then
  echo "--no-token 与 --webui-token 不能同时使用。" >&2
  exit 1
fi

# 展开命令行里带引号的 ~（例如 --dir "~/ShadowDream"）。
expand_home() {
  case "$1" in
    "~") printf '%s\n' "$HOME" ;;
    "~/"*) printf '%s/%s\n' "$HOME" "${1:2}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}
DEST="$(expand_home "$DEST")"
if [[ -n "$PLUGINS_DIR" ]]; then
  PLUGINS_DIR="$(expand_home "$PLUGINS_DIR")"
fi

# install.mjs 会从 cd 后的安装目录解析 --plugins-dir，所以先转成绝对路径。
case "$DEST" in
  /*) ;;
  *) DEST="$(pwd)/$DEST" ;;
esac
if [[ "$DEST" != "/" ]]; then
  while [[ "$DEST" != "/" && "$DEST" == */ ]]; do
    DEST="${DEST%/}"
  done
fi
if [[ "$DEST" == "/" || "$DEST" == "$HOME" ]]; then
  echo "安装目录不能是 / 或 HOME 本身；请用 --dir 指定一个子目录。" >&2
  exit 1
fi
if [[ -n "$PLUGINS_DIR" ]]; then
  PLUGINS_DIR="$(expand_home "$PLUGINS_DIR")"
  case "$PLUGINS_DIR" in
    /*) ;;
    *) PLUGINS_DIR="$(pwd)/$PLUGINS_DIR" ;;
  esac
fi
if [[ -n "$QQ_DIR" ]]; then
  QQ_DIR="$(expand_home "$QQ_DIR")"
  case "$QQ_DIR" in
    /*) ;;
    *) QQ_DIR="$(pwd)/$QQ_DIR" ;;
  esac
fi
if [[ -n "$LITELOADER_DIR" ]]; then
  LITELOADER_DIR="$(expand_home "$LITELOADER_DIR")"
  case "$LITELOADER_DIR" in
    /*) ;;
    *) LITELOADER_DIR="$(pwd)/$LITELOADER_DIR" ;;
  esac
fi

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

for command_name in npm curl tar; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "缺少 $command_name。请先安装 Node.js 22+（自带 npm）和 curl。" >&2
    exit 1
  fi
done

# 默认地址；允许镜像 / 自建地址覆盖。
DEFAULT_BUNDLE_URL="https://github.com/${REPO}/releases/download/install-latest/shadowdream-slim.tar.gz"
if [[ -z "$BUNDLE_URL" ]]; then
  BUNDLE_URL="$DEFAULT_BUNDLE_URL"
fi
if [[ -z "$ARCHIVE_URL" ]]; then
  ARCHIVE_URL="https://github.com/${REPO}/archive/${REF}.tar.gz"
fi

TRY_SLIM=0
case "$SOURCE" in
  slim) TRY_SLIM=1 ;;
  auto)
    if [[ "$REF" == "main" || "$BUNDLE_URL_SET" -eq 1 ]]; then
      TRY_SLIM=1
    fi
    ;;
  full) ;;
esac

if [[ "$SOURCE" == "slim" && "$REF" != "main" && "$BUNDLE_URL_SET" -eq 0 ]]; then
  echo "精简安装包默认跟随 main，与 --ref $REF 不匹配。" >&2
  echo "请改用 --source full，或用 --bundle-url 指定对应版本的安装包。" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ARCHIVE="$TMP/source.tar.gz"
SRC_ROOT="$TMP/src"

download() {
  local url="$1"
  local output="$2"
  if [[ -n "$GITHUB_TOKEN_VALUE" ]]; then
    # GitHub 的 archive / release 会 302 到 codeload / objects 域；
    # 私有仓库需要把 Authorization 带到重定向后的地址。
    curl -fL --location-trusted --retry 3 --retry-delay 2 --connect-timeout 20 \
      -H "Authorization: Bearer $GITHUB_TOKEN_VALUE" -o "$output" "$url"
  else
    curl -fL --retry 3 --retry-delay 2 --connect-timeout 20 -o "$output" "$url"
  fi
}

echo "Shadow Dream 云端安装"
echo "仓库：$REPO"
echo "分支：$REF"
echo "目录：$DEST"
echo "模式：$SOURCE"

USED_SOURCE="full"
if [[ "$TRY_SLIM" -eq 1 ]]; then
  echo
  echo "下载精简安装包..."
  if download "$BUNDLE_URL" "$ARCHIVE"; then
    USED_SOURCE="slim"
  else
    rm -f "$ARCHIVE"
    if [[ "$SOURCE" == "slim" ]]; then
      echo "精简安装包下载失败：$BUNDLE_URL" >&2
      echo "如果刚推送代码，请等 GitHub Actions 生成后重试；或改用 --source full。" >&2
      exit 1
    fi
    echo "精简安装包暂不可用，回退到完整源码包。" >&2
  fi
fi

if [[ "$USED_SOURCE" == "full" ]]; then
  echo
  echo "下载完整源码包..."
  if ! download "$ARCHIVE_URL" "$ARCHIVE"; then
    echo
    echo "下载失败：$ARCHIVE_URL" >&2
    echo "如果仓库是私有的，请先设置 --github-token（GitHub PAT，至少 repo 读权限）。" >&2
    echo "GitHub 网络不稳定时可使用 --bundle-url / --archive-url 指向镜像或自建地址。" >&2
    exit 1
  fi
fi

mkdir -p "$SRC_ROOT"
if ! tar -xzf "$ARCHIVE" -C "$SRC_ROOT"; then
  echo "压缩包解压失败。" >&2
  exit 1
fi

SRC=""
for candidate in "$SRC_ROOT"/*/; do
  if [[ -d "$candidate" && -f "${candidate}package.json" ]]; then
    SRC="${candidate%/}"
    break
  fi
done
if [[ -z "$SRC" && -f "$SRC_ROOT/package.json" ]]; then
  SRC="$SRC_ROOT"
fi
if [[ -z "$SRC" || ! -f "$SRC/package.json" ]]; then
  echo "压缩包结构异常，找不到 package.json。" >&2
  exit 1
fi

if [[ -f "$SRC/install-bundle.json" ]]; then
  BUNDLE_INFO="$(node -e '
    const fs = require("node:fs");
    const info = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const parts = [info.kind || "slim"];
    if (info.commit) parts.push(String(info.commit).slice(0, 7));
    if (info.dirty) parts.push("dirty");
    console.log(parts.join(" "));
  ' "$SRC/install-bundle.json" 2>/dev/null || true)"
  if [[ -n "$BUNDLE_INFO" ]]; then
    echo "安装包：$BUNDLE_INFO"
  fi
fi

if [[ -d "$DEST" && -n "$(ls -A "$DEST" 2>/dev/null || true)" ]]; then
  BACKUP="${DEST%/}.bak.$(date +%Y%m%d%H%M%S)"
  echo "已有安装，备份到 $BACKUP"
  mv "$DEST" "$BACKUP"
fi
mkdir -p "$DEST"
cp -a "$SRC"/. "$DEST"/
cd "$DEST"

echo
echo "安装依赖..."
if [[ -f package-lock.json ]] && npm ci --no-audit --no-fund; then
  :
else
  npm install --no-audit --no-fund
fi

echo
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
if [[ "$INSTALL_QQ" -eq 1 ]]; then
  ARGS+=(--install-qq)
fi
if [[ "$INSTALL_LITELOADER" -eq 1 ]]; then
  ARGS+=(--install-litelloader)
fi
if [[ "$INSTALL_XVFB" -eq 1 ]]; then
  ARGS+=(--install-xvfb)
fi
if [[ -n "$QQ_URL" ]]; then
  ARGS+=(--qq-url "$QQ_URL")
fi
if [[ -n "$LITELOADER_URL" ]]; then
  ARGS+=(--liteloader-url "$LITELOADER_URL")
fi
if [[ -n "$QQ_DIR" ]]; then
  ARGS+=(--qq-dir "$QQ_DIR")
fi
if [[ -n "$LITELOADER_DIR" ]]; then
  ARGS+=(--liteloader-dir "$LITELOADER_DIR")
fi
node scripts/install.mjs "${ARGS[@]}"

echo
echo "安装完成：$DEST"
echo "安装包类型：$USED_SOURCE"
echo "WebUI：http://127.0.0.1:3000/webui/"
echo "文档：https://derammeng.github.io/Shadow-Dream/"
