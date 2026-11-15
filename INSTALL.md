# 安装 Shadow Dream

## 环境要求

- Node.js **22+**
- npm 10+
- curl（云端一键安装）
- PowerShell 5.1+（Windows）
- QQNT + LiteLoaderQQNT（只有使用 `qqnt` 后端时需要）
- Linux 无头运行另需 Xvfb，见 [docs/headless.md](docs/headless.md)

安装脚本不会自动安装 QQ、LiteLoaderQQNT、Xvfb 或 Koishi，只负责 Shadow Dream 本身；云端安装不需要本机安装 Git。

## 云端一键安装（推荐）

默认只下载**精简安装包**：只包含构建和运行需要的源码、脚本与配置模板，不包含：

```text
docs/            仓库内的详细文档
docs-site/       文档站 / 知识库
docs/*.png       截图
packages/*/tests 测试
.github/         CI 配置
```

精简包由 GitHub Actions 在每次 `main` 更新后自动发布；如果还没生成，脚本会自动回退到完整源码包。

### Linux / WSL / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- \
      --dir "$HOME/ShadowDream" \
      --plugins-dir "$HOME/.local/share/LiteLoaderQQNT/plugins" \
      --webui-token "你的20位token"
```

安装目录、插件目录和 WebUI token 都直接写在命令里，不需要先 `export`。

- 不部署 LiteLoader 插件：删掉 `--plugins-dir` 一行；
- 不传 `--webui-token`：自动生成 20 位 token，安装结束会打印；
- `--plugins-dir` 以 LiteLoader 启动日志里的 `LiteLoader.path.plugins` 为准。

默认命令不会自动安装 QQ、LiteLoaderQQNT、Xvfb。需要时额外加：

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- \
      --dir "$HOME/ShadowDream" \
      --install-qq \
      --install-litelloader \
      --install-xvfb
```

`--install-qq` 解析 QQ 官方 Linux deb，`--install-litelloader` 注入 QQ，`--install-xvfb` 安装 Xvfb；需要 root/sudo，已有 QQ 会跳过。也可用 `--qq-url`、`--liteloader-url` 指定镜像。刚推送后要等 GitHub Actions 更新 `install-latest` 再使用这些参数。

### Windows PowerShell

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.ps1))) `
  -Dir "$env:USERPROFILE\ShadowDream" `
  -PluginsDir "C:\path\to\LiteLoaderQQNT\plugins" `
  -WebUiToken "你的20位token"
```

`-PluginsDir` 换成 LiteLoader 的 `plugins` 目录；不部署插件就删掉这一行。

> token 写在命令行会进入 shell 历史。多人共用的机器建议改用环境变量 `SHADOWDREAM_WEBUI_TOKEN`（Windows 是 `$env:SHADOWDREAM_WEBUI_TOKEN`）。

### 参数

| 参数（Linux / Windows） | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| `--dir` / `-Dir` | `SHADOWDREAM_DIR` | `~/ShadowDream` | 安装目录 |
| `--repo` / `-Repo` | `SHADOWDREAM_REPO` | `derammeng/Shadow-Dream` | GitHub 仓库 |
| `--ref` / `-Ref` | `SHADOWDREAM_REF` | `main` | 分支 / tag |
| `--plugins-dir` / `-PluginsDir` | `SHADOWDREAM_PLUGINS` | 空 | LiteLoaderQQNT 的 `plugins` 目录 |
| `--webui-token` / `-WebUiToken` | `SHADOWDREAM_WEBUI_TOKEN` | 随机 20 位 | WebUI token；Linux 兼容 `--token` |
| `--github-token` / `-GithubToken` | `SHADOWDREAM_GITHUB_TOKEN`（兼容 `SHADOWDREAM_TOKEN`） | 空 | 私有仓库 GitHub PAT |
| `--source` / `-Source` | `SHADOWDREAM_SOURCE` | `auto` | `auto` / `slim` / `full` |
| `--bundle-url` / `-BundleUrl` | `SHADOWDREAM_BUNDLE_URL` | GitHub Release | 自定义精简安装包地址 |
| `--archive-url` / `-ArchiveUrl` | `SHADOWDREAM_ARCHIVE_URL` | GitHub Archive | 自定义完整源码包地址 |
| `--install-qq` | `SHADOWDREAM_QQ_URL` | 关闭 | 自动安装 Linux QQ（仅 Linux） |
| `--install-litelloader` | `SHADOWDREAM_LITELOADER_URL` | 关闭 | 自动安装 LiteLoaderQQNT（仅 Linux） |
| `--install-xvfb` | - | 关闭 | 自动安装 Xvfb / 运行库（仅 Linux） |
| `--qq-url <url>` | `SHADOWDREAM_QQ_URL` | 官方下载页 | QQ deb/rpm 地址 |
| `--liteloader-url <url>` | `SHADOWDREAM_LITELOADER_URL` | GitHub main | LiteLoaderQQNT 源码包 |
| `--no-token` / `-NoToken` | - | - | 不生成 WebUI token |

