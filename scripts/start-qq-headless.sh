#!/usr/bin/env bash
# 无头启动 Linux QQNT + LiteLoaderQQNT。
#
# 依赖：xvfb、QQNT 运行库、已安装的 LiteLoaderQQNT 插件。
# 用法：
#   QQ_DIR=/opt/QQ LITELOADERQQNT_PROFILE=/opt/QQ/profile ./start-qq-headless.sh
#   XVFB_SKIP=1 DISPLAY=:99 ./start-qq-headless.sh   # 复用已运行的 Xvfb
#
# 所有参数都可以通过环境变量覆盖，脚本本身不需要 root。
set -euo pipefail

QQ_DIR="${QQ_DIR:-/opt/QQ}"
QQ_BIN="${QQ_BIN:-$QQ_DIR/qq}"
PROFILE="${LITELOADERQQNT_PROFILE:-$QQ_DIR/profile}"
DISPLAY_NUM="${DISPLAY_NUM:-:99}"
SCREEN="${SCREEN:-1280x800x24}"
XVFB_SKIP="${XVFB_SKIP:-0}"

if [[ ! -x "$QQ_BIN" ]]; then
  echo "找不到可执行的 QQ：$QQ_BIN" >&2
  echo "请设置 QQ_DIR 或 QQ_BIN；AppImage 解包后二进制通常叫 qq。" >&2
  exit 1
fi

mkdir -p "$PROFILE/plugins" "$PROFILE/data"

if [[ "$XVFB_SKIP" == "1" ]]; then
  echo "复用已运行的 Xvfb（DISPLAY=${DISPLAY:-127.0.0.1:${DISPLAY_NUM#:}.0}）"
  export DISPLAY="${DISPLAY:-127.0.0.1:${DISPLAY_NUM#:}.0}"
else
  if ! command -v Xvfb >/dev/null 2>&1; then
    echo "缺少 Xvfb。Debian/Ubuntu 安装：" >&2
    echo "  sudo apt update && sudo apt install -y xvfb" >&2
    exit 1
  fi

  # Xvfb 默认走 unix socket；如果 /tmp/.X11-unix 不是 1777（例如 WSLg
  # 创建成 777），Xvfb 无法 bind，则自动退到本地 TCP 显示。
  XVFB_TRANSPORT="${XVFB_TRANSPORT:-auto}"
  if [[ "$XVFB_TRANSPORT" == "auto" ]]; then
    X11_MODE="$(stat -c '%a' /tmp/.X11-unix 2>/dev/null || true)"
    if [[ "$X11_MODE" == "1777" ]]; then
      XVFB_TRANSPORT="unix"
    else
      XVFB_TRANSPORT="tcp"
    fi
  fi

  if [[ "$XVFB_TRANSPORT" == "tcp" ]]; then
    echo "使用 Xvfb TCP 显示（/tmp/.X11-unix 权限不是 1777）"
    Xvfb "$DISPLAY_NUM" -screen 0 "$SCREEN" -nolisten unix -listen tcp -ac &
    XVFB_PID=$!
    export DISPLAY="127.0.0.1:${DISPLAY_NUM#:}.0"
  else
    Xvfb "$DISPLAY_NUM" -screen 0 "$SCREEN" -nolisten tcp -ac &
    XVFB_PID=$!
    export DISPLAY="$DISPLAY_NUM"
    for _ in $(seq 1 50); do
      [[ -S "/tmp/.X11-unix/X${DISPLAY_NUM#:}" ]] && break
      sleep 0.1
    done
    if [[ ! -S "/tmp/.X11-unix/X${DISPLAY_NUM#:}" ]]; then
      echo "Xvfb 没有成功创建 $DISPLAY_NUM，请检查 /tmp/.X11-unix 和 xkbcomp。" >&2
      exit 1
    fi
  fi

  sleep 1
  if ! kill -0 "$XVFB_PID" 2>/dev/null; then
    echo "Xvfb 启动失败；请检查 xkbcomp / 显示端口。" >&2
    exit 1
  fi
fi

QQ_PID=""
cleanup() {
  if [[ -n "$QQ_PID" ]]; then kill "$QQ_PID" 2>/dev/null || true; fi
  if [[ -n "${XVFB_PID:-}" ]]; then kill "$XVFB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM
export LITELOADERQQNT_PROFILE="$PROFILE"
export APPDIR="$QQ_DIR"
# 服务器通常没有 GPU；强制软件渲染并关闭 Chromium 沙箱。
export LIBGL_ALWAYS_SOFTWARE=1
export ELECTRON_OZONE_PLATFORM_HINT=x11

# AppImage 解包后的库通常在同级或 usr/lib；额外库用 QQ_LD_LIBRARY_PATH 传入。
LIB_DIRS=("$QQ_DIR" "$QQ_DIR/usr/lib")
if [[ -n "${QQ_LD_LIBRARY_PATH:-}" ]]; then
  LIB_DIRS+=("$QQ_LD_LIBRARY_PATH")
fi
LIB_PATH=""
for dir in "${LIB_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    LIB_PATH="${LIB_PATH:+$LIB_PATH:}$dir"
  fi
done
if [[ -n "${LD_LIBRARY_PATH:-}" ]]; then
  LIB_PATH="${LIB_PATH:+$LIB_PATH:}$LD_LIBRARY_PATH"
fi
export LD_LIBRARY_PATH="$LIB_PATH"

cd "$QQ_DIR"
"$QQ_BIN" \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --ozone-platform=x11 &
QQ_PID=$!
wait "$QQ_PID"
