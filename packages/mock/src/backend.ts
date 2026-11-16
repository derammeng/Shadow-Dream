import {
  ActionError,
  normalizeMessage,
  toCQCode,
  type Backend,
  type BackendActionContext,
  type BackendActionParams,
  type Capability,
  type FriendInfo,
  type GroupInfo,
  type GroupMemberInfo,
  type MessageSegment,
  type OneBotEvent,
  type Role,
  type SelfInfo,
  type Sender,
  type SimulationInput,
} from '@shadowdream/core';

interface MockFriend {
  user_id: number;
  nickname: string;
  remark: string;
  sex: 'male' | 'female' | 'unknown';
  age: number;
}

interface MockMember {
  user_id: number;
  nickname: string;
  card: string;
  role: Role;
  join_time: number;
  last_sent_time: number;
  title?: string;
  shut_up_until?: number;
}

interface MockGroup {
  group_id: number;
  name: string;
  owner_id: number;
  members: Map<number, MockMember>;
  whole_ban: boolean;
  max_member_count: number;
}

interface StoredMessage {
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
  sub_type: 'friend' | 'normal' | 'anonymous';
  anonymous?: { id: number; name: string; flag: string };
  recalled: boolean;
}

const SELF_ID = 10001;

/**
 * 一个进程内的 QQ 模拟器：真的维护好友、群、成员、消息与撤回状态，
 * 并通过与真实后端完全相同的 Backend 接口发事件、收 action。
 */
export class MockBackend implements Backend {
  readonly name = 'mock';
  readonly version = '0.3.0';
  readonly selfId = SELF_ID;
  readonly capabilities: ReadonlySet<Capability> = new Set<Capability>([
    'text',
    'face',
    'image',
    'record',
    'video',
    'file',
    'at',
    'reply',
    'forward',
    'poke',
    'group_admin',
    'group_file',
    'friend_request',
    'group_request',
  ]);

  readonly supportedActions = [
    'send_private_msg',
    'send_group_msg',
    'send_msg',
    'send_private_forward_msg',
    'send_group_forward_msg',
    'delete_msg',
    'get_msg',
    'get_forward_msg',
    'send_like',
    'get_friend_list',
    'get_group_list',
    'get_group_info',
    'get_group_member_info',
    'get_group_member_list',
    'get_stranger_info',
    'get_friend_msg_history',
    'get_group_msg_history',
    'set_group_kick',
    'set_group_ban',
    'set_group_whole_ban',
    'set_group_admin',
    'set_group_card',
    'set_group_name',
    'set_group_leave',
    'set_group_special_title',
    'set_friend_add_request',
    'set_group_add_request',
    'get_group_honor_info',
    'get_group_at_all_remain',
    'get_group_file_system_info',
    'get_group_root_files',
    'get_group_files_by_folder',
    'get_group_file_url',
    'upload_group_file',
    'delete_group_file',
    'get_online_clients',
    'get_guild_service_profile',
    'get_guild_list',
    'get_unidirectional_friend_list',
    'get_group_add_request',
    'get_friend_add_request',
    'set_msg_emoji_like',
    'get_emoji_likes',
  ];

  private readonly listeners = new Set<(event: OneBotEvent) => void>();
  private readonly friends = new Map<number, MockFriend>();
  private readonly groups = new Map<number, MockGroup>();
  private readonly messages = new Map<number, StoredMessage>();
  private nextMessageId = 1;

  constructor() {
    this.seed();
  }

  async start(): Promise<void> {
    // 模拟器没有外部连接，seed 已在构造函数完成。
  }

  async stop(): Promise<void> {
    this.listeners.clear();
  }

