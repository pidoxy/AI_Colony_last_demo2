"use client";
import { FormEvent, useState } from "react";

export function Landing() {
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [nickname, setNickname] = useState(""); const [code, setCode] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ nickname, totalRounds: 3 }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.error.message);
    localStorage.setItem(`humanbot:${data.room.code}`, data.playerId); window.location.href = `/r/${data.room.code}`;
  }

  function join(event: FormEvent) { event.preventDefault(); if (code.trim().length !== 4) return setError("Enter the four-letter room code."); window.location.href = `/r/${code.trim().toUpperCase()}`; }

  return <main className="site-shell">
    <nav className="brand-row"><div className="brand">Human or <i>bot?</i></div><button className="text-button" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>How it works</button></nav>
    <section className="hero">
      <p className="eyebrow">A party game for 3-12</p>
      <h1>Spot the <mark>bot</mark> in<br />your group chat.</h1>
      <p className="lede">Everyone answers the same prompt. One answer is secretly written by AI. Find it before it fools you.</p>
      {mode === "home" && <div className="stack actions"><button className="primary" onClick={() => setMode("create")}>Create a room</button><button className="secondary" onClick={() => setMode("join")}>Join with a code</button></div>}
      {mode === "create" && <form className="stack actions" onSubmit={create}><label>What should friends call you?<input autoFocus required maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Your nickname" /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={loading}>{loading ? "Making room..." : "Create room"}</button><button type="button" className="text-button back" onClick={() => setMode("home")}>Back</button></form>}
      {mode === "join" && <form className="stack actions" onSubmit={join}><label>Room code<input autoFocus required maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, "").toUpperCase())} placeholder="KBXT" className="code-input" /></label>{error && <p className="form-error">{error}</p>}<button className="primary">Find room</button><button type="button" className="text-button back" onClick={() => setMode("home")}>Back</button></form>}
    </section>
    <section className="demo-card" aria-label="Example round"><div className="demo-head"><span>Which one is the bot?</span><span>0:31</span></div>{["mama put jollof hits different at 2pm", "nothing beats cold garri after a long day", "the rice must have party smoke inside"].map((text, i) => <div className={`demo-answer ${i === 1 ? "active" : ""}`} key={text}><b>{String.fromCharCode(65 + i)}</b><span>{text}</span></div>)}</section>
    <section id="how" className="how"><p className="eyebrow">How it works</p><h2>One link. Three rounds.<br />Everybody gets fooled.</h2><ol><li><b>Write</b><span>Answer a quick prompt in your own voice.</span></li><li><b>Vote</b><span>Pick the anonymous answer you think came from AI.</span></li><li><b>Reveal</b><span>Score 100 for spotting it and 50 for every friend you fool.</span></li></ol></section>
    <footer>No account · No download · Rooms disappear after 2 hours</footer>
  </main>;
}
