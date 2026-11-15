import {
  ActionError,
  MessageIdRegistry,
  normalizeMessage,
  type Backend,
  type BackendActionContext,
  type BackendActionParams,
  type Capability,
  type FriendInfo,
  type Logger,
  type MessageSegment,
  type OneBotEvent,
  type SelfInfo,
} from '@shadowdream/core';
import {
  friendToInfo,
  groupToInfo,
  memberToInfo,
  messageToElements,
  rawToEvent,
  rawToMessageInfo,
  type ConvertContext,
  type GroupLike,
  type MemberLike,
  type RawMessage,
} from './convert.js';

interface QqntBackendOptions {
  session: any;
  wrapper: any;
  selfId: number;
  selfUid: string;
  selfNick: string;
  logger: Logger;
}

interface MessagePeer {
  chatType: number;
  peerUid: string;
  guildId: string;
}

interface PendingSend {
  resolve: (raw: RawMessage) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * QQNT 后端。它只使用 QQ 自己已经建立好的 session，
 * 不碰登录密钥，也不做协议重放。
 */
export class QqntBackend implements Backend {
  readonly name = 'qqnt';
  readonly version = '0.2.0';
  readonly selfId: number;
  readonly capabilities: ReadonlySet<Capability> = new Set<Capability>([
    'text',
    'face',
    'at',
    'reply',
    'group_admin',
  ]);
  readonly supportedActions = [
    'send_private_msg',
    'send_group_msg',
    'send_msg',
    'delete_msg',
    'get_msg',
    'get_group_list',
    'get_group_info',
    'get_group_member_list',
    'get_group_member_info',
    'get_friend_list',
    'get_stranger_info',
    'get_group_msg_history',
    'get_friend_msg_history',
    'set_group_ban',
    'set_group_whole_ban',
    'set_group_kick',
    'set_group_admin',
    'set_group_card',
    'set_group_name',
    'get_group_at_all_remain',
    'get_group_file_system_info',
    'get_group_root_files',
    'get_group_files_by_folder',
    'get_group_honor_info',
    'get_forward_msg',
    'get_group_add_request',
    'get_friend_add_request',
    'get_unidirectional_friend_list',
    'get_emoji_likes',
    'get_online_clients',
    'get_guild_service_profile',
    'get_guild_list',
    'set_group_leave',
  ];

  private readonly session: any;
  private readonly wrapper: any;
  private readonly logger: Logger;
  private readonly selfUid: string;
  private readonly selfNick: string;

  private readonly ids = new MessageIdRegistry();
  private readonly messages = new Map<number, RawMessage>();
  private readonly messageOrder: number[] = [];
  private readonly messagePeers = new Map<number, MessagePeer>();
  private readonly byMsgId = new Map<string, RawMessage>();
  private readonly bySeq = new Map<string, RawMessage>();
  private readonly seen = new Set<string>();
  private readonly recalled = new Set<string>();
  private readonly listeners = new Set<(event: OneBotEvent) => void>();

  private readonly groups = new Map<number, GroupLike>();
  private readonly members = new Map<number, Map<string, MemberLike>>();
  private readonly friends = new Map<number, FriendInfo>();
  private readonly uidToUin = new Map<string, number>();
  private readonly uinToUid = new Map<number, string>();

  private groupWaiters: Array<() => void> = [];
  private memberWaiters = new Map<number, Array<() => void>>();
  private pendingSends = new Map<string, PendingSend>();
  private msgListenerId: number | undefined;
  private groupListenerId: number | undefined;
  private started = false;

  constructor(options: QqntBackendOptions) {
    this.session = options.session;
    this.wrapper = options.wrapper;
    this.selfId = options.selfId;
    this.selfUid = options.selfUid;
    this.selfNick = options.selfNick;
    this.logger = options.logger.child('backend');
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.installListeners();
    await this.bootstrap();
  }

  async stop(): Promise<void> {
    this.started = false;
    for (const pending of this.pendingSends.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('backend stopped'));
    }
    this.pendingSends.clear();
    try {
      if (this.msgListenerId !== undefined) {
        this.msgService()?.removeKernelMsgListener?.(this.msgListenerId);
      }
      if (this.groupListenerId !== undefined) {
        this.groupService()?.removeKernelGroupListener?.(this.groupListenerId);
      }
    } catch (error) {
      this.logger.debug(`移除 listener 失败：${(error as Error).message}`);
    }
    this.listeners.clear();
  }

