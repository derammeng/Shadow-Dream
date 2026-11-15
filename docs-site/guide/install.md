# 安装

Shadow Dream 有两种安装方式：

- **云端一键安装（推荐）**：下载精简安装包，自动安装依赖、构建并生成配置；
- **本地安装**：已经 clone 了完整仓库时，直接运行仓库里的安装脚本。

## 一键安装（推荐）

默认只下载**精简安装包**：只包含构建和运行需要的源码、脚本与配置模板，不包含：

```text
docs/            仓库内的详细文档
docs-site/       文档站 / 知识库
docs/*.png       截图
packages/*/tests 测试
.github/         CI 配置
```

使用精简包时，安装时也不会下载文档站的 VitePress 工具链。精简包由 GitHub Actions 在每次 `main` 更新后自动发布；如果刚推送、包还没生成，脚本会自动回退到完整源码包。

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- \
      --dir "$HOME/ShadowDream" \
      --plugins-dir "$HOME/.local/share/LiteLoaderQQNT/plugins" \
      --webui-token "你的20位token"
```

这条命令已经把安装目录、LiteLoader 插件目录和 WebUI token 都传进去了，不需要先 `export` 环境变量。

- 只想在本机跑模拟器、暂时不部署 QQ 插件：删掉 `--plugins-dir` 那一行；
- 不传 `--webui-token`：自动生成 20 位 token，安装结束会打印；
- `--plugins-dir` 的实际路径以 LiteLoader 启动日志里的 `LiteLoader.path.plugins` 为准。

<details>
<summary>可选：让安装脚本自动安装 QQ、LiteLoaderQQNT、Xvfb</summary>

默认的一键命令**不会**安装这三个系统组件。确实需要时，显式加参数：

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- \
      --dir "$HOME/ShadowDream" \
      --install-qq \
      --install-litelloader \
      --install-xvfb \
      --webui-token "你的20位token"
```

- `--install-qq`：从 QQ 官方下载页解析 Linux amd64 deb 并安装；可用 `--qq-url` 指定镜像或指定版本；
- `--install-litelloader`：下载 LiteLoaderQQNT 并注入 QQ 的 `resources/app`；默认装在 `~/.local/share/LiteLoaderQQNT`，会自动把插件部署到它的 `plugins`；
- `--install-xvfb`：用 apt / dnf 安装 Xvfb 和 QQ 运行库；
- 需要 root 或 sudo；已有 QQ 时 `--install-qq` 会跳过，不会覆盖。
- 只加需要的参数即可；例如只自动装 Xvfb：`--install-xvfb`。
- 如果 QQ 官方下载页的链接失效，用 `--qq-url` 指定可用 deb/rpm；刚推送代码时要等 Actions 更新 `install-latest` 后再用这些新参数。

</details>

### Windows PowerShell

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.ps1))) `
  -Dir "$env:USERPROFILE\ShadowDream" `
  -PluginsDir "C:\path\to\LiteLoaderQQNT\plugins" `
  -WebUiToken "你的20位token"
```

`-PluginsDir` 换成 LiteLoader 的 `plugins` 目录；不部署插件就删掉这一行。

> token 直接写在命令行会进入 shell 历史 / 进程列表。多人共用的机器建议改用环境变量 `SHADOWDREAM_WEBUI_TOKEN`（Windows 是 `$env:SHADOWDREAM_WEBUI_TOKEN`），脚本会自动读取。

### 参数一览

| 参数（Linux / Windows） | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| `--dir` / `-Dir` | `SHADOWDREAM_DIR` | `~/ShadowDream` | 安装目录 |
| `--repo` / `-Repo` | `SHADOWDREAM_REPO` | `derammeng/Shadow-Dream` | GitHub 仓库 |
| `--ref` / `-Ref` | `SHADOWDREAM_REF` | `main` | 分支 / tag |
| `--plugins-dir` / `-PluginsDir` | `SHADOWDREAM_PLUGINS` | 空 | LiteLoaderQQNT 的 `plugins` 目录；传入后直接部署插件 |
| `--webui-token` / `-WebUiToken` | `SHADOWDREAM_WEBUI_TOKEN` | 随机 20 位 | WebUI token；Linux 兼容旧写法 `--token` |
| `--github-token` / `-GithubToken` | `SHADOWDREAM_GITHUB_TOKEN`（兼容 `SHADOWDREAM_TOKEN`） | 空 | 私有仓库的 GitHub PAT |
| `--source` / `-Source` | `SHADOWDREAM_SOURCE` | `auto` | `auto` / `slim` / `full` |
| `--bundle-url` / `-BundleUrl` | `SHADOWDREAM_BUNDLE_URL` | GitHub Release | 自定义精简安装包地址（镜像 / 自建） |
| `--archive-url` / `-ArchiveUrl` | `SHADOWDREAM_ARCHIVE_URL` | GitHub Archive | 自定义完整源码包地址 |
| `--no-token` / `-NoToken` | - | - | 不生成 WebUI token，仅本机调试 |
| `--install-qq` | `SHADOWDREAM_QQ_URL` | 关闭 | 自动安装 Linux QQ（仅 Linux，需 root/sudo） |
| `--install-litelloader` | `SHADOWDREAM_LITELOADER_URL` | 关闭 | 自动安装 LiteLoaderQQNT 并注入 QQ（仅 Linux） |
| `--install-xvfb` | - | 关闭 | 自动安装 Xvfb 和 QQ 运行库（仅 Linux） |
| `--qq-url <url>` | `SHADOWDREAM_QQ_URL` | 官方下载页 | QQ deb/rpm 地址 |
| `--liteloader-url <url>` | `SHADOWDREAM_LITELOADER_URL` | GitHub main | LiteLoaderQQNT 源码包 |
| `--qq-dir <目录>` | `SHADOWDREAM_QQ_DIR` | `/opt/QQ` | QQ 安装目录 |
| `--liteloader-dir <目录>` | `SHADOWDREAM_LITELOADER_DIR` | `~/.local/share/LiteLoaderQQNT` | LiteLoaderQQNT 目录 |

