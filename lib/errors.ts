export type ErrorCode =
  | "NICKNAME_TAKEN" | "ROOM_FULL" | "ROOM_NOT_FOUND" | "ROOM_TOO_SMALL"
  | "NOT_HOST" | "WRONG_PHASE" | "ANSWER_TOO_LONG" | "ALREADY_VOTED"
  | "CANNOT_VOTE_SELF" | "IDEMPOTENCY_KEY_REUSED" | "MISSING_IDEMPOTENCY_KEY"
  | "RATE_LIMITED" | "INVALID_INPUT" | "NOT_A_PLAYER" | "ANSWER_NOT_FOUND" | "CONFLICT";

const messages: Record<ErrorCode, string> = {
  NICKNAME_TAKEN: "That name is already in the room.",
  ROOM_FULL: "This room already has 12 players.",
  ROOM_NOT_FOUND: "We could not find that room.",
  ROOM_TOO_SMALL: "You need at least 3 players to start.",
  NOT_HOST: "Only the host can do that.",
  WRONG_PHASE: "That move is not available right now.",
  ANSWER_TOO_LONG: "Keep your answer to 140 characters.",
  ALREADY_VOTED: "Your vote is locked in.",
  CANNOT_VOTE_SELF: "Nice try. You cannot vote for your own answer.",
  IDEMPOTENCY_KEY_REUSED: "That request key was already used for something else.",
  MISSING_IDEMPOTENCY_KEY: "This request needs an Idempotency-Key.",
  RATE_LIMITED: "Too many tries. Give it a moment.",
  INVALID_INPUT: "Check what you entered and try again.",
  NOT_A_PLAYER: "Join this room before making a move.",
  ANSWER_NOT_FOUND: "That answer is no longer available.",
  CONFLICT: "The room changed. Try that again."
};

export class GameError extends Error {
  constructor(public code: ErrorCode, public status = 400) { super(messages[code]); }
}

export function errorResponse(error: unknown) {
  const game = error instanceof GameError ? error : new GameError("INVALID_INPUT");
  return Response.json({ error: { code: game.code, message: game.message } }, { status: game.status });
}
