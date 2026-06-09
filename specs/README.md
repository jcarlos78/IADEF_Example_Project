# Specs — Spec-Driven Development

This folder is the **source of truth** for the project's behavior. Code serves specs; specs do not document code.

## Structure

```
specs/
├── constitution.md         Non-negotiable principles (do not edit without an ADR)
├── README.md               This file
├── template/               Templates for a new feature
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── example-feature/        Complete example of usage
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── <feature-slug>/         One folder per feature
    ├── spec.md
    ├── plan.md
    └── tasks.md
```

## SDD flow

```
   ┌──────┐    ┌──────┐    ┌───────┐    ┌──────────────────┐
   │ Spec │ →  │ Plan │ →  │ Tasks │ →  │  Implementation  │
   └──────┘    └──────┘    └───────┘    └──────────────────┘
      ↑           ↑            ↑                ↑
      └──── human and agent collaborate at each step ────┘
```

Each step has a **human gate**: no one — not even the agent — skips a step without explicit human approval.

## How to start a new feature

### Option 1 — Using the spec-writer skill (recommended)
```
/spec-writer I want to add: <natural-language description>
```
The skill drives the full flow.

### Option 2 — Manually
1. `cp -r template/ <new-feature-slug>/`
2. Edit `spec.md` (fill in the marked sections)
3. Request human review
4. Edit `plan.md` after the spec is approved
5. Edit `tasks.md` after the plan is approved
6. Implement task by task
