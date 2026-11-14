import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface HttpConfig {
  enabled: boolean;
  host: string;
  port: number;
  /** 为空表示不校验；反向代理场景请务必设置。 */
  accessToken: string;
  /** 是否在 HTTP 端口上挂载 /webui/ 控制台。 */
  webui: boolean;
  /** WebUI 登录 token；为空时沿用 accessToken；两者都为空则不登录。 */
  webuiToken: string;
  /** 允许跨域的 Origin，`*` 表示全部。 */
  cors: string[];
}

export interface WsConfig {
  enabled: boolean;
  host: string;
  port: number;
  path: string;
  accessToken: string;
}

/** 正向 WebSocket 端点；每个地址可以单独启用、停用和配置 token。 */
export interface WsServerConfig extends WsConfig {
  name?: string;
}

export interface HttpPostConfig {
  url: string;
  secret?: string;
  timeoutMs?: number;
}

export interface ReverseWsConfig {
  url: string;
  accessToken?: string;
  reconnectIntervalMs?: number;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number;
}

export interface BackendConfig {
  type: string;
  [key: string]: unknown;
}

export interface ShadowDreamConfig {
  http: HttpConfig;
  /** @deprecated 兼容旧配置，等于 wsServers[0] 的镜像；新代码用 wsServers。 */
  ws: WsConfig;
  /** 正向 WebSocket 端点列表；旧配置只有 ws 时会自动迁移成一项。 */
  wsServers?: WsServerConfig[];
  httpPost: HttpPostConfig[];
  reverseWs: ReverseWsConfig[];
  heartbeat: HeartbeatConfig;
  logLevel: LogLevelName;
  backend: BackendConfig;
}

export interface LoadConfigOptions {
  /** 显式配置文件路径。 */
  file?: string;
  /** 仅使用这些默认值，不读取磁盘。 */
  defaults?: Partial<ShadowDreamConfig>;
  /** 读取磁盘时允许缺失，缺失则返回默认值。 */
  allowMissing?: boolean;
  /** 额外深合并，用于插件在内存里覆盖端口。 */
  overrides?: Partial<ShadowDreamConfig>;
}

export const DEFAULT_CONFIG: ShadowDreamConfig = {
  http: {
    enabled: true,
    host: '127.0.0.1',
    port: 3000,
    accessToken: '',
    webui: true,
    webuiToken: '',
    cors: ['*'],
  },
  ws: {
    enabled: true,
    host: '127.0.0.1',
    port: 3001,
    path: '/',
    accessToken: '',
  },
  httpPost: [],
  reverseWs: [],
  heartbeat: {
    enabled: true,
    intervalMs: 30_000,
  },
  logLevel: 'info',
  backend: {
    type: 'mock',
  },
};

export function defaultConfigPath(): string {
  if (process.env.FD_CONFIG) return path.resolve(process.env.FD_CONFIG);
  return path.resolve(process.cwd(), 'config', 'shadowdream.json');
}

export function generateAccessToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * 读取配置。默认值 → 文件 → 环境变量 → overrides 的顺序合并。
 * 坏掉的配置文件会抛出明确错误，而不是悄悄用默认值启动。
 */
export function loadConfig(options: LoadConfigOptions = {}): ShadowDreamConfig {
  const file = options.file ? path.resolve(options.file) : defaultConfigPath();
  const base = clone(DEFAULT_CONFIG);
  if (options.defaults) deepMerge(base, options.defaults);

  let fileConfig: unknown = {};
  if (fs.existsSync(file)) {
    try {
      // Windows 编辑器经常给 UTF-8 加 BOM，JSON.parse 不认，先剥掉。
      const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      fileConfig = JSON.parse(raw);
    } catch (error) {
      throw new Error(`配置文件不是合法 JSON：${file}\n${(error as Error).message}`);
    }
  } else if (!options.allowMissing && options.file) {
    throw new Error(`配置文件不存在：${file}`);
  }

  if (isRecord(fileConfig)) deepMerge(base, fileConfig);
  applyEnvironment(base);
  if (options.overrides) deepMerge(base, options.overrides);

  return normalizeConfig(base, file);
}

export function saveConfig(config: ShadowDreamConfig, file = defaultConfigPath()): void {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, target);
}

/** 首次启动时落盘一份可编辑的配置，并返回它。 */
export function ensureConfig(options: LoadConfigOptions = {}): ShadowDreamConfig {
  const file = options.file ? path.resolve(options.file) : defaultConfigPath();
  const existed = fs.existsSync(file);
  const config = loadConfig({ ...options, file, allowMissing: true });
  if (!existed) saveConfig(config, file);
  return config;
}

