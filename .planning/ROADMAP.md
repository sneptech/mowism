# Roadmap: Mowism

## Milestones

- ✅ **v1.0 Mowism** -- Phases 1-6 (shipped 2026-02-20)
- ✅ **v1.1 Multi-Agent UX & Documentation** -- Phases 7-12 (shipped 2026-02-24)
- [ ] **v1.2 Native Worktrees & Full-Lifecycle Workers** -- Phases 13-16 (in progress)

## Phases

<details>
<summary>✅ v1.0 Mowism (Phases 1-6) -- SHIPPED 2026-02-20</summary>

- [x] Phase 1: Fork and Foundation (6/6 plans) -- completed 2026-02-19
- [x] Phase 2: Worktree State and Quality Gates (5/5 plans) -- completed 2026-02-19
- [x] Phase 3: Agent Teams and Distribution (6/6 plans) -- completed 2026-02-19
- [x] Phase 4: Distribution Portability (3/3 plans) -- completed 2026-02-19
- [x] Phase 5: Fix Update Workflow (1/1 plan) -- completed 2026-02-19
- [x] Phase 6: Cleanup Orphaned Workflows (1/1 plan) -- completed 2026-02-20

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Multi-Agent UX & Documentation (Phases 7-12) -- SHIPPED 2026-02-24</summary>

- [x] Phase 7: State Coherence Foundation (4/4 plans) -- completed 2026-02-20
- [x] Phase 8: DAG-Based Phase Scheduling (3/3 plans) -- completed 2026-02-20
- [x] Phase 9: Multi-Phase Execution Engine (3/3 plans) -- completed 2026-02-20
- [x] Phase 10: Live Feedback and Visual Differentiation (3/3 plans) -- completed 2026-02-20
- [x] Phase 11: README Overhaul (3/3 plans) -- completed 2026-02-20
- [x] Phase 12: Audit Gap Closure (1/1 plan) -- completed 2026-02-20

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v1.2 Native Worktrees & Full-Lifecycle Workers (In Progress)

**Milestone Goal:** Adopt Claude Code's native worktree isolation, fix upstream bugs, enable full-lifecycle autonomous phase workers, and wire it all together with auto-advance pipeline.

**Phase Numbering:**
- Integer phases (13, 14, 15, 16): Planned milestone work
- Decimal phases (13.1, 14.1): Urgent insertions if needed (marked with INSERTED)

- [x] **Phase 13: GSD Bugfix Ports** - Fix 11 correctness bugs from GSD upstream plus context window monitor hook (completed 2026-02-23)
- [ ] **Phase 14: Native Worktree Adoption** - Replace custom worktree creation with Claude Code native hooks, simplify coordination layer
- [ ] **Phase 15: Full-Lifecycle Workers** - Workers autonomously chain discuss, research, plan, execute, refine per phase with nested subagents
- [ ] **Phase 16: Auto-Advance Pipeline** - `/mow:auto` chains phases through milestone end with DAG awareness and discuss pause gates

## Phase Details

### Phase 13: GSD Bugfix Ports
**Goal**: Mowism operates without data corruption, crashes, or silent failures in daily use
**Depends on**: Nothing (independent of all other v1.2 work)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06, BUG-07, BUG-08, BUG-09, BUG-10, BUG-11
**Success Criteria** (what must be TRUE):
  1. STATE.md updates preserve dollar signs and special characters in all field values without corruption
  2. Context window usage warnings appear at 35% and 25% remaining capacity during long agent sessions
  3. `/mow:health --repair` creates a timestamped backup before regenerating STATE.md, and the backup is recoverable
  4. Executor stops retrying a failing task after a configurable maximum attempt limit instead of looping indefinitely
  5. Discuss-phase probes ambiguous user preferences with follow-up questions before finalizing CONTEXT.md
**Plans**: 5 plans

Plans:
- [ ] 13-01-PLAN.md — Pure code fixes: dollar sign corruption, requirement ID propagation, progress clamping
- [ ] 13-02-PLAN.md — Safety guardrails: backup-before-repair, executor retry limits
- [ ] 13-03-PLAN.md — Workflow fixes: early branch creation, ordering guards, discuss-phase ambiguity probing
- [ ] 13-04-PLAN.md — Todo lifecycle: in-progress state, start subcommand, 3-state display
- [ ] 13-05-PLAN.md — Hook infrastructure: context window monitor, CLAUDE.md subagent injection

