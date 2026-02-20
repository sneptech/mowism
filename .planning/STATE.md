# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration -- without manual context-checking between sessions.
**Current focus:** v1.1 milestone scoping — lifecycle walkthrough audit

## Current Position

Milestone: v1.1 (in progress — scoping)
Status: Defining scope via lifecycle walkthrough
Last activity: 2026-02-20 - Completed quick task 1: Research Agent Teams API capabilities and constraints

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 22
- Average duration: 3min
- Total execution time: ~1 hour
- Timeline: 2 days (2026-02-19 → 2026-02-20)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-fork-and-foundation | 6 | 23min | 4min |
| 02-worktree-state-and-quality-gates | 5 | 16min | 3min |
| 03-agent-teams-and-distribution | 6 | 11min | 2min |
| 04-distribution-portability | 3 | 6min | 2min |
| 05-fix-update-workflow | 1 | 2min | 2min |
| 06-cleanup-orphaned-workflows | 1 | 2min | 2min |

## Accumulated Context

### Decisions

**v1.1 Session Decisions:**

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| README overhaul is v1.1 scope | README documents only 17/34 commands, no lifecycle narrative, no brownfield entry point, missing config/security/troubleshooting sections | — Pending |
| Lifecycle narrative modeled on GSD but Mowism-specific | GSD's README tells a story; ours is a reference card. Same storytelling approach but centered on worktree parallelism, quality gates, Agent Teams | — Pending |
| Include security + troubleshooting, skip community ports/star history | Security guidance is universally useful; Mowism is single-runtime (Claude Code only) | — Pending |
| Distributed input routing model (not centralized or hybrid) | User prefers switching to worker terminal with rich notification in orchestrator showing what's needed, not proxying questions through orchestrator | — Pending |
| Color-coded terminal badges per agent | Red background for orchestrator (always), rotating bright colors for workers. ANSI background escape codes. Must be clearly differentiated, not dark | — Pending |

Full v1.0 decision log in PROJECT.md Key Decisions table.
- [Phase quick-1]: Agent Teams: messages string-based, no streaming worker output, permission prompts session-local, terminal control outside scope. All 4 v1.1 multi-agent features PARTIALLY FEASIBLE with adaptations.

### Pending Todos

- Phase-level parallelism in roadmap and execution (`.planning/todos/pending/2026-02-20-phase-level-parallelism-in-roadmap-and-execution.md`)
- Live agent feedback and multi-phase input routing UX (`.planning/todos/pending/2026-02-20-live-agent-feedback-and-multi-phase-input-routing-ux.md`)
- Distributed input routing with color-coded agent terminals (`.planning/todos/pending/2026-02-20-distributed-input-routing-with-color-coded-agent-terminals.md`)
- ~~Research Agent Teams API capabilities and constraints~~ → DONE (quick task 1). See `.planning/research/AGENT-TEAMS-API.md`

### Flagged Issues (not yet todos)

- Install script (`bin/install.sh`) has no Windows support — no .bat/.ps1 equivalent, no WSL detection, no error message. Works on Linux, probably macOS, ignores Windows entirely. Flag for future milestone.
- `~/.claude/` directory existence not checked by install script (mkdir -p only creates subdirs)
- No reinstall/upgrade messaging in install script

### Blockers/Concerns

- Agent Teams API is experimental and may change (monitor Anthropic releases)
- ~~Agent Teams API capabilities are UNVERIFIED~~ → RESEARCHED (quick task 1). All 4 v1.1 features assessed as PARTIALLY FEASIBLE with documented adaptations. 8 open questions remain that require runtime testing. See `.planning/research/AGENT-TEAMS-API.md`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Research Agent Teams API capabilities and constraints | 2026-02-20 | ad6260a | [1-research-agent-teams-api-capabilities-an](./quick/1-research-agent-teams-api-capabilities-an/) |

### Lifecycle Walkthrough Progress

**Completed:**
- Install process (install.sh) — reviewed, found Windows gap
- Entry points (new-project vs map-codebase for brownfield) — verified wired up
- `/mow:new-project` full workflow — reviewed all 9 steps including auto mode
- `/mow:discuss-phase` full workflow — reviewed gray area identification, scope guardrails, auto-advance
- Agent Teams integration — reviewed team-lead, team-status, worktree-status, execute-phase
- Multi-agent UX — identified major gaps in feedback, parallel phase execution, input routing

**Not yet reviewed:**
- `/mow:plan-phase` — research → plan → verify loop
- `/mow:execute-phase` — detailed wave execution (reviewed at high level for Agent Teams)
- `/mow:refine-phase` — tiered quality gates
- `/mow:verify-work` — conversational UAT
- `/mow:complete-milestone` — archive and prep
- `/mow:pause-work` and `/mow:resume-work` — session continuity
- `/mow:quick` — ad-hoc task mode
- `/mow:debug` — systematic debugging
- Quality skills — scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary

### Committed Changes This Session

- `bd9b507` docs(quick-1): create Agent Teams API research plan
- `007eea3` docs(quick-1): research Agent Teams API runtime capabilities and constraints
- `ad6260a` docs(quick-1): complete Agent Teams API research plan
- `f508337` docs(quick-1): Research Agent Teams API capabilities and constraints (STATE.md update)

## Session Continuity

Last session: 2026-02-20
Stopped at: Quick task 1 (Agent Teams API research) complete. Quick task 2 (runtime testing) was initialized but NOT started — user needs to set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and restart Claude Code first.
Resume: Run `/mow:quick` to runtime-test Agent Teams API (8 open questions from research doc). Then continue lifecycle walkthrough from `/mow:plan-phase` onwards, then formalize v1.1 scope with `/mow:new-milestone`.
Context: Agent Teams API research complete — all 4 v1.1 multi-agent features PARTIALLY FEASIBLE with adaptations. Key findings: no streaming (message-driven feedback), permission prompts are session-local (distributed routing confirmed), terminal control outside Agent Teams scope (color badges are shell-level). 8 open questions need runtime testing with env var enabled. Lifecycle walkthrough paused at plan-phase. 3 remaining multi-agent todos unblocked for scoping.
