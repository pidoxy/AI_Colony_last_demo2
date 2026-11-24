# Human or Bot?

A mobile-first party game for 3-12 people. Everyone answers the same prompt, one answer is written by a guarded AI bot, and the group votes for the bot. A game is three rounds and takes about six minutes.

## What ships

- Create and join by four-letter room code or invite link; no account.
- Lobby for 3-12 players, host-controlled start, three timed rounds.
- Anonymous writing, one immutable vote per player, no self-votes.
- Reveal, authors, 100 points for spotting the bot and 50 points per fooled voter.
- Forty curated prompts and six pre-written fallback answers for every prompt.
- AI kill switch, daily cap, 8-second timeout, response validation, and automatic fallback.
- Poll-based live updates with version checks and lazy, compare-and-set phase advancement.
- Player-only answer hiding after a report, nickname/answer limits, word filter, and rate limits.
- Dynamic 1080×1350 share card and per-room WhatsApp/Open Graph preview.
- Two-hour room expiry. No accounts, analytics cookies, Postgres, or paid add-ons.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

With no Redis variables, development and tests use the in-memory store. Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or the Vercel integration equivalents `KV_REST_API_URL` / `KV_REST_API_TOKEN`, for shared serverless state in production. The Redis adapter uses compare-and-set Lua so concurrent writes cannot create a second vote or advance a phase twice.

Run the checks:

```bash
npm test
npm run build
```

## Vercel setup

1. Import the repository into Vercel.
2. Add a free Upstash Redis database from the Vercel Marketplace.
3. Add the environment variables from `.env.example`.
4. Start with `BOT_ENABLED=0`. The game remains fully playable from the answer bank.
5. To enable a compatible chat-completions model, set the endpoint, model and key, choose a low `BOT_DAILY_CAP`, then set `BOT_ENABLED=1`.
6. Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL so link previews use absolute URLs.

Free-plan quotas change. Check the current Vercel and Upstash dashboards before launch. The app polls every 3 seconds during play, every 5 seconds in the lobby, pauses in hidden tabs, and stops after the game.

## Environment controls

| Variable | Purpose |
|---|---|
| `BOT_ENABLED` | `0` is the no-redeploy kill switch; no model request is attempted. |
| `BOT_DAILY_CAP` | Maximum guarded model attempts per UTC day. |
| `BOT_MODEL_ENDPOINT` | OpenAI-compatible chat-completions endpoint. |
| `BOT_MODEL_NAME` | Provider model identifier. |
| `BOT_MODEL_KEY` | Server-only provider key. |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Shared expiring room state. |

## Security note

The model sees only repository-owned prompts and never receives player text. Player IDs are random browser identifiers for game coordination, not authentication. Room codes are intentionally short and guessable; joining stops after the lobby and rooms cap at 12 players. The small word filter will miss abuse, so players can hide/report an answer and reports are counted in room data. At scale, use longer invite tokens and a dedicated moderation service.
