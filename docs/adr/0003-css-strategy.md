# ADR 0003 — Estratégia de CSS: CSS Modules + custom properties, sem dependências runtime

- **Status:** accepted
- **Date:** 2026-06-10
- **Decision-makers:** José Menezes

## Context

Até este momento o projeto Planning Poker tem **zero infraestrutura de CSS**: nenhum `globals.css`, nenhum CSS Module, nenhum framework (Tailwind, styled-components, Emotion). Os 7 componentes e as 2 páginas usam markup semântico puro, sem qualquer styling.

Vamos aplicar um redesign visual completo inspirado no design system Coolmath Games (Kiara Hardesty) — tom "cheio", cores vivas, cartas chunky, seafoam+orange como cores de estado, tipografia bold. O scope inclui todas as superfícies (Home + Room + componentes).

Como partimos do zero, precisamos escolher a estratégia de CSS para o projeto. A constituição (Princípio 5) exige um ADR para decisões arquiteturais que afetam todo o codebase.

Constraints relevantes:

- Stack atual: Next.js 15 App Router + React 19 + TypeScript estrito. RSC por defeito.
- Constituição: "menos é mais" — preferir simplicidade, evitar dependências desnecessárias.
- Tamanho do projeto: pequeno (7 componentes, 2 páginas). Não há demanda atual por theming multi-tenant, design tokens partilhados entre projetos, ou dark mode (este último foi adiado explicitamente).
- Convenções já estabelecidas: ESLint flat config com `no-console: error`, Prettier, Vitest + Playwright.

## Decision

Adotaremos **CSS Modules + CSS custom properties (design tokens)** como estratégia única de CSS para todo o projeto:

- **Design tokens** definidos em `src/app/globals.css` no `:root` (cores, spacing, radius, shadows, type scale, motion). Naming semântico (`--color-primary-500`, `--space-4`) + camada derivada (`--color-text`, `--color-card-bg`) para permitir trocas pontuais sem renomear consumidores.
- **CSS Modules per-componente** — cada componente ganha um ficheiro `Component.module.css` irmão, importado como `import styles from "./Component.module.css"`. Scoping automático evita colisão de nomes.
- **Tipografia via `next/font/google`** (Inter Variable, exposta como `--font-inter` e usada por `--font-sans`). Zero runtime no cliente — a fonte é self-hosted no build, sem `<link>` para Google.
- **Reset moderno + base** no topo de `globals.css`: box-sizing universal, zero margens default em headings/p/lists, `:focus-visible` global, suporte a `prefers-reduced-motion`.
- **Sem CSS-in-JS runtime.** Sem styled-components, sem Emotion. Mantém RSC sem fricção.

Convenção:

- Nomes de classes em camelCase dentro dos módulos (`.cardPicker`, `.isSelected`).
- Hooks de estado preferem `data-*` attributes (ex.: `[data-selected="true"]`) quando já existem no JSX — mais legível em DevTools e reutilizáveis em testes.
- Tokens sempre via `var(--name)`. Sem hex inline em CSS de componente.
- Dark mode: **fora de escopo** neste ADR. Quando entrar, será um overlay de tokens em `[data-theme="dark"]` ou `@media (prefers-color-scheme: dark)` — não exige migração estrutural.

## Alternatives considered

- **Tailwind CSS (v3 ou v4).**
  Prós: ecossistema grande, rápido para protótipo, tokens via `theme`. Contras: dependência runtime + build extra, classes utilitárias poluem o JSX num projeto pequeno onde semântica conta, força disciplina contra escalation (`@apply`, plugins). Para 7 componentes pequenos, é peso desproporcional. **Rejeitado.**

- **styled-components / Emotion.**
  Prós: API ergonómica, theming fácil. Contras: runtime CSS-in-JS tem fricção declarada com React Server Components (precisa de wrappers client). Aumenta o bundle. **Rejeitado.**

- **vanilla-extract.**
  Prós: zero-runtime, type-safe, tokens em TS. Contras: integra com Next.js mas exige plugin/build adicional. Complexidade do build acima do que este projeto justifica. **Adiado** — pode ser revisitado se o design system crescer ao ponto de tokens partilhados entre múltiplos projetos.

- **CSS global puro (`globals.css` único, classes globais).**
  Prós: zero scoping a aprender, um único ficheiro. Contras: colisão de nomes inevitável quando o projeto crescer; refactors de classe ficam arriscados. **Rejeitado.**

## Consequences

### Positive

- Zero dependências runtime novas. Bundle não cresce.
- CSS Modules dão scoping automático e funcionam em Server e Client Components sem ajustes.
- Design tokens em `:root` deixam o app inteiro consumir uma fonte única de verdade. Trocar `--color-primary-500` ressoa em todo o sistema.
- `next/font/google` self-hosta as fontes no build — bom para privacidade (sem hit ao Google em runtime) e performance.

### Negative (accepted costs)

- Zero infraestrutura para purgar CSS não usado (em CSS Modules cada `.module.css` só é carregado quando o componente é, então o problema é menor — mas classes mortas dentro de um módulo não são detectadas automaticamente). Aceita-se manutenção manual no `code-reviewer`.
- Não há type-safety nos nomes de classes (vs. vanilla-extract). Bug de nome errado vira CSS silenciosamente sem efeito. Mitigado por revisão de PR.
- Dark mode adiado — quando vier, exige uma passada de overlay de tokens; não é trivial mas é localizado em `globals.css`.

### Neutral

- Convenção `data-*` para estado pode parecer redundante com `aria-pressed` etc. — escolha consciente: ARIA = semântica para AT; `data-*` = hook para CSS/teste.

## Constitution adherence

- **Princípio 5 (ADR para decisões arquiteturais):** este ADR registra a escolha. ✓
- **"Menos é mais":** zero dependências novas, build inalterado, ferramentas familiares (CSS standard + tokens). ✓
- **Tipagem estrita:** decisão respeita; CSS Modules não introduzem dynamic typing.

## Future review

Revisitar quando:

- Aparecer pedido de dark mode com toggle do utilizador — desenhar overlay de tokens.
- O design system passar a ser partilhado com outro projeto — considerar tokens em pacote separado (Style Dictionary, vanilla-extract).
- O bundle de CSS crescer a ponto de virar problema medível — investigar critical CSS / route-level splitting do Next.js.
- Aparecer demanda por theming multi-tenant (white-label) — tokens em `:root` já suportam, mas pode justificar abstração mais formal.
