import fs from 'node:fs';
import {
  loadConfig,
  normalizeConfig,
  saveConfig,
  type ShadowDreamConfig,
  type WsServerConfig,
} from './config/schema.js';
import { ActionError, RetCode, toActionError } from './errors.js';
import type { SimulationInput } from './types/backend.js';
import type {
  ActionResult,
  BotStatus,
  MessageEvent,
  OneBotEvent,
  SelfInfo,
  VersionInfo,
} from './types/onebot.js';
import { messageToPlainText } from './message/segment.js';
import { HttpPostTransport } from './transport/http-post.js';
import { HttpTransport } from './transport/http.js';
import type { ActionExecutor } from './transport/types.js';
import { ReverseWsTransport, WsServerTransport } from './transport/ws.js';
import { logBus, type Logger, type LogEntry } from './util/logger.js';
import { wsUrl } from './util/network.js';
import { applyUpdate as applyShadowDreamUpdate, checkUpdate as checkShadowDreamUpdate } from './update/index.js';
import type { WebUiHost, WebUiOverview } from './webui/types.js';
import type { Backend, Capability } from './types/backend.js';

export interface ShadowDreamBotOptions {
  config: ShadowDreamConfig;
  backend: Backend;
  logger: Logger;
  appName?: string;
  appVersion?: string;
  /** 配置文件路径；设置后 WebUI 可保存配置并监听文件自动重载。 */
  configPath?: string;
  /** 默认 true；显式 false 可关闭文件监听。 */
  watchConfig?: boolean;
}

export interface ConfigApplyResult {
  configPath: string;
  networkChanged: boolean;
  restartScheduled: boolean;
  restarted: boolean;
}

interface RecentEvent {
  time: number;
  type: string;
  summary: string;
}

const CORE_ACTIONS = [
  'get_status',
  'get_version_info',
  'get_login_info',
  'get_supported_actions',
  'can_send_image',
  'can_send_record',
  'get_cookies',
  'get_csrf_token',
  'get_credentials',
] as const;

/**
 * Shadow Dream 的运行时：把 Backend 的事件广播到所有传输层，把 API 请求交给
 * Backend 执行，并负责心跳、统计、生命周期和 WebUI。
 */
export class ShadowDreamBot implements ActionExecutor, WebUiHost {
  readonly startedAt = Date.now();
  readonly appName: string;
  readonly appVersion: string;

  private config: ShadowDreamConfig;
  private readonly backend: Backend;
  private readonly logger: Logger;
  private readonly configPath?: string;
  private readonly watchConfig: boolean;

  private httpTransport: HttpTransport | null = null;
  private wsTransports: Array<{
    index: number;
    config: WsServerConfig;
    transport: WsServerTransport;
  }> = [];
  private reverseWsTransport: ReverseWsTransport | null = null;
  private httpPostTransport: HttpPostTransport | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private running = false;
  private restarting = false;
  private applyingConfig = false;
  private configWatcher: fs.StatWatcher | null = null;
  private lastAppliedConfig = '';

  private wsClients = 0;
  private reverseWsConnected = 0;
  private cachedSelfInfo: SelfInfo | null = null;
  private recentEvents: RecentEvent[] = [];

  private readonly stats = {
    packet_received: 0,
    packet_sent: 0,
    message_received: 0,
    message_sent: 0,
    last_message_time: 0,
  };

  private readonly counters = {
    http_requests: 0,
    http_errors: 0,
    actions_total: 0,
    actions_failed: 0,
  };

  constructor(options: ShadowDreamBotOptions) {
    this.config = options.config;
    this.backend = options.backend;
    this.logger = options.logger;
    this.appName = options.appName ?? 'shadowdream';
    this.appVersion = options.appVersion ?? '0.2.0';
    this.configPath = options.configPath;
    this.watchConfig = options.watchConfig !== false;
    this.lastAppliedConfig = JSON.stringify(this.config);
  }

  get isRunning(): boolean {
    return this.running;
  }

  get selfId(): number {
    return this.backend.selfId;
  }

  get backendName(): string {
    return this.backend.name;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.logger.info(`启动 Shadow Dream ${this.appVersion}，后端 ${this.backend.name} ${this.backend.version}`);

    await this.backend.start();
    this.backend.onEvent(event => this.dispatchEvent(event));
    void this.refreshSelfInfo();

    try {
      await this.startTransports();
    } catch (error) {
      // 部分传输层可能已经启动（例如 HTTP 成功、WS 端口冲突），
      // 启动失败时必须把它们收掉，避免留下半开的端口。
      await this.closeTransports();
      await this.backend.stop();
      throw error;
    }

    this.running = true;
    this.sendLifecycle('connect');
    this.resetHeartbeat();
    this.startConfigWatcher();

    this.logger.info(`Shadow Dream 已就绪，QQ ${this.backend.selfId || '未登录'}`);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.logger.info('Shadow Dream 正在停止…');

    this.stopConfigWatcher();
    this.sendLifecycle('disable');
    await this.closeTransports();
    await this.backend.stop();

    this.logger.info('Shadow Dream 已停止');
  }

