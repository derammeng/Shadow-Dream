/**
 * OneBot 11 类型定义。
 *
 * 这里只描述协议层真正会被序列化的结构，避免把 QQ 平台的概念泄漏到
 * 传输层。QQ 平台相关字段都收在 `sender` / `anonymous` 等标准容器里。
 */

export type PostType = 'message' | 'message_sent' | 'notice' | 'request' | 'meta_event';
export type MessageType = 'private' | 'group';
export type PrivateSubType = 'friend' | 'group' | 'other';
export type GroupSubType = 'normal' | 'anonymous' | 'notice';
export type Role = 'owner' | 'admin' | 'member';

export interface Sender {
  user_id: number;
  nickname: string;
  card?: string;
  role?: Role;
  sex?: 'male' | 'female' | 'unknown';
  age?: number;
  area?: string;
  level?: string;
  title?: string;
}

export interface Anonymous {
  id: number;
  name: string;
  flag: string;
}

/**
 * 消息段。`type` 使用 OneBot 11 的字符串类型，`data` 保持原始值，
 * 不在 core 里做平台相关的二次加工。
 */
export interface MessageSegment {
  type: string;
  data: Record<string, unknown>;
}

export type MessageInput = string | MessageSegment[];

export interface OneBotBase {
  time: number;
  self_id: number;
  post_type: PostType;
}

export interface MessageEvent extends OneBotBase {
  post_type: 'message' | 'message_sent';
  message_type: MessageType;
  sub_type: PrivateSubType | GroupSubType;
  message_id: number;
  user_id: number;
  message: MessageSegment[];
  raw_message: string;
  font: number;
  sender: Sender;
  group_id?: number;
  anonymous?: Anonymous;
  target_id?: number;
  temp_source?: number;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  busid: number;
  url?: string;
}

export interface GroupUploadNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_upload';
  group_id: number;
  user_id: number;
  file: FileInfo;
}

export interface GroupAdminNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_admin';
  sub_type: 'set' | 'unset';
  group_id: number;
  user_id: number;
}

export interface GroupDecreaseNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_decrease';
  sub_type: 'leave' | 'kick' | 'kick_me';
  group_id: number;
  operator_id: number;
  user_id: number;
}

export interface GroupIncreaseNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_increase';
  sub_type: 'approve' | 'invite';
  group_id: number;
  operator_id: number;
  user_id: number;
}

export interface GroupBanNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_ban';
  sub_type: 'ban' | 'lift_ban';
  group_id: number;
  operator_id: number;
  user_id: number;
  duration: number;
}

export interface FriendAddNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'friend_add';
  user_id: number;
}

export interface GroupRecallNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_recall';
  group_id: number;
  operator_id: number;
  user_id: number;
  message_id: number;
}

export interface FriendRecallNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'friend_recall';
  user_id: number;
  message_id: number;
}

export interface PokeNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'notify';
  sub_type: 'poke';
  group_id?: number;
  user_id: number;
  target_id: number;
}

export interface LuckyKingNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'notify';
  sub_type: 'lucky_king';
  group_id: number;
  user_id: number;
  target_id: number;
}

export interface HonorNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'notify';
  sub_type: 'honor';
  group_id: number;
  user_id: number;
  honor_type: 'talkative' | 'performer' | 'emotion';
}

export interface GroupCardNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_card';
  group_id: number;
  user_id: number;
  card_old: string;
  card_new: string;
}

export interface OfflineFileNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'offline_file';
  user_id: number;
  file: { name: string; size: number; url: string };
}

export interface ClientStatusNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'client_status';
  online: boolean;
  good: boolean;
}

export interface GroupMsgEmojiLikeNotice extends OneBotBase {
  post_type: 'notice';
  notice_type: 'group_msg_emoji_like';
  group_id: number;
  user_id: number;
  message_id: number;
  likes: Array<{ emoji_id: string; count: number }>;
}

