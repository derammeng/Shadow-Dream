import {
  ActionError,
  toCQCode,
  type FriendInfo,
  type GroupInfo,
  type GroupMemberInfo,
  type MessageEvent,
  type MessageSegment,
} from '@shadowdream/core';
import type { MessageIdRegistry } from '@shadowdream/core';

/**
 * 对 NTQQ wrapper 的最小结构描述。
 *
 * 这里刻意不做完整建模：QQ 的字段在不同版本间会增删，后端只依赖真正
 * 用到的那部分，避免因为多写一个可选字段就与新版 wrapper 冲突。
 */
export interface RawMessage {
  msgId: string;
  msgSeq: string;
  msgTime: string;
  chatType: number;
  peerUid: string;
  peerUin?: string;
  senderUid: string;
  senderUin: string;
  sendNickName: string;
  sendRemarkName?: string;
  sendMemberName?: string;
  elements: MessageElement[];
  guildId?: string;
  clientSeq?: string;
  sendStatus?: number;
  recallTime?: string;
  msgRandom?: string;
}

export interface MessageElement {
  elementType: number;
  elementId: string;
  textElement?: {
    content: string;
    atType: number;
    atUid: string;
    atTinyId?: string;
    atNtUid?: string;
  };
  faceElement?: {
    faceIndex: number;
    faceType: number;
    faceText?: string;
    pokeType?: number;
  };
  picElement?: {
    filePath?: string;
    fileName?: string;
    fileUuid?: string;
    fileSize?: string | number;
    picWidth?: number;
    picHeight?: number;
    picSubType?: number;
    summary?: string;
    originImageUrl?: string;
  };
  pttElement?: {
    filePath?: string;
    fileName?: string;
    fileUuid?: string;
    duration?: number;
  };
  videoElement?: {
    filePath?: string;
    fileName?: string;
    fileUuid?: string;
    fileSize?: string;
    fileTime?: number;
  };
  fileElement?: {
    fileName?: string;
    filePath?: string;
    fileSize?: string;
    fileUuid?: string;
  };
  replyElement?: {
    replayMsgId?: string;
    replayMsgSeq?: string;
    senderUin?: string;
    replyMsgTime?: string;
    replyMsgClientSeq?: string;
  };
  marketFaceElement?: {
    emojiId?: string;
    faceName?: string;
    emojiPackageId?: number;
  };
  arkElement?: { bytesData?: string };
  markdownElement?: { content?: string };
  multiForwardMsgElement?: { resId?: string; xmlContent?: string };
  grayTipElement?: {
    subElementType?: number;
    revokeElement?: {
      operatorUid?: string;
      operatorNick?: string;
      isSelfOperate?: boolean;
      wording?: string;
    };
  };
}

export interface GroupLike {
  groupCode: string;
  groupName: string;
  memberCount: number;
  maxMember: number;
  groupOwnerId?: { memberUin?: string; memberUid?: string };
  createTime?: string;
}

export interface MemberLike {
  uid: string;
  uin: string;
  nick: string;
  cardName?: string;
  remark?: string;
  role: number;
  joinTime?: string;
  lastSpeakTime?: string;
  memberSpecialTitle?: string;
  shutUpTime?: number;
}

export interface ConvertContext {
  selfId: number;
  selfUid: string;
  ids: MessageIdRegistry;
  resolveUin(uid: string): number;
  resolveUid(uin: number): Promise<string>;
  rawOf(oneBotId: number | string): RawMessage | undefined;
  groupOf(groupId: number): GroupLike | undefined;
  memberOf(groupId: number, uid: string): MemberLike | undefined;
  /** 发送时所在群；私聊为 undefined。 */
  groupId?: number;
  memberByUin?(groupId: number, uin: number): MemberLike | undefined;
}

const ROLE: Record<number, 'owner' | 'admin' | 'member'> = {
  4: 'owner',
  3: 'admin',
  2: 'member',
};

