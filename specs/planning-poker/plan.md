# Plan: Planning Poker

> **Prerequisite:** `spec.md` approved on 2026-06-09.

## Architectural decisions

Each decision below has long-term implications and gets its own ADR.

- **D1 — Stack: Node.js + Next.js (App Router) + socket.io for WebSocket.** [ADR 0001 — required]
- **D2 — Logging strategy: structured Pino, levels info/warn/error, no PII.** [ADR 0002 — required, referenced by CLAUDE.md]
- **D3 — Room state in-memory in a single Node process.** No Redis, no cluster. Documented inside ADR 0001 as an accepted negative consequence of the single-replica MVP.
- **D4 — Facilitator identity via session token (HttpOnly cookie or in-memory client token returned at room creation),** not by nickname. Technical detail, no dedicated ADR — belongs in the "room model" section below.
- **D5 — Frontend and backend in the same Next.js project (custom server), TypeScript everywhere.** Follows from D1 — no extra ADR.

## Affected components

Proposed implementation layout (no code yet; final names may shift in the tasks):

```
src/
├── server/
│   ├── index.ts                custom HTTP server (Next + Socket.IO)
│   ├── rooms/
│   │   ├── store.ts            in-memory Map<roomId, RoomState> + TTL cleanup
│   │   ├── room.ts             RoomState, transitions (start round, vote, reveal, reset)
│   │   └── room.test.ts        unit tests for the state machine
│   ├── socket/
│   │   ├── handlers.ts         socket.io events ↔ store
│   │   └── handlers.test.ts    protocol tests (with in-memory socket.io-client)
│   └── logger.ts               Pino wrapper (config per ADR 0002)
├── lib/
│   ├── scales.ts               Fibonacci / Fibonacci-mod / T-shirt scales
│   ├── stats.ts                mean/min/max ignoring ?, ☕
│   ├── events.ts               shared client ↔ server types
│   └── stats.test.ts           unit tests for the aggregator
├── app/
│   ├── page.tsx                home: create a room (pick a scale) → redirect to /room/[id]
│   ├── room/[id]/page.tsx      room screen (Server Component that mounts the client)
│   └── room/[id]/RoomClient.tsx Client Component that connects to the socket
├── components/
│   ├── NicknameDialog.tsx
│   ├── CardPicker.tsx
│   ├── ParticipantList.tsx
│   ├── RoundControls.tsx       (visible only to the facilitator)
│   └── Results.tsx
└── styles/                     CSS modules or Tailwind (decided in the setup task)

tests/
├── e2e/                        Playwright (multi-browser) — critical flows
│   ├── create-and-join.spec.ts          AC1, AC2, AC8, AC11
│   ├── vote-and-reveal.spec.ts          AC3, AC4, AC5, AC6
│   ├── facilitator-handoff.spec.ts      AC10
│   └── scale-switch.spec.ts             AC7
└── unit/                       (mirrors src/, run by Vitest)

docs/adr/
├── 0001-stack-choice.md        Next.js + Socket.IO
└── 0002-logging-strategy.md    Pino

package.json, tsconfig.json, next.config.ts, vitest.config.ts, playwright.config.ts,
.env.example, .gitignore (adjustments for node_modules, .next, etc.)
```

None of this exists yet — `src/` and `tests/` have only `README.md` and `.gitkeep`. The first task will be **project setup**.

## Implementation sequence

Each item becomes an atomic task in `tasks.md`. Proposed order — designed to be interruptible and reviewable at every PR/commit.

1. **Next.js + TypeScript project setup + tooling** (lint, format, vitest, playwright). No feature yet — only scaffolding.
2. **ADRs 0001 and 0002 committed** if not already. (They likely land alongside the plan, before any code.)
3. **Shared types and scales** in `src/lib/` (scales, events, stats) + **unit tests for `stats`** (AC5 — mean/min/max). No WebSocket yet.
4. **Room model (state machine)** in `src/server/rooms/` with unit tests covering: create a room, join with a valid/duplicate/empty nickname, start a round, vote, reveal, reset, switch the scale between rounds, facilitator handoff. (AC1, AC3, AC6, AC7, AC8, AC10).
5. **Custom server + socket.io integration** with event handlers mapping to the model. Includes TTL cleanup for AC9 (ephemeral room). Protocol tests with socket.io-client.
6. **Home UI** — "create a room" form + scale picker (AC1).
7. **Room UI** — nickname entry (AC2, AC8), participant list (AC12), card picker (AC3), facilitator controls (AC4, AC6, AC7), results (AC5).
8. **Client-side error handling** — non-existent/expired room (AC11), disconnect, simple reconnect.
9. **Playwright E2E tests** covering the ACs with 2+ simultaneous browsers.
10. **Polish + docs** — README with dev/start instructions, `.env.example`, optional screenshot.

Each step is a commit (or a "code + test" pair commit) — never mixing feature with refactor.

## Testing strategy

- **Unit tests (Vitest)** — `src/lib/stats.ts`, `src/lib/scales.ts`, and primarily the state machine `src/server/rooms/room.ts`. Must be deterministic and fast (< 1s total).
- **Protocol tests (Vitest + socket.io-client)** — spin up a socket.io server in-process, simulate N clients, validate that events match the model. Cover critical transitions (reveal reaches everyone, vote does not leak before reveal).
- **E2E (Playwright)** — open 2–3 browser contexts pointing at the same room and validate the real-time flows. Runs against the real server (`next dev` or production build). Covers ACs involving time perception (AC4 with timeout < 1s).
- **Manual smoke** before declaring done: run locally, open 3 tabs in different browsers, play a round end-to-end. Human validation required by HIC.

Coverage is not a numeric target — each AC in the spec needs at least one mapped test (traceability `AC# → test`), which will be verified at the end via a table in the README or in the final PR comment.

## Implementation risks

**Technical** risks (product risks stayed in the spec):

- **R1 — Next.js custom server + Socket.IO has friction with hot reload and with Vercel deployment.** Mitigation: document that deployment is on a VM/container (not serverless), and isolate the server entry point so `next dev` can run separately when possible.
- **R2 — Room TTL cleanup (AC9) may leak timers or discard rooms with a "zombie" participant.** Mitigation: use timestamps instead of `setTimeout` per room — a single interval sweeps the Map. Test with fake timers.
- **R3 — Client reconnection after a short network drop may duplicate a participant or lose the facilitator identity.** Mitigation: sessionId in cookie/localStorage; on reconnect, re-attach to the room using sessionId; dedicated E2E test for reconnection.
- **R4 — Race in facilitator handoff (AC10): if several participants detect the absence at the same time, they could all try to take over.** Mitigation: the server decides exclusively; the client never proposes succession. State is centralized, not distributed.
- **R5 — Multi-browser Playwright flaky in CI.** Mitigation: use `expect.poll` for real-time assertions, avoid `sleep`; run locally first.

## Definition of Done

- [ ] Every test derived from the spec passes (unit + protocol + E2E).
- [ ] Every AC has at least one mapped test.
- [ ] Code review approved (`code-reviewer` skill + human review).
- [ ] ADRs 0001 and 0002 committed and referenced in the README.
- [ ] Project README updated with how to run (`npm run dev`, `npm test`, `npm run e2e`).
- [ ] `.env.example` present; no secrets in the diff.
- [ ] Manual smoke: 3 tabs, full round, no console errors or React warnings.
- [ ] Constitution principles respected (spec first, paired tests, ADRs, atomic, no secrets, fail visibly).
