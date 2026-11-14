# 启动

## 先用模拟器跑通

不需要 QQ，验证 OneBot 链路：

```bash
npm run demo
```

打开：

```text
http://127.0.0.1:3000/webui/
```

如果安装时生成了 token，先输入 token，再进入控制台。

请求示例：

```bash
curl http://127.0.0.1:3000/get_status
```

## 用真实 QQNT

1. 启动已经安装 LiteLoaderQQNT 的 QQ；
2. 确认插件目录里有 `shadowdream`；
3. 打开 WebUI：

```text
http://127.0.0.1:3000/webui/
```

4. 输入 WebUI token；
5. 用手机 QQ 扫码，或使用已保存账号的一键登录；
6. 登录成功后进入控制台。

## 启动顺序

推荐：

```text
Xvfb → QQ → 登录 QQ → Shadow Dream 自动启动 → Koishi / 其他框架连接
```

Linux 无头的完整命令见 [Linux 无头运行](/guide/headless)。

## 常见端口

| 用途 | 默认地址 |
|---|---|
| HTTP API / WebUI | `http://127.0.0.1:3000` |
| 正向 WebSocket | `ws://127.0.0.1:3001` |
| Koishi 控制台 | `http://127.0.0.1:5140` |

## 停止

- 模拟器：终端 `Ctrl+C`；
- QQ 插件：退出 QQ；
- Linux 无头：停止 QQ 进程，必要时再停 Xvfb。

## 下一步

- [WebUI 与 token](/guide/webui)
- [QQNT 插件细节](/guide/qqnt)
- [排故](/guide/troubleshooting)
