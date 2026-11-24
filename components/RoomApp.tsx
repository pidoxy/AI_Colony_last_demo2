"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ClientRoom } from "@/lib/types";

type ApiResult = { room: ClientRoom; playerId?: string; unchanged?: boolean; error?: { code: string; message: string } };
function key(code: string) { return `humanbot:${code}`; }
function requestKey() { return crypto.randomUUID(); }
function initials(name: string) { return name.slice(0, 1).toUpperCase(); }

export function RoomApp({ code }: { code: string }) {
  const [playerId, setPlayerId] = useState<string | null>(null); const [room, setRoom] = useState<ClientRoom | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [toast, setToast] = useState("");
  const [nickname, setNickname] = useState(""); const [answer, setAnswer] = useState(""); const [joining, setJoining] = useState(false); const [now, setNow] = useState(Date.now()); const [shareOpen, setShareOpen] = useState(false);

  const poll = useCallback(async (id: string, version = 0) => {
    try { const response = await fetch(`/api/rooms/${code}?v=${version}`, { headers: { "x-player-id": id }, cache: "no-store" }); const data: ApiResult = await response.json(); if (!response.ok) throw new Error(data.error?.message); if (!data.unchanged && data.room) setRoom(data.room); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reach the room."); }
    finally { setLoading(false); }
  }, [code]);

  useEffect(() => { const id = localStorage.getItem(key(code)); setPlayerId(id); poll(id || "", 0); }, [code, poll]);
  useEffect(() => { if (!playerId || !room || room.status === "finished") return; const delay = document.visibilityState === "hidden" ? 10000 : room.status === "lobby" ? 5000 : 3000; const timer = setInterval(() => { if (document.visibilityState === "visible") poll(playerId, room.version); }, delay); return () => clearInterval(timer); }, [playerId, room, poll]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  async function action(path: string, payload?: object) {
    if (!playerId) return; setError("");
    const response = await fetch(`/api/rooms/${code}/${path}`, { method: "POST", headers: { "content-type": "application/json", "x-player-id": playerId, "idempotency-key": requestKey(), "x-room-version": String(room?.version || 0) }, body: payload ? JSON.stringify(payload) : undefined });
    const data: ApiResult = await response.json(); if (!response.ok) { setToast(data.error?.message || "That did not work."); setTimeout(() => setToast(""), 3200); return; } setRoom(data.room);
  }

  async function join(event: FormEvent) {
    event.preventDefault(); setJoining(true); setError("");
    const response = await fetch(`/api/rooms/${code}/join`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": requestKey() }, body: JSON.stringify({ nickname }) }); const data: ApiResult = await response.json(); setJoining(false);
    if (!response.ok) return setError(data.error?.message || "Could not join.");
    localStorage.setItem(key(code), data.playerId!); setPlayerId(data.playerId!); setRoom(data.room);
  }

  const seconds = Math.max(0, Math.ceil(((room?.deadline || now) - now) / 1000));
  const me = room?.players.find((p) => p.id === playerId);
  const cardUrl = me ? `/api/card?nickname=${encodeURIComponent(me.nickname)}&score=${me.score}&spotted=${me.spotted}&rounds=${room?.totalRounds || 3}` : "";
  const sorted = useMemo(() => room?.players || [], [room?.players]);

  if (loading) return <main className="game-shell center"><div className="loader" /><p className="muted">Opening room {code}...</p></main>;
  if (!room) return <main className="game-shell center"><p className="eyebrow red">Room not found</p><h1 className="screen-title">That code has gone quiet.</h1><p className="muted">Check the letters, or make a fresh room.</p><a className="primary link-button" href="/">Back home</a></main>;
  if (!playerId || !room.players.some((p) => p.id === playerId)) {
    if (room.status !== "lobby") return <main className="game-shell center"><p className="eyebrow red">Room closed</p><h1 className="screen-title">This game already started.</h1><p className="muted">Ask the host to make a new room for the next round.</p><a className="primary link-button" href="/">Create a room</a></main>;
    return <main className="game-shell"><header className="brand-row"><div className="brand">Human or <i>bot?</i></div><span className="room-chip">{code}</span></header><section className="join-panel"><p className="eyebrow">You&apos;re invited</p><h1 className="screen-title">Join the room.</h1><p className="lede small">No account. Pick a name your friends will recognise.</p><form className="stack" onSubmit={join}><label>Nickname<input autoFocus required maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Your nickname" /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={joining}>{joining ? "Joining..." : "Join game"}</button></form></section></main>;
  }

  return <main className={`game-shell phase-${room.status}`}>
    {toast && <div className="toast">{toast}</div>}
    {room.status === "lobby" && <Lobby room={room} me={me!} onStart={() => action("start")} />}
    {room.status === "intro" && <section className="round-intro"><TopLine room={room} seconds={seconds} /><p className="eyebrow">Round {room.roundNumber}</p><h1 className="prompt giant">{room.prompt}</h1><p className="muted">Think like yourself. That&apos;s harder for the bot.</p>{room.isHost && <button className="text-button next-link" onClick={() => action("next")}>Start now →</button>}</section>}
    {room.status === "writing" && <section><TopLine room={room} seconds={seconds} /><p className="eyebrow">Prompt</p><h1 className="prompt">{room.prompt}</h1><form onSubmit={(e) => { e.preventDefault(); action("answer", { answer }); }} className="answer-form"><textarea autoFocus maxLength={140} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type what you would actually say..." /><div className="textarea-meta"><span>Casual is good. Lowercase is fine.</span><b>{answer.length}/140</b></div><button className="primary" disabled={!answer.trim()}>Send answer</button></form>{room.isHost && <button className="text-button next-link" onClick={() => action("next")}>End writing early →</button>}</section>}
    {room.status === "voting" && <section><TopLine room={room} seconds={seconds} label="Voting" /><h1 className="prompt medium">Which one is the bot?</h1><p className="muted prompt-sub">{room.prompt}</p><div className="answer-list">{room.answers?.map((item) => <button key={item.id} disabled={item.isOwn || Boolean(room.ownVote)} className={`vote-card ${item.isOwn ? "own" : ""} ${room.ownVote === item.id ? "selected" : ""}`} onClick={() => action("vote", { answerId: item.id })}><b>{item.label}</b><span>{item.text}</span><i>{item.isOwn ? "Yours" : room.ownVote === item.id ? "●" : "○"}</i></button>)}</div>{room.ownVote && <p className="locked">Vote locked. No take-backs.</p>}{room.isHost && <button className="text-button next-link" onClick={() => action("next")}>Reveal now →</button>}</section>}
    {room.status === "reveal" && <Reveal room={room} onNext={() => action("next")} />}
    {room.status === "scores" && <Scores room={room} me={me!} onNext={() => action("next")} />}
    {room.status === "finished" && <section className="final"><p className="eyebrow">Game over · {code}</p><h1>{sorted[0]?.nickname}<br /><mark>wins.</mark></h1><p className="lede small">{sorted[0]?.score} points · spotted the bot {sorted[0]?.spotted} out of {room.totalRounds}</p><div className="leaderboard">{sorted.map((p, i) => <div key={p.id} className={p.id === playerId ? "me" : ""}><b>{i + 1}</b><span className="avatar">{initials(p.nickname)}</span><strong>{p.nickname}</strong><span>{p.score}</span></div>)}</div><button className="primary" onClick={() => setShareOpen(true)}>Share my score</button><a className="secondary link-button" href="/">Create another room</a></section>}
    {shareOpen && <div className="modal-backdrop" onClick={() => setShareOpen(false)}><div className="share-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShareOpen(false)}>×</button><img src={cardUrl} alt="Your Human or Bot score card" /><button className="primary" onClick={async () => { if (navigator.share) await navigator.share({ title: "Human or Bot?", text: `I spotted ${me?.spotted}/${room.totalRounds} bots. Can you beat me?`, url: location.origin }); else { await navigator.clipboard.writeText(location.origin); setToast("Game link copied."); } }}>Share card</button><a className="secondary link-button" href={cardUrl} download="human-or-bot-score.png">Save image</a></div></div>}
  </main>;
}

function TopLine({ room, seconds, label }: { room: ClientRoom; seconds: number; label?: string }) { const total = room.status === "writing" ? 60 : room.status === "voting" ? 40 : 20; return <header className="round-top"><div><b>{room.code}</b><span>·</span><span>{label || `Round ${room.roundNumber} of ${room.totalRounds}`}</span></div><strong>0:{String(seconds).padStart(2, "0")}</strong><div className="progress"><i style={{ width: `${Math.max(0, Math.min(100, seconds / total * 100))}%` }} /></div></header>; }

function Lobby({ room, me, onStart }: { room: ClientRoom; me: NonNullable<ClientRoom["players"][number]>; onStart: () => void }) {
  const invite = typeof window !== "undefined" ? window.location.href : "";
  return <section><header className="simple-head"><h1>Lobby</h1><a href="/">Leave</a></header><div className="code-card"><div className="code-card-head"><span>Room code</span><button onClick={async () => { await navigator.clipboard.writeText(room.code); }}>Tap to copy</button></div><div className="code-boxes">{room.code.split("").map((letter, i) => <b key={i}>{letter}</b>)}</div><button className="primary" onClick={async () => { if (navigator.share) await navigator.share({ title: "Human or Bot?", text: `Join my Human or Bot room: ${room.code}`, url: invite }); else await navigator.clipboard.writeText(invite); }}>Share invite</button></div><div className="player-heading"><span>Players</span><span>{room.players.length} of 12</span></div><div className="players">{room.players.map((player) => <div key={player.id}><span className="avatar">{initials(player.nickname)}</span><b>{player.nickname}</b><small>{player.id === me.id ? "You" : player.id === room.players.find((p) => p.id === player.id && room.isHost)?.id ? "" : ""}</small>{player.id === room.players[0].id && room.isHost && <em>Host</em>}</div>)}</div>{room.isHost ? <><button className="primary bottom-action" disabled={room.players.length < 3} onClick={onStart}>Start game</button>{room.players.length < 3 && <p className="muted centered">Invite {3 - room.players.length} more {3 - room.players.length === 1 ? "person" : "people"} to start.</p>}</> : <div className="waiting"><span className="loader small" /><b>Waiting for the host</b></div>}</section>;
}

function Reveal({ room, onNext }: { room: ClientRoom; onNext: () => void }) {
  const bot = room.answers?.find((a) => a.isBot); const others = room.answers?.filter((a) => !a.isBot) || [];
  return <section className="reveal"><div className="reveal-top"><span>The bot wrote</span><span>Round {room.roundNumber} of {room.totalRounds}</span></div><div className="big-letter">{bot?.label}</div><blockquote>{bot?.text}</blockquote><div className="byline"><span>{bot?.votes || 0} vote{bot?.votes === 1 ? "" : "s"}</span><span>Written by the bot</span></div><details><summary>Who wrote what</summary>{others.map((a) => <div className="author-row" key={a.id}><b>{a.label}</b><span>{a.text}</span><i>{a.author}</i></div>)}</details>{room.isHost && <button className="primary" onClick={onNext}>Show scores</button>}</section>;
}

function Scores({ room, me, onNext }: { room: ClientRoom; me: ClientRoom["players"][number]; onNext: () => void }) { return <section><header className="simple-head"><h1>Scores</h1><span>After round {room.roundNumber}</span></header><div className="score-callout"><p>You have</p><strong>{me.score}</strong><span>points</span></div><div className="leaderboard">{room.players.map((p, i) => <div key={p.id} className={p.id === me.id ? "me" : ""}><b>{i + 1}</b><span className="avatar">{initials(p.nickname)}</span><strong>{p.nickname}</strong><span>{p.score}</span></div>)}</div>{room.isHost ? <button className="primary bottom-action" onClick={onNext}>{room.roundNumber === room.totalRounds ? "Final results" : "Next round"}</button> : <div className="waiting"><span className="loader small" /><b>Next round is coming</b></div>}</section>; }