  onEvent(listener: (event: OneBotEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSelfInfo(): SelfInfo {
    return { user_id: this.selfId, nickname: this.selfNick, online: true };
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

  async call(
    action: string,
    params: BackendActionParams,
    _context: BackendActionContext,
  ): Promise<unknown> {
    switch (action) {
      case 'send_private_msg':
        return this.send('private', params);
      case 'send_group_msg':
        return this.send('group', params);
      case 'send_msg':
        return this.send(
          params.group_id !== undefined || params.message_type === 'group' ? 'group' : 'private',
          params,
        );
      case 'delete_msg':
        return this.deleteMessage(params);
      case 'get_msg':
        return this.getMessage(params);
      case 'get_group_list':
        await this.refreshGroups();
        return [...this.groups.values()].map(groupToInfo);
      case 'get_group_info': {
        const group = await this.requireGroup(params.group_id);
        return groupToInfo(group);
      }
      case 'get_group_member_list': {
        const groupId = requiredId(params.group_id, 'group_id');
        await this.loadMembers(groupId);
        return [...(this.members.get(groupId)?.values() ?? [])]
          .map(member => memberToInfo(groupId, member));
      }
      case 'get_group_member_info': {
        const groupId = requiredId(params.group_id, 'group_id');
        const userId = requiredId(params.user_id, 'user_id');
        await this.loadMembers(groupId);
        const member = this.findMember(groupId, userId);
        if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
        return memberToInfo(groupId, member);
      }
      case 'get_friend_list':
        await this.loadFriends();
        return [...this.friends.values()];
      case 'get_stranger_info':
        return this.getStrangerInfo(params);
      case 'get_group_msg_history':
        return this.getHistory(params, 'group');
      case 'get_friend_msg_history':
        return this.getHistory(params, 'private');
      case 'set_group_ban':
        return this.setGroupBan(params);
      case 'set_group_whole_ban':
        return this.setGroupWholeBan(params);
      case 'set_group_kick':
        return this.kickMember(params);
      case 'set_group_admin':
        return this.setGroupAdmin(params);
      case 'set_group_card':
        return this.setGroupCard(params);
      case 'set_group_name':
        return this.setGroupName(params);
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
      case 'get_group_honor_info': {
        const groupId = requiredId(params.group_id, 'group_id');
        return {
          group_id: groupId,
          talkative_list: [],
          performer_list: [],
          legend_list: [],
          emotion_list: [],
        };
      }
      case 'get_forward_msg':
        return { messages: [] };
      case 'get_group_add_request':
      case 'get_friend_add_request':
      case 'get_unidirectional_friend_list':
      case 'get_emoji_likes':
        return [];
      case 'get_online_clients':
        return { clients: [] };
      case 'get_guild_service_profile':
        return {};
      case 'get_guild_list':
        return [];
      case 'set_group_leave':
        return this.leaveGroup(params);
      default:
        throw ActionError.unsupported(`QQNT 插件暂不支持 action：${action}`);
    }
  }

  /** 收到 QQNT 推送的原始消息。 */
  onRawMessages(messages: RawMessage[]): void {
    for (const raw of messages ?? []) {
      if (!raw?.msgId) continue;
      if (this.seen.has(raw.msgId)) continue;
      this.seen.add(raw.msgId);
      if (this.seen.size > 4000) this.seen.clear();

      // 自己发的消息由 send() 统一产生 message_sent，避免重复。
      if (this.selfUid && raw.senderUid === this.selfUid) continue;

      // QQ 的群列表经常在登录后很久才推送；先从群消息里补一个最小群缓存，
      // 这样 get_group_list 和群操作不会在刚登录时误报“群不存在”。
      if (raw.chatType === 2 && raw.peerUid) {
        const groupId = Number(raw.peerUid);
        if (groupId && !this.groups.has(groupId)) {
          this.groups.set(groupId, { groupCode: String(raw.peerUid), groupName: '' } as GroupLike);
        }
      }

      this.register(raw);
      try {
        this.emit(rawToEvent(raw, this.context()));
      } catch (error) {
        this.logger.warn(`消息转换失败 ${raw.msgId}：${(error as Error).message}`);
      }
    }
  }

  onMsgInfoListUpdate(messages: RawMessage[]): void {
    for (const raw of messages ?? []) {
      if (!raw) continue;
      if (raw.guildId && this.pendingSends.has(raw.guildId)) {
        const pending = this.pendingSends.get(raw.guildId);
        if (pending) {
          this.pendingSends.delete(raw.guildId);
          clearTimeout(pending.timer);
          this.register(raw);
          pending.resolve(raw);
        }
      }
      // 撤回后 QQ 会把 recallTime 从 '0' 改成时间戳。
      if (raw.recallTime && raw.recallTime !== '0' && raw.msgId) {
        this.emitRecall(raw);
      }
    }
  }

  onMsgRecall(chatType: number, uid: string, msgSeq: string): void {
    const raw = this.bySeq.get(String(msgSeq));
    if (raw) {
      this.emitRecall(raw);
      return;
    }
    const oneBotId = this.ids.toOneBot(`recall:${chatType}:${uid}:${msgSeq}`);
    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: this.selfId,
      post_type: 'notice',
      notice_type: chatType === 2 ? 'group_recall' : 'friend_recall',
      ...(chatType === 2
        ? {
            group_id: 0,
            operator_id: this.resolveUin(uid) || this.selfId,
            user_id: this.resolveUin(uid) || 0,
            message_id: oneBotId,
          }
        : {
            user_id: this.resolveUin(uid) || 0,
            message_id: oneBotId,
          }),
    } as OneBotEvent);
  }

  onGroupListUpdate(groups: GroupLike[] | { groupList?: GroupLike[] }): void {
    const list = Array.isArray(groups) ? groups : (groups?.groupList ?? []);
    for (const group of list) {
      if (!group?.groupCode) continue;
      this.groups.set(Number(group.groupCode), group);
      if (group.groupOwnerId?.memberUid) {
        this.uidToUin.set(
          group.groupOwnerId.memberUid,
          Number(group.groupOwnerId.memberUin ?? 0),
        );
      }
    }
    const waiters = this.groupWaiters;
    this.groupWaiters = [];
    for (const resolve of waiters) resolve();
  }

  /** 启动时预热群列表与好友列表；失败不阻塞 OneBot 启动。 */
  async bootstrap(): Promise<void> {
    try {
      await this.refreshGroups();
    } catch (error) {
      this.logger.warn(`加载群列表失败：${(error as Error).message}`);
    }
    try {
      await this.loadFriends();
    } catch (error) {
      this.logger.debug(`加载好友列表失败：${(error as Error).message}`);
    }
  }

  private installListeners(): void {
    const msgService = this.msgService();
    if (msgService?.addKernelMsgListener) {
      const listener = {
        onRecvMsg: (messages: RawMessage[]) => this.onRawMessages(messages),
        onRecvActiveMsg: (messages: RawMessage[]) => this.onRawMessages(messages),
        onRecvGroupMsg: (messages: RawMessage[]) => this.onRawMessages(messages),
        onAddSendMsg: (message: RawMessage) => this.onMsgInfoListUpdate([message]),
        onMsgInfoListUpdate: (messages: RawMessage[]) => this.onMsgInfoListUpdate(messages),
        onMsgRecall: (chatType: number, uid: string, msgSeq: string) => this.onMsgRecall(chatType, uid, msgSeq),
        onKickedOffLine: () => this.logger.warn('QQ 账号被踢下线'),
        onSelfOffline: () => this.logger.warn('QQ 账号离线'),
      };
      try {
        this.msgListenerId = msgService.addKernelMsgListener(listener);
      } catch (error) {
        this.logger.warn(`注册消息 listener 失败：${(error as Error).message}`);
      }
    }

    const groupService = this.groupService();
    if (groupService?.addKernelGroupListener) {
      const listener = {
        onGroupListUpdate: (groups: GroupLike[]) => this.onGroupListUpdate(groups),
      };
      try {
        this.groupListenerId = groupService.addKernelGroupListener(listener);
      } catch (error) {
        this.logger.warn(`注册群 listener 失败：${(error as Error).message}`);
      }
    }
  }

  private async send(type: 'private' | 'group', params: BackendActionParams): Promise<{ message_id: number }> {
    const message = normalizeMessage(
      params.message as string | MessageSegment[] | undefined,
      Boolean(params.auto_escape),
    );
    if (message.length === 0) throw ActionError.badRequest('message 不能为空');

    const targetId = requiredId(type === 'group' ? params.group_id : params.user_id, type === 'group' ? 'group_id' : 'user_id');
    // 发送不依赖群列表缓存：QQ 的群列表是异步推送的，刚登录/刚启动时
    // cache 可能还是空的，但群消息已经能收到。直接构造 peer，让 QQ 自己校验。
    let peerUid = type === 'group' ? String(targetId) : await this.resolveUid(targetId);
    if (type === 'private' && !peerUid) {
      // 自动登录后好友列表可能还没拉完；发送时再强制刷新一次。
      await this.loadFriends(true);
      peerUid = await this.resolveUid(targetId);
    }
    const peer = type === 'group'
      ? { chatType: 2, peerUid, guildId: '' }
      : { chatType: 1, peerUid, guildId: '' };
    if (type === 'private' && !peer.peerUid) {
      throw ActionError.notFound(`无法把 QQ ${targetId} 转成 NTQQ uid，可能不是好友`);
    }

    // @ 需要群成员缓存来拿昵称和 atNtUid；发送前加载一次。
    if (type === 'group' && message.some(segment => segment.type === 'at')) {
      await this.loadMembers(targetId);
    }
    const elements = await messageToElements(message, {
      ...this.context(),
      groupId: type === 'group' ? targetId : undefined,
    });
    const service = this.msgService();
    if (!service?.sendMsg) throw ActionError.unsupported('当前 QQNT 版本没有 sendMsg');

    const uniqueId = this.makeUniqueId(peer.chatType);
    peer.guildId = uniqueId;
    const raw = await new Promise<RawMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingSends.delete(uniqueId);
        reject(new Error('发送超时：QQ 没有回传消息 ID'));
      }, 15_000);
      this.pendingSends.set(uniqueId, { resolve, reject, timer });

