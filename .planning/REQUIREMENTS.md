# Requirements: Mowism

**Defined:** 2026-02-19
**Core Value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration — without manual context-checking between sessions.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Framework

- [ ] **CORE-01**: All GSD workflows forked and `/gsd:*` commands rebranded to `/mow:*`
- [ ] **CORE-02**: `gsd-tools.cjs` forked to `mow-tools.cjs` with all internal references updated
- [ ] **CORE-03**: All GSD agent definitions forked with updated references to Mowism paths
- [ ] **CORE-04**: All GSD templates forked with updated branding
- [ ] **CORE-05**: All GSD references (questioning guide, UI brand) forked with updated branding
- [ ] **CORE-06**: `/mow:migrate` command upgrades existing GSD `.planning/` directory to Mowism format (backwards compatible)

### Worktree Management

- [ ] **WKTR-01**: WorkTrunk (`wt` CLI) declared as required dependency; Mowism checks for it on init and errors clearly if missing
- [ ] **WKTR-02**: STATE.md tracks which worktree is executing which phase/plan
- [ ] **WKTR-03**: STATE.md prevents double-execution (two worktrees claiming the same plan)
- [ ] **WKTR-04**: WorkTrunk post-create hook configures new worktrees with access to main worktree's `.planning/` state
- [ ] **WKTR-05**: `/mow:execute-phase` is worktree-aware — routes plans to specific worktrees when running in parallel

### Quality Skills

- [ ] **SKIL-01**: `/scope-check` skill forked and registered in Mowism
- [ ] **SKIL-02**: `/simplify` skill forked and registered in Mowism
- [ ] **SKIL-03**: `/dead-code-sweep` skill forked and registered in Mowism
- [ ] **SKIL-04**: `/prove-it` skill forked and registered in Mowism
- [ ] **SKIL-05**: `/grill-me` skill forked and registered in Mowism
- [ ] **SKIL-06**: `/change-summary` skill forked and registered in Mowism
- [ ] **SKIL-07**: `/update-claude-md` skill forked and registered in Mowism

### Quality Gate

- [ ] **GATE-01**: `/mow:refine-phase` command exists and runs between execute-phase and verify-work
- [ ] **GATE-02**: `/mow:refine-phase` presents 3 tier options (minimum, complex, algorithmic) via AskUserQuestion
- [ ] **GATE-03**: Minimum tier runs: scope-check (gate) → change-summary → verify-work → update-claude-md
- [ ] **GATE-04**: Complex tier runs: scope-check (gate) → simplify + dead-code-sweep + grill-me in parallel → change-summary → verify-work → update-claude-md
- [ ] **GATE-05**: Algorithmic tier runs: scope-check (gate) → prove-it + simplify + dead-code-sweep + grill-me in parallel → change-summary → verify-work → update-claude-md
- [ ] **GATE-06**: Quality check subagents write findings to `.planning/phases/VERIFICATION-CHAIN-P{phase}.md`
- [ ] **GATE-07**: STATE.md updated after refine-phase with verification results (date, tier used, pass/fail, blockers)
- [ ] **GATE-08**: Each quality check within a worktree runs locally; findings summary is accessible to orchestrator
- [ ] **GATE-09**: Reconciliation step after parallel quality checks synthesizes potentially conflicting recommendations

### Agent Teams

- [ ] **TEAM-01**: `/mow:new-project` offers option to spawn Agent Teams setup with lead orchestrator
- [ ] **TEAM-02**: `/mow:resume-work` offers option to re-spawn Agent Teams from persisted `.planning/` state
- [ ] **TEAM-03**: Lead orchestrator tracks overall project state while human hops between individual sessions
- [ ] **TEAM-04**: Agent Teams gracefully degrades to subagent-only mode when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is not enabled
- [ ] **TEAM-05**: STATE.md tracks agent team status (active teammates, assigned worktrees, current tasks)

### Distribution

