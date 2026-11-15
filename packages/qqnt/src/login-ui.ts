import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import {
  checkToken,
  clearWebUiSession,
  hasWebUiSession,
  httpUrl,
  issueWebUiSession,
  recordWebUiLoginFailure,
  resetWebUiLoginFailures,
  webUiLoginRateLimited,
} from '@shadowdream/core';

export interface LoginUiLogger {
  info(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
  error(message: string): void;
}

interface LoginUiOptions {
  host: string;
  port: number;
  logger: LoginUiLogger;
  /** 记住上次登录的 QQ，下次直接一键登录。 */
  accountFile?: string;
  /** WebUI 登录 token；为空则登录页不鉴权。 */
  webuiToken?: string;
}

const AUTH_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Shadow Dream · WebUI 登录</title>
<style>
  :root { color-scheme: dark; --bg:#070b14; --panel:#0e1626; --line:#1e2a42; --text:#e5edf8; --muted:#8ea0bb; --accent:#38bdf8; }
  * { box-sizing:border-box; }
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
    <button id="submit" type="submit">进入登录页</button>
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
  function waitForPanel(timeoutMs, fallback) {
    var started = Date.now();
    var timer = setInterval(async function () {
      try {
        var res = await fetch('/health', { cache: 'no-store' });
        var data = await res.json();
        if (data && data.app && data.app !== 'shadowdream-login') {
          clearInterval(timer);
          location.replace('/webui/');
          return;
        }
      } catch (error) {}
      if (Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        if (fallback) fallback();
      }
    }, 800);
  }
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
        msg.style.color = '#38bdf8';
        msg.textContent = '正在检查登录状态…';
        waitForPanel(6000, async function () {
          msg.textContent = '正在恢复上次登录…';
          try {
            var auto = await fetch('/webui/api/login/auto', { method: 'POST' });
            var result = await auto.json();
            if (auto.ok && result.ok) {
              msg.textContent = result.message || '正在恢复上次登录…';
              waitForPanel(30000, function () { location.replace('/webui/'); });
            } else {
              msg.textContent = result.message || '账号可能已下线，请扫码登录';
              waitForPanel(6000, function () { location.replace('/webui/'); });
            }
          } catch (error) {
            location.replace('/webui/');
          }
        });
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

interface LoginAccount {
  uin: string;
  uid?: string;
  nickName: string;
  faceUrl?: string;
  isQuickLogin?: boolean;
  isAutoLogin?: boolean;
}

interface QrState {
  phase: string;
  image: string;
  url: string;
  error: string;
  message: string;
  jumpUrl: string;
  mode: 'qrcode' | 'password';
  accounts: LoginAccount[];
}

let loginPageCache = '';

function loginPageHtml(): string {
  if (!loginPageCache) {
    loginPageCache = fs.readFileSync(path.join(__dirname, 'login-page.html'), 'utf8');
  }
  return loginPageCache;
}
export class LoginUi {
  private readonly options: LoginUiOptions;
  private server: http.Server | null = null;
  private state: QrState = {
    phase: 'starting',
    image: '',
    url: '',
    error: '',
    message: '',
    jumpUrl: '',
    mode: 'qrcode',
    accounts: [],
  };
  private loginService: any = null;
  private listener: any = null;
  private listenerId: number | null = null;

  constructor(options: LoginUiOptions) {
    this.options = options;
    if (options.accountFile) {
      try {
        const saved = JSON.parse(fs.readFileSync(options.accountFile, 'utf8')) as LoginAccount;
        if (saved?.uin) this.state.accounts = [saved];
      } catch {
        // 第一次启动没有账号文件
      }
    }
  }

  private saveAccount(uin: string, nickName = ''): void {
    if (!this.options.accountFile || !uin) return;
    try {
      const existing = this.state.accounts.find(item => item.uin === uin);
      const account: LoginAccount = {
        uin,
        nickName: nickName || existing?.nickName || '',
        isQuickLogin: true,
        isAutoLogin: true,
      };
      this.state.accounts = [account, ...this.state.accounts.filter(item => item.uin !== uin)];
      fs.mkdirSync(this.options.accountFile.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
      fs.writeFileSync(this.options.accountFile, JSON.stringify(account, null, 2), 'utf8');
    } catch (error) {
      this.options.logger.debug(`保存一键登录账号失败：${(error as Error).message}`);
    }
  }

  get url(): string {
    return `${httpUrl(this.options.host, this.options.port)}/webui/`;
  }

  async start(): Promise<boolean> {
    if (this.server) return true;
    const server = http.createServer((req, res) => this.handle(req, res));
    this.server = server;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(this.options.port, this.options.host, () => resolve());
      });
      const address = server.address() as AddressInfo | null;
      if (address && address.port && address.port !== this.options.port) {
        (this.options as { port: number }).port = address.port;
      }
      this.options.logger.info(`登录页已启动：${this.url}`);
      return true;
    } catch (error) {
      this.options.logger.warn(`登录页未启动（${(error as Error).message}）；可继续使用 QQ 客户端扫码。`);
      try { server.close(); } catch {}
      this.server = null;
      return false;
    }
  }

