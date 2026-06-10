# ADR 0001 — Stack: Next.js + Socket.IO on a single Node server

- **Status:** accepted
- **Date:** 2026-06-09
- **Decision-makers:** José Menezes

## Context

The project delivers a real-time Planning Poker web app for internal agile teams (spec `specs/planning-poker/spec.md`). The architectural requirements that drive the stack choice:

- **Bidirectional real-time:** the server pushes events (vote registered, reveal, join/leave) to every client in the room with sub-second latency (AC4 of the spec).
- **Live state on the server:** rooms are ephemeral, in-memory. No database in the MVP.
- **Lean MVP:** small team, internal deployment, no expectation of more than 1 replica in the short term.
- **Frontend + backend in one repo:** avoids orchestrating two projects for an MVP with a few months horizon.
- **TypeScript everywhere:** shared event types between client and server kill an entire class of WebSocket protocol bugs.

There are no prior architectural decisions in the repository (`docs/adr/` was empty). The `CLAUDE.md` left the *tech stack* section blank; this ADR fills that gap for the feature at hand.

## Decision

We will use **Next.js 15+ (App Router) with TypeScript** as the main framework, running behind a **custom Node.js HTTP server** that integrates **Socket.IO** for real-time communication. All room state lives **in memory in a single Node process**, with no Redis nor cluster adapter in the MVP.

Details:
- **Frontend and backend in the same Next.js project.** HTTP routes via App Router; real-time channel via Socket.IO over the same HTTP server.
- **Custom `server.ts`** calls `next({...}).prepare()` and attaches the Socket.IO server to the same `http.Server`. This precludes serverless runtimes (Vercel default) but is compatible with any Node VM/container.
- **Shared types** in `src/lib/events.ts` consumed both client- and server-side.
- **Tests** with Vitest (unit + protocol) and Playwright (multi-browser E2E).

## Alternatives considered

- **Python + FastAPI + native WebSocket + separate React/Vite.**
  Pros: FastAPI has solid native WebSocket support; strong Python ecosystem. Cons: two projects (back and front) to coordinate, two deployments, two lockfiles, two CI pipelines. For an MVP with a few months horizon, the overhead is disproportionate. **Rejected.**

- **Go + Gorilla WebSocket + vanilla HTML/JS frontend.**
  Pros: highly performant backend, single binary, trivial deployment. Cons: much poorer UI ergonomics without a modern framework; we lose shared client↔server types; team without documented Go expertise for this project. **Rejected** — performance is not the bottleneck of this product (10 connections per room).

- **Pure Next.js with Server-Sent Events (SSE) or polling instead of WebSocket.**
  Pros: runs on Vercel serverless without a custom server. Cons: SSE is unidirectional; polling has higher latency and more server load. WebSocket is the natural fit (bidirectional events, low latency). **Rejected.**

- **Next.js + third-party real-time provider (Ably, Pusher, Liveblocks, Supabase Realtime).**
  Pros: zero WebSocket infrastructure; auto-scales. Cons: paid external dependency, data leaves the internal perimeter, vendor lock-in. For the explicit "internal tool" requirement, it contradicts the product's motivation. **Rejected.**

- **NestJS + Socket.IO + separate Next.js frontend.**
  Pros: more opinionated structure on the backend. Cons: two projects again; the "structure" win doesn't pay for itself in a server with ~5 socket handlers. **Rejected.**

## Consequences

### Positive
- A single repository, a single `package.json`, a single production process — operationally simple.
- Shared TypeScript event types eliminate broken contracts between client and server.
- Socket.IO ships automatic reconnection, native rooms, and long-polling fallback at no extra code (mitigates the risk of corporate proxies hostile to raw WebSocket).
- Next.js App Router covers routing, SSR, and asset build — we don't have to assemble Vite + Express + router + others.

### Negative (accepted costs)
- **We will not run on serverless runtimes (Vercel Functions, Lambda).** Deployment requires a VM/container with a persistent process. Accepted for the MVP.
- **Single point of failure.** Restarting the process drops every active room. Mitigated by the "ephemeral rooms" design; users expect to reopen.
- **Does not scale horizontally as-is.** For more than 1 replica we would need sticky sessions + Socket.IO's Redis adapter. Out of scope for the MVP — to be revisited when real demand appears.
- **Hot reload of Next.js + Socket.IO under a custom server is less smooth** than plain Next dev. Document in the README how to run.

### Neutral
- The team learns the "Next.js + custom server" pattern — useful for other real-time cases later on.
- Modern Node lockfile (npm/pnpm) — which manager to choose is a setup task, not an architectural decision.

## Constitution adherence

- **Principle 5 (ADR for architectural decisions):** this ADR records the choice before implementation. ✓
- **Principle 7 (atomic changes):** the chosen stack favors small PRs — no jumping between repos.
- **Principle 8 (fail visibly):** Socket.IO emits `connect_error` / `disconnect` events that will be logged per ADR 0002.
- **Tension with Principle 8 in the long term:** in-memory state + single process means a node failure is a total failure. Consciously accepted for the MVP; will be superseded by another ADR the moment a HA requirement appears.

## Future review

Revisit this ADR when:
- A high availability requirement appears (>1 replica) or a need to persist round history.
- A Jira/Linear integration request changes the backend profile.
- More than one real-time feature lands in the repository (worth extracting a dedicated server).
- An organizational shift about internal Vercel/serverless use happens.

Clear review signal: going from "1 simultaneous room typical" to "tens in parallel" without degradation — at that point Redis adapter and multiple replicas become a requirement.
