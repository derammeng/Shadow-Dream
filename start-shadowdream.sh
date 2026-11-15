#!/usr/bin/env bash
# Shadow Dream 一键无头启动（Linux / WSL）
#
# 自动寻找 QQ、LiteLoader profile 和插件，启动 Xvfb + QQ，
# 等待 WebUI 就绪后打印地址和 token。Ctrl+C 停止。
#
# 用法：
#   ./start-shadowdream.sh
#   ./start-shadowdream.sh --check
#   ./start-shadowdream.sh --help
#
# 可选环境变量：
#   QQ_DIR                     QQ 解包目录（目录里有 qq）
#   QQ_BIN                     直接指定 QQ 可执行文件
#   LITELOADERQQNT_PROFILE     LiteLoader profile 目录
#   DISPLAY_NUM                Xvfb 显示编号，默认 :99
#   SCREEN                     Xvfb 分辨率，默认 1280x800x24
#   SHADOWDREAM_HTTP_PORT      覆盖 WebUI 端口（默认读配置或 3000）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="start"
case "${1:-}" in
  ""|--start) ;;
  --check) MODE="check" ;;
  --update)
    shift
    [[ -f "$ROOT/scripts/update-shadowdream.sh" ]] || {
      echo "缺少 scripts/update-shadowdream.sh，请先重新安装或同步仓库。" >&2
      exit 1
    }
    exec bash "$ROOT/scripts/update-shadowdream.sh" --update "$@"
    ;;
  --check-update)
    shift
    [[ -f "$ROOT/scripts/update-shadowdream.sh" ]] || {
      echo "缺少 scripts/update-shadowdream.sh，请先重新安装或同步仓库。" >&2
      exit 1
    }
    exec bash "$ROOT/scripts/update-shadowdream.sh" --check "$@"
    ;;
  -h|--help) MODE="help" ;;
  *)
    echo "未知参数：$1" >&2
    echo "用 --help 查看用法。" >&2
    exit 1
    ;;
esac

usage() {
  cat <<'EOF'
Shadow Dream 一键无头启动

用法：
  ./start-shadowdream.sh           启动 Xvfb + QQ + Shadow Dream
  ./start-shadowdream.sh --check   只检查 QQ、profile、插件和端口
  ./start-shadowdream.sh --check-update  只检查是否有新版本
  ./start-shadowdream.sh --update  一键更新并自动重启 Shadow Dream + QQ
  ./start-shadowdream.sh --help    显示帮助

环境变量：
  QQ_DIR                     QQ 解包目录（目录里有 qq）
  QQ_BIN                     直接指定 QQ 可执行文件
  LITELOADERQQNT_PROFILE     LiteLoader profile 目录
  DISPLAY_NUM                Xvfb 显示编号，默认 :99
  SCREEN                     Xvfb 分辨率，默认 1280x800x24
  SHADOWDREAM_HTTP_PORT      覆盖 WebUI 端口
EOF
}

if [[ "$MODE" == "help" ]]; then
  usage
  exit 0
fi

info() { printf '%s\n' "$*"; }
die() { printf '错误：%s\n' "$*" >&2; exit 1; }

