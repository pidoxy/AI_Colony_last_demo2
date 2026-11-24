import { z } from "zod";
import { createRoom, toClient } from "@/lib/game";
import { addressHash, body, idempotent } from "@/lib/http";
import { getStore } from "@/lib/store";
import { errorResponse, GameError } from "@/lib/errors";

const schema = z.object({ nickname: z.string().trim().min(1).max(20), totalRounds: z.number().int().min(3).max(5).default(3) });
export async function POST(request: Request) {
  try {
    const store = getStore(); if (await store.increment(`rl:create:${addressHash(request)}`, 3600) > 5) throw new GameError("RATE_LIMITED", 429);
    const data = await body(request, schema); const address = `anon-${addressHash(request)}`;
    const { room, playerId } = await idempotent(request, store, address, `create:${data.nickname}:${data.totalRounds}`, () => createRoom(store, data.nickname, data.totalRounds));
    const origin = new URL(request.url).origin;
    return Response.json({ room: toClient(room, playerId), playerId, inviteUrl: `${origin}/r/${room.code}` });
  } catch (error) { return errorResponse(error); }
}
