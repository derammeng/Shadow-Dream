import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, loadConfig } from '../src/config/schema.js';

const missingFile = fileURLToPath(new URL('./fixtures/missing.json', import.meta.url));

test('默认配置可加载且端口合法', () => {
  const config = loadConfig({ file: missingFile, allowMissing: true });
  assert.equal(config.http.enabled, true);
  assert.equal(config.http.host, '127.0.0.1');
  assert.equal(config.ws.enabled, true);
  assert.equal(config.heartbeat.intervalMs, 30_000);
  assert.deepEqual(config.httpPost, []);
  assert.deepEqual(config.reverseWs, []);
  assert.equal(config.backend.type, 'mock');
});

test('overrides 深合并而不是整体覆盖', () => {
  const config = loadConfig({
    file: missingFile,
    allowMissing: true,
    overrides: {
      http: { ...DEFAULT_CONFIG.http, port: 0 },
      ws: { ...DEFAULT_CONFIG.ws, enabled: false },
      heartbeat: { enabled: false, intervalMs: 5_000 },
    },
  });
  assert.equal(config.http.port, 0);
  assert.equal(config.http.host, '127.0.0.1');
  assert.equal(config.ws.enabled, false);
  assert.equal(config.ws.path, '/');
  assert.equal(config.heartbeat.enabled, false);
});

test('环境变量覆盖端口和 token', () => {
  const previous = {
    port: process.env.FD_HTTP_PORT,
    token: process.env.FD_HTTP_TOKEN,
  };
  process.env.FD_HTTP_PORT = '4567';
  process.env.FD_HTTP_TOKEN = 'secret';
  try {
    const config = loadConfig({ file: missingFile, allowMissing: true });
    assert.equal(config.http.port, 4567);
    assert.equal(config.http.accessToken, 'secret');
  } finally {
    if (previous.port === undefined) delete process.env.FD_HTTP_PORT;
    else process.env.FD_HTTP_PORT = previous.port;
    if (previous.token === undefined) delete process.env.FD_HTTP_TOKEN;
    else process.env.FD_HTTP_TOKEN = previous.token;
  }
});

test('无效端口被夹到合法范围', () => {
  const config = loadConfig({
    file: missingFile,
    allowMissing: true,
    overrides: {
      http: { ...DEFAULT_CONFIG.http, port: 999_999 },
      ws: { ...DEFAULT_CONFIG.ws, port: -1 },
    },
  });
  assert.equal(config.http.port, 65_535);
  assert.equal(config.ws.port, 0);
});

test('带 UTF-8 BOM 的配置文件也能读取', () => {
  const file = fileURLToPath(new URL('./bom-config.json', import.meta.url));
  fs.writeFileSync(file, '\uFEFF{"http":{"port":3999},"ws":{"enabled":false}}', 'utf8');
  try {
    const config = loadConfig({ file, allowMissing: false });
    assert.equal(config.http.port, 3999);
    assert.equal(config.ws.enabled, false);
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test('旧 ws 配置自动迁移成 wsServers，新数组优先', () => {
  const migrated = loadConfig({
    file: missingFile,
    allowMissing: true,
    overrides: {
      http: { ...DEFAULT_CONFIG.http },
      ws: { ...DEFAULT_CONFIG.ws, port: 4100 },
    },
  });
  assert.equal(migrated.wsServers?.length, 1);
  assert.equal(migrated.wsServers?.[0]?.port, 4100);
  assert.equal(migrated.ws.port, 4100);

  const multi = loadConfig({
    file: missingFile,
    allowMissing: true,
    overrides: {
      http: { ...DEFAULT_CONFIG.http },
      ws: { ...DEFAULT_CONFIG.ws, port: 4200 },
      wsServers: [
        { ...DEFAULT_CONFIG.ws, name: 'A', port: 4201, path: '/a' },
        { ...DEFAULT_CONFIG.ws, name: 'B', port: 4202, path: '/b' },
      ],
    },
  });
  assert.equal(multi.wsServers?.length, 2);
  assert.equal(multi.wsServers?.[0]?.name, 'A');
  assert.equal(multi.wsServers?.[1]?.port, 4202);
  assert.equal(multi.ws.port, 4201);
});

test('空 wsServers 表示关闭所有正向 WS', () => {
  const config = loadConfig({
    file: missingFile,
    allowMissing: true,
    overrides: {
      http: { ...DEFAULT_CONFIG.http },
      ws: { ...DEFAULT_CONFIG.ws },
      wsServers: [],
    },
  });
  assert.equal(config.wsServers?.length, 0);
  assert.equal(config.ws.enabled, false);
});

test('WS path 自动补前导斜杠', () => {
  const config = loadConfig({
    file: missingFile,
    allowMissing: true,
    overrides: {
      http: { ...DEFAULT_CONFIG.http },
      ws: { ...DEFAULT_CONFIG.ws, path: 'onebot/v11/ws' },
    },
  });
  assert.equal(config.ws.path, '/onebot/v11/ws');
});