load_node() {
  if command -v node >/dev/null 2>&1; then return 0; fi
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

find_qq() {
  if [[ -n "${QQ_BIN:-}" && -x "${QQ_BIN}" ]]; then
    QQ_DIR="$(cd "$(dirname "$QQ_BIN")" && pwd)"
    return 0
  fi

  if [[ -n "${QQ_DIR:-}" ]]; then
    if [[ -d "$QQ_DIR" ]]; then
      QQ_DIR="$(cd "$QQ_DIR" && pwd)"
    fi
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
      "$QQ_DIR/profile" \
      "/opt/QQ/profile"; do
      if [[ -d "$candidate/plugins/shadowdream" ]]; then
        PROFILE="$candidate"
        break
      fi
    done
    if [[ -z "${PROFILE:-}" ]]; then
      for candidate in \
        "$HOME/qqnt/profile-clean" \
        "$HOME/qqnt/profile" \
        "$HOME/.local/share/LiteLoaderQQNT" \
        "$QQ_DIR/profile" \
        "/opt/QQ/profile"; do
        if [[ -d "$candidate" ]]; then
          PROFILE="$candidate"
          break
        fi
      done
    fi
  fi
  PROFILE="${PROFILE:-$QQ_DIR/profile}"
  mkdir -p "$PROFILE"
  PROFILE="$(cd "$PROFILE" && pwd)"
  LITELOADERQQNT_PROFILE="$PROFILE"
}

find_libs() {
  if [[ -n "${QQ_LD_LIBRARY_PATH:-}" ]]; then
    return 0
  fi
  for candidate in \
    "$QQ_DIR/../libs/root/usr/lib/x86_64-linux-gnu" \
    "$QQ_DIR/libs/root/usr/lib/x86_64-linux-gnu" \
    "$HOME/qqnt/libs/root/usr/lib/x86_64-linux-gnu" \
    "/opt/QQ/libs/root/usr/lib/x86_64-linux-gnu" \
    "/opt/QQ/usr/lib/x86_64-linux-gnu"; do
    if [[ -f "$candidate/libnspr4.so" ]]; then
      QQ_LD_LIBRARY_PATH="$(cd "$candidate" && pwd)"
      export QQ_LD_LIBRARY_PATH
      return 0
    fi
  done
}

read_port() {
  if [[ -n "${SHADOWDREAM_HTTP_PORT:-}" ]]; then
    printf '%s\n' "$SHADOWDREAM_HTTP_PORT"
    return 0
  fi
  if [[ -f "$CONFIG" ]]; then
    if command -v node >/dev/null 2>&1; then
      node -e '
        const fs = require("node:fs");
        try {
          const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
          process.stdout.write(String((c.http && c.http.port) || 3000));
        } catch {
          process.stdout.write("3000");
        }
      ' "$CONFIG" 2>/dev/null && return 0
    fi
    local port
    port="$(sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$CONFIG" | head -n 1)"
    if [[ -n "$port" ]]; then
      printf '%s\n' "$port"
      return 0
    fi
  fi
  printf '3000\n'
}

read_token() {
  [[ -f "$CONFIG" ]] || return 0
  if command -v node >/dev/null 2>&1; then
    node -e '
      const fs = require("node:fs");
      try {
        const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const http = c.http || {};
        process.stdout.write(String(http.webuiToken || http.accessToken || ""));
      } catch {}
    ' "$CONFIG" 2>/dev/null || true
  else
    sed -n \
      -e 's/.*"webuiToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      -e 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      "$CONFIG" | head -n 1
  fi
}

