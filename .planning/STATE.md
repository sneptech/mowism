# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Repository:** https://github.com/sneptech/mowism
**Core value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration -- without manual context-checking between sessions.
**Current focus:** Planning next milestone

## Current Position

Milestone: v1.3 tmux Multi-Agent Execution
Phase: Not started (requirements defined, awaiting roadmap)
Status: Requirements complete, needs roadmap
Last activity: 2026-02-25 -- 16 requirements defined

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 22
- Average duration: 3min
- Total execution time: ~1 hour

**v1.1 Velocity:**
- Total plans completed: 17
- Total execution time: ~1 hour

**v1.2 Velocity:**
- Total plans completed: 15
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
| 13-gsd-bugfix-ports | 5 | 19min | 4min |
| 14-native-worktree-adoption | 5 | 18min | 4min |
| 15-full-lifecycle-workers | 3 | 8min | 3min |
| 16-auto-advance-pipeline | 2 | 8min | 4min |

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table.
v1.1-specific decisions archived in `.planning/milestones/v1.1-ROADMAP.md`.
v1.2-specific decisions archived in `.planning/milestones/v1.2-ROADMAP.md`.

### Pending Todos

0 pending todos.

### Blockers/Concerns

- Agent Teams API is experimental and may change (monitor Anthropic releases)
- WorktreeRemove hook does not fire if `git worktree remove` fails (e.g., directory held open by file browser) -- Claude Code limitation, not Mowism

## Session Continuity

Last session: 2026-02-25
Stopped at: v1.3 requirements defined (16 reqs), research complete (5 files in .planning/research/v1.3-*.md)
Resume: Run roadmapper to create ROADMAP.md from REQUIREMENTS.md. Phase numbering starts at 17 (v1.2 ended at phase 16). Then /mow:discuss-phase 17.

### Key Decisions Made This Session
- Orchestrator is Node.js (mow-tools.cjs), NOT a Claude agent — saves ~800k tokens, no context exhaustion
- Workers are separate interactive `claude` CLI processes in tmux panes (not Agent Teams subprocesses)
- `-e CLAUDECODE=""` on all tmux split-window calls (critical env var override)
- Use split-window "command" (NOT send-keys) to avoid shell init race condition
- fs.watch + polling fallback for STATUS.md coordination (no external deps)
- Layout: main-vertical, orchestrator left sidebar, workers stacked right
- Pane lifecycle: auto-spawn, ask before close
- Three-mode fallback: tmux → agent-teams → sequential
- Max workers default: 3 with staggered startup
