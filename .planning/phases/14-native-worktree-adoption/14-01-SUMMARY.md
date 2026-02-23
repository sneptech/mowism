---
phase: 14-native-worktree-adoption
plan: 01
subsystem: infra
tags: [worktree, hooks, claude-code, lifecycle]

# Dependency graph
requires: []
provides:
  - WorktreeCreate and WorktreeRemove hook scripts for Claude Code native worktree lifecycle
  - cmdWorktreeCreateNative function for phase worktree creation at .claude/worktrees/
  - cmdWorktreeRemoveManifest function for manifest cleanup on worktree removal
  - settings.json with hook registration
affects: [14-02, 14-03, 14-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [WorktreeCreate/WorktreeRemove hook delegation, phase-NN naming convention filter, .claude/worktrees/ path convention]

key-files:
  created:
    - .claude/settings.json
    - .claude/hooks/mow-worktree-create.sh
    - .claude/hooks/mow-worktree-remove.sh
  modified:
    - bin/mow-tools.cjs

key-decisions:
  - "Phase worktrees at .claude/worktrees/phase-NN (not .worktrees/pNN) for native Claude Code convention"
  - "Manifest key uses worktree name (phase-NN) instead of old pNN convention"
  - "Non-phase worktrees get plain git behavior without Mowism coordination"
  - "Remove hook always exits 0 with best-effort cleanup (cannot block removal)"

patterns-established:
  - "Hook scripts use jq with Node.js fallback for JSON parsing portability"
  - "Phase detection via ^phase-[0-9]+$ regex in both shell and JavaScript"
  - "All diagnostic output to stderr, only worktree path to stdout in hooks"

requirements-completed: [WKT-01, WKT-02, WKT-03]

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 14 Plan 01: Hook Scripts and Native Worktree Creation Summary

**WorktreeCreate/WorktreeRemove hooks with settings.json registration and cmdWorktreeCreateNative for phase worktree setup at .claude/worktrees/**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-23T18:52:14Z
- **Completed:** 2026-02-23T18:56:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- WorktreeCreate hook script that filters by phase-NN naming convention and delegates to mow-tools.cjs create-native
- WorktreeRemove hook script with best-effort cleanup (release claim, remove manifest entry, clear dashboard)
- settings.json hook registration for both WorktreeCreate and WorktreeRemove events
- cmdWorktreeCreateNative function with .planning/ copy, STATUS.md init, manifest coordination, and reuse detection
- cmdWorktreeRemoveManifest with merged/unmerged distinction (keep unmerged entries for potential merge)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create hook scripts and settings.json** - `2c1f86b` (feat)
2. **Task 2: Add cmdWorktreeCreateNative and remove-manifest subcommand** - `57a59af` (feat)

## Files Created/Modified
- `.claude/settings.json` - Hook registration for WorktreeCreate and WorktreeRemove events
- `.claude/hooks/mow-worktree-create.sh` - WorktreeCreate hook, delegates phase worktrees to mow-tools.cjs, plain git for non-phase names
- `.claude/hooks/mow-worktree-remove.sh` - WorktreeRemove hook, best-effort cleanup with uncommitted changes warning
- `bin/mow-tools.cjs` - Added cmdWorktreeCreateNative and cmdWorktreeRemoveManifest functions with CLI dispatch

## Decisions Made
- Phase worktrees placed at `.claude/worktrees/phase-NN` (new path convention matching Claude Code native worktree location) rather than `.worktrees/pNN` (old convention)
- Manifest key uses worktree name `phase-NN` instead of old `pNN` convention for consistency with directory naming
- Non-phase worktrees get plain `git worktree add` without any Mowism coordination overhead
- Remove hook always exits 0 with best-effort cleanup since removal cannot be blocked by hooks
- Existing `cmdWorktreeCreate` left untouched for backward compatibility (removal planned in 14-04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hook scripts and CLI commands ready for Plan 02 (settings.json merging and hook testing)
- Plan 03 and 04 can build on the new worktree path convention (.claude/worktrees/)
- Old cmdWorktreeCreate coexists for backward compatibility until Plan 04 removes it

## Self-Check: PASSED

All created files verified present. All commit hashes verified in git log.

---
*Phase: 14-native-worktree-adoption*
*Completed: 2026-02-24*
