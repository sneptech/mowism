---
phase: 01-fork-and-foundation
plan: 03
subsystem: skills
tags: [claude-code-commands, karpathy, boris-cherny, code-review, scope-check, simplify, dead-code, prove-it, quality]

# Dependency graph
requires: []
provides:
  - "7 quality skill commands: scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, update-claude-md"
  - "Top-level Claude Code commands registered at ~/.claude/commands/"
  - "Canonical command sources at commands/ in repo"
affects: [01-04-mow-commands, 01-05-refine-phase, 02-worktree-awareness]

# Tech tracking
tech-stack:
  added: []
  patterns: [claude-code-command-format, yaml-frontmatter-with-allowed-tools]

key-files:
  created:
    - commands/scope-check.md
    - commands/simplify.md
    - commands/dead-code-sweep.md
    - commands/prove-it.md
    - commands/grill-me.md
    - commands/change-summary.md
    - commands/update-claude-md.md
  modified: []

key-decisions:
  - "Commands installed globally at ~/.claude/commands/ AND tracked in repo at commands/ as canonical source"
  - "No GSD references in any skill file -- these are standalone, self-contained"
  - "Tool permissions scoped per skill: Edit only for simplify, Write for prove-it and update-claude-md, Bash for all"

patterns-established:
  - "Claude Code command format: YAML frontmatter (name, description, argument-hint, allowed-tools) + markdown body with Objective, Process, Output Format, Rules sections"
  - "Quality skills are self-contained with no dependencies on mow-tools.cjs or mow workflows"

requirements-completed: [SKIL-01, SKIL-02, SKIL-03, SKIL-04, SKIL-05, SKIL-06, SKIL-07]

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 1 Plan 3: Quality Skills Summary

**7 standalone quality skill commands (scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, update-claude-md) derived from Karpathy and Boris Cherny specifications**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T03:29:52Z
- **Completed:** 2026-02-19T03:35:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created 4 Karpathy-derived skills: scope-check (scope discipline), simplify (complexity audit), dead-code-sweep (orphan detection), prove-it (evidence-based verification)
- Created 3 Boris Cherny-derived skills: grill-me (aggressive review), change-summary (structured reporting), update-claude-md (session learning capture)
- All 7 skills registered as top-level Claude Code slash commands with proper YAML frontmatter and detailed process documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scope-check, simplify, dead-code-sweep, prove-it** - `ce924ac` (feat)
2. **Task 2: Create grill-me, change-summary, update-claude-md** - `30570b9` (feat)

## Files Created/Modified

- `commands/scope-check.md` - Scope verification skill (Karpathy): classifies changes as IN-SCOPE/OUT-OF-SCOPE/WARNING
- `commands/simplify.md` - Complexity audit skill (Karpathy): finds bloated abstractions, premature generalization, clever tricks
- `commands/dead-code-sweep.md` - Dead code detection skill (Karpathy): finds orphaned functions, unused imports, unreferenced types
- `commands/prove-it.md` - Correctness proof skill (Cherny): demands evidence via tests, branch diffs, verification scripts
- `commands/grill-me.md` - Aggressive code review skill (Cherny): challenges on correctness, security, performance, naming, simplicity
- `commands/change-summary.md` - Change documentation skill (Karpathy): structured report with what/why, risks, assumptions, testing status
- `commands/update-claude-md.md` - CLAUDE.md maintenance skill (Cherny): captures session learnings as specific, actionable rules

## Decisions Made

- Commands stored in `commands/` directory within the repo as canonical source, plus installed globally at `~/.claude/commands/` for immediate use
- No GSD/mow dependencies -- skills are fully standalone and work independently of any orchestration system
- Tool permissions carefully scoped: Edit granted only to simplify (which can apply changes), Write to prove-it (verification scripts) and update-claude-md (CLAUDE.md edits)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added repo-local copies of command files**
- **Found during:** Task 1 commit
- **Issue:** Plan specified files at `~/.claude/commands/` which is outside the git repo at `/home/max/git/mowism`. Files cannot be tracked by git.
- **Fix:** Created `commands/` directory in repo and stored canonical copies there, following the same pattern used by Plan 01 (`bin/mow-tools.cjs`). Global install copies also created at `~/.claude/commands/`.
- **Files modified:** Created `commands/` directory with all 7 files
- **Verification:** Both locations verified, content identical
- **Committed in:** ce924ac (Task 1), 30570b9 (Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for git tracking. Files exist at both the repo canonical location and the global install location.

## Issues Encountered

None beyond the deviation noted above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 quality skills are ready for use as standalone Claude Code commands
- Skills can be invoked immediately via `/scope-check`, `/simplify`, `/dead-code-sweep`, `/prove-it`, `/grill-me`, `/change-summary`, `/update-claude-md`
- Plan 05 (refine-phase) can now orchestrate these skills as part of automated quality gates
- Install script (Plan 06) will need to handle copying from `commands/` to `~/.claude/commands/`

## Self-Check: PASSED

- All 7 command files found in repo (`commands/`)
- All 7 command files found at global install (`~/.claude/commands/`)
- Commit `ce924ac` found (Task 1)
- Commit `30570b9` found (Task 2)

---
*Phase: 01-fork-and-foundation*
*Completed: 2026-02-19*
