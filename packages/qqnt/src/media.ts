import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ActionError } from '@shadowdream/core';

declare const require: NodeRequire;

/**
 * QQNT 插件的媒体发送支撑：把 OneBot 的 image / record 段变成可以直接交给
 * QQ 的 picElement / pttElement。
 *
 * 参考实现里图片和语音都是先写进 QQ 自己的富媒体缓存目录，再让 QQ 在
 * sendMsg 时完成上传；这里只做同一件事：解析来源 → 识别格式 → 落到缓存路径。
 */

export type MediaKind = 'image' | 'record' | 'video' | 'file';

export interface MediaBytes {
  bytes: Buffer;
  fileName: string;
  /** 来源摘要，只用于日志和报错。 */
  source: string;
}

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_RECORD_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

function limitOf(kind: MediaKind): number {
  switch (kind) {
    case 'image': return MAX_IMAGE_BYTES;
    case 'record': return MAX_RECORD_BYTES;
    case 'video': return MAX_VIDEO_BYTES;
    default: return MAX_FILE_BYTES;
  }
}

/** QQ 的 PicType 枚举，见 NTQQ 的图片类型定义。 */
export const PIC_TYPE = {
  jpeg: 1000,
  png: 1001,
  webp: 1002,
  progressiveJpeg: 1003,
  bmp: 1005,
  gif: 2000,
  apng: 2001,
} as const;

export interface ImageInfo {
  format: 'png' | 'jpeg' | 'gif' | 'webp' | 'bmp';
  width: number;
  height: number;
  picType: number;
  ext: string;
}

export interface SilkResult {
  silk: Buffer;
  durationMs: number;
  /** 是否做过转码（false 表示本来就是 silk）。 */
  converted: boolean;
}

/**
 * 把一个 OneBot 媒体值解析成字节。
 *
 * 支持 OneBot / Koishi / AstrBot 常见的四种写法：
 * - `base64://<payload>`（也接受 `base64://base64://...` 这种重复前缀）
 * - `http(s)://...`（20 秒超时，限制体积）
 * - `file:///abs/path` 或普通绝对/相对路径
 */
export async function loadMediaBytes(file: string, kind: MediaKind): Promise<MediaBytes> {
  const raw = String(file ?? '').trim();
  if (!raw) throw ActionError.badRequest('媒体段缺少 file');
  const limit = limitOf(kind);

  if (raw.startsWith('base64://')) {
    const payload = raw.slice('base64://'.length).replace(/^base64:\/\//, '');
    const bytes = Buffer.from(payload.replace(/\s+/g, ''), 'base64');
    if (bytes.length === 0) throw ActionError.badRequest('base64:// 内容为空或无法解码');
    if (bytes.length > limit) throw ActionError.badRequest(`媒体超过 ${Math.round(limit / 1024 / 1024)}MB 上限`);
    return { bytes, fileName: '', source: 'base64' };
  }

  if (/^https?:\/\//i.test(raw)) {
    const response = await fetchWithTimeout(raw, FETCH_TIMEOUT_MS);
    if (!response.ok) {
      throw ActionError.badRequest(`下载媒体失败：HTTP ${response.status}`);
    }
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > limit) {
      throw ActionError.badRequest(`媒体超过 ${Math.round(limit / 1024 / 1024)}MB 上限`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw ActionError.badRequest('下载到的媒体内容为空');
    if (buffer.length > limit) {
      throw ActionError.badRequest(`媒体超过 ${Math.round(limit / 1024 / 1024)}MB 上限`);
    }
    return { bytes: buffer, fileName: fileNameFromUrl(raw), source: raw };
  }

  const localPath = raw.startsWith('file://') ? fileUrlToPath(raw) : raw;
  const resolved = path.isAbsolute(localPath) ? localPath : path.resolve(process.cwd(), localPath);
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(resolved);
  } catch (error) {
    throw ActionError.badRequest(`读取媒体失败：${resolved}（${(error as Error).message}）`);
  }
  if (!stat.isFile()) throw ActionError.badRequest(`媒体路径不是文件：${resolved}`);
  if (stat.size === 0) throw ActionError.badRequest(`媒体文件为空：${resolved}`);
  if (stat.size > limit) throw ActionError.badRequest(`媒体超过 ${Math.round(limit / 1024 / 1024)}MB 上限`);
  const bytes = await fsp.readFile(resolved);
  return { bytes, fileName: path.basename(resolved), source: resolved };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    // 一部分图床 / CDN 会拒绝默认 UA，这里带一个正常的标识。
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShadowDream/0.3; +https://github.com/derammeng/Shadow-Dream)',
        Accept: 'image/*,audio/*,*/*;q=0.8',
      },
    });
  } catch (error) {
    const message = (error as Error).name === 'AbortError'
      ? `下载媒体超时（${timeoutMs}ms）`
      : `下载媒体失败：${(error as Error).message}`;
    throw ActionError.badRequest(message);
  } finally {
    clearTimeout(timer);
  }
}

