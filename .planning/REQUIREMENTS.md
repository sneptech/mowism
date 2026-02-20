# Requirements: Mowism v1.1

**Defined:** 2026-02-20
**Core Value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration -- without manual context-checking between sessions.

## v1.1 Requirements

Requirements for v1.1 release. Each maps to roadmap phases.

### State Coherence

- [ ] **STATE-01**: Lead/coordinator is the sole writer of STATE.md -- workers never modify it directly
- [ ] **STATE-02**: Each phase worker writes to an isolated `phases/XX/STATUS.md` file with no cross-worker contention
- [ ] **STATE-03**: Workers communicate state changes to the lead via structured JSON inbox messages (<1KB, defined schema)
- [ ] **STATE-04**: STATE.md becomes a lightweight index that links to per-phase STATUS.md files for detail

### DAG Scheduling

- [ ] **DAG-01**: ROADMAP.md supports arbitrary `depends_on` declarations (not just previous phase), enabling parallel tracks
- [ ] **DAG-02**: `mow-tools.cjs` includes topological sort (Kahn's algorithm) to resolve phase execution order from DAG
- [ ] **DAG-03**: Roadmapper agent auto-detects which phases can run in parallel based on requirement dependencies

### Multi-Phase Execution

- [ ] **EXEC-01**: Team lead can execute multiple independent phases simultaneously across worktrees
- [ ] **EXEC-02**: Phase workers are `general-purpose` teammates that independently orchestrate their own wave executors via Task()
- [ ] **EXEC-03**: Phase-level task dependencies in Agent Teams task list reflect the DAG from ROADMAP.md

### Live Feedback

- [ ] **FEED-01**: Workers send structured milestone messages at defined checkpoints (task claimed, commit made, task complete, error)
- [ ] **FEED-02**: Orchestrator aggregates worker messages into phase-level progress summary (O(phases) not O(tasks))
- [ ] **FEED-03**: Workers display color-coded ANSI banner at startup -- red background for orchestrator, rotating bright colors for workers
- [ ] **FEED-04**: When a worker hits a permission prompt, orchestrator shows which worker needs input and how to navigate to it

### Documentation

- [ ] **DOC-01**: README includes lifecycle narrative covering full project workflow from install to milestone completion
- [ ] **DOC-02**: All 34 `/mow:*` commands documented with description, usage, and examples
- [ ] **DOC-03**: Brownfield entry point documented (existing codebase -> map-codebase -> new-milestone)
- [ ] **DOC-04**: Configuration, security guidance, and troubleshooting sections included

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Nested Agent Coordination

- **NEST-01**: Custom message-relay system allowing executors to communicate through parent workers to the team lead
- **NEST-02**: Full nested team support (team-within-a-team) if Agent Teams adds the capability, or custom coordination layer

### Install & Platform

- **INST-01**: Install script Windows support (.bat/.ps1 equivalent, WSL detection)
- **INST-02**: Install idempotency and upgrade messaging

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time streaming output from workers | Agent Teams is message-based, not streaming. Discrete milestone messages are the achievable UX. |
| Custom Agent Teams implementation | Use Anthropic's experimental feature as-is. Only build custom layer if Agent Teams proves insufficient. |
| tmux-dependent features | tmux has platform limitations (VS Code terminal, Ghostty, Windows Terminal). All features must work without tmux. |
| OSC terminal escape sequences | Not portable across terminal emulators. ANSI background colors are the reliable subset. |
| Event sourcing / CQRS for state | Over-engineering. File-based state with single-writer protocol is sufficient. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STATE-01 | Phase 7 | Pending |
| STATE-02 | Phase 7 | Pending |
| STATE-03 | Phase 7 | Pending |
| STATE-04 | Phase 7 | Pending |
| DAG-01 | Phase 8 | Pending |
| DAG-02 | Phase 8 | Pending |
| DAG-03 | Phase 8 | Pending |
| EXEC-01 | Phase 9 | Pending |
| EXEC-02 | Phase 9 | Pending |
| EXEC-03 | Phase 9 | Pending |
| FEED-01 | Phase 10 | Pending |
| FEED-02 | Phase 10 | Pending |
| FEED-03 | Phase 10 | Pending |
| FEED-04 | Phase 10 | Pending |
| DOC-01 | Phase 11 | Pending |
| DOC-02 | Phase 11 | Pending |
| DOC-03 | Phase 11 | Pending |
| DOC-04 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation*
