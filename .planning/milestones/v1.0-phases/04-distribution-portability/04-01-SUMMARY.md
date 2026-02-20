---
phase: 04-distribution-portability
plan: 01
subsystem: infra
tags: [portability, paths, sed, bulk-replacement]

# Dependency graph
requires:
  - phase: 03-agent-teams-and-distribution
    provides: "Complete agent/command/workflow file set with hardcoded paths"
provides:
  - "All source files use portable ~/.claude/ paths instead of /home/max/.claude/"
  - "Repository is user-agnostic for any Unix system"
affects: [04-02-runtime-path-resolution, 04-03-install-script]

# Tech tracking
tech-stack:
  added: []
  patterns: ["~/.claude/ as canonical portable path form", "$HOME/.claude/ inside double-quoted bash strings"]

key-files:
  created: []
  modified:
    - "agents/*.md (10 files)"
    - "commands/mow/*.md (33 files)"
    - "mowism/workflows/*.md (29 files)"
    - "mowism/references/*.md (7 files)"
    - "mowism/templates/*.md (2 files)"
    - ".planning/ artifacts (24 files)"

key-decisions:
  - "Phase 4 plan files excluded from replacement to preserve documentation context"
  - "No tilde-in-double-quotes issues found -- all bash contexts use unquoted paths"

patterns-established:
  - "Portable path form: ~/.claude/mowism/ for all @-references and node invocations"
  - "Phase plan files that describe path changes are excluded from those changes to preserve historical record"

requirements-completed: [CORE-01, CORE-03, DIST-01]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 04 Plan 01: Path Portability Summary

**Bulk sed replacement of 409 hardcoded /home/max/.claude/ occurrences across 105 files with portable ~/.claude/ form**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T18:26:55Z
- **Completed:** 2026-02-19T18:29:15Z
- **Tasks:** 2
- **Files modified:** 105

## Accomplishments
- Replaced all 409 occurrences of `/home/max/.claude/` with `~/.claude/` across 105 files
- Verified zero remaining hardcoded paths outside Phase 4 plan documentation
- Confirmed @-references (34 files), node invocations (29 files), and other references all syntactically correct
- No tilde-in-double-quotes issues found (no $HOME substitution needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Bulk replace /home/max/.claude/ with ~/.claude/** - `bc59af2` (feat)
2. **Task 2: Verify @-references and node invocations** - verification-only task, no file changes

## Files Created/Modified
- `agents/*.md` (10 files) - Agent definitions with portable @-references and node invocations
- `commands/mow/*.md` (33 files) - Command files with portable workflow references
- `mowism/workflows/*.md` (29 files) - Workflow files with portable tool and template paths
- `mowism/references/*.md` (7 files) - Reference docs with portable path examples
- `mowism/templates/*.md` (2 files) - Templates with portable path placeholders
- `.planning/` artifacts (24 files) - Plans, research, verification docs with updated paths

## Decisions Made
- Phase 4 plan files (`.planning/phases/04-distribution-portability/`) excluded from replacement to preserve the documentation context (objectives and task descriptions reference the original hardcoded path as the thing being fixed)
- No tilde-in-double-quotes issues were found; the `$HOME` substitution edge case from the plan did not apply

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Unstaged change in `bin/mow-tools.test.cjs` from a previous session was present in the working tree -- left untouched per plan instruction (Plan 04-02 handles bin/ files)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All source files now use portable `~/.claude/` paths
- Ready for Plan 04-02 (runtime path resolution in mow-tools.cjs)
- Ready for Plan 04-03 (install script)

## Self-Check: PASSED

- FOUND: 04-01-SUMMARY.md
- FOUND: bc59af2 (Task 1 commit)

---
*Phase: 04-distribution-portability*
*Completed: 2026-02-19*
