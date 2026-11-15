# WebUI 与 token

WebUI 和 HTTP API 共用 `http.host` / `http.port`。

`http.host` 设为 `0.0.0.0` 或 `::` 时，启动日志和概览页会自动显示当前机器的局域网 IPv4（本机仍可用 `127.0.0.1`）。有多张网卡时以实际能访问的地址为准；也可以把 `http.host` 直接写成具体的局域网 IP。改 host 后传输层会自动重启并打印新地址；启动横幅只在进程启动时打印，重启后会更新。

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

## 更新

侧边栏「更新」页可以检查 GitHub Release 的 `install-latest` 版本，并直接下载、安装、重启 Shadow Dream + QQNT。更新会保留配置和插件 data；安装过程中 WebUI 会短暂断开，QQ 重启并重新登录后刷新页面即可。

Linux 安装支持一键更新；Windows 原生安装仍用安装脚本更新插件。

## 登录行为

- 打开 `/webui/` 先出现 token 登录页；
- 登录成功后使用 HttpOnly session cookie；
- 如果之前登录过 QQ，token 通过后会自动用保存的账号恢复登录，成功就直接进入控制台，不再显示二维码；
- 只有没有可恢复账号、账号已下线或自动登录失败时，才显示 QQ 扫码页；
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
