# Requirements: Mowism v1.3

**Defined:** 2026-02-25
**Core Value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration — without manual context-checking between sessions.

## v1.3 Requirements

Requirements for tmux multi-agent execution. Each maps to roadmap phases.

### Session Management

- [ ] **TMUX-01**: Orchestrator can create a tmux session with deterministic naming (mow-{project}-{milestone}) and manage its lifecycle
- [ ] **TMUX-02**: Detect $TMUX env var — create new window if already inside tmux, new session if not (never force-nest)
- [ ] **TMUX-03**: On startup, detect existing mow tmux sessions and offer resume-or-kill to the user
- [ ] **TMUX-04**: SIGINT handler sends C-c to all worker panes, waits for graceful exit, then kills session

### Worker Spawning

- [ ] **SPAWN-01**: Spawn interactive `claude` CLI processes in tmux panes via `split-window "command"` with `-e CLAUDECODE=""` override
- [ ] **SPAWN-02**: Inject phase context into workers via `--append-system-prompt` with full lifecycle instructions (discuss → research → plan → execute → refine)
- [ ] **SPAWN-03**: Use `--session-id mow-phase-NN` for each worker so crashed sessions can resume via `--resume`
- [ ] **SPAWN-04**: Configurable `max_workers` (default 3) stored in `.planning/config.json` with staggered startup to avoid API rate limit spikes

### Coordination

- [ ] **COORD-01**: Watch STATUS.md files via `fs.watch` (inotify) with 100ms debounce and 5-second polling fallback for worker completion detection
- [ ] **COORD-02**: Orchestrator shows notification when a worker writes `awaiting_input` to STATUS.md, with tmux pane reference for user navigation
- [ ] **COORD-03**: Full DAG-driven orchestration loop: parse ROADMAP.md → group into waves → spawn workers → monitor STATUS.md → merge completed worktrees → spawn next wave
- [ ] **COORD-04**: Circuit breaker stops spawning after N consecutive failures (configurable threshold, default 2)

### Integration

- [ ] **INTEG-01**: `/mow:auto` detects tmux availability and routes to Node.js tmux orchestrator (`mow-tools.cjs tmux orchestrate`) instead of Agent Teams team lead
- [ ] **INTEG-02**: Three-mode fallback chain with detection: tmux (default) → agent-teams (explicit opt-in) → sequential (no tmux), configurable via `config.execution_mode`

### UX

- [ ] **UX-01**: Main-vertical tmux layout with orchestrator left sidebar, workers stacked right; per-pane border colors from Mowism 256-color palette; pane titles showing phase name and lifecycle stage
- [ ] **UX-02**: Auto-spawn new panes when next DAG wave unlocks; orchestrator asks user before closing completed panes

## Future Requirements

### Deferred to v2+

- **THEME-01**: tmux status bar integration showing aggregate milestone progress
- **THEME-02**: Stall detection via tmux monitor-silence (5min threshold)
- **RESUME-01**: `mow-tools.cjs tmux resume` re-reads STATE.md and re-attaches watchers after orchestrator crash
- **COST-01**: Token velocity / cost tracking per worker pane

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom TUI framework (blessed/ink) | tmux pane layout IS the TUI; external deps add complexity for no benefit |
| Web-based monitoring dashboard | CLI-first tool; explicitly rejected in v1.0 |
| Multi-session per milestone | One session = one milestone; multiple sessions add discovery complexity |
| Custom keybinding overlay | Conflicts with user tmux configs; use mow-tools subcommands instead |
| Automatic model routing per worker | User-selected profiles are more predictable |
| `claude --tmux` flag usage | Conflicts with Mowism's own session management |
| Removing Agent Teams entirely | Preserved as legacy fallback for users who prefer it |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMUX-01 | TBD | Pending |
| TMUX-02 | TBD | Pending |
| TMUX-03 | TBD | Pending |
| TMUX-04 | TBD | Pending |
| SPAWN-01 | TBD | Pending |
| SPAWN-02 | TBD | Pending |
| SPAWN-03 | TBD | Pending |
| SPAWN-04 | TBD | Pending |
| COORD-01 | TBD | Pending |
| COORD-02 | TBD | Pending |
| COORD-03 | TBD | Pending |
| COORD-04 | TBD | Pending |
| INTEG-01 | TBD | Pending |
| INTEG-02 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |

**Coverage:**
- v1.3 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 ⚠️

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