export function elementsToSegments(elements: MessageElement[], ctx: ConvertContext): MessageSegment[] {
  const out: MessageSegment[] = [];
  for (const element of elements ?? []) {
    switch (element.elementType) {
      case 1: {
        const text = element.textElement;
        if (!text) break;
        const content = String(text.content ?? '');
        if (text.atType && text.atType > 0) {
          let qq: number | string = 0;
          if (text.atType === 1) {
            qq = 'all';
          } else {
            const candidates = [text.atUid, text.atNtUid].filter(Boolean).map(String);
            for (const candidate of candidates) {
              // 群里 @ 机器人时，atUid 可能就是自己的 UID；直接映射，避免 @0。
              if (candidate === ctx.selfUid) { qq = ctx.selfId; break; }
              const member = ctx.groupId ? ctx.memberOf(ctx.groupId, candidate) : undefined;
              if (member?.uin) { qq = Number(member.uin); break; }
              const uin = ctx.resolveUin(candidate);
              if (uin) { qq = uin; break; }
              if (/^\d{5,12}$/.test(candidate)) { qq = Number(candidate); break; }
            }
          }
          out.push({ type: 'at', data: { qq: String(qq) } });
          // NTQQ 的 at 与文字在同一个 textElement 里，把 "@昵称" 前缀去掉。
          const stripped = content.replace(/^@[^\s]+\s*/, '');
          if (stripped) out.push({ type: 'text', data: { text: stripped } });
        } else if (content) {
          out.push({ type: 'text', data: { text: content } });
        }
        break;
      }
      case 2: {
        const pic = element.picElement;
        if (!pic) break;
        out.push({
          type: 'image',
          data: {
            file: pic.filePath || pic.fileName || pic.fileUuid || '',
            url: pic.originImageUrl ?? '',
            sub_type: pic.picSubType === 0 ? 0 : 1,
            ...(pic.summary ? { summary: pic.summary } : {}),
          },
        });
        break;
      }
      case 3: {
        const file = element.fileElement;
        if (!file) break;
        out.push({
          type: 'file',
          data: {
            file: file.filePath || file.fileName || file.fileUuid || '',
            name: file.fileName ?? '',
            size: Number(file.fileSize ?? 0),
          },
        });
        break;
      }
      case 4: {
        const ptt = element.pttElement;
        if (!ptt) break;
        out.push({
          type: 'record',
          data: {
            file: ptt.filePath || ptt.fileUuid || ptt.fileName || '',
            duration: ptt.duration ?? 0,
          },
        });
        break;
      }
      case 5: {
        const video = element.videoElement;
        if (!video) break;
        out.push({
          type: 'video',
          data: {
            file: video.filePath || video.fileName || video.fileUuid || '',
            duration: video.fileTime ?? 0,
          },
        });
        break;
      }
      case 6: {
        const face = element.faceElement;
        if (!face) break;
        out.push({ type: 'face', data: { id: String(face.faceIndex ?? 0) } });
        break;
      }
      case 7: {
        const reply = element.replyElement;
        if (!reply?.replayMsgId) break;
        out.push({
          type: 'reply',
          data: { id: String(ctx.ids.toOneBot(reply.replayMsgId)) },
        });
        break;
      }
      case 10: {
        if (element.arkElement?.bytesData) {
          out.push({ type: 'json', data: { data: element.arkElement.bytesData } });
        }
        break;
      }
      case 11: {
        const mface = element.marketFaceElement;
        if (!mface) break;
        out.push({
          type: 'mface',
          data: {
            id: mface.emojiId ?? '',
            name: mface.faceName ?? '',
            summary: mface.faceName ?? '',
          },
        });
        break;
      }
      case 13: {
        if (element.arkElement?.bytesData) {
          out.push({ type: 'xml', data: { data: element.arkElement.bytesData } });
        }
        break;
      }
      case 14: {
        if (element.markdownElement?.content) {
          out.push({ type: 'markdown', data: { content: element.markdownElement.content } });
        }
        break;
      }
      case 16: {
        if (element.multiForwardMsgElement?.resId) {
          out.push({
            type: 'forward',
            data: { id: element.multiForwardMsgElement.resId },
          });
        }
        break;
      }
      case 8:
        // 灰条（撤回、拍一拍、群操作）在 QQNT 里是独立通知，
        // 0.1 先交给 onMsgRecall 处理，不在消息体里伪造文本。
        break;
      default:
        break;
    }
  }
  return out;
}

