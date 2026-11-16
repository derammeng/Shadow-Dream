# OneBot 11 API

## 返回包

所有 API 都返回：

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {},
  "echo": "optional"
}
```

- `status`：`ok` / `async` / `failed`
- `retcode`：见文末
- `data`：动作结果；没有结果时为 `null`
- `echo`：原样回传客户端传入的 `echo`

失败时可能带：

```json
{
  "status": "failed",
  "retcode": 1401,
  "data": null,
  "message": "QQNT 插件暂不支持 action：xxx",
  "wording": "不支持的操作"
}
```

## 通用动作

这些动作由 core 实现，与后端无关：

| action | data | 说明 |
|---|---|---|
| `get_status` | `{online, good, stat}` | 在线 / 健康 / 统计 |
| `get_version_info` | `{app_name, app_version, protocol_version, ...}` | 固定 `protocol_version: "v11"` |
| `get_login_info` | `{user_id, nickname}` | 当前账号 |
| `get_supported_actions` | `string[]` | 含后端声明的动作 |
| `can_send_image` | `{yes}` | 由后端能力决定 |
| `can_send_record` | `{yes}` | 由后端能力决定 |
| `get_cookies` | `{cookies: ""}` | 兼容占位 |
| `get_csrf_token` | `{token: 0}` | 兼容占位 |
| `get_credentials` | `{cookies, csrf_token}` | 兼容占位 |

## 消息相关

### send_private_msg

```json
{
  "action": "send_private_msg",
  "params": {
    "user_id": 20001,
    "message": [
      { "type": "text", "data": { "text": "你好" } },
      { "type": "face", "data": { "id": "14" } }
    ]
  }
}
```

返回：`{ "message_id": 123 }`

### send_group_msg

```json
{
  "action": "send_group_msg",
  "params": {
    "group_id": 30001,
    "message": "你好 [CQ:at,qq=20001]",
    "auto_escape": false
  }
}
```

### send_msg

按 `message_type` 或 `group_id` / `user_id` 自动路由到上面两个。

### delete_msg

```json
{ "action": "delete_msg", "params": { "message_id": 123 } }
```

QQNT 后端调用 `recallMsg`；mock 后端把消息标记为撤回并发出 `group_recall` / `friend_recall` 通知。

### get_msg

```json
{ "action": "get_msg", "params": { "message_id": 123 } }
```

返回发送者、时间、消息段、`raw_message`、`group_id` 等。

### get_forward_msg

mock 返回空列表；QQNT 0.1 暂未实现合并转发解析。

### 合并转发发送

mock 支持：

```text
send_private_forward_msg
send_group_forward_msg
```

QQNT 0.1 未实现。

## 信息查询

| action | 主要参数 | 说明 |
|---|---|---|
| `get_friend_list` | 无 | 好友列表 |
| `get_group_list` | 无 | 群列表 |
| `get_group_info` | `group_id` | 群信息 |
| `get_group_member_list` | `group_id` | 群成员列表 |
| `get_group_member_info` | `group_id`, `user_id` | 单个成员 |
| `get_stranger_info` | `user_id` | 陌生人 / 好友资料 |
| `get_group_msg_history` | `group_id`, `count` | 缓存内最近消息 |
| `get_friend_msg_history` | `user_id`, `count` | 缓存内最近消息 |
| `get_group_at_all_remain` | `group_id` | @全体剩余次数（静态值） |
| `get_group_file_system_info` | `group_id` | 群文件容量（静态值） |
| `get_online_clients` | 无 | 在线客户端（QQNT 返回空） |

## 群管理

| action | 参数 | 说明 |
|---|---|---|
| `set_group_kick` | `group_id`, `user_id`, `reject_add_request?` | 踢人 |
| `set_group_ban` | `group_id`, `user_id`, `duration` | 禁言，`0` 解除 |
| `set_group_whole_ban` | `group_id`, `enable` | 全员禁言 |
| `set_group_admin` | `group_id`, `user_id`, `enable` | 设置 / 取消管理员 |
| `set_group_card` | `group_id`, `user_id`, `card` | 改群名片 |
| `set_group_name` | `group_id`, `group_name` | 改群名 |
| `set_group_leave` | `group_id` | mock 支持；QQNT 0.1 未实现 |
| `set_group_special_title` | `group_id`, `user_id`, `special_title` | mock 支持 |
| `set_friend_add_request` | `flag`, `approve` | mock 占位 |
| `set_group_add_request` | `flag`, `sub_type`, `approve` | mock 占位 |

## 消息段

| type | data | QQNT 发送 | 说明 |
|---|---|---|---|
| `text` | `text` | ✅ | |
| `at` | `qq`（`all` 或 QQ 号） | ✅ | |
| `face` | `id` | ✅ | 小黄脸 |
| `reply` | `id` | ✅ | 需要目标消息在缓存中 |
| `json` | `data` | ✅ | 作为 ark 发送 |
| `xml` | `data` | ✅ | 作为 ark 发送 |
| `mface` | `id`, `name` | ✅ | 商城表情 |
| `image` | `file`, `sub_type?`, `summary?` | ✅ | 图片，见下方「媒体发送」 |
| `record` | `file` | ✅ | 语音，自动转 SILK，见下方「媒体发送」 |
| `video` | `file` | ✅ | 视频，支持 mp4 / mov，见下方「媒体发送」 |
| `file` | `file`, `name` | ✅ | 文件，见下方「媒体发送」 |
| `poke` | `id` | ❌ 1401 | |
| `forward` | `id` | ❌ 1401 | |

接收侧会把 QQNT 的图片 / 语音 / 视频 / 文件元素转换为对应的 OneBot 段，`file` 尽量使用 QQ 缓存路径或文件 ID。

### 媒体发送

`image` / `record` / `video` / `file` 的 `file` 支持四种写法，Koishi / AstrBot 等后端常用的形式都能直接用：

| 写法 | 示例 |
|---|---|
| 本地路径 | `/home/meng/pic.png`、`C:\\Users\\me\\pic.png` |
| `file://` URL | `file:///home/meng/pic.png` |
| `http(s)://` URL | `https://example.com/pic.png`（20 秒超时；图片 30MB / 语音 20MB / 视频与文件 100MB 上限） |
| `base64://` | `base64://iVBORw0KGgo...` |