  onEvent(listener: (event: OneBotEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSelfInfo(): SelfInfo {
    return { user_id: SELF_ID, nickname: '影梦', online: true };
  }

  getStatus() {
    return {
      online: true,
      good: true,
      stat: {
        packet_received: 0,
        packet_sent: 0,
        message_received: 0,
        message_sent: 0,
        last_message_time: 0,
      },
    };
  }

  async simulate(input: SimulationInput): Promise<unknown> {
    const userId = Number(input.user_id);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw ActionError.badRequest('user_id 无效');
    }
    const message = normalizeMessage(input.message);
    if (message.length === 0) throw ActionError.badRequest('消息不能为空');

    if (input.message_type === 'group') {
      const groupId = Number(input.group_id);
      const group = this.groups.get(groupId);
      if (!group) throw ActionError.notFound(`群 ${groupId} 不存在`);
      const member = group.members.get(userId);
      if (member) {
        member.last_sent_time = Math.floor(Date.now() / 1000);
      }
      const nickname = member?.card || member?.nickname || input.nickname || `群友${userId}`;
      const sender: Sender = {
        user_id: userId,
        nickname,
        card: member?.card ?? '',
        role: member?.role ?? 'member',
      };
      const record = this.createMessage({
        message_type: 'group',
        user_id: userId,
        group_id: groupId,
        sender,
        message,
        post_type: 'message',
        sub_type: member ? 'normal' : 'anonymous',
        anonymous: member ? undefined : { id: 0, name: nickname, flag: '' },
      });
      this.emit(this.messageEvent(record));
      return { message_id: record.id };
    }

    let friend = this.friends.get(userId);
    if (!friend) {
      friend = {
        user_id: userId,
        nickname: input.nickname || `路人${userId}`,
        remark: '',
        sex: 'unknown',
        age: 0,
      };
      this.friends.set(userId, friend);
    }
    const sender: Sender = {
      user_id: friend.user_id,
      nickname: friend.nickname,
      card: '',
      role: 'member',
    };
    const record = this.createMessage({
      message_type: 'private',
      user_id: userId,
      sender,
      message,
      post_type: 'message',
    });
    this.emit(this.messageEvent(record));
    return { message_id: record.id };
  }

  async call(
    action: string,
    params: BackendActionParams,
    _context: BackendActionContext,
  ): Promise<unknown> {
    switch (action) {
      case 'send_private_msg':
        return this.sendPrivate(params);
      case 'send_group_msg':
        return this.sendGroup(params);
      case 'send_msg':
        return this.sendByType(params);
      case 'send_private_forward_msg':
        return this.sendForward(params, 'private');
      case 'send_group_forward_msg':
        return this.sendForward(params, 'group');
      case 'delete_msg':
        return this.deleteMessage(params);
      case 'get_msg':
        return this.getMessage(params);
      case 'get_forward_msg':
        return { messages: [] };
      case 'send_like':
        return this.sendLike(params);
      case 'get_friend_list':
        return this.getFriendList();
      case 'get_group_list':
        return this.getGroupList();
      case 'get_group_info':
        return this.getGroupInfo(params);
      case 'get_group_member_info':
        return this.getGroupMemberInfo(params);
      case 'get_group_member_list':
        return this.getGroupMemberList(params);
      case 'get_stranger_info':
        return this.getStrangerInfo(params);
      case 'get_friend_msg_history':
        return this.getHistory(params, 'private');
      case 'get_group_msg_history':
        return this.getHistory(params, 'group');
      case 'set_group_kick':
        return this.kickMember(params);
      case 'set_group_ban':
        return this.banMember(params, false);
      case 'set_group_whole_ban':
        return this.banMember(params, true);
      case 'set_group_admin':
        return this.setAdmin(params);
      case 'set_group_card':
        return this.setCard(params);
      case 'set_group_name':
        return this.setGroupName(params);
      case 'set_group_leave':
        return this.leaveGroup(params);
      case 'set_group_special_title':
        return this.setSpecialTitle(params);
      case 'set_friend_add_request':
      case 'set_group_add_request':
        return null;
      case 'get_group_honor_info':
        return this.getHonorInfo(params);
      case 'get_group_at_all_remain':
        return {
          can_at_all: true,
          remain_at_all_count_for_group: 10,
          remain_at_all_count_for_uin: 10,
        };
      case 'get_group_file_system_info':
        return {
          file_count: 0,
          limit_count: 10_000,
          used_space: 0,
          total_space: 10 * 1024 * 1024 * 1024,
        };
      case 'get_group_root_files':
      case 'get_group_files_by_folder':
        return { files: [], folders: [] };
      case 'get_group_file_url':
        return { url: '' };
      case 'upload_group_file':
      case 'delete_group_file':
        return null;
      case 'get_online_clients':
        return {
          clients: [
            { app_id: 1001, device_name: 'Shadow Dream', device_kind: 'Desktop' },
          ],
        };
      case 'get_guild_service_profile':
        return {};
      case 'get_guild_list':
        return [];
      case 'get_unidirectional_friend_list':
        return [];
      case 'get_group_add_request':
      case 'get_friend_add_request':
        return [];
      case 'set_msg_emoji_like':
        return null;
      case 'get_emoji_likes':
        return [];
      default:
        throw ActionError.unsupported(`mock 后端不支持 action：${action}`);
    }
  }

  /** 供 CLI 使用的只读快照。 */
  snapshot(): { friends: FriendInfo[]; groups: GroupInfo[] } {
    return {
      friends: this.getFriendList(),
      groups: this.getGroupList(),
    };
  }

  private sendPrivate(params: BackendActionParams): { message_id: number } {
    const userId = requiredId(params.user_id, 'user_id');
    const message = requiredMessage(params);
    const record = this.createMessage({
      message_type: 'private',
      user_id: SELF_ID,
      target_id: userId,
      sender: this.selfSender(),
      message,
      post_type: 'message_sent',
    });
    this.emit(this.messageEvent(record));
    return { message_id: record.id };
  }

  private sendGroup(params: BackendActionParams): { message_id: number } {
    const groupId = requiredId(params.group_id, 'group_id');
    const group = this.requireGroup(groupId);
    const message = requiredMessage(params);
    const record = this.createMessage({
      message_type: 'group',
      user_id: SELF_ID,
      group_id: group.group_id,
      sender: this.selfSender(group),
      message,
      post_type: 'message_sent',
    });
    this.emit(this.messageEvent(record));
    return { message_id: record.id };
  }

  private sendByType(params: BackendActionParams): { message_id: number } {
    const type = params.message_type;
    if (type === 'private' || (!type && params.user_id !== undefined)) {
      return this.sendPrivate(params);
    }
    if (type === 'group' || (!type && params.group_id !== undefined)) {
      return this.sendGroup(params);
    }
    throw ActionError.badRequest('send_msg 需要 message_type / group_id / user_id');
  }

  private sendForward(params: BackendActionParams, type: 'private' | 'group'): { message_id: number } {
    const messages = params.messages;
    if (!Array.isArray(messages)) throw ActionError.badRequest('messages 必须是数组');
    const target = type === 'private'
      ? requiredId(params.user_id, 'user_id')
      : requiredId(params.group_id, 'group_id');
    const record = this.createMessage({
      message_type: type,
      user_id: SELF_ID,
      ...(type === 'group' ? { group_id: target } : { target_id: target }),
      sender: this.selfSender(type === 'group' ? this.groups.get(target) : undefined),
      message: [{ type: 'forward', data: { id: `mock-forward-${Date.now()}` } }],
      post_type: 'message_sent',
    });
    this.emit(this.messageEvent(record));
    return { message_id: record.id };
  }

  private deleteMessage(params: BackendActionParams): null {
    const id = requiredId(params.message_id, 'message_id');
    const record = this.messages.get(id);
    if (!record) throw ActionError.notFound(`消息 ${id} 不存在`);
    if (record.recalled) return null;
    record.recalled = true;

    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: SELF_ID,
      post_type: 'notice',
      notice_type: record.message_type === 'group' ? 'group_recall' : 'friend_recall',
      ...(record.message_type === 'group'
        ? {
            group_id: record.group_id,
            operator_id: SELF_ID,
            user_id: record.sender.user_id,
            message_id: record.id,
          }
        : {
            user_id: record.message_type === 'private' && record.post_type === 'message'
              ? record.user_id
              : record.target_id ?? record.user_id,
            message_id: record.id,
          }),
    } as OneBotEvent);
    return null;
  }

  private getMessage(params: BackendActionParams) {
    const id = requiredId(params.message_id, 'message_id');
    const record = this.messages.get(id);
    if (!record) throw ActionError.notFound(`消息 ${id} 不存在`);
    return {
      message_id: record.id,
      real_id: record.id,
      sender: record.sender,
      time: record.time,
      message_type: record.message_type,
      message: record.message,
      raw_message: record.raw_message,
      message_format: 'array',
      ...(record.group_id === undefined ? {} : { group_id: record.group_id }),
      user_id: record.sender.user_id,
      ...(record.target_id === undefined ? {} : { target_id: record.target_id }),
    };
  }

  private sendLike(params: BackendActionParams): null {
    const userId = requiredId(params.user_id, 'user_id');
    const times = Math.min(10, Math.max(1, Number(params.times) || 1));
    if (!this.friends.has(userId) && !this.findMember(userId)) {
      throw ActionError.notFound(`用户 ${userId} 不存在`);
    }
    void times;
    return null;
  }

  private getFriendList(): FriendInfo[] {
    return [...this.friends.values()].map(friend => ({
      user_id: friend.user_id,
      nickname: friend.nickname,
      remark: friend.remark,
      sex: friend.sex,
      age: friend.age,
    }));
  }

  private getGroupList(): GroupInfo[] {
    return [...this.groups.values()].map(group => this.groupInfo(group));
  }

  private getGroupInfo(params: BackendActionParams): GroupInfo {
    const groupId = requiredId(params.group_id, 'group_id');
    return this.groupInfo(this.requireGroup(groupId));
  }

  private getGroupMemberInfo(params: BackendActionParams) {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const group = this.requireGroup(groupId);
    const member = group.members.get(userId);
    if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    return this.memberInfo(group, member);
  }

  private getGroupMemberList(params: BackendActionParams) {
    const groupId = requiredId(params.group_id, 'group_id');
    const group = this.requireGroup(groupId);
    return [...group.members.values()].map(member => this.memberInfo(group, member));
  }

  private getStrangerInfo(params: BackendActionParams) {
    const userId = requiredId(params.user_id, 'user_id');
    const friend = this.friends.get(userId);
    if (friend) {
      return {
        user_id: friend.user_id,
        nickname: friend.nickname,
        sex: friend.sex,
        age: friend.age,
      };
    }
    const member = this.findMember(userId);
    if (member) {
      return {
        user_id: member.member.user_id,
        nickname: member.member.nickname,
        sex: 'unknown',
        age: 0,
      };
    }
    throw ActionError.notFound(`用户 ${userId} 不存在`);
  }

  private getHistory(params: BackendActionParams, type: 'private' | 'group') {
    const count = Math.min(100, Math.max(1, Number(params.count) || 20));
    const targetId = type === 'group'
      ? requiredId(params.group_id, 'group_id')
      : requiredId(params.user_id, 'user_id');
    const list = [...this.messages.values()]
      .filter(record => (type === 'group' ? record.group_id === targetId : record.user_id === targetId))
      .slice(-count)
      .map(record => ({
        message_id: record.id,
        message_type: record.message_type,
        sender: record.sender,
        time: record.time,
        message: record.message,
        raw_message: record.raw_message,
      }));
    return { messages: list };
  }

  private kickMember(params: BackendActionParams): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const group = this.requireGroup(groupId);
    if (!group.members.has(userId)) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    if (group.members.get(userId)?.role === 'owner') throw ActionError.noPermission('不能踢出群主');
    group.members.delete(userId);
    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: SELF_ID,
      post_type: 'notice',
      notice_type: 'group_decrease',
      sub_type: userId === SELF_ID ? 'kick_me' : 'kick',
      group_id: groupId,
      operator_id: SELF_ID,
      user_id: userId,
    });
    return null;
  }

  private banMember(params: BackendActionParams, whole: boolean): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const group = this.requireGroup(groupId);
    const duration = Math.max(0, Math.min(30 * 24 * 3600, Number(params.duration) || 0));

    if (whole) {
      group.whole_ban = Boolean(params.enable);
      this.emit({
        time: Math.floor(Date.now() / 1000),
        self_id: SELF_ID,
        post_type: 'notice',
        notice_type: 'group_ban',
        sub_type: group.whole_ban ? 'ban' : 'lift_ban',
        group_id: groupId,
        operator_id: SELF_ID,
        user_id: 0,
        duration: group.whole_ban ? duration || 0 : 0,
      });
      return null;
    }

    const userId = requiredId(params.user_id, 'user_id');
    const member = group.members.get(userId);
    if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    if (member.role === 'owner') throw ActionError.noPermission('不能禁言群主');
    member.shut_up_until = duration > 0 ? Date.now() + duration * 1000 : 0;
    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: SELF_ID,
      post_type: 'notice',
      notice_type: 'group_ban',
      sub_type: duration > 0 ? 'ban' : 'lift_ban',
      group_id: groupId,
      operator_id: SELF_ID,
      user_id: userId,
      duration,
    });
    return null;
  }

  private setAdmin(params: BackendActionParams): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const group = this.requireGroup(groupId);
    const member = group.members.get(userId);
    if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    if (member.role === 'owner') throw ActionError.noPermission('群主不能设置为管理员');
    const enable = Boolean(params.enable);
    member.role = enable ? 'admin' : 'member';
    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: SELF_ID,
      post_type: 'notice',
      notice_type: 'group_admin',
      sub_type: enable ? 'set' : 'unset',
      group_id: groupId,
      user_id: userId,
    });
    return null;
  }

  private setCard(params: BackendActionParams): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const group = this.requireGroup(groupId);
    const member = group.members.get(userId);
    if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    const oldCard = member.card;
    member.card = typeof params.card === 'string' ? params.card : '';
    if (oldCard !== member.card) {
      this.emit({
        time: Math.floor(Date.now() / 1000),
        self_id: SELF_ID,
        post_type: 'notice',
        notice_type: 'group_card',
        group_id: groupId,
        user_id: userId,
        card_old: oldCard,
        card_new: member.card,
      });
    }
    return null;
  }

  private setGroupName(params: BackendActionParams): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const group = this.requireGroup(groupId);
    const name = typeof params.group_name === 'string' ? params.group_name.trim() : '';
    if (!name) throw ActionError.badRequest('group_name 不能为空');
    group.name = name;
    return null;
  }

  private leaveGroup(params: BackendActionParams): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const group = this.requireGroup(groupId);
    group.members.delete(SELF_ID);
    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: SELF_ID,
      post_type: 'notice',
      notice_type: 'group_decrease',
      sub_type: 'leave',
      group_id: groupId,
      operator_id: SELF_ID,
      user_id: SELF_ID,
    });
    return null;
  }

  private setSpecialTitle(params: BackendActionParams): null {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const group = this.requireGroup(groupId);
    const member = group.members.get(userId);
    if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    member.title = typeof params.special_title === 'string' ? params.special_title : '';
    return null;
  }

  private getHonorInfo(params: BackendActionParams) {
    const groupId = requiredId(params.group_id, 'group_id');
    this.requireGroup(groupId);
    return {
      group_id: groupId,
      talkative_list: [],
      performer_list: [],
      legend_list: [],
      emotion_list: [],
    };
  }

  private createMessage(input: {
    message_type: 'private' | 'group';
    user_id: number;
    group_id?: number;
    target_id?: number;
    sender: Sender;
    message: MessageSegment[];
    post_type: 'message' | 'message_sent';
    sub_type?: 'friend' | 'normal' | 'anonymous';
    anonymous?: { id: number; name: string; flag: string };
  }): StoredMessage {
    const record: StoredMessage = {
      id: this.nextMessageId++,
      message_type: input.message_type,
      user_id: input.user_id,
      group_id: input.group_id,
      target_id: input.target_id,
      sender: input.sender,
      message: input.message.map(segment => ({ type: segment.type, data: { ...segment.data } })),
      raw_message: toCQCode(input.message),
      time: Math.floor(Date.now() / 1000),
      post_type: input.post_type,
      sub_type: input.sub_type ?? (input.message_type === 'group' ? 'normal' : 'friend'),
      anonymous: input.anonymous,
      recalled: false,
    };
    this.messages.set(record.id, record);
    return record;
  }

  private messageEvent(record: StoredMessage): OneBotEvent {
    return {
      time: record.time,
      self_id: SELF_ID,
      post_type: record.post_type,
      message_type: record.message_type,
      sub_type: record.sub_type,
      message_id: record.id,
      user_id: record.sender.user_id,
      message: record.message,
      raw_message: record.raw_message,
      font: 0,
      sender: record.sender,
      ...(record.anonymous === undefined ? {} : { anonymous: record.anonymous }),
      ...(record.group_id === undefined ? {} : { group_id: record.group_id }),
      ...(record.target_id === undefined ? {} : { target_id: record.target_id }),
    };
  }

  private emit(event: OneBotEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 一个消费者失败不能影响其他消费者。
      }
    }
  }

  private selfSender(group?: MockGroup): Sender {
    const member = group?.members.get(SELF_ID);
    return {
      user_id: SELF_ID,
      nickname: member?.nickname ?? '影梦',
      card: member?.card ?? '',
      role: member?.role ?? 'owner',
    };
  }

  private groupInfo(group: MockGroup): GroupInfo {
    return {
      group_id: group.group_id,
      group_name: group.name,
      member_count: group.members.size,
      max_member_count: group.max_member_count,
      owner_id: group.owner_id,
    };
  }

  private memberInfo(group: MockGroup, member: MockMember): GroupMemberInfo {
    return {
      group_id: group.group_id,
      user_id: member.user_id,
      nickname: member.nickname,
      card: member.card,
      role: member.role,
      join_time: member.join_time,
      last_sent_time: member.last_sent_time,
      title: member.title ?? '',
      level: '1',
      unfriendly: false,
      card_changeable: member.role !== 'owner',
    };
  }

  private findMember(userId: number): { group: MockGroup; member: MockMember } | null {
    for (const group of this.groups.values()) {
      const member = group.members.get(userId);
      if (member) return { group, member };
    }
    return null;
  }

  private requireGroup(groupId: number): MockGroup {
    const group = this.groups.get(groupId);
    if (!group) throw ActionError.notFound(`群 ${groupId} 不存在`);
    return group;
  }

  private seed(): void {
    const friend = (user_id: number, nickname: string, remark = '', sex: 'male' | 'female' | 'unknown' = 'unknown'): MockFriend => ({
      user_id,
      nickname,
      remark,
      sex,
      age: user_id % 30,
    });
    this.friends.set(20001, friend(20001, '小梦', '梦梦', 'female'));
    this.friends.set(20002, friend(20002, '阿岚', '', 'male'));
    this.friends.set(20003, friend(20003, '夜航船', '', 'unknown'));

    const member = (user_id: number, nickname: string, role: Role, card = ''): MockMember => ({
      user_id,
      nickname,
      card,
      role,
      join_time: 1_700_000_000,
      last_sent_time: 1_700_000_000,
    });

    const devGroup: MockGroup = {
      group_id: 30001,
      name: '影梦开发组',
      owner_id: SELF_ID,
      whole_ban: false,
      max_member_count: 200,
      members: new Map([
        [SELF_ID, member(SELF_ID, '影梦', 'owner', '影梦')],
        [20001, member(20001, '小梦', 'admin', '梦梦')],
        [20002, member(20002, '阿岚', 'member')],
        [20003, member(20003, '夜航船', 'member')],
        [30004, member(30004, '纸鸢', 'member')],
      ]),
    };
    this.groups.set(devGroup.group_id, devGroup);

    const nightGroup: MockGroup = {
      group_id: 30002,
      name: '夜航船',
      owner_id: 20002,
      whole_ban: false,
      max_member_count: 500,
      members: new Map([
        [20002, member(20002, '阿岚', 'owner')],
        [20003, member(20003, '夜航船', 'admin')],
        [20001, member(20001, '小梦', 'member')],
        [SELF_ID, member(SELF_ID, '影梦', 'member')],
      ]),
    };
    this.groups.set(nightGroup.group_id, nightGroup);
  }
}

function requiredId(value: unknown, name: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw ActionError.badRequest(`${name} 必须是正整数`);
  }
  return Math.trunc(num);
}

function requiredMessage(params: BackendActionParams): MessageSegment[] {
  const message = normalizeMessage(
    params.message as string | MessageSegment[] | undefined,
    Boolean(params.auto_escape),
  );
  if (message.length === 0) throw ActionError.badRequest('message 不能为空');
  return message;
}

