# Architecture Research: Multi-Agent State Coherence & Parallel Execution

**Domain:** Claude Code multi-agent coordination with parallel worktree execution
**Researched:** 2026-02-20
**Confidence:** HIGH (verified against official Claude Code Agent Teams docs, existing codebase analysis, runtime test results)
**Supersedes:** Previous ARCHITECTURE.md (v1.0, 2026-02-19) for multi-agent sections
**Purpose:** Architecture decisions for v1.1 -- state coherence, phase parallelism, live feedback, distributed input routing

## Critical Corrections from Official Docs

The v1.0 research and runtime tests contained assumptions that official documentation now corrects:

| Previous Assumption | Correction | Source |
|---------------------|------------|--------|
| Nested teams possible (general-purpose teammates spawn sub-teams) | **No nested teams.** Teammates cannot spawn their own teams or teammates. Only the lead can manage the team. | Official docs: Limitations section |
| Permission prompts stay in worker's terminal (session-local) | **Permission prompts bubble up to lead.** "Teammate permission requests bubble up to the lead." Pre-approve operations to reduce friction. | Official docs: Troubleshooting section |
| Auto-unblocking unverified | **Auto-unblocking confirmed.** "The system manages task dependencies automatically. When a teammate completes a task that other tasks depend on, blocked tasks unblock without manual intervention." | Official docs: Architecture section |
| Team config path unverified | **Confirmed:** `~/.claude/teams/{team-name}/config.json` with `members` array. Task list at `~/.claude/tasks/{team-name}/` | Official docs: Architecture section |
| Task claiming race conditions possible | **File locking built in.** "Task claiming uses file locking to prevent race conditions when multiple teammates try to claim the same task simultaneously." | Official docs: Assign and claim tasks |
| No hook points for quality gates | **TeammateIdle and TaskCompleted hooks** available for enforcing quality gates | Official docs: Enforce quality gates with hooks |

**Impact on v1.1 design:** The "no nested teams" constraint eliminates the Phase Worker hierarchy pattern. All teammates must be spawned by a single lead. This makes the coordinator context window problem MORE acute -- the lead orchestrates everything, no delegation of coordination.

## System Overview: v1.1 Architecture

```
                        USER (fish shell, KDE Wayland)
                              |
              ┌───────────────┼───────────────┐
              |               |               |
         [Terminal 1]    [Terminal 2]    [Terminal N]
         ORCHESTRATOR    WORKER Phase7   WORKER Phase8
         (red badge)     (green badge)   (yellow badge)
              |               |               |
              v               v               v
┌─────────────────────────────────────────────────────────────────┐
│                    COORDINATION LAYER                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Team Lead   │  │ Shared Task  │  │ Mailbox (messaging)   │  │
│  │ (one lead,  │  │ List (auto-  │  │ (targeted + broadcast)│  │
│  │ flat team)  │  │ unblocking)  │  │                       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                │                      │               │
│  ┌──────┴────────────────┴──────────────────────┴──────┐       │
│  │                Agent Teams API                       │       │
│  │  Teammate ops | TaskCreate/Update/List | Hooks       │       │
│  └──────────────────────────┬──────────────────────────┘       │
│                              │                                  │
├──────────────────────────────┼──────────────────────────────────┤
│                    TOOLING LAYER                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              mow-tools.cjs (Node.js CLI)                  │  │
│  │  state ops | phase ops | roadmap (DAG) | team tracking    │  │
│  │  color-assign | progress | worktree claim/release         │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
├──────────────────────────────┼──────────────────────────────────┤
│                    STATE LAYER (main worktree only)             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │STATE.md  │  │ROADMAP.md│  │ phases/   │  │ config.json  │  │
│  │(index +  │  │(DAG deps,│  │ XX/       │  │ (settings)   │  │
│  │ tracking)│  │ parallel │  │ status.md │  │              │  │
│  │          │  │ tracks)  │  │ (per-phase│  │              │  │
│  │          │  │          │  │  detail)  │  │              │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘  │
│                                                                 │
│  Main worktree is single source of truth.                      │
│  Workers access via cp (wt.toml hook) -- each gets a copy.    │
│  Workers write ONLY to their own phase files + SUMMARY.md.    │
│  Lead updates STATE.md and ROADMAP.md centrally.               │
└─────────────────────────────────────────────────────────────────┘
```

## Approach Evaluation: 5 Candidate State Coherence Patterns

### Evaluation Criteria

Each approach is evaluated against:
1. **Merge conflict risk** -- can parallel workers modify state without conflicts?
2. **Orchestrator context load** -- how much does the lead need to read?
3. **Integration cost** -- how much existing code changes?
4. **Failure resilience** -- what happens when a worker crashes?
5. **Composability with Agent Teams** -- does it work with the flat team model?

### Approach A: Distributed State with Index (folder-per-worker)

Workers write to `phases/XX/status.md` (isolated, no conflicts). STATE.md becomes a lightweight index (~50 lines) with links. Orchestrator reads index + specific phase status on demand.

**Integration with existing code:**

