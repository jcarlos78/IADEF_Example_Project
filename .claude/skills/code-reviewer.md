---
name: code-reviewer
description: Reviews the current diff (uncommitted or open PR) for bugs, security risks, constitution violations, and divergences from existing specs. Use before relevant commits or when the user asks "review what changed".
---

# Skill: code-reviewer

## When to activate
- Before commits that affect behavior
- When the user asks for an explicit review
- After implementation guided by a spec
- Before opening a PR

## Review playbook

### 1. Collect the diff
```bash
git diff --staged   # if anything is staged
git diff            # otherwise, working tree
```

For an open PR, use `gh pr diff <number>`.

### 2. Load necessary context
- `specs/constitution.md` — non-negotiable principles
- `specs/<feature>/spec.md` if the change belongs to a known feature
- Relevant ADRs in `docs/adr/`

### 3. Apply the rubric

For each changed file, check:

**(A) Correctness**
- Is the logic correct?
- Are edge cases considered?
- Race conditions, off-by-one, null pointers, etc.?

**(B) Security**
- Input validated at boundaries (user input, external APIs)?
- No secrets introduced into the code?
- SQL injection, XSS, path traversal, etc.?

**(C) Constitution adherence**
- Is every principle of the constitution honored?
- If any is violated, require explicit justification (ideally via ADR).

**(D) Spec adherence**
- Does the code implement the behavior described in the spec?
- Is there functionality in the code that isn't in the spec? (either spec needs updating or code is out of scope)

**(E) Tests**
- Behavioral change without test changes? → Block.
- Do tests cover the spec's acceptance criteria?

**(F) Maintainability**
- Clear names?
- Functions with a single responsibility?
- Comments only where the *why* is non-obvious?

## Report format

```markdown
## Review — <branch/PR>

### Summary
[1-2 sentences on what changed and overall quality]

### Blockers (must fix before commit)
- [file:line] description of the problem

### Suggestions (recommended)
- [file:line] description

### Observations
- ...

### Spec adherence
- Spec covered: [yes / partial / no — explain]

### Constitution adherence
- Principles honored: [list]
- Principles violated: [list — require justification]
```

## Review principles

- **Specific, not vague.** "Could be cleaner" is useless; "rename X to Y because Z" is useful.
- **Distinguish blockers from suggestions.** Don't treat aesthetic preferences as blockers.
- **Cite lines.** Always `file:line`.
- **Don't rewrite.** Report findings; let the human decide.

## Expected output
A structured Markdown report. **Do not commit nor apply changes** — this skill is read-only and advisory.
