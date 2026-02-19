---
name: dead-code-sweep
description: Find unreachable and unused code after a refactor or feature removal
argument-hint: "[context about recent refactor or feature removal]"
allowed-tools: Read, Bash, Grep, Glob
---

# Dead Code Sweep

**Source:** Karpathy -- "After refactoring: identify code that is now unreachable. List it explicitly. Ask before deleting. Don't leave corpses."

## Objective

After a refactor, implementation change, or feature removal, trace the impact and find functions, imports, variables, types, files, and config entries that are now dead. Verify each finding. Present for approval -- never delete without asking.

## Process

### 1. Understand What Changed

- If `$ARGUMENTS` describes a refactor or removal, use that as context
- Otherwise, analyze recent changes via `git diff` and `git log --oneline -10`
- Identify what was removed, replaced, or restructured
- Build a mental model of what code USED to be needed that might no longer be

### 2. Search for Dead Code Categories

Systematically check each category:

| Category | How to Find |
|---|---|
| **Orphaned functions** | Grep for function name across codebase -- zero callers means dead |
| **Unused imports** | Check each import in modified files -- is the imported symbol used? |
| **Unreferenced types/interfaces** | Grep for type name -- zero references outside its definition |
| **Dead exports** | Exports that nothing imports |
| **Unused variables/constants** | Declared but never read |
| **Dead config entries** | Config keys that no code reads |
| **Orphaned files** | Files that nothing imports or references |
| **Dead routes/endpoints** | Routes registered but never called by any client code |
| **Stale test helpers** | Test utilities for features that no longer exist |
| **Unused dependencies** | Packages in package.json/requirements.txt that no code imports |

### 3. Verify Each Finding

For every potential dead code item:

1. Grep the entire codebase for references (not just the obvious directory)
2. Check for dynamic references (string-based imports, reflection, config-driven loading)
3. Check for references in tests (test-only usage may be intentional)
4. Check for references in documentation, scripts, or build configs
5. Mark confidence level:
   - **CONFIRMED DEAD** -- Zero references found anywhere
   - **LIKELY DEAD** -- Only self-references or references from other dead code
   - **POSSIBLY DEAD** -- Few references, may be dynamic or indirect usage

### 4. Present Findings

Separate confirmed from uncertain:

```
## Confirmed Dead Code

| # | Type | Location | Last Used By | Confidence |
|---|------|----------|-------------|------------|
| 1 | Function | src/utils.ts:42 `formatLegacyDate` | Removed in refactor | CONFIRMED |

## Possibly Dead Code (needs manual review)

| # | Type | Location | Concern | Confidence |
|---|------|----------|---------|------------|
| 1 | Export | src/types.ts:15 `LegacyUser` | Only referenced in one test | LIKELY |
```

### 5. Ask for Approval

> The following items appear to be dead code. Which would you like me to remove?
> - Enter item numbers to remove (e.g., "1,3,5")
> - Enter "all confirmed" to remove only CONFIRMED items
> - Enter "none" to keep everything

Never delete without explicit approval. The skill IDENTIFIES dead code; the user decides what to remove.

## Output Format

```
## Dead Code Sweep: [context]

### Summary
- Scope: [what was analyzed]
- Confirmed dead: N items
- Possibly dead: N items
- Estimated removable lines: ~N

### Confirmed Dead Code
[table]

### Possibly Dead Code
[table]

### Awaiting Approval
[prompt for user decision]
```

## Rules

- Never delete without asking. This is identification, not cleanup.
- Verify with grep before claiming something is dead. False positives erode trust.
- Check for dynamic references -- not everything is a static import.
- Test-only usage counts as a reference. Flag it but do not call it dead.
- Configuration-driven code may appear dead but be loaded dynamically. Mark as POSSIBLY DEAD.
- When in doubt, mark as POSSIBLY DEAD rather than CONFIRMED.
- Present the easiest wins first (unused imports, orphaned functions) before the uncertain items.
