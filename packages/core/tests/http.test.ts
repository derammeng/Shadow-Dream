import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, type ShadowDreamConfig } from '../src/config/schema.js';
import { ShadowDreamBot } from '../src/bot.js';
import { createLogger } from '../src/util/logger.js';
import { FakeBackend } from './fake-backend.js';

async function readJson(response: Response): Promise<any> {
  return (await response.json()) as any;
}

function config(overrides: Partial<ShadowDreamConfig> = {}): ShadowDreamConfig {
  const value = structuredClone(DEFAULT_CONFIG);
  value.http.host = '127.0.0.1';
  value.http.port = 0;
  value.http.webui = true;
  value.ws.enabled = false;
  value.heartbeat.enabled = false;
  value.logLevel = 'error';
  return { ...value, ...overrides };
}

async function start(
  overrides: Partial<ShadowDreamConfig> = {},
  options: { configPath?: string } = {},
) {
  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({
    config: config(overrides),
    backend,
    logger: createLogger('test', 'error'),
    configPath: options.configPath,
    watchConfig: false,
  });
  await bot.start();
  const url = bot.getOverview().transports.http;
  assert.notEqual(url, '未启用');
  return { bot, backend, url };
}

test('HTTP get_status / get_version_info', async () => {
  const { bot, url } = await start();
  try {
    const status = await readJson(await fetch(`${url}/get_status`));
    assert.equal(status.status, 'ok');
    assert.equal(status.retcode, 0);
    assert.equal(status.data.online, true);

    const version = await readJson(await fetch(`${url}/get_version_info`));
    assert.equal(version.data.protocol_version, 'v11');
    assert.equal(version.data.app_name, 'shadowdream');
  } finally {
    await bot.stop();
  }
});

test('HTTP send_group_msg 与 echo', async () => {
  const { bot, url } = await start();
  try {
    const response = await fetch(`${url}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_group_msg',
        params: {
          group_id: 30001,
          message: [
            { type: 'text', data: { text: '你好，世界 🌏' } },
            { type: 'at', data: { qq: '20001' } },
          ],
        },
        echo: 'echo-1',
      }),
    });
    const body = await readJson(response);
    assert.equal(body.status, 'ok');
    assert.equal(body.echo, 'echo-1');
    assert.equal(typeof body.data.message_id, 'number');

    const message = await readJson(await fetch(`${url}/get_msg?message_id=${body.data.message_id}`));
    assert.equal(message.data.message[0].data.text, '你好，世界 🌏');
    assert.equal(message.data.group_id, 30001);
  } finally {
    await bot.stop();
  }
});

test('HTTP GET 查询参数可以调用 API', async () => {
  const { bot, url } = await start();
  try {
    const sent = await readJson(await fetch(
      `${url}/send_private_msg?user_id=20001&message=${encodeURIComponent('GET 测试')}`,
    ));
    assert.equal(sent.retcode, 0);
    assert.equal(typeof sent.data.message_id, 'number');

    const group = await readJson(await fetch(`${url}/get_group_info?group_id=30001`));
    assert.equal(group.retcode, 0);
    assert.equal(group.data.group_id, 30001);
  } finally {
    await bot.stop();
  }
});

test('HTTP 参数错误与未知 action', async () => {
  const { bot, url } = await start();
  try {
    const missing = await readJson(await fetch(`${url}/send_group_msg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: 30001 }),
    }));
    assert.equal(missing.retcode, 100);

    const unknown = await readJson(await fetch(`${url}/not_an_action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'not_an_action', params: {} }),
    }));
    assert.equal(unknown.retcode, 1401);
  } finally {
    await bot.stop();
  }
});

test('HTTP access token 校验', async () => {
  const base = config();
  base.http.accessToken = 'top-secret';
  const { bot, url } = await start(base);
  try {
    const denied = await fetch(`${url}/get_status`);
    assert.equal(denied.status, 401);
    assert.equal((await readJson(denied)).retcode, 104);

    const allowed = await fetch(`${url}/get_status`, {
      headers: { Authorization: 'Bearer top-secret' },
    });
    assert.equal((await readJson(allowed)).status, 'ok');
  } finally {
    await bot.stop();
  }
});

test('CORS 预检与 WebUI 页面', async () => {
  const { bot, url } = await start();
  try {
    const options = await fetch(`${url}/get_status`, { method: 'OPTIONS' });
    assert.equal(options.status, 204);
    assert.equal(options.headers.get('access-control-allow-origin'), '*');

    const page = await fetch(`${url}/webui/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /SHADOW DREAM/);
    assert.match(html, /OneBot 11/);
    assert.match(html, /\/webui\/api\/overview/);

    const overview = await readJson(await fetch(`${url}/webui/api/overview`));
    assert.equal(overview.backend.selfId, 10001);
    assert.equal(overview.simulator, true);
  } finally {
    await bot.stop();
  }
});

