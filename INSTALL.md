# 安装 Shadow Dream

## 环境要求

- Node.js **22+**
- npm 10+
- QQNT + LiteLoaderQQNT（只有使用 `qqnt` 后端时需要）
- Linux 无头运行另需 Xvfb，见 [headless.md](headless.md)

安装脚本不会自动安装 QQ、LiteLoaderQQNT、Xvfb 或 Koishi，只负责 Shadow Dream 本身。

## 快速安装

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

也可以双击 `install.bat`。

### Linux / WSL

```bash
chmod +x install.sh
./install.sh
```

默认会：

1. 执行 `npm install`；
2. 构建 `core`、`mock`、`qqnt` 插件；
3. 生成 `config/shadowdream.json`，随机生成 20 位 `webuiToken`；
4. 打包 `packages/qqnt/release/shadowdream.zip`。

## 部署 QQNT 插件

先把 LiteLoaderQQNT 的 `plugins` 目录传给脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 `
  --plugins-dir "C:\path\to\LiteLoaderQQNT\plugins"
```

```bash
./install.sh --plugins-dir ~/.local/share/LiteLoaderQQNT/plugins
```

脚本会：

- 备份已有的 `plugins/shadowdream`；
- 复制新的插件；
- 如果 `plugins` 的上一级存在 `data` 目录，会初始化：

```text
<profile>/data/shadowdream/config.json
```

并写入同一个 `webuiToken`。

实际路径以 LiteLoader 启动日志里的 `LiteLoader.path.plugins` / `LiteLoader.path.data` 为准。

## 常用选项

| 选项 | 说明 |
|---|---|
| `--plugins-dir <目录>` | 部署 LiteLoader 插件 |
| `--token <token>` | 指定 WebUI token；默认随机 20 位 |
| `--no-token` | 不生成 token（仅本机调试） |
| `--config <文件>` | 项目配置路径 |
| `--skip-install` | 跳过 `npm install` |
| `--skip-build` | 跳过构建 |
| `--test` | 构建后跑测试 |
| `--no-zip` | 不生成插件 zip |
| `--dry-run` | 只打印操作，不写入 |
| `--help` | 查看帮助 |

## 安装后启动

### 只用内置模拟器

```bash
npm run demo
```

打开：

```text
http://127.0.0.1:3000/webui/
```

输入安装时输出的 20 位 token。

### 用真实 QQNT

1. 启动安装了 LiteLoaderQQNT 的 QQ；
2. 插件加载后，打开：

```text
http://127.0.0.1:3000/webui/
```

3. 先输入 WebUI token，再扫码或一键登录 QQ；
4. 登录成功后同一个 session 直接进入控制台。

### Linux 无头

参考 [headless.md](headless.md) 配置 Xvfb 和 QQ 启动命令。

## 安全提示

公网部署至少设置：

```text
http.webuiToken    WebUI 登录
http.accessToken   OneBot HTTP API
ws.accessToken     WebSocket
```

建议把 `http.host` 保持 `127.0.0.1`，通过 Nginx / Caddy 反代并启用 HTTPS。反代时设置 `X-Forwarded-Proto: https`，WebUI session cookie 会自动加 `Secure`。
