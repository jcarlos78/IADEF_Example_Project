# Tasks: Planning Poker

> **Prerequisite:** `plan.md` approved on 2026-06-09.
>
> Decomposition into **atomic** tasks (~30 min each). Each task has a verifiable completion criterion.
> In HIC mode: each task = 1 commit; each commit requires human approval before landing.

---

## Task 1 — Next.js + TypeScript project setup

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx` (placeholder), `README.md` ("how to run" section)

**Description:**
Initialize a Next.js 15 (App Router) project with TypeScript at the repository root. No feature yet — only scaffolding. Configure `.gitignore` for `node_modules/`, `.next/`, `coverage/`. Create `.env.example` with `LOG_LEVEL=info` and `PORT=3000`. The `/` page shows only "Planning Poker" to confirm the build comes up. Update `README.md` with `npm install` / `npm run dev`.

**Done when:**
- [ ] `npm run dev` comes up on http://localhost:3000 and shows the placeholder page
- [ ] `npm run build` completes without error
- [ ] `npx tsc --noEmit` passes
- [ ] `node_modules/` and `.next/` are ignored by git
- [ ] `README.md` documents install + dev

**Estimate:** ~30 min

**Depends on:** —

---

## Task 2 — Tooling: ESLint, Prettier, Vitest

**Files:** `.eslintrc.json` (or `eslint.config.mjs`), `.prettierrc`, `vitest.config.ts`, `package.json` (scripts), `src/lib/__sanity__.test.ts` (smoke test)

**Description:**
Configure ESLint with Next + TypeScript rules + `no-console` on (ADR 0002). Prettier with defaults. Vitest with `jsdom` for anything that touches the DOM and `node` by default. Scripts: `npm run lint`, `npm run format`, `npm test`. Create a sanity test `expect(1+1).toBe(2)` to validate the pipeline.

**Done when:**
- [ ] `npm run lint` passes
- [ ] `npm test` runs the sanity test green
- [ ] `no-console` is active in ESLint (test by adding `console.log` and seeing the error)
- [ ] `npm run format -- --check` passes

**Estimate:** ~30 min

**Depends on:** Task 1

---

## Task 3 — Shared event types and scales

**Files:** `src/lib/events.ts`, `src/lib/scales.ts`, `src/lib/scales.test.ts`

**Description:**
Define TS types for client↔server events (`ClientToServerEvents`, `ServerToClientEvents`) — no implementation yet, just the contracts. Define the 3 scales as `{ id, label, cards }` objects:
- `fibonacci`: `['0','1','2','3','5','8','13','21','?','☕']`
- `fibonacci-mod`: `['0','½','1','2','3','5','8','13','20','40','100','?','☕']`
- `tshirt`: `['XS','S','M','L','XL','XXL','?','☕']`

A `getScale(id)` function returns the scale or throws. Tests: validate every scale's shape and that `getScale('unknown')` throws.

**Done when:**
- [ ] `getScale` returns the correct scale for each id
- [ ] `getScale('foo')` throws with a clear message
- [ ] `npm test` green
- [ ] AC7 (predefined scales) has test coverage

**Estimate:** ~30 min

**Depends on:** Task 2

---

## Task 4 — Statistics function (mean/min/max)

**Files:** `src/lib/stats.ts`, `src/lib/stats.test.ts`

**Description:**
`summarize(votes: string[])` returns `{ average: number|null, min: number|null, max: number|null, counts: Record<string, number> }`. Ignores `?` and `☕` for the numeric calculation but counts them in `counts`. Treats `½` as `0.5`. If every vote is non-numeric, `average/min/max = null`.

Tests cover: numeric-only votes, mix with `?`/`☕`, only `?`, empty list, T-shirt scale (all non-numeric).

**Done when:**
- [ ] `npm test` green with at least 5 cases
- [ ] AC5 (mean/min/max) covered

**Estimate:** ~30 min

**Depends on:** Task 3

---

## Task 5 — Room state machine (pure model)

**Files:** `src/server/rooms/room.ts`, `src/server/rooms/room.test.ts`

**Description:**
Implement `RoomState` as an object + pure functions (no I/O, no socket). Operations:
- `createRoom(scaleId, hostSessionId)` → `RoomState`
- `joinRoom(state, sessionId, nickname)` → `RoomState | RoomError` (rejects empty/duplicate nickname)
- `leaveRoom(state, sessionId)` → `RoomState`
- `startRound(state, sessionId, title?)` → requires facilitator, requires no round in progress
- `castVote(state, sessionId, card)` → requires an open round, requires a valid card in the scale
- `revealRound(state, sessionId)` → requires facilitator, closes the round and returns the result
- `resetRound(state, sessionId)` → requires facilitator
- `changeScale(state, sessionId, scaleId)` → requires facilitator + no round in progress
- `transferHostIfNeeded(state, gracePeriodMs)` → if the host left more than graceMs ago, promotes the oldest participant

Tests: cover EVERY AC handled by this module (AC1, AC3, AC6, AC7, AC8, AC10). Mock time via `vi.useFakeTimers`.

**Done when:**
- [ ] At least 12 tests (one per valid transition + error cases)
- [ ] Host transfer covered with fake timers
- [ ] `npm test` green
- [ ] No function imports from `socket.io` or `next` — pure

**Estimate:** ~30 min × 2 (split into 5a-model and 5b-tests if needed; keep a single commit "Task 5")

**Depends on:** Task 4

---

## Task 6 — In-memory store with TTL cleanup

**Files:** `src/server/rooms/store.ts`, `src/server/rooms/store.test.ts`

**Description:**
`RoomStore` encapsulates `Map<roomId, RoomState>` + `lastActivityAt: Map<roomId, number>`. API: `create`, `get`, `update`, `delete`. A `cleanupStale(ttlMs, now)` method removes rooms with no activity for longer than the TTL. A single `setInterval` in the app calls `cleanupStale(10*60*1000, Date.now())` — but the interval stays outside the store (testability).

Tests with fake timers: create a room, advance time > 10 min, call cleanup, the room is gone. AC9.

**Done when:**
- [ ] `cleanupStale` only removes inactive rooms
- [ ] Renewed activity (e.g. new vote) prevents cleanup
- [ ] AC9 covered
- [ ] `npm test` green

**Estimate:** ~30 min

**Depends on:** Task 5

---

## Task 7 — Logger wrapper (Pino)

**Files:** `src/server/logger.ts`, `package.json` (deps: `pino`, `pino-pretty`)

**Description:**
A single wrapper exports `logger`. With `NODE_ENV=production` → JSON; in dev → `pino-pretty`. Level controlled by `LOG_LEVEL`. ADR 0002 convention.

No unit tests (trivial wrapper). Manual check: import and call `logger.info({ event: 'test' }, 'hello')`.

**Done when:**
- [ ] `logger` exported and typed
- [ ] `LOG_LEVEL=debug` shows debug; `LOG_LEVEL=info` does not
- [ ] Pretty-print in dev, JSON in prod (check with `NODE_ENV=production node -e "..."`)

**Estimate:** ~20 min

**Depends on:** Task 2

---

## Task 8 — Custom server + Socket.IO handlers

**Files:** `src/server/index.ts`, `src/server/socket/handlers.ts`, `src/server/socket/handlers.test.ts`, `package.json` (deps: `socket.io`, `socket.io-client` dev)

**Description:**
Custom HTTP server that boots Next.js and attaches Socket.IO. The handlers map socket events to store operations:
- `room:create` → creates, returns `{ roomId, hostSessionId }`
- `room:join` → joins with `{ roomId, sessionId, nickname }`; returns state or error
- `round:start`, `round:vote`, `round:reveal`, `round:reset`, `room:changeScale`
- Server emits `room:state` (broadcast) on every change
- Logs at key points per ADR 0002

Protocol tests: spin up the socket.io server in-process, connect 2–3 clients via `socket.io-client`, validate flows. Cover AC3 (vote does not leak), AC4 (reveal reaches everyone), AC10 (host handoff), AC11 (non-existent room), AC12 (join/leave broadcast).

**Done when:**
- [ ] `npm run dev` boots Next + Socket.IO in the same process
- [ ] At least 6 protocol tests green
- [ ] A vote does not appear in the payload of other clients before `round:reveal`
- [ ] Errors return payload `{ error: 'code', message: '...' }` (Principle 8)

**Estimate:** ~30 min × 2 (handlers + tests)

**Depends on:** Task 6, Task 7

---

## Task 9 — UI: Home (create room)

**Files:** `src/app/page.tsx`, `src/components/CreateRoomForm.tsx`, `src/components/CreateRoomForm.test.tsx`

**Description:**
The `/` page has a form: scale picker (3 options), "Create room" button. Submit calls the `/api/rooms` endpoint (or socket directly — decided in the task; preference: HTTP POST via a Next route handler that delegates to the store, then `redirect` to `/room/[id]`). The host session is tagged via a `pp_session` cookie (HttpOnly + SameSite=Lax, value = uuid).

Test with Vitest + Testing Library: it renders, submit calls the mock and redirects.

**Done when:**
- [ ] Home renders and creates a room with the selected scale
- [ ] Redirects to `/room/[id]`
- [ ] `pp_session` cookie set
- [ ] AC1 covered

**Estimate:** ~30 min

**Depends on:** Task 8

---

## Task 10 — UI: Room (nickname entry + participant list)

**Files:** `src/app/room/[id]/page.tsx`, `src/app/room/[id]/RoomClient.tsx`, `src/components/NicknameDialog.tsx`, `src/components/ParticipantList.tsx` + tests

**Description:**
The `/room/[id]` page is a Server Component that renders `RoomClient` (Client Component). RoomClient: on mount, connects the socket; if there is no nickname in local state, shows `NicknameDialog`. After joining, shows the participant list (updates via `room:state`). Handle errors: non-existent room → screen with "create a new room" link (AC11).

Tests: NicknameDialog rejects empty; ParticipantList renders N participants; room error shows the CTA.

**Done when:**
- [ ] AC2 (join with nickname), AC8 (empty/duplicate nickname), AC11 (non-existent room), AC12 (real-time list) covered
- [ ] Socket.io auto-reconnect preserved

**Estimate:** ~30 min × 2

**Depends on:** Task 9

---

## Task 11 — UI: Card picker + facilitator controls + results

**Files:** `src/components/CardPicker.tsx`, `src/components/RoundControls.tsx`, `src/components/Results.tsx` + tests

**Description:**
- `CardPicker`: renders cards from the current scale; clicking emits `round:vote`. Locally highlights the selected card.
- `RoundControls`: visible only when `isHost`. Buttons "Start round" (with optional title input), "Reveal", "New round", scale picker (disabled during a round).
- `Results`: after reveal, shows every vote + mean/min/max (from `summarize`).

Before reveal, other participants only see "X has voted" (without the value) — AC3.

**Done when:**
- [ ] AC3, AC4, AC5, AC6, AC7 covered with component tests
- [ ] Local vote highlighted, but does not leak to others

**Estimate:** ~30 min × 2

**Depends on:** Task 10

---

## Task 12 — E2E Playwright (multi-browser)

**Files:** `playwright.config.ts`, `tests/e2e/create-and-join.spec.ts`, `tests/e2e/vote-and-reveal.spec.ts`, `tests/e2e/facilitator-handoff.spec.ts`, `tests/e2e/scale-switch.spec.ts`

**Description:**
Playwright with 2–3 concurrent browser contexts on the same room. Specs:
- `create-and-join`: AC1, AC2, AC8, AC11
- `vote-and-reveal`: AC3, AC4 (timeout < 1s), AC5, AC6, AC12
- `facilitator-handoff`: AC10 (close host tab, wait for simulated 30s, see transfer)
- `scale-switch`: AC7

Runs against `npm run dev` (Playwright `webServer`). Use `expect.poll` for real-time assertions.

**Done when:**
- [ ] `npm run e2e` green locally
- [ ] Each AC has at least 1 E2E test mapped in the traceability
- [ ] No fixed `sleep` in the specs

**Estimate:** ~30 min × 3

**Depends on:** Task 11

---

## Task 13 — Polish, README, manual smoke

**Files:** `README.md`, occasional UI fine-tuning

**Description:**
Final README with: description, optional screenshot, how to run (dev / build / e2e), environment variables, known limitations (single replica, no persistence). Manual smoke: 3 tabs in different browsers, full round, no console warnings. Update `.claude/CLAUDE.md` filling in the `[PROJECT NAME]` sections, tech stack, etc.

**Done when:**
- [ ] README complete
- [ ] Manual smoke passed (logged in the final PR)
- [ ] `.claude/CLAUDE.md` filled in
- [ ] `plan.md` DoD 100% checked

**Estimate:** ~30 min

**Depends on:** Task 12

---

## Traceability

| Spec AC | Task(s) | Status |
|---|---|---|
| AC1 — create room with unique URL | Task 5, Task 8, Task 9, Task 12 (create-and-join) | done |
| AC2 — join via URL with a nickname | Task 8, Task 10, Task 12 (create-and-join) | done |
| AC3 — vote hidden until reveal | Task 5, Task 8, Task 11, Task 12 (vote-and-reveal) | done |
| AC4 — reveal broadcast < 1s | Task 8, Task 11, Task 12 (vote-and-reveal) | done |
| AC5 — mean/min/max | Task 4, Task 11, Task 12 (vote-and-reveal) | done |
| AC6 — new round resets state | Task 5, Task 8, Task 11, Task 12 (vote-and-reveal) | done |
| AC7 — scales (incl. switching between rounds) | Task 3, Task 5, Task 11, Task 12 (scale-switch) | done |
| AC8 — empty/duplicate nickname | Task 5, Task 10, Task 12 (create-and-join) | done |
| AC9 — room expires after 10 min | Task 6 | done |
| AC10 — facilitator handoff | Task 5, Task 8, Task 12 (facilitator-handoff) | done |
| AC11 — non-existent room | Task 8, Task 10, Task 12 (create-and-join) | done |
| AC12 — real-time joins and leaves | Task 8, Task 10, Task 12 (vote-and-reveal) | done |

> Updated on 2026-06-10 — feature complete. See `git log --oneline --grep="planning-poker"` for the per-task commits.