| Component | Change Required | Effort |
|-----------|-----------------|--------|
| `mow-tools.cjs state update` | Modify to route writes to per-phase files | Medium |
| `mow-tools.cjs worktree claim/release` | Keep in STATE.md (already isolated per-worktree) | None |
| `mow-tools.cjs team-update` | Keep in STATE.md (lead-only writes) | None |
| `wt.toml post-create` | Copy full `.planning/` (unchanged) | None |
| `mow-team-lead.md` | Update to read index + per-phase files | Low |
| `execute-phase.md` | Workers write to `phases/XX/status.md` instead of STATE.md | Medium |

**Data flow:**
```
Worker (Phase 7, Worktree A):
  writes → .planning/phases/07-feature-x/status.md  (isolated file)
  writes → .planning/phases/07-feature-x/07-01-SUMMARY.md  (already isolated)
  does NOT write → STATE.md

Lead (main worktree):
  reads  → .planning/STATE.md  (lightweight index)
  reads  → .planning/phases/07-feature-x/status.md  (on demand)
  writes → .planning/STATE.md  (index updates)
  writes → .planning/ROADMAP.md  (progress)
```

**Verdict:** Eliminates merge conflicts entirely. Index can drift from reality (status files change but index is stale). Requires workers to message lead when status changes so lead can update index.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Merge conflict risk | NONE | Separate files, no contention |
| Orchestrator context load | LOW | Index is ~50 lines, reads detail on demand |
| Integration cost | MEDIUM | New status file format, route state writes |
| Failure resilience | GOOD | Crash leaves status file in last-written state |
| Agent Teams composability | GOOD | Workers message lead, lead updates index |

### Approach B: Scribe Agent (single writer)

Workers report results via SendMessage to a scribe agent. Scribe reconciles and writes canonical STATE.md. Workers never write state.

**Integration with existing code:**

| Component | Change Required | Effort |
|-----------|-----------------|--------|
| `mow-tools.cjs` | No state-write changes (scribe uses same CLI) | None |
| Agent definitions | New `mow-scribe.md` agent definition | New file |
| `mow-team-lead.md` | Spawn scribe as teammate, route state updates through it | Medium |
| `execute-phase.md` | Workers send messages instead of writing state | Low |

**Critical problem:** **No nested teams.** The scribe would need to be a teammate of the lead's team. This means the scribe consumes one of the practical ~5-8 teammate slots and adds its own context window cost. The scribe receives ALL state update messages, which means ITS context window fills up fastest -- the exact problem it was supposed to solve.

**Verdict:** The no-nested-teams constraint makes the scribe just another teammate competing for context and attention. The indirection adds latency without eliminating the coordination bottleneck. REJECTED.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Merge conflict risk | NONE | Single writer |
| Orchestrator context load | LOW-ISH | Lead delegates, but scribe is another context window |
| Integration cost | MEDIUM | New agent, new message protocol |
| Failure resilience | POOR | Scribe crash = all state updates lost |
| Agent Teams composability | POOR | Consumes teammate slot, no nested teams |

### Approach C: Section-Aware Merge Tool

Workers write to their own STATE.md copies (created by `wt.toml` `cp -r`). `mow-tools.cjs merge-state` reconciles on merge-back. Section rules: "Worktree Assignments" takes both rows, "Decisions" appends, "Current Position" takes latest.

**Integration with existing code:**

| Component | Change Required | Effort |
|-----------|-----------------|--------|
| `mow-tools.cjs` | New `worktree merge-state` command | HIGH -- complex merge logic |
| `wt.toml` | Unchanged (already copies `.planning/`) | None |
| All workflows | Unchanged (keep writing to STATE.md normally) | None |
| `mow-team-lead.md` | Call merge-state after `wt merge` | Low |

**Critical problem:** Workers are modifying LOCAL copies of STATE.md. Changes are invisible to other workers and the lead until merge-back. The lead reads the MAIN worktree's STATE.md, which is stale. Workers read their own copies, which are stale w.r.t. each other. The whole point of shared state -- coherence -- is lost until merge.

**Verdict:** This is the v1.0 proposal. It looked reasonable for plan-level parallelism (same phase, different plans) where workers merge back frequently. For PHASE-level parallelism where workers run for 10-30 minutes on different phases, the state divergence is unacceptable. REJECTED for v1.1.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Merge conflict risk | LOW | Section-aware merge handles most cases |
| Orchestrator context load | N/A | Lead reads stale state until merge |
| Integration cost | HIGH | Complex three-way merge logic |
| Failure resilience | MEDIUM | Crash loses uncommitted state changes |
| Agent Teams composability | POOR | Stale state defeats coordination purpose |

### Approach D: Event Log + Materialized View

Workers append to per-phase event logs (`phases/XX/events.jsonl`). STATE.md is rebuilt from events on demand by `mow-tools.cjs state rebuild`.

**Integration with existing code:**

| Component | Change Required | Effort |
|-----------|-----------------|--------|
| `mow-tools.cjs state update` | Replace with `state emit-event` (append to JSONL) | HIGH |
| `mow-tools.cjs state get` | Rebuild from events, cache result | HIGH |
| All `state update` callers | Change API surface | HIGH |
| STATE.md format | Becomes generated output, not hand-edited | Breaking change |

**Critical problem:** Mowism's state is designed for human readability. STATE.md is read by agents on every workflow start. An event log requires rebuilding the view on every read -- this is expensive and error-prone. The rebuild logic must perfectly reconstruct the human-readable format. Also, events.jsonl files in parallel worktrees still need to be merged (append-only helps, but ordering matters for materialization).

