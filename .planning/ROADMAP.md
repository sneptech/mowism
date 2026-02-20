# Roadmap: Mowism

## Milestones

- ✅ **v1.0 Mowism** -- Phases 1-6 (shipped 2026-02-20)
- [ ] **v1.1 Multi-Agent UX & Documentation** -- Phases 7-11 (in progress)

## Phases

<details>
<summary>v1.0 Mowism (Phases 1-6) -- SHIPPED 2026-02-20</summary>

- [x] Phase 1: Fork and Foundation (6/6 plans) -- completed 2026-02-19
- [x] Phase 2: Worktree State and Quality Gates (5/5 plans) -- completed 2026-02-19
- [x] Phase 3: Agent Teams and Distribution (6/6 plans) -- completed 2026-02-19
- [x] Phase 4: Distribution Portability (3/3 plans) -- completed 2026-02-19
- [x] Phase 5: Fix Update Workflow (1/1 plan) -- completed 2026-02-19
- [x] Phase 6: Cleanup Orphaned Workflows (1/1 plan) -- completed 2026-02-20

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Multi-Agent UX & Documentation

**Milestone Goal:** Make parallel multi-agent execution actually work -- coherent state across worktrees, DAG-based phase scheduling, live feedback, color-coded terminals -- then document the full system.

**Execution Order (DAG):**
```
Phase 7 (State Coherence) ---+---> Phase 9 (Multi-Phase Execution) ---> Phase 11 (README)
                              |                                      /
Phase 8 (DAG Scheduling)  ---+---> Phase 10 (Feedback + Colors) ----/
```
Phases 7 and 8 can execute in parallel (different file domains, no data dependencies).

- [x] **Phase 7: State Coherence Foundation** - Single-writer protocol, per-phase STATUS.md, structured messaging (completed 2026-02-20)
- [x] **Phase 8: DAG-Based Phase Scheduling** - Dependency declarations, topological sort, parallel track detection (completed 2026-02-20)
- [x] **Phase 9: Multi-Phase Execution Engine** - Concurrent phase workers across worktrees via Agent Teams (completed 2026-02-20)
- [x] **Phase 10: Live Feedback and Visual Differentiation** - Structured milestone messages, color-coded terminals, input routing (completed 2026-02-20)
- [x] **Phase 11: README Overhaul** - Lifecycle narrative, all 35 commands, brownfield entry, config/security/troubleshooting (completed 2026-02-20)
- [x] **Phase 12: Audit Gap Closure** - Standardize SendMessage recipient, add requirements_completed to SUMMARY template, fix stale counts (completed 2026-02-20)

## Phase Details

### Phase 7: State Coherence Foundation
**Goal**: Workers and coordinator can operate on shared project state without conflicts or lost updates
**Depends on**: Nothing (first v1.1 phase, no v1.1 dependencies)
**Parallel with**: Phase 8 (different file domains -- state layer vs roadmap layer)
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04
**Success Criteria** (what must be TRUE):
  1. Coordinator (lead) is the only process that writes STATE.md -- workers never modify it directly
  2. Each phase worker writes progress to its own isolated `phases/XX/STATUS.md` file without touching any other worker's files
  3. Workers send state change notifications to the coordinator via structured JSON messages with a defined schema
  4. STATE.md is a lightweight index (~50-100 lines) linking to per-phase STATUS.md files for detail, not a monolithic dump of all phase state
**Plans:** 4/4 plans complete

Plans:
- [ ] 07-01-PLAN.md -- Per-phase STATUS.md template and status CLI subcommands (init/read/write/aggregate)
- [ ] 07-02-PLAN.md -- Structured JSON message schema, format/parse helpers, and peer chat log infrastructure
- [ ] 07-03-PLAN.md -- STATE.md Active Phases table, active-phases/update-phase-row subcommands
- [ ] 07-04-PLAN.md -- Wire execute-plan.md and mow-team-lead.md to single-writer protocol

### Phase 8: DAG-Based Phase Scheduling
**Goal**: Roadmaps express arbitrary dependency relationships between phases, and tooling resolves execution order automatically
**Depends on**: Nothing (no v1.1 dependencies; can run in parallel with Phase 7)
**Parallel with**: Phase 7 (different file domains -- roadmap parsing vs state management)
**Requirements**: DAG-01, DAG-02, DAG-03
**Success Criteria** (what must be TRUE):
  1. ROADMAP.md `depends_on` field accepts comma-separated phase lists (not just "previous phase"), and existing roadmap parsing still works
  2. Running `mow-tools.cjs roadmap analyze-dag` produces correct execution waves from any valid DAG (tested with diamond, linear, independent, and complex topologies)
  3. The roadmapper agent auto-detects which phases can run in parallel based on requirement dependencies and emits `depends_on` and `Parallel with` annotations
**Plans**: 3/3 plans complete

Plans:
- [x] 08-01-PLAN.md -- Fix regex format bug, add parseDependsOn() helper, update tests
- [x] 08-02-PLAN.md -- Implement topoGenerations() and roadmap analyze-dag subcommand (TDD)
- [x] 08-03-PLAN.md -- Create mow-dag-analyzer agent and integrate into roadmapper workflow

