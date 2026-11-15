@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Shadow Dream

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "ACTION=%~1"
if not defined SHADOWDREAM_WSL_DISTRO set "SHADOWDREAM_WSL_DISTRO=Ubuntu"
set "WSL_DISTRO=%SHADOWDREAM_WSL_DISTRO%"
if /I "%ACTION%"=="--help" goto :help
if /I "%ACTION%"=="-h" goto :help
if /I "%ACTION%"=="--check" goto :check
if /I "%ACTION%"=="--update" goto :update
if /I "%ACTION%"=="--check-update" goto :check_update
set "FORCE_WSL="
set "FORCE_WINDOWS="
if /I "%ACTION%"=="--wsl" set "FORCE_WSL=1"
if /I "%ACTION%"=="--windows" set "FORCE_WINDOWS=1"

call :resolve
set "NATIVE_OK=%ERRORLEVEL%"
call :resolve_plugin
call :resolve_port
call :read_token

if defined FORCE_WSL goto :start_wsl
if defined FORCE_WINDOWS goto :need_native
if defined PLUGINS_DIR goto :need_native
call :resolve_wsl
if not errorlevel 1 goto :start_wsl

:need_native
if not "%NATIVE_OK%"=="0" goto :no_qq
goto :start_windows

:start_windows
call :probe 1
if not errorlevel 1 (
  echo Shadow Dream 已经在运行。
  call :print_info
  start "" "%WEBUI_URL%"
  goto :done
)

echo.
echo   启动 QQ：%QQ_EXE%
start "Shadow Dream QQ" /D "%QQ_DIR%" "%QQ_EXE%"

echo   等待 WebUI 就绪（最多 120 秒）...
call :probe 120
if errorlevel 1 (
  echo.
  echo   [错误] WebUI 没有在 120 秒内启动。
  echo   请检查 QQ 是否正常启动、LiteLoader 是否加载 shadowdream 插件。
  if defined PLUGINS_DIR echo   插件目录：%PLUGINS_DIR%\shadowdream
  echo   如果 Shadow Dream 跑在 WSL，请用：start-shadowdream.bat --wsl
  goto :fail
)

echo.
echo   Shadow Dream 已启动。
call :print_info
start "" "%WEBUI_URL%"
timeout /t 3 /nobreak >nul
goto :done

:start_wsl
call :resolve_wsl
if errorlevel 1 (
  echo.
  echo   [错误] 找不到可用的 WSL（%WSL_DISTRO%）或 start-shadowdream.sh。
  goto :fail
)
call :probe 1
if not errorlevel 1 (
  echo Shadow Dream 已经在运行。
  call :print_info
  start "" "%WEBUI_URL%"
  goto :done
)
echo.
echo   启动 WSL（%WSL_DISTRO%）里的 Shadow Dream...
start "Shadow Dream WSL" wsl.exe -d %WSL_DISTRO% -e bash -lc "exec bash %WSL_SCRIPT%"
echo   等待 WebUI 就绪（最多 120 秒）...
call :probe 120
if errorlevel 1 (
  echo.
  echo   [错误] WSL 里的 WebUI 没有在 120 秒内启动。
  echo   看新打开的 WSL 窗口日志；也可以在里面运行：
  echo     wsl.exe -d %WSL_DISTRO% -e bash -lc "bash %WSL_SCRIPT% --check"
  goto :fail
)
echo.
echo   Shadow Dream 已启动（WSL）。
call :print_info
start "" "%WEBUI_URL%"
timeout /t 3 /nobreak >nul
goto :done

:update
call :resolve_wsl
if errorlevel 1 (
  echo.
  echo   [错误] 更新目前走 WSL，但没找到 WSL 里的 start-shadowdream.sh。
  goto :fail
)
echo.
echo   检查并更新 WSL（%WSL_DISTRO%）里的 Shadow Dream...
wsl.exe -d %WSL_DISTRO% -e bash -lc "bash %WSL_SCRIPT% --update"
if errorlevel 1 (
  echo.
  echo   [错误] 更新失败。
  goto :fail
)
call :probe 10
if not errorlevel 1 (
  call :print_info
  start "" "%WEBUI_URL%"
) else (
  echo   [提示] 更新完成，但 WebUI 还没就绪；看 WSL 窗口或日志。
)
goto :done

:check_update
call :resolve_wsl
if errorlevel 1 (
  echo.
  echo   [错误] 没找到 WSL 里的 start-shadowdream.sh。
  goto :fail
)
wsl.exe -d %WSL_DISTRO% -e bash -lc "bash %WSL_SCRIPT% --check-update"
if errorlevel 1 goto :fail
goto :done