      Promise.resolve(service.sendMsg('0', peer, elements, new Map()))
        .then((result: { result?: number; errMsg?: string } | undefined) => {
          if (result && typeof result.result === 'number' && result.result !== 0) {
            const pending = this.pendingSends.get(uniqueId);
            if (pending) {
              clearTimeout(pending.timer);
              this.pendingSends.delete(uniqueId);
              reject(new Error(result.errMsg || `sendMsg 返回 ${result.result}`));
            }
          }
        })
        .catch((error: unknown) => {
          const pending = this.pendingSends.get(uniqueId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingSends.delete(uniqueId);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
    });

    const event = rawToEvent(raw, this.context(), 'message_sent');
    if (type === 'private') event.target_id = targetId;
    this.emit(event);
    return { message_id: event.message_id };
  }

  private deleteMessage(params: BackendActionParams): null {
    const id = requiredId(params.message_id, 'message_id');
    const raw = this.messages.get(id);
    if (!raw) throw ActionError.notFound(`消息 ${id} 不在缓存中`);
    const peer = { chatType: raw.chatType, peerUid: raw.peerUid, guildId: '' };
    const service = this.msgService();
    if (!service?.recallMsg) throw ActionError.unsupported('当前 QQNT 版本没有 recallMsg');
    void service.recallMsg(peer, [raw.msgId]);
    return null;
  }

