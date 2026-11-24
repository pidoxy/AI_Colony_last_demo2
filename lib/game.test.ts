import { beforeEach, describe, expect, it } from "vitest";
import { advance, castVote, createRoom, joinRoom, startGame, submitAnswer, toClient } from "./game";
import { MemoryStore } from "./store";

describe("Human or Bot game rules", () => {
  let store: MemoryStore;
  beforeEach(() => { store = new MemoryStore(); store.clear(); process.env.BOT_ENABLED = "0"; });

  async function roomWithThree() {
    const host = await createRoom(store, "Tolu");
    const ada = await joinRoom(store, host.room.code, "Ada");
    const zainab = await joinRoom(store, host.room.code, "Zainab");
    return { code: host.room.code, host: host.playerId, ada: ada.playerId, zainab: zainab.playerId };
  }

  it("creates a four-letter room and makes the creator host", async () => {
    const { room, playerId } = await createRoom(store, "Tolu");
    expect(room.code).toMatch(/^[A-HJ-NP-Z]{4}$/); expect(room.hostId).toBe(playerId); expect(room.status).toBe("lobby");
  });

  it("rejects a duplicate nickname and a thirteenth player", async () => {
    const host = await createRoom(store, "Tolu");
    await expect(joinRoom(store, host.room.code, "tolu")).rejects.toMatchObject({ code: "NICKNAME_TAKEN" });
    for (let i = 1; i < 12; i++) await joinRoom(store, host.room.code, `P${i}`);
    await expect(joinRoom(store, host.room.code, "Extra")).rejects.toMatchObject({ code: "ROOM_FULL" });
  });

  it("requires three players and the host to start", async () => {
    const host = await createRoom(store, "Tolu"); const guest = await joinRoom(store, host.room.code, "Ada");
    await expect(startGame(store, host.room.code, host.playerId)).rejects.toMatchObject({ code: "ROOM_TOO_SMALL" });
    await joinRoom(store, host.room.code, "Zainab");
    await expect(startGame(store, host.room.code, guest.playerId)).rejects.toMatchObject({ code: "NOT_HOST" });
  });

  it("replaces an answer during writing and refuses answers over 140 characters", async () => {
    const players = await roomWithThree(); await startGame(store, players.code, players.host); await advance(store, players.code, players.host, true);
    await submitAnswer(store, players.code, players.ada, "first"); await submitAnswer(store, players.code, players.ada, "second");
    expect((await store.get(players.code))?.rounds[0].answers[players.ada]).toBe("second");
    await expect(submitAnswer(store, players.code, players.ada, "x".repeat(141))).rejects.toMatchObject({ code: "ANSWER_TOO_LONG" });
  });

  it("stores exactly one vote during concurrent double voting", async () => {
    const p = await roomWithThree(); await startGame(store, p.code, p.host); await advance(store, p.code, p.host, true);
    await Promise.all([submitAnswer(store, p.code, p.host, "host"), submitAnswer(store, p.code, p.ada, "ada"), submitAnswer(store, p.code, p.zainab, "zainab")]);
    await advance(store, p.code, p.host, true); const room = await store.get(p.code); const targets = room!.rounds[0].labelledAnswers.filter((a: { authorId: string | null }) => a.authorId !== p.ada);
    const result = await Promise.allSettled([castVote(store, p.code, p.ada, targets[0].id), castVote(store, p.code, p.ada, targets[1].id)]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1); expect(Object.keys((await store.get(p.code))!.rounds[0].votes)).toHaveLength(1);
  });

  it("prevents self-voting", async () => {
    const p = await roomWithThree(); await startGame(store, p.code, p.host); await advance(store, p.code, p.host, true); await submitAnswer(store, p.code, p.ada, "mine"); await advance(store, p.code, p.host, true);
    await expect(castVote(store, p.code, p.ada, p.ada)).rejects.toMatchObject({ code: "CANNOT_VOTE_SELF" });
  });

  it("never exposes the bot before reveal", async () => {
    const p = await roomWithThree(); await startGame(store, p.code, p.host); await advance(store, p.code, p.host, true); await advance(store, p.code, p.host, true);
    const voting = JSON.stringify(toClient((await store.get(p.code))!, p.ada)); expect(voting).not.toContain("botLabel"); expect(voting).not.toContain("isBot"); expect(voting).not.toContain("botSource");
    await advance(store, p.code, p.host, true); expect(toClient((await store.get(p.code))!, p.ada).botLabel).toBeTruthy();
  });

  it("uses the answer bank when the kill switch is off", async () => {
    const p = await roomWithThree(); const room = await startGame(store, p.code, p.host); expect(room.rounds[0].botSource).toBe("bank"); expect(room.rounds[0].botAnswer.length).toBeGreaterThan(5);
  });
});
