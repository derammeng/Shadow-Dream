# QQNT 插件后端

> 状态：0.1 实验性。核心 OneBot 层和模拟器已经过测试；QQNT 路径按 LiteLoader 生命周期实现，但不同 QQ 版本的 wrapper 字段可能不同，请以日志为准。

## 它做什么

Shadow Dream 的 QQNT 后端是一个 LiteLoaderQQNT 插件：

1. 在 QQ 主进程启动时，拦截 `process.dlopen`，捕获 QQ 加载的 `wrapper.node`；
2. 拦截 `NodeIQQNTWrapperSession.create / get / getNTWrapperSession`，捕获 QQ 自己创建的 session；
3. 从登录列表 / profile 读取当前 QQ 号和 uid；
4. 注册 `NodeIKernelMsgListener`、`NodeIKernelGroupListener`；
5. 把 `onRecvMsg` 的原始消息转换成 OneBot 11 事件；
6. 把 OneBot action 转换成 `sendMsg` / `recallMsg` / group service 调用；
7. 在同一个进程里启动 HTTP / WebSocket / WebUI。

它**不**：

- 修改 `wrapper.node`；
- 注入 DLL；
- 读取或上传密码；
- 实现 QQ 登录协议 / 签名；
- 绕过 QQ 的登录界面。

因此，QQ 没登录时 Shadow Dream 不会工作；二维码 / 快速登录仍然由 QQ 客户端负责。

## 前置条件

- Windows 上的 QQNT（9.x）；
- 已安装并能正常加载插件的 [LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT)；
- 用 QQ 正常登录。

QQ / LiteLoader 的版本组合不保证全部兼容。Shadow Dream 依赖的是 wrapper 的 JS 方法名，而不是 native offset，所以通常比 DLL 方案更容易适配，但也需要实测。

## 构建

```bash
npm install
npm run build:plugin
```

产物：

```text
packages/qqnt/release/shadowdream/
├─ manifest.json
├─ main.js
├─ backend.js
├─ capture.js
├─ convert.js
└─ node_modules/
   ├─ @shadowdream/core/
   └─ ws/
```

也可以手动打包：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-plugin.ps1
# packages/qqnt/release/shadowdream.zip
```

## 安装

1. 找到 LiteLoader 的插件目录（LiteLoader 文档里的 `plugins` 目录）。
2. 把整个 `shadowdream` 文件夹复制进去，确保 `manifest.json` 位于 `plugins/shadowdream/manifest.json`。
3. 完全退出 QQ，再启动。
4. 用 QQ 正常登录。
5. 查看 LiteLoader / QQ 日志，确认 Shadow Dream 的输出。

如果 QQ 启动时 Shadow Dream 还没有加载，LiteLoader 的插件列表里应该能看到它；禁用再启用，或重启 QQ。

## 数据目录与配置

插件数据目录由 LiteLoader 的 `LiteLoader.plugins.shadowdream.path.data` 决定。Shadow Dream 会在这里生成：

```text
config.json      # HTTP / WS / token
```

启动日志会打印完整路径。默认配置：

```json
{
  "http": { "enabled": true, "host": "127.0.0.1", "port": 3000, "accessToken": "", "webui": true, "cors": ["*"] },
  "wsServers": [
    { "name": "Koishi", "enabled": true, "host": "127.0.0.1", "port": 3001, "path": "/", "accessToken": "" }
  ],
  "httpPost": [],
  "reverseWs": [],
  "heartbeat": { "enabled": true, "intervalMs": 30000 },
  "logLevel": "info",
  "backend": { "type": "qqnt" }
}
```

`backend.type` 会被强制为 `qqnt`。HTTP / WS / 反向 WS / token 等配置可以在 WebUI 的「网络与反代」里保存并热更新；改 host / port 会重启传输层，但不需要重启 QQ。插件代码本身更新仍然需要重启 QQ 或重新加载插件。

## 账号与登录

WebUI 的「账号」页展示当前 QQ、昵称、后端、能力和登录模式。

- QQNT 插件复用 QQ 客户端已经登录的 session；
- **WebUI 不提供二维码 / 密码登录**，也不会接管 QQ 的登录窗口；
- 需要换号时，在 QQ 客户端里切换账号，然后重启插件或 QQ；
- 这样设计是为了避免和 QQ 自己的登录服务抢会话，减少把账号登录态弄坏的风险。

如果以后要做 WebUI 扫码，需要单独接 QQNT 登录服务，并处理「客户端登录窗口 / WebUI 登录」二选一的生命周期，当前版本没有启用。

## 工作原理与日志

正常启动会看到：

```text
Shadow Dream 已接入 QQNT wrapper
Shadow Dream 已捕获 QQNT session
Shadow Dream 已启动：QQ 123456 昵称
HTTP API  http://127.0.0.1:3000
WebSocket ws://127.0.0.1:3001
WebUI     http://127.0.0.1:3000/webui/
配置      .../plugins/shadowdream/data/config.json
```

### 捕获 wrapper

插件加载时给 `process.dlopen` 打一个临时补丁。QQ 加载 `wrapper.node` 时，补丁读到 `module.exports`，然后恢复原函数。如果插件加载得比 wrapper 晚，1.5s / 5s / 12s 会扫描 `require.cache`，寻找带有 `NodeIQQNTWrapperSession`、`NodeIKernelLoginService` 的模块。

### 捕获 session

`NodeIQQNTWrapperSession` 是 QQ 的会话类。插件包一层 `create` / `get` / `getNTWrapperSession`，并在 800ms 轮询里尝试 `get()` 和 `getNTWrapperSession('nt_1')`。抓到带 `getMsgService()` 的对象后开始启动。

### 发消息

```text
OneBot send_group_msg
  → 解析 message 段
  → 文本 / at / face / reply / json / mface 转成 NTQQ element
  → generateMsgUniqueId 生成关联 token
  → msgService.sendMsg('0', peer, elements, new Map())
  → onMsgInfoListUpdate 收到 guildId 匹配的消息
  → 返回 OneBot message_id
