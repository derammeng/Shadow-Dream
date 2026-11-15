import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_CONFIG,
  ShadowDreamBot,
  createLogger,
  ensureConfig,
  type ShadowDreamConfig,
} from '@shadowdream/core';
import { installSessionCapture, installWrapperHook, isSessionReady, wrapWrapperForSession } from './capture.js';
import { QqntBackend } from './backend.js';
import { LoginUi } from './login-ui.js';

const logger = createLogger('Shadow Dream:qqnt', 'info');

let wrapper: any = null;
let session: any = null;
let loginUidHint = '';
let bot: ShadowDreamBot | null = null;
let backend: QqntBackend | null = null;
let loginUi: LoginUi | null = null;
let loginUiPromise: Promise<void> | null = null;
let loginServiceRef: any = null;
let starting = false;
let started = false;

/**
 * LiteLoaderQQNT 的 main 入口。
 *
 * 插件不修改 QQ 的 wrapper.node，也不接触登录密钥；它只捕获 QQ 已经加载
 * 好的 wrapper，复用 QQ 自己的 session，把事件翻译成 OneBot 11。
 */
export function onBrowserWindowCreated(_window: unknown): void {
  // Shadow Dream 不依赖任何窗口，保留这个 hook 让 LiteLoader 的加载流程完整。
}

/** LiteLoader 在用户登录后回调，uid 是 NTQQ 的 uid。 */
export function onLogin(uid: string): void {
  if (uid) loginUidHint = uid;
  logger.info(`QQ 登录事件：${uid || '(unknown)'}`);
  void tryStart();
}

function acceptSession(capturedSession: any): void {
  if (session) return;
  if (!isSessionReady(capturedSession)) {
    logger.debug('QQNT session 尚未就绪（消息服务没有 sendMsg），继续等待');
    return;
  }
  session = capturedSession;
  logger.info('Shadow Dream 已捕获 QQNT session（消息服务就绪）');
  void tryStart();
}

function installHooks(): void {
  installWrapperHook(captured => {
    if (wrapper) return wrapper;
    const wrapped = wrapWrapperForSession(captured, acceptSession);
    wrapper = wrapped;
    logger.info('Shadow Dream 已接入 QQNT wrapper');
    // 登录前就可以从 wrapper 拿到 QQ 的登录服务，用于把二维码转发到 WebUI。
    try {
      const service = captured.NodeIKernelLoginService?.get?.();
      if (service) {
        loginServiceRef = service;
        loginUi?.attach(service);
      }
    } catch (error) {
      logger.debug(`读取 QQ 登录服务失败：${(error as Error).message}`);
    }
    // 双保险：即使 QQ 在拿到代理之前已经缓存了 session 类，轮询仍能捕获。
    installSessionCapture(captured, acceptSession, logger);
    void tryStart();
    return wrapped;
  }, logger);

  // 60 秒后仍没有 wrapper，给出可操作的日志，而不是静默失败。
  setTimeout(() => {
    if (!wrapper) {
      logger.error('60 秒内没有捕获到 wrapper.node。请确认 LiteLoaderQQNT 已正确安装，且 QQ 版本受支持。');
    }
  }, 60_000).unref?.();
}

async function tryStart(): Promise<void> {
  if (started || starting) return;
  if (!wrapper || !session) return;
  starting = true;
  try {
    const self = await resolveSelf(wrapper, session);
    if (!self) return;

    const config = loadPluginConfig();
    logger.setLevel(config.logLevel);

    // 登录页只用于未登录阶段；登录成功后立即让出端口给完整 WebUI。
    await loginUiPromise;
    await loginUi?.stop();
    loginUi = null;
    const wsTokens = (config.wsServers ?? [config.ws]).some(item => item.accessToken);
    if (!config.http.accessToken && !wsTokens) {
      logger.warn(`未设置 access token。配置文件：${configPath()}。仅建议本机使用。`);
    }

    backend = new QqntBackend({
      session,
      wrapper,
      selfId: self.uin,
      selfUid: self.uid,
      selfNick: self.nick,
      logger,
    });
    bot = new ShadowDreamBot({
      config,
      backend,
      logger,
      appName: 'shadowdream',
      appVersion: '0.2.0',
      configPath: configPath(),
    });
    await bot.start();
    started = true;

    const overview = bot.getOverview();
    logger.info('==============================================');
    logger.info(`Shadow Dream 已启动：QQ ${self.uin} ${self.nick}`);
    logger.info(`HTTP API  ${overview.transports.http}`);
    logger.info(`WebSocket ${overview.transports.ws}`);
    logger.info(`WebUI     ${overview.transports.webui}`);
    logger.info(`配置      ${configPath()}`);
    logger.info('==============================================');

    // 方便在 QQ 的 DevTools / 日志里排查。
    (globalThis as any).__shadowdream = { bot, backend, session, wrapper };
  } catch (error) {
    logger.error(`启动 Shadow Dream 失败：${(error as Error).stack ?? error}`);
    try {
      await backend?.stop();
    } catch {
      // ignore
    }
    backend = null;
    bot = null;
    started = false;
  } finally {
    starting = false;
  }
}

