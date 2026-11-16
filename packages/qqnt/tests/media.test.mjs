import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// 用 release 里的 CJS 版本，顺带验证插件打包后依赖（silk-wasm 等）能被解析。
const media = require('../release/shadowdream/media.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shadowdream-test-'));

/** 一张 2x3 的 PNG，宽高写进 IHDR 便于校验解析。 */
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
    chunk('IDAT', Buffer.alloc(6)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeWav({ sampleRate = 24000, seconds = 0.5, channels = 1 } = {}) {
  const frames = Math.floor(sampleRate * seconds);
  const data = Buffer.alloc(frames * channels * 2);
  for (let i = 0; i < frames * channels; i++) {
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

test('detectImage 识别 PNG / JPEG / GIF / WebP 的尺寸', () => {
  const png = media.detectImage(makePng(12, 34));
  assert.deepEqual(
    { format: png.format, width: png.width, height: png.height, picType: png.picType },
    { format: 'png', width: 12, height: 34, picType: 1001 },
  );

  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  assert.equal(media.detectImage(gif).picType, 2000);
  assert.equal(media.detectImage(gif).width, 1);

  // 最小 JPEG：SOI + APP0 + SOF0(高 7 宽 9) + EOI
  const jpegParts = [
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x07, 0x00, 0x09, 0x03]),
    Buffer.alloc(9),
    Buffer.from([0xff, 0xd9]),
  ];
  const jpeg = media.detectImage(Buffer.concat(jpegParts));
  assert.deepEqual({ format: jpeg.format, width: jpeg.width, height: jpeg.height }, { format: 'jpeg', width: 9, height: 7 });

  // VP8X：RIFF/WEBP 头 + 1 字节 flags + 3 字节保留 + 3 字节宽-1 + 3 字节高-1
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0, 'ascii');
  webp.write('WEBP', 8, 'ascii');
  webp.write('VP8X', 12, 'ascii');
  webp.writeUIntLE(10, 16, 4);
  webp.writeUIntLE(10, 24, 3);
  webp.writeUIntLE(19, 27, 3);
  const info = media.detectImage(webp);
  assert.equal(info.format, 'webp');
  assert.equal(info.width, 11);
  assert.equal(info.height, 20);

  assert.equal(media.detectImage(Buffer.from('not an image')), null);
});

test('loadMediaBytes 支持本地路径、file:// 与 base64://', async () => {
  const png = makePng(2, 3);
  const file = path.join(tmpDir, 'a.png');
  fs.writeFileSync(file, png);

  const fromPath = await media.loadMediaBytes(file, 'image');
  assert.equal(fromPath.bytes.length, png.length);
  assert.equal(fromPath.fileName, 'a.png');

  const fromFileUrl = await media.loadMediaBytes(`file://${file.replace(/\\/g, '/')}`, 'image');
  assert.equal(fromFileUrl.bytes.length, png.length);

  const fromBase64 = await media.loadMediaBytes(`base64://${png.toString('base64')}`, 'image');
  assert.equal(fromBase64.bytes.length, png.length);

  await assert.rejects(() => media.loadMediaBytes('', 'image'), error => error.retcode === 100);
  await assert.rejects(
    () => media.loadMediaBytes(path.join(tmpDir, 'missing.png'), 'image'),
    error => error.retcode === 100,
  );
});

test('decodeWav 解析采样率/声道并混成单声道', () => {
  const wav = makeWav({ sampleRate: 11025, seconds: 0.1, channels: 2 });
  const pcm = media.decodeWav(wav);
  assert.equal(pcm.sampleRate, 11025);
  assert.equal(pcm.samples.length, Math.floor(11025 * 0.1));
  assert.ok(pcm.samples.every(value => Number.isInteger(value)));
});

test('resampleMono 输出长度按比例变化', () => {
  const input = new Int16Array(11025);
  for (let i = 0; i < input.length; i++) input[i] = i % 1000;
  const out = media.resampleMono(input, 11025, 24000);
  assert.equal(out.length, 24000);
  assert.equal(media.resampleMono(input, 24000, 24000), input);
});

test('toSilk：wav / silk 输入都能得到可用的 SILK', async () => {
  const wav = makeWav({ sampleRate: 11025, seconds: 0.6 });
  const result = await media.toSilk(wav, 'a.wav');
  assert.equal(result.converted, true);
  assert.equal(media.isSilk(result.silk), true);
  // 0.6 秒的语音约 3~6KB，出现几百 KB 说明采样率没处理对。
  assert.ok(result.silk.length > 500, `silk 太小：${result.silk.length}`);
  assert.ok(result.silk.length < 20_000, `silk 太大：${result.silk.length}`);
  assert.ok(result.durationMs >= 500 && result.durationMs <= 800, `时长异常：${result.durationMs}`);

  const passthrough = await media.toSilk(result.silk, 'a.silk');
  assert.equal(passthrough.converted, false);
  assert.equal(passthrough.silk.length, result.silk.length);
});

test('toSilk：无法识别的音频明确报 1401', async () => {
  await assert.rejects(
    () => media.toSilk(Buffer.from('not audio at all'), 'a.bin'),
    error => error.retcode === 1401,
  );
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
  const mvhd = box('mvhd', Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // version 0 + flags
    Buffer.alloc(8), // creation / modification
    (() => { const b = Buffer.alloc(4); b.writeUInt32BE(timescale); return b; })(),
    (() => { const b = Buffer.alloc(4); b.writeUInt32BE(duration); return b; })(),
    Buffer.alloc(80),
  ]));
  const tkhdPayload = Buffer.alloc(84);
  tkhdPayload[0] = 0;
  tkhdPayload.writeUInt32BE(Math.round(width * 65536), 76);
  tkhdPayload.writeUInt32BE(Math.round(height * 65536), 80);
  const tkhd = box('tkhd', tkhdPayload);
  const moov = box('moov', mvhd, box('trak', tkhd), box('trak', tkhd));
  return Buffer.concat([ftyp, moov]);
}

test('detectVideo：解析 MP4 的时长与尺寸', () => {
  const info = media.detectVideo(makeMp4(), 'a.mp4');
  assert.equal(info.format, 2);
  assert.equal(info.parsed, true);
  assert.equal(Math.round(info.durationSec), 5);
  assert.equal(info.width, 640);
  assert.equal(info.height, 360);
});

test('detectVideo：解析不出容器时退回默认值而不是报错', () => {
  const info = media.detectVideo(Buffer.from('not a real video'), 'a.mp4');
  assert.equal(info.format, 2);
  assert.equal(info.parsed, false);
  assert.ok(info.width > 0 && info.height > 0);
  assert.ok(info.durationSec > 0);
});

test('detectVideo：不支持的容器明确报 1401', () => {
  assert.throws(
    () => media.detectVideo(Buffer.from('whatever'), 'a.flv'),
    error => error.retcode === 1401,
  );
});

test('createVideoThumbnail：生成可识别的 PNG 封面', () => {
  const thumb = media.createVideoThumbnail();
  const info = media.detectImage(thumb);
  assert.equal(info.format, 'png');
  assert.equal(info.width, 320);
  assert.equal(info.height, 180);
});
