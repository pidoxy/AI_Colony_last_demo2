import type { Metadata } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import "./type.css";

const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: "Human or Bot?",
  description: "Spot the bot in your group chat. A six-minute party game for 3-12 people.",
  openGraph: { title: "Human or Bot?", description: "One answer is AI. Can your group spot it?", type: "website", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Human or Bot?", description: "One answer is AI. Can your group spot it?" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
