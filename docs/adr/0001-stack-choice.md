# ADR 0001 — Stack: Next.js + Socket.IO em servidor Node único

- **Status:** accepted
- **Date:** 2026-06-09
- **Decision-makers:** José Menezes

## Context

O projeto entrega um web app de Planning Poker em tempo real para times ágeis internos (spec `specs/planning-poker/spec.md`). Os requisitos arquiteturais que dirigem a escolha de stack:

- **Tempo real bidirecional:** servidor empurra eventos (voto registrado, revelação, entrada/saída) para todos os clientes da sala, com latência sub-segundo (AC4 do spec).
- **Estado vivo no servidor:** salas são efêmeras, em memória. Não há banco no MVP.
- **MVP enxuto:** time pequeno, deploy interno, sem expectativa de >1 réplica no curto prazo.
- **Front + back em um repo:** evita orquestrar dois projetos para um MVP de poucos meses de horizonte.
- **TypeScript em tudo:** tipos compartilhados de eventos entre client e server eliminam uma classe inteira de bugs em protocolos WebSocket.

Não há decisões arquiteturais anteriores no repositório (`docs/adr/` está vazio). O `CLAUDE.md` deixou a seção *tech stack* em branco; esta ADR preenche essa lacuna para o feature em questão.

## Decision

Usaremos **Next.js 15+ (App Router) com TypeScript** como framework principal, rodando atrás de um **custom HTTP server Node.js** que integra **Socket.IO** para comunicação em tempo real. Todo o estado das salas vive **em memória num único processo Node**, sem Redis nem adapter de cluster no MVP.

Detalhes:
- **Frontend e backend no mesmo projeto Next.js.** Rotas HTTP via App Router; canal de tempo real via Socket.IO sobre o mesmo servidor HTTP.
- **Custom `server.ts`** chama `next({...}).prepare()` e anexa o servidor Socket.IO ao mesmo `http.Server`. Isso impede deploy em runtime serverless (Vercel default), mas é compatível com qualquer VM/container Node.
- **Tipos compartilhados** em `src/lib/events.ts` consumidos tanto no client quanto no server.
- **Testes** com Vitest (unit + protocolo) e Playwright (E2E multi-browser).

## Alternatives considered

- **Python + FastAPI + WebSocket nativo + React/Vite separado.**
  Prós: FastAPI tem WebSocket nativo bom; ecossistema Python forte. Contras: dois projetos (back e front) para coordenar, dois deploys, dois lockfiles, dois pipelines de CI. Para um MVP de poucos meses, é overhead desproporcional. **Rejeitado.**

- **Go + Gorilla WebSocket + frontend HTML/JS vanilla.**
  Prós: backend altamente performático, binário único, deploy trivial. Contras: ergonomia de UI bem mais pobre sem framework moderno; perdemos tipos compartilhados client↔server; equipe sem expertise Go documentada para este projeto. **Rejeitado** — performance não é o gargalo deste produto (10 conexões por sala).

- **Next.js puro com Server-Sent Events (SSE) ou polling em vez de WebSocket.**
  Prós: roda em Vercel serverless sem custom server. Contras: SSE é unidirecional; polling tem latência maior e mais carga de servidor. WebSocket é o ajuste natural para o caso (eventos bidirecionais, baixa latência). **Rejeitado.**

- **Next.js + provedor terceiro de tempo real (Ably, Pusher, Liveblocks, Supabase Realtime).**
  Prós: zero infra de WebSocket; escala automática. Contras: dependência externa paga, dados saem do perímetro interno, vendor lock-in. Para o requisito explícito de "ferramenta interna", contradiz a motivação do produto. **Rejeitado.**

- **NestJS + Socket.IO + frontend Next.js separado.**
  Prós: estrutura mais opinada no backend. Contras: dois projetos novamente; e o ganho de "estrutura" não compensa para um servidor que tem ~5 handlers de socket. **Rejeitado.**

## Consequences

### Positive
- Um único repositório, um único `package.json`, um único processo em produção — operação simples.
- Tipos TypeScript de eventos compartilhados eliminam contratos quebrados entre client e server.
- Socket.IO traz reconexão automática, rooms nativos e fallback para long-polling sem código extra (mitiga risco de proxies corporativos hostis a WebSocket bruto).
- Next.js App Router cobre roteamento, SSR e build de assets — não precisamos montar Vite + Express + roteador + outros.

### Negative (accepted costs)
- **Não rodaremos em runtime serverless (Vercel Functions, Lambda).** O deploy exige VM/container com processo persistente. Aceitamos para o MVP.
- **Single point of failure.** Reiniciar o processo derruba todas as salas ativas. Mitigado pelo design "salas efêmeras"; usuários esperam reabrir.
- **Não escala horizontalmente sem mudança.** Para >1 réplica precisaríamos sticky sessions + Redis adapter do Socket.IO. Fora de escopo do MVP — será revisitado quando houver demanda real.
- **Hot reload do Next.js + Socket.IO em custom server é menos suave** que Next dev puro. Documentar no README como rodar.

### Neutral
- O time aprende padrão "Next.js + custom server" — útil para outros casos de tempo real no futuro.
- Lockfile Node moderno (npm/pnpm) — a decisão de qual gerenciador fica para o task de setup, não é arquitetural.

## Constitution adherence

- **Princípio 5 (ADR para decisões arquiteturais):** esta ADR registra a escolha antes da implementação. ✓
- **Princípio 7 (mudanças atômicas):** stack escolhida facilita PRs pequenos — não há salto entre repos.
- **Princípio 8 (falha visível):** Socket.IO emite eventos `connect_error` / `disconnect` que serão logados conforme ADR 0002.
- **Tensão com Princípio 8 a longo prazo:** estado em memória + processo único significa que falha do nó é falha total. Aceita conscientemente para o MVP; superseded ADR no momento que houver requisito de HA.

## Future review

Revisitar esta ADR quando:
- Houver requisito de alta disponibilidade (>1 réplica) ou de persistência de histórico de rodadas.
- Aparecer pedido de integração com Jira/Linear que mude o perfil do backend.
- Houver mais de 1 feature em tempo real no repositório (vale extrair um servidor dedicado).
- Houver mudança organizacional sobre uso de Vercel/serverless interno.

Sinal claro de revisão: passar de "1 sala simultânea típica" para "dezenas em paralelo" sem queda — neste ponto Redis adapter e múltiplas réplicas viram requisito.
