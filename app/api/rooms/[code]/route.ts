import { advanceIfExpired, toClient } from "@/lib/game";
import { errorResponse } from "@/lib/errors";
import { getStore } from "@/lib/store";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params; const playerId = request.headers.get("x-player-id") || ""; const room = await advanceIfExpired(getStore(), code.toUpperCase());
    const version = Number(new URL(request.url).searchParams.get("v") || 0);
    if (version === room.version) return Response.json({ unchanged: true, version });
    return Response.json({ room: toClient(room, playerId) });
  } catch (error) { return errorResponse(error); }
}