**Verdict:** Over-engineered for the problem size. Event sourcing is powerful for systems with complex state transitions and audit requirements, but Mowism's state is a small markdown file. The complexity does not pay for itself. REJECTED.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Merge conflict risk | NONE | Append-only, no overwrites |
| Orchestrator context load | MEDIUM | Must rebuild view from events |
| Integration cost | VERY HIGH | Complete state system rewrite |
| Failure resilience | EXCELLENT | Full event history, replay possible |
| Agent Teams composability | MEDIUM | Workers emit events, lead rebuilds |

### Approach E: Hybrid (Index + Lead as Central Writer)

**This is the recommended approach.** Combines distributed per-phase state files (Approach A's isolation) with the lead as the single canonical writer of STATE.md (Approach B's principle, without the scribe overhead).

See the detailed design below.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Merge conflict risk | NONE | Workers write only per-phase files |
| Orchestrator context load | LOW | Index is small, detail on demand |
| Integration cost | MEDIUM | New per-phase files, lead-writes-state protocol |
| Failure resilience | GOOD | Per-phase files survive independently |
| Agent Teams composability | EXCELLENT | Aligns with lead-coordinates model |

## Recommended Architecture: Index + Lead-Writes-State

### Core Principle

**Workers own their phase files. The lead owns shared state.** This eliminates merge conflicts by making writes non-overlapping, and aligns perfectly with Agent Teams' flat coordination model where the lead is the single point of synthesis.

### What Changes from v1.0

```
v1.0 (current):                          v1.1 (proposed):

Workers write STATE.md directly           Workers write per-phase status files
  → merge conflicts                         → no conflicts

STATE.md has "Current Position"           STATE.md has "Active Phases" table
  → assumes one active phase                → tracks N phases simultaneously

ROADMAP.md has linear dependencies        ROADMAP.md has DAG dependencies
  → Phase N depends on Phase N-1            → explicit depends_on list

Lead reads/writes everything              Lead reads index + per-phase detail
                                            on demand. Workers message lead
                                            with structured updates.

No color assignments                     Color assignments in STATE.md
                                            "Agent Team Status" table
```

### Component 1: STATE.md Restructuring

**Current "Current Position" section (single phase):**
```markdown
## Current Position

Phase: 7 of 10 (Feature X)
Plan: 2 of 4 in current phase
Status: In progress
```

**Proposed "Active Phases" section (multi-phase):**
```markdown
## Active Phases

| Phase | Status | Worktree | Worker | Plan Progress | Last Update |
|-------|--------|----------|--------|---------------|-------------|
| 7. Feature X | executing | /project.wt-feat-x | worker-green | 2/4 plans | 2026-02-20T10:05 |
| 8. API Layer | executing | /project.wt-api | worker-yellow | 1/3 plans | 2026-02-20T10:03 |
| 9. Dashboard | blocked | -- | -- | 0/2 plans | -- |
| 10. Polish | not started | -- | -- | 0/1 plans | -- |

**Next unblockable:** Phase 9 (blocked by: Phase 7, Phase 8)
```

**What stays the same:**
- `## Project Reference` -- unchanged
- `## Performance Metrics` -- unchanged (accumulated across all phases)
- `## Accumulated Context` -- unchanged (decisions, todos, blockers)
- `## Session Continuity` -- unchanged

**What changes:**
- `## Current Position` becomes `## Active Phases` (table, not single values)
- `## Worktree Assignments` stays but becomes secondary to Active Phases
- `## Agent Team Status` adds a `Color` column

**Size constraint:** STATE.md stays under 100 lines. Active Phases table replaces Current Position (same line count for 1-4 active phases). The per-phase detail lives in per-phase status files, not STATE.md.

**mow-tools.cjs changes:**

```
EXISTING (keep):                    NEW (add):
  state load                          state active-phases       → parse Active Phases table
  state update <field> <value>        state update-phase-row    → update one phase row
  state get [section]                 state next-unblockable    → compute from DAG
  state patch
  worktree claim/release            MODIFY:
  team-update                         state update              → route shared fields to STATE.md
                                                                  route per-phase fields to status files
```

### Component 2: Per-Phase Status Files

Each phase gets a status file at `.planning/phases/XX-name/XX-STATUS.md`:

```markdown
# Phase 7: Feature X -- Status

**Status:** executing
**Worker:** worker-green (worktree: /project.wt-feat-x)
**Started:** 2026-02-20T09:45
**Last update:** 2026-02-20T10:05

## Plan Progress

| Plan | Status | Started | Duration | Commit |
|------|--------|---------|----------|--------|
| 07-01 | complete | 09:45 | 3min | a1b2c3d |
| 07-02 | executing | 09:50 | -- | -- |
| 07-03 | pending | -- | -- | -- |
| 07-04 | pending | -- | -- | -- |

## Decisions (Phase-Local)

- Chose PostgreSQL over SQLite for connection pooling (07-01)
- API uses REST, not GraphQL -- simpler for MVP (07-02)

## Issues

None.
```

**Who writes this file:** The worker executing this phase. Each worker writes ONLY its own phase's status file. No contention.

