# WebUI API

WebUI 和 HTTP API 共用同一个端口。除登录相关接口外，都要求有效的 WebUI session，或带 `Authorization: Bearer <webuiToken>`。

## 登录

```http
POST /webui/api/login
Content-Type: application/json

{"token":"20位token"}
```

成功返回 `{"ok":true}`，并设置 HttpOnly cookie：

```text
shadowdream_webui
```

## 状态

```http
GET /webui/api/session
```

```json
{ "authenticated": true, "authRequired": true }
```

## 退出

```http
POST /webui/api/logout
```

## 管理与调试

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/webui/api/overview` | 运行状态、账号、WS 客户端 |
| GET | `/webui/api/config` | 当前配置 |
| POST | `/webui/api/config` | 保存配置，`persist` 默认 true |
| POST | `/webui/api/reload` | 从磁盘重新加载 |
| POST | `/webui/api/restart` | 重启传输层 |
| GET | `/webui/api/logs?since=0&limit=150` | 日志 |
| POST | `/webui/api/action` | 调用任意 OneBot action |
| POST | `/webui/api/simulate` | 注入模拟消息（mock） |
| GET | `/webui/api/update/check` | 检查远端版本 |
| POST | `/webui/api/update/apply` | 下载并安装更新（会重启 QQ） |

## 更新

```http
GET /webui/api/update/check
```

返回 `supported`、`root`、`current`、`latest`、`updateAvailable` 和错误信息。更新源是 Release `install-latest` 里的 `install-bundle.json`。

```http
POST /webui/api/update/apply
```

触发 `scripts/update-shadowdream.sh --update --delay 2`。接口返回后 QQ 会退出并自动重启，WebUI 会短暂断开；更新日志在源码目录的 `logs/webui-update.log`。


## 保存配置

```http
POST /webui/api/config
Content-Type: application/json

{
  "config": { "...": "完整配置" },
  "persist": true
}
```

只改 token、HTTP POST、反向 WS、心跳、日志级别会立即生效；改监听地址会触发传输层重启。

## 鉴权失败

```json
{
  "status": "failed",
  "retcode": 104,
  "data": null,
  "message": "请先登录 WebUI"
}
```

先 `POST /webui/api/login`，或带 Bearer token 重试。