:help
echo.
echo   Shadow Dream 一键启动
echo.
echo   双击 start-shadowdream.bat，或：
echo     start-shadowdream.bat
echo     start-shadowdream.bat --check
echo     start-shadowdream.bat --check-update  检查更新
echo     start-shadowdream.bat --update        一键更新并重启
echo     start-shadowdream.bat --wsl           强制启动 WSL 里的 Shadow Dream
echo     start-shadowdream.bat --windows       强制启动 Windows QQ
echo.
echo   可选环境变量：
echo     QQ_EXE                  QQ.exe 路径
echo     QQ_DIR                  QQ 安装目录
echo     SHADOWDREAM_PLUGINS     LiteLoader 的 plugins 目录
echo     SHADOWDREAM_PORT        WebUI 端口，默认 3000
echo     SHADOWDREAM_HTTP_PORT   同上（优先）
echo     SHADOWDREAM_WSL_DISTRO  WSL 发行版，默认 Ubuntu
echo     SHADOWDREAM_WSL_SCRIPT  WSL 里的 start-shadowdream.sh 路径
echo.
exit /b 0

:check
call :resolve
if errorlevel 1 (
  echo   QQ        未找到
  echo   设置 QQ_EXE 后重试，例如：
  echo     set "QQ_EXE=C:\Program Files\Tencent\QQNT\QQ.exe"
) else (
  echo   QQ        %QQ_EXE%
)
call :resolve_plugin
call :resolve_port
call :read_token
if defined PLUGINS_DIR (
  echo   插件      %PLUGINS_DIR%\shadowdream
) else (
  echo   插件      未自动找到
)
call :resolve_wsl
if errorlevel 1 (
  echo   WSL       未检测到
) else (
  echo   WSL       %WSL_DISTRO% : %WSL_SCRIPT%
)
echo   WebUI     %WEBUI_URL%
if defined WEBUI_TOKEN echo   Token     %WEBUI_TOKEN%
exit /b 0

:resolve_wsl
set "WSL_SCRIPT="
where wsl.exe >nul 2>&1 || exit /b 1
if defined SHADOWDREAM_WSL_SCRIPT (
  set "WSL_SCRIPT=%SHADOWDREAM_WSL_SCRIPT%"
  wsl.exe -d %WSL_DISTRO% -e bash -lc "test -f %WSL_SCRIPT%" >nul 2>&1
  if not errorlevel 1 exit /b 0
  set "WSL_SCRIPT="
  exit /b 1
)
set "WSL_SCRIPT=$HOME/shadowdream/start-shadowdream.sh"
wsl.exe -d %WSL_DISTRO% -e bash -lc "test -f %WSL_SCRIPT%" >nul 2>&1
if not errorlevel 1 exit /b 0
set "WSL_SCRIPT=$HOME/ShadowDream/start-shadowdream.sh"
wsl.exe -d %WSL_DISTRO% -e bash -lc "test -f %WSL_SCRIPT%" >nul 2>&1
if not errorlevel 1 exit /b 0
set "WSL_SCRIPT="
exit /b 1

:resolve
set "QQ_DIR=%QQ_DIR%"
set "QQ_EXE=%QQ_EXE%"
if defined QQ_EXE if exist "%QQ_EXE%" goto :resolve_adjust
if defined QQ_DIR if exist "%QQ_DIR%\QQ.exe" set "QQ_EXE=%QQ_DIR%\QQ.exe"
if defined QQ_EXE if exist "%QQ_EXE%" goto :resolve_adjust

set "PF86=%ProgramFiles(x86)%"
if defined PF86 if exist "%PF86%\Tencent\QQNT\QQ.exe" set "QQ_EXE=%PF86%\Tencent\QQNT\QQ.exe"
if defined QQ_EXE goto :resolve_adjust
if exist "%ProgramFiles%\Tencent\QQNT\QQ.exe" set "QQ_EXE=%ProgramFiles%\Tencent\QQNT\QQ.exe"
if defined QQ_EXE goto :resolve_adjust
if exist "%LOCALAPPDATA%\Tencent\QQNT\QQ.exe" set "QQ_EXE=%LOCALAPPDATA%\Tencent\QQNT\QQ.exe"
if defined QQ_EXE goto :resolve_adjust
if exist "%LOCALAPPDATA%\Programs\Tencent\QQNT\QQ.exe" set "QQ_EXE=%LOCALAPPDATA%\Programs\Tencent\QQNT\QQ.exe"
if defined QQ_EXE goto :resolve_adjust
if exist "%USERPROFILE%\AppData\Local\Programs\QQNT\QQ.exe" set "QQ_EXE=%USERPROFILE%\AppData\Local\Programs\QQNT\QQ.exe"
if defined QQ_EXE goto :resolve_adjust

