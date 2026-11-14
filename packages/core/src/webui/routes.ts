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
  :root { color-scheme: dark; --bg:#070b14; --panel:#0e1626; --line:#1e2a42; --text:#e5edf8; --muted:#8ea0bb; --accent:#38bdf8; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:radial-gradient(900px 500px at 70% 0%, #11213a 0, var(--bg) 60%); color:var(--text); font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif; }
  .box { width:min(380px, calc(100vw - 32px)); background:rgba(14,22,38,.92); border:1px solid var(--line); border-radius:18px; padding:26px; box-shadow:0 30px 80px rgba(0,0,0,.45); }
  .brand { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
  .logo { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#38bdf8,#6366f1); display:grid; place-items:center; color:#06121f; font-weight:900; }
  .brand b { font-size:14px; letter-spacing:.16em; }
  .brand span { color:var(--muted); font-size:11px; display:block; letter-spacing:.06em; }
  h1 { font-size:18px; margin:0 0 6px; }
  p { color:var(--muted); font-size:12px; line-height:1.7; margin:0 0 16px; }
  label { display:block; font-size:12px; color:var(--muted); margin:0 0 6px; }
  input { width:100%; padding:11px 12px; border:1px solid var(--line); border-radius:9px; background:#0a1220; color:var(--text); outline:none; font-family:ui-monospace,Consolas,monospace; }
  input:focus { border-color:var(--accent); }
  button { width:100%; margin-top:12px; border:0; border-radius:9px; padding:11px; background:linear-gradient(135deg,#38bdf8,#6366f1); color:#06121f; font-weight:700; cursor:pointer; }
  button:disabled { opacity:.6; cursor:wait; }
  .msg { min-height:18px; margin-top:10px; font-size:12px; color:#f87171; line-height:1.6; }
  .foot { margin-top:18px; font-size:10px; color:#4b5b73; text-align:center; }
</style>
</head>
<body>
<div class="box">
  <div class="brand"><div class="logo">梦</div><div><b>SHADOW DREAM</b><span>影梦 · WebUI 登录</span></div></div>
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
