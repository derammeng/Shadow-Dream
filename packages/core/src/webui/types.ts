import type { ConfigApplyResult } from '../bot.js';
import type { ShadowDreamConfig } from '../config/schema.js';
import type { ActionResult, BotStatus } from '../types/onebot.js';
import type { SimulationInput } from '../types/backend.js';
import type { LogEntry } from '../util/logger.js';
import type { UpdateApplyResult, UpdateCheckResult } from '../update/index.js';

export interface WebUiOverview {
  app: {
    name: string;
    version: string;
    startedAt: number;
    uptimeMs: number;
  };
  backend: {
    name: string;
    version: string;
    selfId: number;
    online: boolean;
    capabilities: string[];
  };
  status: BotStatus;
  transports: {
    http: string;
    ws: string;
    wsServers: Array<{
      name: string;
      url: string;
      enabled: boolean;
      host: string;
      port: number;
      path: string;
      clients: number;
      running: boolean;
    }>;
    webui: string;
    httpPost: string[];
    reverseWs: string[];
    wsClients: number;
    reverseWsConnected: number;
  };
  actions: string[];
  simulator: boolean;
  recentEvents: Array<{
    time: number;
    type: string;
    summary: string;
  }>;
  config: {
    path: string;
    hotReload: boolean;
  };
  account: {
    nickname: string;
    online: boolean;
    loginMode: 'mock' | 'client';
  };
}

export interface WebUiHost {
  getOverview(): WebUiOverview;
  getLogs(since: number, limit: number): LogEntry[];
  execute(
    action: string,
    params: Record<string, unknown>,
    context: { source: 'webui' },
  ): Promise<ActionResult>;
  simulate(input: SimulationInput): Promise<unknown>;
  hasSimulator(): boolean;
  getConfig(): ShadowDreamConfig;
  getConfigPath(): string;
  applyConfig(
    raw: unknown,
    options?: { persist?: boolean; source?: 'webui' | 'file' },
  ): Promise<ConfigApplyResult>;
  reloadConfig(): Promise<ConfigApplyResult>;
  restartTransports(): Promise<void>;
  checkUpdate(): Promise<UpdateCheckResult>;
  applyUpdate(): Promise<UpdateApplyResult>;
}