  private async getMessage(params: BackendActionParams): Promise<Record<string, unknown>> {
    const id = requiredId(params.message_id, 'message_id');
    let raw = this.messages.get(id);
    if (!raw) {
      // 缓存没有时，尝试用 QQ 的消息接口拉取历史消息。回复消息的
      // replyElement 里有目标 msgId，收到回复时已经记下了它属于哪个 peer。
      const internalId = this.ids.toInternal(id);
      const peer = this.messagePeers.get(id);
      const service = this.msgService();
      if (internalId && peer && typeof service?.getMsgsByMsgId === 'function') {
        try {
          const result = await service.getMsgsByMsgId(peer, [internalId]);
          raw = result?.msgList?.[0] as RawMessage | undefined;
          if (raw) this.register(raw);
        } catch (error) {
          this.logger.debug(`get_msg 从 QQ 拉取 ${id} 失败：${(error as Error).message}`);
        }
      }
    }
    if (!raw) throw ActionError.notFound(`消息 ${id} 不在缓存中`);
    return rawToMessageInfo(raw, this.context());
  }

  private getHistory(params: BackendActionParams, type: 'group' | 'private'): { messages: Record<string, unknown>[] } {
    const count = Math.min(100, Math.max(1, Number(params.count) || 20));
    const target = type === 'group'
      ? requiredId(params.group_id, 'group_id')
      : requiredId(params.user_id, 'user_id');
    const rows = [...this.messages.values()]
      .filter(raw => (type === 'group'
        ? Number(raw.peerUid) === target
        : Number(raw.senderUin) === target || Number(raw.peerUin) === target))
      .slice(-count)
      .map(raw => rawToMessageInfo(raw, this.context()));
    return { messages: rows };
  }

