import { joinRoom, toClient } from "@/lib/game";
import { addressHash, body, idempotent, nicknameSchema } from "@/lib/http";
import { errorResponse, GameError } from "@/lib/errors";
import { getStore } from "@/lib/store";
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) { try { const { code } = await params; const data = await body(request, nicknameSchema); const store = getStore(); const address = addressHash(request); if (await store.increment(`rl:join:${address}`, 60) > 20) throw new GameError("RATE_LIMITED", 429); const result = await idempotent(request, store, `anon-${address}`, `join:${code}:${data.nickname}`, () => joinRoom(store, code.toUpperCase(), data.nickname)); return Response.json({ room: toClient(result.room, result.playerId), playerId: result.playerId }); } catch (error) { return errorResponse(error); } }
