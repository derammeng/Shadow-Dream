# QQNT 插件

## 它是怎么工作的

`@shadowdream/qqnt` 是 LiteLoaderQQNT 插件：

- 在 QQ 主进程加载；
- 通过 `Module._load` / `require.cache` 捕获 `wrapper.node`；
- 复用 QQ 已经登录的 session；
- **不替换** `process.dlopen`，不修改 `wrapper.node`。

## 目录

```text
<LiteLoader profile>/plugins/shadowdream/
<LiteLoader profile>/data/shadowdream/config.json
<LiteLoader profile>/data/shadowdream/account.json
```

`account.json` 保存上一次登录的 QQ，用于一键登录。

## 登录方式

登录页支持：

- 手机 QQ 扫码；
- QQ 号 + 密码（密码只在内存中计算 MD5 后交给 QQ 登录服务）；
- 已保存账号一键登录。

扫码失败或二维码过期时，页面有「刷新二维码」。

## 一键登录

登录页会读取本机已保存账号，点击卡片调用 QQ 的 `quickLoginWithUin`。

如果 QQ 要求手机确认，仍会走 QQ 官方确认流程；Shadow Dream 不保存密码，也不绕过确认。

## 公共 profile / 无头

Linux 无头运行通常把 `LITELOADERQQNT_PROFILE` 指向一个固定目录，例如：

```text
/opt/QQ/profile
```

然后：

```bash
/opt/QQ/profile/plugins/shadowdream
/opt/QQ/profile/data/shadowdream/config.json
```

完整步骤见 [Linux 无头运行](/guide/headless)。

## 排故

- 插件没加载：看 LiteLoader 启动日志里的 `LiteLoader.path.plugins`；
- 登录页打不开：确认 QQ 进程还在，3000 端口没有被别的东西占用；
- 登录后没消息：确认 QQ 已登录、Koishi / WS 客户端已连接；
- 二维码反复失败：点「刷新二维码」，或重启 QQ 后重新登录。