### Phase 14: Native Worktree Adoption
**Goal**: Agent worktrees are created and destroyed via Claude Code native hooks with Mowism coordination preserved
**Depends on**: Nothing (parallelizable with Phase 13)
**Requirements**: WKT-01, WKT-02, WKT-03, WKT-04, WKT-05, WKT-06, WKT-07
**Success Criteria** (what must be TRUE):
  1. Spawning a phase worker via Agent Teams creates its worktree through Claude Code's native `isolation: worktree` with `.planning/` directory and STATUS.md automatically present
  2. When a worker completes and its worktree is removed, the manifest entry, phase claim, and dashboard state are automatically cleaned up
  3. All worktree path references across agents, workflows, and mow-tools.cjs resolve to native worktree locations (no references to old `.worktrees/pNN` paths remain)
  4. Users with existing `.worktrees/` directories can run a migration script that moves entries to native paths without losing state
**Plans**: 4 plans

Plans:
- [ ] 14-01-PLAN.md — Hook scripts, settings.json registration, and cmdWorktreeCreateNative function
- [ ] 14-02-PLAN.md — Path reference rewrite and coordination layer adaptation
- [ ] 14-03-PLAN.md — Migration script with detection and .worktrees.bak cleanup offer
- [ ] 14-04-PLAN.md — WorkTrunk removal and install.sh cleanup (net LOC reduction)

### Phase 15: Full-Lifecycle Workers
**Goal**: Phase workers autonomously run the complete discuss-through-refine lifecycle with nested subagent delegation
**Depends on**: Phase 14 (native worktrees must be functional), Phase 13 (context monitor hook critical for long sessions)
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07
**Success Criteria** (what must be TRUE):
  1. A phase worker spawned for a phase runs discuss, research, plan, execute, and refine stages sequentially without manual intervention between stages
  2. When a worker reaches discuss-phase, it pauses and sends an `input_needed` message -- the user must provide input before the worker continues to research
  3. A worker resumed after interruption detects completed stage artifacts (CONTEXT.md, PLANs, SUMMARYs) and skips to the first incomplete stage
  4. The dashboard shows which lifecycle stage (discuss/research/plan/execute/refine) each active worker is currently in via stage transition messages
  5. Subagent spawns use cost-appropriate models: Haiku for research, executor_model for execution, verifier_model for refinement
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

### Phase 16: Auto-Advance Pipeline
**Goal**: A single `/mow:auto` command drives the entire milestone from current phase to completion with human checkpoints at discuss stages
**Depends on**: Phase 15 (full-lifecycle workers must exist to chain)
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07
**Success Criteria** (what must be TRUE):
  1. Running `/mow:auto` from any phase starts the pipeline and automatically advances through subsequent phases until milestone end
  2. Auto-advance respects DAG dependencies -- a phase only starts when all its dependency phases have completed
  3. Auto-advance pauses at every discuss-phase for user input and resumes automatically after CONTEXT.md is created
  4. The pipeline stops at milestone boundary, clears the auto-advance flag, and does not bleed into the next milestone
  5. The dashboard shows a progress banner with current phase and milestone completion percentage during auto-advance
**Plans**: TBD

Plans:
- [ ] 16-01: TBD
- [ ] 16-02: TBD

## Progress

**Execution Order:**
Phases 13 and 14 are parallelizable (no dependency). Phase 15 depends on both 13 and 14. Phase 16 depends on 15.
DAG: {13, 14} -> 15 -> 16

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
| 9. Multi-Phase Execution Engine | v1.1 | 3/3 | Complete | 2026-02-20 |
| 10. Live Feedback and Visual Differentiation | v1.1 | 3/3 | Complete | 2026-02-20 |
| 11. README Overhaul | v1.1 | 3/3 | Complete | 2026-02-20 |
| 12. Audit Gap Closure | v1.1 | 1/1 | Complete | 2026-02-20 |
| 13. GSD Bugfix Ports | 5/5 | Complete    | 2026-02-23 | - |
| 14. Native Worktree Adoption | 1/4 | In Progress|  | - |
| 15. Full-Lifecycle Workers | v1.2 | 0/? | Not started | - |
| 16. Auto-Advance Pipeline | v1.2 | 0/? | Not started | - |
