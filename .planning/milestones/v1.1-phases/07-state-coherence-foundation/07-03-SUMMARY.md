---
phase: 07-state-coherence-foundation
plan: 03
subsystem: state
tags: [state-management, multi-agent, coordinator, markdown-table]

requires: []
provides:
  - "Active Phases table in STATE.md template"
  - "state active-phases CLI subcommand"
  - "state update-phase-row CLI subcommand"
  - "parseActivePhasesTable and writeActivePhasesTable helpers"
  - "computeNextUnblockable helper"
affects: ["coordinator workflows", "execute-phase orchestrator", "multi-agent state tracking"]

tech-stack:
  added: []
  patterns:
    - "Active Phases table: coordinator-owned dashboard for parallel phase tracking"
    - "Consistent |`-split-and-trim table parsing pattern (matches worktree/teammate parsers)"

key-files:
  created: []
  modified:
    - "mowism/templates/state.md"
    - "bin/mow-tools.cjs"
    - "bin/mow-tools.test.cjs"

key-decisions:
  - "Keep Current Position section alongside Active Phases for backward compatibility with single-agent mode"
  - "Require --name and --status for new row insertion; partial updates only need the fields being changed"
  - "Auto-sort inserted rows by phase number to maintain ordered table"
  - "computeNextUnblockable tracks blocked phases and reports which has fewest remaining dependencies"

patterns-established:
  - "Active Phases table: section-based markdown table with coordinator-only write semantics"
  - "Phase status values: not started, executing, complete, blocked (N,M), failed"

requirements-completed: [STATE-04]

duration: 6min
completed: 2026-02-20
---

# Phase 7 Plan 3: Active Phases Table Summary

**Multi-phase coordinator dashboard in STATE.md with active-phases query and update-phase-row atomic row operations**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T04:52:15Z
- **Completed:** 2026-02-20T04:57:50Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- STATE.md template now includes Active Phases table section for multi-agent coordinator view
- Two new mow-tools.cjs subcommands: `state active-phases` (read/parse) and `state update-phase-row` (atomic update/insert)
- 7 tests covering parsing, insert, update, field preservation, Next unblockable recalculation, and round-trip integrity
- All 126 tests pass (zero failures, zero regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update STATE.md template and add Active Phases subcommands** - `da8e661` (feat)
2. **Task 2: Add tests for Active Phases table operations** - `3b0feff` (test)

## Files Created/Modified
- `mowism/templates/state.md` - Added Active Phases table section and documentation in template
- `bin/mow-tools.cjs` - Added parseActivePhasesTable, writeActivePhasesTable, computeNextUnblockable, cmdStateActivePhases, cmdStateUpdatePhaseRow functions and CLI routing
- `bin/mow-tools.test.cjs` - Added 7 tests for Active Phases table operations

## Decisions Made
- Kept Current Position section alongside Active Phases for backward compatibility -- both coexist as v1.0 single-agent view and v1.1 multi-agent view
- Required --name and --status for inserting new rows to prevent incomplete entries
- Auto-sort rows by phase number on insert to keep the table ordered
- Used consistent |`-split-and-trim pattern matching existing worktree and teammate table parsers
- computeNextUnblockable examines blocked statuses and returns the phase closest to being unblocked

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Active Phases table is ready for coordinator consumption
- The `state update-phase-row` command is the write primitive the coordinator will use to maintain the dashboard
- Phase status values and table schema are established as the contract for future coordinator integration

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 07-state-coherence-foundation*
*Completed: 2026-02-20*
