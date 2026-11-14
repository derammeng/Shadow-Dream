# Linux 启动

Shadow Dream 的 core / mock 是纯 Node.js，**Linux 可以直接跑**，不需要 QQ。
QQNT 插件后端需要 Linux 版 QQNT + LiteLoaderQQNT，属于实验性路径。

## 1. 环境

```bash
node -v   # 需要 22 或更高
npm -v
```

没有 Node 22 时（Debian / Ubuntu）：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 2. 安装与构建

把项目目录传到 Linux，例如 `/opt/shadowdream`，然后：

```bash
cd /opt/shadowdream
npm install
npm run build
npm test          # 可选，45 个测试
```

## 3. 启动模拟器

交互模式（有 TTY）：

```bash
npm run demo
```

默认监听：

```text
HTTP   http://127.0.0.1:3000
WS     ws://127.0.0.1:3001
WebUI  http://127.0.0.1:3000/webui/
```

无 TTY / 服务器后台：

```bash
node packages/mock/dist/cli.js \
  --no-repl \
  --host 0.0.0.0 \
  --http-port 3000 \
  --ws-port 3001 \
  --token '换成你自己的长 token'
```

`--host 0.0.0.0` 让局域网 / 公网可以访问；**同时必须设 token**，否则任何人连上都能操作你的 Bot。

配置文件第一次启动会生成：

```text
config/shadowdream.json
```

也可以只用环境变量：

```bash
FD_HTTP_HOST=0.0.0.0 \
FD_HTTP_PORT=3000 \
FD_HTTP_TOKEN='...' \
FD_WS_PORT=3001 \
FD_WS_TOKEN='...' \
node packages/mock/dist/cli.js --no-repl
```

## 4. systemd

`/etc/systemd/system/shadowdream.service`：

```ini
[Unit]
Description=Shadow Dream OneBot 11
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=qqbot
WorkingDirectory=/opt/shadowdream
ExecStart=/usr/bin/node packages/mock/dist/cli.js --no-repl --host 0.0.0.0 --http-port 3000 --ws-port 3001
Environment=FD_HTTP_TOKEN=请换成随机长字符串
Environment=FD_WS_TOKEN=请换成随机长字符串
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now shadowdream
sudo systemctl status shadowdream
journalctl -u shadowdream -f
```

如果只用 `config/shadowdream.json` 里的 token，可以删掉两行 `Environment=`。

## 5. 防火墙

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

更推荐只让反向代理访问，或者用 SSH 隧道：

```bash
ssh -L 3000:127.0.0.1:3000 user@server
```

然后本地打开 `http://127.0.0.1:3000/webui/`。

## 6. 接真实 QQNT（实验性）

需要：

- Linux 版 QQNT；
- 已安装 LiteLoaderQQNT，并且能正常加载插件；
- 有图形环境（或 Xvfb）完成 QQ 登录。

构建插件：

```bash
npm run build:plugin
```

复制插件目录（路径以 LiteLoader 的 `LiteLoader.path.plugins` 为准）：

```bash
cp -r packages/qqnt/release/shadowdream \
  ~/.local/share/LiteLoaderQQNT/plugins/
# 有的安装是：
# cp -r packages/qqnt/release/shadowdream <QQ数据目录>/LiteLoader/plugins/
```

启动 QQ（带日志）：

```bash
qq --enable-logging
# 或你平时启动 QQNT 的方式
```

登录后日志里应该出现：

```text
Shadow Dream 已接入 QQNT wrapper
Shadow Dream 已捕获 QQNT session
Shadow Dream 已启动：QQ ...
HTTP API  http://127.0.0.1:3000
WebSocket ws://127.0.0.1:3001
WebUI     http://127.0.0.1:3000/webui/
配置      .../plugins/shadowdream/data/config.json
```

插件配置在 LiteLoader 的 `plugins/shadowdream/data/config.json`。

### Linux 插件注意事项

- 不同 QQNT / LiteLoader 版本的 `wrapper.node` 导出可能不同；如果日志停在「没有捕获 wrapper」或「没有捕获 session」，请带 QQNT 版本和日志反馈。
- 纯 headless 服务器不建议硬跑 QQNT：登录、验证、图形依赖都比较麻烦。服务器上更稳的是 **mock + 你自己的 QQ 协议端**，或把 QQNT 放在有桌面的机器上，通过反向 WS 把事件送到服务器。
- `scripts/install-plugin.ps1` / `.ps1` 打包脚本是 Windows PowerShell 用的；Linux 直接 `cp -r`，压缩用：
  ```bash
  cd packages/qqnt/release
  zip -r shadowdream.zip shadowdream
  ```

## 7. 验证

```bash
curl http://127.0.0.1:3000/get_status
curl http://127.0.0.1:3000/get_version_info
```

浏览器打开 `/webui/`，或在 OneBot SDK 里配置：

```text
HTTP: http://127.0.0.1:3000
WS:   ws://127.0.0.1:3001
Token: 你设置的值
```

## 8. 常见错误

### `tsc: Permission denied`

原因通常是从 Windows 复制了整个项目，包括 `node_modules`。Windows 的 NTFS 权限 / 符号链接到了 WSL 里会变成不可执行或断链。

```bash
cd ~/shadowdream

# 删掉跨平台复制过来的依赖和构建产物
rm -rf node_modules packages/*/node_modules
rm -rf packages/*/dist packages/*/dist-cjs packages/*/dist-test
rm -rf packages/qqnt/release

# 在 Linux 里重新安装
npm install
npm run build
```

临时应急也可以只补执行位：

```bash
chmod +x node_modules/typescript/bin/tsc node_modules/.bin/tsc
```

但不建议长期这样做，后面可能还会遇到其他 `.bin` 脚本权限问题。**不要把 Windows 的 `node_modules` 带到 Linux。**
