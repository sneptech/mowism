# Phase 16: Auto-Advance Pipeline - Research

**Researched:** 2026-02-24
**Domain:** Cross-phase orchestration -- wiring existing per-workflow auto-advance into a top-level `/mow:auto` command with DAG awareness, discuss gates, milestone boundaries, and context window management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Pipeline scope & entry
- `/mow:auto` takes no arguments -- always starts from the first incomplete phase in the current milestone
- Targets full milestone completion (all phases through milestone end)
- Uses persistent `workflow.auto_advance` config flag -- individual workflows (plan-phase, execute-phase) read this flag and chain to the next step
- Context window awareness is critical: when the orchestrator's context gets low, save progress to STATE.md and instruct the user to `/clear` and re-run `/mow:auto`
- On re-run, detect completed phases and show what's done/next, then confirm "Continue from phase X?" before proceeding

#### Failure & recovery
- When a phase fails verification: pause the pipeline and alert the user with what failed
- No automatic retry -- user decides how to proceed
- Resume path: just re-run `/mow:auto` -- same command detects state and picks up where it stopped
- No separate `--resume` flag needed

#### Progress & feedback
- Orchestrator output is minimal: phase start/end banners, transition announcements
- Worker agents get full verbose output in their own terminal sessions
- STATE.md updated after each phase completes -- safe resume point if anything crashes
- Concurrent-safe STATE.md writes since parallel DAG phases may finish at different times
- Milestone completion shows a summary report: phases completed, total plans executed, time elapsed, and suggests `/mow:complete-milestone`

#### Discuss-phase gates
- Discuss-phase runs in the worker agent's terminal -- user interacts with it directly, like a normal discuss-phase session
- Orchestrator shows a notification line (e.g., "Phase X worker waiting for discuss input") while the worker blocks
- If CONTEXT.md already exists for a phase, skip discuss and move straight to research/plan
- For DAG-parallel phases, discuss gates run concurrently in separate worker terminals -- user switches between them
- Hard constraint is absolute: no flag, no override can bypass the discuss pause. User input is sacred.

