---
phase: 09-multi-phase-execution-engine
plan: 03
subsystem: infra
tags: [close-shop, multi-phase, graceful-shutdown, worktree, execute-phase]

requires:
  - phase: 09-multi-phase-execution-engine
    provides: Worktree lifecycle subcommands and team lead orchestrator (Plans 01-02)
provides:
  - /mow:close-shop command for graceful multi-phase session shutdown
  - Multi-phase mode awareness in execute-phase.md (team lead delegation, worker worktree guards)
  - Pause-work signal support for workers
affects: [multi-phase-execution, team-lead-orchestration, phase-workers]

tech-stack:
  added: []
  patterns: [worktree-context-guards, multi-phase-delegation]

key-files:
  created:
    - mowism/workflows/close-shop.md
    - commands/mow/close-shop.md
    - help/close-shop.md
  modified:
    - mowism/workflows/execute-phase.md

key-decisions:
  - "Help file placed in help/ directory (not mowism/help/ which does not exist) matching existing help file convention"
  - "Worktree context detection uses .worktrees/pNN path convention for worker vs main worktree distinction"
  - "Worker worktrees skip ROADMAP.md and REQUIREMENTS.md updates to avoid merge conflicts -- lead handles post-merge"

patterns-established:
  - "Worktree context guard pattern: conditional behavior based on .worktrees/ path detection"
  - "Multi-phase delegation: execute-phase.md routes to team lead instead of direct plan execution"

requirements-completed: [EXEC-01, EXEC-02]

duration: 3min
completed: 2026-02-20
---

# Phase 9 Plan 03: Close-Shop Workflow & Multi-Phase Execute-Phase Awareness Summary

**Graceful multi-phase shutdown via /mow:close-shop with 6-step workflow, plus execute-phase.md multi-phase routing and worker worktree guards**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T07:35:56Z
- **Completed:** 2026-02-20T07:38:50Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Close-shop workflow with 6 steps: check worker status, handle pending merges, capture deferred items/context, update STATE.md, shutdown workers, produce final report
- /mow:close-shop command entry with standard YAML frontmatter, help detection, and execution context references
- Help file following established format with usage, what-happens, examples, and related commands
- execute-phase.md multi_phase_check step: detects --multi-phase flag or .worktrees/ context, delegates to team lead for parallel execution or continues standard flow
- Worker worktree guards in update_roadmap and offer_next: skip ROADMAP.md/REQUIREMENTS.md updates and auto-advance when inside .worktrees/pNN
- Pause-work signal support: stash uncommitted changes, write checkpoint, exit cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create close-shop workflow and command** - `07ef90f` (feat)
2. **Task 2: Update execute-phase.md for multi-phase mode awareness** - `44e5206` (feat)

## Files Created/Modified
- `mowism/workflows/close-shop.md` - 6-step graceful shutdown workflow (check status, pending merges, capture context, update state, shutdown workers, report)
- `commands/mow/close-shop.md` - Claude Code command entry with YAML frontmatter and help detection block
- `help/close-shop.md` - User-facing help documentation for /mow:close-shop
- `mowism/workflows/execute-phase.md` - Added multi_phase_check step, worktree guards in update_roadmap and offer_next, pause-work signal support

## Decisions Made
- Help file placed in `help/` directory matching existing convention (plan specified `mowism/help/` which does not exist)
- Worktree context detection uses `.worktrees/pNN` path convention -- simple, reliable, and consistent with Plan 01's worktree naming
- Worker worktrees skip ROADMAP.md and REQUIREMENTS.md updates to avoid merge conflicts between concurrent phase workers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Help file path correction**
- **Found during:** Task 1 (Create close-shop workflow and command)
- **Issue:** Plan specified `mowism/help/close-shop.md` but no `mowism/help/` directory exists -- help files live in `help/`
- **Fix:** Created file at `help/close-shop.md` matching existing help files (execute-phase.md, progress.md, etc.)
- **Files modified:** help/close-shop.md
- **Verification:** File exists at correct path alongside other help files
- **Committed in:** 07ef90f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Path correction necessary for consistency with existing codebase. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Close-shop workflow complete -- team lead can invoke it or user can run /mow:close-shop directly
- execute-phase.md is multi-phase aware -- detects context and delegates or adjusts behavior
- Phase 9 infrastructure complete: worktree lifecycle (Plan 01), team lead orchestrator (Plan 02), close-shop and multi-phase integration (Plan 03)

## Self-Check: PASSED

All files verified on disk (5/5). All commits verified in git log (2/2).

---
*Phase: 09-multi-phase-execution-engine*
*Completed: 2026-02-20*
