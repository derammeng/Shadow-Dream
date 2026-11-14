import test from 'node:test';
import assert from 'node:assert/strict';
import { MockBackend } from '../src/backend.js';
import type { OneBotEvent } from '@shadowdream/core';

function collect(backend: MockBackend): OneBotEvent[] {
  const events: OneBotEvent[] = [];
  backend.onEvent(event => events.push(event));
  return events;
}

test('发送群消息并读回', async () => {
  const backend = new MockBackend();
  const events = collect(backend);
  const result = await backend.call('send_group_msg', {
    group_id: 30001,
    message: [
      { type: 'text', data: { text: '你好' } },
      { type: 'at', data: { qq: '20001' } },
    ],
  }, { source: 'internal' }) as { message_id: number };

  assert.equal(typeof result.message_id, 'number');
  assert.equal(events.length, 1);
  assert.equal(events[0]?.post_type, 'message_sent');

  const message = await backend.call('get_msg', { message_id: result.message_id }, { source: 'internal' }) as {
    group_id: number;
    message: Array<{ type: string; data: Record<string, unknown> }>;
  };
  assert.equal(message.group_id, 30001);
  assert.equal(message.message[0]?.data.text, '你好');
  assert.equal(message.message[1]?.type, 'at');
});

test('撤回消息产生 group_recall 通知', async () => {
  const backend = new MockBackend();
  const events = collect(backend);
  const sent = await backend.call('send_group_msg', {
    group_id: 30001,
    message: '待撤回',
  }, { source: 'internal' }) as { message_id: number };

  await backend.call('delete_msg', { message_id: sent.message_id }, { source: 'internal' });
  const recall = events.find(event => event.post_type === 'notice' && event.notice_type === 'group_recall');
  assert.ok(recall);
  assert.equal(recall?.message_id, sent.message_id);
});

test('模拟群消息：成员使用成员名片，陌生人走匿名', async () => {
  const backend = new MockBackend();
  const events = collect(backend);

  await backend.simulate({
    message_type: 'group',
    group_id: 30001,
    user_id: 20001,
    message: '我是小梦',
  });
  await backend.simulate({
    message_type: 'group',
    group_id: 30001,
    user_id: 99999,
    message: '我是路人',
    nickname: '路人甲',
  });

  const first = events[0];
  const second = events[1];
  assert.equal(first?.post_type, 'message');
  if (first?.post_type === 'message') {
    assert.equal(first.sender.card, '梦梦');
    assert.equal(first.sub_type, 'normal');
  }
  if (second?.post_type === 'message') {
    assert.equal(second.sub_type, 'anonymous');
    assert.equal(second.sender.nickname, '路人甲');
  }
});

test('禁言、管理员和踢人动作改变群状态', async () => {
  const backend = new MockBackend();
  const events = collect(backend);

  await backend.call('set_group_ban', { group_id: 30001, user_id: 20002, duration: 60 }, { source: 'internal' });
  await backend.call('set_group_admin', { group_id: 30001, user_id: 20002, enable: true }, { source: 'internal' });
  await backend.call('set_group_kick', { group_id: 30001, user_id: 30004 }, { source: 'internal' });

  const notices = events.filter(event => event.post_type === 'notice');
  assert.ok(notices.some(event => event.notice_type === 'group_ban' && event.sub_type === 'ban'));
  assert.ok(notices.some(event => event.notice_type === 'group_admin' && event.sub_type === 'set'));
  assert.ok(notices.some(event => event.notice_type === 'group_decrease' && event.sub_type === 'kick'));

  const members = await backend.call('get_group_member_list', { group_id: 30001 }, { source: 'internal' }) as Array<{ user_id: number; role: string }>;
  assert.equal(members.some(member => member.user_id === 30004), false);
  assert.equal(members.find(member => member.user_id === 20002)?.role, 'admin');
});

test('未实现的 action 返回 1401', async () => {
  const backend = new MockBackend();
  await assert.rejects(
    () => backend.call('send_telegram_msg', {}, { source: 'internal' }),
    (error: unknown) => (error as { retcode?: number }).retcode === 1401,
  );
});
