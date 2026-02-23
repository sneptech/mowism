---
phase: 13-gsd-bugfix-ports
plan: 04
subsystem: tooling
tags: [todo, lifecycle, workflow, cli]

requires:
  - phase: 13-02
    provides: "safety guardrails and executor retry patterns"
provides:
  - "3-state todo lifecycle: pending -> in-progress -> completed"
  - "cmdTodoStart function with file-overlap interference detection"
  - "cmdTodoComplete fallback to in-progress/ when not in pending/"
  - "cmdListTodos and cmdInitTodos scan both directories with state field"
  - "check-todos workflow with in-progress section and start/continue/complete actions"
affects: [check-todos, add-todo, worktree-parallelism]

tech-stack:
  added: []
  patterns: ["3-state file-based lifecycle with directory moves", "interference detection via file-path overlap"]

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - mowism/workflows/check-todos.md

key-decisions:
  - "No limit on concurrent in-progress todos"
  - "In-progress todos persist across sessions (no auto-revert)"
  - "Interference detection is file-path overlap only (not content-based)"

patterns-established:
  - "Todo state as directory location: pending/, in-progress/, completed/"
  - "Started timestamp prepended to content on state transition"

requirements-completed: [BUG-09]

duration: 5min
completed: 2026-02-24
---

# Phase 13 Plan 04: In-Progress Todo State Summary

**3-state todo lifecycle with pending/in-progress/completed directories, interference detection, and updated check-todos workflow**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-23T18:04:26Z
- **Completed:** 2026-02-23T18:09:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `cmdTodoStart` function that moves todos from pending/ to in-progress/ with file-overlap interference warnings
- Updated `cmdTodoComplete` to check both pending/ and in-progress/ as source directories with `from` field in output
- Updated `cmdListTodos` and `cmdInitTodos` to scan both directories, showing in-progress first with state field and in_progress_count
- Updated check-todos workflow with "Currently working on" section, start/continue/complete/put-it-back actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add todo start subcommand and update todo complete, list, and init functions** - `b2ee421` (feat)
2. **Task 2: Update check-todos workflow to show in-progress section** - `2f0e090` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added cmdTodoStart, updated cmdTodoComplete/cmdListTodos/cmdInitTodos for 3-state lifecycle, registered todo start in dispatcher
- `mowism/workflows/check-todos.md` - Added in-progress display section, start/continue/complete/put-it-back actions, updated git commit step for new file paths

## Decisions Made
- No limit on concurrent in-progress todos (per user decision from planning phase)
- In-progress todos persist across sessions with no auto-revert logic
- Interference detection checks file-path overlap only (lightweight, sufficient for worktree awareness)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Todo 3-state lifecycle complete, ready for worktree parallelism awareness
- Phase 13 plans all executed (01-05)
- Phase 14 (native worktree adoption) can proceed independently

## Self-Check: PASSED

---
*Phase: 13-gsd-bugfix-ports*
*Completed: 2026-02-24*