- [ ] **DIST-01**: One-command install script that clones repo and registers all `/mow:*` skills in `~/.claude/`
- [ ] **DIST-02**: `???` suffix on any `/mow:*` command opens that command's workflow markdown in `$EDITOR`
- [ ] **DIST-03**: Install script checks for WorkTrunk and warns if not installed
- [ ] **DIST-04**: Install script checks for Agent Teams env var and informs user it's optional but recommended
- [ ] **DIST-05**: GitHub repo with README explaining what Mowism is, how to install, and how to use

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional Quality Skills

- **SKIL-08**: `/test-first` skill forked and registered
- **SKIL-09**: `/naive-first` skill forked and registered
- **SKIL-10**: `/fix-ci` skill forked and registered
- **SKIL-11**: `/elegant-redo` skill forked and registered
- **SKIL-12**: `/surface-assumptions` skill forked and registered
- **SKIL-13**: `/clarify` skill forked and registered
- **SKIL-14**: `/pushback` skill forked and registered
- **SKIL-15**: `/inline-plan` skill forked and registered
- **SKIL-16**: `/techdebt` skill forked and registered
- **SKIL-17**: `/explain-visual` skill forked and registered
- **SKIL-18**: `/ascii-diagram` skill forked and registered
- **SKIL-19**: `/subagent-blast` skill forked and registered
- **SKIL-20**: `/context-dump` skill forked and registered
- **SKIL-21**: `/plan-and-review` skill forked and registered

### Enhanced Features

- **ENHC-01**: Cross-worktree `.planning/` synchronization (real-time, not merge-based)
- **ENHC-02**: Terminal TUI for monitoring parallel agents across worktrees
- **ENHC-03**: Upstream GSD feature parity tracking (automated detection of upstream changes)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom Agent Teams implementation | Use Anthropic's as-is; reimplementing coordination primitives is enormous effort that diverges from platform direction |
| GUI / web dashboard | CLI-first tool for CLI-first users; `wt list` + `/mow:progress` covers monitoring |
| Knowledge graph / vector database | `.planning/` files in git + CLAUDE.md are sufficient; adds infrastructure complexity for marginal gain |
| 60+ specialized agent roles | More roles = more maintenance; GSD's focused set + quality skills is sufficient |
| Automatic model routing | GSD's user-selected profiles are more predictable; auto-routing adds classification cost and misclassification risk |
| Plugin/extension marketplace | Skills are .md files; users copy them into a directory; no registry infrastructure needed |
| Forking/modifying WorkTrunk | Use as-is via hooks and CLI; maintain clean dependency boundary |
| Multi-year workflow persistence beyond git | Aspirational goal; git history + `.planning/` files are sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | — | Pending |
| CORE-02 | — | Pending |
| CORE-03 | — | Pending |
| CORE-04 | — | Pending |
| CORE-05 | — | Pending |
| CORE-06 | — | Pending |
| WKTR-01 | — | Pending |
| WKTR-02 | — | Pending |
| WKTR-03 | — | Pending |
| WKTR-04 | — | Pending |
| WKTR-05 | — | Pending |
| SKIL-01 | — | Pending |
| SKIL-02 | — | Pending |
| SKIL-03 | — | Pending |
| SKIL-04 | — | Pending |
| SKIL-05 | — | Pending |
| SKIL-06 | — | Pending |
| SKIL-07 | — | Pending |
| GATE-01 | — | Pending |
| GATE-02 | — | Pending |
| GATE-03 | — | Pending |
| GATE-04 | — | Pending |
| GATE-05 | — | Pending |
| GATE-06 | — | Pending |
| GATE-07 | — | Pending |
| GATE-08 | — | Pending |
| GATE-09 | — | Pending |
| TEAM-01 | — | Pending |
| TEAM-02 | — | Pending |
| TEAM-03 | — | Pending |
| TEAM-04 | — | Pending |
| TEAM-05 | — | Pending |
| DIST-01 | — | Pending |
| DIST-02 | — | Pending |
| DIST-03 | — | Pending |
| DIST-04 | — | Pending |
| DIST-05 | — | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 0
- Unmapped: 36 ⚠️

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after initial definition*
