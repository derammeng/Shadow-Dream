#!/bin/bash
set -u

LOG_DIR=/tmp/shadowdream
mkdir -p "$LOG_DIR"

# 1. Xvfb（TCP :99，兼容当前 WSL 的 /tmp/.X11-unix 权限）
if ! pgrep -x Xvfb >/dev/null 2>&1; then
  echo "启动 Xvfb..."
  rm -f /tmp/.X99-lock
  bash /home/meng/qqnt/start-xvfb.sh >"$LOG_DIR/xvfb.log" 2>&1
  sleep 2
fi

# 2. QQ headless（新安装 + 干净 profile）
if ! pgrep -x qq >/dev/null 2>&1; then
  echo "启动 QQ headless..."
  nohup bash /home/meng/qqnt/run-qq-clean.sh >"$LOG_DIR/qq.log" 2>&1 &
else
  echo "QQ 已在运行"
fi

# 3. Koishi
if ! pgrep -f '[k]oishi/bin.js start' >/dev/null 2>&1; then
  echo "启动 Koishi..."
  (
    cd /home/meng/koishi-app || exit 1
    export PATH="$HOME/.nvm/versions/node/v22.23.5/bin:$PATH"
    nohup node node_modules/koishi/bin.js start >"$LOG_DIR/koishi.log" 2>&1 &
  )
else
  echo "Koishi 已在运行"
fi

sleep 2
echo
echo "Shadow Dream 启动完成"
echo "WebUI: http://127.0.0.1:3000/webui/"
echo "日志:  $LOG_DIR"