export function normalizeConfig(raw: ShadowDreamConfig, file = ''): ShadowDreamConfig {
  const http = raw.http;
  const legacyWs = isRecord(raw.ws) ? raw.ws : DEFAULT_CONFIG.ws;

  if (!isRecord(http)) {
    throw new Error(`配置文件缺少 http 段：${file}`);
  }

  http.enabled = Boolean(http.enabled ?? true);
  http.host = stringOr(http.host, '127.0.0.1');
  http.port = portOr(http.port, 3000);
  http.accessToken = stringOr(http.accessToken, '');
  http.webui = Boolean(http.webui ?? true);
  http.webuiToken = stringOr(http.webuiToken, '');
  http.cors = Array.isArray(http.cors)
    ? http.cors.filter((item): item is string => typeof item === 'string')
    : ['*'];

  // 旧配置只有 ws 对象；新配置用 wsServers 数组。数组存在时以数组为准，
  // 允许空数组表示「关闭所有正向 WS」。
  const baseWs = normalizeWsServer(legacyWs, DEFAULT_CONFIG.ws, 0);
  const sourceList = Array.isArray(raw.wsServers) ? raw.wsServers : [legacyWs];
  raw.wsServers = sourceList.map((item, index) => normalizeWsServer(item, baseWs, index));
  raw.ws = raw.wsServers[0] ?? { ...baseWs, enabled: false };

  raw.heartbeat = {
    enabled: Boolean(raw.heartbeat?.enabled ?? true),
    intervalMs: numberOr(raw.heartbeat?.intervalMs, 30_000, 1000, 3_600_000),
  };
  raw.logLevel = isLogLevel(raw.logLevel) ? raw.logLevel : 'info';
  raw.httpPost = Array.isArray(raw.httpPost)
    ? raw.httpPost
        .filter((item): item is HttpPostConfig => isRecord(item) && typeof item.url === 'string' && item.url.length > 0)
        .map(item => ({
          url: item.url,
          secret: typeof item.secret === 'string' ? item.secret : undefined,
          timeoutMs: numberOr(item.timeoutMs, 5000, 100, 120_000),
        }))
    : [];
  raw.reverseWs = Array.isArray(raw.reverseWs)
    ? raw.reverseWs
        .filter((item): item is ReverseWsConfig => isRecord(item) && typeof item.url === 'string' && item.url.length > 0)
        .map(item => ({
          url: item.url,
          accessToken: typeof item.accessToken === 'string' ? item.accessToken : undefined,
          reconnectIntervalMs: numberOr(item.reconnectIntervalMs, 3000, 500, 300_000),
        }))
    : [];
  raw.backend = isRecord(raw.backend) && typeof raw.backend.type === 'string'
    ? { ...raw.backend, type: raw.backend.type }
    : { type: 'mock' };

  return raw;
}

function applyEnvironment(config: ShadowDreamConfig): void {
  const env = process.env;
  if (env.FD_HTTP_HOST) config.http.host = env.FD_HTTP_HOST;
  if (env.FD_HTTP_PORT) config.http.port = portOr(env.FD_HTTP_PORT, config.http.port);
  if (env.FD_HTTP_TOKEN !== undefined) config.http.accessToken = env.FD_HTTP_TOKEN;
  if (env.FD_WEBUI_TOKEN !== undefined) config.http.webuiToken = env.FD_WEBUI_TOKEN;

  const wsTargets = Array.isArray(config.wsServers) && config.wsServers.length > 0
    ? config.wsServers
    : [config.ws];
  for (const ws of wsTargets) {
    if (!isRecord(ws)) continue;
    if (env.FD_WS_HOST) ws.host = env.FD_WS_HOST;
    if (env.FD_WS_PORT) ws.port = portOr(env.FD_WS_PORT, ws.port);
    if (env.FD_WS_PATH) ws.path = normalizePath(env.FD_WS_PATH);
    if (env.FD_WS_TOKEN !== undefined) ws.accessToken = env.FD_WS_TOKEN;
  }

  if (env.FD_LOG_LEVEL && isLogLevel(env.FD_LOG_LEVEL)) config.logLevel = env.FD_LOG_LEVEL;
  if (env.FD_BACKEND) config.backend.type = env.FD_BACKEND;
}

function normalizeWsServer(raw: unknown, fallback: WsConfig, index: number): WsServerConfig {
  const source = isRecord(raw) ? raw : {};
  const name = typeof source.name === 'string' && source.name.trim()
    ? source.name.trim()
    : `WebSocket ${index + 1}`;
  return {
    name,
    enabled: Boolean(source.enabled ?? fallback.enabled),
    host: stringOr(source.host, fallback.host),
    port: portOr(source.port, fallback.port),
    path: normalizePath(stringOr(source.path, fallback.path)),
    accessToken: stringOr(source.accessToken, fallback.accessToken),
  };
}

export function homeConfigDir(appName = 'Shadow Dream'): string {
  const base = process.env.APPDATA
    || (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.config'));
  return path.join(base, appName);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepMerge<T extends object>(target: T, source: Partial<T> | Record<string, unknown>): T {
  const targetRecord = target as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    const current = targetRecord[key];
    if (isRecord(current) && isRecord(value)) {
      deepMerge(current, value);
    } else {
      targetRecord[key] = value;
    }
  }
  return target;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(num)));
}

function portOr(value: unknown, fallback: number): number {
  // 0 留给测试/临时端口，Node 会自动分配。
  return numberOr(value, fallback, 0, 65_535);
}

function normalizePath(value: string): string {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function isLogLevel(value: unknown): value is LogLevelName {
  return value === 'trace' || value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
}
