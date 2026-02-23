---
phase: 15-full-lifecycle-workers
plan: 02
subsystem: agents
tags: [mow-phase-worker, lifecycle, subagent-delegation, stage-gates, resume-detection, disk-first]

# Dependency graph
requires:
  - phase: 15-full-lifecycle-workers
    plan: 01
    provides: "summary_count field and worker/workflow config defaults"
provides:
  - "Full-lifecycle phase worker with 5-stage pipeline (discuss/research/plan/execute/refine)"
  - "Artifact-based resume detection for crash recovery and session resumption"
  - "Configurable stage gates for user-controlled autonomy"
  - "Disk-first context passing pattern for multi-stage context efficiency"
affects: [15-03, mow-team-lead, auto-advance-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline workflow execution for orchestrating stages (discuss/plan/execute)"
    - "Task() delegation only for leaf subagents (researcher/executor/verifier)"
    - "Disk-first context passing (file paths, not contents) between lifecycle stages"
    - "Stage gate check at every stage boundary via config-get (not cached)"

key-files:
  created: []
  modified:
    - agents/mow-phase-worker.md

key-decisions:
  - "Discuss runs inline (not Task()) because AskUserQuestion needs worker terminal session"
  - "Plan-phase runs inline because it spawns its own subagents (nested Task() would OOM)"
  - "Stage gates read at each boundary (not cached at init) to allow mid-lifecycle config changes"
  - "workflow.verifier config reused for refine stage skip (no new config key)"
  - "One retry for research/planning failures, then checkpoint; executor failures use existing retry limits"

patterns-established:
  - "3-level hierarchy: lead -> worker (inline workflows) -> leaf subagents (Task())"
  - "Artifact-based resume: CONTEXT->RESEARCH->PLANs->SUMMARYs->VERIFICATION detection chain"
  - "Dual-path notification: input_needed to lead + AskUserQuestion in worker terminal"

requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 15 Plan 02: Full-Lifecycle Worker Rewrite Summary

**Rewrote mow-phase-worker.md to chain all 5 lifecycle stages (discuss/research/plan/execute/refine) with artifact-based resume, configurable stage gates, disk-first context passing, and nested subagent delegation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T21:03:12Z
- **Completed:** 2026-02-23T21:06:33Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Complete rewrite of mow-phase-worker.md from 3-stage (context/plan/execute) to 5-stage (discuss/research/plan/execute/refine) lifecycle
- Artifact-based resume detection using init phase-op fields (has_context, has_research, has_plans, summary_count, has_verification) to skip completed stages
- Dual-path discuss notification: input_needed message to lead AND AskUserQuestion in worker terminal, with hard constraint that discuss never bypasses user input
- Disk-first context passing pattern: subagents write to disk, worker stores only file paths, preventing 100-150k token accumulation across stages
- Configurable stage gates (none/before_execute/every_stage) read at each boundary, not cached, allowing mid-lifecycle autonomy changes
- Model resolution via resolve-model at init for all 5 subagent types (researcher, planner, checker, executor, verifier)
- Stage transition messages sent at every lifecycle boundary for dashboard visibility
- Preserved all existing constraints (single-writer protocol, no STATE.md reads, phase-only commits, stay alive), messaging protocol (11 message types), and failure handling (checkpoint files, error banners, cancel support)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite mow-phase-worker.md with full lifecycle pipeline** - `b116aac` (feat)

## Files Created/Modified
- `agents/mow-phase-worker.md` - Full-lifecycle phase worker with 5-stage pipeline, resume detection, stage gates, nested delegation

## Decisions Made
- Discuss runs inline (not as Task()) because AskUserQuestion needs the worker's terminal session; dual-path notification ensures lead dashboard visibility
- Plan-phase runs inline because it spawns mow-planner and mow-plan-checker as Task() subagents -- nesting plan-phase as Task() would cause OOM from nested spawning
- Stage gate config read via config-get at each boundary (not cached at init) per research pitfall #6: allows users to change autonomy mid-lifecycle
- Reuse existing workflow.verifier config flag to control refine stage skip (no new config key needed)
- Subagent failures get one retry at same stage; if retry fails, checkpoint and wait for user (no automatic stage fallback)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full-lifecycle worker ready for parallelizability validation in Plan 03
- Worker can be spawned by team lead and will autonomously chain all stages
- Stage gates allow user to control review points per project
- Resume detection enables safe crash recovery across all stages

---
*Phase: 15-full-lifecycle-workers*
*Completed: 2026-02-24*

## Self-Check: PASSED
