# 安装

## 一键安装

公开仓库可以直接拉脚本：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh)
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.ps1 | iex
```

脚本会下载源码到 `~/ShadowDream`（Windows 是 `%USERPROFILE%\ShadowDream`），安装依赖、构建并生成配置。

### 一键安装参数

```bash
SHADOWDREAM_DIR=~/apps/shadowdream \
SHADOWDREAM_PLUGINS=~/.local/share/LiteLoaderQQNT/plugins \
SHADOWDREAM_WEBUI_TOKEN=你的20位token \
bash <(curl -fsSL .../scripts/bootstrap.sh)
```

| 环境变量 | 说明 |
|---|---|
| `SHADOWDREAM_DIR` | 安装目录，默认 `~/ShadowDream` |
| `SHADOWDREAM_REPO` | GitHub 仓库，默认 `derammeng/Shadow-Dream` |
| `SHADOWDREAM_REF` | 分支 / tag，默认 `main` |
| `SHADOWDREAM_PLUGINS` | LiteLoaderQQNT 的 plugins 目录 |
| `SHADOWDREAM_WEBUI_TOKEN` | 指定 WebUI token |

## 环境要求

- Node.js **22+**
- npm 10+
- QQNT + LiteLoaderQQNT（只有使用 `qqnt` 后端时需要）
- Linux 无头运行另需 Xvfb，见 [Linux 无头运行](/guide/headless)

安装脚本不会自动安装 QQ、LiteLoaderQQNT、Xvfb 或 Koishi。

## Windows

在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

也可以双击 `install.bat`。

部署到 LiteLoaderQQNT：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 `
  --plugins-dir "C:\path\to\LiteLoaderQQNT\plugins"
```

## Linux / WSL

```bash
chmod +x install.sh
./install.sh
```

带插件部署：

```bash
./install.sh --plugins-dir ~/.local/share/LiteLoaderQQNT/plugins
```

## 安装脚本会做什么

1. 检查 Node.js 版本；
2. 执行 `npm install`；
3. 构建 core、mock、qqnt 插件；
4. 生成 `config/shadowdream.json`；
5. 随机生成 20 位 WebUI token；
6. 生成 `packages/qqnt/release/shadowdream.zip`；
7. 指定 `--plugins-dir` 时备份并部署插件；
8. 如果插件目录上一级有 `data`，初始化 `data/shadowdream/config.json`。

## 常用参数

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
npm install
npm run build
```

插件产物：

```text
packages/qqnt/release/shadowdream/
packages/qqnt/release/shadowdream.zip
```

把整个 `shadowdream` 目录复制到 LiteLoaderQQNT 的 `plugins` 目录即可。

## 下一步

[启动 Shadow Dream](/guide/start)