function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const base = path.basename(decodeURIComponent(parsed.pathname));
    return base && base !== '/' ? base : '';
  } catch {
    return '';
  }
}

function fileUrlToPath(url: string): string {
  const withoutScheme = url.slice('file://'.length);
  // Windows 上 file:///C:/x 会变成 /C:/x，去掉多余的前导斜杠。
  if (/^\/[a-zA-Z]:[\\/]/.test(withoutScheme)) return decodeURIComponent(withoutScheme.slice(1));
  const decoded = decodeURIComponent(withoutScheme);
  // file://host/x 这种非本机路径只取路径部分。
  return decoded.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(decoded)
    ? decoded
    : decoded.replace(/^[^/]*\//, '/');
}

export function md5Hex(bytes: Buffer): string {
  return crypto.createHash('md5').update(bytes).digest('hex');
}

/** 识别图片格式与尺寸；识别不了返回 null。 */
export function detectImage(bytes: Buffer): ImageInfo | null {
  if (bytes.length < 16) return null;

  // PNG：IHDR 固定从第 16 字节开始，宽高都是大端 32 位。
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const isApng = bytes.includes('acTL');
    return {
      format: 'png',
      width,
      height,
      picType: isApng ? PIC_TYPE.apng : PIC_TYPE.png,
      ext: '.png',
    };
  }

  // GIF：宽高是小端 16 位。
  if (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return {
      format: 'gif',
      width: bytes.readUInt16LE(6),
      height: bytes.readUInt16LE(8),
      picType: PIC_TYPE.gif,
      ext: '.gif',
    };
  }

  // BMP：文件头里宽高是小端 32 位，高度可能为负（自上而下）。
  if (bytes[0] === 0x42 && bytes[1] === 0x4d && bytes.length >= 26) {
    return {
      format: 'bmp',
      width: Math.abs(bytes.readInt32LE(18)),
      height: Math.abs(bytes.readInt32LE(22)),
      picType: PIC_TYPE.bmp,
      ext: '.bmp',
    };
  }

  if (bytes.subarray(0, 2).toString('ascii') === 'BM') {
    return {
      format: 'bmp',
      width: Math.abs(bytes.readInt32LE(18)),
      height: Math.abs(bytes.readInt32LE(22)),
      picType: PIC_TYPE.bmp,
      ext: '.bmp',
    };
  }

  // WebP：RIFF....WEBP，再按 VP8 / VP8L / VP8X 分别取尺寸。
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    const chunk = bytes.subarray(12, 16).toString('ascii');
    if (chunk === 'VP8X' && bytes.length >= 30) {
      const width = 1 + bytes.readUIntLE(24, 3);
      const height = 1 + bytes.readUIntLE(27, 3);
      return { format: 'webp', width, height, picType: PIC_TYPE.webp, ext: '.webp' };
    }
    if (chunk === 'VP8 ' && bytes.length >= 30) {
      const width = bytes.readUInt16LE(26) & 0x3fff;
      const height = bytes.readUInt16LE(28) & 0x3fff;
      return { format: 'webp', width, height, picType: PIC_TYPE.webp, ext: '.webp' };
    }
    if (chunk === 'VP8L' && bytes.length >= 25) {
      const bits = bytes.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { format: 'webp', width, height, picType: PIC_TYPE.webp, ext: '.webp' };
    }
    return { format: 'webp', width: 0, height: 0, picType: PIC_TYPE.webp, ext: '.webp' };
  }

  // JPEG：扫描 SOFn 段拿尺寸。
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === undefined || marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = bytes.readUInt16BE(offset + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return {
          format: 'jpeg',
          width: bytes.readUInt16BE(offset + 7),
          height: bytes.readUInt16BE(offset + 5),
          // 渐进式 JPEG 用 1003，普通 JPEG 用 1000。
          picType: marker === 0xc2 ? PIC_TYPE.progressiveJpeg : PIC_TYPE.jpeg,
          ext: '.jpg',
        };
      }
      offset += 2 + length;
    }
    return { format: 'jpeg', width: 0, height: 0, picType: PIC_TYPE.jpeg, ext: '.jpg' };
  }

  return null;
}

