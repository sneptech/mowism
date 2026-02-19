# Roadmap: Mowism

## Overview

Mowism is built in three phases: first, fork GSD and port all existing assets (workflows, tools, skills) into a rebranded Mowism repo; second, build the new capabilities that differentiate Mowism from GSD (worktree-aware state and automated quality gates); third, layer on Agent Teams coordination and package everything for distribution. Each phase delivers a coherent, testable capability -- the fork works before we add features, features work before we add coordination and packaging.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Fork and Foundation** - Fork GSD, rebrand to `/mow:*`, port all quality skills into the repo
- [ ] **Phase 2: Worktree State and Quality Gates** - Make `.planning/` worktree-aware and build `/mow:refine-phase` with tiered quality checks
- [ ] **Phase 3: Agent Teams and Distribution** - Add opt-in Agent Teams coordination and package for one-command install

## Phase Details

### Phase 1: Fork and Foundation
**Goal**: A working Mowism repo where all GSD workflows run under `/mow:*` names and all quality skills are available
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, SKIL-01, SKIL-02, SKIL-03, SKIL-04, SKIL-05, SKIL-06, SKIL-07
**Success Criteria** (what must be TRUE):
  1. User can run any `/mow:*` command and it behaves identically to the corresponding `/gsd:*` command (no broken references, no "gsd" strings in output)
  2. User can run `/scope-check`, `/simplify`, `/dead-code-sweep`, `/prove-it`, `/grill-me`, `/change-summary`, and `/update-claude-md` as registered Mowism skills
  3. User can run `/mow:migrate` on an existing GSD `.planning/` directory and continue working without manual fixup
  4. User never sees "gsd" in any command name, template output, agent definition, or tool reference -- only "mow"
**Plans:** 6/6 plans complete
Plans:
- [x] 01-01-PLAN.md -- Fork mow-tools.cjs and test file (CORE-02)
- [x] 01-02-PLAN.md -- Fork agents, templates, references, VERSION (CORE-03, CORE-04, CORE-05)
- [x] 01-03-PLAN.md -- Create quality skill commands (SKIL-01 through SKIL-07)
- [x] 01-04-PLAN.md -- Fork workflows (CORE-01 partial)
- [x] 01-05-PLAN.md -- Fork commands and create /mow:migrate (CORE-01 partial, CORE-06)
- [x] 01-06-PLAN.md -- Validation sweep and smoke tests (all requirements)

### Phase 2: Worktree State and Quality Gates
**Goal**: The planning system tracks which worktree is doing what, prevents conflicts, and `/mow:refine-phase` runs automated quality checks with zero manual skill chaining
**Depends on**: Phase 1
**Requirements**: WKTR-01, WKTR-02, WKTR-03, WKTR-04, WKTR-05, GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, GATE-06, GATE-07, GATE-08, GATE-09
**Success Criteria** (what must be TRUE):
  1. User running `/mow:execute-phase` in a worktree sees that worktree's assignment tracked in STATE.md, and a second agent trying to claim the same plan gets a clear conflict error
  2. User runs `/mow:refine-phase`, is asked to pick a tier (minimum/complex/algorithmic), says one word, and the entire quality chain runs to completion without further input
  3. After `/mow:refine-phase` completes, user can read `.planning/phases/VERIFICATION-CHAIN-P{phase}.md` to see all findings, and STATE.md shows the verification result (tier, pass/fail, date)
  4. When WorkTrunk creates a new worktree, it automatically has access to the main worktree's `.planning/` state (no manual setup)
  5. If WorkTrunk (`wt`) is not installed, user gets a clear error message on init explaining what to install and why
**Plans:** 5 plans
Plans:
- [x] 02-01-PLAN.md -- WorkTrunk dependency check + STATE.md worktree tracking + conflict detection (WKTR-01, WKTR-02, WKTR-03, GATE-07)
- [x] 02-02-PLAN.md -- refine-phase command + workflow with minimum tier chain (GATE-01, GATE-02, GATE-03)
- [ ] 02-03-PLAN.md -- WorkTrunk post-create hook + execute-phase worktree awareness (WKTR-04, WKTR-05)
- [x] 02-04-PLAN.md -- Complex/algorithmic tiers + VERIFICATION-CHAIN output + reconciliation (GATE-04, GATE-05, GATE-06, GATE-08, GATE-09)
- [ ] 02-05-PLAN.md -- End-to-end validation sweep (all requirements)

### Phase 3: Agent Teams and Distribution
**Goal**: Users can optionally coordinate multiple Claude Code sessions via Agent Teams, and new users can install Mowism with one command
**Depends on**: Phase 2
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, DIST-01, DIST-02, DIST-03, DIST-04, DIST-05
**Success Criteria** (what must be TRUE):
  1. User running `/mow:new-project` is offered the option to spawn an Agent Teams setup; saying "yes" creates a lead orchestrator session that tracks state while user hops between teammate sessions
  2. User without `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` enabled gets a prominent nudge explaining they're missing the most powerful feature, with exact instructions (where to set the env var, what command to run) to enable Agent Teams parallelism -- all other features still work in the meantime
  3. User runs a single install command from the GitHub README and gets all `/mow:*` skills registered in `~/.claude/` with WorkTrunk and Agent Teams checks informing them of optional/required dependencies
  4. User appends `???` to any `/mow:*` command and that command's documentation opens in their editor -- no memorization of help flags needed
  5. STATE.md tracks agent team status (active teammates, assigned worktrees) when Agent Teams are in use
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fork and Foundation | 6/6 | Complete    | 2026-02-19 |
| 2. Worktree State and Quality Gates | 3/5 | In Progress | - |
| 3. Agent Teams and Distribution | 0/TBD | Not started | - |
