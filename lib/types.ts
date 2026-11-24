export type Phase = "lobby" | "intro" | "writing" | "voting" | "reveal" | "scores" | "finished" | "closed";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  joinedAt: number;
  spotted: number;
}

export interface RoundAnswer {
  id: string;
  authorId: string | null;
  text: string;
  label?: string;
}

export interface Round {
  number: number;
  promptId: string;
  prompt: string;
  botAnswer: string;
  botSource: "model" | "bank";
  answers: Record<string, string>;
  labelledAnswers: RoundAnswer[];
  votes: Record<string, string>;
  reports: Record<string, string[]>;
  scored: boolean;
}

export interface Room {
  code: string;
  status: Phase;
  hostId: string;
  roundNumber: number;
  totalRounds: number;
  deadline: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  players: Record<string, Player>;
  rounds: Round[];
}

export interface ClientAnswer { id: string; label: string; text: string; isOwn: boolean; author?: string; isBot?: boolean; votes?: number; hidden?: boolean }

export interface ClientRoom {
  code: string;
  status: Phase;
  roundNumber: number;
  totalRounds: number;
  deadline: number | null;
  version: number;
  isHost: boolean;
  prompt?: string;
  players: Player[];
  answers?: ClientAnswer[];
  ownVote?: string;
  botLabel?: string;
}
