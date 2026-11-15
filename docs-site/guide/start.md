# 启动

## 一键启动

安装好 QQ、LiteLoaderQQNT 和 Shadow Dream 插件后：

**Windows**：双击 `start-shadowdream.bat`，或在该目录运行：

```powershell
start-shadowdream.bat
start-shadowdream.bat --wsl      # Shadow Dream 跑在 WSL 时
start-shadowdream.bat --windows  # 强制走 Windows QQ
```

它会自动找 QQ、启动 QQ、等 WebUI 就绪并打开浏览器。没检测到 Windows 插件时会自动尝试 WSL。

**Linux / WSL**：

```bash
bash start-shadowdream.sh
```

它会自动找 QQ、LiteLoader profile 和插件，启动 Xvfb + QQ，等 WebUI 就绪后打印地址和 token。`Ctrl+C` 停止。

只检查路径、不启动：

```powershell
start-shadowdream.bat --check
```

```bash
bash start-shadowdream.sh --check
```

第一次启动前需要安装 QQ、LiteLoaderQQNT 并部署插件，见 [安装](/guide/install) 和 [Linux 无头运行](/guide/headless)。

## 检查更新 / 一键更新

```bash
# 只检查，不修改
bash start-shadowdream.sh --check-update

# 更新源码、构建插件、部署，然后自动重启 Shadow Dream + QQNT
bash start-shadowdream.sh --update
```

Windows：

```bat
start-shadowdream.bat --check-update
start-shadowdream.bat --update
```

更新会保留 `config/shadowdream.json` 和插件 `data/` 里的配置/token，只替换源码、依赖和插件文件。旧插件会备份到 profile 下的 `shadowdream-backups/`。

Windows 的一键更新通过 Linux 侧脚本执行；原生 Windows 安装需要重新运行安装脚本更新插件。

更新源是 GitHub Release 的 `install-latest`。刚推送代码时要等 GitHub Actions 发布新清单；否则会显示“已经是最新版本”。

也可以打开 WebUI 侧边栏的「更新」页，点「检查更新」→「下载并安装」，效果和 `--update` 一样。

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
5. 登录过 QQ 时会自动恢复账号并直接进入控制台；账号下线时才需要手机 QQ 扫码或一键登录；
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
