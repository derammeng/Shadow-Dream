import type {
  Backend,
  BackendActionContext,
  BackendActionParams,
  Capability,
  SimulationInput,
} from '../src/types/backend.js';
import type { MessageSegment, OneBotEvent, Sender } from '../src/types/onebot.js';
import { ActionError } from '../src/errors.js';
import { normalizeMessage, toCQCode } from '../src/message/segment.js';

interface FakeMessage {
  id: number;
  message_type: 'private' | 'group';
  user_id: number;
  group_id?: number;
  target_id?: number;
  sender: Sender;
  message: MessageSegment[];
  raw_message: string;
  time: number;
  post_type: 'message' | 'message_sent';
}

const SELF_ID = 10001;

/** core 测试专用后端，不依赖 mock 包。 */
export class FakeBackend implements Backend {
  readonly name = 'fake';
  readonly version = '0.0.1';
  readonly selfId = SELF_ID;
  readonly capabilities: ReadonlySet<Capability> = new Set<Capability>(['text', 'at', 'reply']);
  readonly supportedActions = ['send_private_msg', 'send_group_msg', 'send_msg', 'get_msg', 'get_group_list', 'get_group_info', 'delete_msg'];

  private readonly listeners = new Set<(event: OneBotEvent) => void>();
  private readonly messages = new Map<number, FakeMessage>();
  private nextId = 1;

  async start(): Promise<void> {}
  async stop(): Promise<void> {
    this.listeners.clear();
  }

  onEvent(listener: (event: OneBotEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSelfInfo() {
    return { user_id: SELF_ID, nickname: '测试账号', online: true };
  }

  async simulate(input: SimulationInput): Promise<unknown> {
    const message = normalizeMessage(input.message);
    const record = this.create({
      message_type: input.message_type === 'group' ? 'group' : 'private',
      user_id: input.user_id,
      group_id: input.group_id,
      message,
      post_type: 'message',
      sender: { user_id: input.user_id, nickname: input.nickname ?? '测试用户', role: 'member' },
    });
    this.emit(this.event(record));
    return { message_id: record.id };
  }

  async call(action: string, params: BackendActionParams, _context: BackendActionContext): Promise<unknown> {
    switch (action) {
      case 'send_private_msg': {
        const record = this.create({
          message_type: 'private',
          user_id: SELF_ID,
          target_id: Number(params.user_id),
          message: requiredMessage(params),
          post_type: 'message_sent',
          sender: { user_id: SELF_ID, nickname: '测试账号', role: 'member' },
        });
        this.emit(this.event(record));
        return { message_id: record.id };
      }
      case 'send_group_msg': {
        const record = this.create({
          message_type: 'group',
          user_id: SELF_ID,
          group_id: Number(params.group_id),
          message: requiredMessage(params),
          post_type: 'message_sent',
          sender: { user_id: SELF_ID, nickname: '测试账号', role: 'owner' },
        });
        this.emit(this.event(record));
        return { message_id: record.id };
      }
      case 'send_msg':
        return this.call(params.group_id !== undefined ? 'send_group_msg' : 'send_private_msg', params, _context);
      case 'get_msg': {
        const record = this.messages.get(Number(params.message_id));
        if (!record) throw ActionError.notFound();
        return {
          message_id: record.id,
          message_type: record.message_type,
          user_id: record.sender.user_id,
          message: record.message,
          raw_message: record.raw_message,
          time: record.time,
          group_id: record.group_id,
        };
      }
      case 'get_group_list':
        return [{ group_id: 30001, group_name: '测试群', member_count: 2, max_member_count: 200 }];
      case 'get_group_info':
        if (Number(params.group_id) !== 30001) throw ActionError.notFound();
        return { group_id: 30001, group_name: '测试群', member_count: 2, max_member_count: 200 };
      case 'delete_msg': {
        const id = Number(params.message_id);
        if (!this.messages.has(id)) throw ActionError.notFound();
        this.messages.delete(id);
        return null;
      }
      default:
        throw ActionError.unsupported(`fake 不支持 ${action}`);
    }
  }

  private create(input: Omit<FakeMessage, 'id' | 'raw_message' | 'time'>): FakeMessage {
    const record: FakeMessage = {
      ...input,
      id: this.nextId++,
      raw_message: toCQCode(input.message),
      time: Math.floor(Date.now() / 1000),
    };
    this.messages.set(record.id, record);
    return record;
  }

  private event(record: FakeMessage): OneBotEvent {
    return {
      time: record.time,
      self_id: SELF_ID,
      post_type: record.post_type,
      message_type: record.message_type,
      sub_type: record.message_type === 'group' ? 'normal' : 'friend',
      message_id: record.id,
      user_id: record.sender.user_id,
      message: record.message,
      raw_message: record.raw_message,
      font: 0,
      sender: record.sender,
      ...(record.group_id === undefined ? {} : { group_id: record.group_id }),
      ...(record.target_id === undefined ? {} : { target_id: record.target_id }),
    };
  }

  private emit(event: OneBotEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function requiredMessage(params: BackendActionParams): MessageSegment[] {
  const message = normalizeMessage(params.message as string | MessageSegment[] | undefined);
  if (!message.length) throw ActionError.badRequest('message 不能为空');
  return message;
}
