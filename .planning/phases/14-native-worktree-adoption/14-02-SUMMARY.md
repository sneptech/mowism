---
phase: 14-native-worktree-adoption
plan: 02
subsystem: infra
tags: [worktree, coordination, manifest, paths, native-worktree]

# Dependency graph
requires:
  - phase: 14-01
    provides: WorktreeCreate/WorktreeRemove hooks and cmdWorktreeCreateNative at .claude/worktrees/
provides:
  - All code references updated from .worktrees/pNN to .claude/worktrees/phase-NN
  - readManifest with dual-path lookup (new first, old fallback with warning)
  - writeManifest always targets .claude/worktrees/manifest.json
  - getActiveWorktrees using git worktree list --porcelain (no WorkTrunk dependency)
  - Manifest keys use phase-NN convention with pNN fallback
  - Workflow/agent/command files aligned with native worktree path convention
affects: [14-03, 14-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [git worktree list --porcelain parsing, dual-path manifest lookup with migration warning, phase-NN manifest keys with pNN fallback]

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - mowism/workflows/execute-phase.md
    - mowism/workflows/close-shop.md
    - agents/mow-team-lead.md
    - commands/mow/worktree-status.md

key-decisions:
  - "readManifest checks .claude/worktrees/ first, falls back to .worktrees/ with stderr warning for pre-migration repos"
  - "getActiveWorktrees parses git worktree list --porcelain output for absolute paths, replacing wt list --format=json"
  - "Path comparison in clean functions resolves relative paths against repo root before comparing with absolute git worktree list output"
  - "Team lead agent uses claude --worktree phase-NN (native mechanism) instead of mow-tools.cjs worktree create"

patterns-established:
  - "Dual-path lookup: always try new path first, fall back to old with deprecation warning"
  - "Manifest key resolution: check phase-NN key first, fall back to pNN for backward compatibility"

requirements-completed: [WKT-04, WKT-05]

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 14 Plan 02: Path Reference Migration Summary

**Rewrote all .worktrees/pNN references to .claude/worktrees/phase-NN across mow-tools.cjs, workflows, agent files, and commands with backward-compatible fallbacks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-23T18:58:46Z
- **Completed:** 2026-02-23T19:03:20Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- readManifest with dual-path lookup (.claude/worktrees/ primary, .worktrees/ fallback with migration warning)
- writeManifest always writes to .claude/worktrees/manifest.json
- getActiveWorktrees rewritten from wt list --format=json to git worktree list --porcelain parsing
- cmdWorktreeClean/silentWorktreeClean handle absolute vs relative path comparison via path.resolve()
- cmdWorktreeMerge and cmdWorktreeStash use phase-NN manifest keys with pNN fallback
- All workflow, agent, and command files updated to .claude/worktrees/phase-NN convention
- Team lead agent switched to claude --worktree native mechanism

## Task Commits

Each task was committed atomically:

1. **Task 1: Update mow-tools.cjs path references and coordination layer** - `eaa700e` (feat)
2. **Task 2: Update workflow, agent, and command file path references** - `58615d0` (feat)

## Files Created/Modified
- `bin/mow-tools.cjs` - Updated readManifest, writeManifest, getActiveWorktrees, cmdWorktreeClean, silentWorktreeClean, cmdWorktreeMerge, cmdWorktreeStash, checkpoint path default
- `mowism/workflows/execute-phase.md` - Updated 4 worktree path references from .worktrees/pNN to .claude/worktrees/phase-NN
- `mowism/workflows/close-shop.md` - Updated STATUS.md read path and worktree preservation notice
- `agents/mow-team-lead.md` - Switched from mow-tools.cjs worktree create to claude --worktree native mechanism
- `commands/mow/worktree-status.md` - Updated cross-reference from wt list to git worktree list

## Decisions Made
- readManifest checks .claude/worktrees/ first, falls back to .worktrees/ with stderr warning for pre-migration repos
- getActiveWorktrees parses git worktree list --porcelain output for absolute paths, eliminating WorkTrunk (wt) dependency
- Path comparison in clean functions uses path.resolve() against repo root before comparing with absolute git worktree list output
- Team lead agent uses claude --worktree phase-NN (native mechanism) instead of mow-tools.cjs worktree create

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Zero .worktrees/pNN references remain in active code (old cmdWorktreeCreate left intact for backward compatibility, removal planned in 14-04)
- Coordination layer fully functional with .claude/worktrees/phase-NN paths
- Plan 03 can proceed with settings.json merging and hook testing
- Plan 04 can remove the old cmdWorktreeCreate function

## Self-Check: PASSED

All created files verified present. All commit hashes verified in git log.

---
*Phase: 14-native-worktree-adoption*
*Completed: 2026-02-24*
