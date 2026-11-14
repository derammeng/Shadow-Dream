import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { DEFAULT_CONFIG, type ShadowDreamConfig } from '../src/config/schema.js';
import { ShadowDreamBot } from '../src/bot.js';
import { createLogger } from '../src/util/logger.js';
import { FakeBackend } from './fake-backend.js';

function config(hookUrl: string): ShadowDreamConfig {
  const value = structuredClone(DEFAULT_CONFIG);
  value.http.enabled = false;
  value.ws.enabled = false;
  value.heartbeat.enabled = false;
  value.logLevel = 'error';
  value.httpPost = [{ url: hookUrl, secret: 'hook-secret', timeoutMs: 3000 }];
  return value;
}

test('HTTP POST 推送事件并携带 HMAC-SHA1 签名', async () => {
  let received: { body: string; signature: string; selfId: string } | null = null;
  let resolveReceived: (() => void) | null = null;
  const receivedPromise = new Promise<void>((resolve) => {
    resolveReceived = resolve;
  });

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const event = JSON.parse(body) as { post_type?: string };
      // 启动时会先推送 lifecycle meta_event，这里只关心真正的消息事件。
      if (event.post_type === 'message') {
        received = {
          body,
          signature: String(req.headers['x-signature'] ?? ''),
          selfId: String(req.headers['x-self-id'] ?? ''),
        };
        resolveReceived?.();
      }
      res.statusCode = 204;
      res.end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const hookUrl = `http://127.0.0.1:${address.port}/hook`;

  const backend = new FakeBackend();
  const bot = new ShadowDreamBot({ config: config(hookUrl), backend, logger: createLogger('test', 'error') });
  await bot.start();
  try {
    await backend.simulate({ message_type: 'private', user_id: 20001, message: '推送测试' });
    await Promise.race([
      receivedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('HTTP POST 超时')), 4000)),
    ]);

    assert.ok(received);
    const payload = received as unknown as { body: string; signature: string; selfId: string };
    const event = JSON.parse(payload.body) as { post_type: string; message: Array<{ data: { text: string } }> };
    assert.equal(event.post_type, 'message');
    assert.equal(event.message[0]?.data.text, '推送测试');
    assert.equal(payload.selfId, '10001');

    const expected = createHmac('sha1', 'hook-secret').update(payload.body).digest('hex');
    assert.equal(payload.signature, `sha1=${expected}`);
  } finally {
    await bot.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
