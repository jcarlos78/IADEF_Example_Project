# ADR 0002 — Logging estruturado com Pino

- **Status:** accepted
- **Date:** 2026-06-09
- **Decision-makers:** José Menezes

## Context

O `.claude/CLAUDE.md` referencia explicitamente este ADR ("Logging: follow the convention defined in `docs/adr/0002-logging-strategy.md` (create one if missing)"). O Princípio 8 da constituição exige falha visível: erros operacionais não podem ser silenciados, devem ser logados em nível apropriado e propagar quando útil.

O primeiro feature do projeto (planning poker) tem servidor Node + Socket.IO, onde precisamos rastrear:
- conexões e desconexões de WebSocket,
- transições de estado de sala (criada, votação iniciada, revelada, descartada por TTL),
- erros de protocolo (evento desconhecido, voto fora de rodada, apelido duplicado).

Não há logging existente para preservar; partimos do zero.

## Decision

Adotaremos **Pino** como biblioteca de logging do backend Node, em formato **JSON estruturado**, com a convenção abaixo aplicável a todo o projeto:

- **Níveis** usados: `trace` (dev only), `debug` (dev + opt-in em prod), `info` (eventos de negócio relevantes), `warn` (situações esperadas mas anormais — apelido duplicado, sala não encontrada), `error` (falha que escapou do handler — exceção não tratada, bug).
- **Nível padrão em prod:** `info`. Em dev: `debug`. Controlado por env var `LOG_LEVEL`.
- **Formato:** JSON em produção (`{level, time, msg, ...context}`), pretty-print (`pino-pretty`) em desenvolvimento — alternado por `NODE_ENV`.
- **Campos obrigatórios em todo log de evento de negócio:** `roomId` (quando aplicável), `event` (nome do evento, ex.: `room.created`, `vote.cast`, `round.revealed`).
- **Sem PII no log.** Apelidos de participantes são aceitáveis (são pseudônimos efêmeros), mas qualquer dado vindo de eventual login (IP em texto claro, email) **nunca** vai a log de info — só em casos de error, com truncamento.
- **Sem `console.log` no código de produção.** Lints (ESLint `no-console`) garantem.
- **Wrapper único** em `src/server/logger.ts` exportando uma instância de logger. Outros módulos importam dali — não instanciam Pino direto.
- **Frontend:** `console.error` é aceitável para erros locais do browser. Não há agregação de logs do cliente no MVP (sem Sentry, sem LogRocket).

Exemplo:

```ts
import { logger } from "@/server/logger";
logger.info({ event: "room.created", roomId, scale }, "room created");
logger.warn({ event: "join.rejected", roomId, reason: "duplicate-nickname" }, "join rejected");
logger.error({ event: "socket.unhandled", err }, "uncaught socket handler error");
```

## Alternatives considered

- **`console.log`/`console.error` cru.**
  Prós: zero dependência. Contras: sem níveis, sem formato estruturado, agrupamento manual em produção. Princípio 8 fica mal coberto. **Rejeitado.**

- **Winston.**
  Prós: muito popular. Contras: API mais barroca, performance pior, formatos JSON menos limpos out-of-the-box. Não há ganho sobre Pino para este projeto. **Rejeitado.**

- **Bunyan.**
  Prós: também estruturado, JSON nativo. Contras: manutenção menos ativa que Pino nos últimos anos. **Rejeitado.**

- **OpenTelemetry desde o dia 1.**
  Prós: padrão de observabilidade moderno. Contras: peso desproporcional para um MVP single-process sem requisito atual de tracing distribuído. **Adiado** — pode ser sobreposto a Pino quando necessário (via instrumentação automática).

## Consequences

### Positive
- Logs JSON são parseáveis por qualquer agregador (ELK, Loki, CloudWatch, etc.) sem regex.
- Pino é rápido — quase nenhum overhead no hot path do WebSocket.
- Um único wrapper centralizado evita variações de estilo entre módulos.
- Regra "sem PII em info" reduz risco de incidente de privacidade desde o início.

### Negative (accepted costs)
- Em dev, JSON sem `pino-pretty` é ilegível. Aceita-se a dependência dev de `pino-pretty`.
- `no-console` no ESLint pode pegar `console.log` legítimos em scripts de migração / debug rápido — vamos liberar via `// eslint-disable-next-line` pontual quando justificado.
- Frontend sem agregação significa que erros de browser ficam invisíveis para o time. Aceita no MVP; revisitar quando houver usuários reais.

### Neutral
- A convenção `event: 'noun.verb'` é leve mas exige disciplina nos PRs — o `code-reviewer` skill deve verificar.

## Constitution adherence

- **Princípio 8 (falha visível):** logger estruturado + regra explícita de não-silenciamento + `no-console` no lint cobrem o princípio.
- **Princípio 6 (sem segredos):** a regra "sem PII em info" mais o checklist de revisão protegem contra vazamento via log.
- **Princípio 5 (ADR para decisões):** esta ADR registra a convenção. ✓

## Future review

Revisitar quando:
- Houver mais de uma réplica em produção (precisaremos correlation IDs, talvez tracing).
- Houver requisito de retenção/auditoria com prazo (LGPD, ISO) — pode mudar o que pode ou não ir a log.
- Aparecer pedido para agregar logs de frontend (Sentry ou similar) — nova ADR específica.