- 图片格式：PNG / JPEG / GIF / WebP / BMP；`sub_type: 1` 表示表情包。
- 语音格式：SILK（直传）、WAV、MP3。其它格式（AMR / OGG）会明确返回 `1401`，不会发一条坏语音。
- 语音会被重采样到 24kHz 并转成 QQ 需要的 SILK，时长按秒写进 `record.duration`。
- 视频格式：MP4 / MOV；会尽量从容器里读出时长与分辨率，读不到时用保守默认值；封面暂时用内置占位图。
- 文件：任意类型，`name` 会作为 QQ 里显示的文件名，留空则用原文件名。

## 事件

### message

```json
{
  "time": 1794658603,
  "self_id": 10001,
  "post_type": "message",
  "message_type": "group",
  "sub_type": "normal",
  "message_id": 4,
  "user_id": 20002,
  "group_id": 30001,
  "message": [{ "type": "text", "data": { "text": "你好" } }],
  "raw_message": "你好",
  "font": 0,
  "sender": {
    "user_id": 20002,
    "nickname": "阿岚",
    "card": "阿岚",
    "role": "member"
  }
}
```

私聊时 `message_type: "private"`、`sub_type: "friend"`，没有 `group_id`。

### message_sent

自己发出的消息，字段与 `message` 相同，另外私聊带 `target_id`。

### notice

已实现 / 可产生：

- `group_upload`（mock 暂未产生）
- `group_admin`
- `group_decrease`
- `group_increase`
- `group_ban`
- `friend_add`
- `group_recall`
- `friend_recall`
- `notify/poke`（QQNT 0.1 暂未产生）
- `group_card`

QQNT 插件在 `onMsgRecall` 和 `onMsgInfoListUpdate` 的 `recallTime` 上产生撤回通知；群成员变动通知需要解析灰条，0.1 暂未完全覆盖。

### request

`friend` / `group` 请求在 mock 中可占位；QQNT 0.1 暂未接。

### meta_event

```json
{
  "time": 1794658603,
  "self_id": 10001,
  "post_type": "meta_event",
  "meta_event_type": "heartbeat",
  "sub_type": "heartbeat",
  "status": {
    "online": true,
    "good": true,
    "stat": {
      "packet_received": 10,
      "packet_sent": 5,
      "message_received": 8,
      "message_sent": 2,
      "last_message_time": 1794658600
    }
  },
  "interval": 30000
}
```

`lifecycle` 在启动时发 `connect`，停止前发 `disable`。

## 返回码

| retcode | 含义 |
|---|---|
| `0` | 成功 |
| `1` | 已接受，异步处理 |
| `100` | 参数错误 |
| `102` | 没有权限 |
| `103` | 未登录 / 无会话 |
| `104` | access token 无效 |
| `1401` | 当前后端不支持 |
| `1404` | 目标不存在 / 不在缓存 |
| `1500` | 内部错误 |

## CQ 码

```text
[CQ:at,qq=all]
[CQ:at,qq=20001,name=小梦]
[CQ:face,id=14]
[CQ:image,file=https://example.com/a.png]
[CQ:reply,id=123]
```

转义规则：

```text
&  → &amp;
[  → &#91;
]  → &#93;
,  → &#44;
```

解析器对无法识别的 CQ 段会当成未知 `type` 保留，不会整条丢弃。文本中的非法 CQ 片段按普通文本处理。

## HTTP GET 参数

```text
GET /get_group_info?group_id=30001
GET /send_private_msg?user_id=20001&message=hello
```

数字、布尔、JSON 字面量会被自动还原；`message` 这种复杂结构建议用 POST。

## WebSocket

请求：

```json
{ "action": "get_status", "params": {}, "echo": 1 }
```

响应：

```json
{ "status": "ok", "retcode": 0, "data": {...}, "echo": 1 }
```

事件帧没有 `action` 字段，客户端按 `post_type` 判断。
