#!/usr/bin/env bash
# Shadow Dream 一键更新（Linux / WSL）
#
# 默认从 GitHub Release install-latest 拉取精简包，更新源码、安装依赖、
# 构建插件、部署到 LiteLoader profile，然后重启 Shadow Dream / QQNT。
#
# 用法：
#   bash scripts/update-shadowdream.sh
#   bash scripts/update-shadowdream.sh --check
#   bash scripts/update-shadowdream.sh --check --bundle-url http://127.0.0.1:8000/shadowdream-slim.tar.gz
#   bash scripts/update-shadowdream.sh --no-restart --no-deploy
#
# 可选环境变量：
#   SHADOWDREAM_DIR           安装目录（默认脚本上一级）
#   SHADOWDREAM_REPO          GitHub 仓库，默认 derammeng/Shadow-Dream
#   SHADOWDREAM_REF           分支，默认 main
#   SHADOWDREAM_MANIFEST_URL  版本清单地址
#   SHADOWDREAM_BUNDLE_URL    精简包地址（镜像 / 自建）
#   SHADOWDREAM_ARCHIVE_URL   完整源码包地址
#   SHADOWDREAM_GITHUB_TOKEN  私有仓库 PAT
#   SHADOWDREAM_FORCE_RESTART 设为 1 时，找不到脚本 PID 也强制结束该 QQ 进程
set -euo pipefail

ORIGINAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 更新过程会覆盖 scripts/update-shadowdream.sh 本身，所以先复制到临时文件执行。
if [[ -z "${SHADOWDREAM_UPDATE_REEXEC:-}" && "${BASH_SOURCE[0]}" == "$ORIGINAL_ROOT/scripts/update-shadowdream.sh" ]]; then
  TMP_SELF="$(mktemp "${TMPDIR:-/tmp}/shadowdream-update.XXXXXX.sh")"
  cp "${BASH_SOURCE[0]}" "$TMP_SELF"
  chmod +x "$TMP_SELF"
  export SHADOWDREAM_UPDATE_REEXEC=1
  export SHADOWDREAM_UPDATE_ROOT="$ORIGINAL_ROOT"
  exec bash "$TMP_SELF" "$@"
fi

ROOT="${SHADOWDREAM_DIR:-${SHADOWDREAM_UPDATE_ROOT:-$ORIGINAL_ROOT}}"
ROOT="$(cd "$ROOT" && pwd)"
cd "$ROOT"

MODE="update"
NO_RESTART=0
NO_DEPLOY=0
FORCE=0
DELAY=0
REPO="${SHADOWDREAM_REPO:-derammeng/Shadow-Dream}"
REF="${SHADOWDREAM_REF:-main}"
MANIFEST_URL="${SHADOWDREAM_MANIFEST_URL:-}"
MANIFEST_URL_SET=0
if [[ -n "${SHADOWDREAM_MANIFEST_URL:-}" ]]; then
  MANIFEST_URL_SET=1
fi
BUNDLE_URL="${SHADOWDREAM_BUNDLE_URL:-}"
ARCHIVE_URL="${SHADOWDREAM_ARCHIVE_URL:-}"
GITHUB_TOKEN_VALUE="${SHADOWDREAM_GITHUB_TOKEN:-${SHADOWDREAM_TOKEN:-${GITHUB_TOKEN:-}}}"
FORCE_RESTART="${SHADOWDREAM_FORCE_RESTART:-0}"

