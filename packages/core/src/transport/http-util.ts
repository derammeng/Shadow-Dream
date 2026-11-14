import type { IncomingMessage, ServerResponse } from 'node:http';

export const MAX_BODY_BYTES = 16 * 1024 * 1024;

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(payload));
  res.end(payload);
}

export function sendText(res: ServerResponse, status: number, body: string, contentType = 'text/plain; charset=utf-8'): void {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export function methodNotAllowed(res: ServerResponse, allow: string): void {
  res.statusCode = 405;
  res.setHeader('Allow', allow);
  res.end('method not allowed');
}

export async function readBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`请求体超过 ${limit} 字节`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJson(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<unknown> {
  const raw = await readBody(req, limit);
  if (raw.length === 0) return {};
  const text = raw.toString('utf8').replace(/^\uFEFF/, '').trim();
  if (!text) return {};
  const type = String(req.headers['content-type'] ?? '');
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`不是合法 JSON：${(error as Error).message}`);
  }
}

/**
 * GET 查询参数转 JSON。数字、布尔和 JSON 字面量会被还原，
 * 其余保持字符串，方便 `GET /get_group_info?group_id=123` 这类调用。
 */
export function parseQueryValue(value: string): unknown {
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+$/.test(value)) {
    const num = Number(value);
    if (Number.isSafeInteger(num)) return num;
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  if (
    (value.startsWith('{') && value.endsWith('}'))
    || (value.startsWith('[') && value.endsWith(']'))
    || (value.startsWith('"') && value.endsWith('"'))
  ) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

export function queryToParams(url: URL): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of url.searchParams) {
    if (key === 'access_token') continue;
    params[key] = parseQueryValue(value);
  }
  return params;
}

export function applyCors(req: IncomingMessage, res: ServerResponse, cors: string[]): void {
  const origin = String(req.headers.origin ?? '');
  const allowAll = cors.includes('*');
  if (allowAll) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && cors.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Access-Token, X-Signature');
  res.setHeader('Access-Control-Max-Age', '86400');
}
