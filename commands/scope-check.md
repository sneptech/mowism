---
name: scope-check
description: Verify recent changes stay within the scope of the original task
argument-hint: "[description of original task or commit range]"
allowed-tools: Read, Bash, Grep, Glob
---

# Scope Check

**Source:** Karpathy -- "Touch only what you're asked to touch. Your job is surgical precision, not unsolicited renovation."

## Objective

Review all recent changes and classify each one as in-scope or out-of-scope relative to the original task. Catch removed comments, "cleaned up" unrelated code, refactored adjacent systems, and deleted code that seemed unused but was not part of the task.

## Process

### 1. Determine Original Task Intent

- If `$ARGUMENTS` is provided, use it as the task description or commit range
- If no arguments, check the most recent commit messages (`git log --oneline -5`) and ask the user to confirm the original task intent
- Establish a clear, narrow definition of what the task was supposed to accomplish

### 2. Collect All Changes

- Run `git diff` for unstaged changes
- Run `git diff --cached` for staged changes
- Run `git diff HEAD~N` if a commit range was specified
- Run `git status` to identify new/deleted/renamed files
- Build a complete list of every file and hunk that was modified

### 3. Classify Each Change

For every modified file and every hunk within that file, classify as:

| Classification | Meaning |
|---|---|
| **IN-SCOPE** | Directly required by the original task |
| **OUT-OF-SCOPE** | Not related to the original task at all |
| **WARNING** | Tangentially related but not strictly necessary -- could be scope creep |

When classifying, watch specifically for:
- Removed comments or documentation in unrelated files
- "Cleaned up" formatting or style in files that were only supposed to have functional changes
- Refactored adjacent systems that were working fine
- Deleted code that "seemed unused" but was not part of the task
- Added abstractions, helpers, or utilities beyond what the task required
- Changed configuration or dependencies not required by the task

### 4. Present Findings

Output a table:

```
| File | Change | Classification | Reason |
|------|--------|----------------|--------|
```

Group by classification (OUT-OF-SCOPE first, then WARNING, then IN-SCOPE).

### 5. Give Verdict

- **PASS** -- All changes are in-scope. No action needed.
- **FAIL** -- Out-of-scope changes detected. Recommend specific reversions.

If FAIL, provide exact commands to revert out-of-scope changes (e.g., `git checkout HEAD -- path/to/file`).

## Output Format

```
## Scope Check: [task description]

### Verdict: PASS / FAIL

### Changes Summary
- N files modified
- N in-scope, N out-of-scope, N warnings

### Findings

| File | Change | Classification | Reason |
|------|--------|----------------|--------|
| ... | ... | OUT-OF-SCOPE | ... |
| ... | ... | WARNING | ... |
| ... | ... | IN-SCOPE | ... |

### Recommended Actions
[If FAIL: specific revert commands]
[If PASS: "No action needed"]
```

## Rules

- Be strict. "I was already in the file" is not a valid reason for out-of-scope changes.
- Formatting-only changes in files that needed functional changes are WARNINGS, not in-scope.
- New test files are in-scope only if testing the task's functionality.
- Dependency changes (package.json, lock files) are in-scope only if the task requires new dependencies.
- Do not suggest keeping out-of-scope changes "since they're already done." Recommend reverting.
