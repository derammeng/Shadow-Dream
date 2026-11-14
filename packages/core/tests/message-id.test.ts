import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageIdRegistry } from '../src/message/message-id.js';

test('内部 ID 稳定映射到 OneBot ID', () => {
  const registry = new MessageIdRegistry();
  const a = registry.toOneBot('msg-a');
  const b = registry.toOneBot('msg-b');
  assert.notEqual(a, b);
  assert.equal(registry.toOneBot('msg-a'), a);
  assert.equal(registry.toInternal(a), 'msg-a');
  assert.equal(registry.toInternal(b), 'msg-b');
  assert.equal(registry.size, 2);
});

test('碰撞时线性探测且不覆盖已有映射', () => {
  const registry = new MessageIdRegistry(10);
  const ids = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const id = registry.toOneBot(`collision-${i}`);
    assert.equal(ids.has(id), false);
    ids.add(id);
  }
  for (let i = 0; i < 200; i++) {
    assert.equal(registry.toInternal(registry.toOneBot(`collision-${i}`)), `collision-${i}`);
  }
});

test('容量淘汰后旧映射失效', () => {
  const registry = new MessageIdRegistry(2);
  const first = registry.toOneBot('one');
  registry.toOneBot('two');
  registry.toOneBot('three');
  assert.equal(registry.toInternal(first), undefined);
});
