import { createHmac } from 'node:crypto';
import type { HttpPostConfig } from '../config/schema.js';
import type { OneBotEvent } from '../types/onebot.js';
import type { Logger } from '../util/logger.js';

export interface HttpPostOptions {
  targets: HttpPostConfig[];
  logger: Logger;
  selfId: number;
}

/**
 * OneBot 11 HTTP POST：把事件推给业务端，带可选 HMAC-SHA1 签名。
 */
export class HttpPostTransport {
  private readonly failures = new Map<string, number>();

  constructor(private readonly options: HttpPostOptions) {}

  get targets(): HttpPostConfig[] {
    return this.options.targets;
  }

  /** 不阻塞事件总线；失败只记录，不重试，避免业务端卡死整个 bot。 */
  send(event: OneBotEvent): void {
    const body = JSON.stringify(event);
    for (const target of this.options.targets) {
      void this.post(target, body);
    }
  }

  private async post(target: HttpPostConfig, body: string): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Shadow Dream/0.1.0',
      'X-Self-ID': String(this.options.selfId),
    };
    if (target.secret) {
      const signature = createHmac('sha1', target.secret).update(body).digest('hex');
      headers['X-Signature'] = `sha1=${signature}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), target.timeoutMs ?? 5000);
    try {
      const response = await fetch(target.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      this.failures.set(target.url, 0);
    } catch (error) {
      const count = (this.failures.get(target.url) ?? 0) + 1;
      this.failures.set(target.url, count);
      // 连续失败时只在前几次和每 30 次记录，防止日志风暴。
      if (count <= 3 || count % 30 === 0) {
        this.options.logger.warn(
          `HTTP POST 失败 ${target.url}（第 ${count} 次）：${(error as Error).message}`,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
