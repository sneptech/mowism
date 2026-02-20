---
phase: 05-fix-update-workflow
plan: 01
subsystem: distribution
tags: [update, install, workflow, shell]

# Dependency graph
requires:
  - phase: 04-distribution-portability
    provides: verified install.sh and portable path handling
provides:
  - Working INSTALL_SH update path (clone to temp, re-run install.sh)
  - Preserved GIT_CLONE update path (git fetch + git pull)
  - Configurable update source via .update-source file
  - Honest reapply-patches messaging (no false automation claims)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-path detection (GIT_CLONE vs INSTALL_SH), configurable update source]

key-files:
  created: []
  modified:
    - mowism/workflows/update.md
    - commands/mow/update.md
    - help/update.md
    - commands/mow/reapply-patches.md
    - help/reapply-patches.md

key-decisions:
  - "Update source configurable via .update-source file rather than hardcoded URL"
  - "INSTALL_SH path uses temp dir clone + re-run install.sh (reuses existing verified installer)"

patterns-established:
  - "Dual-path detection: check .git for GIT_CLONE, check VERSION for INSTALL_SH, else NOT_FOUND"
  - "Update source resolution: .update-source file -> git remote -> error with instructions"

requirements-completed: ["DIST-01 (fix)"]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 5 Plan 1: Fix Update Workflow Summary

**Dual-path update workflow with GIT_CLONE (git pull) and INSTALL_SH (temp clone + re-run install.sh), configurable update source via .update-source, and all stale npm/GSD-era references removed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T23:19:42Z
- **Completed:** 2026-02-19T23:22:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Rewrote update workflow with dual-path support: GIT_CLONE uses git pull (preserved), INSTALL_SH clones to temp dir and re-runs install.sh
- Added configurable update source via .update-source file with clear error when no source is configured
- Removed all stale npm, changelog, cache clearing, local-vs-global, and Phase 3 references from 5 files
- Fixed reapply-patches to give honest "no patches" message with manual backup instructions instead of false automation claims

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite update workflow with dual-path support** - `4ba48c2` (feat)
2. **Task 2: Fix stale references in command/help files** - `cd54bb4` (fix)

## Files Created/Modified
- `mowism/workflows/update.md` - Dual-path update workflow (GIT_CLONE + INSTALL_SH branches, .update-source config, temp dir cleanup)
- `commands/mow/update.md` - Command definition updated to describe git-based dual-path workflow
- `help/update.md` - User-facing help updated with install method detection and dual-path steps
- `commands/mow/reapply-patches.md` - Honest no-patches message with manual backup instructions
- `help/reapply-patches.md` - Removed false automatic backup claim from Related section

## Decisions Made
- Update source is configurable via `~/.claude/mowism/.update-source` file rather than hardcoded -- supports both remote URLs and local paths
- INSTALL_SH update path reuses the existing verified install.sh rather than duplicating file copy logic
- Purpose text in reapply-patches simplified to remove "wipes and reinstalls" language

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Update workflow is complete for both installation methods
- No blockers for future phases

## Self-Check: PASSED

All 6 files exist. Both task commits (4ba48c2, cd54bb4) verified in git log.

---
*Phase: 05-fix-update-workflow*
*Completed: 2026-02-20*