  attach(loginService: any): void {
    if (!loginService || this.loginService === loginService) return;
    this.loginService = loginService;
    const listener = {
      onLoginConnected: () => {
        this.state.phase = 'connected';
        this.options.logger.info('QQ 登录服务已连接，请求二维码');
        this.requestQr();
      },
      onQRCodeGetPicture: (arg: { pngBase64QrcodeData?: string; qrcodeUrl?: string }) => {
        if (this.state.phase === 'success') return;
        const raw = String(arg?.pngBase64QrcodeData ?? '');
        if (raw) {
          this.state.image = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
        }
        this.state.url = String(arg?.qrcodeUrl ?? '');
        this.state.phase = 'waiting';
        this.state.error = '';
        this.options.logger.info('已获取 QQ 登录二维码');
      },
      onQRCodeSessionUserScaned: () => {
        if (this.state.phase === 'success') return;
        this.state.phase = 'scanned';
        this.options.logger.info('二维码已被扫描，等待手机确认');
      },
      onQRCodeLoginSucceed: (result?: { uin?: string; nickName?: string }) => {
        this.state.phase = 'success';
        if (result?.uin) this.saveAccount(String(result.uin), String(result.nickName ?? ''));
        this.options.logger.info('QQ 扫码登录成功');
      },
      onQRCodeSessionFailed: (errType: number, errCode: number) => {
        if (this.state.phase === 'success') return;
        this.state.phase = 'expired';
        this.state.error = `二维码过期或登录失败（${errType}/${errCode}）`;
        setTimeout(() => this.requestQr(), 1500);
      },
      onLoginFailed: (...args: unknown[]) => {
        this.state.phase = 'error';
        this.state.error = JSON.stringify(args);
        this.options.logger.warn(`QQ 登录失败：${this.state.error}`);
      },
      onLoginDisConnected: () => {
        this.state.phase = 'starting';
      },
    };
    try {
      const id = loginService.addKernelLoginListener?.(listener);
      this.listenerId = typeof id === 'number' ? id : null;
      const connected = loginService.connect?.();
      this.options.logger.info(
        `QQ 登录服务监听已注册：id=${String(id)} connect=${String(connected)} msf=${String(loginService.getMsfStatus?.())}`,
      );
      // 不要在这里主动 getQRCodePicture：部分 Linux QQ 版本在登录服务
      // 未完全就绪时会阻塞主线程，导致登录页 HTTP 无响应。等 onLoginConnected。
    } catch (error) {
      this.options.logger.warn(`注册 QQ 登录监听失败：${(error as Error).message}`);
    }
    this.listener = listener;
  }

  private async loadAccounts(): Promise<void> {
    try {
      const result = await this.loginService?.getLoginList?.();
      const raw = result?.LocalLoginInfoList
        ?? result?.localLoginInfoList
        ?? (Array.isArray(result) ? result : []);
      const accounts: LoginAccount[] = [];
      for (const entry of Array.isArray(raw) ? raw : []) {
        const uin = String(entry?.uin ?? entry?.uinNumber ?? '').trim();
        if (!uin) continue;
        accounts.push({
          uin,
          uid: entry?.uid ? String(entry.uid) : undefined,
          nickName: String(entry?.nickName ?? entry?.nick ?? ''),
          faceUrl: typeof entry?.faceUrl === 'string' ? entry.faceUrl : undefined,
          isQuickLogin: Boolean(entry?.isQuickLogin),
          isAutoLogin: Boolean(entry?.isAutoLogin),
        });
      }
      this.state.accounts = accounts;
      if (accounts.length > 0) {
        this.options.logger.info(`一键登录账号：${accounts.map(item => `${item.uin}${item.nickName ? `(${item.nickName})` : ''}`).join(', ')}`);
      }
    } catch (error) {
      this.options.logger.debug(`读取一键登录账号失败：${(error as Error).message}`);
    }
  }