usage() {
  cat <<'EOF'
Shadow Dream 一键更新

用法：
  bash scripts/update-shadowdream.sh                 检查并更新，完成后自动重启
  bash scripts/update-shadowdream.sh --check         只检查版本
  bash scripts/update-shadowdream.sh --force         版本相同也强制重装
  bash scripts/update-shadowdream.sh --no-restart    只更新，不停止/重启 QQ
  bash scripts/update-shadowdream.sh --no-deploy     只更新源码，不部署插件
  bash scripts/update-shadowdream.sh --help

可选参数：
  --bundle-url <url>      精简包地址（镜像 / 自建 / file://）
  --manifest-url <url>    版本清单地址
  --archive-url <url>     完整源码包地址
  --repo <owner/repo>     GitHub 仓库
  --ref <branch>          分支，默认 main

环境变量：
  SHADOWDREAM_DIR           安装目录
  SHADOWDREAM_GITHUB_TOKEN  私有仓库 PAT
  SHADOWDREAM_FORCE_RESTART 设为 1 时强制结束找不到父脚本的 QQ 进程
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check|-c|--check-update) MODE="check"; shift ;;
    --update) MODE="update"; shift ;;
    --force) FORCE=1; shift ;;
    --no-restart) NO_RESTART=1; shift ;;
    --no-deploy) NO_DEPLOY=1; shift ;;
    --delay) DELAY="${2:?--delay 缺少参数}"; shift 2 ;;
    --bundle-url) BUNDLE_URL="${2:?--bundle-url 缺少参数}"; shift 2 ;;
    --manifest-url) MANIFEST_URL="${2:?--manifest-url 缺少参数}"; MANIFEST_URL_SET=1; shift 2 ;;
    --archive-url) ARCHIVE_URL="${2:?--archive-url 缺少参数}"; shift 2 ;;
    --repo) REPO="${2:?--repo 缺少参数}"; shift 2 ;;
    --ref) REF="${2:?--ref 缺少参数}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$MANIFEST_URL" ]]; then
  MANIFEST_URL="https://github.com/${REPO}/releases/download/install-latest/install-bundle.json"
fi
if [[ -z "$BUNDLE_URL" ]]; then
  BUNDLE_URL="https://github.com/${REPO}/releases/download/install-latest/shadowdream-slim.tar.gz"
fi
if [[ -z "$ARCHIVE_URL" ]]; then
  ARCHIVE_URL="https://github.com/${REPO}/archive/${REF}.tar.gz"
fi

info() { printf '%s\n' "$*"; }
warn() { printf '警告：%s\n' "$*" >&2; }
die() { printf '错误：%s\n' "$*" >&2; exit 1; }

[[ -f "$ROOT/package.json" ]] || die "不是 Shadow Dream 目录（缺少 package.json）：$ROOT"
command -v curl >/dev/null 2>&1 || die "需要 curl 才能检查更新。"
command -v tar >/dev/null 2>&1 || die "需要 tar 才能解压更新包。"

