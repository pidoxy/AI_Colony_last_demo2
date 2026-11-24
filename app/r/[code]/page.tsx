import type { Metadata } from "next";
import { RoomApp } from "@/components/RoomApp";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params; const clean = code.toUpperCase();
  return { title: `Join room ${clean} · Human or Bot?`, description: `Your friends are waiting in room ${clean}. One answer is AI. Can you spot it?`, openGraph: { title: `You're invited: ${clean}`, description: "Join the room. Answer the prompt. Spot the bot.", images: [`/r/${clean}/opengraph-image`] } };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <RoomApp code={code.toUpperCase()} />; }
