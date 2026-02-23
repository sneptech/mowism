---
phase: 16-auto-advance-pipeline
plan: 01
subsystem: orchestration
tags: [auto-advance, dag, pipeline, cli, workflow]

# Dependency graph
requires:
  - phase: 15-full-lifecycle-workers
    provides: Full-lifecycle worker agents that chain discuss/research/plan/execute/refine
  - phase: 08-dag-based-phase-scheduling
    provides: DAG analysis and topological sort infrastructure in mow-tools.cjs
provides:
  - "/mow:auto slash command entry point for full-milestone pipeline execution"
  - "cmdInitAuto mow-tools.cjs function for DAG state detection, milestone boundaries, resume support"
  - "Auto-advance orchestration workflow with 9 steps covering init, resume, delegation, fallback, context window, milestone boundary"
affects: [mow-team-lead, transition, execute-phase, plan-phase, discuss-phase]

# Tech tracking
tech-stack:
  added: []
  patterns: [analyzeDagInternal helper extraction for reuse, thin command + workflow delegation]

key-files:
  created:
    - commands/mow/auto.md
    - mowism/workflows/auto.md
  modified:
    - bin/mow-tools.cjs

key-decisions:
  - "Extracted analyzeDagInternal() helper from cmdRoadmapAnalyzeDag for reuse by cmdInitAuto"
  - "Milestone phase extraction parses ROADMAP.md 'In Progress' section for phase number scoping"
  - "AUTO-06 documented as deferred per locked discuss-phase decision (no arguments)"

patterns-established:
  - "Internal helper extraction pattern: extract core logic into *Internal() function, have cmd* wrapper call it"

requirements-completed: [AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06]

# Metrics
duration: 6min
completed: 2026-02-24
---

# Phase 16 Plan 01: Auto-Advance Pipeline Command & Workflow Summary

**/mow:auto command with cmdInitAuto DAG detection, 9-step orchestration workflow covering resume, team lead delegation, sequential fallback, and milestone boundary handling**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T21:48:42Z
- **Completed:** 2026-02-23T21:54:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `cmdInitAuto` function to mow-tools.cjs with DAG state detection, milestone phase scoping, resume info, and Agent Teams status
- Refactored `cmdRoadmapAnalyzeDag` to use extracted `analyzeDagInternal()` helper for reuse without duplication
- Created `/mow:auto` command file with proper YAML frontmatter, allowed tools, and ??? help detection
- Created auto-advance orchestration workflow with 9 steps covering the full pipeline lifecycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cmdInitAuto function and CLI routing** - `0f447dd` (feat)
2. **Task 2: Create /mow:auto command file and orchestration workflow** - `5a4ea2b` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added analyzeDagInternal() helper, cmdInitAuto() function, CLI routing for 'init auto'
- `commands/mow/auto.md` - /mow:auto slash command entry point with YAML frontmatter and Agent Teams tools
- `mowism/workflows/auto.md` - Auto-advance orchestration workflow with 9 steps: initialize, resume_detection, set_auto_advance, check_agent_teams, team_lead_delegation, sequential_fallback, context_window_awareness, verification_failure, milestone_boundary

## Decisions Made
- Extracted `analyzeDagInternal()` as a reusable helper rather than duplicating DAG logic in cmdInitAuto -- keeps single source of truth
- Milestone phase extraction uses ROADMAP.md "In Progress" section parsing with regex for phase checkbox lines
- AUTO-06 (optional phase range) documented as deferred in both command and workflow files per locked discuss-phase decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /mow:auto command is ready for use
- Plan 02 (dashboard auto-advance banner) can proceed to extend dashboard render with milestone-wide progress
- All infrastructure for auto-advance pipeline is in place

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 16-auto-advance-pipeline*
*Completed: 2026-02-24*
