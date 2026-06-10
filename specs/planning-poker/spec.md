# Spec: Planning Poker (real-time collaborative estimation)

> **Status:** implemented
> **Author:** José Menezes (com IADE agent)
> **Date:** 2026-06-09 (escrito) → 2026-06-10 (implementação completa)

## Context

Times ágeis usam Planning Poker para estimar histórias de forma colaborativa, evitando viés de ancoragem (todos revelam o voto ao mesmo tempo). Hoje o time não tem ferramenta interna para isso e depende de soluções terceirizadas (PlanningPokerOnline, Scrum Poker, etc.) que vivem fora do controle da organização: contas externas, dados em terceiros, indisponibilidades pontuais.

Este feature entrega um **web app** que permite várias pessoas, cada uma do seu computador, entrarem numa mesma sala virtual, votarem em itens de backlog em tempo real e verem o resultado consolidado quando o facilitador revelar os votos.

**Para quem:** times ágeis internos durante sessões de refinamento/sprint planning. Tamanho típico de sala: 3–12 pessoas.

## Expected behavior

O app expõe duas operações principais:

1. **Criar sala** — qualquer pessoa abre o site, escolhe uma escala de cartas, vira facilitadora dessa sala e recebe um link compartilhável.
2. **Entrar em sala** — pessoas abrem o link, digitam um apelido e passam a ver a sala em tempo real.

Dentro da sala:

- O facilitador inicia uma **rodada de votação** opcionalmente associada a um título (ex.: "US-123: login com Google").
- Cada participante escolhe uma carta da escala configurada. O voto fica visível para si próprio mas **oculto** para os demais (apenas indicação "fulano já votou").
- O facilitador clica **revelar**: todos os votos aparecem simultaneamente, junto com estatísticas básicas (média numérica ignorando `?` e `☕`, mínimo, máximo, contagem de cartas iguais).
- O facilitador pode **iniciar nova rodada**, descartando os votos anteriores.
- Saídas e entradas de participantes são refletidas em tempo real para todos.

Tudo é efêmero: a sala existe enquanto houver pelo menos uma pessoa conectada; após X minutos sem conexões, a sala é descartada.

### Use cases

1. **Caso principal — rodada completa de votação**
   - Given: uma sala existe com 4 participantes conectados e escala Fibonacci selecionada.
   - When: o facilitador inicia uma rodada com título "US-42", cada participante escolhe uma carta, e o facilitador clica em "revelar".
   - Then: todos os 4 votos aparecem ao mesmo tempo na tela de todos os participantes, junto com a média numérica, o mínimo e o máximo.

2. **Caso alternativo — participante entra no meio de uma rodada**
   - Given: uma rodada está em andamento, com 3 dos 4 participantes já tendo votado mas votos ainda não revelados.
   - When: um novo participante abre o link da sala e digita um apelido.
   - Then: ele entra na sala, vê a rodada em andamento com indicação de quem já votou (sem ver os votos), e pode votar antes da revelação.

3. **Caso alternativo — facilitador altera escala entre rodadas**
   - Given: sala com escala Fibonacci ativa, nenhuma rodada em andamento.
   - When: o facilitador troca a escala para "T-shirt sizes" e inicia nova rodada.
   - Then: a partir dessa rodada, as cartas exibidas para todos os participantes são XS, S, M, L, XL, XXL, ?, ☕.

4. **Caso de erro — apelido vazio ou duplicado**
   - Given: tela de entrada de sala.
   - When: o usuário tenta entrar com apelido vazio, ou com apelido idêntico a alguém já na sala.
   - Then: o app rejeita a entrada com mensagem de erro específica ("apelido obrigatório" / "apelido já em uso nesta sala") e a sala não recebe esse participante.

5. **Caso de erro — sala inexistente ou expirada**
   - Given: link para sala cujo identificador não existe (nunca existiu ou já foi descartada por inatividade).
   - When: usuário abre o link.
   - Then: o app mostra mensagem "sala não encontrada ou expirada" e oferece botão para criar uma nova sala.

6. **Caso de erro — facilitador desconecta**
   - Given: sala ativa com facilitador e 2 participantes.
   - When: o facilitador fecha o navegador / perde conexão por mais de 30s.
   - Then: o papel de facilitador é transferido automaticamente para o participante mais antigo restante na sala; todos veem a mudança refletida.

## Acceptance criteria

