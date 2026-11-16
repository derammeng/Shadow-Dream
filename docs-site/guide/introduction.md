# Shadow Dream 是什么

Shadow Dream（中文名 **影梦**）是一个把 QQ 消息翻译成 **OneBot 11** 的运行时。

它由三部分组成：

| 部分 | 作用 |
|---|---|
| `@shadowdream/core` | OneBot 11 消息模型、HTTP / WS / HTTP POST、WebUI |
| `@shadowdream/mock` | 不依赖 QQ 的模拟后端，用来开发、联调和跑测试 |
| `@shadowdream/qqnt` | LiteLoaderQQNT 插件，在 QQ 主进程里复用真实登录态 |

## 和 NapCat / SnowLuma 的区别

Shadow Dream 不复用它们的 native hook，也不修改 `wrapper.node`：

- 进入 QQ 进程交给 LiteLoaderQQNT；
- 登录交给 QQ 自己的 `NodeIKernelLoginService`；
- Shadow Dream 只调用 wrapper 暴露的 JS API，监听消息、调用发送接口。

这样 QQ 更新时，失败点通常是可读的 JS 异常或插件日志，而不是没有符号的 native crash。

## 现在能做什么

- 文本、表情、@、回复、图片、语音、视频、文件、群管理；
- 私聊 / 群聊消息收发；
- HTTP API、正向 WS、反向 WS、HTTP POST；
- 生命周期、心跳、CQ 码；
- WebUI 扫码 / 密码 / 一键登录，登录过 QQ 后自动恢复账号；
- 配置自动重载；
- Linux Xvfb 无头运行；
- Linux / Windows 一键启动；
- WebUI / CLI 检查更新、下载安装并自动重启；
- 安装时可选择自动安装 QQ、LiteLoaderQQNT、Xvfb。

图片支持 PNG / JPEG / GIF / WebP / BMP，语音支持 SILK / WAV / MP3（自动转 SILK），视频支持 MP4 / MOV，文件不限类型；来源可以是本地路径、`file://`、`http(s)://` 或 `base64://`。

## 下一步

- [安装 Shadow Dream](/guide/install)
- [启动并打开 WebUI](/guide/start)
- [遇到问题](/guide/troubleshooting)
- [更新日志](https://github.com/derammeng/Shadow-Dream/blob/main/CHANGELOG.md)
