import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export function extractToken(req: IncomingMessage, url: URL): string {
  const header = req.headers.authorization;
  if (typeof header === 'string') {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match?.[1]) return match[1];
  }
  const alt = req.headers['x-access-token'];
  if (typeof alt === 'string' && alt) return alt;
  return url.searchParams.get('access_token') ?? '';
}

/** 空 token 表示不鉴权，适合只监听 127.0.0.1 的本地部署。 */
export function checkToken(expected: string, actual: string): boolean {
  if (!expected) return true;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unauthorizedBody(echo?: unknown): Record<string, unknown> {
  return {
    status: 'failed',
    retcode: 104,
    data: null,
    message: 'access token 无效',
    wording: '鉴权失败',
    ...(echo === undefined ? {} : { echo }),
  };
}
