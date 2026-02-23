# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration -- without manual context-checking between sessions.
**Current focus:** v1.2 Phase 14 (Native Worktree Adoption)

## Current Position

Milestone: v1.2 Native Worktrees & Full-Lifecycle Workers
Phase: 14 of 16 (Native Worktree Adoption)
Plan: 5 of 5 in current phase
Status: Phase 14 complete (including gap closure)
Last activity: 2026-02-24 -- Plan 14-05 executed (worktree test suite update for native paths)

Progress: [##########] 100% (Phase 14)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 22
- Average duration: 3min
- Total execution time: ~1 hour

**v1.1 Velocity:**
- Total plans completed: 17
- Total execution time: ~1 hour

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-fork-and-foundation | 6 | 23min | 4min |
| 02-worktree-state-and-quality-gates | 5 | 16min | 3min |
| 03-agent-teams-and-distribution | 6 | 11min | 2min |
| 04-distribution-portability | 3 | 6min | 2min |
| 05-fix-update-workflow | 1 | 2min | 2min |
| 06-cleanup-orphaned-workflows | 1 | 2min | 2min |
| 07-state-coherence-foundation | 4 | 20min | 5min |
| 08-dag-based-phase-scheduling | 3 | 15min | 5min |
| 09-multi-phase-execution-engine | 3 | 12min | 4min |
| 10-live-feedback-and-visual-differentiation | 3 | 15min | 5min |
| 11-readme-overhaul | 3 | 8min | 3min |
| 12-audit-gap-closure | 1 | 2min | 2min |
| 13-gsd-bugfix-ports (plan 05) | 1 | 2min | 2min |
| Phase 13 P03 | 2min | 2 tasks | 1 files |
| Phase 13 P01 | 5min | 3 tasks | 1 files |
| Phase 13 P02 | 5min | 2 tasks | 2 files |
| Phase 13 P04 | 5min | 2 tasks | 2 files |
| Phase 14 P01 | 4min | 2 tasks | 4 files |
| Phase 14 P02 | 4min | 2 tasks | 5 files |
| Phase 14 P03 | 3min | 2 tasks | 2 files |
| Phase 14 P04 | 5min | 2 tasks | 2 files |
| Phase 14 P05 | 2min | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table.
v1.1-specific decisions archived in `.planning/milestones/v1.1-ROADMAP.md`.

Recent for v1.2:
- Phase 13+14 are parallelizable (disjoint code sections)
- Native worktree adoption keeps existing coordination layer (claiming, manifest, merge)
- Full-lifecycle workers use disk-first context passing (file paths, not contents)
- Discuss-phase always pauses for user input (hard constraint, never bypassed)
- Tighter context window thresholds (25%/15%) than GSD upstream (35%/25%)
- SubagentStart hook uses additionalContext for non-disruptive CLAUDE.md injection
- [Phase 13-03]: Branch creation uses config-get for branching_strategy; ambiguity reframe limited to one attempt; BUG-06 context warning verified as already implemented
- [Phase 13]: Callback replacer pattern for .replace() with user data prevents dollar sign corruption
- [Phase 13]: Backups never auto-deleted; cleanup suggestion informational only
- [Phase 13]: Executor retry: warn at 3 attempts, hard block at max_task_attempts (default 5)
- [Phase 13-04]: Todo 3-state lifecycle: no concurrent limit, no auto-revert, file-path overlap interference detection only
- [Phase 14]: Phase worktrees at .claude/worktrees/phase-NN (not .worktrees/pNN) for native Claude Code convention
- [Phase 14]: Manifest key uses worktree name (phase-NN) instead of old pNN convention
- [Phase 14]: Remove hook always exits 0 with best-effort cleanup (cannot block removal)
- [Phase 14-02]: readManifest dual-path lookup (.claude/worktrees/ first, .worktrees/ fallback with deprecation warning)
- [Phase 14-02]: getActiveWorktrees uses git worktree list --porcelain (no WorkTrunk dependency)
- [Phase 14-02]: Team lead agent uses claude --worktree native mechanism for worktree creation
- [Phase 14-03]: Migration renames .worktrees/ to .worktrees.bak (never deletes) for safe rollback
- [Phase 14-03]: Active git worktrees block migration with actionable error listing
- [Phase 14-03]: Backups never auto-deleted; cleanup always user-initiated via clean-backup
- [Phase 14-04]: CLI worktree create redirects to cmdWorktreeCreateNative via legacy alias
- [Phase 14-04]: Hook scripts installed from .claude/hooks/ to mowism/hooks/ during install

### Pending Todos

1 pending todo (addressed in v1.2 scope):
- **Full-lifecycle multi-agent workers** -- `.planning/todos/pending/2026-02-20-full-lifecycle-multi-agent-workers.md`

### Blockers/Concerns

- Agent Teams API is experimental and may change (monitor Anthropic releases)
- Phase 15 inline workflow execution pattern needs validation during research-phase

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 14-05-PLAN.md (worktree test suite update for native paths)
Resume: Phase 14 fully complete (including gap closure plan 05). Continue with Phase 15

### Context Window Handoff (2026-02-23)
Session approaching context limit (~0% remaining). Work committed. Run /clear and resume.

### Context Window Handoff (2026-02-23)
Session approaching context limit (~0% remaining). Work committed. Run /clear and resume.

### Context Window Handoff (2026-02-23)
Session approaching context limit (~14% remaining). Work committed. Run /clear and resume.
