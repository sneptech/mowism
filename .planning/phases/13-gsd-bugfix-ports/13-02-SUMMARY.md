---
phase: 13-gsd-bugfix-ports
plan: 02
subsystem: tooling
tags: [backup, health-repair, retry-limit, safety-guardrails]

# Dependency graph
requires:
  - phase: 13-01
    provides: core mow-tools bugfix patterns
provides:
  - createPlanningBackup function for pre-repair safety
  - backup-before-repair in health --repair
  - line-by-line diff display after STATE.md regeneration
  - configurable max_task_attempts executor retry limit
affects: [executor-agents, health-repair-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "backup-before-mutate pattern for destructive operations"
    - "warn-at-3/block-at-max graduated retry enforcement"

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - ~/.claude/agents/mow-executor.md

key-decisions:
  - "Backups never auto-deleted; cleanup suggestion is informational only"
  - "Warn at 3 attempts, hard block at max_task_attempts (default 5)"
  - "max_task_attempts stored flat in config, supports nested executor.max_task_attempts lookup"

patterns-established:
  - "createPlanningBackup: timestamped backup of planning docs before destructive ops"
  - "Graduated enforcement: warn threshold < hard limit with configurable max"

requirements-completed: [BUG-07, BUG-05]

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 13 Plan 02: Safety Guardrails Summary

**Backup-before-repair with diff display for health --repair, plus configurable executor retry limits (warn-at-3, block-at-5)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-23T17:56:55Z
- **Completed:** 2026-02-23T18:01:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `createPlanningBackup()` function that copies STATE.md, ROADMAP.md, REQUIREMENTS.md to timestamped `.planning/backups/` directory before any repair action
- Health --repair now shows line-by-line diff between old and new STATE.md after regeneration
- Cleanup suggestion appears when 5+ backups exist (informational only, never auto-deletes)
- Added `max_task_attempts` config (default 5) propagated via `init execute-phase` to executor agents
- Updated mow-executor.md with enforced graduated retry limits (warn at 3, block at max)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add backup-before-repair and diff display** - `a283390` (feat)
2. **Task 2: Add configurable executor retry limit** - `a99c542` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added createPlanningBackup function, backup-before-repair in cmdValidateHealth, max_task_attempts config default and init output
- `~/.claude/agents/mow-executor.md` - Replaced soft FIX ATTEMPT LIMIT with enforced version referencing max_task_attempts config

## Decisions Made
- Backups are never auto-deleted; cleanup suggestion at 5+ backups is informational only (per user decision)
- Warn at attempt 3, hard block at max_task_attempts (default 5) -- graduated enforcement provides visibility before cutoff
- max_task_attempts stored as flat config key with nested executor.max_task_attempts fallback for config flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backup infrastructure ready for any future destructive operations
- Executor retry enforcement active for all future plan executions
- Remaining Phase 13 plan (13-04) can proceed independently

## Self-Check: PASSED

All artifacts verified: SUMMARY.md exists, both task commits found (a283390, a99c542), createPlanningBackup function present, max_task_attempts config present, enforced retry limit in executor agent.

---
*Phase: 13-gsd-bugfix-ports*
*Completed: 2026-02-24*
