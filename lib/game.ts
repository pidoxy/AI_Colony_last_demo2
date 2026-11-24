import { randomBytes, randomUUID } from "node:crypto";
import { createBotAnswer } from "./bot";
import { GameError } from "./errors";
import { cleanText } from "./filter";
import { promptForRound } from "./content";
import type { ClientRoom, Room, Round, RoundAnswer } from "./types";
import type { Store } from "./store";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DURATIONS = { intro: 3_000, writing: 60_000, voting: 40_000, reveal: 20_000, scores: 15_000 } as const;

export function makePlayerId() { return randomUUID(); }
function makeCode() { return Array.from(randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join(""); }
function nickname(value: string) { const result = cleanText(value, 20); if (result.length < 1) throw new GameError("INVALID_INPUT"); return result; }

export async function createRoom(store: Store, nicknameValue: string, totalRounds = 3) {
  const playerId = makePlayerId();
  for (let i = 0; i < 20; i++) {
    const code = makeCode(); const now = Date.now();
    const room: Room = { code, status: "lobby", hostId: playerId, roundNumber: 0, totalRounds: Math.min(5, Math.max(3, totalRounds)), deadline: null, version: 1, createdAt: now, updatedAt: now, rounds: [], players: { [playerId]: { id: playerId, nickname: nickname(nicknameValue), score: 0, joinedAt: now, spotted: 0 } } };
    if (await store.create(room)) return { room, playerId };
  }
  throw new GameError("CONFLICT", 409);
}

async function mutate(store: Store, code: string, action: (room: Room) => Promise<void> | void) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const room = await store.get(code); if (!room) throw new GameError("ROOM_NOT_FOUND", 404);
    const version = room.version; await action(room); room.version++; room.updatedAt = Date.now();
    if (await store.compareAndSet(code, version, room)) return room;
  }
  throw new GameError("CONFLICT", 409);
}

function requirePlayer(room: Room, playerId: string) { const player = room.players[playerId]; if (!player) throw new GameError("NOT_A_PLAYER", 403); return player; }
function requireHost(room: Room, playerId: string) { requirePlayer(room, playerId); if (room.hostId !== playerId) throw new GameError("NOT_HOST", 403); }

export async function joinRoom(store: Store, code: string, nicknameValue: string) {
  const playerId = makePlayerId();
  const room = await mutate(store, code, (draft) => {
    if (draft.status !== "lobby") throw new GameError("WRONG_PHASE");
    if (Object.keys(draft.players).length >= 12) throw new GameError("ROOM_FULL");
    const name = nickname(nicknameValue);
    if (Object.values(draft.players).some((p) => p.nickname.toLowerCase() === name.toLowerCase())) throw new GameError("NICKNAME_TAKEN");
    draft.players[playerId] = { id: playerId, nickname: name, score: 0, joinedAt: Date.now(), spotted: 0 };
  });
  return { room, playerId };
}

async function openRound(room: Room, store: Store, number: number) {
  const entry = promptForRound(room.code, number);
  const bot = await createBotAnswer(entry, store, room.createdAt + number);
  const round: Round = { number, promptId: entry.id, prompt: entry.prompt, botAnswer: bot.text, botSource: bot.source, answers: {}, labelledAnswers: [], votes: {}, reports: {}, scored: false };
  room.rounds[number - 1] = round; room.roundNumber = number; room.status = "intro"; room.deadline = Date.now() + DURATIONS.intro;
}

export async function startGame(store: Store, code: string, playerId: string) {
  return mutate(store, code, async (room) => {
    requireHost(room, playerId); if (room.status !== "lobby") throw new GameError("WRONG_PHASE");
    if (Object.keys(room.players).length < 3) throw new GameError("ROOM_TOO_SMALL");
    await openRound(room, store, 1);
  });
}

function labelAnswers(room: Room, round: Round) {
  const answers: RoundAnswer[] = Object.entries(round.answers).map(([authorId, text]) => ({ id: authorId, authorId, text }));
  answers.push({ id: "bot", authorId: null, text: round.botAnswer });
  const seed = [...room.code].reduce((n, c) => n + c.charCodeAt(0), 0) + round.number * 17;
  answers.sort((a, b) => ((a.id.charCodeAt(0) * 31 + seed) % 97) - ((b.id.charCodeAt(0) * 31 + seed) % 97));
  round.labelledAnswers = answers.map((answer, index) => ({ ...answer, label: String.fromCharCode(65 + index) }));
}

