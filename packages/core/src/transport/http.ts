import http, { type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { HttpConfig } from '../config/schema.js';
import type { Logger } from '../util/logger.js';
import { handleWebUi } from '../webui/routes.js';
import type { WebUiHost } from '../webui/types.js';
import { checkToken, extractToken, unauthorizedBody } from './auth.js';
import { applyCors, methodNotAllowed, queryToParams, readJson, sendJson } from './http-util.js';
import type { ActionExecutor } from './types.js';

export interface HttpTransportOptions {
  config: HttpConfig;
  executor: ActionExecutor;
  webui?: WebUiHost;
  logger: Logger;
  appVersion: string;
  startedAt: number;
  onCounters?: (counters: { requests: number; errors: number }) => void;
}

/**
 * OneBot 11 HTTP API + WebUI 静态页 + /health。
 * API 永远返回 200（鉴权失败除外），错误通过 retcode 表达。
 */
export class HttpTransport {
  readonly server: Server;
  private actualPort: number;
  private requests = 0;
  private errors = 0;

  constructor(private readonly options: HttpTransportOptions) {
    this.actualPort = options.config.port;
    this.server = http.createServer((req, res) => {
      void this.handle(req, res);
    });
  }

  get port(): number {
    return this.actualPort;
  }

  get url(): string {
    return `http://${displayHost(this.options.config.host)}:${this.actualPort}`;
  }

  async start(): Promise<void> {
    if (!this.options.config.enabled) return;
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException): void => {
        this.server.off('listening', onListening);
        reject(new Error(
          error.code === 'EADDRINUSE'
            ? `HTTP 端口 ${this.actualPort} 已被占用`
            : `HTTP 服务启动失败：${error.message}`,
        ));
      };
      const onListening = (): void => {
        this.server.off('error', onError);
        const address = this.server.address();
        if (address && typeof address === 'object') this.actualPort = address.port;
        this.options.logger.info(`HTTP API 已监听 ${this.url}`);
        if (this.options.config.webui) this.options.logger.info(`WebUI: ${this.url}/webui/`);
        resolve();
      };
      this.server.once('error', onError);
      this.server.once('listening', onListening);
      this.server.listen(this.actualPort, this.options.config.host);
    });
  }

  async stop(): Promise<void> {
    if (!this.server.listening) return;
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
      // Node 的 close 不会主动断开 keep-alive 连接。
      this.server.closeAllConnections?.();
      setTimeout(() => resolve(), 1000).unref();
    });
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const config = this.options.config;
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    applyCors(req, res, config.cors);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (url.pathname === '/health') {
        sendJson(res, 200, {
          status: 'ok',
          app: 'shadowdream',
          version: this.options.appVersion,
          uptimeMs: Date.now() - this.options.startedAt,
        });
        return;
      }

      if (url.pathname === '/favicon.ico') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (config.webui && this.options.webui) {
        const handled = await handleWebUi(
          req,
          res,
          url,
          this.options.webui,
          config.webuiToken || config.accessToken,
        );
        if (handled) return;
      }

      if (req.method !== 'POST' && req.method !== 'GET') {
        methodNotAllowed(res, 'GET, POST, OPTIONS');
        return;
      }

      if (!checkToken(config.accessToken, extractToken(req, url))) {
        this.errors++;
        sendJson(res, 401, unauthorizedBody());
        return;
      }

      const parsed = await this.parseAction(req, url);
      if (!parsed.action) {
        this.errors++;
        sendJson(res, 400, {
          status: 'failed',
          retcode: 100,
          data: null,
          message: '缺少 action',
        });
        return;
      }

      this.requests++;
      this.options.onCounters?.({ requests: this.requests, errors: this.errors });
      const result = await this.options.executor.execute(parsed.action, parsed.params, {
        source: 'http',
      });
      if (parsed.echo !== undefined && result.echo === undefined) result.echo = parsed.echo;
      if (result.status === 'failed') this.errors++;
      sendJson(res, 200, result);
    } catch (error) {
      this.errors++;
      this.options.logger.warn(`HTTP 请求处理失败：${(error as Error).message}`);
      if (!res.headersSent) {
        sendJson(res, 500, {
          status: 'failed',
          retcode: 1500,
          data: null,
          message: (error as Error).message,
        });
      } else {
        res.end();
      }
    }
  }

  private async parseAction(
    req: IncomingMessage,
    url: URL,
  ): Promise<{ action: string; params: Record<string, unknown>; echo?: unknown }> {
    if (req.method === 'GET') {
      const raw = url.pathname.replace(/^\/+/, '');
      const cleaned = raw.replace(/^onebot\/v11\//, '').replace(/^api\//, '');
      const action = (cleaned || String(url.searchParams.get('action') ?? '')).trim();
      return { action, params: queryToParams(url), echo: url.searchParams.get('echo') ?? undefined };
    }

    const body = await readJson(req);
    if (!isRecord(body)) return { action: '', params: {} };
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const echo = body.echo;
    const params = isRecord(body.params) ? body.params : {};
    if (Object.keys(params).length === 0) {
      for (const [key, value] of Object.entries(body)) {
        if (key === 'action' || key === 'echo' || key === 'params') continue;
        params[key] = value;
      }
    }
    return { action, params, echo };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function displayHost(host: string): string {
  if (host === '0.0.0.0' || host === '::') return '127.0.0.1';
  return host;
}
