import { ImageResponse } from "next/og";
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", background: "#ffc83d", color: "#121110", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, fontFamily: "Arial" }}>
    <div style={{ fontSize: 38, fontWeight: 700 }}>Human or <span style={{ fontFamily: "Georgia", fontStyle: "italic" }}>bot?</span></div>
    <div><div style={{ fontFamily: "Georgia", fontSize: 92 }}>Can you spot the bot?</div><div style={{ fontSize: 34, marginTop: 20 }}>Your friends are waiting. Join with code</div></div>
    <div style={{ display: "flex", letterSpacing: 38, fontSize: 82, fontWeight: 800 }}>{code.toUpperCase()}</div>
  </div>, size);
}