export function rawToEvent(
  raw: RawMessage,
  ctx: ConvertContext,
  postType: 'message' | 'message_sent' = 'message',
): MessageEvent {
  const isGroup = raw.chatType === 2;
  const groupId = isGroup ? Number(raw.peerUid) : undefined;
  const senderUin = Number(raw.senderUin) || ctx.resolveUin(raw.senderUid);
  const member = groupId ? ctx.memberOf(groupId, raw.senderUid) : undefined;
  const message = elementsToSegments(raw.elements, groupId === undefined ? ctx : { ...ctx, groupId });
  const base: MessageEvent = {
    time: Number(raw.msgTime) || Math.floor(Date.now() / 1000),
    self_id: ctx.selfId,
    post_type: postType,
    message_type: isGroup ? 'group' : 'private',
    sub_type: isGroup ? 'normal' : 'friend',
    message_id: ctx.ids.toOneBot(raw.msgId),
    user_id: postType === 'message_sent' ? ctx.selfId : senderUin,
    message,
    raw_message: toCQCode(message),
    font: 0,
    sender: {
      user_id: postType === 'message_sent' ? ctx.selfId : senderUin,
      nickname: postType === 'message_sent'
        ? (raw.sendNickName || '我')
        : (raw.sendNickName || member?.nick || ''),
      card: raw.sendMemberName || member?.cardName || '',
      role: postType === 'message_sent'
        ? (member ? ROLE[member.role] ?? 'member' : 'owner')
        : (member ? ROLE[member.role] ?? 'member' : 'member'),
    },
    ...(groupId === undefined ? {} : { group_id: groupId }),
    ...(postType === 'message_sent' && !isGroup ? { target_id: senderUin } : {}),
  };
  return base;
}

export function rawToMessageInfo(raw: RawMessage, ctx: ConvertContext): Record<string, unknown> {
  const event = rawToEvent(raw, ctx);
  return {
    message_id: event.message_id,
    real_id: event.message_id,
    sender: event.sender,
    time: event.time,
    message_type: event.message_type,
    message: event.message,
    raw_message: event.raw_message,
    message_format: 'array',
    ...(event.group_id === undefined ? {} : { group_id: event.group_id }),
    user_id: event.user_id,
  };
}

function elementId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * OneBot 消息段 → NTQQ sendMsg 元素。
 *
 * 0.2 支持 text / at / face / reply / json / mface。媒体类需要 highway
 * 上传，直接塞本地路径不会成功，因此明确返回 1401，而不是发出一条坏消息。
 */
