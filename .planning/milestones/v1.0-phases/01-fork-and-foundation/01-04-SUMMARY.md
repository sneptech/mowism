---
phase: 01-fork-and-foundation
plan: 04
subsystem: infra
tags: [fork, rebranding, workflows, mowism]

# Dependency graph
requires:
  - phase: 01-fork-and-foundation/plan-01
    provides: mow-tools.cjs CLI tool in ~/.claude/mowism/bin/
  - phase: 01-fork-and-foundation/plan-02
    provides: Agent definitions, templates, and references in ~/.claude/mowism/
provides:
  - 32 rebranded workflow files in ~/.claude/mowism/workflows/
  - Git-pull based update mechanism replacing npm-based GSD update
affects: [01-fork-and-foundation/plan-05, 01-fork-and-foundation/plan-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [ordered-string-replacement-for-fork-rebranding, git-pull-update-mechanism]

key-files:
  created:
    - ~/.claude/mowism/workflows/execute-phase.md
    - ~/.claude/mowism/workflows/execute-plan.md
    - ~/.claude/mowism/workflows/new-project.md
    - ~/.claude/mowism/workflows/plan-phase.md
    - ~/.claude/mowism/workflows/verify-work.md
    - ~/.claude/mowism/workflows/update.md
    - ~/.claude/mowism/workflows/ (32 files total)
  modified: []

key-decisions:
  - "Replaced npm-based update mechanism with git-pull placeholder (full install/update tooling planned for Phase 3 DIST-01)"
  - "Applied same ordered replacement table from Plan 02 with additional brand context patterns"
  - "Files live in ~/.claude/ outside git repo -- tracked via planning artifacts only"

patterns-established:
  - "Fork rebranding: copy-then-sed with ordered replacements (absolute paths first, then general terms)"
  - "Update workflow: git-pull from local clone instead of npm package"

requirements-completed: [CORE-01]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 01 Plan 04: Workflow Files Summary

**Forked and rebranded all 32 GSD workflow files to Mowism with zero residual gsd strings, plus replaced npm update mechanism with git-pull approach**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T03:40:22Z
- **Completed:** 2026-02-19T03:44:08Z
- **Tasks:** 2
- **Files created:** 32

## Accomplishments
- All 32 workflow files forked from ~/.claude/get-shit-done/workflows/ to ~/.claude/mowism/workflows/
- Every occurrence of gsd-tools.cjs replaced with mow-tools.cjs across all tool invocations
- All 11 agent name references (gsd-executor, gsd-planner, etc.) replaced with mow-* equivalents
- All /gsd: command cross-references replaced with /mow: prefix
- All GSD banner prefixes replaced with MOW branding
- All @ file references point to ~/.claude/mowism/ paths (templates, references, bin)
- Branch patterns (gsd/phase-, gsd/{milestone}) replaced with mow/ equivalents
- update.md rewritten with git-pull mechanism instead of npm package reference

## Task Commits

Files live outside the git repo (in ~/.claude/) so per-task commits track planning artifacts:

1. **Task 1: Fork and rebrand workflow files A-L (first 16)** - Work completed outside repo (16 files in ~/.claude/mowism/workflows/)
2. **Task 2: Fork and rebrand workflow files M-V (remaining 16)** - Work completed outside repo (16 files in ~/.claude/mowism/workflows/)

**Plan metadata:** Committed with this SUMMARY.md

## Files Created/Modified

All 32 workflow files created in `~/.claude/mowism/workflows/`:
- `add-phase.md` - Phase addition workflow
- `add-todo.md` - Todo tracking workflow
- `audit-milestone.md` - Milestone audit workflow
- `check-todos.md` - Todo checking workflow
- `cleanup.md` - Cleanup workflow
- `complete-milestone.md` - Milestone completion workflow
- `diagnose-issues.md` - Issue diagnosis workflow
- `discovery-phase.md` - Discovery phase workflow
- `discuss-phase.md` - Phase discussion workflow
- `execute-phase.md` - Phase execution orchestrator (spawns mow-executor agents)
- `execute-plan.md` - Plan execution logic (references templates, spawns subagents)
- `health.md` - Health check workflow
- `help.md` - Command reference and help
- `insert-phase.md` - Phase insertion workflow
- `list-phase-assumptions.md` - Assumption listing workflow
- `map-codebase.md` - Codebase mapping workflow
- `new-milestone.md` - Milestone creation workflow
- `new-project.md` - Project initialization (spawns mow-project-researcher agents)
- `pause-work.md` - Work pausing workflow
- `plan-milestone-gaps.md` - Gap planning workflow
- `plan-phase.md` - Phase planning orchestrator (spawns mow-planner, mow-plan-checker)
- `progress.md` - Progress display workflow
- `quick.md` - Quick task workflow
- `remove-phase.md` - Phase removal workflow
- `research-phase.md` - Phase research workflow
- `resume-project.md` - Project resumption workflow
- `set-profile.md` - Profile configuration workflow
- `settings.md` - Settings management workflow
- `transition.md` - Transition workflow
- `update.md` - Update workflow (rewritten with git-pull mechanism)
- `verify-phase.md` - Phase verification workflow
- `verify-work.md` - Work verification workflow

## Decisions Made
- Replaced npm-based update mechanism in update.md with git-pull approach -- the npm package "mowism" does not exist yet, so mechanically replacing the package name would create a broken workflow. The git-pull mechanism is appropriate for the current development stage, with full install/update tooling planned for Phase 3 (DIST-01).
- Applied same ordered replacement strategy from Plan 02 (most-specific paths first, then progressively shorter patterns) to prevent double-replacement artifacts.
- Files reside in ~/.claude/ outside the git repo at /home/max/git/mowism -- tracked via planning artifacts only, same pattern as Plans 01-02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed residual gsd strings in progress.md and settings.md**
- **Found during:** Task 2 (final verification sweep)
- **Issue:** Two files had residual `gsd` strings that the automated sed replacements missed: `gsd command` in progress.md and `~/.gsd` in settings.md. These were in prose/path contexts that didn't match the specific replacement patterns.
- **Fix:** Applied targeted sed replacements for the two remaining instances.
- **Files modified:** ~/.claude/mowism/workflows/progress.md, ~/.claude/mowism/workflows/settings.md
- **Verification:** `grep -rl 'gsd'` across all 32 files returns empty

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup of edge cases. No scope creep.

## Issues Encountered
- Files are outside the git repository boundary (/home/max/git/mowism). Per-task atomic commits cannot capture the actual file changes since they live in ~/.claude/. The SUMMARY.md and STATE.md commits serve as the tracking mechanism for this plan, consistent with Plans 01-03.

## Next Phase Readiness
- All 32 workflow files are in place for the Mowism system to function
- Workflows correctly reference mow-tools.cjs, mow-* agents, mow templates/references
- Combined with Plans 01-03, the core fork is nearly complete (commands in Plan 05 and CLAUDE.md in Plan 06 remain)

## Self-Check: PASSED

All 34 verification checks passed:
- 32/32 workflow files exist in ~/.claude/mowism/workflows/
- 1/1 SUMMARY.md exists
- 0 files contain residual 'gsd' or 'get-shit-done' strings

---
*Phase: 01-fork-and-foundation*
*Completed: 2026-02-19*
