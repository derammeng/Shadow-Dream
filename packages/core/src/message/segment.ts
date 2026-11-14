import type { MessageInput, MessageSegment } from '../types/onebot.js';

const CQ_ESCAPE: Array<[RegExp, string]> = [
  [/&/g, '&amp;'],
  [/\[/g, '&#91;'],
  [/\]/g, '&#93;'],
  [/,/g, '&#44;'],
];

/** 反转义 CQ 文本与参数。`&amp;` 必须最后处理。 */
export function unescapeCQ(text: string): string {
  return text
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&#44;/g, ',')
    .replace(/&amp;/g, '&');
}

/** 转义一个 CQ 参数值。 */
export function escapeCQParam(value: unknown): string {
  let text = String(value ?? '');
  for (const [pattern, replacement] of CQ_ESCAPE) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

/** 文本消息段里的文本同样需要转义，否则会被当成 CQ 码。 */
export function escapeCQText(text: string): string {
  return escapeCQParam(text);
}

export function textSegment(text: string): MessageSegment {
  return { type: 'text', data: { text } };
}

export function atSegment(qq: number | 'all', name?: string): MessageSegment {
  const data: Record<string, unknown> = { qq: String(qq) };
  if (name) data.name = name;
  return { type: 'at', data };
}

export function imageSegment(file: string, extra: Record<string, unknown> = {}): MessageSegment {
  return { type: 'image', data: { file, ...extra } };
}

export function replySegment(id: number | string): MessageSegment {
  return { type: 'reply', data: { id: String(id) } };
}

export function faceSegment(id: number | string): MessageSegment {
  return { type: 'face', data: { id: String(id) } };
}

/**
 * 将消息段数组序列化为 CQ 码字符串。
 *
 * - text 段的 text 会被转义；
 * - 其他段的所有参数都会被转义；
 * - 值为 undefined / null 的参数直接丢弃。
 */
export function toCQCode(message: MessageSegment[]): string {
  let out = '';
  for (const segment of message) {
    if (!segment || typeof segment.type !== 'string') continue;
    if (segment.type === 'text') {
      out += escapeCQText(String(segment.data?.text ?? ''));
      continue;
    }
    const params: string[] = [];
    for (const [key, value] of Object.entries(segment.data ?? {})) {
      if (value === undefined || value === null) continue;
      params.push(`${key}=${escapeCQParam(value)}`);
    }
    out += params.length > 0
      ? `[CQ:${segment.type},${params.join(',')}]`
      : `[CQ:${segment.type}]`;
  }
  return out;
}

const CQ_PATTERN = /\[CQ:([^,\]]+)((?:,[^\]]*)?)\]/g;

/**
 * 解析 CQ 码字符串。无法识别的片段按普通文本处理，避免让脏数据
 * 直接变成异常把整条消息丢掉。
 */
export function parseCQCode(input: string): MessageSegment[] {
  const result: MessageSegment[] = [];
  let cursor = 0;

  const pushText = (raw: string): void => {
    if (!raw) return;
    const text = unescapeCQ(raw);
    if (text) result.push(textSegment(text));
  };

  for (const match of input.matchAll(CQ_PATTERN)) {
    const index = match.index ?? 0;
    pushText(input.slice(cursor, index));

    const type = match[1]?.trim() ?? '';
    const rawParams = match[2] ?? '';
    const data: Record<string, string> = {};

    if (rawParams.startsWith(',')) {
      for (const pair of rawParams.slice(1).split(',')) {
        if (!pair) continue;
        const eq = pair.indexOf('=');
        if (eq < 0) {
          data[unescapeCQ(pair)] = '';
          continue;
        }
        const key = unescapeCQ(pair.slice(0, eq));
        const value = unescapeCQ(pair.slice(eq + 1));
        if (key) data[key] = value;
      }
    }

    if (type) result.push({ type, data });
    cursor = index + match[0].length;
  }

  pushText(input.slice(cursor));
  return result;
}

/**
 * 把用户输入统一成消息段数组。
 * `autoEscape` 为 true 时字符串按纯文本处理，不做 CQ 解析。
 */
export function normalizeMessage(
  message: MessageInput | MessageSegment | null | undefined,
  autoEscape = false,
): MessageSegment[] {
  if (message === null || message === undefined) return [];
  if (Array.isArray(message)) {
    return message
      .filter((segment): segment is MessageSegment =>
        Boolean(segment) && typeof segment === 'object' && typeof segment.type === 'string')
      .map(segment => ({
        type: segment.type,
        data: segment.data && typeof segment.data === 'object' ? { ...segment.data } : {},
      }));
  }
  if (typeof message === 'object') {
    return normalizeMessage([message as MessageSegment], autoEscape);
  }
  if (typeof message !== 'string') return [];
  return autoEscape ? (message ? [textSegment(message)] : []) : parseCQCode(message);
}

/** 用于日志/通知的纯文本近似表示。 */
export function messageToPlainText(message: MessageSegment[]): string {
  let out = '';
  for (const segment of message) {
    const data = segment.data ?? {};
    switch (segment.type) {
      case 'text':
        out += String(data.text ?? '');
        break;
      case 'at':
        out += data.qq === 'all' ? '@全体成员' : `@${String(data.qq ?? '')}`;
        break;
      case 'face':
        out += `[表情:${String(data.id ?? '')}]`;
        break;
      case 'image':
        out += '[图片]';
        break;
      case 'record':
        out += '[语音]';
        break;
      case 'video':
        out += '[视频]';
        break;
      case 'file':
        out += `[文件:${String(data.name ?? data.file ?? '')}]`;
        break;
      case 'reply':
        out += `[回复:${String(data.id ?? '')}]`;
        break;
      default:
        out += `[${segment.type}]`;
        break;
    }
  }
  return out;
}

/** 深拷贝消息段，防止传输层之间共享可变对象。 */
export function cloneMessage(message: MessageSegment[]): MessageSegment[] {
  return message.map(segment => ({ type: segment.type, data: { ...segment.data } }));
}
