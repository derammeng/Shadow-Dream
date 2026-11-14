import http, { type IncomingMessage, type Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import type { ReverseWsConfig, WsConfig } from '../config/schema.js';
import type { OneBotEvent } from '../types/onebot.js';
import type { Logger } from '../util/logger.js';
import { checkToken, extractToken, unauthorizedBody } from './auth.js';
import type { ActionExecutor } from './types.js';

type ClientRole = 'api' | 'event' | 'universal';

interface ClientMeta {
  id: number;
  role: ClientRole;
  remote: string;
  connectedAt: number;
}

let nextClientId = 1;

export interface WsServerOptions {
  config: WsConfig;
  executor: ActionExecutor;
  logger: Logger;
  /** 与 HTTP 共享端口时传入 HTTP server。 */
  server?: Server;
  onClientsChanged?: (count: number) => void;
}

/**
 * OneBot 11 正向 WebSocket。默认允许 api / event / universal 三种角色，
 * 通过 `X-Client-Role` 头或 `?role=` 选择。
 */
export class WsServerTransport {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<WebSocket, ClientMeta>();
  private ownServer: Server | null = null;
  private actualPort: number;
  private sharedServer: Server | null = null;
  private readonly onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    this.handleUpgrade(req, socket, head);
  };

  constructor(private readonly options: WsServerOptions) {
    this.actualPort = options.config.port;
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 * 1024 });
  }

  get port(): number {
    return this.actualPort;
  }

  get url(): string {
    const host = this.options.config.host;
    const display = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
    const suffix = this.options.config.path === '/' ? '' : this.options.config.path;
    return `ws://${display}:${this.actualPort}${suffix}`;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  async start(): Promise<void> {
    if (!this.options.config.enabled) return;
    if (this.options.server) {
      this.sharedServer = this.options.server;
      this.sharedServer.on('upgrade', this.onUpgrade);
      const address = this.sharedServer.address();
      if (address && typeof address === 'object') this.actualPort = address.port;
      this.options.logger.info(`WebSocket 复用 HTTP 端口 ${this.url}`);
      return;
    }

    this.ownServer = http.createServer((_req, res) => {
      res.statusCode = 426;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('WebSocket endpoint');
    });
    this.ownServer.on('upgrade', this.onUpgrade);
    await new Promise<void>((resolve, reject) => {
      const server = this.ownServer;
      if (!server) return reject(new Error('WS server 未初始化'));
      const onError = (error: NodeJS.ErrnoException): void => {
        server.off('listening', onListening);
        reject(new Error(
          error.code === 'EADDRINUSE'
            ? `WebSocket 端口 ${this.actualPort} 已被占用`
            : `WebSocket 服务启动失败：${error.message}`,
        ));
      };
      const onListening = (): void => {
        server.off('error', onError);
        const address = server.address();
        if (address && typeof address === 'object') this.actualPort = address.port;
        this.options.logger.info(`WebSocket 已监听 ${this.url}`);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(this.actualPort, this.options.config.host);
    });
  }

  async stop(): Promise<void> {
    for (const client of this.clients.keys()) {
      try {
        client.close(1001, 'server shutdown');
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.options.onClientsChanged?.(0);
    if (this.sharedServer) {
      this.sharedServer.off('upgrade', this.onUpgrade);
      this.sharedServer = null;
    }
    this.wss.close();
    if (this.ownServer) {
      this.ownServer.closeAllConnections?.();
      await new Promise<void>((resolve) => this.ownServer?.close(() => resolve()));
      this.ownServer = null;
    }
  }

  broadcast(event: OneBotEvent): number {
    const payload = JSON.stringify(event);
    let sent = 0;
    for (const [client, meta] of this.clients) {
      if (meta.role === 'api') continue;
      if (client.readyState !== WebSocket.OPEN) continue;
      try {
        client.send(payload);
        sent++;
      } catch (error) {
        this.options.logger.debug(`WS 事件发送失败：${(error as Error).message}`);
      }
    }
    return sent;
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (!this.pathMatches(url.pathname)) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    if (!checkToken(this.options.config.accessToken, extractToken(req, url))) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n');
      socket.write(JSON.stringify(unauthorizedBody()));
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      const role = parseRole(req.headers['x-client-role'], url.searchParams.get('role'));
      this.register(ws, req, role);
    });
  }

  private pathMatches(pathname: string): boolean {
    const configured = this.options.config.path;
    if (configured === '/' || configured === '') return true;
    return pathname === configured || pathname === `${configured}/`;
  }

  private register(ws: WebSocket, req: IncomingMessage, role: ClientRole): void {
    const meta: ClientMeta = {
      id: nextClientId++,
      role,
      remote: `${req.socket.remoteAddress ?? '?'}:${req.socket.remotePort ?? 0}`,
      connectedAt: Date.now(),
    };
    this.clients.set(ws, meta);
    this.options.onClientsChanged?.(this.clients.size);
    this.options.logger.info(`WS 客户端 #${meta.id} 已连接（${role}，${meta.remote}）`);

    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      void this.handleMessage(ws, meta, data.toString());
    });
    ws.on('close', () => {
      this.clients.delete(ws);
      this.options.onClientsChanged?.(this.clients.size);
      this.options.logger.info(`WS 客户端 #${meta.id} 已断开`);
    });
    ws.on('error', (error) => {
      this.options.logger.warn(`WS 客户端 #${meta.id} 错误：${error.message}`);
    });
  }

  private async handleMessage(ws: WebSocket, meta: ClientMeta, raw: string): Promise<void> {
    if (meta.role === 'event') {
      sendWs(ws, {
        status: 'failed',
        retcode: 1401,
        data: null,
        message: 'event 角色不能调用 API',
      });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendWs(ws, { status: 'failed', retcode: 100, data: null, message: '不是合法 JSON' });
      return;
    }
    if (!isRecord(parsed) || typeof parsed.action !== 'string') {
      sendWs(ws, { status: 'failed', retcode: 100, data: null, message: '缺少 action' });
      return;
    }

    const params = isRecord(parsed.params) ? parsed.params : {};
    const result = await this.options.executor.execute(parsed.action, params, {
      source: 'ws',
      clientId: `ws#${meta.id}`,
    });
    if (parsed.echo !== undefined) result.echo = parsed.echo;
    sendWs(ws, result);
  }
}

