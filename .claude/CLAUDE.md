# Project Briefing

> **How to use this file:** the IADE agent reads this automatically on start. Fill in the sections marked with `[ ]`.

---

## Overview

**Project name:** Planning Poker

**One-line description:** Web app de Planning Poker em tempo real para estimativa colaborativa de times ágeis. Salas efêmeras, votos ocultos até o facilitador revelar.

**Current status:** in development (MVP completo — feature `planning-poker` implementada e validada por unit + protocol + E2E)

## Tech stack

- **Primary language:** TypeScript / Node.js 22
- **Framework:** Next.js 15 (App Router) + Socket.IO 4, num único processo Node (custom server). Frontend e backend no mesmo projeto.
- **Database:** nenhum — estado das salas vive em memória num `Map<roomId, RoomState>`. Decisão registrada em [ADR 0001](../docs/adr/0001-stack-choice.md).
- **Deployment:** VM/container Node (não-serverless por causa do WebSocket persistente). Não definido em produção ainda.

## Relevant folder structure

```text
.
├── .claude/                       IADE agent configuration
├── specs/                         SDD specs — source of truth
│   ├── constitution.md            principles (don't violate without ADR)
│   └── planning-poker/            spec, plan, tasks da feature implementada
├── docs/adr/                      Architecture Decision Records
│   ├── 0001-stack-choice.md       Next.js + Socket.IO em processo Node único
│   └── 0002-logging-strategy.md   Pino, sem PII em info
├── src/
│   ├── lib/                       puro, sem I/O: scales, stats, events (tipos)
│   ├── server/
│   │   ├── index.ts               custom server: Next + Socket.IO + tick interval
│   │   ├── logger.ts              wrapper Pino (ADR 0002)
│   │   ├── rooms/                 room state machine + store + singleton
│   │   └── socket/handlers.ts     mapeia eventos socket ↔ store
│   ├── app/                       Next.js App Router
│   │   ├── page.tsx               Home (Client)
│   │   ├── api/rooms/route.ts     POST cria sala
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

- ESLint flat config com `next/core-web-vitals` + `next/typescript` + `no-console: error` (override `off` em `*.test.*`). Veja `eslint.config.mjs`.
- Prettier (printWidth 100, trailingComma all). `specs/`, `docs/`, `.claude/` ignorados (formato hand-tuned).
- Vitest para unit + protocol; `// @vitest-environment jsdom` por arquivo nos `.test.tsx`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, escopo `(planning-poker)` quando aplicável).
- Tudo TypeScript estrito (`tsc --noEmit` no CI mental — rodar `npm run typecheck`).
- Comentários só quando o "porquê" não é óbvio. Naming carrega o "o quê".

## Critical integrations

Nenhuma — o app é self-contained. Sem banco, sem auth, sem APIs externas em runtime.

## How the agent should work

- **Current autonomy mode:** HIC (every code change requires explicit human approval before commit).
- **Change size:** prefer small, atomic changes. No sweeping refactors without an ADR.
- **Comments:** only when the *why* is not obvious from the code.
- **Tests:** changing code that affects behavior without changing/adding tests is forbidden.
- **Logging:** follow the convention defined in `docs/adr/0002-logging-strategy.md` (create one if missing).

## Available skills

See `.claude/skills/`:
- `spec-writer` — write SDD specs
- `code-reviewer` — review the current diff
- `adr-writer` — record architectural decisions
- `test-generator` — generate tests from a spec

## Contacts and governance

- **Maintainers:** José Menezes (<jcarlos78@gmail.com>)
- **Review channel:** GitHub PR
- **Human-response SLA:** sem SLA formal — projeto pessoal/educacional
