# Plan: Planning Poker

> **Prerequisite:** `spec.md` aprovado em 2026-06-09.

## Architectural decisions

Cada decisão abaixo tem implicação de longo prazo e gera ADR.

- **D1 — Stack: Node.js + Next.js (App Router) + socket.io para WebSocket.** [ADR 0001 — required]
- **D2 — Estratégia de logging: Pino estruturado, níveis info/warn/error, sem PII.** [ADR 0002 — required, referenciado pelo CLAUDE.md]
- **D3 — Estado das salas in-memory num único processo Node.** Sem Redis, sem cluster. Documentado dentro de ADR 0001 como consequência negativa aceita do MVP single-replica.
- **D4 — Identidade do facilitador via token de sessão (HttpOnly cookie ou token em memória do cliente devolvido na criação da sala),** não pelo apelido. Detalhe técnico, sem ADR próprio — pertence à seção "modelo de sala" abaixo.
- **D5 — Front e back no mesmo projeto Next.js (custom server), TypeScript em tudo.** Decorre de D1 — sem ADR adicional.

## Affected components

Layout de implementação proposto (sem código ainda; nomes definitivos podem mudar nos tasks):

```
src/
├── server/
│   ├── index.ts                custom HTTP server (Next + Socket.IO)
│   ├── rooms/
│   │   ├── store.ts            in-memory Map<roomId, RoomState> + TTL cleanup
│   │   ├── room.ts             RoomState, transições (start round, vote, reveal, reset)
│   │   └── room.test.ts        unit tests da máquina de estado
│   ├── socket/
│   │   ├── handlers.ts         eventos socket.io ↔ store
│   │   └── handlers.test.ts    testes de protocolo (com socket.io-client em memória)
│   └── logger.ts               wrapper Pino (config conforme ADR 0002)
├── lib/
│   ├── scales.ts               escalas Fibonacci / Fibonacci-mod / T-shirt
│   ├── stats.ts                média/min/max ignorando ?, ☕
│   ├── events.ts               tipos compartilhados client ↔ server
│   └── stats.test.ts           unit tests do agregador
├── app/
│   ├── page.tsx                home: criar sala (escolher escala) → redireciona p/ /room/[id]
│   ├── room/[id]/page.tsx      tela da sala (Server Component que monta o client)
│   └── room/[id]/RoomClient.tsx Client Component que conecta no socket
├── components/
│   ├── NicknameDialog.tsx
│   ├── CardPicker.tsx
│   ├── ParticipantList.tsx
│   ├── RoundControls.tsx       (visível só para o facilitador)
│   └── Results.tsx
└── styles/                     CSS modules ou Tailwind (decidido no task de setup)

tests/
├── e2e/                        Playwright (multi-browser) — fluxos críticos
│   ├── create-and-join.spec.ts          AC1, AC2, AC8, AC11
│   ├── vote-and-reveal.spec.ts          AC3, AC4, AC5, AC6
│   ├── facilitator-handoff.spec.ts      AC10
│   └── scale-switch.spec.ts             AC7
└── unit/                       (espelha src/, rodado por Vitest)

docs/adr/
├── 0001-stack-choice.md        Next.js + Socket.IO
└── 0002-logging-strategy.md    Pino

package.json, tsconfig.json, next.config.ts, vitest.config.ts, playwright.config.ts,
.env.example, .gitignore (ajustes para node_modules, .next, etc.)
```

Nada disso existe ainda — `src/` e `tests/` só têm `README.md` e `.gitkeep`. O primeiro task será **setup de projeto**.

## Implementation sequence

Cada item vira um task atômico em `tasks.md`. Ordem proposta — design para ser interrompível e revisável a cada PR/commit.