export interface ReverseWsOptions {
  targets: ReverseWsConfig[];
  executor: ActionExecutor;
  logger: Logger;
  onStateChanged?: (connected: number) => void;
}

interface ReverseConnection {
  target: ReverseWsConfig;
  ws: WebSocket | null;
  timer: NodeJS.Timeout | null;
  stopped: boolean;
}

/**
 * 反向 WebSocket：Shadow Dream 主动连到业务端，推送事件并接收 action。
 */
export class ReverseWsTransport {
  private readonly connections: ReverseConnection[] = [];

  constructor(private readonly options: ReverseWsOptions) {}

  get connected(): number {
    return this.connections.filter(item => item.ws?.readyState === WebSocket.OPEN).length;
  }

  get targets(): ReverseWsConfig[] {
    return this.options.targets;
  }

  start(): void {
    for (const target of this.options.targets) {
      const connection: ReverseConnection = { target, ws: null, timer: null, stopped: false };
      this.connections.push(connection);
      this.connect(connection);
    }
  }

  stop(): void {
    for (const connection of this.connections) {
      connection.stopped = true;
      if (connection.timer) clearTimeout(connection.timer);
      connection.ws?.close(1001, 'server shutdown');
      connection.ws = null;
    }
    this.connections.length = 0;
    this.options.onStateChanged?.(0);
  }

  broadcast(event: OneBotEvent): number {
    const payload = JSON.stringify(event);
    let sent = 0;
    for (const connection of this.connections) {
      if (connection.ws?.readyState !== WebSocket.OPEN) continue;
      try {
        connection.ws.send(payload);
        sent++;
      } catch {
        // 断线由 close 处理器负责重连。
      }
    }
    return sent;
  }

  private connect(connection: ReverseConnection): void {
    if (connection.stopped) return;
    const { target } = connection;
    const headers: Record<string, string> = {};
    if (target.accessToken) headers.Authorization = `Bearer ${target.accessToken}`;
    const ws = new WebSocket(target.url, { headers });
    connection.ws = ws;

    ws.on('open', () => {
      this.options.logger.info(`反向 WS 已连接 ${target.url}`);
      this.options.onStateChanged?.(this.connected);
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      void this.handleMessage(ws, data.toString());
    });
    ws.on('close', () => {
      if (connection.stopped) return;
      this.options.logger.warn(`反向 WS 断开 ${target.url}，${target.reconnectIntervalMs ?? 3000}ms 后重连`);
      this.options.onStateChanged?.(this.connected);
      connection.timer = setTimeout(() => this.connect(connection), target.reconnectIntervalMs ?? 3000);
    });
    ws.on('error', (error) => {
      this.options.logger.debug(`反向 WS 错误 ${target.url}：${error.message}`);
    });
  }

  private async handleMessage(ws: WebSocket, raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isRecord(parsed) || typeof parsed.action !== 'string') return;
    const params = isRecord(parsed.params) ? parsed.params : {};
    const result = await this.options.executor.execute(parsed.action, params, {
      source: 'ws',
      clientId: `reverse:${parsed.action}`,
    });
    if (parsed.echo !== undefined) result.echo = parsed.echo;
    sendWs(ws, result);
  }
}

function sendWs(ws: WebSocket, data: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(data));
  } catch {
    // ignore
  }
}

function parseRole(header: unknown, query: string | null): ClientRole {
  const value = typeof header === 'string' ? header : query;
  if (value === 'api' || value === 'event' || value === 'universal') return value;
  return 'universal';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