http_ready() {
  local base="http://127.0.0.1:${PORT}"
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
  (exec 3<>"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null
}

print_summary() {
  local token
  token="$(read_token)"
  echo
  echo "  QQ        $QQ_BIN"
  echo "  Profile   $PROFILE"
  echo "  WebUI     http://127.0.0.1:${PORT}/webui/"
  local lan
  lan="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -n "$lan" && "$lan" != "127.0.0.1" ]]; then
    echo "  局域网    http://${lan}:${PORT}/webui/"
  fi
  if [[ -n "$token" ]]; then
    echo "  Token     $token"
  else
    echo "  Token     未设置（免登录或首次启动后生成）"
  fi
}

load_node
find_qq
if [[ ! -x "${QQ_BIN:-}" ]]; then
  die "找不到 QQ 可执行文件。请设置 QQ_DIR 或 QQ_BIN（例如 QQ_DIR=/opt/QQ/squashfs-root）。"
fi
find_profile
find_libs

PLUGIN="$PROFILE/plugins/shadowdream"
RELEASE="$ROOT/packages/qqnt/release/shadowdream"
CONFIG="$PROFILE/data/shadowdream/config.json"
PORT="$(read_port)"
PORT="${PORT:-3000}"

if [[ "$MODE" == "check" ]]; then
  print_summary
  if [[ -f "$PLUGIN/manifest.json" ]]; then
    echo "  插件      已部署（$PLUGIN）"
  else
    echo "  插件      缺失（启动时会尝试构建/部署）"
  fi
  echo "  端口      $PORT"
  if [[ -n "${QQ_LD_LIBRARY_PATH:-}" ]]; then
    echo "  额外库    $QQ_LD_LIBRARY_PATH"
  fi
  if ! command -v Xvfb >/dev/null 2>&1; then
    echo "  Xvfb      未安装"
  fi
  exit 0
fi

if http_ready; then
  echo "Shadow Dream 已经在运行。"
  print_summary
  exit 0
fi

ensure_plugin() {
  if [[ ! -f "$RELEASE/main.js" ]]; then
    if [[ -f "$PLUGIN/main.js" ]]; then
      info "使用已部署插件：$PLUGIN"
      return 0
    fi
    if ! command -v npm >/dev/null 2>&1; then
      die "插件尚未构建，也找不到 npm。请先运行 npm install && npm run build:plugin。"
    fi
    info "插件尚未构建，执行 npm run build:plugin ..."
    npm run build:plugin
  fi
  [[ -f "$RELEASE/main.js" ]] || die "插件构建产物不存在：$RELEASE/main.js"

  if [[ ! -f "$PLUGIN/manifest.json" || "$RELEASE/main.js" -nt "$PLUGIN/main.js" ]]; then
    if [[ -d "$PLUGIN" ]]; then
      local backup_root="$PROFILE/shadowdream-backups"
      local backup="$backup_root/shadowdream.$(date +%Y%m%d%H%M%S)"
      mkdir -p "$backup_root"
      mv "$PLUGIN" "$backup"
      info "旧插件已备份：$backup"
    fi
    mkdir -p "$PROFILE/plugins"
    cp -a "$RELEASE" "$PLUGIN"
    info "插件已部署：$PLUGIN"
  fi
}

ensure_plugin

command -v Xvfb >/dev/null 2>&1 || die "缺少 Xvfb。Debian/Ubuntu 安装：sudo apt install -y xvfb"
mkdir -p "$PROFILE/plugins" "$PROFILE/data"

export QQ_DIR QQ_BIN LITELOADERQQNT_PROFILE="$PROFILE"
export SHADOWDREAM_DIR="$ROOT"
export DISPLAY_NUM="${DISPLAY_NUM:-:99}"
export SCREEN="${SCREEN:-1280x800x24}"

# 已经有 Xvfb 时复用，避免重复启动 :99 失败。
xvfb_running=0
if command -v pgrep >/dev/null 2>&1 && pgrep -f "Xvfb ${DISPLAY_NUM}" >/dev/null 2>&1; then
  xvfb_running=1
fi
if [[ -S "/tmp/.X11-unix/X${DISPLAY_NUM#:}" ]]; then
  xvfb_running=1
fi
if [[ "$xvfb_running" -eq 1 ]]; then
  display_num="${DISPLAY_NUM#:}"
  if [[ -S "/tmp/.X11-unix/X${display_num}" ]]; then
    export DISPLAY="${DISPLAY:-:${display_num}}"
  else
    export DISPLAY="${DISPLAY:-127.0.0.1:${display_num}.0}"
  fi
  export XVFB_SKIP=1
  info "检测到已运行的 Xvfb，复用 DISPLAY=${DISPLAY}"
fi

info "启动 Xvfb + QQ（无头）..."
PID_FILE="$PROFILE/shadowdream.pid"
rm -f "$PID_FILE"
bash "$ROOT/scripts/start-qq-headless.sh" &
CHILD=$!
printf '%s\n' "$CHILD" > "$PID_FILE"

cleanup() {
  if [[ -n "${CHILD:-}" ]] && kill -0 "$CHILD" 2>/dev/null; then
    kill "$CHILD" 2>/dev/null || true
    wait "$CHILD" 2>/dev/null || true
  fi
  if [[ -f "$PID_FILE" ]] && [[ "$(cat "$PID_FILE" 2>/dev/null || true)" == "${CHILD:-}" ]]; then
    rm -f "$PID_FILE"
  fi
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

READY=0
for _ in $(seq 1 120); do
  if http_ready; then
    READY=1
    break
  fi
  if ! kill -0 "$CHILD" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  echo "启动超时或 QQ 提前退出，没有等到 WebUI。" >&2
  echo "检查 QQ 日志和 LiteLoader 插件日志；也可以先运行 ./start-shadowdream.sh --check。" >&2
  cleanup
  exit 1
fi

print_summary
echo
echo "按 Ctrl+C 停止。"
set +e
wait "$CHILD"
STATUS=$?
set -e
echo "QQ 已退出（code ${STATUS}）。"
exit "$STATUS"
