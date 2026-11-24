import { Redis } from "@upstash/redis";
import type { Room } from "./types";

export interface Store {
  create(room: Room): Promise<boolean>;
  get(code: string): Promise<Room | null>;
  compareAndSet(code: string, expectedVersion: number, next: Room): Promise<boolean>;
  getIdempotent(playerId: string, key: string): Promise<string | null>;
  setIdempotent(playerId: string, key: string, value: string): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
  clear?(): void;
}

const globalMemory = globalThis as typeof globalThis & { __humanBotRooms?: Map<string, Room>; __humanBotStrings?: Map<string, { value: string; expires: number }>; __humanBotCounts?: Map<string, { value: number; expires: number }> };

export class MemoryStore implements Store {
  private rooms = globalMemory.__humanBotRooms ??= new Map();
  private strings = globalMemory.__humanBotStrings ??= new Map();
  private counts = globalMemory.__humanBotCounts ??= new Map();

  async create(room: Room) { if (this.rooms.has(room.code)) return false; this.rooms.set(room.code, structuredClone(room)); return true; }
  async get(code: string) { const room = this.rooms.get(code); if (!room || room.updatedAt + 7_200_000 < Date.now()) return null; return structuredClone(room); }
  async compareAndSet(code: string, expectedVersion: number, next: Room) {
    const current = this.rooms.get(code);
    if (!current || current.version !== expectedVersion) return false;
    this.rooms.set(code, structuredClone(next)); return true;
  }
  async getIdempotent(playerId: string, key: string) {
    const item = this.strings.get(`${playerId}:${key}`);
    if (!item || item.expires < Date.now()) return null;
    return item.value;
  }
  async setIdempotent(playerId: string, key: string, value: string) { this.strings.set(`${playerId}:${key}`, { value, expires: Date.now() + 600_000 }); }
  async increment(key: string, ttlSeconds: number) {
    const now = Date.now(); const current = this.counts.get(key);
    const next = !current || current.expires < now ? { value: 1, expires: now + ttlSeconds * 1000 } : { ...current, value: current.value + 1 };
    this.counts.set(key, next); return next.value;
  }
  clear() { this.rooms.clear(); this.strings.clear(); this.counts.clear(); }
}

export class RedisStore implements Store {
  constructor(private redis: Redis) {}
  private key(code: string) { return `room:${code}`; }
  async create(room: Room) { return Boolean(await this.redis.set(this.key(room.code), JSON.stringify(room), { nx: true, ex: 7200 })); }
  async get(code: string) { const value = await this.redis.get<string | Room>(this.key(code)); if (!value) return null; return typeof value === "string" ? JSON.parse(value) : value; }
  async compareAndSet(code: string, expectedVersion: number, next: Room) {
    const script = `local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local r=cjson.decode(v); if tonumber(r.version)~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',7200); return 1`;
    return Number(await this.redis.eval(script, [this.key(code)], [expectedVersion, JSON.stringify(next)])) === 1;
  }
  async getIdempotent(playerId: string, key: string) { return this.redis.get<string>(`idem:${playerId}:${key}`); }
  async setIdempotent(playerId: string, key: string, value: string) { await this.redis.set(`idem:${playerId}:${key}`, value, { ex: 600 }); }
  async increment(key: string, ttlSeconds: number) { const value = await this.redis.incr(key); if (value === 1) await this.redis.expire(key, ttlSeconds); return value; }
}

let store: Store | undefined;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  store = url && token ? new RedisStore(new Redis({ url, token })) : new MemoryStore();
  return store;
}

export function setStoreForTests(value: Store) { store = value; }