for /d %%D in ("%ProgramFiles%\Tencent\QQNT\versions\*") do if exist "%%~D\QQ.exe" set "QQ_EXE=%%~D\QQ.exe"
if defined QQ_EXE goto :resolve_adjust
exit /b 1

:resolve_adjust
for %%D in ("%QQ_EXE%") do set "QQ_DIR=%%~dpD"
if "%QQ_DIR:~-1%"=="\" set "QQ_DIR=%QQ_DIR:~0,-1%"
exit /b 0

:resolve_plugin
set "PLUGINS_DIR=%SHADOWDREAM_PLUGINS%"
if defined PLUGINS_DIR if not exist "%PLUGINS_DIR%\shadowdream\manifest.json" set "PLUGINS_DIR="
if defined PLUGINS_DIR goto :plugin_done

for %%P in (
  "%APPDATA%\QQ\LiteLoaderQQNT\plugins"
  "%APPDATA%\LiteLoaderQQNT\plugins"
  "%USERPROFILE%\Documents\LiteLoaderQQNT\plugins"
  "%LOCALAPPDATA%\LiteLoaderQQNT\plugins"
  "%ProgramFiles%\Tencent\QQNT\LiteLoader\plugins"
  "%ProgramFiles%\Tencent\QQNT\plugins"
) do if exist "%%~P\shadowdream\manifest.json" set "PLUGINS_DIR=%%~P"

:plugin_done
if not defined PLUGINS_DIR exit /b 0
for %%P in ("%PLUGINS_DIR%") do set "PROFILE=%%~dpP"
if "%PROFILE:~-1%"=="\" set "PROFILE=%PROFILE:~0,-1%"
set "CONFIG=%PROFILE%\data\shadowdream\config.json"
exit /b 0

:resolve_port
set "WEBUI_PORT=3000"
if defined CONFIG if exist "%CONFIG%" (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; try{ $c=Get-Content -LiteralPath '%CONFIG%' -Raw | ConvertFrom-Json; if($c.http.port){ $c.http.port } }catch{}"`) do set "WEBUI_PORT=%%P"
)
if defined SHADOWDREAM_PORT set "WEBUI_PORT=%SHADOWDREAM_PORT%"
if defined SHADOWDREAM_HTTP_PORT set "WEBUI_PORT=%SHADOWDREAM_HTTP_PORT%"
if not defined WEBUI_PORT set "WEBUI_PORT=3000"
set "WEBUI_URL=http://127.0.0.1:%WEBUI_PORT%/webui/"
exit /b 0

:read_token
set "WEBUI_TOKEN="
if defined CONFIG if exist "%CONFIG%" (
  for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; try{ $c=Get-Content -LiteralPath '%CONFIG%' -Raw | ConvertFrom-Json; if($c.http.webuiToken){ $c.http.webuiToken } elseif($c.http.accessToken){ $c.http.accessToken } }catch{}"`) do set "WEBUI_TOKEN=%%T"
)
exit /b 0

:probe
set "WAIT_SECONDS=%~1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; $deadline=(Get-Date).AddSeconds(%WAIT_SECONDS%); while((Get-Date) -lt $deadline){ foreach($u in @('http://127.0.0.1:%WEBUI_PORT%/webui/','http://127.0.0.1:%WEBUI_PORT%/health')){ try { $r=Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } } catch {} }; Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 exit /b 1
exit /b 0

:print_info
echo.
echo   WebUI     %WEBUI_URL%
if defined PLUGINS_DIR echo   插件      %PLUGINS_DIR%\shadowdream
if defined WEBUI_TOKEN echo   Token     %WEBUI_TOKEN%
echo.
exit /b 0

:no_qq
echo.
echo   [错误] 找不到 Windows QQ.exe。
echo   你可以设置 QQ_EXE 再运行：
echo     set "QQ_EXE=C:\Program Files\Tencent\QQNT\QQ.exe"
echo     start-shadowdream.bat
echo.
echo   如果 Shadow Dream 跑在 WSL，用：
echo     start-shadowdream.bat --wsl
echo.
echo   或者先运行 start-shadowdream.bat --check 查看检测结果。
goto :fail

:fail
echo.
pause
exit /b 1

:done
endlocal
exit /b 0
