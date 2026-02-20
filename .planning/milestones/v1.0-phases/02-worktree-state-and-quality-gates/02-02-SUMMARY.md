---
phase: 02-worktree-state-and-quality-gates
plan: 02
subsystem: quality-gates
tags: [quality-chain, task-subagents, tier-selection, scope-check, change-summary, verify-work, update-claude-md]

# Dependency graph
requires:
  - phase: 01-fork-and-foundation
    provides: "Quality skill commands (scope-check, change-summary, etc.) and mow-tools.cjs"
provides:
  - "/mow:refine-phase command with tier selection (Auto, minimum, complex, algorithmic)"
  - "refine-phase.md workflow orchestrating quality chain as sequential Task() subagents"
  - "Minimum tier: 4-stage chain (scope-check, change-summary, verify-work, update-claude-md)"
  - "Resilient chain pattern with retry-on-transient and continue-on-failure"
affects: [02-04-extended-quality-tiers, execute-phase-routing]

# Tech tracking
tech-stack:
  added: []
  patterns: [resilient-task-chain, tier-selection-ux, verification-chain-directory]

key-files:
  created:
    - "commands/mow/refine-phase.md"
    - "~/.claude/commands/mow/refine-phase.md"
    - "~/.claude/mowism/workflows/refine-phase.md"
  modified: []

key-decisions:
  - "Auto-tier defaults to 'complex' when uncertain (per research recommendation)"
  - "Stage 2 placeholder comment for Plan 02-04 to inject parallel checks"
  - "Each Task() subagent writes findings with YAML frontmatter for machine-readable results"

patterns-established:
  - "Quality chain resilience: retry once on transient failure, continue chain on permanent failure"
  - "VERIFICATION-CHAIN-P{N}/ directory per phase for per-check findings files"
  - "Tier selection UX: 4 options with auto-select logic based on phase content analysis"

requirements-completed: [GATE-01, GATE-02, GATE-03]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 02 Plan 02: Refine Phase Command Summary

**`/mow:refine-phase` command and workflow with tiered quality chain -- minimum tier runs scope-check, change-summary, verify-work, update-claude-md as sequential Task() subagents with resilient error handling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T05:01:23Z
- **Completed:** 2026-02-19T05:04:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `/mow:refine-phase` command file with proper frontmatter and @-references to workflow
- Built refine-phase workflow with tier selection UX (Auto, minimum, complex, algorithmic)
- Implemented minimum tier chain: 4 sequential stages each as a separate Task() subagent
- Added resilient chain pattern: one retry on transient failures, continue on permanent failures
- Included Stage 2 placeholder for Plan 02-04 to extend with parallel quality checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create refine-phase command file with tier selection** - `ccb92a2` (feat)
2. **Task 2: Create refine-phase workflow with tier selection and minimum tier chain** - no in-repo commit (file at ~/.claude/mowism/workflows/refine-phase.md, outside git repo per project convention)

## Files Created/Modified
- `commands/mow/refine-phase.md` - Command entry point for /mow:refine-phase (repo canonical source)
- `~/.claude/commands/mow/refine-phase.md` - Installed command file (identical copy)
- `~/.claude/mowism/workflows/refine-phase.md` - Workflow orchestration with tier selection, 4-stage minimum chain, resilience patterns

## Decisions Made
- Auto-tier defaults to "complex" when uncertain, matching the locked research decision
- Stage 2 left as HTML comment placeholder (`<!-- Stage 2 (Parallel): Added by Plan 02-04 -->`) so Plan 02-04 can inject parallel checks at the correct position
- Each quality check writes findings with YAML frontmatter (check, phase, result, date, duration) for machine-readable result extraction by the orchestrator

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Minimum tier quality chain is functional and ready for use
- Plan 02-04 can extend with complex/algorithmic tiers by filling the Stage 2 placeholder
- Quality skill commands from Phase 1 are referenced by Task() prompts

## Self-Check: PASSED

All files verified:
- commands/mow/refine-phase.md: FOUND
- ~/.claude/commands/mow/refine-phase.md: FOUND
- ~/.claude/mowism/workflows/refine-phase.md: FOUND
- 02-02-SUMMARY.md: FOUND
- Commit ccb92a2: FOUND

---
*Phase: 02-worktree-state-and-quality-gates*
*Completed: 2026-02-19*
