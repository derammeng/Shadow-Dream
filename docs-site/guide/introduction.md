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

- 文本、表情、@、回复、群管理；
- 私聊 / 群聊消息收发；
- HTTP API、正向 WS、反向 WS、HTTP POST；
- 生命周期、心跳、CQ 码；
- WebUI 扫码 / 密码 / 一键登录；
- 配置热更新；
- Linux Xvfb 无头运行。

媒体（图片、语音、视频、文件）在 0.1 中尚未实现，会明确返回 `1401`，不会静默发坏消息。

## 下一步

- [安装 Shadow Dream](/guide/install)
- [启动并打开 WebUI](/guide/start)
- [遇到问题](/guide/troubleshooting)
