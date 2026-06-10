# Project Briefing

> **How to use this file:** the IADE agent reads this automatically on start. It orients the agent on what this project is, how it operates, and what rules to respect.

---

## Overview

**Project name:** Planning Poker

**One-line description:** Real-time Planning Poker web app for collaborative estimation in agile teams. Ephemeral rooms, votes hidden until the facilitator reveals.

**Current status:** in development (MVP complete — the `planning-poker` feature is implemented and validated by unit + protocol + E2E tests). Published as the reference example for the [AIDEF framework](https://github.com/jcarlos78/IADEF).

## Tech stack

- **Primary language:** TypeScript / Node.js 22
- **Framework:** Next.js 15 (App Router) + Socket.IO 4, running in a single Node process (custom server). Frontend and backend live in the same project.
- **Database:** none — room state lives in memory inside a `Map<roomId, RoomState>`. Decision recorded in [ADR 0001](../docs/adr/0001-stack-choice.md).
- **Deployment:** Node VM/container (non-serverless because of the persistent WebSocket). Not defined in production yet.

## Relevant folder structure

```text
.
├── .claude/                       IADE agent configuration
├── specs/                         SDD specs — source of truth
│   ├── constitution.md            principles (do not violate without an ADR)
│   └── planning-poker/            spec, plan, tasks of the implemented feature
├── docs/adr/                      Architecture Decision Records
│   ├── 0001-stack-choice.md       Next.js + Socket.IO in a single Node process
│   ├── 0002-logging-strategy.md   Pino, no PII at info
│   └── 0003-css-strategy.md       CSS Modules + design tokens
├── src/
│   ├── lib/                       pure, no I/O: scales, stats, events (types)
│   ├── server/
│   │   ├── index.ts               custom server: Next + Socket.IO + tick interval
│   │   ├── logger.ts              Pino wrapper (ADR 0002)
│   │   ├── rooms/                 room state machine + store + singleton
│   │   └── socket/handlers.ts     maps socket events ↔ store
│   ├── app/                       Next.js App Router
│   │   ├── page.tsx               Home (Client)
│   │   ├── api/rooms/route.ts     POST creates a room
│   │   └── room/[id]/             Server Component + RoomClient
│   └── components/                CardPicker, RoundControls, Results, ...
└── tests/e2e/                     Playwright (Chromium)
```

## Mandatory operating principles

Before any code change, the agent MUST:

1. **Read the constitution** at `specs/constitution.md`.
2. **Check whether a spec exists** for the feature at `specs/<feature>/spec.md`.
3. **If no spec exists**, propose writing one using the `spec-writer` skill before coding.
4. **Follow the SDD flow**: spec → plan → tasks → implementation.

## Code conventions

- ESLint flat config with `next/core-web-vitals` + `next/typescript` + `no-console: error` (override `off` in `*.test.*`). See `eslint.config.mjs`.
- Prettier (printWidth 100, trailingComma all). `specs/`, `docs/`, `.claude/` are ignored (hand-tuned formatting).
- Vitest for unit + protocol; `// @vitest-environment jsdom` per file in `.test.tsx`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, scope `(planning-poker)` where applicable).
- Strict TypeScript everywhere (`tsc --noEmit` is the mental CI — run `npm run typecheck`).
- Comments only when the "why" is not obvious. Naming carries the "what".
- All documentation, code comments, and UI strings are written in English (the project is published as an open-source example).

## Critical integrations

None — the app is self-contained. No database, no auth, no external APIs at runtime.

## How the agent should work

- **Current autonomy mode:** HIC (every code change requires explicit human approval before commit).
- **Change size:** prefer small, atomic changes. No sweeping refactors without an ADR.
- **Comments:** only when the *why* is not obvious from the code.
- **Tests:** changing code that affects behavior without changing/adding tests is forbidden.
- **Logging:** follow the convention defined in `docs/adr/0002-logging-strategy.md`.

## Available skills

See `.claude/skills/`:
- `spec-writer` — write SDD specs
- `code-reviewer` — review the current diff
- `adr-writer` — record architectural decisions
- `test-generator` — generate tests from a spec

## Contacts and governance

- **Maintainers:** José Menezes (<jcarlos78@gmail.com>)
- **Review channel:** GitHub PR
- **Human-response SLA:** no formal SLA — personal/educational project
