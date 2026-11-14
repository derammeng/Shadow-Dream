# 接入 Koishi

Shadow Dream 提供标准 OneBot 11 正向 WebSocket，Koishi 的 `adapter-onebot` 可以直接连接。

## 1. 启动 Shadow Dream

确保 HTTP 和 WS 已启动：

```text
HTTP   http://127.0.0.1:3000
WS     ws://127.0.0.1:3001
```

WS 的 `accessToken` 要与 Koishi 侧一致。

## 2. Koishi 配置

在 Koishi 控制台的「插件配置 → adapter-onebot」中新建：

```yaml
selfId: '你的QQ号'
protocol: ws
endpoint: ws://127.0.0.1:3001
token: 'ws accessToken'
```

保存后启用插件。

## 3. 验证

- Koishi 日志出现 WebSocket 已连接；
- Shadow Dream 概览页 `wsClients` 大于 0。

## 4. 常见问题

### 连不上

- 检查端口、path、token；
- 检查 `wsServers[]` 里对应端点是否 `enabled: true`；
- 如果有多个正向 WS，确认 Koishi 连的是正确端口。

### 能收消息但不能发

`selfId` 必须是真实 QQ 号，不能用 mock 的 `10001`；否则 Koishi 会用自己的账号发送，和 Shadow Dream 登录的账号不一致。

### @ 机器人没反应

确认消息里 at 的是真实 QQ 号，而不是 `@0`。当前版本已经兼容 `atUid` / `atNtUid` / 群名片解析。