load_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then return 0; fi
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
  fi
  if ! command -v node >/dev/null 2>&1; then
    for candidate in "$HOME"/.nvm/versions/node/*/bin; do
      if [[ -x "$candidate/node" ]]; then
        PATH="$candidate:$PATH"
        export PATH
        break
      fi
    done
  fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch_url() {
  local url="$1"
  local output="$2"
  local max_time="${3:-300}"
  case "$url" in
    file://*)
      cp "${url#file://}" "$output"
      return $?
      ;;
    /*)
      cp "$url" "$output"
      return $?
      ;;
  esac
  if [[ -n "$GITHUB_TOKEN_VALUE" ]]; then
    curl -fL --location-trusted --retry 2 --retry-delay 1 \
      --connect-timeout 15 --max-time "$max_time" \
      -H "Authorization: Bearer $GITHUB_TOKEN_VALUE" -o "$output" "$url"
  else
    curl -fL --retry 2 --retry-delay 1 \
      --connect-timeout 15 --max-time "$max_time" -o "$output" "$url"
  fi
}

read_commit() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local commit
  commit="$(sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$file" | head -n 1)"
  if [[ -n "$commit" && "$commit" != "unknown" ]]; then
    printf '%s\n' "$commit"
    return 0
  fi
  return 1
}

local_commit() {
  local commit=""
  if [[ -f "$ROOT/install-bundle.json" ]]; then
    commit="$(read_commit "$ROOT/install-bundle.json" || true)"
  fi
  if [[ -z "$commit" ]] && command -v git >/dev/null 2>&1 && [[ -d "$ROOT/.git" ]]; then
    commit="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
  fi
  printf '%s\n' "$commit"
}

remote_commit() {
  local manifest="$TMP/remote-manifest.json"
  if [[ "$REF" == "main" || "$MANIFEST_URL_SET" -eq 1 ]]; then
    if fetch_url "$MANIFEST_URL" "$manifest" 60 2>/dev/null; then
      local commit
      commit="$(read_commit "$manifest" || true)"
      if [[ -n "$commit" ]]; then
        printf '%s\n' "$commit"
        return 0
      fi
    fi
  fi

  local api="https://api.github.com/repos/${REPO}/commits/${REF}"
  local api_file="$TMP/remote-api.json"
  if fetch_url "$api" "$api_file" 60 2>/dev/null; then
    local commit
    commit="$(sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([0-9a-f]\{7,\}\)".*/\1/p' "$api_file" | head -n 1)"
    if [[ -n "$commit" ]]; then
      printf '%s\n' "$commit"
      return 0
    fi
  fi

  if command -v git >/dev/null 2>&1; then
    local commit
    commit="$(git ls-remote "https://github.com/${REPO}.git" "refs/heads/${REF}" 2>/dev/null | awk '{print $1}' | head -n 1 || true)"
    if [[ -n "$commit" ]]; then
      printf '%s\n' "$commit"
      return 0
    fi
  fi

  return 1
}

short_commit() {
  local value="${1:-unknown}"
  if [[ "$value" == "unknown" || -z "$value" ]]; then
    printf 'unknown'
  else
    printf '%s' "${value:0:7}"
  fi
}

find_qq() {
  if [[ -n "${QQ_BIN:-}" && -x "${QQ_BIN}" ]]; then
    QQ_DIR="$(cd "$(dirname "$QQ_BIN")" && pwd)"
    return 0
  fi
  if [[ -n "${QQ_DIR:-}" ]]; then
    [[ -d "$QQ_DIR" ]] && QQ_DIR="$(cd "$QQ_DIR" && pwd)"
    QQ_BIN="$QQ_DIR/qq"
    return 0
  fi
  for candidate in \
    "$HOME/qqnt/reinstall/squashfs-root" \
    "$HOME/qqnt/squashfs-root" \
    "$HOME/qqnt/QQ" \
    "/opt/QQ/squashfs-root" \
    "/opt/QQ" \
    "$HOME/QQ"; do
    if [[ -x "$candidate/qq" ]]; then
      QQ_DIR="$(cd "$candidate" && pwd)"
      QQ_BIN="$QQ_DIR/qq"
      return 0
    fi
  done
}

find_profile() {
  if [[ -n "${LITELOADERQQNT_PROFILE:-}" ]]; then
    PROFILE="$LITELOADERQQNT_PROFILE"
  else
    PROFILE=""
    for candidate in \
      "$HOME/qqnt/profile-clean" \
      "$HOME/qqnt/profile" \
      "$HOME/.local/share/LiteLoaderQQNT" \
      "${QQ_DIR:-}/profile" \
      "/opt/QQ/profile"; do
      if [[ -d "$candidate/plugins/shadowdream" ]]; then
        PROFILE="$candidate"
        break
      fi
    done
    if [[ -z "$PROFILE" ]]; then
      for candidate in \
        "$HOME/qqnt/profile-clean" \
        "$HOME/qqnt/profile" \
        "$HOME/.local/share/LiteLoaderQQNT" \
        "${QQ_DIR:-}/profile" \
        "/opt/QQ/profile"; do
        if [[ -d "$candidate" ]]; then
          PROFILE="$candidate"
          break
        fi
      done
    fi
  fi
  PROFILE="${PROFILE:-${QQ_DIR:-}/profile}"
  if [[ -n "$PROFILE" ]]; then
    PROFILE="$(cd "$PROFILE" 2>/dev/null && pwd || printf '%s' "$PROFILE")"
  fi
}

