---
phase: 13-gsd-bugfix-ports
plan: 03
subsystem: workflows
tags: [discuss-phase, plan-phase, branching, ambiguity-detection, probing]

# Dependency graph
requires:
  - phase: none
    provides: none
provides:
  - Branch creation at discuss-phase start when branching_strategy is "phase"
  - Ambiguity detection during discuss-phase probing with trade-off reframing
  - Verified plan-phase context warning and discuss-phase ordering guards
affects: [discuss-phase, plan-phase, execute-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ambiguity detection with single-reframe-then-defer pattern"
    - "Branching strategy guard at workflow entry point"

key-files:
  created: []
  modified:
    - mowism/workflows/discuss-phase.md
    - ~/.claude/mowism/workflows/discuss-phase.md

key-decisions:
  - "Branch creation uses config-get for branching_strategy rather than parsing state JSON"
  - "Ambiguity reframe limited to one attempt to respect user time"
  - "BUG-06 plan-phase context warning verified as already correctly implemented"

patterns-established:
  - "Workflow guard steps: check config state before proceeding to user interaction"
  - "Ambiguity detection: pattern match -> reframe -> defer to discretion"

requirements-completed: [BUG-03, BUG-06, BUG-11]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 13 Plan 03: Workflow Fixes Summary

**Early branch creation at discuss-phase start, verified ordering guards, and gray-area ambiguity detection with trade-off reframing in probing flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T17:48:15Z
- **Completed:** 2026-02-23T17:51:06Z
- **Tasks:** 2
- **Files modified:** 1 (repo) + 1 (installed copy)

## Accomplishments
- Added `handle_branching` step to discuss-phase.md that creates feature branch at phase start when branching_strategy is "phase" (BUG-03)
- Verified plan-phase context warning already correctly implemented -- checks `context_content`, offers "Continue without context" and "Run discuss-phase first" (BUG-06)
- Verified discuss-phase ordering guard already correctly implemented -- checks `has_plans` and warns user when plans exist without context (BUG-06)
- Added ambiguity detection to discuss-phase probing that catches vague answers and reframes as concrete trade-offs before recording decisions (BUG-11)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create feature branch at discuss-phase start and add workflow ordering guards** - `98e57db` (feat)
2. **Task 2: Add gray-area ambiguity detection to discuss-phase probing** - `162c55c` (feat)

## Files Created/Modified
- `mowism/workflows/discuss-phase.md` - Added handle_branching step after init (BUG-03), added ambiguity detection in discuss_areas step (BUG-11)
- `~/.claude/mowism/workflows/discuss-phase.md` - Installed copy updated with same changes

## Decisions Made
- BUG-06 (plan-phase context warning): Verified as already correctly implemented in plan-phase.md step 4 and discuss-phase.md check_existing step. No code changes needed.
- Branch creation reads `branching_strategy` via `config-get` command rather than parsing state JSON -- simpler and more robust.
- Ambiguity detection placed inside `discuss_areas` step after the question-asking loop but before the area-complete check, so it applies to every user response.
- Single-reframe limit chosen to balance decision quality with user patience.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Workflow files live outside the git repo (`~/.claude/mowism/`) and also inside it (`mowism/workflows/`). Both copies needed updating. The repo copy is the source of truth; the installed copy is what runs in practice.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- discuss-phase.md now handles branching and ambiguity detection
- plan-phase.md context warning confirmed functional
- All workflow files remain valid markdown with correct step structure
- No mow-tools.cjs changes -- parallel-safe with Plan 01

## Self-Check: PASSED

- FOUND: 13-03-SUMMARY.md
- FOUND: 98e57db (Task 1 commit)
- FOUND: 162c55c (Task 2 commit)
- FOUND: discuss-phase.md (repo copy)

---
*Phase: 13-gsd-bugfix-ports*
*Completed: 2026-02-24*
