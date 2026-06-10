# ADR 0003 — CSS strategy: CSS Modules + custom properties, no runtime dependencies

- **Status:** accepted
- **Date:** 2026-06-10
- **Decision-makers:** José Menezes

## Context

Until this point the Planning Poker project had **zero CSS infrastructure**: no `globals.css`, no CSS Modules, no framework (Tailwind, styled-components, Emotion). All 7 components and the 2 pages used pure semantic markup with no styling.

We are now applying a complete visual redesign inspired by the Coolmath Games design system (Kiara Hardesty) — "full" tone, vivid colors, chunky cards, seafoam+orange as state colors, bold typography. The scope covers every surface (Home + Room + components).

Because we are starting from scratch, we need to choose the CSS strategy for the project. The constitution (Principle 5) requires an ADR for architectural decisions that touch the whole codebase.

Relevant constraints:

- Current stack: Next.js 15 App Router + React 19 + strict TypeScript. RSC by default.
- Constitution: "less is more" — prefer simplicity, avoid unnecessary dependencies.
- Project size: small (7 components, 2 pages). No current demand for multi-tenant theming, shared design tokens across projects, or dark mode (the last one was explicitly deferred).
- Conventions already in place: ESLint flat config with `no-console: error`, Prettier, Vitest + Playwright.

## Decision

We will adopt **CSS Modules + CSS custom properties (design tokens)** as the single CSS strategy for the whole project:

- **Design tokens** defined in `src/app/globals.css` under `:root` (colors, spacing, radius, shadows, type scale, motion). Semantic naming (`--color-primary-500`, `--space-4`) + a derived layer (`--color-text`, `--color-card-bg`) to allow targeted swaps without renaming consumers.
- **Per-component CSS Modules** — every component gets a sibling `Component.module.css` file, imported as `import styles from "./Component.module.css"`. Automatic scoping avoids name collisions.
- **Typography via `next/font/google`** (Inter Variable, exposed as `--font-inter` and used by `--font-sans`). Zero client runtime — the font is self-hosted at build time, with no `<link>` to Google.
- **Modern reset + base** at the top of `globals.css`: universal box-sizing, zero default margins on headings/p/lists, global `:focus-visible`, `prefers-reduced-motion` support.
- **No runtime CSS-in-JS.** No styled-components, no Emotion. Keeps RSC friction-free.

Convention:

- Class names in camelCase inside modules (`.cardPicker`, `.isSelected`).
- State hooks prefer `data-*` attributes (e.g. `[data-selected="true"]`) when already present in the JSX — more readable in DevTools and reusable in tests.
- Tokens always via `var(--name)`. No inline hex in component CSS.
- Dark mode: **out of scope** in this ADR. When it lands, it will be a token overlay under `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)` — no structural migration required.

## Alternatives considered

- **Tailwind CSS (v3 or v4).**
  Pros: large ecosystem, fast to prototype, tokens via `theme`. Cons: runtime + extra build dependency, utility classes pollute the JSX in a small project where semantics matter, requires discipline against escalation (`@apply`, plugins). For 7 small components, disproportionate weight. **Rejected.**

- **styled-components / Emotion.**
  Pros: ergonomic API, easy theming. Cons: runtime CSS-in-JS has documented friction with React Server Components (requires client wrappers). Grows the bundle. **Rejected.**

- **vanilla-extract.**
  Pros: zero-runtime, type-safe, tokens in TS. Cons: integrates with Next.js but requires an additional plugin/build. Build complexity above what this project justifies. **Deferred** — can be revisited if the design system grows to the point of sharing tokens between multiple projects.

- **Pure global CSS (a single `globals.css`, global classes).**
  Pros: zero scoping to learn, one file. Cons: name collisions become inevitable as the project grows; class refactors get risky. **Rejected.**

## Consequences

### Positive

- Zero new runtime dependencies. Bundle does not grow.
- CSS Modules give automatic scoping and work in both Server and Client Components without adjustments.
- Design tokens in `:root` let the whole app consume a single source of truth. Swapping `--color-primary-500` ripples through the entire system.
- `next/font/google` self-hosts the fonts at build time — good for privacy (no runtime hit to Google) and performance.

### Negative (accepted costs)

- No infrastructure to purge unused CSS (in CSS Modules each `.module.css` is only loaded when the component is, so the problem is smaller — but dead classes inside a module are not detected automatically). We accept manual maintenance via `code-reviewer`.
- No type-safety on class names (vs. vanilla-extract). A misspelled name silently produces no-effect CSS. Mitigated by PR review.
- Dark mode deferred — when it lands, it will require a token overlay pass; not trivial, but localized in `globals.css`.

### Neutral

- The `data-*` convention for state may look redundant with `aria-pressed` etc. — a conscious choice: ARIA = semantics for AT; `data-*` = hook for CSS/tests.

## Constitution adherence

- **Principle 5 (ADR for architectural decisions):** this ADR records the choice. ✓
- **"Less is more":** zero new dependencies, build unchanged, familiar tools (standard CSS + tokens). ✓
- **Strict typing:** the decision respects it; CSS Modules do not introduce dynamic typing.

## Future review

Revisit when:

- A dark-mode-with-toggle request appears — design the token overlay.
- The design system is shared with another project — consider tokens in a separate package (Style Dictionary, vanilla-extract).
- The CSS bundle grows to a measurable problem — investigate critical CSS / route-level splitting in Next.js.
- A multi-tenant (white-label) theming demand appears — tokens in `:root` already support it, but a more formal abstraction may be warranted.
