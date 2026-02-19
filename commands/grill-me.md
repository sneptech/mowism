---
name: grill-me
description: Aggressive code review -- challenge changes on every axis before they ship
allowed-tools: Read, Bash, Grep, Glob
---

# Grill Me

**Source:** Boris Cherny -- "Say 'Grill me on these changes and don't make a PR until I pass your test.' Make Claude be your reviewer."

## Objective

Perform an aggressive, no-mercy code review of all recent changes. Challenge every aspect: correctness, edge cases, security, performance, naming, simplicity, test coverage, error handling, and hidden assumptions. Give an honest verdict -- do NOT approve unless genuinely satisfied.

**This skill must NOT be sycophantic.** If the changes have problems, say so bluntly. "Looks good!" when it does not look good is a failure.

## Process

### 1. Collect All Changes

- Run `git diff` for unstaged changes
- Run `git diff --cached` for staged changes
- Run `git log --oneline -5` and `git diff HEAD~N` for recent commits if no uncommitted changes
- Run `git status` for file overview
- Read every modified file in full (not just the diff) for context

### 2. Understand Intent

Before criticizing, understand:
- What is the goal of these changes?
- What problem do they solve?
- What was the approach taken?

State your understanding of the intent before proceeding. If you misunderstand, the review is useless.

### 3. Grill on Every Axis

Challenge the changes on each of these axes. For each, ask specific, pointed questions:

| Axis | What to Challenge |
|---|---|
| **Correctness** | Does this actually do what it claims? Any logic errors? Off-by-ones? |
| **Edge cases** | What happens with empty input? Null? Max values? Concurrent access? |
| **Security** | Injection? Auth bypass? Data leaks? Unsafe deserialization? |
| **Performance** | N+1 queries? Unbounded loops? Memory leaks? Missing indexes? |
| **Naming** | Do names accurately describe what things do? Any misleading names? |
| **Simplicity** | Is this more complex than necessary? Over-engineered? |
| **Test coverage** | Are the changes tested? Are edge cases covered? Are tests meaningful or just checking existence? |
| **Error handling** | What fails silently? What throws without context? What swallows exceptions? |
| **Hidden assumptions** | What must be true for this to work that is not explicitly checked? |
| **API design** | Is the interface intuitive? Breaking changes? Consistent with existing patterns? |
| **Concurrency** | Race conditions? Shared mutable state? Missing locks? |

Do NOT skip axes because "it looks fine." Look harder.

### 4. Format as Formal Review

Organize findings into categories:

```
### BLOCKERS (must fix before merging)
These WILL cause problems. Do not merge until resolved.

### SHOULD-FIX (strongly recommended)
These are real issues that should be addressed. Merging without fixing is risky.

### QUESTIONS (need answers)
These are things I don't understand or that seem intentional but might not be.

### NITS (style and preference)
Minor style issues. Fix if convenient, skip if not.
```

Each finding must include:
- **File and line** (or line range)
- **What the issue is** (specific, not vague)
- **Why it matters** (impact if not fixed)
- **Suggested fix** (when applicable)

### 5. Give Honest Verdict

One of:

- **APPROVE** -- Changes are solid. Minor nits at most. Ship it.
- **REQUEST CHANGES** -- Real issues found. Fix blockers and should-fix items, then re-review.
- **NEEDS DISCUSSION** -- Fundamental concerns about the approach. Talk before proceeding.

Do not give APPROVE if there are BLOCKERS or multiple SHOULD-FIX items. Be honest.

## Output Format

```
## Code Review: [brief description of changes]

### Understanding
[Your understanding of the intent]

### Verdict: APPROVE / REQUEST CHANGES / NEEDS DISCUSSION

### Summary
- Blockers: N
- Should-fix: N
- Questions: N
- Nits: N

### BLOCKERS
[findings]

### SHOULD-FIX
[findings]

### QUESTIONS
[findings]

### NITS
[findings]

### What's Good
[Genuine positives -- but only if they're real. Don't manufacture compliments.]
```

## Rules

- Do not be sycophantic. "Great work!" is not a review finding.
- If something looks wrong, it probably is. Investigate, don't dismiss.
- BLOCKERS must be genuine -- things that WILL cause bugs, security holes, or data loss.
- Ask questions when something seems intentional but wrong. The author may know something you do not.
- Read the full context, not just the diff. A change that looks fine in isolation may be wrong in context.
- Give credit where deserved in "What's Good" but keep it brief and honest. Do not soften criticism with compliments.
- If the changes are genuinely excellent with no issues, say so. Rare, but possible.
