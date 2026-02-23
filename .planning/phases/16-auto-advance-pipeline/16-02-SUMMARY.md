---
phase: 16-auto-advance-pipeline
plan: 02
subsystem: feedback
tags: [dashboard, auto-advance, milestone-progress, banner]

# Dependency graph
requires:
  - phase: 16-auto-advance-pipeline
    provides: "ROADMAP.md milestone section structure for phase counting"
provides:
  - "Dashboard auto-advance milestone banner when workflow.auto_advance is true"
  - "Raw JSON auto_advance stats for programmatic consumers"
affects: [auto-advance-pipeline, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ROADMAP.md inline parsing for milestone stats", "conditional banner rendering with color fallback"]

key-files:
  created: []
  modified: ["bin/mow-tools.cjs"]

key-decisions:
  - "Inline ROADMAP.md parsing instead of analyzeDagInternal (function not yet available from Plan 16-01)"
  - "Banner uses 256-color blue background (27) with white foreground (231) for visual prominence"
  - "Banner renders in both active-phases and no-active-phases code paths"

patterns-established:
  - "Conditional dashboard banner: check config flag, compute stats from ROADMAP.md, prepend to lines array"

requirements-completed: [AUTO-07]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 16 Plan 02: Auto-Advance Dashboard Banner Summary

**Milestone-wide AUTO-ADVANCE progress banner in dashboard showing current phase, total phases, and completion percentage from ROADMAP.md**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T21:48:43Z
- **Completed:** 2026-02-23T21:51:21Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Dashboard prepends AUTO-ADVANCE banner when `workflow.auto_advance` is true in config
- Banner shows current phase number, total milestone phases, completion percentage, and completed count
- Banner uses 256-color styled output with plain text fallback for non-color terminals
- Raw JSON output includes `auto_advance` stats object for programmatic consumers
- Banner renders correctly even with no active phase rows (pipeline just started)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auto-advance milestone banner to cmdDashboardRender** - `142844c` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Extended cmdDashboardRender with auto-advance milestone banner, inline ROADMAP.md parsing for milestone stats, and raw JSON auto_advance output

## Decisions Made
- Used inline ROADMAP.md parsing rather than depending on `analyzeDagInternal` from Plan 16-01, since that function does not yet exist (plans may execute in parallel)
- Banner format: `AUTO-ADVANCE  Phase {current}/{total}  Milestone: {pct}%  {done}/{total} done`
- 256-color styling (blue bg #27, white fg #231) consistent with existing color256 utility usage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dashboard auto-advance banner is operational and tested
- Phase 16 pipeline infrastructure (Plan 01 + Plan 02) provides the foundation for auto-advance execution

## Self-Check: PASSED

- [x] bin/mow-tools.cjs exists
- [x] 16-02-SUMMARY.md exists
- [x] Commit 142844c exists in git log

---
*Phase: 16-auto-advance-pipeline*
*Completed: 2026-02-24*
