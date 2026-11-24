import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "Human or Bot - spot the bot in your group chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", background: "#f7f5f1", color: "#121110", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70, fontFamily: "Arial" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700 }}><span>Human or bot?</span><span style={{ color: "#9c968c" }}>3-12 players · 6 minutes</span></div>
    <div style={{ fontFamily: "Georgia", fontSize: 96, lineHeight: .95, maxWidth: 920 }}>Spot the <span style={{ background: "#ffc83d", padding: "0 10px", fontStyle: "italic" }}>bot</span> in your group chat.</div>
    <div style={{ fontSize: 30, color: "#5e5a52" }}>No download. No account. Just send the link.</div>
  </div>, size);
}