const SILK_HEAD = Buffer.from('#!SILK_V3', 'ascii');

export function isSilk(bytes: Buffer): boolean {
  if (bytes.length < SILK_HEAD.length) return false;
  const head = bytes.subarray(0, SILK_HEAD.length);
  if (head.equals(SILK_HEAD)) return true;
  return bytes.length > SILK_HEAD.length
    && bytes.subarray(1, 1 + SILK_HEAD.length).equals(SILK_HEAD);
}

function isWav(bytes: Buffer): boolean {
  return bytes.length > 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WAVE';
}

function isMp3(bytes: Buffer): boolean {
  if (bytes.length < 4) return false;
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3') return true;
  return bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
}

function isAmr(bytes: Buffer): boolean {
  return bytes.length > 6 && bytes.subarray(0, 6).toString('ascii') === '#!AMR\n';
}

function isOgg(bytes: Buffer): boolean {
  return bytes.length > 4 && bytes.subarray(0, 4).toString('ascii') === 'OggS';
}

/**
 * 把音频转成 QQ 需要的 SILK。
 *
 * QQ 的语音消息只接受 SILK（formatType=1）。Koishi / AstrBot 这类后端常见
 * 的输入是 silk / wav / mp3，这里全部覆盖；amr 和 ogg 明确报错而不是赌。
 */
export async function toSilk(bytes: Buffer, fileName: string): Promise<SilkResult> {
  const silk = await loadSilkModule();

  if (isSilk(bytes)) {
    const durationMs = safeDuration(silk, bytes);
    return { silk: bytes, durationMs, converted: false };
  }

  if (isWav(bytes)) {
    const wav = decodeWav(bytes);
    if (!wav) throw ActionError.badRequest(`无法解析 WAV：${fileName}`);
    const encoded = await encodePcmToSilk(silk, wav);
    return { silk: Buffer.from(encoded.data), durationMs: Math.round(encoded.duration), converted: true };
  }

  if (isMp3(bytes)) {
    const pcm = await decodeMp3(bytes);
    const encoded = await encodePcmToSilk(silk, pcm);
    return { silk: Buffer.from(encoded.data), durationMs: Math.round(encoded.duration), converted: true };
  }

  if (isAmr(bytes)) {
    throw ActionError.unsupported(`暂不支持 AMR 语音（${fileName}），请转成 silk / wav / mp3 再发送`);
  }
  if (isOgg(bytes)) {
    throw ActionError.unsupported(`暂不支持 OGG 语音（${fileName}），请转成 silk / wav / mp3 再发送`);
  }
  throw ActionError.unsupported(`无法识别的语音格式（${fileName}），支持 silk / wav / mp3`);
}

/** silk-wasm 只认这几个采样率，其余必须先重采样，否则会编出无法播放的大文件。 */
const SILK_SAMPLE_RATES = new Set([8000, 12000, 16000, 24000, 32000, 44100, 48000]);
const TARGET_SAMPLE_RATE = 24000;

