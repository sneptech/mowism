# Phase 9: Multi-Phase Execution Engine - Research

**Researched:** 2026-02-20
**Domain:** Multi-agent orchestration, git worktrees, DAG-based task scheduling, checkpoint/recovery
**Confidence:** HIGH (all core infrastructure from Phases 7-8 verified on disk, Agent Teams API partially verified from prior research)

## Summary

Phase 9 transforms Mowism from single-phase sequential execution into concurrent multi-phase execution. The team lead spawns `general-purpose` workers for independent phases identified by the DAG analysis (Phase 8), each worker runs in its own git worktree and autonomously orchestrates its own `discuss-phase -> plan-phase -> execute-phase` lifecycle, and the lead coordinates via structured event-driven messaging (Phase 7). The infrastructure foundation is solid: Phase 7 delivered per-phase STATUS.md, structured JSON messaging (7 event types), Active Phases table in STATE.md, and dual-path executor workflow supporting both single-agent and multi-agent modes. Phase 8 delivered `roadmap analyze-dag` with Kahn's BFS topological sort producing execution waves. The primary new work is: (1) a worktree management layer for per-phase worktree creation and lifecycle, (2) the multi-phase team lead orchestrator that maps DAG waves to Agent Teams tasks, (3) phase worker behavior as autonomous `general-purpose` teammates, (4) failure/recovery with persistent checkpoint files and circuit breaker, and (5) merge coordination with conflict-resolving subagents.

**Primary recommendation:** Build the worktree management layer first (`mow-tools.cjs` subcommands for create/reuse/manifest), then the DAG-to-tasks mapping in the team lead, then the phase worker agent prompt, then failure/recovery, then merge coordination. Each layer depends on the previous.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Worker Lifecycle
- Workers have **full autonomy**: they run the complete /mow:discuss-phase -> /mow:plan-phase -> /mow:execute-phase cycle independently
- If a worker needs discuss-phase (user input), it **blocks and the lead notifies** the user which terminal to switch to for context gathering
- Monitoring is **event-driven only** -- lead reacts to structured messages from workers (task claimed, commit made, phase complete, error), no polling
- On phase completion, workers **signal done and stay alive** -- user runs a command (e.g., `/mow:close-shop`) that ensures context is saved, pending git operations are handled, and any new ideas/context are captured in planning docs (not lost)
- If new work surfaces during execution, it gets saved as context for future spawned workers (e.g., as a phase x.1 or todo), not acted on immediately
- Pause-work signal is supported: user can tell orchestrator or individual worker to pause, with state saved for future resumption

#### Failure & Recovery
- On failure, **worker pauses and notifies lead** -- no automatic retry. Worker stays alive for user intervention in its terminal
- Independent phases **keep executing** when one fails -- only phases that depend on the failed phase get blocked
- Lead **proactively shows cascade impact**: "Phase 9 failed -- this blocks Phases 10, 11. Phase 8 still running independently."
- **Circuit breaker**: configurable threshold (default 2) -- if N+ workers fail, lead halts remaining workers and asks user to reassess
- Workers write **persistent checkpoint files** on failure -- survives session boundaries so a new worker can pick up from exactly where the old one stopped
- On resume after fix, worker runs a **quick smoke test** on previously-completed plans before continuing from the failure point
- Lead can **gracefully cancel** a phase -- worker finishes current atomic operation, stashes uncommitted changes, writes checkpoint, shuts down
- **User cancel vs timeout are distinguished**: user cancel = clean checkpoint; timeout = checkpoint + warning that work may be incomplete