  private async loadAccountsWithRetry(): Promise<void> {
    for (let attempt = 0; attempt < 6; attempt++) {
      await this.loadAccounts();
      if (this.state.accounts.length > 0) return;
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  private async quickLogin(uinValue: unknown): Promise<{ ok: boolean; message?: string }> {
    const uin = String(uinValue ?? '').trim();
    if (!/^[0-9]{5,12}$/.test(uin)) return { ok: false, message: 'QQ 号格式不对' };
    if (!this.loginService?.quickLoginWithUin) {
      return { ok: false, message: '当前 QQ 登录服务不支持快速登录' };
    }
    try {
      const result = await this.loginService.quickLoginWithUin(uin);
      if (result?.result === '0' && !result?.loginErrorInfo?.errMsg) {
        this.state.phase = 'success';
        this.state.message = '一键登录成功';
        this.saveAccount(uin);
        this.options.logger.info(`一键登录成功：QQ ${uin}`);
        return { ok: true };
      }
      const message = String(result?.loginErrorInfo?.errMsg || `一键登录失败（${result?.result ?? 'unknown'}）`);
      this.state.phase = 'error';
      this.state.error = message;
      this.options.logger.warn(`一键登录失败：QQ ${uin} ${message}`);
      return { ok: false, message };
    } catch (error) {
      const message = (error as Error).message || '一键登录异常';
      this.state.phase = 'error';
      this.state.error = message;
      return { ok: false, message };
    }
  }

  private async autoLoginSaved(): Promise<{
    ok: boolean;
    pending?: boolean;
    uin?: string;
    message?: string;
  }> {
    if (this.state.phase === 'success') {
      return { ok: true, pending: true, message: '正在进入控制台…' };
    }
    if (this.state.accounts.length === 0) await this.loadAccounts();
    const account = this.state.accounts.find(item => item.isQuickLogin || item.isAutoLogin)
      ?? this.state.accounts[0];
    if (!account?.uin) {
      return { ok: false, message: '没有可恢复的登录账号，请扫码登录' };
    }
    if (!this.loginService) {
      return { ok: false, message: 'QQ 登录服务尚未连接，请稍后扫码' };
    }
    const result = await this.quickLogin(account.uin);
    if (!result.ok) {
      return { ok: false, message: result.message || '账号可能已下线，请扫码登录' };
    }
    return {
      ok: true,
      pending: true,
      uin: account.uin,
      message: `正在恢复 QQ ${account.uin} 的登录…`,
    };
  }

  private requestQr(): boolean {
    try {
      const accepted = this.loginService?.getQRCodePicture?.();
      this.options.logger.info(`请求 QQ 二维码：${String(accepted)}`);
      return Boolean(accepted);
    } catch (error) {
      this.options.logger.warn(`请求 QQ 二维码失败：${(error as Error).message}`);
      return false;
    }
  }

  private refreshQr(): { ok: boolean; message?: string } {
    if (!this.loginService) {
      return { ok: false, message: 'QQ 登录服务尚未连接' };
    }
    this.state.mode = 'qrcode';
    this.state.phase = 'refreshing';
    this.state.image = '';
    this.state.url = '';
    this.state.error = '';
    this.state.message = '';
    const accepted = this.requestQr();
    if (!accepted) {
      this.state.phase = 'error';
      this.state.error = 'QQ 没有接受刷新二维码请求';
      return { ok: false, message: this.state.error };
    }
    setTimeout(() => {
      if (this.state.phase === 'refreshing') {
        this.state.phase = 'error';
        this.state.error = 'QQ 没有返回新的二维码，请确认 QQ 登录服务已连接';
      }
    }, 5000);
    return { ok: true };
  }

  async stop(): Promise<void> {
    if (this.listenerId !== null && this.loginService?.removeKernelLoginListener) {
      try { this.loginService.removeKernelLoginListener(this.listenerId); } catch {}
    }
    this.listener = null;
    this.listenerId = null;
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>(resolve => {
      server.close(() => resolve());
      (server as http.Server & { closeAllConnections?: () => void }).closeAllConnections?.();
      setTimeout(resolve, 500).unref?.();
    });
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const authToken = this.options.webuiToken || '';
    const authRequired = Boolean(authToken);

    if (url.pathname === '/webui/api/login' && req.method === 'POST') {
      void this.handleWebUiLogin(req, res, authToken);
      return;
    }
    if (url.pathname === '/webui/api/logout' && req.method === 'POST') {
      clearWebUiSession(req, res);
      this.json(res, { ok: true });
      return;
    }
    if (url.pathname === '/webui/api/session') {
      this.json(res, {
        authenticated: !authRequired || hasWebUiSession(req, authToken),
        authRequired,
      });
      return;
    }
    if (authRequired && url.pathname.startsWith('/webui/api/') && !hasWebUiSession(req, authToken)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, message: '请先登录 WebUI' }));
      return;
    }
    if (url.pathname === '/webui/api/login/auto' && req.method === 'POST') {
      void this.handleAutoLogin(req, res);
      return;
    }
    if (url.pathname === '/health') {
      this.json(res, { status: 'ok', app: 'shadowdream-login' });
      return;
    }
    if (url.pathname === '/webui/api/login/status') {
      this.json(res, this.state);
      return;
    }
    if (url.pathname === '/webui/api/login/password' && req.method === 'POST') {
      void this.handlePasswordLogin(req, res);
      return;
    }
    if (url.pathname === '/webui/api/login/quick' && req.method === 'POST') {
      void this.handleQuickLogin(req, res);
      return;
    }
    if (url.pathname === '/webui/api/login/qr/refresh' && req.method === 'POST') {
      this.json(res, this.refreshQr());
      return;
    }
    if (url.pathname === '/webui' || url.pathname === '/webui/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(authRequired && !hasWebUiSession(req, authToken) ? AUTH_PAGE : loginPageHtml());
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }

  private async handleWebUiLogin(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    expectedToken: string,
  ): Promise<void> {
    if (!expectedToken) {
      this.json(res, { ok: true });
      return;
    }
    if (webUiLoginRateLimited(req)) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, message: '登录尝试过多，请一分钟后再试' }));
      return;
    }
    try {
      const body = await this.readJson(req);
      const token = typeof body?.token === 'string' ? body.token.trim() : '';
      if (!checkToken(expectedToken, token)) {
        recordWebUiLoginFailure(req);
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, message: 'token 不正确' }));
        return;
      }
      issueWebUiSession(req, res, expectedToken);
      resetWebUiLoginFailures(req);
      this.json(res, { ok: true });
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, message: '登录参数错误' }));
    }
  }

  private async handleAutoLogin(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      this.json(res, await this.autoLoginSaved());
    } catch (error) {
      this.json(res, { ok: false, message: (error as Error).message || '自动登录请求失败' });
    }
  }

  private async handleQuickLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readJson(req);
      this.json(res, await this.quickLogin(body?.uin));
    } catch (error) {
      this.json(res, { ok: false, message: (error as Error).message || '一键登录请求失败' });
    }
  }

  private async handlePasswordLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readJson(req);
      const uin = String(body?.uin ?? '').trim();
      const password = String(body?.password ?? '');
      if (!/^[0-9]{5,12}$/.test(uin) || !password) {
        this.json(res, { ok: false, message: 'QQ 号或密码为空' });
        return;
      }
      if (!this.loginService?.passwordLogin) {
        this.json(res, { ok: false, message: 'QQ 登录服务尚未连接，请稍后重试' });
        return;
      }

      this.state.mode = 'password';
      this.state.message = '正在密码登录…';
      this.state.error = '';
      this.state.jumpUrl = '';
      this.options.logger.info(`WebUI 密码登录：QQ ${uin}`);

      const passwordMd5 = createHash('md5').update(password, 'utf8').digest('hex');
      const result = await this.loginService.passwordLogin({
        uin,
        passwordMd5,
        step: 0,
        newDeviceLoginSig: new Uint8Array(),
        proofWaterSig: new Uint8Array(),
        proofWaterRand: new Uint8Array(),
        proofWaterSid: new Uint8Array(),
        unusualDeviceCheckSig: new Uint8Array(),
      });

      if (result?.result === '0') {
        this.state.phase = 'success';
        this.state.message = '登录成功';
        this.saveAccount(uin);
        this.json(res, { ok: true, message: '登录成功' });
        return;
      }

      const info = result?.loginErrorInfo ?? {};
      if (result?.result === '140022008') {
        this.state.phase = 'captcha';
        this.state.message = '需要验证码';
        this.state.jumpUrl = String(info.proofWaterUrl ?? '');
        this.json(res, {
          ok: false,
          message: '需要验证码，请打开验证页面完成验证后重试',
          needCaptcha: true,
          jumpUrl: this.state.jumpUrl,
        });
        return;
      }
      if (result?.result === '140022010' || result?.result === '140022011') {
        this.state.phase = 'new_device';
        this.state.message = '新设备需要扫码验证';
        this.state.jumpUrl = String(info.jumpUrl ?? '');
        this.json(res, {
          ok: false,
          message: '新设备需要扫码验证，请打开验证页面或使用扫码登录',
          needNewDevice: true,
          jumpUrl: this.state.jumpUrl,
        });
        return;
      }

      const message = String(info.errMsg || `密码登录失败（${result?.result ?? 'unknown'}）`);
      this.state.phase = 'error';
      this.state.error = message;
      this.options.logger.warn(`密码登录失败：QQ ${uin} ${message}`);
      this.json(res, { ok: false, message });
    } catch (error) {
      const message = (error as Error).message || '密码登录异常';
      this.state.phase = 'error';
      this.state.error = message;
      this.options.logger.warn(`密码登录异常：${message}`);
      this.json(res, { ok: false, message });
    }
  }

  private async readJson(req: http.IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 1024 * 1024) throw new Error('请求体过大');
      chunks.push(buffer);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : {};
  }

  private json(res: http.ServerResponse, value: unknown): void {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  }
}