  private async startTransports(): Promise<void> {
    this.httpPostTransport = new HttpPostTransport({
      targets: this.config.httpPost,
      logger: this.logger.child('http-post'),
      selfId: this.backend.selfId,
    });

    if (this.config.http.enabled) {
      this.httpTransport = new HttpTransport({
        config: this.config.http,
        executor: this,
        webui: this.config.http.webui ? this : undefined,
        logger: this.logger.child('http'),
        appVersion: this.appVersion,
        startedAt: this.startedAt,
        onCounters: counters => {
          this.counters.http_requests = counters.requests;
          this.counters.http_errors = counters.errors;
        },
      });
      await this.httpTransport.start();
    }

    let sharedHttpWs = false;
    this.logger.info(`WS 配置：${JSON.stringify(this.wsServerConfigs())}`);
    for (let index = 0; index < this.wsServerConfigs().length; index++) {
      const wsConfig = this.wsServerConfigs()[index];
      if (!wsConfig?.enabled) continue;
      const shareHttp = Boolean(
        this.httpTransport
        && this.config.http.enabled
        && !sharedHttpWs
        && this.config.http.port === wsConfig.port
        && this.config.http.host === wsConfig.host,
      );
      try {
        const transport = new WsServerTransport({
          config: wsConfig,
          executor: this,
          logger: this.logger.child(`ws:${index + 1}`),
          server: shareHttp ? this.httpTransport?.server : undefined,
          onClientsChanged: () => this.refreshWsClientCount(),
        });
        await transport.start();
        this.logger.info(`WS 端点已启动：${wsConfig.host}:${wsConfig.port}`);
        this.wsTransports.push({ index, config: wsConfig, transport });
        if (shareHttp) sharedHttpWs = true;
      } catch (error) {
        this.logger.error(
          `WS 端点 ${wsConfig.name ?? `#${index + 1}`}（${wsConfig.host}:${wsConfig.port}${wsConfig.path}）启动失败：${(error as Error).message}`,
        );
      }
    }
    this.refreshWsClientCount();

    if (this.config.reverseWs.length > 0) {
      this.reverseWsTransport = new ReverseWsTransport({
        targets: this.config.reverseWs,
        executor: this,
        logger: this.logger.child('reverse-ws'),
        onStateChanged: count => {
          this.reverseWsConnected = count;
        },
      });
      this.reverseWsTransport.start();
    }
  }

  private wsServerConfigs(): WsServerConfig[] {
    return Array.isArray(this.config.wsServers) ? this.config.wsServers : [this.config.ws];
  }

  private refreshWsClientCount(): void {
    this.wsClients = this.wsTransports.reduce(
      (sum, item) => sum + item.transport.clientCount,
      0,
    );
  }

