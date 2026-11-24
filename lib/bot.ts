import type { PromptEntry } from "./content";
import type { Store } from "./store";

function bankAnswer(entry: PromptEntry, seed: number) { return entry.answers[seed % entry.answers.length]; }

function validAnswer(value: string) {
  const cleaned = value.trim().replace(/^['\"]|['\"]$/g, "").slice(0, 140);
  if (!cleaned || /\b(as an ai|language model|artificial intelligence)\b/i.test(cleaned)) return null;
  return cleaned;
}

export async function createBotAnswer(entry: PromptEntry, store: Store, seed: number): Promise<{ text: string; source: "model" | "bank" }> {
  if (process.env.BOT_ENABLED !== "1") return { text: bankAnswer(entry, seed), source: "bank" };
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const used = await store.increment(`botcalls:${today}`, 172800);
  if (used > Number(process.env.BOT_DAILY_CAP || 30)) return { text: bankAnswer(entry, seed), source: "bank" };
  if (!process.env.BOT_MODEL_ENDPOINT || !process.env.BOT_MODEL_KEY) return { text: bankAnswer(entry, seed), source: "bank" };

  try {
    const response = await fetch(process.env.BOT_MODEL_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.BOT_MODEL_KEY}` },
      body: JSON.stringify({
        model: process.env.BOT_MODEL_NAME,
        messages: [{ role: "user", content: `Answer this prompt in one casual, human-sounding sentence under 140 characters. Lowercase is fine. No quotation marks and never mention being AI. Prompt: ${entry.prompt}` }],
        max_tokens: 80,
        temperature: 0.9
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("model failed");
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = validAnswer(data.choices?.[0]?.message?.content || "");
    if (!text) throw new Error("invalid model answer");
    return { text, source: "model" };
  } catch {
    return { text: bankAnswer(entry, seed), source: "bank" };
  }
}
