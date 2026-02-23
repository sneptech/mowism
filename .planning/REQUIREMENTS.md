# Requirements: Mowism v1.2

**Defined:** 2026-02-24
**Core Value:** Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration -- without manual context-checking between sessions.

## v1.2 Requirements

Requirements for v1.2 release. Each maps to roadmap phases.

### Worktree Adoption

- [x] **WKT-01**: Agent spawns use `--worktree` flag or `isolation: worktree` frontmatter instead of custom cmdWorktreeCreate
- [x] **WKT-02**: WorktreeCreate hook copies `.planning/` directory and initializes STATUS.md in new worktrees
- [x] **WKT-03**: WorktreeRemove hook removes manifest entry, releases phase claim, and clears dashboard state
- [x] **WKT-04**: All worktree path references updated from `.worktrees/pNN` to `.claude/worktrees/phase-NN`
- [x] **WKT-05**: Coordination layer (claim, merge, manifest, status) works with native worktree paths
- [x] **WKT-06**: Migration script detects existing `.worktrees/` entries and offers migration to native paths
- [x] **WKT-07**: Redundant worktree creation code removed from mow-tools.cjs (net LOC reduction)

### Full-Lifecycle Workers

- [x] **WORK-01**: Phase worker chains discuss → research → plan → execute → refine via sequential Task() subagent calls
- [x] **WORK-02**: Discuss-phase ALWAYS pauses for user input via `input_needed` message before continuing
- [x] **WORK-03**: Context between lifecycle stages passed via file paths, not file contents (prevent context bloat)
- [x] **WORK-04**: Worker detects existing stage artifacts (CONTEXT.md, PLANs, SUMMARYs) and resumes from correct point
- [x] **WORK-05**: Workers spawn specialized subagents (mow-phase-researcher, mow-planner, mow-executor, mow-verifier) via Task()
- [x] **WORK-06**: Workers send `stage_transition` messages as they move between lifecycle stages
- [x] **WORK-07**: Model routing per stage: Haiku for research, default for planning, executor_model for execution, verifier_model for refinement

### Auto-Advance Pipeline

- [ ] **AUTO-01**: `/mow:auto` command starts full pipeline from specified phase through milestone end
- [ ] **AUTO-02**: Cross-phase transition automatically invokes next phase's lifecycle when current phase completes
- [ ] **AUTO-03**: DAG-aware auto-advance only starts phases whose dependencies are satisfied
- [ ] **AUTO-04**: Auto-advance pauses at discuss-phase for user input and resumes after CONTEXT.md created
- [ ] **AUTO-05**: Auto-advance stops at milestone boundary and clears `workflow.auto_advance` config
- [ ] **AUTO-06**: `/mow:auto` accepts optional phase range (from/to) for partial pipeline execution
- [ ] **AUTO-07**: Auto-advance progress banner shows current phase and milestone percentage in dashboard

### Bugfix Ports

- [x] **BUG-01**: STATE.md state mutators use callback replacers instead of string replacement (dollar sign corruption fix)
- [x] **BUG-02**: Phase requirement IDs extracted from ROADMAP.md and propagated via init functions
- [x] **BUG-03**: Feature branch created at discuss-phase start when branching_strategy is "phase" (not delayed until execution)
- [x] **BUG-04**: Progress bar computations clamped with Math.min(100, ...) to prevent RangeError on orphaned files
- [x] **BUG-05**: Executor has maximum attempt limit per task to prevent infinite retry loops
- [x] **BUG-06**: plan-phase warns if no CONTEXT.md exists; discuss-phase warns if plans already exist
- [x] **BUG-07**: `/mow:health --repair` creates timestamped backup of STATE.md before regeneration
- [x] **BUG-08**: Subagent spawn prompts include project CLAUDE.md content for context discovery
- [x] **BUG-09**: Todo system has `in-progress/` state and `todo start` subcommand (not immediately moved to done/)
- [x] **BUG-10**: PostToolUse hook monitors context window usage and warns at 35%/25% remaining
- [x] **BUG-11**: Discuss-phase probes ambiguous user preferences with follow-up questions (gray area looping)

## Future Requirements

Deferred to v1.3+. Tracked but not in current roadmap.

### Quality Gates

- **QUAL-01**: Nyquist validation layer requires plan tasks to have verify commands
- **QUAL-02**: Full requirement propagation chain through all agents (roadmap → researcher → planner → executor → verifier)

### Maintenance

- **MAINT-01**: mow-tools.cjs domain split (~3,500 LOC → modular files)
- **MAINT-02**: `--full` flag for /mow:quick (enables plan-checking and verification)
- **MAINT-03**: Lifecycle walkthrough audit completion (paused for v1.2)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cross-milestone auto-advance | Milestones are deliberate boundaries requiring review and audit |
| 4+ level agent nesting | Blocked by Claude Code (subagents cannot spawn subagents since v1.0.64), OOM risk |
| Keeping both `.worktrees/` and `.claude/worktrees/` permanently | Doubles path logic and creates confusion about authoritative location |
| Auto-cleanup for phase worktrees | Phase worktrees always have changes; auto-remove risks destroying uncommitted work |
| Fully autonomous discuss-phase | Hard constraint: discuss captures user decisions that cannot be automated |
| `isolation: worktree` for executor subagents | Executors inherit worker's worktree; nested isolation doubles disk usage |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WKT-01 | Phase 14 | Complete |
| WKT-02 | Phase 14 | Complete |
| WKT-03 | Phase 14 | Complete |
| WKT-04 | Phase 14 | Complete |
| WKT-05 | Phase 14 | Complete |
| WKT-06 | Phase 14 | Complete |
| WKT-07 | Phase 14 | Complete |
| WORK-01 | Phase 15 | Complete |
| WORK-02 | Phase 15 | Complete |
| WORK-03 | Phase 15 | Complete |
| WORK-04 | Phase 15 | Complete |
| WORK-05 | Phase 15 | Complete |
| WORK-06 | Phase 15 | Complete |
| WORK-07 | Phase 15 | Complete |
| AUTO-01 | Phase 16 | Pending |
| AUTO-02 | Phase 16 | Pending |
| AUTO-03 | Phase 16 | Pending |
| AUTO-04 | Phase 16 | Pending |
| AUTO-05 | Phase 16 | Pending |
| AUTO-06 | Phase 16 | Pending |
| AUTO-07 | Phase 16 | Pending |
| BUG-01 | Phase 13 | Complete |
| BUG-02 | Phase 13 | Complete |
| BUG-03 | Phase 13 | Complete |
| BUG-04 | Phase 13 | Complete |
| BUG-05 | Phase 13 | Complete |
| BUG-06 | Phase 13 | Complete |
| BUG-07 | Phase 13 | Complete |
| BUG-08 | Phase 13 | Complete |
| BUG-09 | Phase 13 | Complete |
| BUG-10 | Phase 13 | Complete |
| BUG-11 | Phase 13 | Complete |

**Coverage:**
- v1.2 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after roadmap creation*
