---
phase: 08-dag-based-phase-scheduling
plan: 02
subsystem: tooling
tags: [dag, topological-sort, kahn-bfs, roadmap, mow-tools, cli]

# Dependency graph
requires:
  - phase: 08-01
    provides: "parseDependsOn() function and fixed regex patterns for dependency extraction"
provides:
  - topoGenerations() function implementing Kahn's BFS with generation grouping
  - cmdRoadmapAnalyzeDag() command handler producing phases, waves, ready, blocked, completed, validation
  - roadmap analyze-dag subcommand with --raw JSON and human-readable text output
affects: [08-03, 09]

# Tech tracking
tech-stack:
  added: []
  patterns: [Kahn's BFS topological sort with generation grouping for parallel wave computation]

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - bin/mow-tools.test.cjs

key-decisions:
  - "Duplicated phase parsing logic in cmdRoadmapAnalyzeDag rather than refactoring cmdRoadmapAnalyze into shared helper -- lower risk, no breaking changes to existing consumers"
  - "Missing dependency references treated as satisfied (warning only) so DAG analysis is not blocked by typos or out-of-scope references"
  - "Human-readable mode prints text visualization directly; raw mode returns full JSON via output() helper"

patterns-established:
  - "topoGenerations(nodes, edges) returns array-of-arrays (generations) for BFS wave grouping"
  - "analyze-dag output schema: phases, waves, ready, blocked, completed, validation"

requirements-completed: [DAG-02]

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 08 Plan 02: DAG Analysis via Topological Sort Summary

**Kahn's BFS topological sort with generation grouping producing execution waves, ready/blocked status, and cycle detection via roadmap analyze-dag CLI subcommand**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T06:06:54Z
- **Completed:** 2026-02-20T06:11:12Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 2

## Accomplishments
- Implemented topoGenerations() function (~35 lines, zero dependencies) for Kahn's BFS with generation grouping
- Added cmdRoadmapAnalyzeDag() command handler producing full DAG analysis JSON (phases, waves, ready, blocked, completed, validation)
- Wired roadmap analyze-dag subcommand with both --raw JSON and human-readable text visualization modes
- TDD test suite: 7 test cases covering diamond, linear, independent, cycle detection, missing references, ready/blocked status, and missing ROADMAP.md error

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for DAG analysis (RED)** - `6ee529e` (test)
2. **Task 2: Implement topoGenerations, cmdRoadmapAnalyzeDag, wire subcommand (GREEN)** - `6ca67d7` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added topoGenerations() function, cmdRoadmapAnalyzeDag() command handler, analyze-dag subcommand dispatch wiring
- `bin/mow-tools.test.cjs` - Added 7 analyze-dag test cases (diamond, linear, independent, cycle, missing-ref, ready/blocked, error)

## Decisions Made
- Duplicated phase parsing logic (~60 lines) in cmdRoadmapAnalyzeDag rather than extracting a shared helper from cmdRoadmapAnalyze. This avoids any risk of breaking existing roadmap analyze consumers while keeping the implementation self-contained.
- Missing dependency references (e.g., Phase 99 that doesn't exist in ROADMAP.md) are treated as satisfied with a warning in missing_refs, rather than blocking analysis. This is more useful for real-world roadmaps where typos or cross-milestone references may occur.
- depended_by reverse edges included in output so consumers can determine "when Phase X completes, what becomes unblocked?" without re-running full analysis.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- topoGenerations() and roadmap analyze-dag are ready for Plan 03 (DAG agent integration) to consume
- The analyze-dag output schema matches the Pattern 3 format from 08-RESEARCH.md
- v1.1 roadmap correctly produces Wave 1 = [7, 8], Wave 2 = [9, 10], Wave 3 = [11]
- Phase 9 (execution engine) can consume this output to determine parallel execution groups

## Self-Check: PASSED

- All files exist on disk
- All commits verified in git log

---
*Phase: 08-dag-based-phase-scheduling*
*Completed: 2026-02-20*
