---
name: change-summary
description: Generate a structured summary of all changes with risks and concerns
argument-hint: "[optional: specific commit range or file scope]"
allowed-tools: Read, Bash, Grep, Glob
---

# Change Summary

**Source:** Karpathy -- "After any modification, summarize: what changed and why, what you didn't touch and why, and potential concerns."

## Objective

Generate a structured post-implementation report documenting what changed, WHY it changed, what was intentionally left alone, risks, assumptions baked in, and testing status. Ensure nothing falls through the cracks during review or handoff.

## Process

### 1. Collect All Changes

- If `$ARGUMENTS` specifies a commit range or file scope, use that
- Otherwise, collect from `git diff`, `git diff --cached`, and `git status`
- For committed changes, use `git log --oneline -N` and `git diff HEAD~N`
- Build a complete inventory of every modified, added, deleted, and renamed file

### 2. Document Each Change (What AND Why)

For every file modification, document:

| Field | Content |
|---|---|
| **File** | Full path |
| **What changed** | Specific description of the modification |
| **Why** | The reason for this change (not "because it was needed" -- the actual WHY) |
| **Type** | New feature / Bug fix / Refactor / Config / Test / Documentation |
| **Risk** | What could go wrong because of this change |

The WHY is mandatory. Every change has a reason. If you cannot articulate the reason, flag it as a concern.

### 3. Document What Was NOT Changed (and Why)

Explicitly list files and areas that were intentionally left alone:

| File/Area | Why Not Modified |
|---|---|
| `path/to/file` | Not related to this task |
| `area/of/concern` | Could be improved but out of scope |
| `related/system` | Will be addressed in follow-up work |

This section catches scope discipline issues and documents intentional decisions to NOT modify things.

### 4. Flag Risks and Untested Areas

Identify:
- **Known risks** -- things that could break because of these changes
- **Untested areas** -- changes that lack test coverage
- **Implicit dependencies** -- systems that depend on the changed behavior
- **Rollback complexity** -- how hard would it be to undo these changes?

### 5. List Assumptions

What assumptions are baked into the changes?

- "Assumes the database schema has column X" (did anyone verify?)
- "Assumes the API response format won't change" (what if it does?)
- "Assumes this function is only called from one context" (is that true?)

Assumptions that are not verified are risks. Flag them.

### 6. Testing Status

| Test Type | Status | Notes |
|---|---|---|
| Unit tests | Pass / Fail / None | ... |
| Integration tests | Pass / Fail / None | ... |
| Manual testing | Done / Not done | ... |
| Edge case coverage | Good / Partial / None | ... |

## Output Format

```
## Change Summary

### Overview
- Files modified: N
- Files added: N
- Files deleted: N
- Lines changed: +N / -N

### Changes Made

| File | What | Why | Type | Risk |
|------|------|-----|------|------|
| ... | ... | ... | ... | ... |

### Files Not Touched

| File/Area | Reason |
|-----------|--------|
| ... | ... |

### Risks and Concerns
1. [Risk with severity and mitigation]
2. ...

### Assumptions
1. [Assumption with verification status]
2. ...

### Testing Status

| Test Type | Status | Notes |
|-----------|--------|-------|
| ... | ... | ... |

### Recommended Follow-ups
[Things that should happen next based on these changes]
```

## Rules

- "What changed" without "why" is useless. Always include the WHY.
- The "Not Touched" section is as important as the "Changed" section. Omissions tell a story.
- Do not hide risks. If something might break, say so. The summary is where risks are surfaced, not buried.
- Assumptions that are not explicitly verified should be flagged as risks.
- Be specific. "May affect performance" is vague. "The new query lacks an index on `user_id`, may slow down for >10k rows" is useful.
- This is a handoff document. Someone reading this with no context should understand what happened and what to watch out for.
