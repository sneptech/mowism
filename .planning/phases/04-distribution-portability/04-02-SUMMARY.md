---
phase: 04-distribution-portability
plan: 02
subsystem: cli
tags: [env-var, agent-teams, cleanup, testing]

# Dependency graph
requires:
  - phase: 03-agent-teams-and-distribution
    provides: "checkAgentTeams() function and Agent Teams nudge system"
provides:
  - "checkAgentTeams() accepts both '1' and 'true' env var values (case-insensitive)"
  - "Stale mowism/bin/ directory removed"
  - "Test coverage for all truthy Agent Teams env var values"
affects: [install, onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Env var truthy matching: normalize to lowercase, check '1' or 'true'"

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - bin/mow-tools.test.cjs

key-decisions:
  - "Case-insensitive matching via .toLowerCase() for env var and settings values"

patterns-established:
  - "Env var boolean detection: (val || '').toLowerCase() then === '1' || === 'true'"

requirements-completed: [DIST-04, TEAM-04]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 04 Plan 02: Agent Teams Env Var Fix Summary

**Fixed checkAgentTeams() to accept both '1' and 'true' values, deleted stale mowism/bin/, added test coverage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T18:26:57Z
- **Completed:** 2026-02-19T18:29:19Z
- **Tasks:** 2
- **Files modified:** 2 modified, 2 deleted

## Accomplishments
- checkAgentTeams() now accepts '1', 'true', 'TRUE' (case-insensitive) for both env var and settings.json paths
- Deleted stale mowism/bin/ directory (7,672 lines of outdated copies)
- Added 3 new test cases covering 'true', 'TRUE', and '1' env var values (103 total tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix checkAgentTeams() + delete stale mowism/bin/** - `49cdac6` (fix)
2. **Task 2: Add test coverage for 'true' value detection** - `6247a31` (test)

## Files Created/Modified
- `bin/mow-tools.cjs` - Updated checkAgentTeams() with truthy value matching for env var and settings.json
- `bin/mow-tools.test.cjs` - Added 3 test cases for 'true', 'TRUE', and '1' env var detection
- `mowism/bin/mow-tools.cjs` - Deleted (stale Phase 1 snapshot, 5326 lines)
- `mowism/bin/mow-tools.test.cjs` - Deleted (stale Phase 1 snapshot, 2346 lines)

## Decisions Made
- Case-insensitive matching via `.toLowerCase()` normalization before comparison
- Both env var and settings.json paths use identical truthy matching logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Agent Teams detection now correctly handles the value recommended by install.sh
- Users who set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true` will no longer see the enable nudge

## Self-Check: PASSED

- FOUND: bin/mow-tools.cjs
- FOUND: bin/mow-tools.test.cjs
- CONFIRMED: mowism/bin/ deleted
- FOUND: 04-02-SUMMARY.md
- FOUND: commit 49cdac6
- FOUND: commit 6247a31

---
*Phase: 04-distribution-portability*
*Completed: 2026-02-19*
