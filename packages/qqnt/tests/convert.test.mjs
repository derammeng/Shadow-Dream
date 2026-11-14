import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// 使用 release 里的 CJS 版本，顺带验证插件打包后的 require 闭包。
const convert = require('../release/shadowdream/convert.js');
const core = require('../release/shadowdream/node_modules/@shadowdream/core/index.js');

function makeContext(overrides = {}) {
  const ids = new core.MessageIdRegistry();
  return {
    selfId: 10001,
    selfUid: 'u_self',
    groupId: 30001,
    ids,
    resolveUin: uid => (uid === 'u_self' ? 10001 : uid === 'u_meng' ? 20001 : 0),
    resolveUid: async uin => (uin === 20001 ? 'u_meng' : uin === 10001 ? 'u_self' : ''),
    rawOf: () => undefined,
    groupOf: () => ({ groupCode: '30001', groupName: '测试群', memberCount: 5, maxMember: 200 }),
    memberOf: (groupId, uid) => (uid === 'u_meng'
      ? { uid, uin: '20001', nick: '小梦', cardName: '梦梦', role: 2 }
      : undefined),
    ...overrides,
  };
}

function raw(overrides = {}) {
  return {
    msgId: '7438291048576000001',
    msgSeq: '88',
    msgTime: '1794658603',
    chatType: 2,
    peerUid: '30001',
    peerUin: '30001',
    senderUid: 'u_meng',
    senderUin: '20001',
    sendNickName: '小梦',
    sendMemberName: '梦梦',
    elements: [],
    ...overrides,
  };
}

test('QQNT text + at + face 转成 OneBot 消息段', () => {
  const ctx = makeContext();
  const segments = convert.elementsToSegments([
    {
      elementType: 1,
      elementId: '1',
      textElement: { content: '@小梦 你好', atType: 2, atUid: 'u_meng', atNtUid: 'u_meng' },
    },
    { elementType: 6, elementId: '2', faceElement: { faceIndex: 14, faceType: 1 } },
  ], ctx);
  assert.deepEqual(segments, [
    { type: 'at', data: { qq: '20001' } },
    { type: 'text', data: { text: '你好' } },
    { type: 'face', data: { id: '14' } },
  ]);
});

test('QQNT incoming @ self resolves to real QQ instead of @0', () => {
  const ctx = makeContext();
  const segments = convert.elementsToSegments([
    { elementType: 1, elementId: '1', textElement: { content: '@影梦 help', atType: 2, atUid: 'u_self', atNtUid: 'u_self' } },
  ], ctx);
  assert.deepEqual(segments, [
    { type: 'at', data: { qq: '10001' } },
    { type: 'text', data: { text: 'help' } },
  ]);
});

test('QQNT 图片、语音、视频、文件转换', () => {
  const ctx = makeContext();
  const segments = convert.elementsToSegments([
    {
      elementType: 2,
      elementId: '1',
      picElement: {
        filePath: 'C:/QQ/cache/a.png',
        fileName: 'a.png',
        picSubType: 0,
        originImageUrl: 'https://example.com/a.png',
        summary: '[图片]',
      },
    },
    {
      elementType: 4,
      elementId: '2',
      pttElement: { filePath: 'C:/QQ/cache/a.amr', duration: 3 },
    },
    {
      elementType: 5,
      elementId: '3',
      videoElement: { filePath: 'C:/QQ/cache/a.mp4', fileTime: 12 },
    },
    {
      elementType: 3,
      elementId: '4',
      fileElement: { fileName: 'a.zip', filePath: 'C:/QQ/cache/a.zip', fileSize: '1024' },
    },
  ], ctx);

  assert.equal(segments[0].type, 'image');
  assert.equal(segments[0].data.url, 'https://example.com/a.png');
  assert.equal(segments[1].type, 'record');
  assert.equal(segments[1].data.duration, 3);
  assert.equal(segments[2].type, 'video');
  assert.equal(segments[3].type, 'file');
  assert.equal(segments[3].data.name, 'a.zip');
});