function scoreRound(room: Room, round: Round) {
  if (round.scored) return;
  const bot = round.labelledAnswers.find((a) => a.authorId === null);
  for (const [voter, answerId] of Object.entries(round.votes)) {
    if (answerId === bot?.id) { room.players[voter].score += 100; room.players[voter].spotted += 1; }
    const selected = round.labelledAnswers.find((a) => a.id === answerId);
    if (selected?.authorId) room.players[selected.authorId].score += 50;
  }
  round.scored = true;
}

async function advanceDraft(room: Room, store: Store) {
  const round = room.rounds[room.roundNumber - 1];
  if (room.status === "intro") { room.status = "writing"; room.deadline = Date.now() + DURATIONS.writing; }
  else if (room.status === "writing") { labelAnswers(room, round); room.status = "voting"; room.deadline = Date.now() + DURATIONS.voting; }
  else if (room.status === "voting") { scoreRound(room, round); room.status = "reveal"; room.deadline = Date.now() + DURATIONS.reveal; }
  else if (room.status === "reveal") { room.status = "scores"; room.deadline = Date.now() + DURATIONS.scores; }
  else if (room.status === "scores" && room.roundNumber < room.totalRounds) await openRound(room, store, room.roundNumber + 1);
  else if (room.status === "scores") { room.status = "finished"; room.deadline = null; }
  else throw new GameError("WRONG_PHASE");
}

export async function advance(store: Store, code: string, playerId: string, byHost = false) {
  return mutate(store, code, async (room) => { requirePlayer(room, playerId); if (byHost) requireHost(room, playerId); await advanceDraft(room, store); });
}

export async function advanceIfExpired(store: Store, code: string) {
  const room = await store.get(code); if (!room) throw new GameError("ROOM_NOT_FOUND", 404);
  if (room.deadline && room.deadline <= Date.now() && !["finished", "closed"].includes(room.status)) return mutate(store, code, (draft) => draft.deadline && draft.deadline <= Date.now() ? advanceDraft(draft, store) : undefined);
  return room;
}

export async function submitAnswer(store: Store, code: string, playerId: string, value: string) {
  if (value.length > 140) throw new GameError("ANSWER_TOO_LONG");
  return mutate(store, code, (room) => { requirePlayer(room, playerId); if (room.status !== "writing") throw new GameError("WRONG_PHASE"); room.rounds[room.roundNumber - 1].answers[playerId] = cleanText(value, 140); });
}

export async function castVote(store: Store, code: string, playerId: string, answerId: string) {
  return mutate(store, code, (room) => {
    requirePlayer(room, playerId); if (room.status !== "voting") throw new GameError("WRONG_PHASE");
    const round = room.rounds[room.roundNumber - 1]; if (round.votes[playerId]) throw new GameError("ALREADY_VOTED");
    const answer = round.labelledAnswers.find((a) => a.id === answerId); if (!answer) throw new GameError("ANSWER_NOT_FOUND");
    if (answer.authorId === playerId) throw new GameError("CANNOT_VOTE_SELF"); round.votes[playerId] = answerId;
  });
}

export async function reportAnswer(store: Store, code: string, playerId: string, answerId: string) {
  return mutate(store, code, (room) => { requirePlayer(room, playerId); const round = room.rounds[room.roundNumber - 1]; if (!round.labelledAnswers.some((a) => a.id === answerId)) throw new GameError("ANSWER_NOT_FOUND"); (round.reports[answerId] ??= []); if (!round.reports[answerId].includes(playerId)) round.reports[answerId].push(playerId); });
}

export function toClient(room: Room, playerId: string): ClientRoom {
  const round = room.rounds[room.roundNumber - 1];
  const revealed = ["reveal", "scores", "finished"].includes(room.status);
  const showAnswers = round && ["voting", "reveal", "scores", "finished"].includes(room.status);
  const ownReports = round ? new Set(Object.entries(round.reports).filter(([, ids]) => ids.includes(playerId)).map(([id]) => id)) : new Set<string>();
  return {
    code: room.code, status: room.status, roundNumber: room.roundNumber, totalRounds: room.totalRounds, deadline: room.deadline, version: room.version,
    isHost: room.hostId === playerId, prompt: round?.prompt, players: Object.values(room.players).sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt),
    answers: showAnswers ? round.labelledAnswers.map((answer) => ({ id: answer.id, label: answer.label!, text: ownReports.has(answer.id) ? "Answer hidden" : answer.text, hidden: ownReports.has(answer.id), isOwn: answer.authorId === playerId, author: revealed ? (answer.authorId ? room.players[answer.authorId]?.nickname : "The bot") : undefined, isBot: revealed ? answer.authorId === null : undefined, votes: revealed ? Object.values(round.votes).filter((id) => id === answer.id).length : undefined })) : undefined,
    ownVote: round?.votes[playerId], botLabel: revealed ? round.labelledAnswers.find((a) => a.authorId === null)?.label : undefined
  };
}