async function encodePcmToSilk(
  silk: SilkModule,
  pcm: PcmData,
): Promise<{ data: Uint8Array; duration: number }> {
  const rate = SILK_SAMPLE_RATES.has(pcm.sampleRate) ? pcm.sampleRate : TARGET_SAMPLE_RATE;
  const samples = rate === pcm.sampleRate
    ? pcm.samples
    : resampleMono(pcm.samples, pcm.sampleRate, rate);
  if (samples.length === 0) throw ActionError.badRequest('语音内容为空');
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  return silk.encode(bytes, rate);
}

/** 线性插值重采样；语音场景够用，也避免了额外的原生依赖。 */
export function resampleMono(input: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = toRate / fromRate;
  const length = Math.max(1, Math.round(input.length * ratio));
  const out = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const position = i / ratio;
    const base = Math.floor(position);
    const frac = position - base;
    const a = input[base] ?? 0;
    const b = input[base + 1] ?? a;
    out[i] = Math.round(a + (b - a) * frac);
  }
  return out;
}

/**
 * 解析 WAV（PCM 8/16/24/32 位，单/多声道）成单声道 s16le。
 * 交给 silk-wasm 前自己解析，能顺带处理 22.05k / 11.025k 这类它不支持的采样率。
 */
export function decodeWav(bytes: Buffer): PcmData | null {
  if (!isWav(bytes)) return null;
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= bytes.length) {
    const id = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ' && size >= 16 && body + 16 <= bytes.length) {
      sampleRate = bytes.readUInt32LE(body + 4);
      channels = bytes.readUInt16LE(body + 2);
      bitsPerSample = bytes.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataOffset = body;
      dataLength = Math.min(size, bytes.length - body);
      break;
    }
    offset = body + size + (size % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample || dataOffset < 0) return null;
  const frameSize = (bitsPerSample / 8) * channels;
  if (frameSize <= 0) return null;
  const frames = Math.floor(dataLength / frameSize);
  if (frames <= 0) return null;

  const samples = new Int16Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      const at = dataOffset + frame * frameSize + channel * (bitsPerSample / 8);
      sum += readSample(bytes, at, bitsPerSample);
    }
    const value = Math.round(sum / channels);
    samples[frame] = Math.max(-32768, Math.min(32767, value));
  }
  return { samples, sampleRate };
}

function readSample(bytes: Buffer, at: number, bits: number): number {
  if (bits === 8) return (bytes[at]! - 128) << 8;
  if (bits === 16) return bytes.readInt16LE(at);
  if (bits === 24) {
    const value = bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
    return value & 0x800000 ? value - 0x1000000 : value;
  }
  if (bits === 32) return bytes.readInt32LE(at) >> 16;
  return 0;
}

function safeDuration(silk: { getDuration: (data: Uint8Array) => number }, bytes: Buffer): number {
  try {
    return Math.max(0, Math.round(silk.getDuration(bytes)));
  } catch {
    return 0;
  }
}

interface SilkModule {
  encode(input: ArrayBufferView | ArrayBuffer, sampleRate: number): Promise<{ data: Uint8Array; duration: number }>;
  decode(input: ArrayBufferView | ArrayBuffer, sampleRate: number): Promise<{ data: Uint8Array; duration: number }>;
  getDuration(data: ArrayBufferView | ArrayBuffer, frameMs?: number): number;
  isSilk(data: ArrayBufferView | ArrayBuffer): boolean;
  isWav(data: ArrayBufferView | ArrayBuffer): boolean;
}

let silkModule: SilkModule | null = null;

async function loadSilkModule(): Promise<SilkModule> {
  if (silkModule) return silkModule;
  try {
    // silk-wasm 有 CJS 入口；QQ 主进程是 CommonJS，直接 require 最稳。
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const required = require('silk-wasm') as SilkModule;
    silkModule = required;
    return required;
  } catch {
    const imported = await dynamicImport('silk-wasm') as SilkModule;
    silkModule = imported;
    return imported;
  }
}

interface PcmData {
  /** 单声道 s16le 采样 */
  samples: Int16Array;
  sampleRate: number;
}

