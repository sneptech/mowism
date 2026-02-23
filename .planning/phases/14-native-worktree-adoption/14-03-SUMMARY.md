---
phase: 14-native-worktree-adoption
plan: 03
subsystem: infra
tags: [worktree, migration, cleanup, backward-compat]

# Dependency graph
requires:
  - phase: 14-02
    provides: Path references migrated to .claude/worktrees/phase-NN, dual-path manifest lookup
provides:
  - cmdWorktreeMigrate function for safe .worktrees/ to .worktrees.bak migration
  - checkMigrationNeeded helper detecting legacy .worktrees/ directories
  - cmdWorktreeCleanBackup for removing .worktrees.bak after migration
  - Migration detection warning in 5 main init functions
  - Cleanup offer in /mow:complete-milestone for .worktrees.bak
affects: [14-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [safe migration via rename (never delete), active worktree detection before migration, pNN-to-phase-NN manifest key conversion]

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - commands/mow/complete-milestone.md

key-decisions:
  - "Migration renames .worktrees/ to .worktrees.bak (never deletes) for safe rollback"
  - "Active git worktrees in .worktrees/ block migration with actionable error listing which to remove"
  - "Manifest key conversion from pNN to phase-NN happens during migration"
  - "Backups never auto-deleted; cleanup is always user-initiated via clean-backup command"

patterns-established:
  - "Migration safety: rename to .bak, never auto-delete user data"
  - "Active worktree detection: parse git worktree list --porcelain to find worktrees under a specific directory"

requirements-completed: [WKT-06]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 14 Plan 03: Worktree Migration Script Summary

**Safe migration from .worktrees/pNN to .claude/worktrees/phase-NN with active worktree detection, manifest conversion, and cleanup tooling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T19:06:15Z
- **Completed:** 2026-02-23T19:09:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- checkMigrationNeeded helper detects legacy .worktrees/ directories and returns entry count and manifest presence
- cmdWorktreeMigrate safely renames .worktrees/ to .worktrees.bak with active worktree blocking
- Manifest entries converted from pNN keys to phase-NN keys with updated paths during migration
- Five main init functions (cmdInitExecutePhase, cmdInitPlanPhase, cmdInitNewProject, cmdInitNewMilestone, cmdInitResume) print migration warning
- cmdWorktreeCleanBackup provides user-initiated .worktrees.bak removal
- /mow:complete-milestone offers cleanup suggestion for .worktrees.bak

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cmdWorktreeMigrate function and checkMigrationNeeded helper** - `32c92d7` (feat)
2. **Task 2: Add .worktrees.bak cleanup offer to complete-milestone command** - `adcad62` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added checkMigrationNeeded, cmdWorktreeMigrate, cmdWorktreeCleanBackup functions; migration detection in 5 init functions; CLI dispatch for migrate and clean-backup subcommands
- `commands/mow/complete-milestone.md` - Added informational step about .worktrees.bak cleanup with clean-backup command reference

## Decisions Made
- Migration renames .worktrees/ to .worktrees.bak (never deletes) for safe rollback
- Active git worktrees in .worktrees/ block migration with actionable error listing which to remove
- Manifest key conversion from pNN to phase-NN happens during migration with path updates
- Backups never auto-deleted; cleanup is always user-initiated via clean-backup command

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Migration path complete for v1.1 to v1.2 upgrades
- Plan 04 can proceed with removing old cmdWorktreeCreate function (final cleanup)
- All worktree coordination functions now operate on .claude/worktrees/phase-NN paths

## Self-Check: PASSED

All created files verified present. All commit hashes verified in git log.

---
*Phase: 14-native-worktree-adoption*
*Completed: 2026-02-24*
