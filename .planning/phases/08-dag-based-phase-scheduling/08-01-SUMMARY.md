---
phase: 08-dag-based-phase-scheduling
plan: 01
subsystem: tooling
tags: [regex, parsing, dag, roadmap, mow-tools]

# Dependency graph
requires: []
provides:
  - parseDependsOn() function for structured dependency extraction
  - Fixed regex patterns supporting both **Field:** and **Field**: formats
  - depends_on_parsed field in roadmap analyze output
affects: [08-02, 08-03, 09]

# Tech tracking
tech-stack:
  added: []
  patterns: [regex alternation (?:**:|:**) for dual-format markdown field matching]

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - bin/mow-tools.test.cjs

key-decisions:
  - "Used regex alternation (?:\\*\\*:|:\\*\\*) instead of optional quantifiers \\*?\\*? to correctly handle both colon-inside-bold and colon-outside-bold formats"
  - "phase add and phase insert retain current default behavior (generate colon-inside-bold); DAG agent handles re-analysis after manual changes"
  - "parseDependsOn returns empty array for nothing/none/n-a/first-phase; matches Phase N patterns for structured output"

patterns-established:
  - "Dual-format regex: all ROADMAP.md field matching uses (?:\\*\\*:|:\\*\\*) alternation to support both **Field:** and **Field**: formats"
  - "Backward-compatible output: new depends_on_parsed field added alongside existing depends_on raw text field"

requirements-completed: [DAG-01]

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 08 Plan 01: Regex Fix and parseDependsOn Summary

**Fixed colon-position regex bug across 6 functions and added parseDependsOn() for structured dependency extraction from free-text ROADMAP.md fields**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T05:54:05Z
- **Completed:** 2026-02-20T06:02:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed regex format mismatch bug that caused goal and depends_on to return null for all phases using the canonical **Field**: format
- Added parseDependsOn() helper that extracts structured phase number arrays from free-text dependency strings
- Added depends_on_parsed field to roadmap analyze output enabling DAG construction in Plan 02
- Updated all test fixtures to canonical colon-outside-bold format with backward compatibility tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix regex patterns and add parseDependsOn()** - `196ad06` (feat)
2. **Task 2: Update existing tests and add parseDependsOn tests** - `ef3cd61` (test)

## Files Created/Modified
- `bin/mow-tools.cjs` - Fixed regex in cmdRoadmapAnalyze, cmdRoadmapGetPhase, cmdPhaseComplete, roadmap update-plan-progress, and phase remove renumbering; added parseDependsOn() function and depends_on_parsed output field
- `bin/mow-tools.test.cjs` - Updated all ROADMAP.md test fixtures to canonical **Field**: format; added depends_on_parsed and backward compatibility tests (137 tests pass)

## Decisions Made
- Used regex alternation `(?:\*\*:|:\*\*)` instead of optional quantifiers `\*?\*?` because the optional pattern incorrectly matched `**Goal:` (consuming only the colon, not the closing bold markers), leading to `** value` captured text
- Kept phase add/insert generating colon-inside-bold format -- per research recommendation, the DAG agent handles re-analysis after manual changes
- Fixed the Depends on renumbering regex in phase remove as a Rule 1 auto-fix (pre-existing bug in same pattern family)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed regex pattern approach from optional quantifiers to alternation**
- **Found during:** Task 2 (backward compatibility test)
- **Issue:** The plan-suggested regex `\*\*Goal\*?\*?:` matched `**Goal:` (consuming just the colon), capturing `** Old style goal` instead of `Old style goal`
- **Fix:** Changed to alternation pattern `\*\*Goal(?:\*\*:|:\*\*)` which correctly handles both formats
- **Files modified:** bin/mow-tools.cjs (all 8 regex patterns)
- **Verification:** Backward compatibility test passes, all 137 tests pass
- **Committed in:** ef3cd61 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Depends on renumbering regex in phase remove**
- **Found during:** Task 1 (reviewing all affected regex patterns)
- **Issue:** `Depends on:\*\*` pattern at line 3800 also had the colon-inside-bold assumption, preventing renumbering of dependencies in colon-outside-bold roadmaps
- **Fix:** Applied same alternation pattern `Depends on(?:\*\*:|:\*\*)`
- **Files modified:** bin/mow-tools.cjs
- **Verification:** Pattern now matches both formats
- **Committed in:** 196ad06 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness. The regex approach in the plan was conceptually right but the specific pattern needed refinement. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- parseDependsOn() and depends_on_parsed are ready for Plan 02 (DAG analysis agent) to consume
- roadmap analyze output now includes structured dependency arrays for all phases
- All regex patterns consistently handle both markdown bold-colon formats

## Self-Check: PASSED

- All files exist on disk
- All commits verified in git log

---
*Phase: 08-dag-based-phase-scheduling*
*Completed: 2026-02-20*