async function decodeMp3(bytes: Buffer): Promise<PcmData> {
  type DecoderCtor = new () => {
    ready: Promise<void>;
    decode(input: Uint8Array): {
      channelData: Float32Array[];
      samplesDecoded: number;
      sampleRate: number;
    };
    free(): void;
  };
  let Decoder: DecoderCtor;
  try {
    const module = await dynamicImport('mpg123-decoder') as { MPEGDecoder: DecoderCtor };
    Decoder = module.MPEGDecoder;
  } catch (error) {
    throw ActionError.unsupported(
      '当前插件缺少 mp3 解码组件（mpg123-decoder），请改发 silk / wav 语音，或重新安装完整插件包。'
      + ` ${(error as Error).message}`,
    );
  }
  const decoder = new Decoder();
  try {
    await decoder.ready;
    const decoded = decoder.decode(new Uint8Array(bytes));
    if (!decoded.samplesDecoded || decoded.channelData.length === 0) {
      throw ActionError.badRequest('mp3 解码失败：没有可用采样');
    }
    const channels = decoded.channelData.length;
    const length = decoded.channelData[0]!.length;
    const samples = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let channel = 0; channel < channels; channel++) {
        sum += decoded.channelData[channel]![i] ?? 0;
      }
      const value = Math.round((sum / channels) * 32767);
      samples[i] = Math.max(-32768, Math.min(32767, value));
    }
    return { samples, sampleRate: decoded.sampleRate };
  } finally {
    try {
      decoder.free();
    } catch {
      // ignore
    }
  }
}

/**
 * `import()` 在 CommonJS 输出里会被 tsc 改写成 require()，而 mp3 解码器是
 * 纯 ESM 包，所以用 Function 构造一个真正的动态 import。
 */
const dynamicImport: (specifier: string) => Promise<unknown> = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<unknown>;

