# Linux 无头运行

Linux QQ 是 Electron 应用，需要 X11。服务器上用 Xvfb 提供虚拟显示。

## 依赖

```bash
sudo apt update
sudo apt install -y xvfb libasound2t64 libgbm1 libnss3 \
  libxss1 libxtst6 libgtk-3-0
```

不同发行版包名可能不同。

## 安装 QQ 与 LiteLoader

1. 下载 Linux QQ AppImage 并解包；
2. 安装 LiteLoaderQQNT；
3. 给 QQ 的 `resources/app/package.json` 打 LiteLoader 入口补丁；
4. 设置：

```bash
export LITELOADERQQNT_PROFILE=/opt/QQ/profile
```

5. 把插件放到：

```text
/opt/QQ/profile/plugins/shadowdream
```

## 启动 Xvfb

```bash
Xvfb :99 -screen 0 1280x800x24 -nolisten unix -listen tcp -ac &
export DISPLAY=127.0.0.1:99.0
```

如果 `/tmp/.X11-unix` 权限正常，也可以用 Unix socket：

```bash
Xvfb :99 -screen 0 1280x800x24 -ac &
export DISPLAY=:99
```

## 启动 QQ

```bash
cd /opt/QQ/squashfs-root
export APPDIR=$PWD
export LD_LIBRARY_PATH="$APPDIR:$APPDIR/usr/lib:$LD_LIBRARY_PATH"
"$APPDIR/qq" --no-sandbox --disable-gpu --disable-dev-shm-usage --ozone-platform=x11
```

首次启动后打开 WebUI 输入 token，扫码或一键登录。

## 注意事项

- 不要同时启动多个 QQ / Xvfb 实例；
- `--no-sandbox` 只建议在受控服务器使用；
- 不要把未设 token 的 3000 端口直接暴露公网；
- 如果 QQ 登录页只监听不响应，先确认 QQ 进程没有段错误，再清理旧 Xvfb / profile 后重试。

更完整的 systemd 示例见项目内 `docs/headless.md`。