  private resetHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (!this.config.heartbeat.enabled) return;
    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat();
    }, this.config.heartbeat.intervalMs);
    this.heartbeatTimer.unref();
  }

  private async refreshSelfInfo(): Promise<void> {
    try {
      this.cachedSelfInfo = this.backend.getSelfInfo
        ? await this.backend.getSelfInfo()
        : { user_id: this.backend.selfId, nickname: '' };
    } catch (error) {
      this.logger.debug(`读取账号信息失败：${(error as Error).message}`);
    }
  }

  private async closeTransports(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.reverseWsTransport?.stop();
    this.reverseWsTransport = null;
    await Promise.all(this.wsTransports.map(item => item.transport.stop()));
    this.wsTransports = [];
    await this.httpTransport?.stop();
    this.httpTransport = null;
    this.httpPostTransport = null;
    this.wsClients = 0;
    this.reverseWsConnected = 0;
  }

  getConfigPath(): string {
    return this.configPath ?? '';
  }

  async applyConfig(
    raw: unknown,
    options: { persist?: boolean; source?: 'webui' | 'file' } = {},
  ): Promise<ConfigApplyResult> {
    if (this.applyingConfig || this.restarting) {
      throw ActionError.internal('配置正在应用，请稍后重试');
    }
    if (!isRecord(raw)) throw ActionError.badRequest('配置必须是 JSON 对象');

    this.applyingConfig = true;
    try {
      const merged = mergeJson(
        this.getConfig() as unknown as Record<string, unknown>,
        raw,
      ) as unknown as ShadowDreamConfig;
      const next = normalizeConfig(merged, this.configPath ?? '<webui>');
      if (next.backend.type !== this.config.backend.type) {
        throw ActionError.badRequest('backend.type 不支持热切换，请修改配置文件后重启');
      }

      const networkChanged = JSON.stringify(next.http) !== JSON.stringify(this.config.http)
        || JSON.stringify(next.ws) !== JSON.stringify(this.config.ws)
        || JSON.stringify(next.wsServers) !== JSON.stringify(this.config.wsServers);

      if (options.persist !== false) {
        if (!this.configPath) throw ActionError.badRequest('当前没有配置文件路径，无法保存');
        saveConfig(next, this.configPath);
      }

      this.config = next;
      this.lastAppliedConfig = JSON.stringify(next);
      this.logger.setLevel(next.logLevel);

      if (networkChanged) {
        this.logger.warn('HTTP/WS 配置已改变，100ms 后重启传输层');
        setTimeout(() => {
          void this.restartTransports();
        }, 100);
        return {
          configPath: this.configPath ?? '',
          networkChanged: true,
          restartScheduled: true,
          restarted: false,
        };
      }

      this.applyLiveSettings();
      this.logger.info('配置已自动重载');
      return {
        configPath: this.configPath ?? '',
        networkChanged: false,
        restartScheduled: false,
        restarted: false,
      };
    } finally {
      this.applyingConfig = false;
    }
  }

  async reloadConfig(): Promise<ConfigApplyResult> {
    if (!this.configPath) throw ActionError.badRequest('当前没有配置文件路径');
    const next = loadConfig({ file: this.configPath });
    return this.applyConfig(next, { persist: false, source: 'file' });
  }

  async restartTransports(): Promise<void> {
    if (!this.running || this.restarting) return;
    this.restarting = true;
    try {
      this.logger.info('正在重启 HTTP / WS 传输层…');
      await this.closeTransports();
      await this.startTransports();
      this.resetHeartbeat();
      this.sendLifecycle('connect');
      this.logger.info('HTTP / WS 传输层已重启');
    } catch (error) {
      this.logger.error(`重启传输层失败：${(error as Error).message}`);
    } finally {
      this.restarting = false;
    }
  }

  checkUpdate() {
    return checkShadowDreamUpdate();
  }

  applyUpdate() {
    return applyShadowDreamUpdate();
  }

  private applyLiveSettings(): void {
    this.httpPostTransport = new HttpPostTransport({
      targets: this.config.httpPost,
      logger: this.logger.child('http-post'),
      selfId: this.backend.selfId,
    });

    this.reverseWsTransport?.stop();
    this.reverseWsTransport = null;
    if (this.config.reverseWs.length > 0) {
      this.reverseWsTransport = new ReverseWsTransport({
        targets: this.config.reverseWs,
        executor: this,
        logger: this.logger.child('reverse-ws'),
        onStateChanged: count => {
          this.reverseWsConnected = count;
        },
      });
      this.reverseWsTransport.start();
    }

    this.resetHeartbeat();
  }

  private startConfigWatcher(): void {
    if (!this.configPath || !this.watchConfig || this.configWatcher) return;
    try {
      this.configWatcher = fs.watchFile(this.configPath, { interval: 1200 }, (curr, prev) => {
        if (curr.mtimeMs === prev.mtimeMs) return;
        void this.handleConfigFileChanged();
      });
      this.logger.info(`配置自动重载已开启：${this.configPath}`);
    } catch (error) {
      this.logger.warn(`无法监听配置文件：${(error as Error).message}`);
    }
  }

  private stopConfigWatcher(): void {
    if (!this.configPath || !this.configWatcher) return;
    fs.unwatchFile(this.configPath);
    this.configWatcher = null;
  }

  private async handleConfigFileChanged(): Promise<void> {
    if (!this.configPath || this.applyingConfig) return;
    try {
      const next = loadConfig({ file: this.configPath });
      if (JSON.stringify(next) === this.lastAppliedConfig) return;
      this.logger.info('检测到配置文件变化，正在自动重载…');
      await this.applyConfig(next, { persist: false, source: 'file' });
    } catch (error) {
      this.logger.error(`配置文件自动重载失败：${(error as Error).message}`);
    }
  }

  /**
   * 所有 API 的唯一入口。core 自己实现通用查询动作，其余交给 backend。
   */
  async execute(
    action: string,
    params: Record<string, unknown>,
    context: { source: 'http' | 'ws' | 'internal' | 'webui'; clientId?: string },
  ): Promise<ActionResult> {
    const started = Date.now();
    const echo = params.echo;
    delete params.echo;

    try {
      if (!action) throw ActionError.badRequest('action 不能为空');
      this.counters.actions_total++;

      let data: unknown;
      if (this.isCoreAction(action)) {
        data = await this.executeCoreAction(action, params);
      } else {
        data = await this.backend.call(action, params, {
          source: context.source === 'internal' ? 'internal' : context.source,
          clientId: context.clientId,
        });
      }

      const elapsed = Date.now() - started;
      this.logger.debug(`action ${action} ok ${elapsed}ms`);
      return {
        status: 'ok',
        retcode: RetCode.OK,
        data: data === undefined ? null : data,
        ...(echo === undefined ? {} : { echo }),
      };
    } catch (error) {
      const actionError = toActionError(error);
      this.counters.actions_failed++;
      this.logger.warn(`action ${action} 失败 [${actionError.retcode}]：${actionError.message}`);
      return {
        status: 'failed',
        retcode: actionError.retcode,
        data: null,
        message: actionError.message,
        ...(actionError.wording ? { wording: actionError.wording } : {}),
        ...(echo === undefined ? {} : { echo }),
      };
    }
  }

  async simulate(input: SimulationInput): Promise<unknown> {
    if (!this.backend.simulate) {
      throw new ActionError(RetCode.UNSUPPORTED, '当前后端不支持模拟消息');
    }
    return this.backend.simulate(input);
  }

  hasSimulator(): boolean {
    return typeof this.backend.simulate === 'function';
  }

  getStatus(): BotStatus {
    return {
      online: this.backend.selfId > 0,
      good: this.running,
      stat: { ...this.stats },
    };
  }

  getOverview(): WebUiOverview {
    const httpUrl = this.httpTransport?.url ?? '未启用';
    const wsServers = this.wsServerConfigs().map((config, index) => {
      const running = this.wsTransports.find(item => item.index === index);
      const suffix = config.path === '/' ? '' : config.path;
      const url = running?.transport.url
        ?? wsUrl(config.host, config.port, suffix);
      return {
        name: config.name ?? `WebSocket ${index + 1}`,
        url,
        enabled: config.enabled,
        host: config.host,
        port: running?.transport.port ?? config.port,
        path: config.path,
        clients: running?.transport.clientCount ?? 0,
        running: Boolean(running),
      };
    });
    const firstWs = wsServers.find(item => item.enabled && item.running)?.url
      ?? wsServers.find(item => item.enabled)?.url
      ?? '未启用';
    return {
      app: {
        name: this.appName,
        version: this.appVersion,
        startedAt: this.startedAt,
        uptimeMs: Date.now() - this.startedAt,
      },
      backend: {
        name: this.backend.name,
        version: this.backend.version,
        selfId: this.backend.selfId,
        online: this.backend.selfId > 0,
        capabilities: [...this.backend.capabilities],
      },
      status: this.getStatus(),
      transports: {
        http: this.config.http.enabled ? httpUrl : '未启用',
        ws: firstWs,
        wsServers,
        webui: this.config.http.enabled && this.config.http.webui ? `${httpUrl}/webui/` : '未启用',
        httpPost: this.config.httpPost.map(item => item.url),
        reverseWs: this.config.reverseWs.map(item => item.url),
        wsClients: this.wsClients,
        reverseWsConnected: this.reverseWsConnected,
      },
      actions: this.supportedActions(),
      simulator: this.hasSimulator(),
      recentEvents: this.getRecentEvents().slice(-20).reverse(),
      config: {
        path: this.configPath ?? '',
        hotReload: Boolean(this.configPath && this.watchConfig),
      },
      account: {
        nickname: this.cachedSelfInfo?.nickname ?? '',
        online: this.cachedSelfInfo?.online ?? this.backend.selfId > 0,
        loginMode: this.backend.name === 'mock' ? 'mock' : 'client',
      },
    };
  }

  getLogs(since: number, limit: number): LogEntry[] {
    return since > 0 ? logBus.since(since, limit) : logBus.snapshot(limit);
  }

  getRecentEvents(): RecentEvent[] {
    return [...this.recentEvents];
  }

  getConfig(): ShadowDreamConfig {
    return JSON.parse(JSON.stringify(this.config)) as ShadowDreamConfig;
  }

  private isCoreAction(action: string): boolean {
    return (CORE_ACTIONS as readonly string[]).includes(action);
  }

  private async executeCoreAction(action: string, _params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case 'get_status': {
        if (this.backend.getStatus) {
          const status = await this.backend.getStatus();
          return { ...status, stat: { ...this.stats, ...status.stat } };
        }
        return this.getStatus();
      }
      case 'get_version_info':
        return {
          app_name: this.appName,
          app_version: this.appVersion,
          protocol_version: 'v11',
          version: `shadowdream-${this.appVersion}`,
          extra: {
            backend: this.backend.name,
            backend_version: this.backend.version,
          },
        } satisfies VersionInfo;
      case 'get_login_info': {
        if (!this.cachedSelfInfo) {
          this.cachedSelfInfo = this.backend.getSelfInfo
            ? await this.backend.getSelfInfo()
            : { user_id: this.backend.selfId, nickname: '' };
        }
        return { user_id: this.cachedSelfInfo.user_id, nickname: this.cachedSelfInfo.nickname };
      }
      case 'get_supported_actions':
        return this.supportedActions();
      case 'can_send_image':
        return { yes: this.backend.capabilities.has('image') };
      case 'can_send_record':
        return { yes: this.backend.capabilities.has('record') };
      case 'get_cookies':
        return { cookies: '' };
      case 'get_csrf_token':
        return { token: 0 };
      case 'get_credentials':
        return { cookies: '', csrf_token: 0 };
      default:
        throw ActionError.unsupported(`未知的 core action：${action}`);
    }
  }

  private supportedActions(): string[] {
    const backendActions = this.backend.supportedActions ?? [];
    return [...new Set([...CORE_ACTIONS, ...backendActions])].sort();
  }

  private dispatchEvent(event: OneBotEvent): void {
    try {
      event.self_id = this.backend.selfId;
      if (!event.time) event.time = Math.floor(Date.now() / 1000);
      this.stats.packet_received++;

      if (event.post_type === 'message' || event.post_type === 'message_sent') {
        this.stats.last_message_time = event.time;
        if (event.post_type === 'message') this.stats.message_received++;
        else this.stats.message_sent++;
        const message = event as MessageEvent;
        const summary = `${message.message_type === 'group' ? `群 ${message.group_id}` : `QQ ${message.user_id}`}: ${messageToPlainText(message.message)}`;
        this.logger.info(`收到消息 ${summary}`);
        this.pushRecent({ time: event.time, type: event.post_type, summary });
      } else if (event.post_type === 'meta_event') {
        this.logger.debug(`事件 meta_event/${event.meta_event_type}`);
      } else if (event.post_type === 'notice') {
        this.pushRecent({
          time: event.time,
          type: `notice/${event.notice_type}`,
          summary: '',
        });
        this.logger.debug(`事件 notice/${event.notice_type}`);
      } else if (event.post_type === 'request') {
        this.pushRecent({
          time: event.time,
          type: `request/${event.request_type}`,
          summary: '',
        });
        this.logger.debug(`事件 request/${event.request_type}`);
      }

      const delivered = this.wsTransports.reduce(
        (sum, item) => sum + item.transport.broadcast(event),
        0,
      ) + (this.reverseWsTransport?.broadcast(event) ?? 0);
      this.httpPostTransport?.send(event);
      if (delivered > 0) this.stats.packet_sent++;
    } catch (error) {
      this.logger.error(`事件分发失败：${(error as Error).message}`);
    }
  }

  private pushRecent(event: RecentEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > 50) this.recentEvents.shift();
  }

  private sendLifecycle(subType: 'connect' | 'enable' | 'disable'): void {
    this.dispatchEvent({
      time: Math.floor(Date.now() / 1000),
      self_id: this.backend.selfId,
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: subType,
    });
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.running) return;
    let status: BotStatus;
    try {
      status = this.backend.getStatus
        ? { ...(await this.backend.getStatus()), stat: { ...this.stats } }
        : this.getStatus();
    } catch {
      status = this.getStatus();
    }
    this.dispatchEvent({
      time: Math.floor(Date.now() / 1000),
      self_id: this.backend.selfId,
      post_type: 'meta_event',
      meta_event_type: 'heartbeat',
      sub_type: 'heartbeat',
      status,
      interval: this.config.heartbeat.intervalMs,
    });
  }

  getCapabilities(): ReadonlySet<Capability> {
    return this.backend.capabilities;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeJson(base: Record<string, unknown>, patch: unknown): Record<string, unknown> {
  if (!isRecord(patch)) return base;
  const target = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    const current = target[key];
    if (isRecord(current) && isRecord(value)) {
      target[key] = mergeJson(current, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}