test('rawToEvent 生成群消息事件与 sender.role', () => {
  const ctx = makeContext();
  const event = convert.rawToEvent(raw({
    elements: [{ elementType: 1, elementId: '1', textElement: { content: '晚上好', atType: 0 } }],
  }), ctx);

  assert.equal(event.post_type, 'message');
  assert.equal(event.message_type, 'group');
  assert.equal(event.group_id, 30001);
  assert.equal(event.user_id, 20001);
  assert.equal(event.sub_type, 'normal');
  assert.equal(event.sender.card, '梦梦');
  assert.equal(event.sender.role, 'member');
  assert.equal(event.message[0].data.text, '晚上好');
  assert.equal(event.raw_message, '晚上好');
  assert.equal(typeof event.message_id, 'number');
  assert.equal(event.self_id, 10001);
});

test('reply 段通过 OneBot message_id 反查本地消息', () => {
  const ids = new core.MessageIdRegistry();
  const original = raw({ elements: [{ elementType: 1, elementId: '1', textElement: { content: '原消息', atType: 0 } }] });
  const oneBotId = ids.toOneBot(original.msgId);

  const ctx = makeContext({
    ids,
    rawOf: id => (Number(id) === oneBotId ? original : undefined),
  });
  const segments = convert.elementsToSegments([
    { elementType: 7, elementId: '2', replyElement: { replayMsgId: original.msgId } },
  ], ctx);
  assert.deepEqual(segments, [{ type: 'reply', data: { id: String(oneBotId) } }]);
});

test('发送文本 / at / face / reply 能构造 NTQQ elements', async () => {
  const ids = new core.MessageIdRegistry();
  const target = raw({
    elements: [{ elementType: 1, elementId: '1', textElement: { content: '被回复', atType: 0 } }],
  });
  const targetId = ids.toOneBot(target.msgId);
  const ctx = makeContext({
    ids,
    rawOf: id => (Number(id) === targetId ? target : undefined),
  });

  const elements = await convert.messageToElements([
    { type: 'text', data: { text: '你好' } },
    { type: 'at', data: { qq: '20001', name: '小梦' } },
    { type: 'face', data: { id: '14' } },
    { type: 'reply', data: { id: String(targetId) } },
  ], ctx);

  assert.equal(elements.length, 4);
  assert.equal(elements[0].elementType, 1);
  assert.equal(elements[0].textElement.content, '你好');
  assert.equal(elements[1].textElement.atType, 2);
  assert.equal(elements[1].textElement.atUid, '20001');
  assert.equal(elements[1].textElement.atNtUid, 'u_meng');
  assert.equal(elements[2].faceElement.faceIndex, 14);
  assert.equal(elements[3].replyElement.replayMsgId, target.msgId);
});

test('发送媒体明确抛 1401，而不是生成坏 element', async () => {
  const ctx = makeContext();
  await assert.rejects(
    () => convert.messageToElements([{ type: 'image', data: { file: 'a.png' } }], ctx),
    error => error && error.retcode === 1401,
  );
});

test('group / member / friend 转换', () => {
  const group = convert.groupToInfo({
    groupCode: '30001',
    groupName: '测试群',
    memberCount: 5,
    maxMember: 200,
    groupOwnerId: { memberUin: '10001', memberUid: 'u_self' },
  });
  assert.equal(group.group_id, 30001);
  assert.equal(group.member_count, 5);
  assert.equal(group.owner_id, 10001);

  const member = convert.memberToInfo(30001, {
    uid: 'u_meng',
    uin: '20001',
    nick: '小梦',
    cardName: '梦梦',
    role: 3,
    joinTime: '1700000000',
  });
  assert.equal(member.role, 'admin');
  assert.equal(member.card, '梦梦');

  const friend = convert.friendToInfo({ uin: 20001, nick: '小梦', remark: '梦梦' });
  assert.equal(friend.user_id, 20001);
  assert.equal(friend.remark, '梦梦');
});
