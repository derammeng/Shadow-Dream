# 公网安全

Shadow Dream 的默认配置只监听 `127.0.0.1`，适合本机。暴露公网前至少做这几件事。

## 1. 设置 WebUI token

```json
{
  "http": {
    "webuiToken": "20位随机token"
  }
}
```

这会同时保护 QQ 登录页和控制台。

## 2. 设置 OneBot token

```json
{
  "http": {
    "accessToken": "另一串随机token"
  },
  "ws": {
    "accessToken": "另一串随机token"
  }
}
```

`webuiToken` 只保护 WebUI；`accessToken` 保护 OneBot HTTP API；WS 还有自己的 token，建议分别设置。

## 3. 反向代理

推荐让 Nginx / Caddy 对外，Shadow Dream 只监听本机：

```nginx
server {
    listen 443 ssl http2;
    server_name bot.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /onebot/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

设置 `X-Forwarded-Proto: https` 后，WebUI cookie 会自动加 `Secure`。

## 4. 防火墙

- 只开放 443（或 80 跳转 443）；
- 不要直接开放 3000 / 3001；
- 云服务器安全组同样只放行反代端口。

## 5. 不要提交 token

`config/shadowdream.json` 已在 `.gitignore` 中。提交前确认：

```bash
git status --short
```

不要提交真实 token、QQ 密码、cookie 或 `data/`。
