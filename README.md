# Planning Poker — an AIDEF Example Project

Real-time collaborative estimation for agile teams. Multiple people join the same room, vote on backlog items with hidden cards, and see consolidated results when the facilitator reveals.

> **This repository is an example project built with [AIDEF](https://github.com/jcarlos78/IADEF)** — a framework for disciplined AI-native software engineering. It demonstrates the full Spec-Driven Development (SDD) loop: **spec → plan → tasks → implementation**, with human-in-command (HIC) approval gates at every step.
>
> Browse [`specs/planning-poker/`](specs/planning-poker/) to see the spec, plan, and tasks that drove the implementation, and [`docs/adr/`](docs/adr/) for the architectural decisions taken along the way.

Stack: **Next.js 15** (App Router) + **Socket.IO** in a **single Node process** (custom server). In-memory state, ephemeral rooms. No database, no auth.

## Why this exists as an example

AIDEF builds on three native amplifiers — **Skills**, **MCPs**, and **SDD**. Reading the framework's templates is one thing; seeing the full loop applied to a non-trivial feature is another. This project walks through the loop end-to-end on a real-time web app:

- A complete **spec** ([`specs/planning-poker/spec.md`](specs/planning-poker/spec.md)) written before any code.
- An **implementation plan** ([`specs/planning-poker/plan.md`](specs/planning-poker/plan.md)) with architectural decisions extracted into ADRs.
- A **task breakdown** ([`specs/planning-poker/tasks.md`](specs/planning-poker/tasks.md)) decomposed into ~30-minute atomic commits.
- Three **ADRs** ([`docs/adr/`](docs/adr/)) capturing the stack, logging strategy, and CSS strategy decisions.
- A **constitution** ([`specs/constitution.md`](specs/constitution.md)) the project commits to.
- A **`.claude/CLAUDE.md`** project briefing that orients the AI agent at the start of every session.

## Quick start

```bash
npm install                 # install Node deps
npm run e2e:install         # download Chromium for Playwright (only for E2E)

npm run dev                 # http://localhost:3000 (tsx watch + Next dev)
npm run build && npm run start   # production
```

Open the home page, pick a scale, create a room. Share the `/room/<id>` URL with your team.

## Scripts

| Script                            | What it does                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`                     | Custom server with hot reload (`tsx watch src/server/index.ts`) in `NODE_ENV=development` |
| `npm run build`                   | `next build`                                                                              |
| `npm run start`                   | Production: `tsx src/server/index.ts` in `NODE_ENV=production`                            |
| `npm run typecheck`               | `tsc --noEmit`                                                                            |
| `npm run lint`                    | ESLint flat config (Next + TS + `no-console`)                                             |
| `npm run format` / `format:check` | Prettier                                                                                  |
| `npm test`                        | Vitest (unit + socket.io protocol) — **140 tests**                                        |
| `npm run e2e`                     | Playwright Chromium against a production build — **11 tests**                             |

## Environment variables

| Var                | Default                      | Purpose                                                              |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- |
| `PORT`             | `3000`                       | HTTP/WebSocket port                                                  |
| `NODE_ENV`         | `development`                | `production` disables pretty logs                                    |
| `LOG_LEVEL`        | `debug` (dev), `info` (prod) | Pino log level                                                       |
| `HOST_GRACE_MS`    | `30000`                      | grace period before promoting a new facilitator after host drops (AC10) |
| `TICK_INTERVAL_MS` | `5000`                       | how often TTL sweep + host handoff runs                              |
| `ROOM_TTL_MS`      | `600000`                     | a room with no activity is discarded after this (AC9)                |

Example in `.env.example`.

## How it works

- **Home (`/`)** — the form creates a room via `POST /api/rooms`. The server generates `roomId` (8-char base36) + `hostSessionId` (UUID), sets HttpOnly cookies `pp_session_<roomId>` and `pp_nickname_<roomId>`, and redirects to `/room/<roomId>`.
- **Room (`/room/[id]`)** — a Server Component reads the cookies and hydrates `RoomClient`. The client connects via Socket.IO and runs `room:join` automatically if it already has an identity (cookie or localStorage); otherwise it shows the `NicknameDialog`.
- **Real-time** — every state change is broadcast as `room:state` to the sockets in the room. A vote is **client-local state only** until the facilitator clicks "Reveal"; the server sanitizes via `toPublic()` before sending.
- **Identity** — the host uses an HttpOnly cookie (the server can read it during SSR). Guests generate a UUID client-side and persist it in `localStorage` per room so a reload doesn't create a duplicate.

## AC → tests mapping

| AC   | Behavior                       | Where it is tested                                                                        |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| AC1  | Create room with unique URL    | `room.test.ts`, `handlers.test.ts`, E2E create-and-join                                   |
| AC2  | Join via URL with a nickname   | `handlers.test.ts`, E2E create-and-join                                                   |
| AC3  | Vote hidden until reveal       | `room.test.ts` (toPublic), `handlers.test.ts` (JSON serializable), E2E vote-and-reveal    |
| AC4  | Reveal broadcast < 1s          | E2E vote-and-reveal (measures `Date.now()`)                                               |
| AC5  | Mean/min/max                   | `stats.test.ts`, `Results.test.tsx`, E2E vote-and-reveal                                  |
| AC6  | New round resets state         | `room.test.ts`, E2E vote-and-reveal                                                       |
| AC7  | Scales + switching between rounds | `scales.test.ts`, `room.test.ts`, `RoundControls.test.tsx`, E2E scale-switch           |
| AC8  | Empty/duplicate nickname       | `room.test.ts`, `CreateRoomForm.test.tsx`, `NicknameDialog.test.tsx`, E2E create-and-join |
| AC9  | Ephemeral room after 10 min    | `store.test.ts`, `handlers.test.ts` (tick)                                                |
| AC10 | Facilitator handoff            | `room.test.ts` (fake timers), E2E facilitator-handoff                                     |
| AC11 | Non-existent room              | `handlers.test.ts`, `RoomErrorView.test.tsx`, E2E create-and-join                         |
| AC12 | Real-time joins and leaves     | `handlers.test.ts`, `ParticipantList.test.tsx`, E2E vote-and-reveal                       |

## Known limitations (out of scope for the MVP)

- **No persistence.** Restarting the process drops every room. Documented in [docs/adr/0001-stack-choice.md](docs/adr/0001-stack-choice.md).
- **Single replica.** Does not scale horizontally as-is (would require Socket.IO's Redis adapter + sticky sessions). MVP decision.
- **No authentication.** Anyone with the link joins under any nickname. Duplicate nicknames are blocked, but the room itself is public.
- **No export.** Round results are not exportable (CSV, JSON, Jira).
- **No chat or timer.**

Full list in [specs/planning-poker/spec.md](specs/planning-poker/spec.md) (section "Out of scope").

## Architecture in brief

```text
                   ┌──────────────────────────────────┐
  Browser  ──HTTP──┤  Next.js (App Router)            │
                   │   /            (Home)            │
                   │   /room/[id]   (Server Component)│
                   │   /api/rooms   (POST handler)    │
                   └────────────┬─────────────────────┘
                                │ shared singleton
                                ▼
                   ┌──────────────────────────────────┐
  Browser  ──WS────┤  Socket.IO @ same httpServer     │
                   │   handlers → RoomStore → room.ts │
                   │   tick (cleanup + host handoff)  │
                   └──────────────────────────────────┘
```

Layers:

- `src/lib/` — **pure**, no I/O: `scales`, `stats`, `events` (types).
- `src/server/rooms/` — **pure**: `room.ts` (state machine), `store.ts` (in-memory Map + TTL), `instance.ts` (singleton via `globalThis Symbol` — required because the Next bundle splits route handlers from the custom server).
- `src/server/socket/handlers.ts` — adapts Socket.IO ↔ store, broadcasts `room:state`.
- `src/server/index.ts` — boots Next + Socket.IO + `setInterval(tick)`.
- `src/app/` — Next.js: Home (Client), `/room/[id]` (Server + Client), `/api/rooms` (POST).
- `src/components/` — UI: `CreateRoomForm`, `NicknameDialog`, `ParticipantList`, `RoomErrorView`, `CardPicker`, `RoundControls`, `Results`.

## Constitution & SDD

This project follows [specs/constitution.md](specs/constitution.md):

- **Principle 1** — Spec before code: [specs/planning-poker/spec.md](specs/planning-poker/spec.md) was written and approved before a single line of code.
- **Principle 2** — Tests track behavior: every AC has at least one test.
- **Principle 3** — HIC: every commit received explicit human approval before landing.
- **Principle 5** — ADRs for architectural decisions: [0001-stack-choice](docs/adr/0001-stack-choice.md), [0002-logging-strategy](docs/adr/0002-logging-strategy.md), [0003-css-strategy](docs/adr/0003-css-strategy.md).
- **Principle 7** — Atomic changes: one commit per task in [specs/planning-poker/tasks.md](specs/planning-poker/tasks.md).
- **Principle 8** — Fail visibly: named errors (`ErrorCode` in [events.ts](src/lib/events.ts)), structured Pino logs.

## License

[MIT](LICENSE).