`--source auto` 是默认值：`main` 优先精简包，失败自动回退完整包；指定 tag / 分支时直接用完整包。需要仓库内文档、测试或二次开发时加 `--source full`。

### 自建 / 镜像安装包

```bash
# 在完整仓库里生成，产物在 dist/
node scripts/pack-slim.mjs

# 上传到自己的服务器后：
curl -fsSL https://你的镜像/bootstrap.sh | bash -s -- \
  --bundle-url https://你的镜像/shadowdream-slim.tar.gz
```

如果 `raw.githubusercontent.com` 或 GitHub Release 访问不稳定，可以先用镜像 / 代理下载 `bootstrap.sh`，再用 `--bundle-url`、`--archive-url` 指向可访问的安装包地址。

## 本地安装

仓库已经 clone 到本机时，可以直接运行仓库里的脚本。本地安装会使用完整仓库（包含 docs / docs-site），适合开发和排故。

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

1. 执行 `npm ci`（没有锁文件时用 `npm install`）；
2. 构建 `core`、`mock`、`qqnt` 插件；
3. 生成 `config/shadowdream.json`，随机生成 20 位 `webuiToken`；
4. 打包 `packages/qqnt/release/shadowdream.zip`。

## 部署 QQNT 插件

把 LiteLoaderQQNT 的 `plugins` 目录传给脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 `
  --plugins-dir "C:\path\to\LiteLoaderQQNT\plugins"
```

```bash
./install.sh --plugins-dir ~/.local/share/LiteLoaderQQNT/plugins
```

云端安装时，在 `bootstrap.sh` 的一键命令里保留 `--plugins-dir`：

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- --plugins-dir ~/.local/share/LiteLoaderQQNT/plugins
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

## 常用选项（本地安装脚本）

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

### 一键启动

Windows 双击 `start-shadowdream.bat`，或运行：

```powershell
start-shadowdream.bat
start-shadowdream.bat --check
start-shadowdream.bat --wsl      # Shadow Dream 在 WSL 时
start-shadowdream.bat --windows  # 强制走 Windows QQ
```

Linux / WSL：

```bash
bash start-shadowdream.sh
bash start-shadowdream.sh --check
```

Windows 脚本会找 QQ、启动 QQ、等待 WebUI 并打开浏览器；没检测到 Windows 插件时会自动尝试 WSL。Linux 脚本会找 QQ / LiteLoader profile / 插件，启动 Xvfb + QQ，打印 WebUI 地址和 token。`Ctrl+C` 停止。

检查更新 / 一键更新：

```bash
bash start-shadowdream.sh --check-update
bash start-shadowdream.sh --update
```

```powershell
start-shadowdream.bat --check-update
start-shadowdream.bat --update
```

更新会保留配置和插件 data，完成后自动重启 Shadow Dream + QQNT。也可以直接打开 WebUI 侧边栏的「更新」页操作。

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

参考 [docs/headless.md](docs/headless.md) 配置 Xvfb 和 QQ 启动命令。

## 安全提示

公网部署至少设置：

```text
http.webuiToken    WebUI 登录
http.accessToken   OneBot HTTP API
ws.accessToken     WebSocket
```

建议把 `http.host` 保持 `127.0.0.1`，通过 Nginx / Caddy 反代并启用 HTTPS。反代时设置 `X-Forwarded-Proto: https`，WebUI session cookie 会自动加 `Secure`。
