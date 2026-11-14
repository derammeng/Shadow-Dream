import type {
  BotStatus,
  MessageInput,
  OneBotEvent,
  SelfInfo,
} from './onebot.js';

/** 后端的协议细节统一收敛在这里，core 只认 OneBot 语义。 */
export type BackendActionContext = {
  source: 'http' | 'ws' | 'webui' | 'internal';
  /** 传输层用于日志/追踪的标识，不一定存在。 */
  clientId?: string;
};

export type BackendActionParams = Record<string, unknown>;

export type BackendEventListener = (event: OneBotEvent) => void;

export type Capability =
  | 'text'
  | 'face'
  | 'image'
  | 'record'
  | 'video'
  | 'file'
  | 'at'
  | 'reply'
  | 'forward'
  | 'poke'
  | 'group_admin'
  | 'group_file'
  | 'friend_request'
  | 'group_request';

export interface Backend {
  /** 展示名，例如 `mock` / `qqnt`。 */
  readonly name: string;
  readonly version: string;
  /** 登录账号，0 表示离线。 */
  readonly selfId: number;
  /** 后端实际支持的能力，用于能力查询与友好报错。 */
  readonly capabilities: ReadonlySet<Capability>;
  /** 后端实现的 action 名，用于 get_supported_actions / WebUI。 */
  readonly supportedActions?: readonly string[];

  start(): Promise<void>;
  stop(): Promise<void>;

  /**
   * 执行 OneBot action。成功返回 `data`；失败必须抛出 ActionError，
   * 以便 core 生成统一的 retcode。
   */
  call(
    action: string,
    params: BackendActionParams,
    context: BackendActionContext,
  ): Promise<unknown>;

  onEvent(listener: BackendEventListener): () => void;

  getSelfInfo?(): Promise<SelfInfo> | SelfInfo;
  getStatus?(): Promise<BotStatus> | BotStatus;

  /**
   * 可选：开发/演示用的模拟入口。core 会把它挂到 WebUI 的调试面板，
   * 生产后端不实现即可。
   */
  simulate?(input: SimulationInput): Promise<unknown>;
}

export interface SimulationInput {
  message_type: 'private' | 'group';
  user_id: number;
  group_id?: number;
  message: MessageInput;
  sub_type?: string;
  nickname?: string;
}

export type BackendFactory = () => Promise<Backend> | Backend;
