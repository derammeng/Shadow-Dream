# 配置

## 文件位置

| 运行方式 | 默认路径 |
|---|---|
| 模拟器 / 独立运行 | `<仓库>/config/shadowdream.json` |
| LiteLoader 插件 | LiteLoader 的插件数据目录下 `config.json`（启动日志会打印） |

首次启动会自动生成。也可以：

```bash
# 模拟器
node packages/mock/dist/cli.js --config ./my-config.json

# 环境变量
FD_CONFIG=D:\bots\shadowdream.json node packages/mock/dist/cli.js
```

## 完整示例

```json
{
  "http": {
    "enabled": true,
    "host": "127.0.0.1",
    "port": 3000,
    "accessToken": "change-me",
    "webui": true,
    "cors": ["*"]
  },
  "wsServers": [
    {
      "name": "Koishi",
      "enabled": true,
      "host": "127.0.0.1",
      "port": 3001,
      "path": "/",
      "accessToken": "change-me"
    },
    {
      "name": "备用",
      "enabled": false,
      "host": "127.0.0.1",
      "port": 3002,
      "path": "/alt",
      "accessToken": "change-me-too"
    }
  ],
  "httpPost": [
    {
      "url": "http://127.0.0.1:8080/onebot/event",
      "secret": "hmac-secret",
      "timeoutMs": 5000
    }
  ],
  "reverseWs": [
    {
      "url": "ws://127.0.0.1:8080/onebot/v11/ws",
      "accessToken": "upstream-token",
      "reconnectIntervalMs": 3000
    }
  ],
  "heartbeat": {
    "enabled": true,
    "intervalMs": 30000
  },
  "logLevel": "info",
  "backend": {
    "type": "mock"
  }
}
```

## HTTP

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | 是否启动 |
| `host` | string | `127.0.0.1` | 监听地址 |
| `port` | number | `3000` | 端口；`0` 表示随机端口（测试用） |
| `accessToken` | string | `""` | 空表示不鉴权 |
| `webui` | boolean | `true` | 是否挂载 `/webui/` |
| `cors` | string[] | `["*"]` | 允许的 Origin |

API 路径：

- `POST /`：body `{ "action": "...", "params": {...}, "echo": ... }`
- `GET /get_status`：查询参数直接作为 params
- `GET /health`：进程健康检查，不走 token
- `GET /webui/`：控制台页面

鉴权方式：

```http
Authorization: Bearer change-me
```

或：

```text
http://127.0.0.1:3000/get_status?access_token=change-me
```

## WebSocket

`wsServers` 是正向 WebSocket 端点数组。每个对象：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `name` | string | `WebSocket N` | WebUI 显示名 |
| `enabled` | boolean | `true` | 是否监听 |
| `host` | string | `127.0.0.1` | 监听地址 |
| `port` | number | `3001` | 端口；每个端点独立 |
| `path` | string | `/` | 路径 |
| `accessToken` | string | `""` | 该端点独立 token |

```json
"wsServers": [
  { "name": "Koishi", "enabled": true, "host": "127.0.0.1", "port": 3001, "path": "/", "accessToken": "" },
  { "name": "备用", "enabled": false, "host": "127.0.0.1", "port": 3002, "path": "/alt", "accessToken": "" }
]
```

- `wsServers: []` 表示关闭所有正向 WS；
- 旧配置只有 `ws` 对象时，会自动迁移成一项；
- 保存时 `ws` 字段会同步为 `wsServers[0]` 的镜像，兼容旧客户端；
- WebUI 的「WebSocket」板块可以单独启停、编辑、删除、测试每个地址；
- 一个 `host:port` 最多只有一个端点复用 HTTP server；其他端点请使用不同端口，否则会启动失败并在日志里提示。

连接角色通过 `X-Client-Role` 或 `?role=`：

| 角色 | 可以调用 API | 可以收事件 |
|---|---|---|
| `api` | 是 | 否 |
| `event` | 否 | 是 |
| `universal` | 是 | 是 |

如果某个 WS 的 `host` / `port` 与 HTTP 相同，它会复用 HTTP server，不再单独监听端口。

## 反向 WebSocket

Shadow Dream 启动后主动连接 `reverseWs[].url`，推送事件；业务端在同一条连接上发 `{action, params, echo}`，Shadow Dream 回包。断线后按 `reconnectIntervalMs` 重连。

适用于「业务端是服务端、Bot 在内网」的部署。

## HTTP POST

每个事件都会以 `POST application/json` 发到每个 `httpPost[].url`：

```http
X-Self-ID: 10001
X-Signature: sha1=...
User-Agent: Shadow Dream/0.2.0
```

签名：

```text
hex(HMAC-SHA1(secret, rawBody))
```

业务端应比较 `X-Signature` 与自己的计算结果，防止伪造事件。

## 心跳

`meta_event_type: "heartbeat"`，默认 30 秒。`intervalMs` 范围 1000–3600000。心跳会走 WS 和 HTTP POST，但不会写日志，避免刷屏。

## 自动重载

配置文件会被监听（`fs.watchFile`，约 1.2 秒轮询）。改完保存后会自动应用：

- token、HTTP POST、反向 WS、心跳、日志级别：立即生效；
- HTTP / WS 的 host / port / path / enabled：关闭旧传输层并重新监听；
- `backend.type`：不支持热切换，需要重启进程 / 插件。

WebUI 的「网络与反代」页面保存时也是同一套逻辑。相关接口见 [webui.md](webui.md)。

如果改端口把 WebUI 自己弄断，直接用新地址打开；改 token 后页面会重新要求登录。

## backend

### mock

```json
"backend": { "type": "mock" }
```

无需额外配置。数据在内存里，重启恢复种子数据。

### qqnt

```json
"backend": { "type": "qqnt" }
```

只有 LiteLoader 插件内有效；独立进程无法加载 QQ wrapper。插件启动时会强制把 type 设为 `qqnt`。

## 环境变量

| 变量 | 覆盖 |
|---|---|
| `FD_CONFIG` | 配置文件路径 |
| `FD_HTTP_HOST` / `FD_HTTP_PORT` | HTTP 监听 |
| `FD_HTTP_TOKEN` | HTTP token |
| `FD_WS_HOST` / `FD_WS_PORT` / `FD_WS_PATH` | WS 监听 |
| `FD_WS_TOKEN` | WS token |
| `FD_LOG_LEVEL` | `trace` / `debug` / `info` / `warn` / `error` |
| `FD_BACKEND` | 后端类型 |

## 日志级别

- `trace`：非常细，含每条事件的调试信息；
- `debug`：action 耗时、WS 细节；
- `info`：启动、连接、收到消息；
- `warn`：可恢复错误、鉴权失败、发送超时；
- `error`：启动失败、未捕获异常。

日志同时进入 WebUI 的环形缓冲区（最近 1000 条），便于远程排查。