#### Merge Conflict Resolution
- Worker attempts auto-resolve first, then **delegates to a focused subagent** if conflicts are complex (avoids bloating the worker's context window)
- Subagent gets just the conflict diff + enough context to resolve, reports back to worker

#### Worktree Management
- **One worktree per phase** -- clean isolation, no sharing
- Merge timing: **batch at wave boundaries by default**, with toggleable option for immediate merge on completion
- Worktrees **persist until milestone is confirmed complete** -- not cleaned up after merge, in case agents need to inspect them later
- Naming convention: **short numeric** -- e.g., `mowism-p09`
- Worktree location: **subdirectory** -- `.worktrees/p09`, `.worktrees/p10`, etc.
- **Reuse existing worktree** if one exists for a phase from a previous session (with stashed changes restored)
- Downstream phases **branch from merged main** after dependency phases merge -- gets all prior work
- `.worktrees/` directory is **gitignored** -- worktrees are local artifacts
- A **manifest file tracks worktree metadata** (which exist, their state) so context isn't lost if pushing/pulling across machines
- Toggle option to include worktree metadata when pushing to remote (for cross-machine continuity)

#### DAG-to-Tasks Mapping
- User can **override the DAG** with a warning -- force-start a phase even if dependencies aren't complete
- User **selects which phases to run** this session -- lead presents unfinished phases, user picks subset
- If user selects phases with incomplete dependencies, show a **slightly intimidating warning** with "are you sure" confirmation dialog

### Claude's Discretion

- **DAG-to-Tasks mapping strategy**: whether to create all phase tasks upfront with DAG dependencies or incrementally by wave
- **Completed phase visibility**: whether to include already-completed phases as pre-done tasks for visibility or skip them

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-01 | Team lead can execute multiple independent phases simultaneously across worktrees | Worktree management layer (create/reuse per phase), DAG-to-tasks mapping in team lead, Active Phases table tracking, wave-based spawning |
| EXEC-02 | Phase workers are `general-purpose` teammates that independently orchestrate their own wave executors via Task() | Agent type research confirms `general-purpose` has all tools including Task(); worker prompt template with full lifecycle autonomy; STATUS.md + structured messaging for coordination |
| EXEC-03 | Phase-level task dependencies in Agent Teams task list reflect the DAG from ROADMAP.md | `roadmap analyze-dag` output feeds TaskCreate/TaskUpdate with addBlockedBy; auto-unblocking or defensive unblocking at wave transitions |
</phase_requirements>

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| `mow-tools.cjs` | current (v1.1) | Worktree management, DAG analysis, state management, messaging | All Phase 7-8 infrastructure lives here; single CLI entry point for all Mowism operations |
| `wt` (WorkTrunk) | v0.25.0 | Git worktree creation, switching, merging | Already installed and configured with post-create hooks; handles the git plumbing |
| Agent Teams API | experimental | TeamCreate, SendMessage, Task, TaskCreate/TaskUpdate/TaskList | The coordination primitive for spawning and managing teammates; gated behind env var |
| git worktrees | git 2.53.0 | File isolation between concurrent phases | Native git feature; each worktree is an independent checkout |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `roadmap analyze-dag` | current | DAG extraction from ROADMAP.md | At session start to determine execution waves and dependencies |
| `status init/read/write/aggregate` | current | Per-phase STATUS.md management | Workers use for isolated status tracking per Phase 7 protocol |
| `message format/parse` | current | Structured JSON messaging (7 event types) | Workers send milestone events; lead processes them |
| `state active-phases/update-phase-row` | current | Active Phases table in STATE.md | Lead maintains multi-phase dashboard |
| `team-update` | current | Agent Team Status section management | Lead tracks teammate-to-worktree assignments |
| `worktree claim/release/status/clean` | current | Worktree assignment tracking in STATE.md | Phase-to-worktree mapping and conflict prevention |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `.worktrees/` subdirectory | `wt` default sibling directories (`~/git/mowism-p09`) | Subdirectory keeps worktrees co-located, easier to gitignore, matches user's locked decision. Requires `wt` config override or direct `git worktree add` |
| Event-driven monitoring | Polling TaskList on interval | Polling wastes lead context; event-driven via SendMessage is the locked decision |
| Batch merge at wave boundaries | Immediate merge on completion | Batch is the default per locked decision; immediate is a toggleable option |

## Architecture Patterns

### Recommended Project Structure (New Files)

```
.planning/
  phases/09-multi-phase-execution-engine/
    09-CONTEXT.md          # Already exists
    09-RESEARCH.md         # This file
    09-XX-PLAN.md          # Plans (to be created)
.worktrees/                # NEW: worktree directory (gitignored)
  p09/                     # Per-phase worktrees
  p10/
  manifest.json            # Worktree metadata manifest
bin/
  mow-tools.cjs            # Extended with worktree management commands
agents/
  mow-team-lead.md         # Updated for multi-phase orchestration
  mow-phase-worker.md      # NEW: phase worker agent definition (or inline prompt)
mowism/
  templates/
    checkpoint.md           # NEW: checkpoint file template
    phase-worker-prompt.md  # NEW: template for phase worker spawn prompt
  workflows/
    close-shop.md           # NEW: graceful shutdown workflow
    execute-phase.md        # Updated for multi-phase awareness
```

### Pattern 1: Nested Agent Hierarchy for Multi-Phase Execution

**What:** The lead orchestrator spawns `general-purpose` phase workers, each of which independently runs the full plan/execute lifecycle by spawning its own `mow-executor` subagents for individual plans.

**When to use:** When 2+ independent phases are available for parallel execution.

**Architecture:**
```
User's interactive session (all tools)
  |
  +-- Team Lead (mow-team-lead or interactive session)
       |
       +-- Phase Worker: Phase 9 (general-purpose teammate, worktree: .worktrees/p09)
       |    |-- discuss-phase -> plan-phase -> execute-phase lifecycle
       |    |-- Spawns mow-executor subagents for individual plans
       |    |-- Sends structured messages to lead at phase milestones
       |    +-- Writes STATUS.md for its phase
       |
       +-- Phase Worker: Phase 10 (general-purpose teammate, worktree: .worktrees/p10)
       |    |-- Same autonomous lifecycle
       |    +-- Independent of Phase 9 (unless DAG says otherwise)
       |
       +-- (Team Lead monitors via SendMessage inbox, TaskList, Active Phases)
```

**Why `general-purpose` workers:** Confirmed by AGENT-TEAMS-API-RUNTIME.md -- `general-purpose` agent type has ALL tools including Task() for spawning child executors. `mow-executor` types lack Agent Teams tools and cannot orchestrate sub-hierarchies. Phase workers need full tool access because they run the complete lifecycle (discuss/plan/execute), which involves spawning subagents, reading/writing files, running CLI commands, and sending messages.

**Confidence:** HIGH -- agent type tool availability verified in runtime test.

### Pattern 2: DAG-to-Tasks Mapping

**What:** Convert `roadmap analyze-dag` output into Agent Teams task dependencies.

**When to use:** At multi-phase session start, after user selects which phases to run.

**Flow:**
```
1. Run `roadmap analyze-dag --raw` -> JSON with phases[], waves[], ready[], blocked[]
2. Filter to user-selected phases
3. For each selected phase, TaskCreate with subject and description
4. For phases with dependencies, TaskUpdate with addBlockedBy pointing to dependency phase tasks
5. Worker claims task -> executes phase in worktree -> marks complete -> signals lead
6. Dependency phase tasks auto-unblock (or lead defensively checks)
```

**Discretion Recommendation (upfront vs incremental):** Create all selected phase tasks upfront with full DAG dependencies. Rationale:
- Workers can see what's coming and plan accordingly
- Auto-unblocking (if it works) handles wave transitions without lead intervention
- Lead can show full cascade impact on failure ("Phase 9 blocked because Phase 7 failed")
- Incremental creation adds complexity with no clear benefit (workers still can't start blocked tasks)

**Discretion Recommendation (completed phases as tasks):** Skip completed phases. Rationale:
- Completed phases don't need tracking in the task list -- they're marked `[x]` in ROADMAP.md
- Including them adds noise to TaskList output
- The lead can reference ROADMAP.md for historical context if needed
- Dependencies on completed phases are already satisfied, so `addBlockedBy` references would point to already-completed tasks (which auto-unblock immediately)

**Confidence:** MEDIUM -- auto-unblocking behavior is assumed but not runtime-verified. Defensive unblocking (lead manually checks) is the fallback.

### Pattern 3: Worktree Lifecycle Management

**What:** Per-phase worktree creation, reuse, and metadata tracking.

**Flow:**
```
1. Check manifest.json for existing worktree for this phase
2. If exists and phase not complete:
   a. Verify .worktrees/pNN directory exists
   b. Restore stashed changes if any
   c. Reuse worktree
3. If not exists:
   a. Determine base branch (merged main after dependency phases, or main/master)
   b. Create worktree: git worktree add .worktrees/pNN -b phase-NN <base>
   c. Copy .planning/ from main worktree (wt post-create hook handles this)
   d. Record in manifest.json
4. Worker operates in worktree directory
5. On phase completion:
   a. Worker signals lead
   b. Lead merges at wave boundary (batch) or immediately (toggle)
   c. Worktree persists (not cleaned until milestone complete)
   d. Update manifest.json
```

**Naming convention:** `.worktrees/p09`, `.worktrees/p10` (matches locked decision).
**Branch naming:** `phase-09`, `phase-10` (or `mowism-p09` per the naming convention, but branch names should be descriptive).

**Confidence:** HIGH -- git worktree mechanics are well-understood; WorkTrunk v0.25.0 supports custom path templates.

### Pattern 4: Event-Driven Lead Monitoring

**What:** Lead reacts only to structured messages from workers, never polls.

**Message types from Phase 7 infrastructure (7 event types):**

| Event Type | When | Lead Action |
|------------|------|-------------|
| `plan_started` | Worker begins a plan | Update Active Phases table |
| `plan_complete` | Worker finishes a plan | Update Active Phases, check wave completion |
| `phase_complete` | Worker finishes all plans in phase | Trigger merge, check downstream unblocking |
| `error` | Worker hits an error | Show cascade impact, increment circuit breaker counter |
| `blocker` | Worker is blocked (needs input) | Notify user which terminal to switch to |
| `state_change` | Worker status change | Update Active Phases table |
| `ack` | Acknowledgment | Log receipt |

**Lead does NOT poll.** Agent Teams delivers messages automatically. Lead receives idle notifications when workers pause.

**Confidence:** HIGH -- message schema and format/parse helpers are implemented and tested (Phase 7, Plan 2).

### Pattern 5: Persistent Checkpoint Files for Failure Recovery

**What:** When a worker fails, it writes a checkpoint file detailed enough for a fresh worker to resume from exactly where work stopped.

**Checkpoint file location:** `.planning/phases/XX-name/XX-CHECKPOINT.md` (or `.planning/phases/XX-name/XX-NN-CHECKPOINT.md` for plan-level checkpoints).

**Contents:**
```markdown
---
phase: XX-name
plan: NN (or null if phase-level)
status: failed | paused | cancelled | timeout
worker: worker-name
worktree: .worktrees/pXX
timestamp: ISO-8601
reason: user_cancel | timeout | error
---

## Completed Plans
[List of plans with SUMMARY.md files and commit hashes]

## Current Plan State
[Which plan was in progress, which task, what was done]

## Uncommitted Changes
[git diff --stat output from worktree]

## Stashed Changes
[stash reference if changes were stashed]

## Error Context (if error)
[Error message, stack trace, what was being attempted]

## Resume Instructions
1. Switch to worktree: cd .worktrees/pXX
2. Run smoke test on completed plans: [commands]
3. Continue from plan XX-NN, task N
4. [Specific guidance based on failure point]
```

**Confidence:** HIGH -- this is a template/convention design, no external dependencies.

### Anti-Patterns to Avoid

- **Lead implementing work directly:** The lead NEVER edits files, runs tests, or creates deliverables. It only coordinates.
- **Workers sharing worktrees:** One worktree per phase, always. Two workers editing the same file causes silent overwrites.
- **Polling TaskList in a loop:** Wastes lead context window. Event-driven messaging is the correct pattern.
- **Workers writing STATE.md:** Single-writer protocol (Phase 7). Workers write their own STATUS.md and send messages to lead.
- **Auto-retrying failures:** Locked decision: worker pauses and notifies, no automatic retry.
- **Cleaning worktrees after merge:** Locked decision: worktrees persist until milestone is confirmed complete.
- **Running too many parallel workers:** Token cost scales linearly (~200k per worker). Keep to 2-4 concurrent phase workers for cost efficiency. The 3+ independent plans threshold from mow-team-lead.md applies at the plan level; for phases, even 2 parallel phases is valuable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git worktree creation/management | Custom shell scripts for worktree lifecycle | `git worktree add/remove/list` + WorkTrunk `wt` for hooks | Git worktrees have edge cases (detached HEAD, shared index, ref conflicts). `wt` handles the plumbing and fires post-create hooks for `.planning/` copy |
| DAG topological sort | Custom dependency resolver | `topoGenerations()` in mow-tools.cjs (Phase 8) | Already implemented, tested with 7 topology cases (diamond, linear, independent, cycle, missing-ref) |
| Structured messaging | Custom message protocol | `message format/parse` in mow-tools.cjs (Phase 7) | 7 event types with schema validation, NDJSON chat logs, 500-char truncation already built |
| Phase status tracking | Custom state management | `status init/read/write/aggregate` in mow-tools.cjs (Phase 7) | Per-phase STATUS.md with plan progress table, aggregate stats, convention-based discovery |
| Active phase dashboard | Custom progress display | `state active-phases/update-phase-row` in mow-tools.cjs (Phase 7) | Multi-phase coordinator dashboard with status values and next-unblockable computation |
| Worktree claim/conflict prevention | File locking | `worktree claim/release/status/clean` in mow-tools.cjs | Already handles idempotent claims, conflict detection, stale cleanup |
| Merge conflict resolution | Inline resolution in worker context | Focused subagent with minimal context (locked decision) | Avoids bloating worker context with diff context. Subagent is disposable |

**Key insight:** Phases 7 and 8 built the entire coordination infrastructure. Phase 9's job is to wire these pieces together into a multi-phase orchestrator, add worktree lifecycle management, and implement the failure/recovery protocol. The actual coordination primitives are already built and tested.

## Common Pitfalls

### Pitfall 1: Coordinator Context Window Exhaustion

**What goes wrong:** With N phase workers, the lead receives N streams of milestone messages plus automatic idle notifications after every worker turn. For runs lasting 30+ minutes, the coordinator's 200k context fills and auto-compression loses earlier decisions and phase states.

**Why it happens:** Each worker sends ~5-10 messages per phase lifecycle (claimed, plan started x N, plan complete x N, phase complete, plus errors). With 3 workers, that's 15-30 messages. Add idle notifications (automatic after every worker turn), and the lead may process 50-100 messages in a session.

**How to avoid:**
1. State on disk, not in context -- lead re-reads STATE.md, Active Phases table, and TaskList after compression
2. Minimize message noise -- workers send only milestone messages (plan_complete, phase_complete, error, blocker), never progress chatter
3. Phase worker autonomy -- workers manage their own waves independently, message lead only at phase-level transitions. This reduces lead message volume from O(tasks) to O(phases)
4. Compact message format -- short structured JSON, file paths as references, not inline content

**Warning signs:** Lead making inconsistent decisions, "forgetting" which phases are at what state, repeating instructions.

### Pitfall 2: Worktree `.planning/` State Divergence

**What goes wrong:** Each worktree gets a COPY of `.planning/` at creation time (via `wt` post-create hook). As the lead updates STATE.md and ROADMAP.md in the main worktree, phase workers' copies diverge. A worker might read stale STATE.md or ROADMAP.md.

**Why it happens:** `.planning/` is copied at worktree creation, not synced. Git worktrees share the `.git` directory but each has its own working tree.

**How to avoid:**
1. Workers never read STATE.md for coordination -- they use their own STATUS.md and the TaskList
2. Workers read ROADMAP.md only at startup for phase context (it changes rarely during execution)
3. The lead is the single writer of STATE.md -- workers don't need to read it
4. For plan-level state, workers use their worktree-local `.planning/phases/XX/` which they own
5. If a worker needs fresh state, it can `git checkout main -- .planning/STATE.md` to pull the latest

**Warning signs:** Worker referencing stale phase statuses, conflicting writes to shared state files.

### Pitfall 3: Merge Conflicts from `.planning/` Files

**What goes wrong:** Multiple phase workers make commits in their worktrees. When merging back to main, `.planning/STATE.md` and `.planning/ROADMAP.md` will conflict because both the lead and workers may have modified them (on different branches).

**Why it happens:** STATE.md is modified by `mow-tools.cjs` commands in both the main worktree (lead) and phase worktrees (via `roadmap update-plan-progress` etc.).

**How to avoid:**
1. Workers in multi-agent mode skip STATE.md writes entirely (Phase 7 dual-path protocol)
2. Workers DO update ROADMAP.md plan progress and REQUIREMENTS.md -- these will conflict on merge
3. Solution: the lead (or a merge subagent) handles `.planning/` conflicts as part of the merge step
4. Alternative: workers skip ALL `.planning/` metadata commits, and the lead reconstructs from STATUS.md files and SUMMARY.md files post-merge
5. Recommended: workers commit only code changes in their worktrees; `.planning/` updates are done by the lead in the main worktree after receiving completion messages

**Warning signs:** Merge failures on `.planning/` files, "both modified" conflicts.

### Pitfall 4: Auto-Unblocking May Not Work

**What goes wrong:** After a blocking phase task is marked complete, the blocked downstream phase task might not automatically become claimable by workers.

**Why it happens:** Auto-unblocking behavior in Agent Teams TaskUpdate has not been runtime-verified (see AGENT-TEAMS-API-RUNTIME.md Q2: INCONCLUSIVE).

**How to avoid:** Implement defensive unblocking -- after a phase task completes:
1. Lead explicitly calls TaskList to check blocked tasks
2. For any task whose blockers are all completed, lead calls TaskUpdate to remove blockers
3. This adds ~1 tool call per phase completion but guarantees correctness

**Warning signs:** Workers idle with no available tasks despite upstream phases being complete.

### Pitfall 5: WorkTrunk vs Direct git worktree

**What goes wrong:** Using `wt switch --create` creates worktrees in WorkTrunk's default path (sibling directory: `~/git/mowism-p09`). The locked decision specifies `.worktrees/p09` subdirectory.

**Why it happens:** WorkTrunk's default path template uses sibling directories. The subdirectory pattern requires either a config override or direct `git worktree add`.

**How to avoid:**
1. Option A: Configure WorkTrunk project config to use subdirectory path: `worktree-path = "{{ repo_path }}/.worktrees/{{ branch | sanitize }}"`
2. Option B: Use direct `git worktree add .worktrees/p09 -b phase-09` and manually fire the post-create hook content (copy `.planning/`)
3. Recommended: Option B for predictable control. The `wt` post-create hook's `.planning/` copy behavior should be replicated in the mow-tools worktree create command

**Warning signs:** Worktrees appearing in unexpected locations, `.planning/` not copied to new worktrees.

### Pitfall 6: Downstream Phases Branching from Wrong Base

**What goes wrong:** A downstream phase branches from main before its dependency phases have been merged. The phase worker starts without the code from dependency phases.

**Why it happens:** The locked decision says "downstream phases branch from merged main after dependency phases merge." If the merge hasn't happened yet when the downstream worktree is created, the branch misses dependency work.

**How to avoid:**
1. The lead MUST merge dependency phase worktrees BEFORE creating downstream phase worktrees
2. Merge order follows DAG: Wave 1 phases merge first, then Wave 2 worktrees are created from post-merge main
3. The worktree creation command should verify that all dependency phases are merged before creating a downstream worktree
4. If batch-merge-at-wave-boundary is active, all Wave N phases must merge before ANY Wave N+1 worktrees are created

**Warning signs:** Downstream phase workers failing because expected code/files don't exist, merge conflicts that should have been resolved by upstream phases.

## Code Examples

### Worktree Creation (Direct git worktree add)

```bash
# Create worktree for phase 09, branching from main
git worktree add .worktrees/p09 -b phase-09 main

# Copy .planning/ from main worktree (replicate wt post-create hook)
cp -r .planning/ .worktrees/p09/.planning/

# Initialize STATUS.md for the phase
cd .worktrees/p09
node ~/.claude/mowism/bin/mow-tools.cjs status init 09

# Claim the phase in STATE.md (from main worktree)
cd /path/to/main
node ~/.claude/mowism/bin/mow-tools.cjs worktree claim 09
```

Source: git worktree documentation, `.config/wt.toml` post-create hook in this repo.

### DAG-to-Tasks Mapping (Pseudocode for Lead)

```javascript
// 1. Get DAG analysis
const dagResult = execSync('node mow-tools.cjs roadmap analyze-dag --raw');
const dag = JSON.parse(dagResult);

// 2. Filter to user-selected incomplete phases
const selectedPhases = userSelection.filter(p => !dag.completed.includes(p));

// 3. Create tasks for each selected phase
const taskIds = {};
for (const phase of selectedPhases) {
  const task = TaskCreate({
    subject: `Execute Phase ${phase.number}: ${phase.name}`,
    description: `Run full lifecycle (discuss->plan->execute) for Phase ${phase.number}.
Working directory: .worktrees/p${phase.number}
Phase directory: .planning/phases/${phase.directory}
Send structured messages to lead at milestones.`
  });
  taskIds[phase.number] = task.taskId;
}

// 4. Set up DAG dependencies
for (const phase of selectedPhases) {
  const deps = phase.depends_on_parsed
    .filter(dep => taskIds[dep])  // Only deps within selected phases
    .map(dep => taskIds[dep]);
  if (deps.length > 0) {
    TaskUpdate({ taskId: taskIds[phase.number], addBlockedBy: deps });
  }
}
```

Source: Existing mow-team-lead.md orchestration flow, `roadmap analyze-dag` output schema from Phase 8.

### Phase Worker Spawn Prompt (Template)

```
Task({
  team_name: "mow-{project}",
  name: "phase-{NN}",
  prompt: `You are a Mowism phase worker for Phase {NN}: {phase_name}.
Your working directory is {worktree_path}. cd there first.

## Your Mission
Run the FULL phase lifecycle autonomously:
1. Check if phase has CONTEXT.md -> if not, run /mow:discuss-phase {NN}
   (if this needs user input, send a blocker message to lead and wait)
2. Check if phase has PLAN files -> if not, run /mow:plan-phase {NN}
3. Run /mow:execute-phase {NN} for all plans

## Communication Protocol
Send structured messages to lead at these milestones ONLY:
- Phase started: message format plan_started
- Plan completed: message format plan_complete
- Phase completed: message format phase_complete
- Error/blocker: message format error or blocker

## State Management
- Write to YOUR STATUS.md: .planning/phases/{phase_dir}/{NN}-STATUS.md
- NEVER write to STATE.md (lead-owned)
- Commit code changes in your worktree branch

## On Completion
Signal done but STAY ALIVE. Do not shut down.
The user will run /mow:close-shop when ready.

## On Failure
Write a checkpoint file, notify lead, stay alive for user intervention.
Do NOT retry automatically.`,
  subagent_type: "general-purpose",
  run_in_background: false
})
```

Source: Existing mow-team-lead.md worker spawn pattern, AGENT-TEAMS-API-RUNTIME.md nested hierarchy confirmation.

### Manifest File Format

```json
{
  "version": "1.0",
  "project": "mowism",
  "worktrees": {
    "p09": {
      "path": ".worktrees/p09",
      "branch": "phase-09",
      "phase": "09",
      "phase_name": "multi-phase-execution-engine",
      "created": "2026-02-20T12:00:00Z",
      "status": "active",
      "stash_ref": null,
      "last_commit": "abc1234",
      "merged": false,
      "merged_at": null
    },
    "p10": {
      "path": ".worktrees/p10",
      "branch": "phase-10",
      "phase": "10",
      "phase_name": "live-feedback-and-visual-differentiation",
      "created": "2026-02-20T12:05:00Z",
      "status": "active",
      "stash_ref": null,
      "last_commit": null,
      "merged": false,
      "merged_at": null
    }
  },
  "updated": "2026-02-20T12:05:00Z"
}
```

Location: `.worktrees/manifest.json` (gitignored with `.worktrees/`).

### Circuit Breaker Logic (Pseudocode for Lead)

```javascript
let failureCount = 0;
const CIRCUIT_BREAKER_THRESHOLD = config.circuit_breaker_threshold || 2;

function onWorkerError(phaseNumber, errorMessage) {
  failureCount++;

  // Show cascade impact
  const dag = analyzeDag();
  const blocked = dag.phases
    .filter(p => p.depends_on_parsed.includes(phaseNumber))
    .map(p => `Phase ${p.number}: ${p.name}`);

  console.log(`Phase ${phaseNumber} failed. This blocks: ${blocked.join(', ')}`);

  // Check circuit breaker
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    console.log(`Circuit breaker tripped: ${failureCount} failures.`);
    console.log('Halting remaining workers. Please reassess.');
    // SendMessage broadcast: halt
    // Mark remaining tasks as blocked
    return;
  }

  // Independent phases keep executing
  console.log('Independent phases continue executing.');
}
```

## State of the Art

| Old Approach (v1.0/current) | Current Approach (Phase 9) | When Changed | Impact |
|----------------------------|---------------------------|--------------|--------|
| Single phase at a time (sequential) | Multiple phases in parallel (DAG-driven) | Phase 9 | Dramatic reduction in wall-clock time for multi-phase milestones |
| Single worktree execution | Per-phase worktrees with isolation | Phase 9 | Eliminates file conflicts between concurrent phases |
| Lead manages plan-level tasks | Lead manages phase-level tasks; workers manage plan-level internally | Phase 9 | Reduces lead message volume from O(tasks) to O(phases) |
| Teammate operations: spawnTeam, write, broadcast | Agent Teams: TeamCreate, SendMessage, Task | Phase 7 Plan 4 | Updated API surface; Teammate operations replaced |
| Direct STATE.md writes by all agents | Single-writer protocol: lead writes STATE.md, workers write STATUS.md | Phase 7 | Eliminates write conflicts in shared state |

**Deprecated/outdated:**
- **Teammate API:** The old `Teammate({ operation: "spawnTeam" })` syntax is replaced by `TeamCreate`, `SendMessage`, `Task` with team_name. Phase 7 Plan 4 already updated mow-team-lead.md.
- **Single-agent fallback:** Still supported (Phase 7 dual-path), but the primary path for multi-phase execution is Agent Teams.

## Open Questions

1. **Auto-unblocking behavior in Agent Teams**
   - What we know: TaskUpdate with addBlockedBy creates dependencies. When the blocking task completes, the blocked task should become available.
   - What's unclear: Whether this actually works automatically or requires manual intervention. Runtime test was INCONCLUSIVE.
   - Recommendation: Implement defensive unblocking (lead checks and manually removes blockers). If auto-unblocking works, the defensive check is a no-op (1 extra tool call). If it doesn't work, the system still functions correctly.

2. **WorkTrunk path configuration for subdirectory worktrees**
   - What we know: WorkTrunk supports custom `worktree-path` templates. The template `{{ repo_path }}/.worktrees/{{ branch | sanitize }}` would create worktrees at `.worktrees/phase-09`.
   - What's unclear: Whether modifying the project config `wt.toml` for this overrides the default globally or per-invocation. Also whether the post-create hook still fires correctly with subdirectory paths.
   - Recommendation: Use direct `git worktree add` for predictable control. Replicate the `.planning/` copy from the post-create hook in the mow-tools worktree creation command. This avoids depending on WorkTrunk config state.

3. **Workers running in-process vs background for user interaction**
   - What we know: Background mode is invisible to user (verified). In-process mode allows `Shift+Down` cycling. The locked decision says "workers block and lead notifies" for discuss-phase user input.
   - What's unclear: Whether in-process mode allows a worker to receive user input while other workers continue in the background. The user may need to interact with one worker (discuss-phase) while others execute autonomously.
   - Recommendation: Spawn workers NOT in background mode (so they have terminal access for user interaction). The user can cycle to them with `Shift+Down` when the lead notifies them. Workers that don't need user input simply proceed autonomously without interrupting the user.

4. **`.planning/` merge strategy when merging phase branches**
   - What we know: Workers commit code changes + some `.planning/` files (SUMMARY.md, STATUS.md). Lead commits STATE.md, ROADMAP.md updates in main worktree. These will conflict on merge.
   - What's unclear: The cleanest merge strategy for `.planning/` files.
   - Recommendation: Workers commit ONLY their phase-specific files (SUMMARY.md, STATUS.md in their phase directory). Workers skip ROADMAP.md and REQUIREMENTS.md updates (which update global files). After merge, the lead runs `roadmap update-plan-progress` and `requirements mark-complete` from the main worktree to reconcile. This eliminates cross-worktree `.planning/` conflicts entirely.

5. **`/mow:close-shop` command scope**
   - What we know: User runs this to gracefully shut down after workers signal done. Should save context, handle pending git ops, capture new ideas.
   - What's unclear: Whether this is a workflow command (`.md` file in workflows/) or a CLI subcommand, and exactly what "capture new ideas" means in practice.
   - Recommendation: Make it a workflow (`close-shop.md`). Steps: (1) Check all workers signaled done, (2) Run pending merges if any, (3) For each worker: read STATUS.md for deferred items, append to `deferred-items.md`, (4) Update STATE.md with final phase statuses, (5) Commit all `.planning/` changes, (6) Send shutdown requests to all workers, (7) Cleanup team.

## Sources

### Primary (HIGH confidence)
- `bin/mow-tools.cjs` -- Phase 7-8 infrastructure: topoGenerations(), cmdRoadmapAnalyzeDag(), status/message/active-phases/worktree/team-update commands (verified on disk)
- `agents/mow-team-lead.md` -- Current coordinator orchestration flow with Agent Teams API (verified on disk)
- `agents/mow-executor.md` -- Current executor agent with dual-path state management (verified on disk)
- `mowism/workflows/execute-phase.md` -- Current single-phase execution flow with wave-based spawning (verified on disk)
- `mowism/workflows/execute-plan.md` -- Current plan execution with multi-agent detection (verified on disk)
- `.planning/phases/07-*/07-*-SUMMARY.md` (4 summaries) -- Phase 7 deliverables (STATUS.md, messaging, Active Phases, single-writer wiring)
- `.planning/phases/08-*/08-*-SUMMARY.md` (3 summaries) -- Phase 8 deliverables (regex fixes, DAG analysis, DAG agent)
- `.planning/research/AGENT-TEAMS-API.md` -- Agent Teams capabilities and constraints (comprehensive research document)
- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` -- Runtime test results with corrected agent-type tool availability findings
- `.config/wt.toml` -- WorkTrunk project config with post-create hook for `.planning/` copy
- WorkTrunk documentation at https://worktrunk.dev/config/ -- worktree-path template configuration

### Secondary (MEDIUM confidence)
- Agent Teams experimental API -- tool definitions observed in system context (TeamCreate, SendMessage, Task, TaskCreate, TaskUpdate, TaskList, TaskGet)
- git worktree documentation -- standard git feature, well-documented behavior
- WorkTrunk v0.25.0 -- `wt list --format=json`, `wt switch --create`, `wt step push` commands verified locally

### Tertiary (LOW confidence)
- Auto-unblocking behavior -- assumed based on task dependency semantics but not runtime-verified
- Maximum concurrent teammates -- assumed ~5-8 practical limit based on token cost analysis, no hard limit documented
- Message delivery timing -- assumed queuing model, not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all infrastructure from Phases 7-8 verified on disk with tests passing
- Architecture: HIGH -- nested agent hierarchy confirmed by runtime tests; patterns build on verified infrastructure
- Pitfalls: HIGH -- identified from actual codebase analysis and Agent Teams research gaps; mitigations are concrete
- Worktree management: MEDIUM -- design is sound but direct `git worktree add` with subdirectory paths needs validation
- Auto-unblocking: LOW -- runtime unverified; defensive unblocking is the safe fallback

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (Agent Teams API may change; infrastructure is stable)