### Phase 9: Multi-Phase Execution Engine
**Goal**: Multiple independent phases execute simultaneously across worktrees with coordinated orchestration
**Depends on**: Phase 7, Phase 8
**Requirements**: EXEC-01, EXEC-02, EXEC-03
**Success Criteria** (what must be TRUE):
  1. Team lead can spawn workers for 2+ independent phases simultaneously, each in its own worktree
  2. Phase workers are `general-purpose` teammates that independently orchestrate their own plan execution via Task() -- not micromanaged by the lead
  3. Agent Teams task dependencies reflect the DAG from ROADMAP.md -- a phase task is blocked until all its `depends_on` phases complete
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md -- Worktree lifecycle subcommands, manifest management, checkpoint template, circuit breaker config
- [ ] 09-02-PLAN.md -- Multi-phase team lead orchestrator and autonomous phase worker agent definitions
- [ ] 09-03-PLAN.md -- Close-shop workflow and execute-phase multi-phase mode awareness

### Phase 10: Live Feedback and Visual Differentiation
**Goal**: Users can visually distinguish agents, track parallel progress, and know exactly where to provide input when prompted
**Depends on**: Phase 7
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04
**Success Criteria** (what must be TRUE):
  1. Workers send structured milestone messages at defined checkpoints (task claimed, commit made, task complete, error) -- not freeform text
  2. Orchestrator displays phase-level progress summary aggregated from worker messages (O(phases) not O(tasks))
  3. Each terminal session displays a color-coded ANSI banner at startup -- red background for orchestrator, rotating bright colors for workers -- visible at a glance
  4. When a worker hits a permission prompt or needs user input, the orchestrator shows which worker needs attention including phase name, input type, and which terminal/color to switch to
**Plans**: 3 plans

Plans:
- [ ] 10-01-PLAN.md -- ANSI 256-color helpers, message schema v2 (5 new checkpoint types), banner/progress bar renderers
- [ ] 10-02-PLAN.md -- Dashboard renderer (summary table, event log, pinned notifications, NDJSON event storage)
- [ ] 10-03-PLAN.md -- Agent integration (team lead dashboard wiring, phase worker banners/milestones/input routing)

### Phase 11: README Overhaul
**Goal**: A new user can understand, install, and use Mowism from the README alone
**Depends on**: Phase 7, Phase 8, Phase 9, Phase 10
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. README includes a lifecycle narrative covering the full project workflow from install through milestone completion, including multi-agent parallel execution
  2. All 35 `/mow:*` commands are documented with description, usage, and examples
  3. Brownfield entry point is documented -- existing codebase to `map-codebase` to `new-milestone` workflow is clear
  4. Configuration options, security guidance (API keys, permissions), and troubleshooting sections are present and actionable
**Plans**: 3 plans

Plans:
- [ ] 11-01-PLAN.md -- README scaffold, opening, install, lifecycle narrative, brownfield entry
- [ ] 11-02-PLAN.md -- Complete command reference (35 /mow:* commands + 7 quality skills)
- [ ] 11-03-PLAN.md -- Configuration, security, troubleshooting, directory structure, common workflows

### Phase 12: Audit Gap Closure
**Goal**: Close integration and tech debt gaps identified by v1.1 milestone audit
**Depends on**: Phase 11
**Requirements**: STATE-03, FEED-01 (integration wiring fix), DOC-02 (stale count)
**Gap Closure**: Closes gaps from v1.1-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. SendMessage `recipient` field uses the same value in both `execute-plan.md` and `mow-phase-worker.md`
  2. SUMMARY.md template includes `requirements_completed` in YAML frontmatter
  3. REQUIREMENTS.md text says "35" commands (not "34")
**Plans**: 1 plan (3 small tasks)

Plans:
- [ ] 12-01-PLAN.md -- Standardize recipient name, add template field, fix stale count

## Progress

**Execution Order:**
Phases 7 and 8 can execute in parallel. Phase 9 requires both 7 and 8. Phase 10 requires 7. Phase 11 requires 7, 8, 9, 10.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Fork and Foundation | v1.0 | 6/6 | Complete | 2026-02-19 |
| 2. Worktree State and Quality Gates | v1.0 | 5/5 | Complete | 2026-02-19 |
| 3. Agent Teams and Distribution | v1.0 | 6/6 | Complete | 2026-02-19 |
| 4. Distribution Portability | v1.0 | 3/3 | Complete | 2026-02-19 |
| 5. Fix Update Workflow | v1.0 | 1/1 | Complete | 2026-02-19 |
| 6. Cleanup Orphaned Workflows | v1.0 | 1/1 | Complete | 2026-02-20 |
| 7. State Coherence Foundation | v1.1 | 4/4 | Complete | 2026-02-20 |
| 8. DAG-Based Phase Scheduling | v1.1 | 3/3 | Complete | 2026-02-20 |
| 9. Multi-Phase Execution Engine | v1.1 | Complete    | 2026-02-20 | - |
| 10. Live Feedback and Visual Differentiation | 3/3 | Complete    | 2026-02-20 | - |
| 11. README Overhaul | 3/3 | Complete    | 2026-02-20 | - |
| 12. Audit Gap Closure | 1/1 | Complete   | 2026-02-20 | - |
