@echo off
chcp 65001 >nul
echo 正在启动 Shadow Dream...
wsl.exe -d Ubuntu -e bash /home/meng/qqnt/start-shadowdream.sh
if errorlevel 1 (
  echo 启动失败，请检查 WSL 和日志。
  pause
  exit /b 1
)
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:3000/webui/"
