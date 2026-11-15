# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.2.0 - 2026-11-15

### 新增

- **一键启动**
  - Linux：`start-shadowdream.sh`，自动检测 QQ、LiteLoader profile、插件和运行库，必要时构建/部署，启动 Xvfb + QQ，并等待 WebUI 就绪。
  - Windows：`start-shadowdream.bat`，自动检测 Windows QQ；未检测到 Windows 插件时可自动转到 Linux 侧启动，也可用 `--wsl` / `--windows` 强制选择。
  - 启动成功会打印 WebUI / 局域网地址和 token。
- **WebUI 更新**
  - 侧边栏新增「更新」页，可检查版本、下载并安装更新。
  - 安装完成后自动重启 Shadow Dream + QQNT，并保留配置与插件 data。
  - 新增 API：`GET /webui/api/update/check`、`POST /webui/api/update/apply`。
  - 新增 CLI：`start-shadowdream.sh --check-update` / `--update`，Windows 批处理同样支持。
  - 新增更新源：Release `install-latest` 的 `install-bundle.json`。
- **自动恢复 QQ 登录**
  - WebUI token 通过后，若之前登录过 QQ，会先用保存的账号尝试一键登录。
  - 恢复成功直接进入管理面板，不再显示二维码。
  - 只有账号下线、没有可恢复账号或自动登录失败时，才显示扫码页。
- **安装脚本可选自动安装**
  - `--install-qq`：自动安装 Linux QQ。
  - `--install-litelloader`：自动安装 LiteLoaderQQNT 并注入 QQ。
  - `--install-xvfb`：自动安装 Xvfb 和 QQ 运行库。
  - 以上参数默认关闭，默认一键安装命令不包含它们；需要 root/sudo。
  - 支持 `--qq-url`、`--liteloader-url`、`--qq-dir`、`--liteloader-dir`。
- **精简安装包**
  - 新增 `scripts/pack-slim.mjs` 和 `install-bundle` GitHub Actions。
  - 精简包只保留构建/运行必需文件，排除文档站、截图、测试和 CI 配置。
  - `bootstrap.sh` / `bootstrap.ps1` 优先使用精简包，失败时回退完整源码包。
- **网络**
  - 监听地址为 `0.0.0.0` / `::` 时，WebUI 和日志显示真实局域网 IPv4，而不是固定显示 `127.0.0.1`。
- **局域网地址**
  - 启动脚本和 WebUI 会同时显示本机与局域网访问地址。

### 修复

- 修复 `get_msg` 对未缓存消息返回 `1404` 的问题：
  - 记录回复目标的消息 peer；
  - 缓存未命中时通过 QQ `getMsgsByMsgId` 拉取；
  - 修复回复图片后 `imgqa add` 找不到消息的问题。
- 修复 LiteLoader 把 `plugins` 目录里的 `*.bak` 备份也当成插件加载的问题：
  - 插件备份改到 profile 的 `shadowdream-backups/`。
- 修复 Node.js 24 下无法直接启动 `npm.cmd` 的问题。
- 修复 Windows PowerShell 5.1 解析中文 `.ps1` 注释异常的问题。
- 修复 Windows 批处理中 `%PROFILE:~-1%`、`for /f` 管道等展开/转义问题。
- 修复 Linux 无头启动时找不到 `libnspr4.so` 等库的问题：
  - 自动探测 QQ 目录下的库并设置 `LD_LIBRARY_PATH` / `APPDIR`。

### 变更

- WebUI 只保留整页 token 登录，删除控制台上的弹窗式登录。
- WebUI token 失效或 session 过期时，直接回到整页登录，不再覆盖弹窗。
- 移除 WebUI 右上角「Token」按钮，使用「退出」后重新登录。
- 配置保存/重载相关文案统一改为「保存并应用」「自动重载」。
- WebUI 和更新说明中不再显示平台缩写，统一用 Linux / Windows 描述。
- WebUI 更新检查显示当前版本、最新版本、安装目录和状态。

### 文档

- 更新安装、启动、无头运行、WebUI、更新和排故文档。
- 新增可选自动安装 QQ / LiteLoaderQQNT / Xvfb 的参数说明。
- 补充 WebUI 自动恢复 QQ 登录、整页登录和更新页说明。
- 精简安装包和 `install-latest` 发布流程说明。

### 已知限制

- QQNT 插件仍为实验性，不同 QQ / LiteLoader 版本的 wrapper 字段可能变化。
- 媒体发送（图片、语音、视频、文件）仍未实现，当前返回 `1401`。
- 群公告、合并转发、表情回应、频道等尚未实现。
- 自动安装 QQ 依赖官方下载页解析；链接失效时需用 `--qq-url` 指定安装包。

## 0.1.0

- 初始版本：QQNT → OneBot 11 运行时，HTTP / WebSocket / WebUI、mock 后端、配置自动重载、基础消息接收与发送。
