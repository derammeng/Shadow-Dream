/**
 * QQ 的消息 ID 是 64 位字符串，OneBot 11 的 message_id 是 32 位整数。
 * 这里做一个稳定、可逆的映射：同一内部 ID 始终得到同一个 OneBot ID，
 * 不同内部 ID 不会撞车（FNV-1a + 线性探测）。
 */
export class MessageIdRegistry {
  private readonly byInternal = new Map<string, number>();
  private readonly byOneBot = new Map<number, string>();
  private readonly order: string[] = [];

  constructor(private readonly capacity = 50_000) {}

  get size(): number {
    return this.byInternal.size;
  }

  toOneBot(internalId: string | number): number {
    const key = String(internalId);
    const existing = this.byInternal.get(key);
    if (existing !== undefined) return existing;

    let candidate = fnv1a(key) & 0x7fff_ffff;
    if (candidate === 0) candidate = 1;
    while (this.byOneBot.has(candidate)) {
      const owner = this.byOneBot.get(candidate);
      if (owner === key) return candidate;
      candidate = (candidate + 1) & 0x7fff_ffff;
      if (candidate === 0) candidate = 1;
    }

    this.byInternal.set(key, candidate);
    this.byOneBot.set(candidate, key);
    this.order.push(key);
    this.evictIfNeeded();
    return candidate;
  }

  toInternal(oneBotId: number | string): string | undefined {
    const id = typeof oneBotId === 'number' ? oneBotId : Number(oneBotId);
    if (!Number.isFinite(id)) return undefined;
    return this.byOneBot.get(Math.trunc(id));
  }

  /** 已知内部 ID 时直接登记，避免再次哈希。 */
  remember(internalId: string | number, oneBotId: number): void {
    const key = String(internalId);
    const id = Math.trunc(oneBotId);
    this.byInternal.set(key, id);
    this.byOneBot.set(id, key);
    this.order.push(key);
    this.evictIfNeeded();
  }

  clear(): void {
    this.byInternal.clear();
    this.byOneBot.clear();
    this.order.length = 0;
  }

  private evictIfNeeded(): void {
    while (this.order.length > this.capacity) {
      const key = this.order.shift();
      if (!key) break;
      const id = this.byInternal.get(key);
      if (id !== undefined) {
        this.byInternal.delete(key);
        this.byOneBot.delete(id);
      }
    }
  }
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
