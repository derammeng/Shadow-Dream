import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCQParam,
  messageToPlainText,
  normalizeMessage,
  parseCQCode,
  toCQCode,
  unescapeCQ,
} from '../src/message/segment.js';

test('CQ 转义与反转义', () => {
  const raw = 'a&amp;b&#91;c&#93;&#44;d';
  assert.equal(unescapeCQ(raw), 'a&b[c],d');
  assert.equal(escapeCQParam('a&b[c],d'), 'a&amp;b&#91;c&#93;&#44;d');
});

test('普通文本解析', () => {
  assert.deepEqual(parseCQCode('你好，世界'), [
    { type: 'text', data: { text: '你好，世界' } },
  ]);
  assert.deepEqual(parseCQCode(''), []);
});

test('混合 CQ 码解析', () => {
  const segments = parseCQCode('hi[CQ:at,qq=123,name=小梦] 看[CQ:image,file=a&#44;b.png]');
  assert.deepEqual(segments, [
    { type: 'text', data: { text: 'hi' } },
    { type: 'at', data: { qq: '123', name: '小梦' } },
    { type: 'text', data: { text: ' 看' } },
    { type: 'image', data: { file: 'a,b.png' } },
  ]);
});

test('带等号、空参数和未知类型的 CQ 码', () => {
  assert.deepEqual(parseCQCode('[CQ:json,data={"a":"b=c"}]'), [
    { type: 'json', data: { data: '{"a":"b=c"}' } },
  ]);
  assert.deepEqual(parseCQCode('[CQ:poke]'), [{ type: 'poke', data: {} }]);
  assert.deepEqual(parseCQCode('[CQ:unknown,x=1]'), [{ type: 'unknown', data: { x: '1' } }]);
});

test('CQ 码序列化与 roundtrip', () => {
  const message = [
    { type: 'text' as const, data: { text: 'a[b]c,d&e' } },
    { type: 'at' as const, data: { qq: '123', name: '小,梦' } },
    { type: 'image' as const, data: { file: 'x,y.png' } },
  ];
  const cq = toCQCode(message);
  assert.equal(cq, 'a&#91;b&#93;c&#44;d&amp;e[CQ:at,qq=123,name=小&#44;梦][CQ:image,file=x&#44;y.png]');
  assert.deepEqual(parseCQCode(cq), message);
});

test('normalizeMessage 支持 auto_escape 与数组', () => {
  assert.deepEqual(normalizeMessage('a[CQ:face,id=1]'), [
    { type: 'text', data: { text: 'a' } },
    { type: 'face', data: { id: '1' } },
  ]);
  assert.deepEqual(normalizeMessage('a[CQ:face,id=1]', true), [
    { type: 'text', data: { text: 'a[CQ:face,id=1]' } },
  ]);
  assert.deepEqual(normalizeMessage([{ type: 'text', data: { text: 'x' } }]), [
    { type: 'text', data: { text: 'x' } },
  ]);
  assert.deepEqual(normalizeMessage(null), []);
});

test('纯文本预览', () => {
  assert.equal(
    messageToPlainText([
      { type: 'text', data: { text: '你好 ' } },
      { type: 'at', data: { qq: 'all' } },
      { type: 'image', data: { file: 'x' } },
      { type: 'face', data: { id: '1' } },
    ]),
    '你好 @全体成员[图片][表情:1]',
  );
});