- [x] **AC1** — uma pessoa consegue criar uma sala a partir da tela inicial e recebe uma URL única.
- [x] **AC2** — abrir a URL da sala num segundo navegador permite entrar como participante após digitar apelido.
- [x] **AC3** — quando um participante vota, os demais veem "X já votou" sem ver o valor.
- [x] **AC4** — quando o facilitador revela, todos os clientes da sala recebem e exibem os votos simultaneamente (delay < 1s em rede local).
- [x] **AC5** — após revelar, a UI exibe média, mínimo e máximo das cartas numéricas.
- [x] **AC6** — facilitador pode iniciar nova rodada, descartando o estado anterior; todos os clientes refletem o reset.
- [x] **AC7** — o facilitador pode escolher a escala (Fibonacci, Fibonacci modificada, T-shirt) ao criar a sala e pode trocá-la entre rodadas (não durante uma rodada).
- [x] **AC8** — apelidos vazios ou duplicados são rejeitados com mensagem clara.
- [x] **AC9** — sala sem nenhuma conexão por mais de 10 minutos é descartada do servidor.
- [x] **AC10** — se o facilitador desconecta por > 30s, o papel é transferido para o participante mais antigo da sala.
- [x] **AC11** — abrir URL de sala inexistente exibe mensagem e oferece criar nova sala.
- [x] **AC12** — entrada/saída de participantes atualiza a lista da sala em todos os clientes em tempo real.

## Out of scope

Para manter o MVP enxuto, este feature **não inclui**:

- Autenticação, contas persistentes, perfil de usuário.
- Persistência de salas ou histórico de rodadas em banco de dados.
- Exportação de resultados (CSV, JSON, integração com Jira, etc.).
- Integração com ferramentas externas (Jira, Linear, GitHub Issues).
- Chat de texto ou voz entre participantes.
- Importar lista de itens de backlog a estimar — cada rodada tem no máximo um título digitado pelo facilitador.
- Escalas customizadas pelo usuário (apenas as 3 escalas pré-definidas).
- Modo espectador / participante sem direito a voto.
- Cronômetro de rodada / timer.
- Internacionalização — interface em **português apenas** no MVP.
- Tema escuro / personalização visual.
- Mobile-first — o layout deve ser usável em mobile, mas otimizado para desktop.
- Reconciliação de estado pós-reconexão automática avançada — se um cliente perde conexão e reconecta, ele recebe o estado atual da sala, mas votos não-confirmados podem ser perdidos.

## Dependencies

- **Spec base:** nenhum spec anterior.
- **Sistemas externos:** nenhum — totalmente self-contained.
- **MCPs:** nenhum necessário em runtime.
- **Bibliotecas novas:** a definir no `plan.md` e justificar no ADR de stack (provável: Next.js, socket.io ou similar para WebSocket).
- **ADRs a criar antes da implementação:**
  - ADR de **escolha de stack** (Next.js + WebSocket).
  - ADR de **logging strategy** (referenciado pelo `CLAUDE.md` como ainda inexistente).

## Constitution adherence

- **Princípio 1 (Spec antes do código):** este spec foi escrito antes de qualquer implementação. ✓
- **Princípio 2 (Tests track behavior):** cada AC acima será mapeado em ao menos um teste automatizado via skill `test-generator`, antes ou junto com o código de implementação.
- **Princípio 3 (Aprovação humana antes de commit / HIC):** nenhum código será escrito até este spec, o plan e os tasks estarem aprovados; cada commit subsequente requer aprovação explícita.
- **Princípio 5 (ADR para decisões arquiteturais):** a escolha de stack (Next.js + WebSocket) será registrada como ADR antes da implementação. A política de logging também será definida em ADR.
- **Princípio 6 (Sem segredos no repo):** o app não usará segredos no MVP. Caso seja introduzida config sensível (porta, origem permitida CORS), ficará em `.env.example` com placeholders.
- **Princípio 7 (Mudanças atômicas):** os tasks gerados em `tasks.md` serão desenhados como commits separados (setup → modelo de sala → WebSocket → UI → tratamento de erros), nunca empacotando refactor + feature + fix.
- **Princípio 8 (Falha visível):** erros operacionais (sala inexistente, apelido inválido, desconexão do facilitador) são tratados explicitamente nos use cases acima e nos ACs; erros de servidor serão logados conforme ADR de logging.

## Identified risks

- **Risco:** a persistência só em memória significa que reinício do servidor descarta todas as salas ativas. **Mitigação:** o MVP aceita esse trade-off (salas são efêmeras por design); um deploy em produção com >1 réplica exigiria sticky sessions ou Redis, o que ficaria em escopo futuro.
- **Risco:** sem autenticação, qualquer pessoa com o link entra como qualquer apelido — inclusive se passando pelo facilitador. **Mitigação:** transferência de facilitador é determinística (participante mais antigo), e o vínculo "este cliente é o facilitador" é mantido por token de sessão emitido na criação da sala (não pelo apelido).
- **Risco:** apelidos duplicados podem causar confusão social mesmo quando rejeitados — pessoas mudam apelidos durante a sessão. **Mitigação:** validar apelido único *na sala*, não globalmente; aceitar como limitação conhecida.
- **Risco:** WebSocket pode não funcionar em algumas redes corporativas com proxies restritivos. **Mitigação:** documentar fallback (long-polling) como opção futura; testar em rede do escritório antes de declarar pronto.
- **Risco:** race condition entre "todos votaram" e "novo participante entra antes de revelar". **Mitigação:** o servidor é a única fonte de verdade do estado da rodada; "revelar" é uma ação explícita do facilitador, não automática quando "todos votaram", evitando a race.
