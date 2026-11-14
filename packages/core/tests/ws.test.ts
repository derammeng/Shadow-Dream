import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { DEFAULT_CONFIG, type ShadowDreamConfig } from '../src/config/schema.js';
import { ShadowDreamBot } from '../src/bot.js';
import { createLogger } from '../src/util/logger.js';
import { FakeBackend } from './fake-backend.js';

function config(): ShadowDreamConfig {
  const value = structuredClone(DEFAULT_CONFIG);
  value.http.enabled = false;
  value.ws.enabled = true;
  value.ws.host = '127.0.0.1';
  value.ws.port = 0;
  value.heartbeat.enabled = false;
  value.logLevel = 'error';
  return value;
}

function nextJson(ws: WebSocket, timeoutMs = 3000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS 消息超时')), timeoutMs);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()) as Record<string, unknown>);
    });
  });
}

test('WS universal 客户端可以调用 API 并收到事件', async () => {
  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({ config: config(), backend, logger: createLogger('test', 'error') });
  await bot.start();
  const url = bot.getOverview().transports.ws;
  assert.notEqual(url, '未启用');

  const ws = new WebSocket(url, { headers: { 'X-Client-Role': 'universal' } });
  try {
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    ws.send(JSON.stringify({ action: 'get_login_info', params: {}, echo: 'login' }));
    const action = await nextJson(ws);
    assert.equal(action.echo, 'login');
    assert.equal(action.retcode, 0);

    const eventPromise = nextJson(ws, 5000);
    await backend.simulate({
      message_type: 'group',
      group_id: 30001,
      user_id: 20001,
      message: 'WS 事件',
    });
    const event = await eventPromise;
    assert.equal(event.post_type, 'message');
    assert.equal(event.message_type, 'group');
    assert.equal((event.message as Array<{ data: { text: string } }>)[0]?.data.text, 'WS 事件');
  } finally {
    ws.close();
    await bot.stop();
  }
});

test('WS event 角色不能调用 API，但能收到事件', async () => {
  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({ config: config(), backend, logger: createLogger('test', 'error') });
  await bot.start();
  const url = bot.getOverview().transports.ws;

  const ws = new WebSocket(url, { headers: { 'X-Client-Role': 'event' } });
  try {
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    ws.send(JSON.stringify({ action: 'get_login_info', params: {} }));
    const rejected = await nextJson(ws);
    assert.equal(rejected.retcode, 1401);

    const eventPromise = nextJson(ws, 5000);
    await backend.simulate({
      message_type: 'private',
      user_id: 20002,
      message: '仅事件',
    });
    const event = await eventPromise;
    assert.equal(event.post_type, 'message');
    assert.equal(event.message_type, 'private');
  } finally {
    ws.close();
    await bot.stop();
  }
});

test('多个正向 WebSocket 地址可以独立监听', async () => {
  const value = structuredClone(DEFAULT_CONFIG);
  value.http.enabled = false;
  value.ws.enabled = true;
  value.wsServers = [
    { ...value.ws, name: 'Alpha', port: 0, path: '/alpha' },
    { ...value.ws, name: 'Beta', port: 0, path: '/beta' },
  ];
  value.heartbeat.enabled = false;
  value.logLevel = 'error';

  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({ config: value, backend, logger: createLogger('test', 'error') });
  await bot.start();
  try {
    const overview = bot.getOverview();
    assert.equal(overview.transports.wsServers.length, 2);
    assert.equal(overview.transports.wsServers[0]?.running, true);
    assert.equal(overview.transports.wsServers[1]?.running, true);
    assert.notEqual(overview.transports.wsServers[0]?.port, overview.transports.wsServers[1]?.port);

    for (const server of overview.transports.wsServers) {
      const ws = new WebSocket(server.url);
      try {
        await new Promise<void>((resolve, reject) => {
          ws.once('open', resolve);
          ws.once('error', reject);
        });
        ws.send(JSON.stringify({ action: 'get_status', params: {}, echo: server.name }));
        const response = await nextJson(ws);
        assert.equal(response.echo, server.name);
        assert.equal(response.retcode, 0);
      } finally {
        ws.close();
      }
    }
  } finally {
    await bot.stop();
  }
});

test('HTTP 与 WS 同端口时复用 server', async () => {
  const value = structuredClone(DEFAULT_CONFIG);
  value.http.enabled = true;
  value.http.host = '127.0.0.1';
  value.http.port = 0;
  value.ws.enabled = true;
  value.ws.host = '127.0.0.1';
  value.ws.port = 0;
  value.heartbeat.enabled = false;
  value.logLevel = 'error';

  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({ config: value, backend, logger: createLogger('test', 'error') });
  await bot.start();
  try {
    const overview = bot.getOverview();
    assert.match(overview.transports.ws, /^ws:\/\/127\.0\.0\.1:\d+$/);
    const wsPort = new URL(overview.transports.ws).port;
    const httpPort = new URL(overview.transports.http).port;
    assert.equal(wsPort, httpPort);

    const ws = new WebSocket(overview.transports.ws);
    try {
      await new Promise<void>((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });
      ws.send(JSON.stringify({ action: 'get_status', params: {}, echo: 'same-port' }));
      const response = await nextJson(ws);
      assert.equal(response.echo, 'same-port');
      assert.equal(response.retcode, 0);
    } finally {
      ws.close();
    }
  } finally {
    await bot.stop();
  }
});

test('WS access token 错误时拒绝握手', async () => {
  const configValue = config();
  configValue.ws.accessToken = 'ws-secret';
  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({ config: configValue, backend, logger: createLogger('test', 'error') });
  await bot.start();
  const url = bot.getOverview().transports.ws;

  const denied = new WebSocket(url);
  try {
    await new Promise<void>((resolve) => {
      denied.once('unexpected-response', () => resolve());
      denied.once('open', () => resolve());
      denied.once('error', () => resolve());
    });
    assert.notEqual(denied.readyState, WebSocket.OPEN);
  } finally {
    denied.terminate();
    await bot.stop();
  }
});
