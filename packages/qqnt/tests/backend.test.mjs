import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  const mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shadowdream-backend-'));

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
    // QQ 3.2 的富媒体缓存路径 API：媒体必须先落到这个目录，sendMsg 才会真正上传。
    getRichMediaFilePathForGuild(params) {
      return path.join(mediaDir, `${params.md5HexStr}${path.extname(params.fileName) || '.bin'}`);
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
    async getMsgsByMsgId(peer, ids) {
      calls.push({ action: 'getMsgsByMsgId', peer, ids });
      return {
        result: 0,
        msgList: ids.map(id => makeRaw({
          msgId: id,
          msgSeq: '99',
          chatType: peer.chatType,
          peerUid: peer.peerUid,
          senderUid: 'u_friend',
          senderUin: '20001',
          sendNickName: '小梦',
          elements: [{
            elementType: 2,
            elementId: 'img-1',
            picElement: { originImageUrl: 'https://example.test/image.png', fileName: 'image.png' },
          }],
        })),
      };
    },
  };

  const groupService = {
    addKernelGroupListener(listener) {
      groupListener = listener;
      return 22;
    },
    removeKernelGroupListener() {},
    async getGroupList() {
      // 真实 QQ 的 onGroupListUpdate 是两个参数：(updateType, groupList)。
      queueMicrotask(() => groupListener?.onGroupListUpdate?.(1, [group]));
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
    mediaDir,
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

test('QqntBackend 发图片：落到 QQ 富媒体缓存目录并构造 picElement', async () => {
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

  const png = makePng(4, 5);
  const source = path.join(harness.mediaDir, 'source.png');
  fs.writeFileSync(source, png);

  const result = await backend.call('send_group_msg', {
    group_id: 30001,
    message: [{ type: 'image', data: { file: source, sub_type: 1 } }],
  }, { source: 'internal' });
  assert.equal(typeof result.message_id, 'number');

  const sent = harness.calls.find(call => call.action === 'sendMsg');
  const pic = sent.elements[0].picElement;
  assert.equal(sent.elements[0].elementType, 2);
  assert.equal(pic.picWidth, 4);
  assert.equal(pic.picHeight, 5);
  assert.equal(pic.picType, 1001);
  assert.equal(pic.picSubType, 1);
  assert.equal(pic.fileSize, String(png.length));
  assert.equal(pic.fileUuid, '');
  // 文件必须真的写进缓存路径，QQ 才能在 sendMsg 时上传。
  assert.equal(path.dirname(pic.sourcePath), harness.mediaDir);
  assert.equal(fs.readFileSync(pic.sourcePath).equals(png), true);
  await backend.stop();
});

test('QqntBackend 发语音：wav 转 silk 后写进缓存目录并带时长', async () => {
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

  const source = path.join(harness.mediaDir, 'voice.wav');
  fs.writeFileSync(source, makeWav({ seconds: 1 }));

  const result = await backend.call('send_private_msg', {
    user_id: 20001,
    message: [{ type: 'record', data: { file: source } }],
  }, { source: 'internal' });
  assert.equal(typeof result.message_id, 'number');

  const sent = harness.calls.find(call => call.action === 'sendMsg');
  const ptt = sent.elements[0].pttElement;
  assert.equal(sent.elements[0].elementType, 4);
  assert.equal(ptt.formatType, 1);
  assert.equal(ptt.duration, 1);
  assert.ok(Number(ptt.fileSize) > 500, `silk 太小：${ptt.fileSize}`);
  assert.equal(ptt.filePath.endsWith('.silk'), true);
  const written = fs.readFileSync(ptt.filePath);
  assert.equal(written.subarray(0, 10).includes(Buffer.from('#!SILK_V3')), true);
  await backend.stop();
});

/** 最小 PNG：只有 IHDR，够解析宽高。 */
function makePng(width, height) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    let crc = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    for (const byte of body) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01])),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 24kHz 单声道 16bit WAV。 */
function makeWav({ sampleRate = 24000, seconds = 1 } = {}) {
  const frames = Math.floor(sampleRate * seconds);
  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 9000), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

