# Tasks: Planning Poker

> **Prerequisite:** `plan.md` aprovado em 2026-06-09.
>
> Decomposição em tasks atômicos (~30 min cada). Cada task tem critério de conclusão verificável.
> Em modo HIC: cada task = 1 commit; cada commit pede aprovação humana antes de ir.

---

## Task 1 — Setup do projeto Next.js + TypeScript

**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx` (placeholder), `README.md` (seção "como rodar")

**Description:**
Inicializar projeto Next.js 15 (App Router) com TypeScript no diretório raiz. Sem feature ainda — só o andaime. Configurar `.gitignore` para `node_modules/`, `.next/`, `coverage/`. Criar `.env.example` com `LOG_LEVEL=info` e `PORT=3000`. Página `/` exibe apenas "Planning Poker" para validar que o build sobe. Atualizar `README.md` com `npm install` / `npm run dev`.

**Done when:**
- [ ] `npm run dev` sobe em http://localhost:3000 e exibe a página placeholder
- [ ] `npm run build` completa sem erro
- [ ] `npx tsc --noEmit` passa
- [ ] `node_modules/` e `.next/` ignorados pelo git
- [ ] `README.md` documenta install + dev

**Estimate:** ~30 min

**Depends on:** —

---

## Task 2 — Tooling: ESLint, Prettier, Vitest

**Files:** `.eslintrc.json` (ou `eslint.config.mjs`), `.prettierrc`, `vitest.config.ts`, `package.json` (scripts), `src/lib/__sanity__.test.ts` (smoke test)

**Description:**
Configurar ESLint com regras Next + TypeScript + `no-console` ligado (ADR 0002). Prettier com defaults. Vitest com `jsdom` para o que tocar DOM e `node` default. Scripts: `npm run lint`, `npm run format`, `npm test`. Criar um teste sanity `expect(1+1).toBe(2)` para validar o pipeline.

**Done when:**
- [ ] `npm run lint` passa
- [ ] `npm test` roda o sanity test em verde
- [ ] `no-console` está ativo no ESLint (testar adicionando `console.log` e ver o erro)
- [ ] `npm run format -- --check` passa

**Estimate:** ~30 min

**Depends on:** Task 1

---

## Task 3 — Tipos compartilhados de eventos e escalas

**Files:** `src/lib/events.ts`, `src/lib/scales.ts`, `src/lib/scales.test.ts`

**Description:**
Definir tipos TS para eventos client↔server (`ClientToServerEvents`, `ServerToClientEvents`) — sem implementação ainda, só os contratos. Definir as 3 escalas como objetos `{ id, label, cards }`:
- `fibonacci`: `['0','1','2','3','5','8','13','21','?','☕']`
- `fibonacci-mod`: `['0','½','1','2','3','5','8','13','20','40','100','?','☕']`
- `tshirt`: `['XS','S','M','L','XL','XXL','?','☕']`

Função `getScale(id)` retorna a escala ou lança. Testes: validar shape de cada escala e que `getScale('inexistente')` lança.

**Done when:**
- [ ] `getScale` retorna escala correta para cada id
- [ ] `getScale('foo')` lança com mensagem clara
- [ ] `npm test` em verde
- [ ] AC7 (escalas pré-definidas) tem cobertura de teste

**Estimate:** ~30 min

**Depends on:** Task 2

---

## Task 4 — Função de estatísticas (média/min/max)

**Files:** `src/lib/stats.ts`, `src/lib/stats.test.ts`

**Description:**
Função `summarize(votes: string[])` retorna `{ average: number|null, min: number|null, max: number|null, counts: Record<string, number> }`. Ignora `?` e `☕` no cálculo numérico mas conta em `counts`. Trata `½` como `0.5`. Se todos os votos são não-numéricos, `average/min/max = null`.

Testes cobrem: votos só numéricos, mistura com `?`/`☕`, somente `?`, lista vazia, escala T-shirt (todos não-numéricos).

**Done when:**
- [ ] `npm test` em verde com pelo menos 5 casos
- [ ] AC5 (média/min/max) coberto

**Estimate:** ~30 min

**Depends on:** Task 3

---

## Task 5 — Máquina de estado da sala (modelo puro)

**Files:** `src/server/rooms/room.ts`, `src/server/rooms/room.test.ts`

**Description:**
Implementar `RoomState` como objeto + funções puras (sem I/O, sem socket). Operações:
- `createRoom(scaleId, hostSessionId)` → `RoomState`
- `joinRoom(state, sessionId, nickname)` → `RoomState | RoomError` (rejeita apelido vazio/duplicado)
- `leaveRoom(state, sessionId)` → `RoomState`
- `startRound(state, sessionId, title?)` → exige facilitador, exige sem rodada em andamento
- `castVote(state, sessionId, card)` → exige rodada aberta, exige card válida na escala
- `revealRound(state, sessionId)` → exige facilitador, fecha rodada e retorna resultado
- `resetRound(state, sessionId)` → exige facilitador
- `changeScale(state, sessionId, scaleId)` → exige facilitador + sem rodada
- `transferHostIfNeeded(state, gracePeriodMs)` → se host saiu há > graceMs, promove o participante mais antigo

Testes: cobrir TODOS os ACs deste módulo (AC1, AC3, AC6, AC7, AC8, AC10). Mock de tempo via `vi.useFakeTimers`.

**Done when:**
- [ ] Mínimo 12 testes (um por transição válida + casos de erro)
- [ ] Transferência de host coberta com fake timers
- [ ] `npm test` verde
- [ ] Nenhuma função importa de `socket.io` ou de `next` — puro

**Estimate:** ~30 min × 2 (dividir em 5a-modelo e 5b-testes se precisar; manter um único commit "Task 5")

**Depends on:** Task 4

---

## Task 6 — Store in-memory com TTL cleanup

**Files:** `src/server/rooms/store.ts`, `src/server/rooms/store.test.ts`

**Description:**
`RoomStore` encapsula `Map<roomId, RoomState>` + `lastActivityAt: Map<roomId, number>`. API: `create`, `get`, `update`, `delete`. Método `cleanupStale(ttlMs, now)` remove salas sem atividade há mais que TTL. Um único `setInterval` no app chama `cleanupStale(10*60*1000, Date.now())` — mas o interval fica fora do store (testabilidade).

Testes com fake timers: cria sala, adianta tempo > 10min, chama cleanup, sala foi removida. AC9.

**Done when:**
- [ ] `cleanupStale` remove apenas salas inativas
- [ ] Atividade renovada (ex.: novo voto) impede limpeza
- [ ] AC9 coberto
- [ ] `npm test` verde

**Estimate:** ~30 min

**Depends on:** Task 5

---

## Task 7 — Logger wrapper (Pino)

**Files:** `src/server/logger.ts`, `package.json` (deps: `pino`, `pino-pretty`)

**Description:**
Wrapper único exporta `logger`. Em `NODE_ENV=production` → JSON; em dev → `pino-pretty`. Nível controlado por `LOG_LEVEL`. Convenção da ADR 0002.

Sem testes unitários (é wrapper trivial). Verificação manual: importar e chamar `logger.info({ event: 'test' }, 'hello')`.

**Done when:**
- [ ] `logger` exportado e tipado
- [ ] `LOG_LEVEL=debug` mostra debug; `LOG_LEVEL=info` não mostra
- [ ] Pretty-print em dev, JSON em prod (verificar com `NODE_ENV=production node -e "..."`)

**Estimate:** ~20 min

**Depends on:** Task 2

---

## Task 8 — Custom server + Socket.IO handlers

**Files:** `src/server/index.ts`, `src/server/socket/handlers.ts`, `src/server/socket/handlers.test.ts`, `package.json` (deps: `socket.io`, `socket.io-client` dev)

**Description:**
Custom HTTP server que sobe Next.js e anexa Socket.IO. Handlers mapeiam eventos socket → operações do store:
- `room:create` → cria, devolve `{ roomId, hostSessionId }`
- `room:join` → entra com `{ roomId, sessionId, nickname }`; devolve estado ou erro
- `round:start`, `round:vote`, `round:reveal`, `round:reset`, `room:changeScale`
- Server emite `room:state` (broadcast) a cada mudança
- Logs em pontos-chave conforme ADR 0002

Testes de protocolo: sobe socket.io server in-process, conecta 2-3 clientes via `socket.io-client`, valida fluxos. Cobre AC3 (voto não vaza), AC4 (revelar chega a todos), AC10 (host handoff), AC11 (sala inexistente), AC12 (entrada/saída broadcast).

**Done when:**
- [ ] `npm run dev` sobe Next + Socket.IO no mesmo processo
- [ ] Pelo menos 6 testes de protocolo verdes
- [ ] Voto não aparece no payload de outros clientes antes de `round:reveal`
- [ ] Errors retornam payload `{ error: 'code', message: '...' }` (Princípio 8)

**Estimate:** ~30 min × 2 (handlers + testes)

**Depends on:** Task 6, Task 7

---

## Task 9 — UI: Home (criar sala)

**Files:** `src/app/page.tsx`, `src/components/CreateRoomForm.tsx`, `src/components/CreateRoomForm.test.tsx`

**Description:**
Página `/` com formulário: select de escala (3 opções), botão "Criar sala". Submit chama endpoint `/api/rooms` (ou direto socket — definir no task; preferência: HTTP POST via Next route handler que delega ao store, então `redirect` para `/room/[id]`). Sessão do host marcada via cookie `pp_session` (HttpOnly + SameSite=Lax, valor = uuid).

Teste com Vitest + Testing Library: renderiza, submit chama mock e redireciona.

**Done when:**
- [ ] Home renderiza e cria sala com escala selecionada
- [ ] Redireciona para `/room/[id]`
- [ ] Cookie `pp_session` setado
- [ ] AC1 coberto

**Estimate:** ~30 min

**Depends on:** Task 8

---

## Task 10 — UI: Sala (entrada de apelido + lista de participantes)

**Files:** `src/app/room/[id]/page.tsx`, `src/app/room/[id]/RoomClient.tsx`, `src/components/NicknameDialog.tsx`, `src/components/ParticipantList.tsx` + testes

**Description:**
Página `/room/[id]` é Server Component que renderiza `RoomClient` (Client Component). RoomClient: ao montar, conecta socket; se sem nickname em estado local, mostra `NicknameDialog`. Após entrar, mostra lista de participantes (atualiza via `room:state`). Tratar erros: sala inexistente → tela com link "criar nova sala" (AC11).

Testes: NicknameDialog rejeita vazio; ParticipantList renderiza N participantes; erro de sala mostra CTA.

**Done when:**
- [ ] AC2 (entrar com apelido), AC8 (apelido vazio/duplicado), AC11 (sala inexistente), AC12 (lista em tempo real) cobertos
- [ ] Reconexão socket.io automática preservada

**Estimate:** ~30 min × 2

**Depends on:** Task 9

---

## Task 11 — UI: Card picker + controles do facilitador + resultados

**Files:** `src/components/CardPicker.tsx`, `src/components/RoundControls.tsx`, `src/components/Results.tsx` + testes

**Description:**
- `CardPicker`: renderiza cards da escala atual; clique emite `round:vote`. Card selecionada destacada localmente.
- `RoundControls`: visível só se `isHost`. Botão "Iniciar rodada" (com input opcional de título), "Revelar", "Nova rodada", select de escala (desabilitado durante rodada).
- `Results`: após reveal, mostra todos os votos + média/min/max (de `summarize`).

Antes de reveal, outros participantes veem apenas "fulano já votou" (sem o valor) — AC3.

**Done when:**
- [ ] AC3, AC4, AC5, AC6, AC7 cobertos com teste de componente
- [ ] Voto local destacado, mas não vaza para outros

**Estimate:** ~30 min × 2

**Depends on:** Task 10

---

## Task 12 — E2E Playwright (multi-browser)

**Files:** `playwright.config.ts`, `tests/e2e/create-and-join.spec.ts`, `tests/e2e/vote-and-reveal.spec.ts`, `tests/e2e/facilitator-handoff.spec.ts`, `tests/e2e/scale-switch.spec.ts`

**Description:**
Playwright com 2-3 contextos de browser concorrentes na mesma sala. Specs:
- `create-and-join`: AC1, AC2, AC8, AC11
- `vote-and-reveal`: AC3, AC4 (timeout < 1s), AC5, AC6, AC12
- `facilitator-handoff`: AC10 (fecha aba do host, espera 30s simulado, vê transferência)
- `scale-switch`: AC7

Roda contra `npm run dev` (Playwright `webServer`). Usar `expect.poll` para asserções de tempo real.

**Done when:**
- [ ] `npm run e2e` verde local
- [ ] Cada AC tem ao menos 1 teste E2E mapeado no traceability
- [ ] Sem `sleep` fixo nos specs

**Estimate:** ~30 min × 3

**Depends on:** Task 11

---

## Task 13 — Polimento, README, smoke manual

**Files:** `README.md`, eventual ajuste fino de UI

**Description:**
README final com: descrição, screenshot opcional, como rodar (dev / build / e2e), variáveis de ambiente, limitações conhecidas (single replica, sem persistência). Smoke manual: 3 abas em browsers diferentes, rodada completa, sem warning no console. Atualizar `.claude/CLAUDE.md` preenchendo as seções `[PROJECT NAME]`, tech stack, etc.

**Done when:**
- [ ] README completo
- [ ] Smoke manual passou (registrar no PR final)
- [ ] `.claude/CLAUDE.md` preenchido
- [ ] DoD do `plan.md` 100% checado

**Estimate:** ~30 min

**Depends on:** Task 12

---

## Traceability

| AC do spec | Task(s) | Status |
|---|---|---|
| AC1 — criar sala c/ URL única | Task 5, Task 8, Task 9, Task 12 (create-and-join) | pending |
| AC2 — entrar via URL c/ apelido | Task 8, Task 10, Task 12 (create-and-join) | pending |
| AC3 — voto oculto até revelar | Task 5, Task 8, Task 11, Task 12 (vote-and-reveal) | pending |
| AC4 — revelar broadcast < 1s | Task 8, Task 11, Task 12 (vote-and-reveal) | pending |
| AC5 — média/min/max | Task 4, Task 11, Task 12 (vote-and-reveal) | pending |
| AC6 — nova rodada reseta | Task 5, Task 8, Task 11, Task 12 (vote-and-reveal) | pending |
| AC7 — escalas (incl. troca entre rodadas) | Task 3, Task 5, Task 11, Task 12 (scale-switch) | pending |
| AC8 — apelido vazio/duplicado | Task 5, Task 10, Task 12 (create-and-join) | pending |
| AC9 — sala expira após 10min | Task 6 | pending |
| AC10 — handoff de facilitador | Task 5, Task 8, Task 12 (facilitator-handoff) | pending |
| AC11 — sala inexistente | Task 8, Task 10, Task 12 (create-and-join) | pending |
| AC12 — entrada/saída em tempo real | Task 8, Task 10, Task 12 (vote-and-reveal) | pending |

> Atualizar status conforme cada task for completado.
