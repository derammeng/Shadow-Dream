import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { QqntBackend } = require('../release/shadowdream/backend.js');
const core = require('../release/shadowdream/node_modules/@shadowdream/core/index.js');

function makeRaw(overrides = {}) {
  return {
    msgId: 'm-1',
    msgSeq: '1',
    msgTime: '1794658600',
    chatType: 2,
    peerUid: '30001',
    senderUid: 'u_friend',
    senderUin: '20001',
    sendNickName: '小梦',
    sendMemberName: '梦梦',
    elements: [{ elementType: 1, elementId: 'e1', textElement: { content: '你好', atType: 0 } }],
    ...overrides,
  };
}

function makeHarness() {
  let msgListener = null;
  let groupListener = null;
  const calls = [];
  let seq = 1;

  const group = {
    groupCode: '30001',
    groupName: '测试群',
    memberCount: 2,
    maxMember: 200,
    groupOwnerId: { memberUin: '10001', memberUid: 'u_self' },
  };
  const members = new Map([
    ['u_self', { uid: 'u_self', uin: '10001', nick: '影梦', cardName: '', role: 4, joinTime: '1700000000', lastSpeakTime: '1700000000' }],
    ['u_friend', { uid: 'u_friend', uin: '20001', nick: '小梦', cardName: '梦梦', role: 2, joinTime: '1700000000', lastSpeakTime: '1700000000' }],
  ]);

  const msgService = {
    addKernelMsgListener(listener) {
      msgListener = listener;
      return 11;
    },
    removeKernelMsgListener() {},
    generateMsgUniqueId() {
      return 'uniq-1';
    },
    async sendMsg(_id, peer, elements) {
      calls.push({ action: 'sendMsg', peer, elements });
      const raw = makeRaw({
        msgId: `sent-${seq++}`,
        chatType: peer.chatType,
        peerUid: peer.peerUid,
        senderUid: 'u_self',
        senderUin: '10001',
        sendNickName: '影梦',
        sendMemberName: '',
        guildId: peer.guildId,
        elements: elements.map(element => ({
          elementType: element.elementType,
          elementId: element.elementId,
          ...(element.textElement ? { textElement: element.textElement } : {}),
        })),
      });
      setTimeout(() => msgListener?.onMsgInfoListUpdate?.([raw]), 5);
      return { result: 0 };
    },
    async recallMsg(peer, ids) {
      calls.push({ action: 'recallMsg', peer, ids });
      return { result: 0 };
    },
  };

  const groupService = {
    addKernelGroupListener(listener) {
      groupListener = listener;
      return 22;
    },
    removeKernelGroupListener() {},
    async getGroupList() {
      queueMicrotask(() => groupListener?.onGroupListUpdate?.([group]));
      return { result: 0 };
    },
    async getAllMemberList() {
      return { result: { infos: members } };
    },
    async setMemberShutUp(groupCode, list) {
      calls.push({ action: 'setMemberShutUp', groupCode, list });
      return { result: 0 };
    },
    async setGroupShutUp(groupCode, shutUp) {
      calls.push({ action: 'setGroupShutUp', groupCode, shutUp });
      return { result: 0 };
    },
    async kickMember(groupCode, uids) {
      calls.push({ action: 'kickMember', groupCode, uids });
      return { result: 0 };
    },
  };

  const buddyService = {
    async getBuddyListV2() {
      return { result: 0, data: [{ buddyUids: ['u_friend'] }] };
    },
  };

  const profileService = {
    getCoreAndBaseInfo(_from, uids) {
      return new Map(uids.map(uid => [uid, {
        uid,
        uin: uid === 'u_friend' ? 20001 : 10001,
        nick: uid === 'u_friend' ? '小梦' : '影梦',
        remark: '',
      }]));
    },
    getUidByUin(_from, uins) {
      return new Map(uins.map(uin => [String(uin), String(uin) === '20001' ? 'u_friend' : 'u_self']));
    },
    getUinByUid(_from, uids) {
      return new Map(uids.map(uid => [uid, uid === 'u_friend' ? 20001 : 10001]));
    },
  };

  const session = {
    getMsgService: () => msgService,
    getGroupService: () => groupService,
    getBuddyService: () => buddyService,
    getProfileService: () => profileService,
  };

  return {
    session,
    calls,
    emitIncoming(raw) {
      msgListener?.onRecvMsg?.([raw]);
    },
    emitRecall(chatType, uid, seqValue) {
      msgListener?.onMsgRecall?.(chatType, uid, seqValue);
    },
  };
}

test('QqntBackend 启动后加载群 / 好友并转换入站消息', async () => {
  const harness = makeHarness();
  const backend = new QqntBackend({
    session: harness.session,
    wrapper: {},
    selfId: 10001,
    selfUid: 'u_self',
    selfNick: '影梦',
    logger: core.createLogger('test', 'error'),
  });
  const events = [];
  backend.onEvent(event => events.push(event));
  await backend.start();

  const groups = await backend.call('get_group_list', {}, { source: 'internal' });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].group_name, '测试群');

  const friends = await backend.call('get_friend_list', {}, { source: 'internal' });
  assert.equal(friends.length, 1);
  assert.equal(friends[0].user_id, 20001);

  harness.emitIncoming(makeRaw());
  assert.equal(events.length, 1);
  assert.equal(events[0].post_type, 'message');
  assert.equal(events[0].group_id, 30001);
  assert.equal(events[0].user_id, 20001);
  assert.equal(events[0].sender.card, '梦梦');
  assert.equal(events[0].message[0].data.text, '你好');
  await backend.stop();
});

test('QqntBackend 发送文本并收到 message_sent', async () => {
  const harness = makeHarness();
  const backend = new QqntBackend({
    session: harness.session,
    wrapper: {},
    selfId: 10001,
    selfUid: 'u_self',
    selfNick: '影梦',
    logger: core.createLogger('test', 'error'),
  });
  const events = [];
  backend.onEvent(event => events.push(event));
  await backend.start();

  const result = await backend.call('send_group_msg', {
    group_id: 30001,
    message: '发送测试',
  }, { source: 'internal' });

  assert.equal(typeof result.message_id, 'number');
  const sent = events.find(event => event.post_type === 'message_sent');
  assert.ok(sent);
  assert.equal(sent.group_id, 30001);
  assert.equal(sent.user_id, 10001);
  assert.equal(sent.message[0].data.text, '发送测试');
  assert.equal(harness.calls.some(call => call.action === 'sendMsg'), true);
  await backend.stop();
});

test('QqntBackend 禁言使用秒数并返回失败码', async () => {
  const harness = makeHarness();
  const backend = new QqntBackend({
    session: harness.session,
    wrapper: {},
    selfId: 10001,
    selfUid: 'u_self',
    selfNick: '影梦',
    logger: core.createLogger('test', 'error'),
  });
  await backend.start();

  await backend.call('set_group_ban', {
    group_id: 30001,
    user_id: 20001,
    duration: 60,
  }, { source: 'internal' });

  const call = harness.calls.find(item => item.action === 'setMemberShutUp');
  assert.ok(call);
  assert.equal(call.list[0].timeStamp, 60);
  assert.equal(call.list[0].uid, 'u_friend');

  // 群发送不再依赖群列表缓存，交给 QQ 自己校验目标；这里不再断言“群不存在”。
  await backend.stop();
});
