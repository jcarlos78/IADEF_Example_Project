# Plan: <Feature name>

> **Prerequisite:** `spec.md` approved.

## Architectural decisions

For each relevant decision, indicate whether it requires an ADR:

- Decision 1: <description> — [ADR required | minor decision]
- Decision 2: ...

## Affected components

- `src/<path>/<file>` — <nature of the change>
- `tests/...` — tests to create/modify
- `docs/...` — doc updates

## Implementation sequence

Proposed order (each item becomes an atomic task in `tasks.md`):

1. Generate tests from the spec (red)
2. Implement component A
3. Implement component B
4. Wire A and B together
5. Verify tests pass (green)
6. Documentation and ADRs

## Testing strategy

- Unit tests: <where, which>
- Integration tests: <where, which>
- Manual tests: <if any, describe>

## Implementation risks

- Risk: <technical, not spec-level> | Mitigation: ...

## Definition of Done

- [ ] All tests derived from the spec pass
- [ ] Code review approved (`code-reviewer` skill + human review)
- [ ] ADRs recorded for relevant decisions
- [ ] Documentation updated
- [ ] No secrets in the diff
- [ ] Constitution respected
