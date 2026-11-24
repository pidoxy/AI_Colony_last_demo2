import { z } from "zod";
import { GameError } from "./errors";
import type { Store } from "./store";

export const nicknameSchema = z.object({ nickname: z.string().trim().min(1).max(20) });
export const answerSchema = z.object({ answer: z.string().max(140) });
export const voteSchema = z.object({ answerId: z.string().min(1).max(64) });
export const reportSchema = voteSchema;

export async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  try { return schema.parse(await request.json()); } catch { throw new GameError("INVALID_INPUT"); }
}

export function playerId(request: Request) {
  const id = request.headers.get("x-player-id"); if (!id) throw new GameError("NOT_A_PLAYER", 403); return id;
}

export async function idempotent<T>(request: Request, store: Store, player: string, signature: string, action: () => Promise<T>): Promise<T> {
  const key = request.headers.get("idempotency-key"); if (!key) throw new GameError("MISSING_IDEMPOTENCY_KEY");
  const stored = await store.getIdempotent(player, key);
  if (stored) {
    const parsed = JSON.parse(stored) as { signature: string; value: T };
    if (parsed.signature !== signature) throw new GameError("IDEMPOTENCY_KEY_REUSED");
    return parsed.value;
  }
  const value = await action(); await store.setIdempotent(player, key, JSON.stringify({ signature, value })); return value;
}

export function addressHash(request: Request) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  let hash = 2166136261; for (const char of raw) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return (hash >>> 0).toString(36);
}