### Claude's Discretion
- DAG dependency enforcement: strict DAG but allow user to manually mark phases complete to unblock downstream
- Progress indicator style during auto-advance (running counter vs phase announcements)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTO-01 | `/mow:auto` command starts full pipeline from specified phase through milestone end | New `commands/mow/auto.md` command file. Uses `init phase-op` to detect first incomplete phase. Sets `workflow.auto_advance: true` in config. Spawns full-lifecycle workers via team lead multi-phase flow. CONTEXT.md locked: "takes no arguments -- always starts from first incomplete phase." |
| AUTO-02 | Cross-phase transition automatically invokes next phase's lifecycle when current phase completes | Already implemented in `transition.md` Route A (auto-advance to next discuss/plan). Workers chain lifecycle stages internally (Phase 15). Team lead handles cross-phase coordination via `phase_complete` message -> merge -> spawn downstream. `/mow:auto` wires the team lead as the orchestrator. |
| AUTO-03 | DAG-aware auto-advance only starts phases whose dependencies are satisfied | Existing `cmdRoadmapAnalyzeDag` in mow-tools.cjs returns `ready`, `blocked`, `completed` arrays. Team lead `multi_phase_flow` already uses DAG to create tasks with `addBlockedBy` dependencies. `/mow:auto` delegates to team lead which handles DAG enforcement natively. |
| AUTO-04 | Auto-advance pauses at discuss-phase for user input and resumes after CONTEXT.md created | Phase 15 worker constraint: "Discuss ALWAYS pauses for user input" (mow-phase-worker.md constraint #9). Worker sends `input_needed` to lead, dashboard pins notification. Resume is automatic once CONTEXT.md created (artifact-based detection). CONTEXT.md locked: "If CONTEXT.md already exists, skip discuss." |
| AUTO-05 | Auto-advance stops at milestone boundary and clears `workflow.auto_advance` config | Existing implementation in `transition.md` Route B: `config-set workflow.auto_advance false` when `is_last_phase: true`. `/mow:auto` must ensure this path is reached. Summary report at boundary is new work. |
| AUTO-06 | `/mow:auto` accepts optional phase range (from/to) for partial pipeline execution | **CONFLICT with CONTEXT.md:** Locked decision says "takes no arguments." Requirement says "accepts optional phase range." Research recommends honoring CONTEXT.md (no arguments). If partial execution is needed later, it can be a follow-up. See Open Questions. |
| AUTO-07 | Auto-advance progress banner shows current phase and milestone percentage in dashboard | Existing dashboard renders per-phase progress bars with percentage. New: a top-level "Auto-Advance Pipeline" banner showing milestone-wide progress (e.g., "Phase 14/16 -- 87% milestone complete"). Requires minor dashboard render extension. |
</phase_requirements>

## Summary

Phase 16 is the capstone of v1.2 -- it wires together the full-lifecycle worker machinery (Phase 15), DAG scheduling (Phase 8), and the existing per-workflow auto-advance flags into a single `/mow:auto` entry point. The key insight from codebase analysis is that **most of the auto-advance machinery already exists**: the `workflow.auto_advance` config flag is already read by `discuss-phase.md`, `plan-phase.md`, `execute-phase.md`, and `transition.md`. The `mow-team-lead.md` already has DAG-driven multi-phase orchestration. Full-lifecycle workers already chain all stages. The remaining work is: (1) a new command file `commands/mow/auto.md` that sets the flag and delegates to the team lead, (2) resume detection on re-run, (3) a milestone-wide progress banner, (4) a milestone completion summary report, (5) context window awareness in the orchestrator, and (6) concurrent-safe STATE.md handling for parallel DAG phases.

The architecture follows the existing pattern: `/mow:auto` sets the `workflow.auto_advance` config flag to `true`, detects incomplete phases via DAG analysis, and delegates to the team lead's `multi_phase_flow`. Workers handle per-phase lifecycle autonomously. The orchestrator stays lean -- minimal output, phase start/end banners, progress banner updates. When context gets low, the orchestrator saves state and instructs the user to `/clear` and re-run. On re-run, `/mow:auto` detects what has already completed and resumes from the next phase.

The primary technical challenge is **context window exhaustion of the orchestrator session**. Unlike per-phase workers (which get fresh 200k context), the `/mow:auto` orchestrator persists across the entire milestone run. With 4-6 phases, each producing stage_transition messages, phase_complete events, and merge operations, the orchestrator accumulates significant context. The save-and-instruct pattern (save to STATE.md, tell user to `/clear` and re-run) is the mitigation, but requires careful implementation to ensure the orchestrator detects low context and saves cleanly before hitting the limit.

**Primary recommendation:** Create `commands/mow/auto.md` as a thin entry point that sets config, analyzes DAG, delegates to team lead for multi-phase orchestration, and handles milestone boundary + context window awareness. The command re-uses existing infrastructure almost entirely -- the new code is primarily the command file itself and a `cmdInitAuto` function in mow-tools.cjs (~40-60 LOC).

## Standard Stack

### Core
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| mow-team-lead.md | `agents/mow-team-lead.md` | Multi-phase DAG orchestration: spawns workers, manages tasks, handles events | Existing agent; `/mow:auto` delegates DAG enforcement and worker management here |
| mow-phase-worker.md | `agents/mow-phase-worker.md` | Full-lifecycle per-phase execution: discuss through refine | Phase 15 delivered; auto-advance chains these workers |
| transition.md | `mowism/workflows/transition.md` | Cross-phase transition: marks complete, advances to next, detects milestone boundary | Already handles auto-advance flag clearing at milestone end |
| mow-tools.cjs | `bin/mow-tools.cjs` | CLI: DAG analysis, config management, dashboard, state updates | All tooling commands already exist; needs ~40-60 LOC for `cmdInitAuto` |
| config.json | `.planning/config.json` | Persistent `workflow.auto_advance` flag | Already used by all workflows for auto-advance detection |

### Supporting
| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| discuss-phase.md | `mowism/workflows/discuss-phase.md` | Discuss with auto-advance guard | Worker runs inline; auto-advance skipped in worker mode (Phase 15) |
| plan-phase.md | `mowism/workflows/plan-phase.md` | Plan with auto-advance to execute | Worker runs inline |
| execute-phase.md | `mowism/workflows/execute-phase.md` | Execute with auto-advance to transition | Worker runs inline; worker-mode skips auto-advance |
| cmdRoadmapAnalyzeDag | `bin/mow-tools.cjs:4035` | Returns phases, waves, ready, blocked, completed | `/mow:auto` uses this to determine start point and DAG order |
| cmdPhaseComplete | `bin/mow-tools.cjs:4745` | Marks phase done, finds next, detects is_last_phase | Transition workflow uses this; returns milestone boundary signal |
| cmdDashboardRender | `bin/mow-tools.cjs:557` | Renders phase progress rows, event log, pinned notifications | Extended to show milestone-wide auto-advance banner |
| cmdConfigSet/Get | `bin/mow-tools.cjs:1309/1374` | Dot-notation config read/write | Sets/reads `workflow.auto_advance` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Team lead multi-phase for orchestration | Direct loop in `/mow:auto` command | Team lead already handles DAG, worker spawn, merge, events. Re-implementing would duplicate 200+ lines of tested orchestration logic. |
| Persistent config flag for auto_advance | Environment variable or transient file | Config flag matches existing pattern used by 4 workflows. Env var dies with session but cannot be re-read by workers in worktrees. Transient file adds cleanup complexity. |
| Save-and-instruct for context exhaustion | Session resume API | Claude Code has no session resume for Agent Teams. Save-and-instruct is the only viable pattern. |

## Architecture Patterns

### Recommended Changes to Project Structure
```
commands/
  mow/
    auto.md                      # NEW: /mow:auto command entry point

bin/
  mow-tools.cjs                  # MODIFY: add cmdInitAuto (~40-60 LOC), extend dashboard for milestone banner

mowism/
  workflows/
    auto.md                      # NEW: auto-advance orchestration workflow

agents/
  mow-team-lead.md               # MINOR: Add auto-advance-specific event handling (milestone summary)
```

### Pattern 1: Thin Command + Delegation to Team Lead
**What:** `/mow:auto` is a thin command file that sets config, analyzes DAG state, and delegates to the team lead's existing `multi_phase_flow`. The command does NOT implement its own orchestration loop.
**When to use:** This is the primary pattern for `/mow:auto`.
**Why:** The team lead already has battle-tested DAG orchestration, worker spawning, merge coordination, event-driven monitoring, and circuit breaker logic. Duplicating this in a new command would create a maintenance burden and miss edge cases the team lead already handles.

**Flow:**
```
/mow:auto
  1. cmdInitAuto → DAG analysis, detect first incomplete phase, milestone boundaries
  2. config-set workflow.auto_advance true
  3. If re-run detected → show completed phases, confirm "Continue from phase X?"
  4. Delegate to team lead multi_phase_flow with ALL remaining phases
  5. Team lead handles DAG, workers, merges, events
  6. On phase_complete → check milestone boundary → if last phase, show summary
  7. On context low → save-and-instruct
```

### Pattern 2: Resume-on-Rerun via DAG State Detection
**What:** When `/mow:auto` is invoked and completed phases exist, it detects them via `cmdRoadmapAnalyzeDag` and resumes from the next incomplete phase. No separate `--resume` flag needed.
**When to use:** Every invocation of `/mow:auto` (first run and re-runs look identical).

**Detection logic:**
```
DAG = mow-tools roadmap analyze-dag --raw

completed_phases = DAG.completed (disk_status == "complete")
ready_phases = DAG.ready (deps satisfied, not complete)
blocked_phases = DAG.blocked (deps not met)

if completed_phases.length > 0:
    display: "Phases {list} already complete."
    display: "Continuing from Phase {first_ready}."
    confirm: "Continue from phase X?"
```

This matches the locked decision: "On re-run, detect completed phases and show what's done/next, then confirm before proceeding."

### Pattern 3: Context Window Awareness (Save-and-Instruct)
**What:** The orchestrator monitors its own context usage and, when approaching limits, saves all progress to STATE.md and displays a message instructing the user to `/clear` and re-run `/mow:auto`.
**When to use:** When orchestrator context reaches ~25% remaining.
**Implementation approach:** The existing PostToolUse context window hook (Phase 13, BUG-10) warns at 35%/25%. The auto-advance orchestrator should check context remaining after each phase completes. Since Claude Code does not expose a programmatic "context remaining" API to agents, the orchestrator relies on two signals:

1. **Phase count heuristic:** Each phase consumes ~15-25k tokens of orchestrator context (stage_transition messages, merge events, dashboard renders). With 200k context, this means ~8-10 phases before concern. If the milestone has 6+ remaining phases, warn at phase 4 complete.

2. **Self-assessment:** After each phase completes, the orchestrator explicitly checks: "Am I losing track of earlier context?" This is inherently unreliable but adds a safety net.

The safe approach is: save progress aggressively (update STATE.md after each phase) so that any interruption (context exhaustion, crash, user exit) has a clean resume point.

### Pattern 4: Milestone-Wide Progress Banner
**What:** A top-level banner in the dashboard showing auto-advance pipeline status: which phase is current, milestone completion percentage, and elapsed time.
**When to use:** Rendered during auto-advance mode only (when `workflow.auto_advance` is true).
**Implementation:** Extend `cmdDashboardRender` to check `auto_advance` flag and prepend a milestone summary line:

```
Auto-Advance: Phase 15/16 | Milestone: 93% | 3 phases done | 12m elapsed
---
Phase 15: executing       [########  ] 75%  Plan 2/3        04:32
---
[event log]
```

The data comes from DAG analysis (total phases, completed count) and STATE.md performance metrics.

### Pattern 5: Concurrent STATE.md Safety for Parallel DAG Phases
**What:** When multiple DAG-parallel phases finish at similar times, their STATE.md updates must not corrupt each other.
**When to use:** Multi-phase DAG execution with parallel waves.
**Current state:** The team lead (single writer for STATE.md) already serializes updates. Workers write to STATUS.md (per-phase, per-worktree, no contention). The team lead processes `phase_complete` messages one at a time in its event loop. Since Agent Teams delivers messages sequentially to the lead (even if workers finish simultaneously), STATE.md writes are naturally serialized.

**Risk assessment:** LOW. The single-writer pattern (lead owns STATE.md) already prevents concurrent writes. No additional locking mechanism is needed. The CONTEXT.md decision about "concurrent-safe STATE.md writes" is already satisfied by the existing architecture. Workers write STATUS.md in their own worktrees (no contention), and the lead serializes STATE.md updates via its event-driven message processing.

### Anti-Patterns to Avoid
- **Building a custom orchestration loop in `/mow:auto`:** The team lead already handles all of this. Duplicating it creates divergence and bugs.
- **Auto-retrying failed phases:** Locked decision says no automatic retry. The pipeline pauses and the user decides.
- **Clearing auto_advance early on error:** The flag should persist so that re-running `/mow:auto` resumes from where it stopped. Only clear at milestone boundary.
- **Running `/mow:auto` without Agent Teams enabled:** Auto-advance with workers requires Agent Teams. If not enabled, fall back to single-session sequential mode (existing `--auto` flag behavior through discuss->plan->execute->transition chain).
- **Attempting to track context window usage programmatically:** Claude Code does not expose this to agents. Use heuristics and aggressive saving instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DAG analysis | Custom phase dependency parser | `mow-tools.cjs roadmap analyze-dag --raw` | Already handles topological sort, ready/blocked detection, cycle detection, missing refs |
| Worker orchestration | Custom worker spawn/monitor loop | Team lead `multi_phase_flow` | Handles worktree creation, task dependencies, event processing, merge, circuit breaker |
| Config management | Direct JSON file manipulation | `mow-tools.cjs config-set/config-get` | Handles dot-notation, type parsing, defaults, nested sections |
| Phase completion detection | Custom file scanning | `mow-tools.cjs phase-plan-index` and `roadmap analyze-dag` | Returns disk_status (complete/partial/planned/empty) per phase |
| Progress rendering | Custom progress output | `mow-tools.cjs dashboard render` | Already renders per-phase progress bars, event log, pinned notifications |
| Milestone boundary detection | Manual phase counting | `mow-tools.cjs phase complete` returns `is_last_phase` | Transition workflow already uses this; team lead delegates to transition |
| Phase marking | Manual ROADMAP.md editing | `mow-tools.cjs phase complete` | Updates ROADMAP.md, REQUIREMENTS.md, STATE.md atomically |

**Key insight:** Phase 16 is a capstone that wires together existing machinery. The original v1.2 research correctly identified this: "the pipeline machinery already exists distributed across four workflow files -- this phase is primarily a thin entry point plus safety guardrails." Nearly every operation `/mow:auto` needs is already implemented and tested.

## Common Pitfalls

### Pitfall 1: Context Window Exhaustion of the Auto-Advance Orchestrator
**What goes wrong:** The orchestrator session runs across 4-6+ phases, accumulating stage_transition messages, merge events, dashboard renders, and state updates. At some point, auto-compaction fires, the orchestrator loses track of completed phases, and produces incorrect state or duplicate work.
**Why it happens:** Unlike workers (fresh 200k per phase), the orchestrator persists for the entire milestone run. Each phase produces 15-25k tokens of orchestrator context.
**How to avoid:** (1) Keep orchestrator output minimal -- banners and announcements only. (2) Update STATE.md after every phase completes as a save point. (3) After each phase completion, estimate remaining context capacity. If the milestone has many remaining phases, save and instruct the user to `/clear` and re-run. (4) The team lead already follows "keep your context lean (~15%)" constraint.
**Warning signs:** Orchestrator re-renders dashboard for already-completed phases. Orchestrator attempts to spawn workers for phases that already have SUMMARY.md files. Phase completion events appear duplicated in the event log.

### Pitfall 2: Stale auto_advance Config Persists Across Sessions (Pitfall 10 from PITFALLS.md)
**What goes wrong:** User runs `/mow:auto`, session crashes or is interrupted mid-milestone. Next session, `workflow.auto_advance` is still `true` in config.json. Running `/mow:execute-phase` or other commands unexpectedly enters auto-advance mode.
**Why it happens:** `workflow.auto_advance` is stored in persistent config.json. Only cleared at milestone boundary (`transition.md` Route B).
**How to avoid:** (1) `/mow:auto` on re-run detects previous state and confirms before continuing -- this is a locked decision. (2) When NOT running `/mow:auto` (i.e., any other command), check if auto_advance is stale: if `auto_advance: true` but no active Agent Team session, display a warning banner and offer to clear it. (3) The transition workflow already clears at milestone boundary. (4) Add a visible "AUTO-ADVANCE ACTIVE" banner in any workflow that detects the flag, so the user always knows.
**Warning signs:** Phases advancing without explicit `--auto` flag or `/mow:auto` invocation. Dashboard showing auto-advance banner in a non-auto session.

### Pitfall 3: AUTO-06 Conflict with Locked Decision
**What goes wrong:** Requirement AUTO-06 says `/mow:auto` accepts optional phase range (from/to). But the locked decision in CONTEXT.md says "/mow:auto takes no arguments -- always starts from first incomplete phase."
**Why it happens:** CONTEXT.md was gathered after REQUIREMENTS.md was written, and the discuss-phase narrowed the scope.
**How to avoid:** Honor the locked decision (no arguments). Document the discrepancy. The planner should address AUTO-06 by noting it was superseded by the discuss-phase decision. If phase range selection is desired later, it can be added as an argument to a future iteration of the command.
**Warning signs:** N/A -- this is a requirements conflict to resolve during planning.

### Pitfall 4: Runaway Pipeline Without Cost Awareness (Pitfall 6 from PITFALLS.md)
**What goes wrong:** `/mow:auto` chains 6+ phases, consuming millions of tokens without human checkpoints. User returns to find excessive API charges.
**Why it happens:** The only automatic stop points are: milestone boundary, verification failure, and discuss-phase pause. If all discuss phases have pre-existing CONTEXT.md (phases were pre-discussed), the pipeline runs without any human interaction.
**How to avoid:** (1) Show estimated phase count and warn before starting. (2) Discuss pause is the primary safety valve -- even with auto-advance, discuss always pauses (locked constraint). (3) The context window exhaustion pattern (save-and-instruct at ~25%) creates natural checkpoints every 4-5 phases. (4) Milestone boundary stops the pipeline and clears the flag. (5) Consider adding a simple "phases completed since last user interaction" counter that pauses after N phases (e.g., 3) to confirm continuation.
**Warning signs:** Multiple phases completing without any user input events in the dashboard log. Orchestrator running for >30 minutes without user interaction.

### Pitfall 5: Discuss Gates Run Concurrently for Parallel Phases Without Clear UX
**What goes wrong:** Two DAG-parallel phases both need discuss input. Two worker terminals simultaneously present AskUserQuestion prompts. The user does not know which terminal to focus on, misses one, or inputs get confused.
**Why it happens:** DAG-parallel phases spawn workers simultaneously, and both reach discuss-phase at roughly the same time.
**How to avoid:** (1) The dashboard already pins `input_needed` notifications per phase with color coding. (2) The team lead's `input_needed` handler notifies the user which terminal needs attention. (3) Locked decision acknowledges this: "For DAG-parallel phases, discuss gates run concurrently in separate worker terminals -- user switches between them." (4) Workers include a context recap when the user switches to their terminal, helping reorient after switching.
**Warning signs:** Two pinned `input_needed` notifications simultaneously. User responses appearing in the wrong phase's CONTEXT.md.

## Code Examples

### `/mow:auto` Command Flow (Pseudocode)
```
# Source: Derived from existing codebase patterns

# 1. Initialize and detect state
INIT = mow-tools init phase-op {first_phase}  # or a new "init auto" compound
DAG = mow-tools roadmap analyze-dag --raw

completed = DAG.completed
ready = DAG.ready
blocked = DAG.blocked
remaining = total_phases - completed.length

# 2. Show current state
if completed.length > 0:
    print "Phases already complete: {completed}"
    print "Next: Phase {ready[0]}"
    confirm "Continue from Phase {ready[0]}? (y/n)"

# 3. Set auto-advance flag
mow-tools config-set workflow.auto_advance true

# 4. Show pipeline preview
print "Auto-advance pipeline: {remaining} phases remaining"
print "DAG order: {wave_summary}"
print "Discuss gates will pause for input at each phase"
if all phases have CONTEXT.md:
    print "Note: All phases have existing CONTEXT.md -- discuss will be skipped"

# 5. Delegate to team lead
# Team lead handles: worktree creation, worker spawning, DAG enforcement, merging
follow agents/mow-team-lead.md multi_phase_flow with ALL remaining phases

# 6. On milestone boundary (is_last_phase from phase complete)
mow-tools config-set workflow.auto_advance false
print milestone_summary_report()
print "Suggest: /mow:complete-milestone {version}"
```

### cmdInitAuto in mow-tools.cjs (Skeleton)
```javascript
// Source: Derived from existing cmdInit* patterns in mow-tools.cjs

function cmdInitAuto(cwd, raw) {
  // Verify planning exists
  const planningDir = path.join(cwd, '.planning');
  if (!fs.existsSync(planningDir)) {
    error('No .planning/ directory. Run /mow:new-project first.');
  }

  // Load config
  const config = loadConfig(cwd);

  // Run DAG analysis
  const dagResult = cmdRoadmapAnalyzeDagInternal(cwd);

  // Determine milestone boundaries
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const roadmapContent = safeReadFile(roadmapPath) || '';
  // Extract current milestone phases
  const milestonePhases = extractCurrentMilestonePhases(roadmapContent);

  // Check Agent Teams status
  const atStatus = checkAgentTeams();

  const result = {
    planning_exists: true,
    auto_advance_current: config.auto_advance || false,
    dag: dagResult,
    milestone_phases: milestonePhases,
    completed_count: dagResult.completed.length,
    remaining_count: dagResult.ready.length + dagResult.blocked.length,
    first_ready_phase: dagResult.ready[0] || null,
    agent_teams_enabled: atStatus.enabled,
    commit_docs: config.commit_docs,
  };

  output(result, raw);
}
```

### Milestone Summary Report (Template)
```
Source: Derived from locked decision on milestone completion output

---
AUTO-ADVANCE PIPELINE COMPLETE

Milestone: v1.2 Native Worktrees & Full-Lifecycle Workers

Phases completed: 4 (13, 14, 15, 16)
Total plans executed: 16
Time elapsed: 47 minutes

Phase Summary:
  Phase 13: GSD Bugfix Ports          -- 5 plans, 12m
  Phase 14: Native Worktree Adoption  -- 5 plans, 15m
  Phase 15: Full-Lifecycle Workers    -- 3 plans, 12m
  Phase 16: Auto-Advance Pipeline     -- 3 plans, 8m

Auto-advance flag cleared.

Next: /mow:complete-milestone v1.2
---
```

### Dashboard Auto-Advance Banner Extension
```
Source: Existing dashboard render pattern + locked decision on progress visibility

# When workflow.auto_advance is true and active phases exist,
# prepend this banner before the per-phase rows:

AUTO-ADVANCE  Phase 15/16  Milestone: 93%  3/4 done  12m elapsed
---
Phase 15: executing       [########  ] 75%  Plan 2/3        04:32
---
[event log]

# Implementation: In cmdDashboardRender, check auto_advance config.
# If true, compute milestone-wide stats from DAG analysis and prepend banner line.
```

### Agent Teams Fallback (Single-Session Mode)
```
Source: Existing --auto flag pattern in workflows

# If Agent Teams is NOT enabled, fall back to single-session sequential mode.
# This is the existing behavior when --auto flag is passed to individual commands.

# Instead of multi-phase orchestration via team lead:
for each incomplete phase in DAG order:
    if !has_context:
        follow discuss-phase.md --auto  # still pauses for user input
    follow plan-phase.md --auto          # chains to execute
    follow execute-phase.md --auto       # chains to transition
    follow transition.md --auto          # chains to next phase

# This is the EXISTING auto-advance chain. /mow:auto just sets the flag
# and starts the chain from the first incomplete phase.
```

## State of the Art

| Old Approach (v1.1) | New Approach (v1.2 Phase 16) | When Changed | Impact |
|---------------------|------------------------------|--------------|--------|
| `--auto` flag on individual commands | `/mow:auto` as single entry point | Phase 16 | Users type one command for full milestone execution |
| Sequential phase execution only | DAG-aware parallel phase execution | Phase 8 (DAG) + Phase 16 (auto) | Independent phases run simultaneously |
| No resume on re-run | Automatic state detection and resume | Phase 16 | Re-running `/mow:auto` picks up where it stopped |
| No milestone-wide progress visibility | Auto-advance progress banner in dashboard | Phase 16 | User sees overall milestone completion percentage |
| Auto-advance flag cleared only at milestone end | Flag cleared at milestone end + visible "ACTIVE" banner | Phase 16 | Stale flag is detected and surfaced to user |
| No context window awareness in orchestrator | Save-and-instruct pattern at ~25% remaining | Phase 16 | Orchestrator survives long milestone runs |

**Deprecated/outdated:**
- The `--auto` flag on individual commands still works but is superseded by `/mow:auto` for full-milestone runs. Individual `--auto` flags remain for partial automation (e.g., auto-advance from discuss to plan only).

## Open Questions

1. **AUTO-06 Conflict Resolution**
   - What we know: CONTEXT.md locks "/mow:auto takes no arguments." REQUIREMENTS.md says "accepts optional phase range."
   - What's unclear: Whether the locked decision supersedes the requirement or if partial execution should be supported.
   - Recommendation: Honor CONTEXT.md (no arguments). Document AUTO-06 as "deferred per discuss-phase decision." The planner can note this in the plan. If needed later, arguments can be added without breaking the no-argument default.

2. **Agent Teams Availability Assumption**
   - What we know: Agent Teams is experimental, gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Not all users will have it enabled.
   - What's unclear: Should `/mow:auto` require Agent Teams, or fall back to single-session sequential mode?
   - Recommendation: Support both modes. With Agent Teams: multi-phase DAG-parallel orchestration via team lead. Without Agent Teams: single-session sequential auto-advance via existing `--auto` flag chain. This matches the existing pattern where `execute-phase.md` offers Agent Teams as an enhancement, not a requirement.

3. **Context Window Monitoring Mechanism**
   - What we know: Claude Code does not expose context window usage programmatically to agents. The PostToolUse hook (Phase 13) monitors but operates at the hook level, not the agent level.
   - What's unclear: How the orchestrator detects its own context approaching limits.
   - Recommendation: Use phase-count heuristic (warn after ~4-5 phases in a single orchestrator session) combined with aggressive STATE.md saves after each phase. This is conservative but safe. The user can always `/clear` and re-run proactively.

4. **Concurrent Discuss Input UX** (Claude's Discretion)
   - What we know: DAG-parallel phases may both need discuss input simultaneously. Workers present in separate terminals.
   - What's unclear: Should the orchestrator sequence discuss gates to avoid overwhelming the user?
   - Recommendation: Let them run concurrently as the locked decision specifies. The dashboard's pinned notifications with phase colors already provide routing. Adding sequencing would slow down the pipeline unnecessarily. Most users running `/mow:auto` will have pre-discussed phases (CONTEXT.md already exists), making this a rare scenario in practice.

## Sources

### Primary (HIGH confidence)
- `agents/mow-team-lead.md` -- Multi-phase DAG orchestration, worker spawning, event processing. Read in full.
- `agents/mow-phase-worker.md` -- Full-lifecycle worker with discuss pause constraint. Read in full.
- `mowism/workflows/discuss-phase.md` -- Auto-advance step, worker-mode guard. Read in full.
- `mowism/workflows/plan-phase.md` -- Auto-advance to execute step. Read in full.
- `mowism/workflows/execute-phase.md` -- Auto-advance to transition, worker-mode detection. Read in full.
- `mowism/workflows/transition.md` -- Cross-phase transition, milestone boundary detection, auto_advance clearing. Read in full.
- `mowism/workflows/settings.md` -- Auto-advance toggle in settings. Read in full.
- `bin/mow-tools.cjs` -- `cmdRoadmapAnalyzeDag` (lines 4035-4202), `cmdPhaseComplete` (lines 4745-4860), `cmdDashboardRender` (lines 557-721), `cmdConfigSet/Get` (lines 1309-1419), `CONFIG_DEFAULTS` (lines 1354-1372), `loadConfig` (lines 787-840). Read relevant sections.
- `mowism/templates/config.json` -- Default config structure with `workflow.auto_advance: false`. Read in full.
- `.planning/ROADMAP.md` -- Phase 16 description, DAG structure `{13, 14} -> 15 -> 16`. Read in full.
- `.planning/REQUIREMENTS.md` -- AUTO-01 through AUTO-07. Read in full.
- `.planning/STATE.md` -- Current project state, accumulated decisions. Read in full.
- `.planning/phases/16-auto-advance-pipeline/16-CONTEXT.md` -- Locked decisions for Phase 16. Read in full.

### Secondary (MEDIUM confidence)
- `.planning/research/v1.2-SUMMARY.md` -- Phase 16 rationale and deliverables (lines 133-138). Confirms "thin entry point."
- `.planning/research/v1.2-ARCHITECTURE.md` -- Component integration map for auto-advance (lines 133-138). Confirms single new file.
- `.planning/research/PITFALLS.md` -- Pitfall 6 (runaway pipeline, lines 211-243), Pitfall 10 (stale auto_advance, lines 358-387). Risk analysis.
- `.planning/phases/15-full-lifecycle-workers/15-RESEARCH.md` -- Phase 15 patterns that auto-advance builds on.
- `commands/mow/complete-milestone.md` -- Milestone completion workflow (target after auto-advance finishes).

### Tertiary (LOW confidence)
- None. All findings are verified from primary codebase sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components are existing files read directly from the codebase
- Architecture: HIGH -- the "thin entry point + delegation" pattern is confirmed by v1.2-SUMMARY.md, v1.2-ARCHITECTURE.md, and codebase analysis showing all machinery already exists
- Pitfalls: HIGH -- grounded in PITFALLS.md research plus codebase verification of auto_advance persistence mechanism and context window limitations
- Resume detection: HIGH -- `cmdRoadmapAnalyzeDag` already returns completed/ready/blocked; resume logic is straightforward conditional branching
- Dashboard extension: HIGH -- existing `cmdDashboardRender` structure is clear; milestone banner is a prepended line with data from DAG analysis

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days -- stable internal codebase, no external dependencies)
