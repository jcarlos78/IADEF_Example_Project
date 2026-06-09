# tests/

Project tests. Empty by default — populated as features are implemented.

## Convention

Recommended structure:

```
tests/
├── <domain-1>/
│   ├── test_models.py
│   ├── test_service.py
│   └── test_handlers.py
├── <domain-2>/
└── shared/             Test helpers and fixtures
```

## Principle

Tests reflect the acceptance criteria of the corresponding spec. See constitution, Principle 2 — _Tests track behavior_.

## How to generate

Use the `test-generator` skill (`.claude/skills/test-generator.md`) to derive tests from an approved spec at `../specs/<feature>/spec.md`.