`--source` 的三种模式：

| 模式 | 行为 |
|---|---|
| `auto` | 默认。`main` 优先精简包，失败自动回退完整包；指定 tag / 分支时直接用完整包 |
| `slim` | 只用精简包；还没生成时直接失败。精简包只跟随 `main`，指定 tag / 分支时请用 `full` 或 `--bundle-url` |
| `full` | 直接拉取完整源码包（包含文档站和截图） |

### 完整源码、镜像与自建包

需要看仓库内文档、跑测试或二次开发时：

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- --source full --dir "$HOME/ShadowDream"
```

本机已经有完整仓库时，也可以生成一份精简包放到自己的服务器 / 对象存储：

```bash
node scripts/pack-slim.mjs
# dist/shadowdream-slim.tar.gz
# dist/shadowdream-slim.zip
```

然后：

```bash
curl -fsSL https://你的镜像/bootstrap.sh | bash -s -- \
  --bundle-url https://你的镜像/shadowdream-slim.tar.gz
```

如果 `raw.githubusercontent.com` 或 GitHub Release 访问不稳定，可以先把 `bootstrap.sh` 通过镜像 / 代理下载下来，再用 `--bundle-url`、`--archive-url` 指向能访问的安装包地址。

## 环境要求

- Node.js **22+**
- npm 10+
- curl（云端一键安装）
- PowerShell 5.1+（Windows）
- QQNT + LiteLoaderQQNT（只有使用 `qqnt` 后端时需要）
- Linux 无头运行另需 Xvfb，见 [Linux 无头运行](/guide/headless)

安装脚本默认不会自动安装 QQ、LiteLoaderQQNT、Xvfb；需要时加 `--install-qq` / `--install-litelloader` / `--install-xvfb`。

## Windows（本地安装）

已经 clone 完整仓库时，在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

也可以双击 `install.bat`。

部署到 LiteLoaderQQNT：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 `
  --plugins-dir "C:\path\to\LiteLoaderQQNT\plugins"
```

## Linux

```bash
chmod +x install.sh
./install.sh
```

带插件部署：

```bash
./install.sh --plugins-dir ~/.local/share/LiteLoaderQQNT/plugins
```

## 安装脚本会做什么

1. 下载并解压精简包 / 完整源码包（本地安装直接使用当前仓库），备份已有安装目录；
2. 安装 npm 依赖（有 `package-lock.json` 时优先 `npm ci`）；
3. 构建 core、mock、qqnt 插件；
4. 生成 `config/shadowdream.json`；
5. 随机生成 20 位 WebUI token（或用 `--webui-token` 指定）；
6. 生成插件目录 `packages/qqnt/release/shadowdream/`；本地安装脚本还会生成 `shadowdream.zip`；云端安装直接把插件目录部署到 `plugins`，不额外打包 zip；
7. 指定 `--plugins-dir` 时备份并部署插件；
8. 如果插件目录上一级有 `data`，初始化 `data/shadowdream/config.json`。

## 本地安装脚本的常用参数

| 参数 | 说明 |
|---|---|
| `--plugins-dir <目录>` | 部署 LiteLoader 插件 |
| `--token <token>` | 指定 WebUI token |
| `--no-token` | 不生成 token，仅本机调试 |
| `--config <文件>` | 项目配置文件路径 |
| `--skip-install` | 跳过依赖安装 |
| `--skip-build` | 跳过构建 |
| `--test` | 构建后运行测试 |
| `--no-zip` | 不生成插件 zip |
| `--dry-run` | 只预览，不写入 |
| `--help` | 查看帮助 |

## 手动安装

如果不想用脚本：

```bash
npm ci
npm run build
```

插件产物：

```text
packages/qqnt/release/shadowdream/      # npm run build 生成
packages/qqnt/release/shadowdream.zip   # install.mjs / package-plugin.ps1 生成
```

把整个 `shadowdream` 目录复制到 LiteLoaderQQNT 的 `plugins` 目录即可。

## 下一步

[启动 Shadow Dream](/guide/start)