read_port() {
  if [[ -n "${SHADOWDREAM_HTTP_PORT:-}" ]]; then
    printf '%s\n' "$SHADOWDREAM_HTTP_PORT"
    return 0
  fi
  local config="$PROFILE/data/shadowdream/config.json"
  if [[ -f "$config" ]]; then
    if command -v node >/dev/null 2>&1; then
      node -e '
        const fs = require("node:fs");
        try {
          const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
          process.stdout.write(String((c.http && c.http.port) || 3000));
        } catch {
          process.stdout.write("3000");
        }
      ' "$config" 2>/dev/null && return 0
    fi
    local port
    port="$(sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$config" | head -n 1)"
    if [[ -n "$port" ]]; then
      printf '%s\n' "$port"
      return 0
    fi
  fi
  printf '3000\n'
}

read_token() {
  local config="$PROFILE/data/shadowdream/config.json"
  [[ -f "$config" ]] || return 0
  if command -v node >/dev/null 2>&1; then
    node -e '
      const fs = require("node:fs");
      try {
        const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const http = c.http || {};
        process.stdout.write(String(http.webuiToken || http.accessToken || ""));
      } catch {}
    ' "$config" 2>/dev/null || true
  else
    sed -n \
      -e 's/.*"webuiToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      -e 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      "$config" | head -n 1
  fi
}

http_ready() {
  local port="$1"
  local base="http://127.0.0.1:${port}"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 1 "$base/webui/" >/dev/null 2>&1 && return 0
    curl -fsS --max-time 1 "$base/health" >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q -T 1 -O /dev/null "$base/webui/" 2>/dev/null && return 0
    wget -q -T 1 -O /dev/null "$base/health" 2>/dev/null && return 0
    return 1
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/${port}") 2>/dev/null
}

print_instance() {
  local port="$1"
  local token
  token="$(read_token)"
  echo
  echo "  WebUI     http://127.0.0.1:${port}/webui/"
  local lan
  lan="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -n "$lan" && "$lan" != "127.0.0.1" ]]; then
    echo "  局域网    http://${lan}:${port}/webui/"
  fi
  if [[ -n "$token" ]]; then
    echo "  Token     $token"
  fi
}

find_qq
find_profile
if [[ -n "${PROFILE:-}" ]]; then
  PID_FILE="$PROFILE/shadowdream.pid"
else
  PID_FILE="$TMP/shadowdream.pid"
fi
PORT="$(read_port)"

LOCAL_COMMIT="$(local_commit)"
if [[ -z "$LOCAL_COMMIT" ]]; then
  LOCAL_COMMIT="unknown"
fi

info "Shadow Dream 更新检查"
info "目录：$ROOT"
info "仓库：$REPO ($REF)"
info "本地：$(short_commit "$LOCAL_COMMIT")"

REMOTE_COMMIT="$(remote_commit || true)"
if [[ -z "$REMOTE_COMMIT" ]]; then
  die "无法读取远端版本。检查网络，或用 --manifest-url / --bundle-url 指定镜像。"
fi
info "远端：$(short_commit "$REMOTE_COMMIT")"

