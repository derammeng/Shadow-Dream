# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.3.0 - 2026-11-16

### 新增

- **QQNT 媒体发送（图片 / 语音 / 视频 / 文件）**
  - 图片：`image` 段支持本地路径、`file://`、`http(s)://`、`base64://`；识别 PNG / JPEG / GIF / WebP / BMP，把宽高、格式、MD5 写进 `picElement`；`sub_type: 1` 发送为表情包。
  - 语音：`record` 段支持 SILK 直传，以及 WAV / MP3 自动转 SILK；非 24kHz 输入先重采样，自动写入时长；媒体消息的发送等待时间放宽到 60 秒。
  - 视频：`video` 段支持 MP4 / MOV；自带一个最小的 MP4/MOV 容器解析器读取时长与分辨率，解析不到时用保守默认值；不引入 ffmpeg，封面写一张内置渐变 PNG，命名为 `<videoMd5>_0.png` 放进 `Video/<年月>/Thumb/`（QQ 按视频 md5 找封面）。
  - 文件：`file` 段支持任意类型，`name` 作为 QQ 里显示的文件名；私聊与群聊都可用。
  - 统一实现：文件写进 QQ 自己的富媒体缓存目录（`getRichMediaFilePathForGuild`），由 QQ 在 `sendMsg` 时完成上传，不修改 `wrapper.node`。
- **依赖**
  - 插件打包 `silk-wasm`、`mpg123-decoder` 及其运行时依赖；`build.mjs` 的插件版本从 `core/package.json` 读取，避免漂移。
- **测试**
  - 新增 `tests/media.test.mjs`：格式识别、来源解析、WAV 解析 / 重采样、SILK 编码、MP4 容器解析、默认封面生成与错误分支。
  - `convert.test.mjs` / `backend.test.mjs` 覆盖媒体钩子与图片 / 语音 / 视频 / 文件四类 element 构造。

### 修复

- **启动可能卡死**：`refreshGroups` / `loadMembers` / `loadFriends` 先 `await` 原生调用，超时兜底在调用之后；原生调用不返回时插件会永远停在 bootstrap。
  - 现在所有原生调用都套 `withTimeout`，超时后继续启动并打 debug 日志。
- **WebUI 网络 / WebSocket 交互重排**
  - 「网络与反代」改名「网络与推送」，页内去掉只做跳转的「正向 WebSocket」占位卡；
  - 网络与推送改为明确的整页表单：脏状态提示、保存按钮按需启用、离开页面前确认、刷新不冲掉表单；
  - 保存前校验 HTTP POST 地址格式，错误行标红并阻止保存；
  - HTTP POST 行编辑加上列标题；
  - 正向与反向 WebSocket 合并到「WebSocket」页：两段卡片列表，新增 / 编辑 / 删除都会立即保存并热重启；
  - 反向端点从「网络与推送」的行编辑器改为卡片 + 弹窗（目标地址 / token / 重连间隔），与正向端点交互一致；
  - 底部操作条改为实底悬浮，并给表单留出底部空间，避免盖住「添加」按钮。
- **`get_group_list` 返回空、`get_group_info` 报 1404**：QQ 的 `onGroupListUpdate` 回调是两个参数 `(updateType, groupList)`，之前按单参数解析，列表永远拿不到；现在按真实签名解析，并支持 `updateType = 3` 的移除语义。
- 群消息 / 发送过程中补最小群缓存的逻辑保持不变，避免刚登录时群操作用不了。

### 变更

- QQNT 后端能力集合新增 `image`、`record`、`video`、`file`；`can_send_image` / `can_send_record` 现在返回 `true`。
- 发送媒体时不再抛 1401；四类媒体都走 QQ 富媒体缓存目录，由 QQ 自己上传。
- **WebUI 视觉重构**：与文档站统一为马卡龙主题 —— 侧边栏、导航胶囊、渐变按钮、
  卡片、表单、WebSocket 卡片、开关、日志控制台、弹窗与 toast 全部重做；
  支持浅色 / 深色两套配色：首次跟随系统，右上角太阳 / 月亮按钮手动切换并记住选择；
  WebUI token 登录页、QQ 扫码 / 密码登录页同步换肤并跟随系统深色；
  修复移动端横向溢出与窄屏栅格错位。
- WebUI「关于」页的能力说明更新为图片 / 语音 / 视频 / 文件都已支持。
- 版本号统一到 0.3.0。

### 文档

- `docs/onebot-api.md` 新增「媒体发送」小节：四种来源、四类格式与大小上限；`video` / `file` 段标为支持。
- `docs/qqnt-plugin.md` 媒体小节扩为四类，补充视频封面命名与排故。
- README、文档站（introduction / troubleshooting / onebot）同步媒体能力与限制。
- **文档站视觉重构**：自定义 VitePress 主题（首页 Hero / 能力卡片 / 三步接入 / 能力清单 / CTA），
  马卡龙渐变配色 + 产品页排版；导航、侧边栏、代码块、表格、提示块、深浅主题全部重做，
  新增 `public/logo.svg` 与主题组件。

### 已知限制

- 视频封面是内置占位图，没有从视频抽帧（需要 ffmpeg）；视频只支持 MP4 / MOV，其它容器请先转码。
- `upload_group_file` 动作仍未实现，可用 `file` 段代替。
- AMR、OGG 语音未做解码，会明确返回 `1401`。
- 媒体上传依赖 QQ 的 `getRichMediaFilePathForGuild`；QQ 大版本改名后会退回临时目录并在日志告警。
- 合并转发、群公告、表情回应、频道仍未实现。

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