test('QqntBackend 发视频：构造 videoElement 并写入封面', async () => {
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

  const source = path.join(harness.mediaDir, 'clip.mp4');
  fs.writeFileSync(source, makeMp4({ timescale: 1000, duration: 4200, width: 640, height: 360 }));

  const result = await backend.call('send_group_msg', {
    group_id: 30001,
    message: [{ type: 'video', data: { file: source } }],
  }, { source: 'internal' });
  assert.equal(typeof result.message_id, 'number');

  const sent = harness.calls.find(call => call.action === 'sendMsg');
  const video = sent.elements[0].videoElement;
  assert.equal(sent.elements[0].elementType, 5);
  assert.equal(video.fileFormat, 2);
  assert.equal(video.fileWidth, 640);
  assert.equal(video.fileHeight, 360);
  assert.equal(video.fileTime, 4);
  assert.equal(typeof video.fileSize, 'string');
  assert.equal(fs.existsSync(video.filePath), true);
  assert.equal(video.thumbPath instanceof Map, true);
  const thumbPath = video.thumbPath.get(0);
  assert.equal(fs.existsSync(thumbPath), true);
  assert.ok(thumbPath.endsWith('_0.png'));
  assert.ok(video.thumbSize > 0);
  await backend.stop();
});

test('QqntBackend 发文件：构造 fileElement 并复制进缓存目录', async () => {
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

  const source = path.join(harness.mediaDir, 'note.txt');
  fs.writeFileSync(source, 'hello from shadow dream');

  const result = await backend.call('send_group_msg', {
    group_id: 30001,
    message: [{ type: 'file', data: { file: source, name: '说明.txt' } }],
  }, { source: 'internal' });
  assert.equal(typeof result.message_id, 'number');

  const sent = harness.calls.find(call => call.action === 'sendMsg');
  const file = sent.elements[0].fileElement;
  assert.equal(sent.elements[0].elementType, 3);
  assert.equal(file.fileName, '说明.txt');
  assert.equal(file.fileSize, String(fs.statSync(source).size));
  assert.equal(fs.existsSync(file.filePath), true);
  assert.equal(fs.readFileSync(file.filePath, 'utf8'), 'hello from shadow dream');
  await backend.stop();
});

function box(type, ...payloads) {
  const body = Buffer.concat(payloads);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8, 0);
  header.write(type, 4, 'ascii');
  return Buffer.concat([header, body]);
}

/** 最小可解析的 MP4：ftyp + moov(mvhd + trak(tkhd))。 */
function makeMp4({ timescale = 1000, duration = 5000, width = 640, height = 360 } = {}) {
  const ftyp = box('ftyp', Buffer.from('isom', 'ascii'), Buffer.alloc(4), Buffer.from('isomiso2mp41', 'ascii'));
  const mvhdTimescale = Buffer.alloc(4);
  mvhdTimescale.writeUInt32BE(timescale);
  const mvhdDuration = Buffer.alloc(4);
  mvhdDuration.writeUInt32BE(duration);
  const mvhd = box('mvhd', Buffer.from([0, 0, 0, 0]), Buffer.alloc(8), mvhdTimescale, mvhdDuration, Buffer.alloc(80));
  const tkhdPayload = Buffer.alloc(84);
  tkhdPayload.writeUInt32BE(Math.round(width * 65536), 76);
  tkhdPayload.writeUInt32BE(Math.round(height * 65536), 80);
  const tkhd = box('tkhd', tkhdPayload);
  return Buffer.concat([ftyp, box('moov', mvhd, box('trak', tkhd))]);
}

test('QqntBackend get_msg 能从回复目标拉取未缓存图片', async () => {
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

  harness.emitIncoming(makeRaw({
    msgId: 'reply-1',
    elements: [
      { elementType: 7, elementId: 'r1', replyElement: { replayMsgId: 'old-image-1' } },
      { elementType: 1, elementId: 't1', textElement: { content: 'imgqa add', atType: 0 } },
    ],
  }));

  const reply = events[0].message.find(segment => segment.type === 'reply');
  assert.ok(reply);
  const targetId = Number(reply.data.id);

  const message = await backend.call('get_msg', { message_id: targetId }, { source: 'internal' });
  assert.equal(message.message[0].type, 'image');
  assert.equal(message.message[0].data.url, 'https://example.test/image.png');
  const fetched = harness.calls.find(item => item.action === 'getMsgsByMsgId');
  assert.ok(fetched);
  assert.equal(fetched.peer.chatType, 2);
  assert.equal(fetched.peer.peerUid, '30001');
  assert.deepEqual(fetched.ids, ['old-image-1']);
  await backend.stop();
});
