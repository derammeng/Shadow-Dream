# OneBot 11

Shadow Dream 的 HTTP API、正向 WebSocket、反向 WebSocket 和 HTTP POST 都遵循 OneBot 11。

## HTTP API

```bash
curl http://127.0.0.1:3000/get_status
```

POST 也可以：

```bash
curl -X POST http://127.0.0.1:3000/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"get_group_list","params":{}}'
```

## 鉴权

配置了 `http.accessToken` 后：

```bash
curl -H "Authorization: Bearer <accessToken>" \
  http://127.0.0.1:3000/get_status
```

也支持：

```text
X-Access-Token: <token>
?access_token=<token>
```

## 正向 WebSocket

```text
ws://127.0.0.1:3001
```

| 角色 | Header |
|---|---|
| universal | `X-Client-Role: Universal` |
| api | `X-Client-Role: API` |
| event | `X-Client-Role: Event` |

token 使用 `Authorization: Bearer` 或 `?access_token=`。

## 常用 action

```text
get_login_info
get_status
get_version_info
get_friend_list
get_group_list
get_group_member_list
send_private_msg
send_group_msg
send_msg
delete_msg
get_msg
set_group_ban
set_group_card
set_group_kick
```

媒体发送尚未实现，会返回 `1401`。

## 消息格式

- 字符串 + CQ 码；
- 消息段数组；
- `auto_escape`；
- 私聊 / 群聊；
- 回复、@、表情。

完整 action 列表和参数见 WebUI「调试台」，或源码 `packages/core/src/types/onebot.ts`。