  private async getStrangerInfo(params: BackendActionParams): Promise<Record<string, unknown>> {
    const userId = requiredId(params.user_id, 'user_id');
    const uid = await this.resolveUid(userId);
    if (!uid) throw ActionError.notFound(`用户 ${userId} 不存在`);
    const map = await this.profileService()?.getCoreAndBaseInfo?.('0', [uid]);
    const profile = map instanceof Map ? map.get(uid) : undefined;
    return {
      user_id: userId,
      nickname: profile?.nick ?? profile?.nickname ?? '',
      sex: 'unknown',
      age: 0,
    };
  }

  private async setGroupBan(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const duration = Math.max(0, Number(params.duration) || 0);
    const member = await this.requireMember(groupId, userId);
    // NTQQ 的 timeStamp 参数是「禁言秒数」，0 表示解除；不是绝对时间戳。
    const result = await this.groupService()?.setMemberShutUp?.(String(groupId), [{
      uid: member.uid,
      timeStamp: duration,
    }]);
    assertResult(result, '禁言失败');
    return null;
  }

  private async setGroupWholeBan(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const result = await this.groupService()?.setGroupShutUp?.(String(groupId), Boolean(params.enable));
    assertResult(result, '全员禁言失败');
    return null;
  }

  private async kickMember(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const member = await this.requireMember(groupId, userId);
    await this.groupService()?.kickMember?.(String(groupId), [member.uid], false, '');
    return null;
  }

  private async setGroupAdmin(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const member = await this.requireMember(groupId, userId);
    await this.groupService()?.modifyMemberRole?.(String(groupId), member.uid, Boolean(params.enable) ? 3 : 2);
    return null;
  }

  private async setGroupCard(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const userId = requiredId(params.user_id, 'user_id');
    const member = await this.requireMember(groupId, userId);
    await this.groupService()?.modifyMemberCardName?.(
      String(groupId),
      member.uid,
      typeof params.card === 'string' ? params.card : '',
    );
    return null;
  }

  private async setGroupName(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const name = typeof params.group_name === 'string' ? params.group_name.trim() : '';
    if (!name) throw ActionError.badRequest('group_name 不能为空');
    const result = await this.groupService()?.modifyGroupName?.(String(groupId), name, false);
    assertResult(result, '修改群名失败');
    return null;
  }

  private async leaveGroup(params: BackendActionParams): Promise<null> {
    const groupId = requiredId(params.group_id, 'group_id');
    const service = this.groupService();
    if (service?.quitGroupV2) {
      const result = await service.quitGroupV2({ groupCode: String(groupId), needDeleteLocalMsg: false });
      assertResult(result, '退出群聊失败');
    } else if (service?.quitGroup) {
      service.quitGroup(String(groupId));
    } else {
      throw ActionError.unsupported('当前 QQNT 版本没有 quitGroup');
    }
    return null;
  }

  private async requireGroup(groupIdValue: unknown): Promise<GroupLike> {
    const groupId = requiredId(groupIdValue, 'group_id');
    await this.refreshGroups();
    const group = this.groups.get(groupId);
    if (!group) throw ActionError.notFound(`群 ${groupId} 不存在`);
    return group;
  }

  private async refreshGroups(timeoutMs = 3000): Promise<void> {
    if (this.groups.size > 0) return;
    const service = this.groupService();
    if (!service?.getGroupList) return;
    let timer: NodeJS.Timeout | undefined;
    const wait = new Promise<void>((resolve) => {
      this.groupWaiters.push(resolve);
      timer = setTimeout(resolve, timeoutMs);
    });
    try {
      const result = await service.getGroupList(true);
      const inline = result?.groupList ?? result?.result?.groupList;
      if (Array.isArray(inline) && inline.length > 0) this.onGroupListUpdate(inline);
    } catch (error) {
      this.logger.debug(`getGroupList 失败：${(error as Error).message}`);
    } finally {
      if (timer) clearTimeout(timer);
      const pending = this.groupWaiters;
      this.groupWaiters = [];
      for (const resolve of pending) resolve();
    }
    await wait;
  }