test('WebUI token 登录与 session', async () => {
  const value = config();
  value.http.webuiToken = '0123456789abcdefghij';
  const { bot, url } = await start(value);
  try {
    const loginPage = await fetch(`${url}/webui/`);
    assert.equal(loginPage.status, 200);
    const loginHtml = await loginPage.text();
    assert.match(loginHtml, /webui\/api\/login/);
    assert.doesNotMatch(loginHtml, /webui\/api\/overview/);

    const unauthorized = await fetch(`${url}/webui/api/overview`);
    assert.equal(unauthorized.status, 401);

    const wrong = await fetch(`${url}/webui/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong' }),
    });
    assert.equal(wrong.status, 401);

    const login = await fetch(`${url}/webui/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: value.http.webuiToken }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
    assert.match(cookie, /shadowdream_webui=/);

    const authed = await fetch(`${url}/webui/api/overview`, { headers: { cookie } });
    assert.equal(authed.status, 200);
    assert.equal((await readJson(authed)).backend.selfId, 10001);

    const logout = await fetch(`${url}/webui/api/logout`, { method: 'POST', headers: { cookie } });
    assert.equal(logout.status, 200);
    const afterLogout = await fetch(`${url}/webui/api/overview`, { headers: { cookie } });
    assert.equal(afterLogout.status, 401);
  } finally {
    await bot.stop();
  }
});

test('WebUI 模拟器注入消息后可通过 get_msg 读回', async () => {
  const { bot, url } = await start();
  try {
    const simulated = await readJson(await fetch(`${url}/webui/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_type: 'private',
        user_id: 20001,
        message: '来自控制台的私聊',
      }),
    }));
    assert.equal(simulated.status, 'ok');
    assert.equal(typeof simulated.data.message_id, 'number');

    const message = await readJson(await fetch(`${url}/get_msg?message_id=${simulated.data.message_id}`));
    assert.equal(message.data.message_type, 'private');
    assert.equal(message.data.user_id, 20001);
    assert.equal(message.data.raw_message, '来自控制台的私聊');
  } finally {
    await bot.stop();
  }
});

test('WebUI 配置读取、保存与从磁盘重载', async () => {
  const file = fileURLToPath(new URL('./config-runtime.json', import.meta.url));
  const base = config();
  fs.writeFileSync(file, `${JSON.stringify(base, null, 2)}\n`, 'utf8');

  const { bot, url } = await start({}, { configPath: file });
  try {
    const current = await readJson(await fetch(`${url}/webui/api/config`));
    assert.equal(current.path, file);
    assert.equal(current.config.http.port, 0);

    const next = structuredClone(base);
    next.heartbeat = { enabled: false, intervalMs: 15_000 };
    const saved = await readJson(await fetch(`${url}/webui/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: next, persist: true }),
    }));
    assert.equal(saved.status, 'ok');
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8')) as ShadowDreamConfig;
    assert.equal(onDisk.heartbeat.intervalMs, 15_000);
    assert.equal(bot.getConfig().heartbeat.intervalMs, 15_000);

    next.heartbeat.intervalMs = 22_000;
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    const reloaded = await readJson(await fetch(`${url}/webui/api/reload`, { method: 'POST' }));
    assert.equal(reloaded.status, 'ok');
    assert.equal(bot.getConfig().heartbeat.intervalMs, 22_000);
  } finally {
    await bot.stop();
    fs.rmSync(file, { force: true });
  }
});