interface SelfIdentity {
  uin: number;
  uid: string;
  nick: string;
}

async function resolveSelf(
  wrapperValue: any,
  sessionValue: any,
): Promise<SelfIdentity | null> {
  const loginService = wrapperValue.NodeIKernelLoginService?.get?.();
  const profileService = sessionValue.getProfileService?.();

  // 优先使用 onLogin 提供的 uid，能绕过登录列表尚未刷新的时间差。
  if (loginUidHint) {
    try {
      const map = await profileService?.getCoreAndBaseInfo?.('0', [loginUidHint]);
      const profile = map instanceof Map ? map.get(loginUidHint) : undefined;
      const uin = Number(profile?.uin ?? profile?.uinNumber ?? 0);
      if (uin) {
        return {
          uin,
          uid: loginUidHint,
          nick: String(profile?.nick ?? profile?.nickname ?? ''),
        };
      }
    } catch {
      // 登录列表兜底
    }
  }

  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const list = await loginService?.getLoginList?.();
      const entries = normalizeLoginList(list);
      const entry = entries.find((item: any) => item.isQuickLogin) ?? entries[entries.length - 1];
      const uin = Number(entry?.uin ?? entry?.uinNumber ?? 0);
      if (uin > 0) {
        let uid = String(entry?.uid ?? '');
        if (!uid) {
          try {
            const map = await profileService?.getUidByUin?.('0', [String(uin)]);
            if (map instanceof Map) uid = String(map.get(String(uin)) ?? map.get(uin) ?? '');
          } catch {
            // uid 可以为空，消息里的 senderUid 仍能补全映射。
          }
        }
        return {
          uin,
          uid,
          nick: String(entry?.nickName ?? entry?.nick ?? ''),
        };
      }
    } catch (error) {
      logger.debug(`读取登录列表失败：${(error as Error).message}`);
    }
    await sleep(1000);
  }
  logger.error('已捕获 session，但 90 秒内没有拿到登录 QQ 号。请在 QQ 登录完成后重启插件或 QQ。');
  return null;
}

function normalizeLoginList(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.LocalLoginInfoList)) return value.LocalLoginInfoList;
  if (Array.isArray(value.localLoginInfoList)) return value.localLoginInfoList;
  return [];
}

function pluginDataDir(): string {
  const liteLoader = (globalThis as any).LiteLoader;
  const data = liteLoader?.plugins?.['shadowdream']?.path?.data;
  if (typeof data === 'string' && data) return data;
  const base = process.env.APPDATA
    || (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.config'));
  return path.join(base, 'Shadow Dream');
}

function configPath(): string {
  return path.join(pluginDataDir(), 'config.json');
}

function loadPluginConfig(): ShadowDreamConfig {
  const dir = pluginDataDir();
  fs.mkdirSync(dir, { recursive: true });

  const defaults = structuredClone(DEFAULT_CONFIG);
  defaults.backend = { type: 'qqnt' };
  defaults.http.host = '127.0.0.1';
  defaults.http.port = 3000;
  defaults.http.webui = true;
  defaults.ws.host = '127.0.0.1';
  defaults.ws.port = 3001;
  defaults.logLevel = 'info';

  const config = ensureConfig({
    file: configPath(),
    defaults,
    allowMissing: true,
  });
  config.backend = { type: 'qqnt' };
  return config;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

installHooks();

async function startLoginUi(): Promise<void> {
  try {
    const qwqnt = (globalThis as any).qwqnt;
    logger.info(`qwqnt=${Boolean(qwqnt)} keys=${qwqnt ? Object.keys(qwqnt).join(',') : ''}`);
    if (qwqnt?.framework) logger.info(`qwqnt.framework keys=${Object.keys(qwqnt.framework).join(',')}`);
    const config = loadPluginConfig();
    if (!config.http.enabled || !config.http.webui) return;
    loginUi = new LoginUi({
      host: config.http.host,
      port: config.http.port,
      logger,
      accountFile: path.join(pluginDataDir(), 'account.json'),
      webuiToken: config.http.webuiToken || config.http.accessToken,
    });
    const startedUi = await loginUi.start();
    if (!startedUi) {
      loginUi = null;
      return;
    }
    if (loginServiceRef) loginUi.attach(loginServiceRef);
  } catch (error) {
    logger.warn(`登录页初始化失败：${(error as Error).message}`);
    loginUi = null;
  }
}

// 不要在插件模块加载的第一时间抢 3000 端口：部分 Linux QQ 版本会在
// app_launcher 还没跑完时卡住。等 QQ 主流程稳定后再启动登录页。
loginUiPromise = startLoginUi();

// 兼容个别 LiteLoader 版本以 ESM 方式加载：把生命周期函数挂到模块导出上。
export default {
  onBrowserWindowCreated,
  onLogin,
};

