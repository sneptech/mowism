---
phase: 02-worktree-state-and-quality-gates
plan: 03
subsystem: infra
tags: [worktree, wt, post-create-hook, execute-phase, claim-release, auto-configure]

# Dependency graph
requires:
  - phase: 02-01
    provides: "worktree claim/release/update-plan/clean subcommands in mow-tools.cjs"
provides:
  - ".config/wt.toml with post-create hook for .planning/ copy"
  - "ensureWtConfig() auto-configure function in mow-tools.cjs"
  - "execute-phase.md worktree claim on initialize"
  - "execute-phase.md worktree update-plan in execution loop"
  - "execute-phase.md worktree release on successful completion"
  - "execute-phase.md refine-phase suggestion after verification"
affects: [02-04-refine-phase, 02-05-verification-chain]

# Tech tracking
tech-stack:
  added: []
  patterns: [post-create-hook-planning-copy, auto-configure-wt-toml, claim-release-lifecycle]

key-files:
  created:
    - .config/wt.toml
  modified:
    - bin/mow-tools.cjs
    - ~/.claude/mowism/workflows/execute-phase.md

key-decisions:
  - "Auto-configure wt.toml on execute-phase init (non-destructive, no user approval needed)"
  - "Worktree claim happens after phase validation, not before"
  - "Failed executions preserve the claim for resume (not auto-released)"
  - "Refine-phase suggestion only shown when verification passed (not if gaps_found)"

patterns-established:
  - "Post-create hook pattern: WorkTrunk template variables {{ primary_worktree_path }} and {{ worktree_path }}"
  - "Auto-configure pattern: ensureWtConfig() creates or patches .config/wt.toml idempotently"
  - "Claim lifecycle: claim on init -> update-plan per execution -> release on completion"

requirements-completed: [WKTR-04, WKTR-05]

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 2 Plan 3: WorkTrunk Hook and Execute-Phase Wiring Summary

**Post-create hook for .planning/ copy to new worktrees, with execute-phase claim/release lifecycle and auto-configure logic for wt.toml**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T05:12:17Z
- **Completed:** 2026-02-19T05:17:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- .config/wt.toml created with post-create hook that copies .planning/ from main worktree to new worktrees
- Post-create hook verifies STATE.md exists after copy, fails visibly if not found
- ensureWtConfig() function auto-creates or updates wt.toml on execute-phase init
- execute-phase.md now claims the phase on initialize (hard block if already claimed by another worktree)
- execute-phase.md updates worktree plan progress before spawning each plan's agent
- execute-phase.md releases the worktree claim after successful phase completion
- execute-phase.md offers /mow:refine-phase as next step after verification passes
- Failure handling documented: claims preserved on failure for resume, stale cleanup handles removed worktrees
- All 94 tests pass (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create .config/wt.toml with post-create hook and auto-configure logic** - `4a0c234` (feat)
2. **Task 2: Update execute-phase workflow with worktree claim/release** - No git commit (file lives outside repo at ~/.claude/mowism/workflows/execute-phase.md, tracked via planning artifacts only)

## Files Created/Modified
- `.config/wt.toml` - Post-create hook with planning copy, STATE.md verification, and WorkTrunk template variables
- `bin/mow-tools.cjs` - Added ensureWtConfig() function and WT_CONFIG_CONTENT/WT_PLANNING_COPY_HOOK constants, wired into cmdInitExecutePhase
- `~/.claude/mowism/workflows/execute-phase.md` - Added worktree claim (initialize), update-plan (execute_waves), release (update_roadmap), refine-phase offer (offer_next), claim-on-failure note (failure_handling)

## Decisions Made
- Auto-configure wt.toml on execute-phase init since the hook is non-destructive (copies files only)
- Claim happens after phase validation to avoid claiming a non-existent phase
- Failed executions preserve the claim so user can resume with /mow:execute-phase
- Refine-phase suggestion placed before auto-advance logic, only shown when verification passes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - WorkTrunk post-create hook is configured automatically when execute-phase runs.

## Next Phase Readiness
- Worktree claim/release lifecycle is complete and wired into execute-phase
- Plan 02-04 (refine-phase) can now use verify-result tracking built in 02-01
- Plan 02-05 (verification chain) can build on the complete worktree-aware execution flow

## Self-Check: PASSED

All 3 files verified on disk. Task 1 commit verified in git log. Task 2 file (execute-phase.md) verified at ~/.claude/mowism/workflows/.

---
*Phase: 02-worktree-state-and-quality-gates*
*Completed: 2026-02-19*