export type NoticeEvent =
  | GroupUploadNotice
  | GroupAdminNotice
  | GroupDecreaseNotice
  | GroupIncreaseNotice
  | GroupBanNotice
  | FriendAddNotice
  | GroupRecallNotice
  | FriendRecallNotice
  | PokeNotice
  | LuckyKingNotice
  | HonorNotice
  | GroupCardNotice
  | OfflineFileNotice
  | ClientStatusNotice
  | GroupMsgEmojiLikeNotice;

export interface FriendRequest extends OneBotBase {
  post_type: 'request';
  request_type: 'friend';
  user_id: number;
  comment: string;
  flag: string;
}

export interface GroupRequest extends OneBotBase {
  post_type: 'request';
  request_type: 'group';
  sub_type: 'add' | 'invite';
  group_id: number;
  user_id: number;
  comment: string;
  flag: string;
}

export type RequestEvent = FriendRequest | GroupRequest;

export interface LifecycleMetaEvent extends OneBotBase {
  post_type: 'meta_event';
  meta_event_type: 'lifecycle';
  sub_type: 'connect' | 'enable' | 'disable';
}

export interface HeartbeatStatus {
  online: boolean;
  good: boolean;
  stat?: {
    packet_received: number;
    packet_sent: number;
    message_received: number;
    message_sent: number;
    last_message_time: number;
    [key: string]: number | boolean;
  };
}

export interface HeartbeatMetaEvent extends OneBotBase {
  post_type: 'meta_event';
  meta_event_type: 'heartbeat';
  sub_type: 'heartbeat';
  status: HeartbeatStatus;
  interval: number;
}

export type MetaEvent = LifecycleMetaEvent | HeartbeatMetaEvent;

export type OneBotEvent = MessageEvent | NoticeEvent | RequestEvent | MetaEvent;

export interface SelfInfo {
  user_id: number;
  nickname: string;
  online?: boolean;
}

export interface FriendInfo {
  user_id: number;
  nickname: string;
  remark?: string;
  sex?: 'male' | 'female' | 'unknown';
  age?: number;
  group_id?: number;
}

export interface GroupInfo {
  group_id: number;
  group_name: string;
  member_count: number;
  max_member_count: number;
  owner_id?: number;
  create_time?: number;
  group_memo?: string;
}

export interface GroupMemberInfo {
  group_id: number;
  user_id: number;
  nickname: string;
  card: string;
  role: Role;
  join_time?: number;
  last_sent_time?: number;
  level?: string;
  title?: string;
  title_expire_time?: number;
  unfriendly?: boolean;
  card_changeable?: boolean;
}

export interface GroupHonorInfo {
  group_id: number;
  current_talkative?: { user_id: number; nickname: string; avatar: string; day_count: number };
  talkative_list: Array<{ user_id: number; nickname: string; avatar: string; description: string }>;
  performer_list: Array<{ user_id: number; nickname: string; avatar: string; description: string }>;
  legend_list: Array<{ user_id: number; nickname: string; avatar: string; description: string }>;
  emotion_list: Array<{ user_id: number; nickname: string; avatar: string; description: string }>;
}

export interface GroupFileSystemInfo {
  file_count: number;
  limit_count: number;
  used_space: number;
  total_space: number;
}

export interface GroupFile {
  file_id: string;
  file_name: string;
  busid: number;
  file_size: number;
  upload_time: number;
  dead_time: number;
  modify_time: number;
  download_times: number;
  uploader: number;
  uploader_name: string;
}

export interface GroupFolder {
  folder_id: string;
  folder_name: string;
  create_time: number;
  creator: number;
  creator_name: string;
  total_file_count: number;
}

/** OneBot 11 API 返回包。 */
export interface ActionResult<T = unknown> {
  status: 'ok' | 'async' | 'failed';
  retcode: number;
  data: T;
  echo?: unknown;
  message?: string;
  wording?: string;
}

export interface VersionInfo {
  app_name: string;
  app_version: string;
  protocol_version: string;
  version?: string;
  extra?: Record<string, unknown>;
}

export interface BotStatus {
  online: boolean;
  good: boolean;
  stat: {
    packet_received: number;
    packet_sent: number;
    message_received: number;
    message_sent: number;
    last_message_time: number;
  };
}
