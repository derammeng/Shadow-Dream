import type { ActionResult } from '../types/onebot.js';

export interface ActionExecutor {
  execute(
    action: string,
    params: Record<string, unknown>,
    context: { source: 'http' | 'ws' | 'internal'; clientId?: string },
  ): Promise<ActionResult>;
}

export interface TransportInfo {
  http: string;
  ws: string;
  webui: string;
  httpPost: string[];
  reverseWs: string[];
  wsClients: number;
  reverseWsConnected: number;
}