**Who reads this file:** The lead, on demand (when it needs to report progress or check a phase's state). Workers in OTHER phases do not read this file.

**Relationship to SUMMARY.md:** The per-phase status file tracks LIVE execution state. SUMMARY.md files are written AFTER plan completion (the deliverable artifact). Both live in the same phase directory but serve different purposes.

### Component 3: ROADMAP.md DAG Dependencies

**Current format (linear):**
```markdown
### Phase 7: Feature X
**Goal**: Build feature X
**Depends on**: Phase 6
```

**Proposed format (DAG):**
```markdown
### Phase 7: Feature X
**Goal**: Build feature X
**Depends on**: Phase 6
**Parallel with**: Phase 8 (no shared files)
```

```markdown
### Phase 8: API Layer
**Goal**: Build API endpoints
**Depends on**: Phase 6
**Parallel with**: Phase 7 (no shared files)
```

```markdown
### Phase 9: Dashboard
**Goal**: Build dashboard UI
**Depends on**: Phase 7, Phase 8
```

**DAG parsing in mow-tools.cjs:**

New command: `roadmap analyze-dag`

```javascript
// Returns:
{
  "phases": [
    { "number": 7, "depends_on": [6], "parallel_with": [8] },
    { "number": 8, "depends_on": [6], "parallel_with": [7] },
    { "number": 9, "depends_on": [7, 8], "parallel_with": [] }
  ],
  "execution_order": [
    { "wave": 1, "phases": [7, 8] },  // Can execute in parallel
    { "wave": 2, "phases": [9] }      // Blocked until wave 1 completes
  ],
  "ready_to_execute": [7, 8],  // Phases whose deps are all complete
  "blocked": [
    { "phase": 9, "waiting_on": [7, 8] }
  ]
}
```

**Integration with roadmapper agent:** The `mow-roadmapper.md` agent must be updated to emit `**Depends on**` and `**Parallel with**` fields based on requirement analysis during `/mow:new-milestone`. The roadmapper already does dependency analysis -- it just needs to output the result in the DAG format instead of always writing `Phase N-1`.

**Key constraint:** `**Parallel with**` is advisory. The real constraint is `**Depends on**`. Two phases are parallel if neither depends on the other. The `**Parallel with**` annotation is for human readability and for the roadmapper to confirm intent.

### Component 4: Lead-Writes-State Protocol

The critical architectural decision: **workers NEVER write STATE.md or ROADMAP.md directly.** Only the lead writes shared state. Workers communicate state changes via structured messages.

**Message protocol (worker -> lead):**

```json
{
  "type": "phase_update",
  "phase": 7,
  "event": "plan_complete",
  "plan_id": "07-01",
  "commit": "a1b2c3d",
  "duration_min": 3,
  "decisions": ["Chose PostgreSQL over SQLite for connection pooling"]
}
```

```json
{
  "type": "phase_update",
  "phase": 7,
  "event": "phase_complete",
  "all_plans_complete": true,
  "total_duration_min": 12,
  "summary": "Feature X built: 4 plans, 12 minutes, 2 decisions"
}
```

```json
{
  "type": "input_needed",
  "phase": 7,
  "plan_id": "07-02",
  "input_type": "checkpoint",
  "checkpoint_type": "human-verify",
  "description": "API endpoint structure needs approval",
  "worker_color": "green",
  "terminal_hint": "Terminal 2"
}
```

**Lead's response pattern:**

1. Receive message from worker via inbox
2. Parse structured JSON from message string
3. Update STATE.md Active Phases table via `mow-tools.cjs state update-phase-row`
4. Update ROADMAP.md progress via `mow-tools.cjs roadmap update-plan-progress`
5. Check if phase completion unblocks new phases via `mow-tools.cjs roadmap analyze-dag`
6. If new phases unblockable, create tasks for them and assign to idle workers

**Why this works with Agent Teams:** Auto-unblocking handles task-level dependencies within a phase. The lead handles PHASE-level dependency resolution (checking the DAG when a phase completes). This separation of concerns is clean: Agent Teams manages intra-phase parallelism, the lead manages inter-phase parallelism.

### Component 5: Color Assignment System

Colors are assigned deterministically by the lead at teammate spawn time and tracked in the Agent Team Status table.

**Updated Agent Team Status section in STATE.md:**

```markdown
## Agent Team Status

**Team:** mow-my-project
**Started:** 2026-02-20

| Teammate | Worktree | Phase | Task | Status | Color | Last Update |
|----------|----------|-------|------|--------|-------|-------------|
| worker-1 | /project.wt-feat-x | 7 | 07-02 | executing | green | 2026-02-20T10:05 |
| worker-2 | /project.wt-api | 8 | 08-01 | executing | yellow | 2026-02-20T10:03 |
```

**Color palette (ordered, deterministic):**

```javascript
const WORKER_COLORS = [
  { name: 'green',   ansi_bg: '\x1b[42m', ansi_fg: '\x1b[32m', ansi_reset: '\x1b[0m' },
  { name: 'yellow',  ansi_bg: '\x1b[43m', ansi_fg: '\x1b[33m', ansi_reset: '\x1b[0m' },
  { name: 'blue',    ansi_bg: '\x1b[44m', ansi_fg: '\x1b[34m', ansi_reset: '\x1b[0m' },
  { name: 'magenta', ansi_bg: '\x1b[45m', ansi_fg: '\x1b[35m', ansi_reset: '\x1b[0m' },
  { name: 'cyan',    ansi_bg: '\x1b[46m', ansi_fg: '\x1b[36m', ansi_reset: '\x1b[0m' },
  { name: 'white',   ansi_bg: '\x1b[47m', ansi_fg: '\x1b[97m', ansi_reset: '\x1b[0m' },
];
const LEAD_COLOR = { name: 'red', ansi_bg: '\x1b[41m', ansi_fg: '\x1b[31m', ansi_reset: '\x1b[0m' };
```

**mow-tools.cjs command:** `color-assign <worker-index>` returns the color object for the Nth worker. `color-assign lead` returns the lead color.

**How workers use colors:** The lead includes the color assignment in the spawn prompt. Workers print a colored banner at startup and prefix status messages with their color badge. This is cosmetic (not enforced by Agent Teams) but provides visual identification.

**Banner format printed by worker at startup:**
```
\x1b[42m  [Phase 7: Feature X]  worker-1  \x1b[0m
```

### Component 6: Live Feedback Flow

**How feedback flows from workers through the lead to the user's terminal:**

```
Worker (Phase 7) completes plan 07-01
    |
    ├─ Writes 07-STATUS.md (own file, no contention)
    ├─ Writes 07-01-SUMMARY.md (deliverable)
    └─ Sends structured message to lead:
         { type: "phase_update", event: "plan_complete", ... }
              |
              v
Lead receives inbox message (automatic delivery)
    |
    ├─ Parses JSON from message string
    ├─ Updates STATE.md Active Phases table
    ├─ Updates ROADMAP.md plan progress
    ├─ Prints feedback to orchestrator terminal:
    |    ┌────────────────────────────────────────────┐
    |    │ [Phase 7]  Plan 07-01 complete (3 min)    │
    |    │            Decision: Chose PostgreSQL      │
    |    │            Progress: 2/4 plans             │
    |    └────────────────────────────────────────────┘
    └─ Checks DAG: does this unblock anything? No → continue waiting
```

```
Worker (Phase 7) hits checkpoint
    |
    └─ Sends structured message to lead:
         { type: "input_needed", input_type: "checkpoint", ... }
              |
              v
Lead receives inbox message
    |
    └─ Prints notification to orchestrator terminal:
         ┌───────────────────────────────────────────────────┐
         │ [Phase 7]  WAITING -- execute-phase mode         │
         │            Checkpoint: API endpoint structure     │
         │            needs approval                        │
         │            -> Switch to Terminal 2 (green)        │
         └───────────────────────────────────────────────────┘
```

**Key insight from official docs:** Permission prompts bubble up to the lead automatically. This means the lead CAN distinguish between "worker is idle because done" vs "worker is waiting for permission." The TeammateIdle hook provides a programmatic interception point. However, the lead still cannot proxy the actual permission approval -- the user must interact with the worker's session for tool approvals.

**TeammateIdle hook integration:**

```bash
# Hook: TeammateIdle -- runs when a teammate goes idle
# Exit code 2 = send feedback to keep teammate working
# Can be used to detect "permission waiting" vs "task complete" states
```

This is a future enhancement. For v1.1 MVP, workers send structured messages at key milestones. The hook system adds automated detection on top.

### Component 7: Distributed Input Routing

**The model:** User switches to the worker's terminal for direct interaction. The orchestrator terminal provides navigation information.

**When a worker needs input, the flow is:**

1. Worker encounters checkpoint/permission gate
2. Permission prompts bubble up to lead (automatic, per official docs)
3. For checkpoints: worker sends structured `input_needed` message to lead
4. Lead displays notification with:
   - What phase/mode the worker is in
   - What kind of input is needed
   - The worker's color badge
   - Terminal navigation hint
5. User presses `Shift+Down` (in-process mode) to cycle to the worker
6. User responds to the prompt in the worker's session
7. Worker resumes, sends completion message to lead

**Terminal mode recommendation:** In-process mode is the default and most portable. Split-pane (tmux) is better for monitoring but has platform limitations. The color badge system works in both modes -- workers print their own banners.

**For tmux mode:** The lead could set pane titles via tmux commands:
```bash
tmux select-pane -T "Phase 7: Feature X [green]"
```
This is a nice-to-have, not a requirement.

## New Files and Modified Files

### New Files

| File | Purpose | Written By |
|------|---------|------------|
| `.planning/phases/XX-name/XX-STATUS.md` | Per-phase live execution status | Worker executing that phase |
| `agents/mow-phase-coordinator.md` | Updated team-lead agent with multi-phase coordination | Build phase (replaces mow-team-lead.md) |

### Modified Files

| File | What Changes | Impact |
|------|--------------|--------|
| `bin/mow-tools.cjs` | New commands: `state active-phases`, `state update-phase-row`, `state next-unblockable`, `roadmap analyze-dag`, `color-assign`. Modified: `team-update` adds Color column. Modified: state template for Active Phases. | HIGH -- ~300 lines new code |
| `.planning/STATE.md` | `Current Position` -> `Active Phases` table. Agent Team Status adds Color column. | MEDIUM -- format change |
| `.planning/ROADMAP.md` | `Depends on` supports lists. New `Parallel with` field. | LOW -- additive format |
| `agents/mow-team-lead.md` | Multi-phase orchestration flow, DAG-aware phase scheduling, structured message parsing, feedback display | HIGH -- substantial rewrite |
| `mowism/workflows/execute-phase.md` | Worker writes per-phase STATUS.md. Worker sends structured messages instead of writing STATE.md. Color banner printing. | MEDIUM -- behavior change |
| `mowism/templates/roadmap.md` | DAG dependency format, `Parallel with` field | LOW -- template update |
| `mowism/templates/state.md` | Active Phases table format | LOW -- template update |
| `.config/wt.toml` | Unchanged -- `cp -r` still works. Workers get a copy of `.planning/` including STATUS files. | NONE |

### Files That Do NOT Change

| File | Why |
|------|-----|
| `.config/wt.toml` | Copy semantics are fine. Workers get a snapshot of `.planning/` at creation time. |
| `mowism/workflows/execute-plan.md` | Plan execution workflow is unchanged. Workers still read PLAN.md, execute tasks, write SUMMARY.md. |
| `mowism/templates/summary.md` | Summary format is unchanged. |
| `commands/mow/*.md` | Command definitions are unchanged (they delegate to workflows). |
| Quality skill agents | Refine-phase, verify-work, etc. are single-phase operations, unchanged. |

## Data Flow Diagrams

### Multi-Phase Parallel Execution (Full Flow)

```
User: /mow:execute-phase --all-ready
         |
         v
Lead reads ROADMAP.md
         |
         ├─ roadmap analyze-dag
         │    → ready_to_execute: [7, 8]
         │    → blocked: [9 waiting on 7,8]
         |
         ├─ Create Agent Team
         │    → Teammate({ operation: "spawnTeam", team_name: "mow-project" })
         |
         ├─ Create Tasks for Phase 7 plans (07-01, 07-02, 07-03, 07-04)
         │    → TaskCreate × 4, with wave dependencies via addBlockedBy
         |
         ├─ Create Tasks for Phase 8 plans (08-01, 08-02, 08-03)
         │    → TaskCreate × 3, with wave dependencies
         |
         ├─ Spawn Worker 1 for Phase 7
         │    → Task({ team_name: "mow-project", name: "worker-1",
         │             prompt: "..color=green..worktree=/project.wt-feat-x.." })
         │    → team-update --action add-teammate --name worker-1 --color green
         |
         ├─ Spawn Worker 2 for Phase 8
         │    → Task({ team_name: "mow-project", name: "worker-2",
         │             prompt: "..color=yellow..worktree=/project.wt-api.." })
         │    → team-update --action add-teammate --name worker-2 --color yellow
         |
         └─ Monitor Loop:
              |
              ├─ Receive message: worker-1 plan_complete (07-01)
              │    → state update-phase-row 7 --plan-progress "2/4"
              │    → roadmap update-plan-progress 7
              │    → Print: "[Phase 7] Plan 07-01 complete (3 min)"
              |
              ├─ Receive message: worker-2 plan_complete (08-01)
              │    → state update-phase-row 8 --plan-progress "2/3"
              │    → Print: "[Phase 8] Plan 08-01 complete (4 min)"
              |
              ├─ ... (more plan completions) ...
              |
              ├─ Receive message: worker-1 phase_complete (Phase 7)
              │    → state update-phase-row 7 --status complete
              │    → phase complete 7
              │    → roadmap analyze-dag → Phase 9 still blocked (needs 8)
              │    → Print: "[Phase 7] COMPLETE. Phase 9 still waiting on Phase 8."
              │    → Worker 1 now idle. Check for work:
              │       If Phase 8 has unclaimed tasks → reassign worker-1
              │       Else → worker-1 waits
              |
              ├─ Receive message: worker-2 phase_complete (Phase 8)
              │    → state update-phase-row 8 --status complete
              │    → phase complete 8
              │    → roadmap analyze-dag → Phase 9 NOW READY
              │    → Create Tasks for Phase 9 plans
              │    → Assign worker-1 or worker-2 to Phase 9
              │    → Print: "[Phase 9] UNBLOCKED. Assigning worker-1."
              |
              └─ All phases complete → Cleanup
```

### Worker Internal Flow (Single Phase)

```
Worker spawned with prompt: "Execute Phase 7 in worktree /project.wt-feat-x"
         |
         ├─ Print color banner: "\x1b[42m [Phase 7: Feature X] worker-1 \x1b[0m"
         ├─ cd /project.wt-feat-x
         ├─ Read .planning/phases/07-feature-x/  (plan files from copied .planning/)
         |
         ├─ Claim task from shared task list (Agent Teams auto)
         ├─ Read 07-01-PLAN.md
         ├─ Execute plan tasks (commits to own branch)
         ├─ Write 07-01-SUMMARY.md
         ├─ Update 07-STATUS.md (own file, no contention)
         ├─ Send message to lead: { type: "phase_update", event: "plan_complete", ... }
         ├─ Mark task complete in shared task list
         |
         ├─ Claim next task (auto-unblocked if wave dependency met)
         ├─ ... repeat for 07-02, 07-03, 07-04 ...
         |
         ├─ All plans complete:
         │    → Send message to lead: { type: "phase_update", event: "phase_complete", ... }
         │    → Worker goes idle, waits for lead to assign new work or request shutdown
         |
         └─ Lead reassigns to Phase 9 (or requests shutdown if all done)
```

### Merge-Back Flow (Post-Execution)

```
All phases complete. Workers have committed to their own branches.
         |
         ├─ Lead requests shutdown for all workers
         ├─ Lead runs team cleanup
         |
         ├─ User (or lead) runs wt merge for each worktree:
         │    wt merge wt-feat-x    → merges Phase 7 branch into main
         │    wt merge wt-api       → merges Phase 8 branch into main
         │    wt merge wt-dashboard → merges Phase 9 branch into main
         |
         ├─ Merge conflicts?
         │    → If phases are truly independent (no shared files), no conflicts
         │    → If overlap exists, standard git merge conflict resolution
         │    → STATE.md: NO conflicts because workers didn't modify it
         │    → ROADMAP.md: NO conflicts because only lead modified it
         │    → Phase files: NO conflicts because each phase dir is owned by one worker
         |
         └─ Post-merge:
              → .planning/ on main reflects lead's updates (STATE.md, ROADMAP.md)
              → Phase directories have SUMMARY.md and STATUS.md from workers
              → All state is coherent
```

## Scalability Considerations

| Scale | Architecture | Notes |
|-------|-------------|-------|
| 1-2 phases parallel | Flat team, 2 workers + lead | Comfortable. Lead context load is manageable. |
| 3-4 phases parallel | Flat team, 3-4 workers + lead | Moderate. Lead receives ~4 messages per plan completion. With 4 phases x 3 plans = 12 messages. Manageable in 200k context. |
| 5-6 phases parallel | Flat team, 5-6 workers + lead | Approaching limit. Lead receives ~18+ messages. Auto-compression may trigger. Mitigate: workers send compact messages, lead re-reads STATE.md periodically. |
| 7+ phases parallel | Not recommended | Token cost ~1.4M+. Lead context exhaustion likely. Better to run in batches of 4 phases. |

### Context Window Budget for Lead

Assuming 200k token context window:

| Content | Estimated Tokens | Cumulative |
|---------|-----------------|------------|
| System prompt + agent definition | ~5k | 5k |
| STATE.md (index, ~100 lines) | ~2k | 7k |
| ROADMAP.md (DAG section) | ~3k | 10k |
| Per-phase STATUS.md reads (4 phases) | ~4k | 14k |
| Worker messages (12 plans x ~500 tokens) | ~6k | 20k |
| Lead's own reasoning/tool calls | ~15k | 35k |
| **Remaining for idle notifications + overflow** | **~165k** | 200k |

With 4 parallel phases, the lead uses ~35k tokens (17.5% of context). This is well within budget. Auto-compression should not trigger unless the session runs very long (30+ minutes with many messages).

**Mitigation for long sessions:** Lead should periodically `state-snapshot` to re-read STATE.md and reset its understanding, rather than relying on accumulated message history.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Workers Writing Shared State

**What people do:** Workers write directly to STATE.md and ROADMAP.md, as the v1.0 execute-phase workflow does.

**Why it's wrong:** With parallel workers, STATE.md becomes a merge conflict magnet. Even with section-aware merging, concurrent writes to the Active Phases table would produce garbled output.

**Do this instead:** Workers write ONLY to their own per-phase files. Workers send structured messages to the lead. Lead updates shared state centrally.

### Anti-Pattern 2: Nested Team Hierarchies

**What people do:** Design phase coordinators that spawn sub-teams for wave execution.

**Why it's wrong:** Official Agent Teams docs explicitly state: "Teammates cannot spawn their own teams or teammates. Only the lead can manage the team." This is a hard constraint, not a limitation to work around.

**Do this instead:** Use a flat team with wave dependencies managed through `addBlockedBy` on the shared task list. The lead creates ALL tasks (across all parallel phases) and workers self-claim from the shared list. Auto-unblocking handles wave sequencing.

### Anti-Pattern 3: Fat Status Messages

**What people do:** Workers send full SUMMARY.md contents, file diffs, or verbose narratives as inbox messages.

**Why it's wrong:** Messages consume the lead's context window. With 4 phases x 3 plans, 12 messages each containing 500+ lines would exhaust the lead's context.

**Do this instead:** Messages should be compact JSON (~100-200 tokens). Send file paths and commit hashes, not file contents. The lead reads files on demand when it needs detail.

### Anti-Pattern 4: Polling for Progress

**What people do:** Lead polls TaskList() in a loop to check worker progress.

**Why it's wrong:** Agent Teams delivers messages automatically. Polling wastes the lead's turns and context.

**Do this instead:** Lead waits for inbox messages. Workers send updates at defined milestones. Lead re-reads STATE.md periodically as a backup sync mechanism.

## Build Order (Dependency Chain)

The v1.1 features have internal dependencies. Build in this order:

```
Phase 7: State Coherence Foundation
  ├─ 7.1: STATE.md restructuring (Active Phases table)
  ├─ 7.2: Per-phase STATUS.md format + mow-tools.cjs commands
  ├─ 7.3: Lead-writes-state protocol (message format, lead update logic)
  └─ 7.4: Worker behavior change (write STATUS.md, send messages, don't write STATE.md)

Phase 8: DAG Dependencies (can parallelize with Phase 7)
  ├─ 8.1: ROADMAP.md DAG format (Depends on lists, Parallel with)
  ├─ 8.2: mow-tools.cjs roadmap analyze-dag command
  └─ 8.3: Roadmapper agent update (emit DAG dependencies)

  NOTE: Phase 8 depends on nothing from Phase 7.
  Both can execute simultaneously.

Phase 9: Multi-Phase Execution (depends on Phase 7 AND Phase 8)
  ├─ 9.1: mow-team-lead.md rewrite for multi-phase orchestration
  ├─ 9.2: execute-phase.md worker behavior changes
  ├─ 9.3: Phase scheduling logic (DAG-aware task creation)
  └─ 9.4: Integration test with 2+ parallel phases

Phase 10: Live Feedback + Color System (depends on Phase 7)
  ├─ 10.1: Color assignment in mow-tools.cjs
  ├─ 10.2: Worker banner printing
  ├─ 10.3: Lead feedback display formatting
  └─ 10.4: Input routing notifications

Phase 11: README Overhaul (depends on ALL above)
  └─ 11.1: Document the full system after implementation is stable
```

**DAG representation:**
```
Phase 7 ──┬──> Phase 9 ──> Phase 11
           │        ^
Phase 8 ──┘        │
           └──> Phase 10 ─┘
```

**Phases 7 and 8 can execute in parallel** -- they modify different files and have no data dependencies. This is itself a proof-of-concept for the DAG execution model.

## Integration Points with Existing Code

### mow-tools.cjs Integration Surface

| Existing Function | Integration Action | Notes |
|-------------------|-------------------|-------|
| `cmdWorktreeClaim()` | Keep as-is | Phase claiming still works per-worktree |
| `cmdWorktreeRelease()` | Keep as-is | Phase release unchanged |
| `cmdWorktreeUpdatePlan()` | Keep as-is | Workers still update their own plan progress |
| `cmdTeamUpdate()` | Add `--color` parameter to `add-teammate` | Color stored in Agent Team Status table |
| `cmdTeamStatus()` | Add color to output JSON | Color field in teammate rows |
| `cmdInitExecutePhase()` | Add `ready_phases` field from DAG analysis | Lead needs to know which phases can start |
| `stateReplaceField()` | Keep as-is but add new section handler | Active Phases uses table format, not key-value |
| `parseWorktreeTable()` | Keep as-is | Worktree tracking unchanged |
| `writeWorktreeTable()` | Keep as-is | Worktree tracking unchanged |

### WorkTrunk Integration

The `wt.toml` post-create hook (`cp -r .planning/`) continues to work correctly. When a new worktree is created for a phase worker:

1. `wt switch -c feat-phase-7` creates the worktree
2. Post-create hook copies `.planning/` from main worktree
3. Worker gets a SNAPSHOT of `.planning/` including STATE.md, ROADMAP.md, and all phase dirs
4. Worker reads its own phase's plan files from the copied `.planning/phases/07-name/`
5. Worker writes to its own STATUS.md and SUMMARY.md files
6. On merge-back (`wt merge`), worker's phase directory changes merge cleanly

**The snapshot is intentionally stale.** Workers do not need live STATE.md -- they have their own phase's plans and write to their own files. The lead maintains the live view.

### Agent Teams Hooks Integration

The official docs reveal two hooks that Mowism should leverage:

**TeammateIdle hook:** Runs when a teammate goes idle. Exit code 2 sends feedback to keep them working.

```bash
# .claude/hooks/teammate-idle.sh
# Check if teammate has unclaimed tasks in their phase
# If yes, send them back to work
# If no, notify lead that teammate is available for reassignment
```

**TaskCompleted hook:** Runs when a task is being marked complete. Exit code 2 prevents completion and sends feedback.

```bash
# .claude/hooks/task-completed.sh
# Verify SUMMARY.md exists
# Verify commits are present
# If spot-check fails, reject completion with feedback
```

These hooks provide automated quality enforcement without consuming the lead's context window.

## Sources

| Source | Confidence | What It Provided |
|--------|------------|------------------|
| [Official Agent Teams docs](https://code.claude.com/docs/en/agent-teams) | HIGH | No nested teams, auto-unblocking, permission bubbling, hooks, display modes, task file locking |
| `bin/mow-tools.cjs` (local, 5700+ lines) | HIGH | Integration surface, existing state management functions, worktree claim/release |
| `agents/mow-team-lead.md` (local) | HIGH | Current orchestration flow, tool list, constraints |
| `mowism/workflows/execute-phase.md` (local) | HIGH | Current wave execution, worker spawning, checkpoint handling |
| `.planning/research/AGENT-TEAMS-API.md` (local) | MEDIUM | Prior research, corrected by official docs on key points |
| `.planning/research/AGENT-TEAMS-API-RUNTIME.md` (local) | MEDIUM | Runtime test results, agent type tool availability |
| `.config/wt.toml` (local) | HIGH | Current copy semantics for `.planning/` |
| [ccpm (automazeio/ccpm)](https://github.com/automazeio/ccpm) | MEDIUM | Parallel agent pattern using GitHub Issues as coordination layer, local-first with sync |
| [DataCamp: CrewAI vs LangGraph vs AutoGen](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen) | LOW | Multi-agent framework state patterns (shared state, message passing, graph state) |
| [Differ: Multi-Agent Systems Guide 2026](https://differ.blog/p/how-to-build-multi-agent-systems-complete-2026-guide-f50e02) | LOW | General multi-agent coordination patterns |

---
*Architecture research for: Multi-agent state coherence & parallel execution in Mowism v1.1*
*Researched: 2026-02-20*
*Previous version: 2026-02-19 (v1.0 architecture)*
