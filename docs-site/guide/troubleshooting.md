# 常见问题

## 一键安装时精简包 404 / 下载失败

精简包由 GitHub Actions 在每次 `main` 更新后自动发布到 `install-latest` Release。刚推送时可能还没生成，脚本会自动回退到完整源码包；也可以手动指定完整源码包：

```bash
curl -fsSL https://raw.githubusercontent.com/derammeng/Shadow-Dream/main/scripts/bootstrap.sh \
  | bash -s -- --source full
```

Windows 是在一键命令后加 `-Source full`。私有仓库需要加 `--github-token`（Windows `-GithubToken`）。如果 GitHub 本身访问不稳定，可以用 `--bundle-url` / `--archive-url` 指向镜像或自建地址。

## 一键更新显示“已经是最新版本”

- 更新检查读的是 GitHub Release `install-latest` 里的 `install-bundle.json`，不是 `main` 分支最新提交；刚推送后要等 GitHub Actions 完成发布；
- 确认当前目录的 `install-bundle.json` 存在；没有时会显示本地版本未知；
- 想强制重装可以运行 `bash scripts/update-shadowdream.sh --force`，但会重新构建并重启 QQ。

## 修改监听地址后仍显示 127.0.0.1

- 启动横幅只在进程启动时打印，改完 `http.host` 要重启进程才会刷新；
- 如果在 WebUI 里保存，传输层会自动重启，日志会打印新的监听地址；
- `http.host` 填 `0.0.0.0` / `::` 时，日志和概览页会显示自动识别的局域网 IPv4；
- 有多张网卡时，直接填具体的局域网 IP 最稳。

## 3000 端口能监听，但浏览器超时

先区分「窗口打不开」和「QQ 主线程卡住」：

```bash
ss -lntp | grep 3000
curl -v http://127.0.0.1:3000/health
```

- 端口没监听：检查 QQ / 插件是否启动；
- 端口监听但 curl 超时：QQ 主线程可能卡在登录服务初始化，查看 QQ 日志；
- 只有 Windows 浏览器超时：检查 WSL 的 localhost 转发，或直接用 WSL 内 `curl` 确认。

如果日志停在「登录页已启动」，之后没有 `wrapper.node` 捕获记录，通常不是 WebUI 代码问题，先重启 QQ / WSL，确认只启动一个实例。

## WebUI 一直要求 token

- 确认输入的是 `http.webuiToken`，不是 `http.accessToken`；
- 如果只设置了 `accessToken`，WebUI 会沿用它；
- token 改过之后旧 session 会失效，刷新页面重新登录；
- 右上角「退出」会清 session。

## 登录页显示 token 登录，但没有 QQ 二维码

token 登录成功后会回到 QQ 登录页。如果还是 token 页：

- 检查浏览器是否禁用了 cookie；
- 用 `curl -i` 看登录响应有没有 `Set-Cookie`；
- 反向代理是否改写了 `Path` / `Domain`。

## 插件没有加载

检查 LiteLoader 日志里的路径：

```text
LiteLoader.path.plugins
LiteLoader.path.data
```

插件目录应该是：

```text
<plugins>/shadowdream/manifest.json
<plugins>/shadowdream/main.js
<plugins>/shadowdream/login-page.html
```

如果 `manifest.json` 缺失或 `platform` 不含 `linux` / `win32`，LiteLoader 会跳过。

## WebSocket 连不上

- 确认 `wsServers[]` 里对应端点已启用；
- 确认 Koishi 的 `endpoint`、`path`、`token` 一致；
- Shadow Dream 概览页的 `wsClients` 是否大于 0；
- 反向代理是否转发了 `Upgrade` / `Connection` 头。

## 能收消息但不能发

检查 Koishi 的 `selfId` 是否等于真实 QQ 号。用 mock 的 `10001` 会导致发送账号不一致。

## 群列表是空的

QQNT 后端的群列表是懒加载的；刚登录时 `get_group_list` 可能返回空。直接向已知群号发送消息可以正常工作。

## 图片 / 语音 / 视频 / 文件发送失败

0.3 起四种媒体都能发，常见失败原因：

- `1401 无法识别的语音格式`：只支持 SILK / WAV / MP3，AMR、OGG 请先转码；
- `1401 当前插件缺少 mp3 解码组件`：插件包不完整，重新部署 `release/shadowdream` 整个目录；
- `100 读取媒体失败`：路径不对，或 `http(s)` 下载失败（超时 20 秒；图片 30MB / 语音 20MB / 视频与文件 100MB 上限）；
- 日志里出现 `QQNT 没有暴露富媒体缓存路径 API`：QQ 版本改了这个接口，媒体会退到临时目录，需要更新插件适配。
- 发送超时（60 秒）通常是网络慢或文件过大。

- `1401 不支持的视频格式`：目前只支持 MP4 / MOV，请先转码；
- 视频没有封面：确认 `Video/<年月>/Thumb/<videoMd5>_0.png` 已写入。

## QQ 启动后段错误

- 确认 AppImage 完整，重新解包一次；
- 清理旧的 Xvfb / QQ 进程，避免连接已死的显示；
- 检查 `/tmp/.X11-unix` 权限；
- 清空 Crashpad 锁文件后重试；
- 仍然段错误时，换一个干净的 LiteLoader profile 再测试。

## 日志在哪

- WebUI「日志」页；
- Linux 无头：启动 QQ 时的重定向文件；
- LiteLoader / QQ 自己的日志。

排故时优先看：

```text
wrapper.node 捕获
QQ 登录服务监听
登录页已启动
WS 端点已监听
```
