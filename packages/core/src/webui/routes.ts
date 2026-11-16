import type { IncomingMessage, ServerResponse } from 'node:http';
import { toActionError } from '../errors.js';
import { checkToken, extractToken } from '../transport/auth.js';
import { readJson, sendJson, sendText } from '../transport/http-util.js';
import {
  clearWebUiSession,
  hasWebUiSession,
  issueWebUiSession,
  recordWebUiLoginFailure,
  resetWebUiLoginFailures,
  webUiLoginRateLimited,
} from './auth.js';
import { WEBUI_CSS, WEBUI_HTML, WEBUI_JS } from './page.js';
import type { WebUiHost } from './types.js';

function page(): string {
  return WEBUI_HTML
    .replace('__CSS__', () => WEBUI_CSS)
    .replace('__JS__', () => WEBUI_JS);
}

const LOGIN_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Shadow Dream · WebUI 登录</title>
<style>
  :root {
    color-scheme: light;
    --bg: #fdfbff; --text: #211a33; --text-2: #4c4466; --muted: #7b7394;
    --line: #efe9fa; --line-strong: #e2d8f5; --accent: #6a4bf5;
    --gradient: linear-gradient(118deg, #7a5cff 0%, #b06bff 42%, #ff7ab6 100%);
    --shadow: 0 32px 80px rgba(60, 40, 120, 0.16);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background:
      radial-gradient(900px 520px at 88% -8%, rgba(255, 122, 182, 0.14), transparent 62%),
      radial-gradient(760px 480px at 4% 0%, rgba(122, 92, 255, 0.14), transparent 60%),
      var(--bg);
    color: var(--text);
    font-family: "Inter", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .box {
    width: min(400px, 100%); padding: 26px;
    background: linear-gradient(170deg, #ffffff, #fbf7ff);
    border: 1px solid var(--line-strong); border-radius: 24px;
    box-shadow: var(--shadow);
  }
  .brand { display: flex; align-items: center; gap: 11px; margin-bottom: 20px; }
  .logo {
    width: 38px; height: 38px; border-radius: 12px; position: relative; flex: none;
    background: var(--gradient);
    box-shadow: 0 10px 24px rgba(122, 92, 255, 0.3);
  }
  .logo::after {
    content: ""; position: absolute; inset: 9px; border-radius: 50%; background: #fff; opacity: 0.96;
    -webkit-mask: radial-gradient(circle at 64% 36%, transparent 40%, #000 43%);
    mask: radial-gradient(circle at 64% 36%, transparent 40%, #000 43%);
  }
  .brand b { font-size: 13px; letter-spacing: 0.1em; font-weight: 800; color: var(--text); }
  .brand span { color: var(--muted); font-size: 11px; display: block; letter-spacing: 0.04em; margin-top: 2px; }
  h1 { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 6px; }
  p { color: var(--muted); font-size: 12.5px; line-height: 1.7; margin: 0 0 18px; }
  label { display: block; font-size: 11.5px; color: var(--muted); font-weight: 600; margin: 0 0 6px; }
  input {
    width: 100%; padding: 11px 13px; border: 1px solid var(--line-strong); border-radius: 12px;
    background: #fdfbff; color: var(--text); outline: none;
    font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 13px;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }
  input:focus { border-color: rgba(122, 92, 255, 0.5); box-shadow: 0 0 0 4px rgba(122, 92, 255, 0.1); }
  button {
    width: 100%; margin-top: 14px; border: 0; border-radius: 999px; padding: 12px;
    background: var(--gradient); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer;
    box-shadow: 0 14px 30px -12px rgba(122, 92, 255, 0.7);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
  }
  button:hover { transform: translateY(-1px); box-shadow: 0 18px 34px -12px rgba(122, 92, 255, 0.8); }
  button:disabled { opacity: 0.55; cursor: wait; transform: none; box-shadow: none; }
  .msg { min-height: 18px; margin-top: 10px; font-size: 12px; color: #d8446f; line-height: 1.6; }
  .foot {
    margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line);
    font-size: 10.5px; color: var(--muted); text-align: center; letter-spacing: 0.04em;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --bg: #0d0a17; --text: #f6f1ff; --text-2: #cfc6e6; --muted: #948cab;
      --line: #2a2242; --line-strong: #372d55; --accent: #b9a3ff;
      --gradient: linear-gradient(118deg, #9a7bff 0%, #c58bff 42%, #ff92c4 100%);
      --shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    }
    body {
      background:
        radial-gradient(900px 520px at 88% -8%, rgba(255, 122, 182, 0.16), transparent 62%),
        radial-gradient(760px 480px at 4% 0%, rgba(122, 92, 255, 0.18), transparent 60%),
        var(--bg);
    }
    .box { background: linear-gradient(170deg, #191228, #140f22); }
    input, .pw-form input { background: #140f22; color: var(--text); }
    .tabs { background: #140f22; }
    .tab.active { background: #1f1734; color: var(--accent); }
    .qr-refresh, .quick-card { background: #171128; }
    .quick-avatar { background: rgba(154, 123, 255, 0.16); }
    .foot { border-color: var(--line); }
  }
</style>
</head>
<body>
<div class="box">
  <div class="brand"><div class="logo"></div><div><b>SHADOW DREAM</b><span>影梦 · WebUI 登录</span></div></div>
  <h1>输入访问 token</h1>
  <p>这个控制台已开启 token 登录。token 由服务端配置生成，不会显示在页面上。</p>
  <form id="form">
    <label for="token">WebUI token</label>
    <input id="token" type="password" autocomplete="current-password" placeholder="20 位 token" autofocus />
    <button id="submit" type="submit">进入控制台</button>
    <div class="msg" id="msg"></div>
  </form>
  <div class="foot">Shadow Dream · 影梦 · OneBot 11</div>
</div>
<script>
(function () {
  var form = document.getElementById('form');
  var input = document.getElementById('token');
  var button = document.getElementById('submit');
  var msg = document.getElementById('msg');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var token = input.value.trim();
    if (!token) { msg.textContent = '请输入 token'; return; }
    button.disabled = true;
    msg.textContent = '';
    try {
      var res = await fetch('/webui/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
      var data = await res.json();
      if (res.ok && data.ok) {
        location.replace('/webui/');
        return;
      }
      msg.textContent = data.message || 'token 不正确';
    } catch (error) {
      msg.textContent = '登录请求失败：' + (error.message || error);
    } finally {
      button.disabled = false;
    }
  });
})();
</script>
</body>
</html>`;

/**
 * 处理 /webui 下的请求。返回 true 表示已经接管响应。
 */
export async function handleWebUi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  host: WebUiHost,
  accessToken: string,
): Promise<boolean> {
  const path = url.pathname;
  const authRequired = Boolean(accessToken);

  if (path === '/webui' || path === '/webui/' || path === '/webui/login') {
    if (authRequired && !hasWebUiSession(req, accessToken)) {
      sendText(res, 200, LOGIN_PAGE, 'text/html; charset=utf-8');
    } else {
      sendText(res, 200, page(), 'text/html; charset=utf-8');
    }
    return true;
  }

  if (!path.startsWith('/webui/api/')) return false;

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  if (path === '/webui/api/session' && req.method === 'GET') {
    sendJson(res, 200, { authenticated: !authRequired || hasWebUiSession(req, accessToken), authRequired });
    return true;
  }

  if (path === '/webui/api/login' && req.method === 'POST') {
    if (webUiLoginRateLimited(req)) {
      sendJson(res, 429, {
        ok: false,
        status: 'failed',
        retcode: 1429,
        message: '登录尝试过多，请一分钟后再试',
      });
      return true;
    }
    try {
      const body = await readJson(req);
      const token = isRecord(body) && typeof body.token === 'string' ? body.token.trim() : '';
      if (!authRequired) {
        sendJson(res, 200, { ok: true, status: 'ok', retcode: 0 });
        return true;
      }
      if (!checkToken(accessToken, token)) {
        recordWebUiLoginFailure(req);
        sendJson(res, 401, {
          ok: false,
          status: 'failed',
          retcode: 104,
          message: 'token 不正确',
        });
        return true;
      }
      issueWebUiSession(req, res, accessToken);
      resetWebUiLoginFailures(req);
      sendJson(res, 200, { ok: true, status: 'ok', retcode: 0 });
    } catch {
      sendJson(res, 400, { ok: false, status: 'failed', retcode: 100, message: '登录参数错误' });
    }
    return true;
  }

  if (path === '/webui/api/logout' && req.method === 'POST') {
    clearWebUiSession(req, res);
    sendJson(res, 200, { ok: true, status: 'ok', retcode: 0 });
    return true;
  }

  if (authRequired && !hasWebUiSession(req, accessToken) && !checkToken(accessToken, extractToken(req, url))) {
    sendJson(res, 401, {
      status: 'failed',
      retcode: 104,
      data: null,
      message: '请先登录 WebUI',
      wording: '鉴权失败',
    });
    return true;
  }

  try {
    if (path === '/webui/api/overview' && req.method === 'GET') {
      sendJson(res, 200, host.getOverview());
      return true;
    }

    if (path === '/webui/api/update/check' && req.method === 'GET') {
      const result = await host.checkUpdate();
      sendJson(res, 200, { status: 'ok', retcode: 0, data: result });
      return true;
    }

    if (path === '/webui/api/update/apply' && req.method === 'POST') {
      const result = await host.applyUpdate();
      sendJson(res, 200, { status: 'ok', retcode: 0, data: result });
      return true;
    }

    if (path === '/webui/api/config' && req.method === 'GET') {
      sendJson(res, 200, {
        config: host.getConfig(),
        path: host.getConfigPath(),
      });
      return true;
    }

    if (path === '/webui/api/config' && req.method === 'POST') {
      const body = await readJson(req);
      if (!isRecord(body)) {
        sendJson(res, 400, { status: 'failed', retcode: 100, data: null, message: '参数错误' });
        return true;
      }
      const config = isRecord(body.config) ? body.config : body;
      const result = await host.applyConfig(config, { persist: body.persist !== false });
      sendJson(res, 200, { status: 'ok', retcode: 0, data: result });
      return true;
    }

    if (path === '/webui/api/reload' && req.method === 'POST') {
      const result = await host.reloadConfig();
      sendJson(res, 200, { status: 'ok', retcode: 0, data: result });
      return true;
    }

    if (path === '/webui/api/restart' && req.method === 'POST') {
      await host.restartTransports();
      sendJson(res, 200, { status: 'ok', retcode: 0, data: null });
      return true;
    }

    if (path === '/webui/api/logs' && req.method === 'GET') {
      const since = Number(url.searchParams.get('since') ?? 0) || 0;
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? 150) || 150));
      sendJson(res, 200, { entries: host.getLogs(since, limit) });
      return true;
    }

    if (path === '/webui/api/action' && req.method === 'POST') {
      const body = await readJson(req);
      if (!isRecord(body) || typeof body.action !== 'string' || !body.action) {
        sendJson(res, 400, { status: 'failed', retcode: 100, data: null, message: 'action 不能为空' });
        return true;
      }
      const params = isRecord(body.params) ? body.params : {};
      const result = await host.execute(body.action, params, { source: 'webui' });
      sendJson(res, 200, result);
      return true;
    }

    if (path === '/webui/api/simulate' && req.method === 'POST') {
      if (!host.hasSimulator()) {
        sendJson(res, 400, {
          status: 'failed',
          retcode: 1401,
          data: null,
          message: '当前后端没有模拟器',
        });
        return true;
      }
      const body = await readJson(req);
      if (!isRecord(body)) {
        sendJson(res, 400, { status: 'failed', retcode: 100, data: null, message: '参数错误' });
        return true;
      }
      const result = await host.simulate({
        message_type: body.message_type === 'group' ? 'group' : 'private',
        user_id: Number(body.user_id) || 0,
        group_id: body.group_id === undefined ? undefined : Number(body.group_id),
        message: (body.message as string | undefined) ?? '',
        nickname: typeof body.nickname === 'string' ? body.nickname : undefined,
      });
      sendJson(res, 200, { status: 'ok', retcode: 0, data: result });
      return true;
    }

    sendJson(res, 404, { status: 'failed', retcode: 1404, data: null, message: '接口不存在' });
    return true;
  } catch (error) {
    const actionError = toActionError(error);
    sendJson(res, actionError.retcode === 100 ? 400 : 500, {
      status: 'failed',
      retcode: actionError.retcode,
      data: null,
      message: actionError.message,
      ...(actionError.wording ? { wording: actionError.wording } : {}),
    });
    return true;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