```

没有回传消息 ID 会在 15 秒后失败，避免客户端误以为发送成功。

## 故障排查

### 看不到 “捕获 wrapper”

- LiteLoader 是否真的加载了 Shadow Dream？插件列表里是否启用？
- QQ 是否被其他补丁修改过 `wrapper.node`？
- 试着重启 QQ，或先禁用再启用插件。
- 查看日志里有没有 `60 秒内没有捕获到 wrapper.node`。

### 捕获了 wrapper，但没有 session

- QQ 是否已经登录？
- 试着在登录后重新加载插件。
- 某些 QQ 版本会延迟创建 session；插件会持续轮询。

### 启动失败：端口占用

```text
HTTP 端口 3000 已被占用
```

改 `config.json` 里的 `http.port` / `wsServers[].port`，或在 WebUI 的「WebSocket」页调整；重启 QQ。或先停掉占用端口的 NapCat / 旧 Bot。

### WebUI 打不开

- 配置里 `http.enabled` 和 `http.webui` 是否为 `true`？
- 是否只监听了 `127.0.0.1`，却从另一台机器访问？
- 设置了 token 时，WebUI 页面右上角要填同一个 token。

### 发图片返回 1401

0.1 的明确限制。图片发送需要 NTQQ 的 highway 上传通道；Shadow Dream 不会用「把本地路径塞进 element」的方式发一条坏消息。后续版本会补。

### 收不到某类消息

- 私聊 / 群聊的 `onRecvMsg` 是否触发？日志会打印 `收到消息`。
- 合并转发、频道、临时会话可能不在 0.1 的 listener 覆盖内。
- 群成员变动、拍一拍等灰条事件尚未完全解析。

### QQ 更新后失效

wrapper 的 JS API 形状可能变化。先看日志的异常堆栈：

- `addKernelMsgListener is not a function`：listener API 改名；
- `getAllMemberList` 返回结构变化：群成员加载失败；
- `sendMsg` 参数变化：发送失败。

把日志和 QQ 版本号一起反馈，通常只需要改 `backend.ts` 的适配层，不需要动核心。

## 卸载

1. 退出 QQ；
2. 删除 `plugins/shadowdream`；
3. 如需清理配置，删除插件数据目录下的 `config.json`；
4. 重启 QQ。

## 安全与合规

- 插件运行在 QQ 进程内，拥有和 QQ 相同的权限；只从可信来源安装。
- 不要把带 token 的配置发给别人。
- 默认监听 `127.0.0.1`，公网部署前请设置 token + 防火墙 / 反向代理。
- 本项目不提供 QQ 登录协议破解，不绕过风控；请遵守 QQ 用户协议和当地法律。