1. **Setup do projeto Next.js + TypeScript + tooling** (lint, format, vitest, playwright). Sem feature ainda — só andaime.
2. **ADRs 0001 e 0002 commitadas** se ainda não estiverem. (Provavelmente entram junto com o plan, antes de qualquer código.)
3. **Tipos compartilhados e escalas** em `src/lib/` (scales, events, stats) + **testes unitários de `stats`** (AC5 — média/min/max). Sem WebSocket ainda.
4. **Modelo de sala (state machine)** em `src/server/rooms/` com testes unitários cobrindo: criar sala, entrar com apelido válido/duplicado/vazio, iniciar rodada, votar, revelar, reset, trocar escala entre rodadas, transferência de facilitador. (AC1, AC3, AC6, AC7, AC8, AC10).
5. **Custom server + integração socket.io** com handlers de eventos mapeando para o modelo. Inclui TTL cleanup para AC9 (sala efêmera). Testes de protocolo com socket.io-client.
6. **UI da home** — formulário "criar sala" + escolha de escala (AC1).
7. **UI da sala** — entrada de apelido (AC2, AC8), lista de participantes (AC12), card picker (AC3), controles do facilitador (AC4, AC6, AC7), resultados (AC5).
8. **Tratamento de erros de cliente** — sala inexistente/expirada (AC11), desconexão, reconexão simples.
9. **Testes E2E Playwright** cobrindo os ACs com 2+ navegadores simultâneos.
10. **Polimento + docs** — README com instruções de dev/start, `.env.example`, screenshot opcional.

Cada passo é um commit (ou par commit "código + teste") — sem misturar feature com refactor.

## Testing strategy

- **Unit tests (Vitest)** — `src/lib/stats.ts`, `src/lib/scales.ts`, e principalmente a máquina de estado `src/server/rooms/room.ts`. Devem ser determinísticos e rápidos (< 1s no total).
- **Protocol tests (Vitest + socket.io-client)** — sobem um socket.io server in-process, simulam N clientes, validam que eventos batem com o modelo. Cobre as transições críticas (revelar entrega para todos, voto não vaza antes de revelar).
- **E2E (Playwright)** — abre 2–3 contextos de browser apontando para a mesma sala e verifica os fluxos de tempo real. Roda contra o servidor real (`next dev` ou build de produção). Cobre os ACs que envolvem percepção temporal (AC4 com timeout < 1s).
- **Manual smoke** antes de declarar pronto: rodar localmente, abrir 3 abas em browsers diferentes, jogar uma rodada de cabo a rabo. Validação humana exigida por HIC.

Coverage não é meta numérica — cada AC do spec precisa ter pelo menos um teste mapeado (rastreabilidade `AC# → teste`), e isso será verificado no fim via uma tabela no README ou em comentário do PR final.

## Implementation risks

Riscos **técnicos** (riscos de produto ficaram no spec):

- **R1 — Custom server Next.js + Socket.IO tem fricção com hot reload e com deploy em Vercel.** Mitigação: documentar que o deploy é em VM/container (não serverless), e isolar o entry point do servidor para que `next dev` funcione separadamente quando possível.
- **R2 — TTL cleanup de salas (AC9) pode vazar timers ou descartar salas com participante "zumbi".** Mitigação: usar timestamps em vez de `setTimeout` por sala — um único interval varre o Map. Testar com mock de tempo.
- **R3 — Reconexão de cliente após queda de rede curta pode duplicar participante ou perder a identidade de facilitador.** Mitigação: sessionId em cookie/localStorage; ao reconectar, reanexar à sala usando sessionId; teste E2E específico para reconexão.
- **R4 — Race na transferência de facilitador (AC10): se vários participantes detectam ausência ao mesmo tempo, todos podem tentar assumir.** Mitigação: só o servidor decide; cliente nunca propõe sucessão. Estado é central, não distribuído.
- **R5 — Playwright multi-browser flaky em CI.** Mitigação: usar `expect.poll` para assertions de tempo real, evitar `sleep`; rodar localmente primeiro.

## Definition of Done

- [ ] Todos os testes derivados do spec passam (unit + protocol + E2E).
- [ ] Cada AC tem pelo menos um teste mapeado.
- [ ] Code review aprovado (skill `code-reviewer` + revisão humana).
- [ ] ADRs 0001 e 0002 commitadas e referenciadas no README.
- [ ] README do projeto atualizado com como rodar (`npm run dev`, `npm test`, `npm run e2e`).
- [ ] `.env.example` presente; nenhum segredo no diff.
- [ ] Smoke manual: 3 abas, rodada completa, sem erro em console nem warning de React.
- [ ] Princípios da constituição respeitados (spec antes, testes pareados, ADRs, atômico, sem segredos, falhas visíveis).
