import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
const regularFont = readFile(path.join(process.cwd(), "node_modules/@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf"));
const italicFont = readFile(path.join(process.cwd(), "node_modules/@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"));
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const nickname = (query.get("nickname") || "Player").replace(/[<>]/g, "").slice(0, 20);
  const score = Math.max(0, Math.min(9999, Number(query.get("score") || 0)));
  const spotted = Math.max(0, Math.min(5, Number(query.get("spotted") || 0)));
  const rounds = Math.max(3, Math.min(5, Number(query.get("rounds") || 3)));
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f5f1", padding: 72, fontFamily: "Arial", color: "#121110" }}>
    <div style={{ width: "100%", border: "2px solid #e4dfd5", borderRadius: 38, background: "white", padding: 66, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 36, fontWeight: 700 }}><span style={{ display: "flex" }}>Human or&nbsp;<span style={{ fontFamily: "Georgia", fontStyle: "italic" }}>bot?</span></span><span style={{ color: "#9c968c", letterSpacing: 5 }}>RESULT</span></div>
      <div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontFamily: "Instrument", fontSize: 210, lineHeight: .85 }}>{`${spotted}/${rounds}`}</div><div style={{ fontFamily: "Instrument", fontStyle: "italic", fontSize: 70 }}>bots spotted.</div><div style={{ display: "flex", marginTop: 46, fontSize: 34 }}>{Array.from({ length: rounds }).map((_, i) => <span key={i} style={{ width: 42, height: 42, borderRadius: 24, marginRight: 18, background: i < spotted ? "#ffc83d" : "white", border: "4px solid #9c968c" }} />)}<span style={{ marginLeft: 16 }}>{`${nickname} scored ${score} points.`}</span></div></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 }}><span style={{ color: "#9c968c", letterSpacing: 4 }}>HUMANORBOT.VERCEL.APP</span><span>Can you beat me?</span></div>
    </div>
  </div>, { width: 1080, height: 1350, fonts: [
    { name: "Instrument", data: await regularFont, weight: 400, style: "normal" },
    { name: "Instrument", data: await italicFont, weight: 400, style: "italic" }
  ] });
}
