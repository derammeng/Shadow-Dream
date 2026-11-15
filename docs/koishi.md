# 对接 Koishi

Shadow Dream 提供标准 OneBot 11 正向 WebSocket，Koishi 的 `adapter-onebot` 可以直接连接。已在 WSL 里用 **Koishi 4.18.11 + koishi-plugin-adapter-onebot** 实测。

## 1. 启动 Shadow Dream

```bash
cd ~/shadowdream
npm run build
node packages/mock/dist/cli.js --no-repl --http-port 3000 --ws-port 3001
```

或者用 WebUI / systemd 启动。

默认 mock 账号：

```text
QQ 10001 · 影梦
WS ws://127.0.0.1:3001/
```

## 2. Koishi 配置

在 `~/koishi-app/koishi.yml` 的 `group:adapter` 下：

```yaml
  group:adapter:
    adapter-onebot:ry6mra:
      selfId: '10001'
      protocol: ws
      endpoint: 'ws://127.0.0.1:3001'
```

注意：

- `adapter-onebot` 前面**不要**有 `~`，有 `~` 在 Koishi 里表示禁用；
- `endpoint` 不要有前导空格；
- `selfId` 要和 Shadow Dream 当前账号一致（mock 是 `10001`，QQNT 是真实 QQ 号）；
- 如果 Shadow Dream 设置了 WS token，在 Koishi 这一项里加 `token: '同一个 token'`。

然后启动：

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.5/bin:$PATH"
cd ~/koishi-app
node node_modules/koishi/bin.js start
# 或：node .yarn/releases/yarn-4.5.3.cjs start
```

Koishi 控制台默认：

```text
http://127.0.0.1:5140
```

## 3. 验证

Shadow Dream 日志：

```text
WS 客户端 #1 已连接（universal，127.0.0.1:xxxxx）
```

Koishi 开启 debug 后：

```bash
node node_modules/koishi/bin.js start --debug --log-level 3
```

应能看到：

```text
[D] onebot [request] get_login_info {}
[D] onebot [response] { status: 'ok', retcode: 0, data: { user_id: 10001, nickname: '影梦' }, echo: 1 }
[I] adapter connect to server: ws://127.0.0.1:3001/
[D] onebot [receive] { post_type: 'message', message_type: 'group', ... }
```

在 Shadow Dream WebUI 的调试台注入一条群消息，Koishi 的日志里能看到对应的 `[receive]` 事件。

## 4. 从 Windows 访问

WSL2 的 localhost 转发通常可用：

```text
Shadow Dream WebUI: http://127.0.0.1:3000/webui/
Koishi 控制台:           http://127.0.0.1:5140
```

如果打不开，在 WSL 里执行 `hostname -I`，用 WSL IP 访问；或者检查 `.wslconfig` 的 `networkingMode`。

## 5. 常见问题

### `get_guild_service_profile` 返回 1401

旧版本 mock / qqnt 后端没有这个兼容动作。现在已补：

```text
get_guild_service_profile -> {}
get_guild_list              -> []
```

Koishi 启动时不再报 unsupported。

### `ECONNREFUSED 127.0.0.1:3001`

Shadow Dream 没启动，或者 WS 端口不是 3001。检查：

```bash
curl http://127.0.0.1:3000/get_status
ss -lntp | grep 3001
```

### 连接成功但收不到消息

- `selfId` 是否和 Shadow Dream 当前 QQ 一致；
- 是否设置了 WS token 而 Koishi 没填；
- Shadow Dream 日志有没有 `WS 客户端已连接`；
- 在 WebUI 调试台注入消息，观察 Koishi debug 日志的 `[receive]`。

### Koishi 改了 `koishi.yml` 必须重启

Koishi 的插件配置不是全部自动重载；改完 adapter 配置后重启 Koishi。
