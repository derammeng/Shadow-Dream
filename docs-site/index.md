---
layout: home

hero:
  name: Shadow Dream
  text: 影梦 · QQ → OneBot 11
  tagline: 把 QQ 接入 OneBot 11 的轻量运行时。插件跑在 QQ 进程里，复用已有登录态；带 HTTP、WebSocket、WebUI 和可热更新的配置。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/introduction
    - theme: alt
      text: 安装
      link: /guide/install
    - theme: alt
      text: 常见问题
      link: /guide/troubleshooting

features:
  - title: 不用改 QQ 二进制
    details: 通过 LiteLoaderQQNT 插件进入 QQ 主进程，复用 QQ 自己的登录态和 wrapper session，不修改 wrapper.node。
  - title: OneBot 11 全链路
    details: HTTP API、正向 / 反向 WebSocket、HTTP POST、心跳、CQ 码、消息 ID 映射，Koishi 等框架可以直接接入。
  - title: 自带 WebUI
    details: 扫码 / 密码 / 一键登录，账号状态、网络配置、日志和调试台。公网部署时可用 token 保护。
  - title: 适合小服务器
    details: Linux + Xvfb 无头运行；配置热更新；插件和核心用 TypeScript 实现，问题通常能在日志里定位。
---
