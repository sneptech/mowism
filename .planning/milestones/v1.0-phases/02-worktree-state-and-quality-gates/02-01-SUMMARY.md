---
phase: 02-worktree-state-and-quality-gates
plan: 01
subsystem: infra
tags: [worktree, wt, state-tracking, conflict-detection, stale-cleanup, verification-results]

# Dependency graph
requires:
  - phase: 01-fork-and-foundation
    provides: "mow-tools.cjs base with CLI router, helpers, state progression"
provides:
  - "checkWorkTrunk() / requireWorkTrunk() for wt dependency gating"
  - "worktree claim/release/status/update-plan/clean/verify-result subcommands"
  - "silentWorktreeClean() stale entry auto-cleanup on every init"
  - "Worktree Assignments and Verification Results sections in STATE.md"
  - "/mow:worktree-status detail command"
  - "Worktree Assignments summary in /mow:progress"
affects: [02-03-execute-phase-wiring, 02-04-refine-phase, 02-05-verification-chain]

# Tech tracking
tech-stack:
  added: []
  patterns: [worktree-state-in-statemd, silent-cleanup-on-init, conflict-detection-hard-block]

key-files:
  created:
    - commands/mow/worktree-status.md
    - ~/.claude/commands/mow/worktree-status.md
  modified:
    - bin/mow-tools.cjs
    - bin/mow-tools.test.cjs
    - ~/.claude/mowism/workflows/progress.md

key-decisions:
  - "checkWorkTrunk uses POSIX `command` (not `which` or `type`) for portability"
  - "Conflict detection is a hard block (error + exit), not a warning"
  - "Stale cleanup runs silently on every init, wrapped in try/catch to never block"
  - "wt list --format=json used for stale detection, accepts cwd parameter for repo context"
  - "Worktree Assignments table uses em-dash for unset Plan column"

patterns-established:
  - "Silent init hook pattern: silentWorktreeClean() called after requireWorkTrunk() in every cmdInit"
  - "STATE.md section management: ensureWorktreeSection/ensureVerificationSection create sections on demand"
  - "Table-based state: parseWorktreeTable/writeWorktreeTable for structured STATE.md data"

requirements-completed: [WKTR-01, WKTR-02, WKTR-03, GATE-07]

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 2 Plan 1: Worktree State and Quality Gates Primitives Summary

**WorkTrunk dependency gating on all inits, worktree claim/release/conflict/stale-cleanup tracking, and verification results in STATE.md with 10 new tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T05:01:23Z
- **Completed:** 2026-02-19T05:08:19Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- WorkTrunk (wt) is now a hard gate on every /mow:* command init with platform-specific install instructions
- Worktree state tracking with claim/release/status/update-plan/clean/verify-result subcommands
- Conflict detection hard-blocks when a phase is already claimed by another worktree
- Stale worktree entries are auto-released on every init when the worktree no longer exists
- Verification Results section tracks tier/pass/fail/date/blockers in STATE.md
- /mow:progress now shows a Worktree Assignments summary section
- /mow:worktree-status provides a dedicated detail view of all worktree assignments
- All 94 tests pass (10 new worktree tests added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WorkTrunk dependency check and wire into all init functions** - `61341ab` (feat)
2. **Task 2: Add worktree state tracking, conflict detection, stale cleanup, and verification results** - `ba4bb66` (feat)
3. **Task 3: Add worktree summary to /mow:progress and create /mow:worktree-status command** - `18dacc8` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added checkWorkTrunk/requireWorkTrunk, 7 worktree subcommands, silentWorktreeClean, CLI router registration
- `bin/mow-tools.test.cjs` - 10 new tests for worktree commands and WorkTrunk check
- `commands/mow/worktree-status.md` - New dedicated detail command for worktree assignments
- `~/.claude/commands/mow/worktree-status.md` - Installed copy of worktree-status command
- `~/.claude/mowism/workflows/progress.md` - Added Worktree Assignments summary section

## Decisions Made
- Used POSIX `command` instead of `which` or `type` for WorkTrunk detection portability
- Conflict detection is a hard error (process.exit), not a warning with confirmation
- Stale cleanup is silent (no output) unless it actually cleans something
- Em-dash used for unset Plan column in worktree assignments table
- getActiveWorktrees() accepts cwd parameter so wt list runs in correct git repo context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All worktree primitives are ready for Plans 02-03 (execute-phase wiring) and 02-04 (refine-phase)
- claim/release will be wired into execute-phase workflow (Plan 02-03)
- verify-result will be called by refine-phase workflow (Plan 02-04)

## Self-Check: PASSED

All 5 files verified on disk. All 3 task commits verified in git log.

---
*Phase: 02-worktree-state-and-quality-gates*
*Completed: 2026-02-19*
