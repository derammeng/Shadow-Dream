# 架构

Shadow Dream 的目标不是「再写一个 QQ 协议库」，而是把 **QQ 连接**、**OneBot 语义**、**传输层** 三层分开：

```text
┌──────────────────────────────────────────────────────────────┐
│                         传输层                                │
│  HTTP API     正向 WS     反向 WS      HTTP POST     WebUI   │
└───────────────────────────┬──────────────────────────────────┘
                            │ OneBot 11 event / action
┌───────────────────────────▼──────────────────────────────────┐
│                        @shadowdream/core                           │
│  消息模型 / CQ 码 / 消息 ID 映射 / 事件总线 / 心跳 / 鉴权      │
└───────────────────────────┬──────────────────────────────────┘
                            │ Backend 接口
              ┌─────────────┴─────────────┐
              │                           │
┌─────────────▼─────────────┐   ┌─────────▼────────────────────┐
│        mock 后端           │   │        qqnt 后端             │
│ 假好友 / 假群 / 假消息      │   │ LiteLoader 插件，复用 QQ     │
│ 可在纯 Node 里跑           │   │ 的 wrapper + session         │
└───────────────────────────┘   └──────────────────────────────┘
```

## 核心对象

| 对象 | 文件 | 职责 |
|---|---|---|
| `ShadowDreamBot` | `packages/core/src/bot.ts` | 生命周期、core actions、统计、心跳、事件分发 |
| `HttpTransport` | `packages/core/src/transport/http.ts` | HTTP API、WebUI、`/health`、CORS |
| `WsServerTransport` | `packages/core/src/transport/ws.ts` | 正向 WS，角色鉴权，事件广播 |
| `ReverseWsTransport` | 同上 | 反向 WS，自动重连，接收 action |
| `HttpPostTransport` | `packages/core/src/transport/http-post.ts` | 事件 POST 与 HMAC-SHA1 |
| `MessageIdRegistry` | `packages/core/src/message/message-id.ts` | 64 位内部 ID ↔ 32 位 OneBot ID |
| `MockBackend` | `packages/mock/src/backend.ts` | 内存 QQ 模拟器 |
| `QqntBackend` | `packages/qqnt/src/backend.ts` | QQNT wrapper 适配 |

## 事件流

QQNT 插件路径：

```text
QQ 服务端
  → QQ 客户端 wrapper session
  → NodeIKernelMsgListener.onRecvMsg / onRecvActiveMsg
  → QqntBackend.onRawMessages
  → convert.rawToEvent
  → ShadowDreamBot.dispatchEvent
  → WS 广播 / HTTP POST / WebUI 计数
```

模拟器路径：

```text
CLI / WebUI simulate
  → MockBackend.simulate
  → 生成真实的 OneBot message 事件
  → ShadowDreamBot.dispatchEvent
  → 同上
```

## Action 流

```text
HTTP / WS 客户端
  → 传输层解析 { action, params, echo }
  → ShadowDreamBot.execute
      ├─ core action：get_status / get_version_info / ...
      └─ backend.call(action, params)
            ├─ MockBackend 改内存状态
            └─ QqntBackend 调用 session.getXxxService()
  → { status, retcode, data, echo }
```

传输层只负责「收发 + 鉴权 + 序列化」，不包含 QQ 逻辑；后端只负责「QQ 语义」，不关心 HTTP / WS。这样换后端不需要重写 OneBot 服务，给核心加功能也不会碰到 QQ 版本相关代码。

## Backend 契约

```ts
interface Backend {
  name: string;
  version: string;
  selfId: number;
  capabilities: ReadonlySet<Capability>;
  supportedActions?: readonly string[];
  start(): Promise<void>;
  stop(): Promise<void>;
  call(action, params, context): Promise<unknown>;
  onEvent(listener): () => void;
  getSelfInfo?(): SelfInfo | Promise<SelfInfo>;
  getStatus?(): BotStatus | Promise<BotStatus>;
  simulate?(input): Promise<unknown>;
}
```

