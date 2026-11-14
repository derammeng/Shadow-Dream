# WebUI 与 token

WebUI 和 HTTP API 共用 `http.host` / `http.port`。

## 设置 token

公网部署必须设置：

```json
{
  "http": {
    "enabled": true,
    "host": "127.0.0.1",
    "port": 3000,
    "webui": true,
    "webuiToken": "20位随机token"
  }
}
```

`webuiToken` 为空时沿用 `http.accessToken`；两者都为空才免登录。

安装脚本默认生成 20 位 token。也可以在 WebUI 的「网络」页点「随机生成 20 位 token」，保存后生效。

## 登录行为

- 打开 `/webui/` 先出现 token 登录页；
- 登录成功后使用 HttpOnly session cookie；
- QQ 扫码页和登录后的控制台共用同一个 session；
- cookie 7 天有效，HTTPS 反代下自动加 `Secure`；
- 右上角「退出」可以清除 session；
- 登录失败按来源 IP 限速，一分钟最多 10 次。

## 为什么不是把 token 放 localStorage

token 放在 localStorage 意味着任何 XSS 都能直接读走。WebUI 现在使用 HttpOnly cookie，JavaScript 读不到 token；页面本身也只有在 session 有效时才会被服务端返回。

## 接口鉴权

除登录相关接口外，`/webui/api/*` 都要求有效 session。

脚本也可以直接带 token：

```bash
curl -H "Authorization: Bearer <webuiToken>" \
  http://127.0.0.1:3000/webui/api/overview
```

## 修改 token 后

旧 session 会立刻失效，刷新页面重新输入新 token。

## 相关接口

```text
GET  /webui/api/session
POST /webui/api/login       {"token":"..."}
POST /webui/api/logout
```

详见 [WebUI API](/api/webui)。