  private async loadMembers(groupId: number): Promise<void> {
    if (this.members.has(groupId)) return;
    const waiters = this.memberWaiters.get(groupId) ?? [];
    const service = this.groupService();
    if (!service?.getAllMemberList) return;

    let timer: NodeJS.Timeout | undefined;
    const wait = new Promise<void>((resolve) => {
      waiters.push(resolve);
      this.memberWaiters.set(groupId, waiters);
      timer = setTimeout(resolve, 5000);
    });
    try {
      const result = await service.getAllMemberList(String(groupId), true);
      const infos = result?.result?.infos;
      const map = new Map<string, MemberLike>();
      if (infos instanceof Map) {
        for (const member of infos.values()) map.set(member.uid, member);
      } else if (Array.isArray(infos)) {
        for (const member of infos as MemberLike[]) map.set(member.uid, member);
      } else if (infos && typeof infos === 'object') {
        for (const member of Object.values(infos) as MemberLike[]) map.set(member.uid, member);
      }
      for (const member of map.values()) {
        if (member.uin) this.uidToUin.set(member.uid, Number(member.uin));
      }
      this.members.set(groupId, map);
    } catch (error) {
      this.logger.warn(`加载群 ${groupId} 成员失败：${(error as Error).message}`);
    } finally {
      if (timer) clearTimeout(timer);
      const pending = this.memberWaiters.get(groupId) ?? [];
      this.memberWaiters.delete(groupId);
      for (const resolve of pending) resolve();
    }
    await wait;
  }

  private async loadFriends(force = false): Promise<void> {
    if (!force && this.friends.size > 0) return;
    const service = this.buddyService();
    if (!service?.getBuddyListV2) return;
    let result: any;
    try {
      // 新版本是 (callFrom, isPullRefresh, reqType)，旧版本只有两参。
      result = await service.getBuddyListV2('0', true, 0);
    } catch {
      result = await service.getBuddyListV2('0', 0);
    }
    const uids: string[] = (result?.data ?? []).flatMap((category: { buddyUids?: string[] }) => category.buddyUids ?? []);
    if (uids.length === 0) return;
    const profiles = await this.profileService()?.getCoreAndBaseInfo?.('0', uids);
    if (!(profiles instanceof Map)) return;
    for (const [uid, profile] of profiles) {
      const info = friendToInfo(profile as Record<string, unknown>);
      if (!info.user_id) continue;
      this.friends.set(info.user_id, info);
      this.uinToUid.set(info.user_id, uid);
      this.uidToUin.set(uid, info.user_id);
    }
  }

  private findMember(groupId: number, userId: number): MemberLike | undefined {
    for (const member of this.members.get(groupId)?.values() ?? []) {
      if (Number(member.uin) === userId) return member;
    }
    return undefined;
  }

  private async requireMember(groupId: number, userId: number): Promise<MemberLike> {
    await this.loadMembers(groupId);
    const member = this.findMember(groupId, userId);
    if (!member) throw ActionError.notFound(`群 ${groupId} 中不存在成员 ${userId}`);
    return member;
  }