if [[ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" && "$FORCE" -eq 0 ]]; then
  if [[ -f "$ROOT/install-bundle.json" ]] && grep -q '"dirty"[[:space:]]*:[[:space:]]*true' "$ROOT/install-bundle.json"; then
    warn "本地源码有未提交改动（install-bundle.json 标记 dirty）。"
  fi
  info "已经是最新版本。"
  exit 0
fi

if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
  info "发现新版本。"
else
  info "版本相同，按 --force 重新安装。"
fi

if [[ "$MODE" == "check" ]]; then
  exit 0
fi

stop_instance() {
  if [[ "$NO_RESTART" -eq 1 ]]; then
    info "跳过停止/重启（--no-restart）。"
    return 0
  fi
  info "停止现有 Shadow Dream / QQNT..."
  local pids=""
  if [[ -f "$PID_FILE" ]]; then
    pids="$pids $(cat "$PID_FILE" 2>/dev/null || true)"
  fi
  pids="$pids $(pgrep -f -- 'start-shadowdream\.sh' 2>/dev/null || true)"
  pids="$pids $(pgrep -f -- 'start-qq-headless\.sh' 2>/dev/null || true)"
  local pid
  for pid in $(printf '%s\n' "$pids" | tr ' ' '\n' | sort -u); do
    [[ -z "$pid" || "$pid" == "$$" || "$pid" == "${PPID:-}" ]] && continue
    if kill -0 "$pid" 2>/dev/null; then
      info "  kill $pid"
      kill "$pid" 2>/dev/null || true
    fi
  done

  local waited=0
  while [[ "$waited" -lt 30 ]]; do
    local alive=0
    for pid in $(printf '%s\n' "$pids" | tr ' ' '\n' | sort -u); do
      [[ -z "$pid" || "$pid" == "$$" || "$pid" == "${PPID:-}" ]] && continue
      kill -0 "$pid" 2>/dev/null && alive=1
    done
    [[ "$alive" -eq 0 ]] && break
    sleep 0.5
    waited=$((waited + 1))
  done

  for pid in $(printf '%s\n' "$pids" | tr ' ' '\n' | sort -u); do
    [[ -z "$pid" || "$pid" == "$$" || "$pid" == "${PPID:-}" ]] && continue
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  rm -f "$PID_FILE"

  if [[ -n "${QQ_BIN:-}" ]] && pgrep -f -- "$QQ_BIN" >/dev/null 2>&1; then
    if [[ "$FORCE_RESTART" == "1" ]]; then
      warn "QQ 仍在运行，SHADOWDREAM_FORCE_RESTART=1，强制结束。"
      pkill -TERM -f -- "$QQ_BIN" 2>/dev/null || true
      sleep 2
      pkill -KILL -f -- "$QQ_BIN" 2>/dev/null || true
    else
      die "QQ 仍在运行，但不属于当前启动脚本。请手动退出 QQ 后重试，或设置 SHADOWDREAM_FORCE_RESTART=1。"
    fi
  fi
}

backup_source() {
  local archive="$ROOT/rollback/update-$STAMP.tar.gz"
  mkdir -p "$ROOT/rollback"
  if tar \
    --exclude='./node_modules' \
    --exclude='./packages/*/dist' \
    --exclude='./packages/*/dist-cjs' \
    --exclude='./packages/*/dist-test' \
    --exclude='./packages/qqnt/release' \
    --exclude='./rollback' \
    --exclude='./logs' \
    --exclude='./.git' \
    -czf "$archive" -C "$ROOT" . 2>/dev/null; then
    info "源码备份：$archive"
  else
    warn "源码备份失败，继续更新。"
  fi
}

download_source() {
  local archive="$TMP/source.tar.gz"
  local url="$BUNDLE_URL"
  local kind="slim"
  if [[ "$REF" != "main" ]]; then
    url="$ARCHIVE_URL"
    kind="full"
  fi
  printf '下载更新包（%s）...\n' "$kind" >&2
  if ! fetch_url "$url" "$archive" 300; then
    if [[ "$kind" == "slim" ]]; then
      warn "精简包下载失败，回退完整源码包。"
      url="$ARCHIVE_URL"
      kind="full"
      fetch_url "$url" "$archive" 300 || die "下载失败：$url"
    else
      die "下载失败：$url"
    fi
  fi

  mkdir -p "$TMP/src"
  tar -xzf "$archive" -C "$TMP/src" || die "更新包解压失败。"
  for candidate in "$TMP/src"/*/; do
    if [[ -d "$candidate" && -f "${candidate}package.json" ]]; then
      printf '%s\n' "${candidate%/}"
      return 0
    fi
  done
  if [[ -f "$TMP/src/package.json" ]]; then
    printf '%s\n' "$TMP/src"
    return 0
  fi
  die "更新包结构异常，找不到 package.json。"
}

STAMP="$(date +%Y%m%d%H%M%S)"

# 先下载并检查安装包，确认网络/压缩包没问题后再停服务，减少停机时间。
SRC="$(download_source)"
BUNDLE_COMMIT="$(read_commit "$SRC/install-bundle.json" 2>/dev/null || true)"
info "更新包：$(short_commit "${BUNDLE_COMMIT:-$REMOTE_COMMIT}")"

if [[ "$DELAY" -gt 0 ]]; then
  info "等待 ${DELAY}s 后停止服务..."
  sleep "$DELAY"
fi

stop_instance
backup_source
cp -a "$SRC"/. "$ROOT"/

APPLIED_COMMIT="${BUNDLE_COMMIT:-$REMOTE_COMMIT}"
if [[ -z "$APPLIED_COMMIT" ]]; then
  APPLIED_COMMIT="$REMOTE_COMMIT"
fi
printf '{\n  "name": "shadowdream",\n  "kind": "update",\n  "commit": "%s",\n  "dirty": false,\n  "builtAt": "%s"\n}\n' \
  "$APPLIED_COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ROOT/install-bundle.json"

load_node
command -v npm >/dev/null 2>&1 || die "找不到 npm，无法构建更新。"
info "安装依赖..."
if [[ -f "$ROOT/package-lock.json" ]]; then
  if ! npm ci --no-audit --no-fund; then
    warn "npm ci 失败，改用 npm install。"
    npm install --no-audit --no-fund
  fi
else
  npm install --no-audit --no-fund
fi

info "构建..."
npm run build

deploy_plugin() {
  [[ "$NO_DEPLOY" -eq 1 ]] && return 0
  if [[ "$NO_RESTART" -eq 1 ]]; then
    info "未停止 QQ，跳过插件部署（--no-restart）。"
    return 0
  fi
  local release="$ROOT/packages/qqnt/release/shadowdream"
  [[ -f "$release/main.js" ]] || die "插件构建产物不存在：$release/main.js"
  if [[ -z "${PROFILE:-}" ]]; then
    warn "没有找到 LiteLoader profile，跳过插件部署。"
    return 0
  fi
  local plugin="$PROFILE/plugins/shadowdream"
  local backup_root="$PROFILE/shadowdream-backups"
  mkdir -p "$backup_root" "$PROFILE/plugins"
  if [[ -d "$plugin" ]]; then
    local backup="$backup_root/shadowdream.$STAMP"
    cp -a "$plugin" "$backup"
    info "旧插件备份：$backup"
    rm -rf "$plugin"
  fi
  cp -a "$release" "$plugin"
  info "插件已部署：$plugin"
}

deploy_plugin

if [[ "$NO_RESTART" -eq 1 ]]; then
  info "更新完成（未重启）。"
  exit 0
fi

PORT="$(read_port)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/start-after-update.log"
info "重启 Shadow Dream / QQNT（日志：$LOG_FILE）..."
if command -v setsid >/dev/null 2>&1; then
  setsid nohup bash "$ROOT/start-shadowdream.sh" >"$LOG_FILE" 2>&1 < /dev/null &
else
  nohup bash "$ROOT/start-shadowdream.sh" >"$LOG_FILE" 2>&1 < /dev/null &
fi
RESTART_PID=$!
info "启动进程：$RESTART_PID"

READY=0
for _ in $(seq 1 120); do
  if http_ready "$PORT"; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  echo "更新完成，但 WebUI 没有起来。日志尾部：" >&2
  tail -n 40 "$LOG_FILE" 2>/dev/null >&2 || true
  exit 1
fi

info "更新完成，Shadow Dream 已重启。"
print_instance "$PORT"
