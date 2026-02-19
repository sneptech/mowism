---
phase: 01-fork-and-foundation
plan: 05
subsystem: infra
tags: [fork, rebranding, commands, mowism, migration]

# Dependency graph
requires:
  - phase: 01-fork-and-foundation/plan-04
    provides: 32 rebranded workflow files in ~/.claude/mowism/workflows/
provides:
  - 29 rebranded command files in ~/.claude/commands/mow/
  - /mow:migrate command for GSD-to-Mowism .planning/ migration
affects: [01-fork-and-foundation/plan-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [ordered-string-replacement-for-fork-rebranding, backup-then-replace-migration]

key-files:
  created:
    - ~/.claude/commands/mow/execute-phase.md
    - ~/.claude/commands/mow/new-project.md
    - ~/.claude/commands/mow/plan-phase.md
    - ~/.claude/commands/mow/verify-work.md
    - ~/.claude/commands/mow/migrate.md
    - ~/.claude/commands/mow/ (30 files total)
  modified: []

key-decisions:
  - "Dropped join-discord.md per research recommendation (don't link to GSD Discord under Mowism brand)"
  - "Added missing name: frontmatter to reapply-patches.md and rebranded gsd-local-patches to mow-local-patches"
  - "Files live in ~/.claude/ outside git repo -- tracked via planning artifacts only"

patterns-established:
  - "Fork rebranding: copy-then-sed with ordered replacements, consistent with Plans 02-04"
  - "Migration command: backup-then-replace-in-place with auto-commit and error recovery"

requirements-completed: [CORE-01, CORE-06]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 01 Plan 05: Command Files Summary

**Forked 29 GSD command files to /mow:* namespace with zero residual gsd strings, plus created /mow:migrate command for GSD-to-Mowism .planning/ migration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T03:47:32Z
- **Completed:** 2026-02-19T03:50:37Z
- **Tasks:** 2
- **Files created:** 30

## Accomplishments
- All 29 command files forked from ~/.claude/commands/gsd/ to ~/.claude/commands/mow/ with full rebranding
- join-discord.md dropped and new-project.md.bak excluded per plan
- All YAML frontmatter updated from `name: gsd:*` to `name: mow:*`
- All @ file references point to ~/.claude/mowism/ paths (workflows, references, templates)
- All 11 agent name references replaced (gsd-executor -> mow-executor, etc.)
- /mow:migrate command created with complete 5-step workflow: pre-flight, backup, ordered replacement, verification, auto-commit
- reapply-patches.md received missing `name:` frontmatter field and gsd-local-patches path rebranding

## Task Commits

Files live outside the git repo (in ~/.claude/) so per-task commits track planning artifacts:

1. **Task 1: Fork and rebrand 29 command files** - Work completed outside repo (29 files in ~/.claude/commands/mow/)
2. **Task 2: Create /mow:migrate command** - Work completed outside repo (1 file in ~/.claude/commands/mow/)

**Plan metadata:** Committed with this SUMMARY.md

## Files Created/Modified

All 30 command files created in `~/.claude/commands/mow/`:
- `add-phase.md` - /mow:add-phase command
- `add-todo.md` - /mow:add-todo command
- `audit-milestone.md` - /mow:audit-milestone command
- `check-todos.md` - /mow:check-todos command
- `cleanup.md` - /mow:cleanup command
- `complete-milestone.md` - /mow:complete-milestone command
- `debug.md` - /mow:debug command
- `discuss-phase.md` - /mow:discuss-phase command
- `execute-phase.md` - /mow:execute-phase command (references mowism workflows)
- `health.md` - /mow:health command
- `help.md` - /mow:help command
- `insert-phase.md` - /mow:insert-phase command
- `list-phase-assumptions.md` - /mow:list-phase-assumptions command
- `map-codebase.md` - /mow:map-codebase command
- `migrate.md` - /mow:migrate command (NEW - GSD-to-Mowism migration)
- `new-milestone.md` - /mow:new-milestone command
- `new-project.md` - /mow:new-project command
- `pause-work.md` - /mow:pause-work command
- `plan-milestone-gaps.md` - /mow:plan-milestone-gaps command
- `plan-phase.md` - /mow:plan-phase command
- `progress.md` - /mow:progress command
- `quick.md` - /mow:quick command
- `reapply-patches.md` - /mow:reapply-patches command
- `remove-phase.md` - /mow:remove-phase command
- `research-phase.md` - /mow:research-phase command
- `resume-work.md` - /mow:resume-work command
- `set-profile.md` - /mow:set-profile command
- `settings.md` - /mow:settings command
- `update.md` - /mow:update command (references git-pull workflow from Plan 04)
- `verify-work.md` - /mow:verify-work command

## Decisions Made
- Dropped join-discord.md per research recommendation -- linking to GSD's Discord under the Mowism brand is inappropriate. A Mowism-specific community channel can be added later if needed.
- Added missing `name: mow:reapply-patches` frontmatter to reapply-patches.md (original GSD file had no `name:` field) and rebranded `gsd-local-patches` directory references to `mow-local-patches`.
- Files reside in ~/.claude/ outside the git repo at /home/max/git/mowism -- tracked via planning artifacts only, same pattern as Plans 01-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed reapply-patches.md missing name field and residual gsd strings**
- **Found during:** Task 1 (verification sweep)
- **Issue:** reapply-patches.md had no `name:` field in its YAML frontmatter (original GSD file was also missing it) and contained `gsd-local-patches` directory path references that were not caught by the standard replacement patterns.
- **Fix:** Added `name: mow:reapply-patches` to frontmatter; replaced `gsd-local-patches` with `mow-local-patches` throughout the file.
- **Files modified:** ~/.claude/commands/mow/reapply-patches.md
- **Verification:** `grep -n 'gsd' reapply-patches.md` returns empty; `grep '^name: mow:' reapply-patches.md` matches.

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup of edge case in one file. No scope creep.

## Issues Encountered
- Files are outside the git repository boundary (/home/max/git/mowism). Per-task atomic commits cannot capture the actual file changes since they live in ~/.claude/. The SUMMARY.md and STATE.md commits serve as the tracking mechanism for this plan, consistent with Plans 01-04.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 30 command files (29 forked + 1 new) are in place for the Mowism system
- Commands correctly reference mowism workflow paths, mow-tools.cjs, and mow-* agents
- Combined with Plans 01-04, only Plan 06 (CLAUDE.md integration) remains for the fork phase
- /mow:migrate provides a safe migration path for existing GSD projects

## Self-Check: PASSED

All verification checks passed:
- 30/30 command files exist in ~/.claude/commands/mow/
- 29/29 forked files have `name: mow:*` frontmatter
- 1/1 migrate.md exists with complete migration workflow
- 0 forked files contain residual 'gsd' or 'get-shit-done' strings
- 0 non-mowism @ references found
- join-discord.md correctly absent

---
*Phase: 01-fork-and-foundation*
*Completed: 2026-02-19*