/** QQ 富媒体缓存目录里的目标文件；拿不到缓存 API 时退到临时目录。 */
export function mediaFallbackPath(md5: string, ext: string): string {
  const dir = path.join(os.tmpdir(), 'shadowdream-media');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${md5}${ext}`);
}

export async function writeMediaFile(target: string, bytes: Buffer): Promise<string> {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, bytes);
  return target;
}

/** 清理临时目录里过期的媒体文件；插件启动时调用一次。 */
export async function cleanupFallbackMedia(maxAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  const dir = path.join(os.tmpdir(), 'shadowdream-media');
  let entries: string[];
  try {
    entries = await fsp.readdir(dir);
  } catch {
    return;
  }
  const now = Date.now();
  await Promise.all(entries.map(async entry => {
    const file = path.join(dir, entry);
    try {
      const stat = await fsp.stat(file);
      if (now - stat.mtimeMs > maxAgeMs) await fsp.unlink(file);
    } catch {
      // ignore
    }
  }));
}

/* ============ 视频 ============ */

/** QQ 的 NTVideoType 枚举。 */
export const VIDEO_FORMAT = {
  avi: 1,
  mp4: 2,
  wmv: 3,
  mkv: 4,
  rmvb: 5,
  rm: 6,
  mov: 8,
  ts: 10,
} as const;

export interface VideoInfo {
  format: number;
  /** 秒，取不到时为 0。 */
  durationSec: number;
  width: number;
  height: number;
  /** 是否解析出了真实的容器信息。 */
  parsed: boolean;
}

const VIDEO_EXT_FORMAT: Record<string, number> = {
  mp4: VIDEO_FORMAT.mp4,
  m4v: VIDEO_FORMAT.mp4,
  mov: VIDEO_FORMAT.mov,
  avi: VIDEO_FORMAT.avi,
  wmv: VIDEO_FORMAT.wmv,
  mkv: VIDEO_FORMAT.mkv,
  rmvb: VIDEO_FORMAT.rmvb,
  rm: VIDEO_FORMAT.rm,
  ts: VIDEO_FORMAT.ts,
};

/**
 * 识别视频容器并尽量读出时长 / 尺寸。
 *
 * QQ 的 videoElement 需要 fileTime / fileWidth / fileHeight 作为展示信息；
 * 这里用最小的 MP4/MOV box 解析，拿不到就用保守默认值（参考实现同样会退回默认值）。
 */
export function detectVideo(bytes: Buffer, fileName: string): VideoInfo {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  let format = VIDEO_EXT_FORMAT[ext] ?? 0;
  let durationSec = 0;
  let width = 0;
  let height = 0;
  let parsed = false;

  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = bytes.subarray(8, 12).toString('ascii');
    if (!format) format = brand === 'qt  ' ? VIDEO_FORMAT.mov : VIDEO_FORMAT.mp4;
    const info = parseMovieBoxes(bytes);
    if (info) {
      durationSec = info.durationSec;
      width = info.width;
      height = info.height;
      parsed = true;
    }
  }

  if (!format) {
    throw ActionError.unsupported(
      `不支持的视频格式（${fileName || '未知文件'}），请转成 mp4 / mov 再发送`,
    );
  }
  if (!width || !height) {
    // 取不到尺寸时用一个常见比例，避免 QQ 端显示成 0x0。
    width = 1280;
    height = 720;
  }
  if (!durationSec) durationSec = 15;
  return { format, durationSec, width, height, parsed };
}

interface MovieInfo {
  durationSec: number;
  width: number;
  height: number;
}

function readUInt64(buffer: Buffer, offset: number): number {
  const high = buffer.readUInt32BE(offset);
  const low = buffer.readUInt32BE(offset + 4);
  return high * 2 ** 32 + low;
}

function parseMovieBoxes(bytes: Buffer): MovieInfo | null {
  const moov = findBox(bytes, 0, bytes.length, 'moov');
  if (!moov) return null;
  let durationSec = 0;
  let width = 0;
  let height = 0;

  const mvhd = findBox(bytes, moov.start, moov.end, 'mvhd');
  if (mvhd) {
    const p = mvhd.start;
    const version = bytes[p];
    const timescale = version === 1 ? bytes.readUInt32BE(p + 20) : bytes.readUInt32BE(p + 12);
    const duration = version === 1 ? readUInt64(bytes, p + 24) : bytes.readUInt32BE(p + 16);
    if (timescale > 0) durationSec = duration / timescale;
  }

  const trak = findBox(bytes, moov.start, moov.end, 'trak');
  if (trak) {
    const tkhd = findBox(bytes, trak.start, trak.end, 'tkhd');
    if (tkhd) {
      const p = tkhd.start;
      const version = bytes[p];
      const offset = version === 1 ? 88 : 76;
      if (p + offset + 8 <= tkhd.end) {
        width = Math.round(bytes.readUInt32BE(p + offset) / 65536);
        height = Math.round(bytes.readUInt32BE(p + offset + 4) / 65536);
      }
    }
  }

  if (!durationSec && !width && !height) return null;
  return { durationSec, width, height };
}

interface Box {
  start: number;
  end: number;
}

function findBox(bytes: Buffer, start: number, end: number, type: string): Box | null {
  let offset = start;
  while (offset + 8 <= end) {
    let size = bytes.readUInt32BE(offset);
    const boxType = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) return null;
      size = readUInt64(bytes, offset + 8);
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) return null;
    if (boxType === type) {
      return { start: offset + header, end: offset + size };
    }
    offset += size;
  }
  return null;
}

/**
 * 生成一张 320x180 的渐变 PNG 作为视频封面兜底。
 *
 * 参考实现在拿不到 ffmpeg 时会退回一张内置缩略图；这里不引入 ffmpeg，
 * 直接用 zlib 编码一张轻量占位图，保证 videoElement 的 thumbPath 有文件。
 */
export function createVideoThumbnail(width = 320, height = 180): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width; x++) {
      const ratio = y / height;
      raw[p++] = Math.round(124 + ratio * 60);
      raw[p++] = Math.round(92 + ratio * 40);
      raw[p++] = Math.round(255 - ratio * 60);
    }
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) {
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
    }
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
    chunk('IDAT', zlibDeflate(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function zlibDeflate(data: Buffer): Buffer {
  // 运行环境是 Node（QQ 主进程），直接用 zlib。
  const zlib = require('node:zlib') as typeof import('node:zlib');
  return zlib.deflateSync(data);
}
