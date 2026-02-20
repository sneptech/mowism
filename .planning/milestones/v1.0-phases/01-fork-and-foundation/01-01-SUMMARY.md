---
phase: 01-fork-and-foundation
plan: 01
subsystem: tooling
tags: [cli, node, cjs, rebrand, fork]

# Dependency graph
requires: []
provides:
  - "mow-tools.cjs -- core CLI tool for all Mowism workflow operations (state, config, commits, model resolution, phase management)"
  - "mow-tools.test.cjs -- 83-test suite validating all mow-tools.cjs commands"
affects: [01-02, 01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ordered string replacement (most specific first) to avoid double-replacement during rebrand"
    - "Origin comments preserved (GSD attribution) while all functional code uses Mowism branding"

key-files:
  created:
    - "~/.claude/mowism/bin/mow-tools.cjs"
    - "~/.claude/mowism/bin/mow-tools.test.cjs"
    - "bin/mow-tools.cjs"
    - "bin/mow-tools.test.cjs"
  modified: []

key-decisions:
  - "Files tracked in both ~/.claude/mowism/bin/ (install location) and bin/ (git repo source)"
  - "Single uppercase GSD reference preserved in header comment as origin attribution per plan guidance"

patterns-established:
  - "Install location: ~/.claude/mowism/bin/ for CLI tools"
  - "Agent name prefix: mow-* (11 agents: planner, executor, verifier, debugger, codebase-mapper, plan-checker, integration-checker, roadmapper, phase-researcher, project-researcher, research-synthesizer)"
  - "Branch templates: mow/phase-{phase}-{slug} and mow/{milestone}-{slug}"
  - "Config directory: ~/.mowism/"
  - "Banner prefix: MOW (with right-pointing triangle)"
  - "Command namespace: /mow:*"

requirements-completed: [CORE-02]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 1 Plan 01: Fork mow-tools.cjs and test file Summary

**Forked gsd-tools.cjs (5326 lines) and gsd-tools.test.cjs (2346 lines) into Mowism with zero functional GSD strings remaining, all 83 tests passing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T03:29:39Z
- **Completed:** 2026-02-19T03:34:08Z
- **Tasks:** 2
- **Files modified:** 4 (2 install + 2 repo)

## Accomplishments
- Forked and rebranded gsd-tools.cjs as mow-tools.cjs with 55+ string replacements covering paths, agent names, branch templates, config dirs, banner prefixes, and command namespaces
- Forked and rebranded gsd-tools.test.cjs as mow-tools.test.cjs with matching replacements plus test helper function rename
- All 83 tests pass against the rebranded tool with zero failures
- Zero lowercase "gsd" strings in either file; zero "get-shit-done" strings; only one uppercase "GSD" in an origin attribution comment

## Task Commits

Each task was committed atomically:

1. **Task 1: Fork and rebrand mow-tools.cjs** - `62d9107` (feat)
2. **Task 2: Fork and rebrand mow-tools.test.cjs** - `ef1a60e` (feat)

## Files Created/Modified
- `~/.claude/mowism/bin/mow-tools.cjs` - Core CLI tool for all Mowism workflow operations (5326 lines)
- `~/.claude/mowism/bin/mow-tools.test.cjs` - Test suite with 83 tests validating all mow-tools commands (2346 lines)
- `bin/mow-tools.cjs` - Same file tracked in git repo
- `bin/mow-tools.test.cjs` - Same file tracked in git repo

## Decisions Made
- Tracked files in both the install location (~/.claude/mowism/bin/) and the git repo (bin/) so that source is version-controlled while the install location is immediately usable by workflows
- Preserved a single uppercase "GSD" reference in the header comment (line 6) as origin attribution, per plan guidance that source-code comments acknowledging GSD origin should not be removed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed '.gsd' config paths without trailing slash**
- **Found during:** Task 1 (string replacement)
- **Issue:** Three path.join() calls used `'.gsd'` without a trailing slash (e.g., `path.join(homedir, '.gsd', 'brave_api_key')`), which was not caught by the `.gsd/` replacement rule
- **Fix:** Added explicit replacement for `'.gsd'` pattern in path.join contexts
- **Files modified:** ~/.claude/mowism/bin/mow-tools.cjs
- **Verification:** grep -c 'gsd' returns 0 for lowercase
- **Committed in:** 62d9107 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for complete rebranding. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- mow-tools.cjs is ready as the foundation for all subsequent plans
- Plans 01-02 through 01-06 can reference mow-tools.cjs for state operations, config, commits, and phase management
- All 11 mow-* agent name references are in place for agent file forking (Plan 01-02)

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 01-fork-and-foundation*
*Completed: 2026-02-19*
