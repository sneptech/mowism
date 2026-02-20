# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration -- without manual context-checking between sessions.
**Current focus:** v1.1 Phase 11 complete (README Overhaul) -- milestone ready for completion

## Current Position

Milestone: v1.1 Multi-Agent UX & Documentation
Phase: 11 of 11 (README Overhaul)
Plan: 3 of 3
Status: Complete
Last activity: 2026-02-20 -- Completed 11-03 (configuration, security, troubleshooting)

Progress: [####################] 100% (v1.0: 22/22 plans complete; v1.1: 16/16)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 22
- Average duration: 3min
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
| Phase 08 P01 | 8min | 2 tasks | 2 files |
| Phase 08 P02 | 4min | 2 tasks | 2 files |
| Phase 08 P03 | 3min | 2 tasks | 2 files |
| Phase 09 P01 | 5min | 2 tasks | 4 files |
| Phase 09 P03 | 3min | 2 tasks | 4 files |
| Phase 09 P02 | 4min | 2 tasks | 2 files |
| Phase 10 P10-01 | 6min | 3 tasks | 2 files |
| Phase 10 P10-02 | 5min | 2 tasks | 2 files |
| Phase 10 P10-03 | 4min | 2 tasks | 2 files |
| Phase 11 P11-01 | 3min | 2 tasks | 1 files |
| Phase 11 P11-02 | 3min | 2 tasks | 1 files |
| Phase 11 P03 | 2min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

**v1.1 Roadmap Decisions:**

| Decision | Rationale |
|----------|-----------|
| Phases 7+8 can execute in parallel | Different file domains (state layer vs roadmap layer) -- no shared write conflicts; this is proof-of-concept for DAG model |
| Phase 10 depends on Phase 7 only (not 8) | Structured messages and single-writer protocol are needed; DAG scheduling is not |
| README overhaul is last phase | Documents what was actually built; writing before implementation creates churn |
| 5 phases for quick depth | Each maps 1:1 to a requirement category; fewer would force artificial merges |

| Verbose event set as default with lean toggle commented out | Ship all 7 event types; can switch to milestones-only by uncommenting one line |
| Chat log filenames use sorted peer IDs | Deterministic deduplication: phase-07-to-phase-08 regardless of sender |
| Active Phases table coexists with Current Position | v1.0 single-agent view preserved; v1.1 multi-agent coordinator dashboard added alongside |
| STATUS.md existence as multi-agent detection signal | Convention-based: if coordinator initialized it, workers use multi-agent path; no config flag needed |

Full v1.0 decision log in PROJECT.md Key Decisions table.
Research context: `.planning/research/SUMMARY.md`
- [Phase 07]: Convention-based STATUS.md discovery over explicit links in STATE.md
- [Phase 08]: Used regex alternation (?:**:|:**) instead of optional quantifiers for dual-format markdown field matching
- [Phase 08]: Duplicated phase parsing in cmdRoadmapAnalyzeDag rather than refactoring shared helper -- avoids breaking existing consumers
- [Phase 08]: Missing dependency references treated as satisfied (warning only) -- more useful for real-world roadmaps
- [Phase 08]: DAG analyzer writes directly to ROADMAP.md rather than returning analysis to roadmapper -- simpler flow
- [Phase 08]: Default to INDEPENDENT when uncertain -- over-constraining is worse than under-constraining for execution efficiency
- [Phase 09]: cmdConfigGet falls back to CONFIG_DEFAULTS for unconfigured keys
- [Phase 09]: Worktree create uses direct git worktree add (not WorkTrunk wt) per research Pitfall 5
- [Phase 09]: Help file placed in help/ directory matching existing convention (not mowism/help/ which does not exist)
- [Phase 09]: Worker worktrees skip ROADMAP.md and REQUIREMENTS.md updates to avoid merge conflicts -- lead handles post-merge
- [Phase 09]: Create all phase tasks upfront with full DAG dependencies (not incrementally by wave)
- [Phase 09]: Phase workers spawned NOT in background -- need terminal access for discuss-phase user interaction
- [Phase 09]: Merge conflicts delegate to focused subagent with minimal context -- keeps lead and worker context lean
- [Phase 10]: Schema v2 backward compatible -- v1 messages still parse correctly
- [Phase 10]: Banner fallback chain: 256-color -> util.styleText bold+inverse -> plain text
- [Phase 10]: Auto-prune threshold 100/50 hardcoded for simplicity; pinned auto-dismiss on any non-error non-input event for same phase
- [Phase 10]: Dashboard is the notification mechanism -- lead does not manually notify user on input_needed
- [Phase 10]: input_needed replaces blocker for granular input routing; blocker kept as fallback
- [Phase 10]: Permission prompt context uses echo above Bash command since prompt itself cannot be modified
- [Phase 11]: Lifecycle uses numbered walkthrough with exact command names, not abstract descriptions
- [Phase 11]: Multi-agent presented as opt-in after single-agent default (progressive disclosure)
- [Phase 11]: Brownfield is a top-level section, not nested under lifecycle
- [Phase 11]: ASCII flow diagram chosen over Mermaid for universal compatibility
- [Phase 11]: Descriptions sourced from YAML frontmatter in commands/mow/*.md, not help.md
- [Phase 11]: join-discord excluded from README: exists in help.md but has no file in commands/mow/
- [Phase 11]: 14 agent definitions counted from actual agents/ directory (not 11 as plan specified)
- [Phase 11]: Multi-agent section corrected to describe full-lifecycle workers during human verification

### Pending Todos

1 pending todo:
- **Full-lifecycle multi-agent workers** — workers should run discuss → research → plan → execute → refine, not just execution (`.planning/todos/pending/2026-02-20-full-lifecycle-multi-agent-workers.md`)

### Blockers/Concerns

- Agent Teams API runtime questions (6 of 8 inconclusive) -- affects Phase 9 coordinator design. Defensive patterns documented. See `.planning/research/AGENT-TEAMS-API-RUNTIME.md`.
- Agent Teams API is experimental and may change (monitor Anthropic releases)

### Quick Tasks Completed

| # | Description | Date | Commit |
|---|-------------|------|--------|
| 1 | Research Agent Teams API capabilities and constraints | 2026-02-20 | ad6260a |
| 2 | Runtime test Agent Teams API (8 open questions) | 2026-02-20 | 16bea5a |

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 11-03-PLAN.md (final plan of Phase 11)
Resume: v1.1 milestone complete -- all 16/16 plans across 5 phases done. Run /mow:complete-milestone to archive.
Context: Phase 11 (README Overhaul) complete -- all 3 plans executed. README has lifecycle narrative, 35 commands reference, brownfield entry, configuration (9 settings + model profiles), security, troubleshooting, directory structure, common workflows, and license. All DOC-01 through DOC-04 requirements satisfied. v1.1 milestone ready for completion.
