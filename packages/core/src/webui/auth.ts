import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SESSION_COOKIE = 'shadowdream_webui';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LOGIN_FAILURES = 10;
const FAILURE_WINDOW_MS = 60 * 1000;
const sessions = new Map<string, { expires: number; fingerprint: string }>();
const failures = new Map<string, { count: number; resetAt: number }>();

function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cookieValue(req: IncomingMessage, name: string): string {
  const header = req.headers.cookie;
  if (typeof header !== 'string') return '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return '';
      }
    }
  }
  return '';
}

function requestIsHttps(req: IncomingMessage): boolean {
  const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  return proto === 'https' || Boolean((req.socket as { encrypted?: boolean }).encrypted);
}

function cookieHeader(id: string, maxAgeSeconds: number, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(id)}`,
    'Path=/webui',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** 校验当前请求是否携带有效的 WebUI 登录 session。 */
export function hasWebUiSession(req: IncomingMessage, token: string): boolean {
  if (!token) return true;
  const id = cookieValue(req, SESSION_COOKIE);
  if (!id) return false;
  const session = sessions.get(id);
  if (!session) return false;
  if (session.expires <= Date.now() || session.fingerprint !== fingerprint(token)) {
    sessions.delete(id);
    return false;
  }
  return true;
}

/** 登录成功后签发 HttpOnly session cookie。 */
export function issueWebUiSession(req: IncomingMessage, res: ServerResponse, token: string): void {
  const id = randomBytes(32).toString('base64url');
  sessions.set(id, { expires: Date.now() + SESSION_TTL_MS, fingerprint: fingerprint(token) });
  res.setHeader('Set-Cookie', cookieHeader(id, Math.floor(SESSION_TTL_MS / 1000), requestIsHttps(req)));
}

/** 退出登录并清掉 cookie。 */
export function clearWebUiSession(req: IncomingMessage, res: ServerResponse): void {
  const id = cookieValue(req, SESSION_COOKIE);
  if (id) sessions.delete(id);
  res.setHeader('Set-Cookie', cookieHeader('', 0, requestIsHttps(req)));
}

/** 简单的按来源 IP 限速，防止公网暴力猜 token。 */
export function webUiLoginRateLimited(req: IncomingMessage): boolean {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const item = failures.get(key);
  if (!item || item.resetAt <= now) {
    failures.delete(key);
    return false;
  }
  return item.count >= MAX_LOGIN_FAILURES;
}

export function recordWebUiLoginFailure(req: IncomingMessage): void {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const item = failures.get(key);
  if (!item || item.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
    return;
  }
  item.count += 1;
}

export function resetWebUiLoginFailures(req: IncomingMessage): void {
  failures.delete(req.socket.remoteAddress || 'unknown');
}