  private resolveUin(uid: string): number {
    if (!uid) return 0;
    const cached = this.uidToUin.get(uid);
    if (cached) return cached;
    for (const map of this.members.values()) {
      const member = map.get(uid);
      if (member?.uin) {
        const uin = Number(member.uin);
        this.uidToUin.set(uid, uin);
        this.uinToUid.set(uin, uid);
        return uin;
      }
    }
    try {
      const map = this.profileService()?.getUinByUid?.('0', [uid]);
      if (map instanceof Map) {
        const uin = Number(map.get(uid));
        if (uin) {
          this.uidToUin.set(uid, uin);
          this.uinToUid.set(uin, uid);
          return uin;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  }

  private async resolveUid(uin: number): Promise<string> {
    const cached = this.uinToUid.get(uin);
    if (cached) return cached;
    try {
      const map = await this.profileService()?.getUidByUin?.('0', [String(uin)]);
      if (map instanceof Map) {
        const uid = String(map.get(String(uin)) ?? map.get(uin as unknown as string) ?? '');
        if (uid) {
          this.uinToUid.set(uin, uid);
          this.uidToUin.set(uid, uin);
          return uid;
        }
      }
    } catch {
      // ignore
    }
    for (const map of this.members.values()) {
      for (const member of map.values()) {
        if (Number(member.uin) === uin) {
          this.uinToUid.set(uin, member.uid);
          this.uidToUin.set(member.uid, uin);
          return member.uid;
        }
      }
    }
    return '';
  }

  private emitRecall(raw: RawMessage): void {
    if (!raw.msgId || this.recalled.has(raw.msgId)) return;
    this.recalled.add(raw.msgId);
    if (this.recalled.size > 2000) this.recalled.clear();
    const oneBotId = this.ids.toOneBot(raw.msgId);
    const isGroup = raw.chatType === 2;
    this.emit({
      time: Math.floor(Date.now() / 1000),
      self_id: this.selfId,
      post_type: 'notice',
      notice_type: isGroup ? 'group_recall' : 'friend_recall',
      ...(isGroup
        ? {
            group_id: Number(raw.peerUid),
            operator_id: this.selfId,
            user_id: Number(raw.senderUin) || this.resolveUin(raw.senderUid),
            message_id: oneBotId,
          }
        : {
            user_id: Number(raw.senderUin) || this.resolveUin(raw.senderUid),
            message_id: oneBotId,
          }),
    } as OneBotEvent);
  }

  private register(raw: RawMessage): void {
    // 先记录 reply 目标，即使当前消息本身没有 msgId，也能让 get_msg 找到
    // 被回复消息所属的群 / 好友。
    this.rememberReplyTargets(raw);
    if (!raw.msgId) return;
    const id = this.ids.toOneBot(raw.msgId);
    this.rememberPeer(id, raw);
    if (!this.messages.has(id)) {
      this.messages.set(id, raw);
      this.messageOrder.push(id);
      if (this.messageOrder.length > 2000) {
        const oldest = this.messageOrder.shift();
        if (oldest !== undefined) this.messages.delete(oldest);
      }
    }
    this.byMsgId.set(raw.msgId, raw);
    if (raw.msgSeq) this.bySeq.set(String(raw.msgSeq), raw);
    if (raw.senderUid && raw.senderUin) {
      this.uidToUin.set(raw.senderUid, Number(raw.senderUin));
      this.uinToUid.set(Number(raw.senderUin), raw.senderUid);
    }
  }

  private rememberPeer(oneBotId: number, raw: RawMessage): void {
    if (!raw.peerUid) return;
    this.messagePeers.set(oneBotId, {
      chatType: raw.chatType,
      peerUid: raw.peerUid,
      guildId: raw.guildId ?? '',
    });
    if (this.messagePeers.size > 5000) {
      const oldest = this.messagePeers.keys().next().value;
      if (oldest !== undefined) this.messagePeers.delete(oldest);
    }
  }

  private rememberReplyTargets(raw: RawMessage): void {
    for (const element of raw.elements ?? []) {
      const replyId = element.replyElement?.replayMsgId;
      if (!replyId) continue;
      this.rememberPeer(this.ids.toOneBot(replyId), raw);
    }
  }

  private context(): ConvertContext {
    return {
      selfId: this.selfId,
      selfUid: this.selfUid,
      ids: this.ids,
      resolveUin: uid => this.resolveUin(uid),
      resolveUid: uin => this.resolveUid(uin),
      rawOf: id => this.messages.get(Number(id)),
      groupOf: groupId => this.groups.get(groupId),
      memberOf: (groupId, uid) => this.members.get(groupId)?.get(uid),
      memberByUin: (groupId, uin) => this.findMember(groupId, uin),
    };
  }

  private emit(event: OneBotEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.warn(`事件监听器异常：${(error as Error).message}`);
      }
    }
  }

  private msgService(): any {
    return this.session?.getMsgService?.();
  }

  private groupService(): any {
    return this.session?.getGroupService?.();
  }

  private buddyService(): any {
    return this.session?.getBuddyService?.();
  }

  private profileService(): any {
    return this.session?.getProfileService?.();
  }

  private makeUniqueId(chatType: number): string {
    try {
      const id = this.msgService()?.generateMsgUniqueId?.(chatType, String(Date.now()));
      if (id) return String(id);
    } catch {
      // ignore
    }
    return `shadowdream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function requiredId(value: unknown, name: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) throw ActionError.badRequest(`${name} 必须是正整数`);
  return Math.trunc(num);
}

function assertResult(result: { result?: number; errMsg?: string } | undefined, label: string): void {
  if (result && typeof result.result === 'number' && result.result !== 0) {
    throw ActionError.internal(`${label}：${result.errMsg || `错误码 ${result.result}`}`);
  }
}