export async function messageToElements(
  message: MessageSegment[],
  ctx: ConvertContext,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (const segment of message) {
    const data = segment.data ?? {};
    switch (segment.type) {
      case 'text':
        out.push({
          elementType: 1,
          elementId: elementId(),
          textElement: {
            content: String(data.text ?? ''),
            atType: 0,
            atUid: '',
            atTinyId: '',
            atNtUid: '',
          },
        });
        break;
      case 'at': {
        // QQNT 的 @ 只在群里有效；私聊直接忽略，避免发出坏消息。
        if (!ctx.groupId) break;
        const qq = data.qq === 'all' ? 'all' : String(data.qq ?? '');
        if (qq === 'all') {
          out.push({
            elementType: 1,
            elementId: elementId(),
            textElement: {
              content: '@全体成员',
              atType: 1,
              atUid: 'all',
              atTinyId: '',
              atNtUid: 'all',
            },
          });
          break;
        }
        const uin = Number(qq);
        const member = ctx.memberByUin?.(ctx.groupId, uin);
        const uid = member?.uid || await ctx.resolveUid(uin);
        if (!uid) throw ActionError.badRequest(`无法解析 @${qq} 的 NTQQ UID`);
        // 注意：atUid 是 QQ 号，atNtUid 才是 NTQQ UID；content 用群昵称。
        const name = member?.cardName || member?.nick || String(qq);
        out.push({
          elementType: 1,
          elementId: elementId(),
          textElement: {
            content: `@${name}`,
            atType: 2,
            atUid: String(qq),
            atTinyId: '',
            atNtUid: uid,
          },
        });
        break;
      }
      case 'face':
        out.push({
          elementType: 6,
          elementId: elementId(),
          faceElement: {
            faceIndex: Number(data.id ?? 0),
            faceType: 1,
            faceText: `/${String(data.id ?? '')}`,
          },
        });
        break;
      case 'reply': {
        const raw = ctx.rawOf(String(data.id ?? ''));
        if (!raw) {
          throw ActionError.badRequest('reply 段引用的消息不在缓存中，无法构造回复');
        }
        out.push({
          elementType: 7,
          elementId: elementId(),
          replyElement: {
            replayMsgId: raw.msgId,
            replayMsgSeq: raw.msgSeq,
            senderUin: raw.senderUin,
            replyMsgTime: raw.msgTime,
            replyMsgClientSeq: raw.clientSeq ?? '0',
          },
        });
        break;
      }
      case 'json':
        out.push({
          elementType: 10,
          elementId: elementId(),
          arkElement: { bytesData: String(data.data ?? '') },
        });
        break;
      case 'xml':
        out.push({
          elementType: 13,
          elementId: elementId(),
          arkElement: { bytesData: String(data.data ?? '') },
        });
        break;
      case 'mface':
        out.push({
          elementType: 11,
          elementId: elementId(),
          marketFaceElement: {
            emojiId: String(data.id ?? ''),
            faceName: String(data.name ?? data.summary ?? ''),
            emojiPackageId: Number(data.package_id ?? 0),
          },
        });
        break;
      case 'image':
      case 'record':
      case 'video':
      case 'file':
        throw ActionError.unsupported(
          `QQNT 插件暂不支持发送 ${segment.type}：需要 highway 上传通道。`
          + ' text / at / face / reply / json / mface 已可用。',
        );
      default:
        throw ActionError.unsupported(`QQNT 插件暂不支持的消息段：${segment.type}`);
    }
  }
  return out;
}

export function groupToInfo(group: GroupLike): GroupInfo {
  const owner = Number(group.groupOwnerId?.memberUin ?? 0);
  return {
    group_id: Number(group.groupCode),
    group_name: group.groupName,
    member_count: group.memberCount,
    max_member_count: group.maxMember,
    ...(owner ? { owner_id: owner } : {}),
    ...(group.createTime ? { create_time: Number(group.createTime) } : {}),
  };
}

export function memberToInfo(groupId: number, member: MemberLike): GroupMemberInfo {
  return {
    group_id: groupId,
    user_id: Number(member.uin),
    nickname: member.nick,
    card: member.cardName ?? '',
    role: ROLE[member.role] ?? 'member',
    ...(member.joinTime ? { join_time: Number(member.joinTime) } : {}),
    ...(member.lastSpeakTime ? { last_sent_time: Number(member.lastSpeakTime) } : {}),
    title: member.memberSpecialTitle ?? '',
  };
}

export function friendToInfo(profile: Record<string, unknown>): FriendInfo {
  return {
    user_id: Number(profile.uin ?? 0),
    nickname: String(profile.nick ?? profile.nickname ?? ''),
    remark: String(profile.remark ?? ''),
    sex: 'unknown',
    age: 0,
  };
}
