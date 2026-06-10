# ADR 0002 — Structured logging with Pino

- **Status:** accepted
- **Date:** 2026-06-09
- **Decision-makers:** José Menezes

## Context

The `.claude/CLAUDE.md` explicitly references this ADR ("Logging: follow the convention defined in `docs/adr/0002-logging-strategy.md`"). Principle 8 of the constitution requires failures to be visible: operational errors cannot be silenced; they must be logged at the right level and propagated when useful.

The project's first feature (planning poker) has a Node + Socket.IO backend, where we need to track:
- WebSocket connects and disconnects,
- room state transitions (created, vote started, revealed, discarded by TTL),
- protocol errors (unknown event, vote outside a round, duplicate nickname).

There is no existing logging to preserve; we start from scratch.

## Decision

We will adopt **Pino** as the Node backend's logging library, in **structured JSON** format, with the convention below applicable to the whole project:

- **Levels** used: `trace` (dev only), `debug` (dev + opt-in in prod), `info` (relevant business events), `warn` (expected-but-abnormal situations — duplicate nickname, room not found), `error` (a failure that escaped the handler — uncaught exception, bug).
- **Default level in prod:** `info`. In dev: `debug`. Controlled by the `LOG_LEVEL` env var.
- **Format:** JSON in production (`{level, time, msg, ...context}`), pretty-print (`pino-pretty`) in development — switched by `NODE_ENV`.
- **Mandatory fields in every business-event log:** `roomId` (when applicable), `event` (event name, e.g. `room.created`, `vote.cast`, `round.revealed`).
- **No PII in logs.** Participant nicknames are acceptable (they are ephemeral pseudonyms), but any data coming from a hypothetical login (cleartext IP, email) **never** ends up in info logs — only in error cases, truncated.
- **No `console.log` in production code.** ESLint's `no-console` rule enforces this.
- **Single wrapper** in `src/server/logger.ts` exporting a logger instance. Other modules import from there — they never instantiate Pino directly.
- **Frontend:** `console.error` is acceptable for local browser errors. There is no client-log aggregation in the MVP (no Sentry, no LogRocket).

Example:

```ts
import { logger } from "@/server/logger";
logger.info({ event: "room.created", roomId, scale }, "room created");
logger.warn({ event: "join.rejected", roomId, reason: "duplicate-nickname" }, "join rejected");
logger.error({ event: "socket.unhandled", err }, "uncaught socket handler error");
```

## Alternatives considered

- **Raw `console.log`/`console.error`.**
  Pros: zero dependency. Cons: no levels, no structured format, manual aggregation in production. Principle 8 is poorly covered. **Rejected.**

- **Winston.**
  Pros: very popular. Cons: more baroque API, worse performance, less clean JSON formats out of the box. No gain over Pino for this project. **Rejected.**

- **Bunyan.**
  Pros: also structured, JSON-native. Cons: less actively maintained than Pino in recent years. **Rejected.**

- **OpenTelemetry from day 1.**
  Pros: modern observability standard. Cons: disproportionate weight for a single-process MVP with no current distributed tracing requirement. **Deferred** — can be layered on top of Pino when needed (via auto-instrumentation).

## Consequences

### Positive
- JSON logs are parseable by any aggregator (ELK, Loki, CloudWatch, etc.) without regex.
- Pino is fast — almost no overhead in the WebSocket hot path.
- A single centralized wrapper avoids stylistic drift between modules.
- The "no PII at info" rule reduces privacy-incident risk from day one.

### Negative (accepted costs)
- In dev, JSON without `pino-pretty` is illegible. We accept the dev dependency on `pino-pretty`.
- `no-console` in ESLint can flag legitimate `console.log` in migration / quick-debug scripts — we will whitelist with `// eslint-disable-next-line` ad hoc when justified.
- Frontend without aggregation means browser errors stay invisible to the team. Accepted in the MVP; revisit when real users land.

### Neutral
- The convention `event: 'noun.verb'` is lightweight but requires discipline in PRs — the `code-reviewer` skill should check it.

## Constitution adherence

- **Principle 8 (fail visibly):** a structured logger + the explicit no-silencing rule + `no-console` in lint cover the principle.
- **Principle 6 (no secrets):** the "no PII at info" rule plus the review checklist guard against leaking via logs.
- **Principle 5 (ADR for decisions):** this ADR records the convention. ✓

## Future review

Revisit when:
- More than one replica lands in production (we will need correlation IDs, perhaps tracing).
- A retention/audit requirement with a fixed term appears (LGPD, ISO) — it may change what can or cannot reach the logs.
- A request to aggregate frontend logs (Sentry or similar) shows up — a new dedicated ADR.