失败统一抛 `ActionError(retcode, message)`，`ShadowDreamBot.execute` 会把它翻译成 OneBot 返回包。未实现的 action 返回 `1401`，参数错误返回 `100`，目标不存在返回 `1404`，内部错误返回 `1500`。

## 消息 ID 映射

QQ 的 `msgId` 是 64 位字符串，OneBot 11 的 `message_id` 是 32 位整数。`MessageIdRegistry` 用 FNV-1a 生成候选值，冲突时线性探测，并维护双向 Map：

```text
internal: "7438291048576000000"  →  OneBot: 1837462912
OneBot:     1837462912           →  internal: "7438291048576000000"
```

同一内部 ID 永远得到同一个 OneBot ID；`get_msg` / `delete_msg` / `reply` 都可以反查。容量默认 50k，超出后淘汰最早映射。

## 鉴权

- HTTP：`Authorization: Bearer <token>` 或 `?access_token=`；空 token 关闭校验。
- WS：握手时用同一套 token；支持 `X-Client-Role: api | event | universal` 或 `?role=`。
- 反向 WS：Shadow Dream 作为客户端携带 `Authorization`。
- HTTP POST：可选 `X-Signature: sha1=<HMAC-SHA1(secret, body)>`。

## 监听地址

默认只监听 `127.0.0.1`。这是刻意的：OneBot 的 access token 一旦泄露，等于把 QQ 账号交给对方；需要公网访问时，请设置 token、限制防火墙，并优先放在反向代理后面。

## 配置热更新

`ShadowDreamBot` 持有当前配置和 `configPath`：

1. 启动时 `fs.watchFile(configPath)` 监听文件 mtime；
2. WebUI 的 `POST /webui/api/config` 或手工保存文件都会进入同一条 `applyConfig()`；
3. `applyConfig()` 先把新配置与当前配置深合并，再走 `normalizeConfig()` 做范围/类型校验；
4. `persist` 时原子写入配置文件；
5. 只改 token / HTTP POST / 反向 WS / 心跳 / 日志级别 → 直接替换对应 transport；
6. 改 HTTP / WS 的 host / port / path / enabled → 100ms 后关闭并重启传输层，避免把正在返回的 WebUI 请求掐断；
7. `backend.type` 不允许热切换。

WebUI 的「网络与反代」只是这套能力的图形界面；反向 WS 编辑器直接维护 `reverseWs[]`，保存后会自动重建反向连接。

账号登录不在热更新范围内：QQNT 后端复用 QQ 客户端登录态，WebUI 账号页只做状态展示，避免和 QQ 登录服务竞争 session。

## 为什么用 LiteLoader 插件

NapCat / SnowLuma 的 native 路线在 QQ 更新时最容易断：DLL 注入、`wrapper.node` 补丁、offset 都可能变化。LiteLoader 插件路线把「进入 QQ 进程」交给 LiteLoader，Shadow Dream 只依赖 QQ 自己的 JS API：

1. 捕获 `wrapper.node` 的导出；
2. 捕获 QQ 自己创建的 session；
3. 注册 listener；
4. 调用 `sendMsg` / `recallMsg` / group service。

代价是需要用户安装 LiteLoader，并且 wrapper 的字段形状仍可能变化；但失败点通常是可读的 JS 异常，而不是一个没有符号的 native crash。

## 失败与降级

- 端口占用：HTTP / WS 启动抛错，插件日志会显示具体端口；不会影响 QQ 本身。
- 群列表加载失败：只影响 `get_group_list` / `get_group_info`，消息收发仍可用。
- 好友列表加载失败：只影响 `get_friend_list`；私聊发送仍可用 `uid` 解析缓存。
- 发送消息 15 秒没有回传 ID：返回失败，避免客户端以为发送成功。
- 媒体发送：明确 `1401`，不会静默发送空消息。
