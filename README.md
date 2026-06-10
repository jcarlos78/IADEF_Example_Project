# Planning Poker

Estimativa colaborativa em tempo real para times ágeis. Várias pessoas entram numa mesma sala, votam em itens de backlog com cartas ocultas e veem o resultado consolidado quando o facilitador revelar.

Stack: **Next.js 15** (App Router) + **Socket.IO** num **único processo Node** (custom server). Estado em memória, salas efêmeras. Sem banco, sem auth.

> **Documentação:** spec, plan, tasks em [specs/planning-poker/](specs/planning-poker/). Decisões arquiteturais em [docs/adr/](docs/adr/).

## Quick start

```bash
npm install                 # instala deps Node
npm run e2e:install         # baixa Chromium para Playwright (apenas para E2E)

npm run dev                 # http://localhost:3000 (tsx watch + Next dev)
npm run build && npm run start   # produção
```

Abra a home, escolha uma escala, crie a sala. Compartilhe a URL `/room/<id>` com o time.

## Scripts

| Script                            | O que faz                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`                     | Custom server com hot reload (`tsx watch src/server/index.ts`) em `NODE_ENV=development` |
| `npm run build`                   | `next build`                                                                             |
| `npm run start`                   | Produção: `tsx src/server/index.ts` em `NODE_ENV=production`                             |
| `npm run typecheck`               | `tsc --noEmit`                                                                           |
| `npm run lint`                    | ESLint flat config (Next + TS + `no-console`)                                            |
| `npm run format` / `format:check` | Prettier                                                                                 |
| `npm test`                        | Vitest (unit + protocolo socket.io) — **140 testes**                                     |
| `npm run e2e`                     | Playwright Chromium contra build de produção — **11 testes**                             |

## Variáveis de ambiente

| Var                | Default                      | Função                                                                   |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------ |
| `PORT`             | `3000`                       | porta HTTP/WebSocket do servidor                                         |
| `NODE_ENV`         | `development`                | `production` desabilita pretty logs                                      |
| `LOG_LEVEL`        | `debug` (dev), `info` (prod) | nível do Pino                                                            |
| `HOST_GRACE_MS`    | `30000`                      | grace period para promover novo facilitador após host desconectar (AC10) |
| `TICK_INTERVAL_MS` | `5000`                       | frequência da varrida de TTL + transferência de host                     |
| `ROOM_TTL_MS`      | `600000`                     | sala sem atividade é descartada após esse tempo (AC9)                    |

Exemplo em `.env.example`.

## Como funciona

- **Home (`/`)** — formulário cria sala via `POST /api/rooms`. O server gera `roomId` (8 chars base36) + `hostSessionId` (UUID), seta cookies HttpOnly `pp_session_<roomId>` e `pp_nickname_<roomId>`, redireciona para `/room/<roomId>`.
- **Sala (`/room/[id]`)** — Server Component lê os cookies e hidrata o `RoomClient`. Cliente conecta Socket.IO, faz `room:join` automaticamente se já tem identidade (cookie ou localStorage), senão mostra `NicknameDialog`.
- **Tempo real** — toda mudança de estado é broadcastada como `room:state` para os sockets da sala. Voto é **só estado local do cliente** até o facilitador clicar "Revelar"; o servidor sanitiza via `toPublic()` antes de enviar.
- **Identidade** — host via cookie HttpOnly (server pode ler em SSR). Guest gera UUID client-side e persiste em `localStorage` por sala para sobreviver a reload sem virar duplicata.

## Mapping AC → testes

| AC   | Comportamento                 | Onde é testado                                                                            |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| AC1  | Criar sala com URL única      | `room.test.ts`, `handlers.test.ts`, E2E create-and-join                                   |
| AC2  | Entrar via URL com apelido    | `handlers.test.ts`, E2E create-and-join                                                   |
| AC3  | Voto oculto até revelar       | `room.test.ts` (toPublic), `handlers.test.ts` (JSON serializável), E2E vote-and-reveal    |
| AC4  | Reveal broadcast < 1s         | E2E vote-and-reveal (mede `Date.now()`)                                                   |
| AC5  | Média/min/max                 | `stats.test.ts`, `Results.test.tsx`, E2E vote-and-reveal                                  |
| AC6  | Nova rodada reseta            | `room.test.ts`, E2E vote-and-reveal                                                       |
| AC7  | Escalas + troca entre rodadas | `scales.test.ts`, `room.test.ts`, `RoundControls.test.tsx`, E2E scale-switch              |
| AC8  | Apelido vazio/duplicado       | `room.test.ts`, `CreateRoomForm.test.tsx`, `NicknameDialog.test.tsx`, E2E create-and-join |
| AC9  | Sala efêmera após 10 min      | `store.test.ts`, `handlers.test.ts` (tick)                                                |
| AC10 | Handoff de facilitador        | `room.test.ts` (fake timers), E2E facilitator-handoff                                     |
| AC11 | Sala inexistente              | `handlers.test.ts`, `RoomErrorView.test.tsx`, E2E create-and-join                         |
| AC12 | Entrada/saída em tempo real   | `handlers.test.ts`, `ParticipantList.test.tsx`, E2E vote-and-reveal                       |

## Limitações conhecidas (out of scope no MVP)

- **Sem persistência.** Reiniciar o processo derruba todas as salas. Documentado em [docs/adr/0001-stack-choice.md](docs/adr/0001-stack-choice.md).
- **Single replica.** Não escala horizontalmente sem mudar (precisaria Redis adapter do Socket.IO + sticky sessions). Decisão de MVP.
- **Sem autenticação.** Qualquer pessoa com o link entra com qualquer apelido. Apelidos duplicados são bloqueados, mas a sala em si é pública.
- **UI funcional, sem CSS.** Marcação semântica e acessível (roles ARIA), mas sem polimento visual. Estilização ficou fora do escopo do MVP.
- **Sem export.** Resultado da rodada não é exportável (CSV, JSON, Jira).
- **Sem chat ou timer.**
- **Português apenas.** Sem i18n.

Lista completa em [specs/planning-poker/spec.md](specs/planning-poker/spec.md) (seção "Out of scope").

## Arquitetura resumida

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

Camadas:

- `src/lib/` — **puro**, sem I/O: `scales`, `stats`, `events` (tipos).
- `src/server/rooms/` — **puro**: `room.ts` (state machine), `store.ts` (in-memory Map + TTL), `instance.ts` (singleton via `globalThis Symbol` — necessário porque Next bundle separa route handlers do custom server).
- `src/server/socket/handlers.ts` — adapta Socket.IO ↔ store, broadcasta `room:state`.
- `src/server/index.ts` — boot do Next + Socket.IO + `setInterval(tick)`.
- `src/app/` — Next.js: Home (Client), `/room/[id]` (Server + Client), `/api/rooms` (POST).
- `src/components/` — UI: `CreateRoomForm`, `NicknameDialog`, `ParticipantList`, `RoomErrorView`, `CardPicker`, `RoundControls`, `Results`.

## Constituição & SDD

Este projeto segue [specs/constitution.md](specs/constitution.md):

- **Princípio 1** — Spec antes do código: [specs/planning-poker/spec.md](specs/planning-poker/spec.md) escrito e aprovado antes de qualquer linha.
- **Princípio 2** — Tests trackeiam comportamento: cada AC tem ao menos um teste.
- **Princípio 3** — HIC: cada commit teve aprovação humana antes de ser feito.
- **Princípio 5** — ADRs para decisões arquiteturais: [0001-stack-choice](docs/adr/0001-stack-choice.md), [0002-logging-strategy](docs/adr/0002-logging-strategy.md).
- **Princípio 7** — Mudanças atômicas: 13 commits, um por task de [specs/planning-poker/tasks.md](specs/planning-poker/tasks.md).
- **Princípio 8** — Falha visível: erros nominais (`ErrorCode` em [events.ts](src/lib/events.ts)), logs Pino estruturados.

## Licença

[MIT](LICENSE).
