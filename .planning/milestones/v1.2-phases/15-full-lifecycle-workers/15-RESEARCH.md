# Phase 15: Full-Lifecycle Workers - Research

**Researched:** 2026-02-24
**Domain:** Multi-agent lifecycle orchestration — extending phase workers to autonomously chain all workflow stages via nested subagent delegation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Discuss pause interaction
- Worker runs the full `/mow:discuss-phase` flow directly — gray area selection, deep-dive questions, the complete experience
- Worker uses AskUserQuestion directly in its own session (user sees questions from worker context)
- Worker ALSO sends a message to team lead so the orchestrator UI shows that input is needed (dual-path notification)
- CONTEXT.md creation signals "discuss done" — once CONTEXT.md exists, worker auto-continues to research
- No explicit "continue" confirmation needed after discuss

#### Worker autonomy level
- Default: auto-advance all stages after discuss (research -> plan -> execute -> refine without stopping)
- Configurable stage gates in settings:
  - `worker.stage_gates: "none"` (default) — fully autonomous after discuss
  - `worker.stage_gates: "before_execute"` — pause before execute for plan review
  - `worker.stage_gates: "every_stage"` — pause between each stage
- Subagents make best judgment on ambiguity, never escalate — decisions documented for review during refine
- Plan-checker always runs (non-negotiable quality gate)
- Refine stage (verification) configurable — runs by default, can be disabled in settings for speed
- Model routing uses existing profile system (`/mow:set-profile`) — no new per-stage model routing needed

#### Progress visibility
- Workers send stage transition messages to team lead, updating the dashboard (`/mow:team-status` or `/mow:worktree-status`)
- Dashboard shows stage name + sub-progress where available (e.g., "Phase 15: executing (plan 2/5)")
- Intermediate artifact reporting and live artifact inspection: Claude's discretion on verbosity and timing

#### Failure & recovery
- Failure handling strategy: Claude's discretion (retry-then-stop using existing executor retry limits is the likely approach)
- Resume uses artifact-based detection: CONTEXT.md -> discuss done, RESEARCH.md -> research done, PLANs -> plan done, SUMMARYs -> execute done — skips to first missing stage
- `/mow:pause-work` must integrate with artifact-based detection so pause state is consistent with what the worker sees on resume
- Stage fallback on plan failure: Claude's discretion (retry planning vs re-run research based on failure type)

#### Parallel execution
- Workers can run in parallel across independent phases (DAG-driven)
- Phase 15 includes a parallelizability validation step — before spawning parallel workers, the system checks phase dependencies to confirm safe parallel execution
- This check should be a subagent validation that runs when phases are defined (at roadmap creation time or before worker spawn), ensuring no phase runs before its dependencies complete

### Claude's Discretion
- Whether to skip discuss for trivial/infrastructure phases (auto-generate minimal CONTEXT.md)
- Intermediate artifact reporting verbosity (stage transitions only vs stage + key artifacts)
- Live artifact inspection timing (available mid-stage vs only after stage completes)
- Failure handling strategy details (retry count, fallback to earlier stages)
- Stage fallback decisions (retry planning vs re-research based on failure type)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Summary

Phase 15 rewrites the `mow-phase-worker.md` agent to chain all five lifecycle stages (discuss, research, plan, execute, refine) via a combination of inline workflow execution and Task() subagent delegation. The current worker handles only Steps 2-5 (context gathering, planning, execution, phase completion) with planning and execution being relatively thin orchestrations. The new worker must become a full lifecycle orchestrator that: (1) runs discuss-phase inline with dual-path user notification, (2) spawns mow-phase-researcher as a Task() subagent, (3) runs plan-phase inline (which itself spawns mow-planner and mow-plan-checker as Task() subagents), (4) runs execute-phase inline (which spawns mow-executor subagents per plan), and (5) spawns mow-verifier as a Task() subagent for the refine stage. The critical architectural pattern is the 3-level hierarchy: team lead (Level 0) -> phase worker/teammate (Level 1, full session, CAN use Task()) -> leaf subagents (Level 2, restricted, CANNOT spawn further).

The primary technical challenge is context accumulation. A full lifecycle spanning 5 stages with 4-8 subagent returns will accumulate 100-150k tokens if returns are not minimized. The research confirms that the disk-first pattern (subagents write artifacts to disk, return only file paths and 1-2 line summaries) is the mandatory mitigation. Workers must never collect full CONTEXT.md, RESEARCH.md, PLAN.md, or SUMMARY.md contents in their context — they pass file paths between stages. The second critical challenge is the discuss-phase interaction model: discuss MUST run inline (not as a Task() subagent) because AskUserQuestion behavior in subagents is unreliable, and the worker needs to send `input_needed` to the team lead while simultaneously waiting for user interaction in its own terminal.

The existing codebase provides strong foundations. The `mow-phase-worker.md` agent already has the messaging protocol (11 message types including `stage_transition` and `input_needed`), failure handling (checkpoint files, error messages, cancel support), and the execute-phase pattern of spawning mow-executor subagents via Task(). The discuss-phase, plan-phase, execute-phase, and refine-phase workflows are all fully implemented as standalone commands. The model profile system (`MODEL_PROFILES` in `mow-tools.cjs`) already maps per-agent models across quality/balanced/budget profiles. The task is primarily integration: wiring these existing workflows into the worker's lifecycle loop with artifact-based resume detection and configurable stage gates.

**Primary recommendation:** Rewrite `agents/mow-phase-worker.md` Steps 2-5 to chain all lifecycle stages, using inline workflow execution for discuss/plan/execute (the orchestrating stages) and Task() only for leaf subagents (mow-phase-researcher, mow-executor, mow-verifier). Add artifact-based resume detection at worker initialization and configurable stage gate support via `worker.stage_gates` config setting.

## Standard Stack

### Core
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| mow-phase-worker.md | `agents/mow-phase-worker.md` | Phase worker agent definition — primary file being rewritten | Existing agent; all lifecycle orchestration happens here |
| mow-tools.cjs | `bin/mow-tools.cjs` | CLI utility for message formatting, status updates, config reads, phase init | Centralized tooling; all message/status/config operations go through this |
| MODEL_PROFILES | `bin/mow-tools.cjs` lines 180-192 | Model routing table (quality/balanced/budget per agent) | Existing profile system; worker uses `resolve-model` per subagent type |
| Agent Teams | Claude Code experimental API | TeamCreate, SendMessage, TaskList, TaskGet, TaskUpdate | Platform for team coordination; workers are teammates with full tool access |

### Supporting
| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| discuss-phase.md | `mowism/workflows/discuss-phase.md` | Full discuss workflow with gray areas, probing, CONTEXT.md creation | Worker runs this inline at the discuss stage |
| plan-phase.md | `mowism/workflows/plan-phase.md` | Research + plan + verify loop orchestration | Worker runs this inline at the plan stage |
| execute-phase.md | `mowism/workflows/execute-phase.md` | Wave-based executor spawning, checkpoint handling | Worker runs this inline at the execute stage |
| refine-phase.md | `mowism/workflows/refine-phase.md` | Tiered quality check chain | Worker delegates this as mow-verifier subagent task at refine stage |
| mow-phase-researcher.md | `agents/mow-phase-researcher.md` | Phase research agent | Spawned as Task() subagent during research stage |
| mow-planner.md | `agents/mow-planner.md` | Phase planning agent | Spawned as Task() subagent during plan stage (via plan-phase workflow) |
| mow-plan-checker.md | `agents/mow-plan-checker.md` | Plan quality verification | Spawned as Task() subagent during plan stage (non-negotiable gate) |
| mow-executor.md | `agents/mow-executor.md` | Plan execution agent | Spawned as Task() subagent during execute stage (per plan) |
| mow-verifier.md | `agents/mow-verifier.md` | Phase goal verification | Spawned as Task() subagent during refine stage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline workflow execution for discuss/plan/execute | Task() subagents for each stage | Subagents cannot resolve `/mow:` skills, cannot relay AskUserQuestion to user terminal; inline keeps worker in control |
| 1 worker per full lifecycle | 2 workers (discuss+plan, execute+refine) | Halves context accumulation but doubles orchestration complexity and worker count; not needed if disk-first pattern is followed |
| Configurable stage gates via config.json | Hardcoded auto-advance | Config approach allows users to tune autonomy per project; matches existing settings workflow pattern |

## Architecture Patterns

### Recommended Changes to Project Structure
```
agents/
├── mow-phase-worker.md     # REWRITE: Full lifecycle orchestration (discuss->refine)
├── mow-team-lead.md        # MINOR UPDATE: Stage gate config awareness
├── mow-executor.md         # NO CHANGE
├── mow-phase-researcher.md # NO CHANGE
├── mow-planner.md          # NO CHANGE
├── mow-plan-checker.md     # NO CHANGE
├── mow-verifier.md         # NO CHANGE

bin/
├── mow-tools.cjs           # ADD: stage_gates config support, artifact detection helpers

mowism/
├── workflows/
│   ├── discuss-phase.md     # MINOR: Guard against auto-advance in multi-agent context
│   ├── plan-phase.md        # NO CHANGE (worker runs this inline)
│   ├── execute-phase.md     # MINOR: Worker-mode detection adjustments
│   └── refine-phase.md      # NO CHANGE (worker delegates to mow-verifier)
```

### Pattern 1: Disk-First Context Passing (CRITICAL)
**What:** Subagents write artifacts to disk and return only compact summaries (file path + 1-2 line description). Workers pass file paths between stages, never file contents.
**When to use:** Every subagent return in the lifecycle chain.
**Why critical:** Without this, a full-lifecycle worker accumulates 100-150k tokens from subagent returns alone, triggering auto-compaction mid-lifecycle and causing the worker to forget discuss decisions during execution.

**Example — Research stage return:**
```
Subagent writes: .planning/phases/15-full-lifecycle-workers/15-RESEARCH.md
Subagent returns: "RESEARCH COMPLETE. Written to .planning/phases/15-full-lifecycle-workers/15-RESEARCH.md. Key finding: [1-2 sentence summary]."
Worker stores: only the file path, NOT the research content
```

**Example — Plan stage return:**
```
Plan-phase creates: .planning/phases/15-full-lifecycle-workers/15-01-PLAN.md, 15-02-PLAN.md, 15-03-PLAN.md
Worker receives: "PLANNING COMPLETE. 3 plans in 2 waves. Files: 15-01-PLAN.md, 15-02-PLAN.md, 15-03-PLAN.md"
Worker stores: plan count, wave count, file names — NOT plan contents
```

### Pattern 2: Inline Workflow Execution for Orchestrating Stages
**What:** Worker reads workflow files directly via @file references and follows the workflow steps inline, rather than delegating the entire workflow to a Task() subagent.
**When to use:** For discuss-phase, plan-phase, and execute-phase — the stages that themselves spawn subagents (researcher, planner, checker, executor).
**Why:** (1) Skills/slash commands do not resolve in Task() subagents. (2) AskUserQuestion in discuss-phase needs to work in the worker's terminal session. (3) The worker IS a full Claude Code session (teammate), so it CAN follow workflows and spawn Task() subagents.

**Example — Worker running discuss-phase inline:**
```
# Worker reads the workflow
# @~/.claude/mowism/workflows/discuss-phase.md

# Worker follows the steps:
# 1. Init phase context
INIT=$(node ~/.claude/mowism/bin/mow-tools.cjs init phase-op "${PHASE}")
# 2. Analyze phase, present gray areas
# 3. Use AskUserQuestion (works because worker is a full session)
# 4. Write CONTEXT.md
# 5. Continue to next stage
```

**Example — Worker running plan-phase inline (spawns subagents):**
```
# Worker follows plan-phase.md steps:
# 1. Spawn mow-phase-researcher via Task()
Task(subagent_type="mow-phase-researcher", model="{researcher_model}", prompt="...")
# 2. Spawn mow-planner via Task()
Task(subagent_type="general-purpose", model="{planner_model}", prompt="Read agents/mow-planner.md...")
# 3. Spawn mow-plan-checker via Task()
Task(subagent_type="mow-plan-checker", model="{checker_model}", prompt="...")
# 4. Handle revision loop if needed
```

### Pattern 3: Artifact-Based Resume Detection
**What:** At initialization, the worker scans the phase directory for existing artifacts to determine which lifecycle stages have already completed. It skips completed stages and resumes from the first incomplete one.
**When to use:** Every worker startup, including fresh starts and resumes after interruption.
**Detection logic:**

```
PHASE_DIR=".planning/phases/{phase_dir}"

# Stage completion detection:
has_context  = exists("$PHASE_DIR/*-CONTEXT.md")     # discuss done
has_research = exists("$PHASE_DIR/*-RESEARCH.md")     # research done
has_plans    = count("$PHASE_DIR/*-PLAN.md") > 0      # plan done
has_summaries = count("$PHASE_DIR/*-SUMMARY.md") ==   # execute done
                count("$PHASE_DIR/*-PLAN.md")
has_verification = exists("$PHASE_DIR/*-VERIFICATION.md") # refine done

# Resume logic:
if !has_context:     start_at = "discuss"
elif !has_research:  start_at = "research"
elif !has_plans:     start_at = "plan"
elif !has_summaries: start_at = "execute"
elif !has_verification: start_at = "refine"
else:                start_at = "complete"  # nothing to do
```

### Pattern 4: Configurable Stage Gates
**What:** A config setting `worker.stage_gates` that controls where workers pause for user review between lifecycle stages.
**When to use:** Workers check this setting at each stage boundary.
**Settings:**

```json
// .planning/config.json
{
  "worker": {
    "stage_gates": "none"        // "none" | "before_execute" | "every_stage"
  }
}
```

**Behavior at stage boundaries:**
```
            none         before_execute    every_stage
discuss:    auto-cont    auto-cont         pause (input_needed)
research:   auto-cont    auto-cont         pause (input_needed)
plan:       auto-cont    pause             pause (input_needed)
execute:    auto-cont    auto-cont         pause (input_needed)
refine:     auto-cont    auto-cont         auto-cont (last stage)
```

When pausing, worker sends `input_needed` message to lead with `input_type: "stage_gate"` and `detail: "Stage gate: awaiting approval to proceed to {next_stage}"`.

### Pattern 5: Dual-Path Notification for Discuss Pause
**What:** When discuss-phase needs user input, the worker both (1) uses AskUserQuestion in its own terminal session and (2) sends an `input_needed` message to the team lead for dashboard visibility.
**When to use:** At the discuss stage, before any AskUserQuestion call.

```
# 1. Notify lead (dashboard shows input needed)
MSG=$(node ~/.claude/mowism/bin/mow-tools.cjs message format input_needed \
  --phase {phase} --input-type discussion_prompt \
  --detail "Phase needs discuss-phase context gathering" \
  --activity "Awaiting user input" --raw)
SendMessage({ type: "message", recipient: "lead", content: MSG,
  summary: "Phase {N} needs user input for discuss" })

# 2. Run discuss workflow inline (AskUserQuestion works in worker terminal)
# ... follow discuss-phase.md steps ...

# 3. After CONTEXT.md created, auto-continue
MSG=$(node ~/.claude/mowism/bin/mow-tools.cjs message format stage_transition \
  --phase {phase} --from-stage discussing --to-stage researching \
  --activity "Transitioning to research" --raw)
SendMessage({ type: "message", recipient: "lead", content: MSG,
  summary: "Phase {N}: discussing -> researching" })
```

### Pattern 6: Model Routing Per Stage
**What:** Workers resolve the appropriate model for each subagent using the existing profile system. No new routing system needed.
**When to use:** Before each Task() spawn.

```
# Existing model resolution via mow-tools.cjs resolve-model:
research_model  = resolve-model("mow-phase-researcher")  # haiku in budget, sonnet in balanced
planner_model   = resolve-model("mow-planner")            # opus in quality/balanced, sonnet in budget
checker_model   = resolve-model("mow-plan-checker")        # sonnet in quality/balanced, haiku in budget
executor_model  = resolve-model("mow-executor")            # opus in quality, sonnet in balanced/budget
verifier_model  = resolve-model("mow-verifier")            # sonnet in quality/balanced, haiku in budget
```

The worker resolves all models once at initialization (like the existing plan-phase workflow does) and uses them throughout.

### Anti-Patterns to Avoid
- **Collecting full artifact contents in worker context:** Never `cat RESEARCH.md` or read full PLAN.md contents into the worker. Pass file paths only. Subagents read their own inputs.
- **Running discuss-phase as a Task() subagent:** AskUserQuestion fails or behaves unpredictably in Task() subagents. Discuss MUST run inline.
- **Using `/mow:` slash commands in Task() prompts:** Slash commands do not resolve in subagents. Use `@file` references or pass workflow content directly.
- **Spawning subagents from subagents:** Strict 3-level hierarchy. mow-executor CANNOT spawn further subagents. If the executor needs nested delegation, that is a design error.
- **Auto-advancing through discuss in multi-agent mode:** Even if `workflow.auto_advance: true` is set, discuss MUST pause for user input. The worker must guard against stale auto-advance config.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message formatting | Custom JSON builders | `mow-tools.cjs message format {type}` | 12 message types with required fields, schema validation, versioning |
| Model resolution | Inline model selection | `mow-tools.cjs resolve-model {agent}` with MODEL_PROFILES table | Profile system already handles quality/balanced/budget routing |
| Phase directory detection | Path string manipulation | `mow-tools.cjs init phase-op {phase}` | Returns phase_dir, has_context, has_research, has_plans, has_verification |
| Status tracking | Direct file writes | `mow-tools.cjs status write/read {phase}` | Handles STATUS.md format, atomic updates, JSON output |
| Config reading | Manual JSON parsing | `mow-tools.cjs config-get {key}` | Handles defaults, missing keys, nested values |
| Artifact detection | Custom `ls` and `grep` | `mow-tools.cjs init phase-op {phase}` | Already returns `has_context`, `has_research`, `has_plans`, `has_verification`, `plan_count` |
| Plan index | Manual plan file parsing | `mow-tools.cjs phase-plan-index {phase}` | Returns plans with waves, completion status, objectives |
| Dashboard events | Custom event logging | `mow-tools.cjs dashboard event add --type {type} --phase {N}` | Centralized event log with auto-pin for input_needed |

**Key insight:** Nearly all infrastructure needed for full-lifecycle workers already exists in `mow-tools.cjs`. The `init phase-op` command alone provides artifact detection (has_context, has_research, has_plans, has_verification), which is the foundation of resume detection. The message protocol (12 event types including `stage_transition` and `input_needed`) is already defined and implemented. The work is integration, not infrastructure.

## Common Pitfalls

### Pitfall 1: Context Accumulation Across 4-5 Subagent Chains
**What goes wrong:** A full-lifecycle worker collecting return values from 4-5 subagent stages accumulates 100-150k tokens, triggering auto-compaction. The worker forgets discuss decisions during execution or produces incoherent refinement.
**Why it happens:** Each Task() return flows into the parent's context window. Discuss (~2k tokens), research (~5k), planning (~15k for 3-4 plans), execution (~8k for summaries), plus worker reasoning (~20k per stage) = ~110-150k total.
**How to avoid:** Disk-first pattern. Subagents write to disk, return only file paths + 1-2 line summaries. Worker never reads full artifacts — passes paths to next-stage subagents. Keep subagent returns under 500 tokens each.
**Warning signs:** Worker re-reads files it already processed (post-compaction confusion), worker references wrong files or outdated decisions, worker takes >30 minutes per phase.

### Pitfall 2: Discuss Phase Bypassed in Autonomous Pipeline
**What goes wrong:** Stale `workflow.auto_advance: true` from a previous session causes discuss-phase to chain to plan-phase without pausing. Or AskUserQuestion fails inside a Task() subagent.
**Why it happens:** Auto-advance config persists in config.json across sessions. If discuss runs as Task() (not inline), AskUserQuestion cannot reach the user.
**How to avoid:** (1) Discuss runs INLINE in the worker, never as Task(). (2) Worker checks `workflow.auto_advance` and ignores it during discuss — discuss ALWAYS pauses. (3) Team lead clears auto_advance at multi-agent session startup.
**Warning signs:** CONTEXT.md created without `input_needed` message in lead's event log; CONTEXT.md has "Claude's Discretion" for every area; discuss completes in <1 minute.

### Pitfall 3: Skills/Slash Commands Not Resolving in Subagents
**What goes wrong:** Worker delegates plan-phase to a Task() subagent with prompt "Run /mow:plan-phase 15". The subagent sees this as plain text, not a command.
**Why it happens:** Slash commands are registered in the main Claude Code session, not inherited by Task() subagents.
**How to avoid:** Workers run orchestrating workflows (discuss, plan, execute) INLINE via @file references. Only leaf operations (mow-executor, mow-verifier, mow-phase-researcher) are delegated as Task() subagents.
**Warning signs:** Subagent output contains "command not found" or tries to manually replicate workflow logic.

### Pitfall 4: Nested Subagent OOM Crash
**What goes wrong:** If plan-phase runs as a Task() subagent, and it tries to spawn its own Task() for mow-planner, the nested spawn crashes with OOM (enforced since v1.0.64).
**Why it happens:** Subagents cannot spawn subagents. Only teammates (full sessions) can use Task().
**How to avoid:** Strict 3-level hierarchy. Worker (Level 1, teammate) runs plan-phase inline. Plan-phase spawns mow-planner as Task() (Level 2). mow-planner is a leaf — no further spawning.
**Warning signs:** OOM errors in subagent logs; worker falls back to doing planning itself instead of spawning planner.

### Pitfall 5: Pause-Work Creates Inconsistent Artifact State
**What goes wrong:** User runs `/mow:pause-work` while execute stage is mid-plan. The pause creates a checkpoint file and stashes changes. On resume, the worker's artifact-based detection sees PLANs exist and SUMMARYs partially exist, but doesn't account for the in-progress plan's stashed work.
**Why it happens:** Artifact-based detection is binary (file exists or not). A plan mid-execution has neither SUMMARY (not yet created) nor stashed changes that the detection can see.
**How to avoid:** (1) The existing CHECKPOINT.md mechanism already handles this — worker checks for CHECKPOINT.md before artifact detection. (2) Pause-work must produce artifacts consistent with what resume detection expects: write checkpoint file in phase directory, update STATUS.md with current plan progress. (3) The execute-phase workflow already handles stash/restore for pause signals.
**Warning signs:** Worker re-executes plans that were partially complete; worker starts from an earlier stage than where it was interrupted.

### Pitfall 6: Stage Gate Config Not Read Before Subagent Spawn
**What goes wrong:** Worker reads `worker.stage_gates` once at init, spawns a long-running executor, and during execution the user changes the setting via `/mow:settings`. The new setting has no effect until the next stage boundary.
**Why it happens:** Config is read at worker init and cached. No hot-reload mechanism.
**How to avoid:** Read `worker.stage_gates` at each stage boundary, not just at init. The `config-get` call is cheap (<10ms). This allows users to change autonomy level mid-lifecycle.
**Warning signs:** User changes stage_gates setting but worker continues without pausing.

## Code Examples

### Worker Lifecycle Loop (Pseudocode)
```
// Source: Derived from existing mow-phase-worker.md structure + v1.2 research

// Step 1: Initialize
INIT = mow-tools init phase-op {phase}
phase_dir = INIT.phase_dir

// Step 2: Artifact-based resume detection
has_context = INIT.has_context
has_research = INIT.has_research
has_plans = INIT.has_plans
summaries = count(phase_dir/*-SUMMARY.md)
plans = INIT.plan_count
has_all_summaries = (plans > 0 AND summaries == plans)
has_verification = INIT.has_verification
has_checkpoint = exists(phase_dir/*-CHECKPOINT.md)

if has_checkpoint:
    // Resume from checkpoint (existing pattern)
    goto resume_from_checkpoint

// Determine start stage
start_stage = detect_start_stage(has_context, has_research, has_plans, has_all_summaries, has_verification)

// Step 3: Resolve models once
researcher_model = resolve-model("mow-phase-researcher")
planner_model = resolve-model("mow-planner")
checker_model = resolve-model("mow-plan-checker")
executor_model = resolve-model("mow-executor")
verifier_model = resolve-model("mow-verifier")

// Step 4: Execute lifecycle from start_stage
stages = ["discuss", "research", "plan", "execute", "refine"]
for stage in stages starting from start_stage:
    // Check stage gate
    gate = config-get("worker.stage_gates") || "none"
    if should_pause(gate, stage):
        send input_needed to lead
        wait for user input

    // Send stage transition
    send stage_transition(from: previous_stage, to: stage)

    // Execute stage (see individual stage patterns below)
    execute_stage(stage)

// Step 5: Phase complete
send phase_complete to lead
update STATUS.md
STAY ALIVE — wait for shutdown signal
```

### Research Stage — Task() Subagent Spawn
```
// Source: Existing pattern from mowism/workflows/plan-phase.md step 5

Task(
  subagent_type="mow-phase-researcher",
  model=researcher_model,
  prompt="First, read agents/mow-phase-researcher.md for your role.\n\n
    <objective>Research Phase {phase}: {name}</objective>
    <phase_context>{context from CONTEXT.md path}</phase_context>
    <additional_context>Phase description: {desc}</additional_context>
    <output>Write to: {phase_dir}/{phase}-RESEARCH.md</output>"
)
// Worker receives: "RESEARCH COMPLETE. Written to {path}."
// Worker stores: path only, NOT content
```

### Plan Stage — Inline Workflow with Subagent Spawns
```
// Source: Worker follows mowism/workflows/plan-phase.md inline

// Worker spawns researcher (if not already done)
// Worker spawns planner
Task(
  subagent_type="general-purpose",
  model=planner_model,
  prompt="First, read agents/mow-planner.md for your role.\n\n
    <planning_context>Phase: {phase}\n
    Read these files at execution start:
    - Context: {phase_dir}/{phase}-CONTEXT.md
    - Research: {phase_dir}/{phase}-RESEARCH.md
    - State: .planning/STATE.md
    - Roadmap: .planning/ROADMAP.md
    </planning_context>"
)

// Worker spawns plan-checker (non-negotiable gate)
Task(
  subagent_type="mow-plan-checker",
  model=checker_model,
  prompt="Verify plans for Phase {phase}.\n
    Read: {phase_dir}/*-PLAN.md"
)

// Handle revision loop (max 3 iterations, same as plan-phase.md)
```

### Execute Stage — Inline Workflow with Per-Plan Executors
```
// Source: Existing pattern from mow-phase-worker.md Step 4

PLAN_INDEX = mow-tools phase-plan-index {phase}
for each wave in PLAN_INDEX.waves:
    for each plan in wave:
        send task_claimed to lead
        Task(
          subagent_type="mow-executor",
          model=executor_model,
          prompt="Execute plan {plan_id} of phase {phase}.
            Read: {phase_dir}/{plan_file}
            Follow: workflows/execute-plan.md
            Skip STATE.md/ROADMAP.md updates (lead handles after merge)."
        )
        // Spot-check SUMMARY.md exists, send task_complete
    // Wait for all in wave before next wave
```

### Discuss Stage — Inline with Dual-Path Notification
```
// Source: Existing mow-phase-worker.md Step 2 + discuss-phase.md workflow

// 1. Notify lead
MSG=$(mow-tools message format input_needed --phase {phase}
  --input-type discussion_prompt
  --detail "Phase needs discuss-phase context gathering"
  --activity "Awaiting user input" --raw)
SendMessage(lead, MSG, "Phase {N} needs user input for discuss")

// 2. Run discuss workflow inline
// Follow mowism/workflows/discuss-phase.md steps:
//   - analyze_phase
//   - present_gray_areas (AskUserQuestion works in worker terminal)
//   - discuss_areas
//   - write_context (creates CONTEXT.md)

// 3. Auto-continue after CONTEXT.md created
MSG=$(mow-tools message format stage_transition
  --phase {phase} --from-stage discussing --to-stage researching
  --activity "Transitioning to research" --raw)
SendMessage(lead, MSG, "Phase {N}: discussing -> researching")
```

## State of the Art

| Old Approach (v1.1) | New Approach (v1.2 Phase 15) | When Changed | Impact |
|---------------------|------------------------------|--------------|--------|
| Worker runs only execute (Steps 2-5: context+plan+execute+complete) | Worker runs full lifecycle (discuss+research+plan+execute+refine) | Phase 15 | Workers become autonomous per-phase orchestrators |
| Discuss/plan/research are separate user-initiated commands | Worker chains all stages automatically after discuss pause | Phase 15 | Single spawn handles entire phase lifecycle |
| No resume detection — re-run re-executes everything | Artifact-based resume — skip completed stages | Phase 15 | Safe crash recovery and session resumption |
| Fixed autonomy — worker always auto-advances | Configurable stage gates (none/before_execute/every_stage) | Phase 15 | Users control review frequency per project |
| No stage visibility on dashboard | Stage transition messages show discuss/research/plan/execute/refine | Phase 15 | Lead and user see exactly where each worker is |

**Deprecated/outdated:**
- The current mow-phase-worker.md Step 2 (context gathering) and Step 3 (planning) are placeholder-thin orchestrations that assume the user has already run `/mow:discuss-phase` and `/mow:plan-phase` separately. Phase 15 replaces these with full inline workflow execution.

## Open Questions

1. **Whether to skip discuss for trivial phases (Claude's Discretion)**
   - What we know: Some phases are pure infrastructure with no user-facing decisions (e.g., "fix 9 bugs"). Running full discuss workflow wastes time.
   - What's unclear: What heuristic determines "trivial"? Phase description keywords? Roadmap annotation? Worker judgment?
   - Recommendation: Let the worker check if the phase has a `discuss: skip` annotation in ROADMAP.md (set by roadmapper). If absent, always run discuss. If the worker judges the phase is trivial, it can generate a minimal CONTEXT.md with "Claude's Discretion" for all areas, but still send `input_needed` to let the user confirm or override. This preserves the HARD CONSTRAINT while reducing friction.

2. **Intermediate artifact reporting verbosity (Claude's Discretion)**
   - What we know: Stage transitions are already sent. Sub-progress (e.g., "executing plan 2/5") is available from the execution loop.
   - What's unclear: Should the worker also report key artifacts (e.g., "RESEARCH.md created, 3 domains investigated") or just stage transitions?
   - Recommendation: Report stage transitions with a single-line artifact summary. Example: `stage_transition: researching -> planning. Research covered 3 domains, HIGH confidence.` This adds ~20 tokens per message — negligible cost, high visibility value. Do NOT report full artifact contents.

3. **Failure handling retry details (Claude's Discretion)**
   - What we know: Existing executor has configurable retry limits from Phase 13. Plan-phase has a 3-iteration revision loop.
   - What's unclear: Should the worker retry a failed research subagent? How many times? Should it fall back to an earlier stage?
   - Recommendation: Research/plan failures get 1 retry at the same stage. If retry fails, worker sends `error` to lead and writes checkpoint. Execution failures follow existing executor retry limits. Stage fallback (e.g., re-research after plan failure) should NOT be automatic — send `error` with context and let the user decide. The complexity of automated fallback is not worth the marginal benefit.

4. **Refine stage scope (runs by default, configurable)**
   - What we know: CONTEXT.md says refine is configurable — runs by default, can be disabled for speed.
   - What's unclear: What config key? Just `workflow.verifier: false` from existing config, or a new `worker.skip_refine` key?
   - Recommendation: Reuse existing `workflow.verifier` config flag (already in `.planning/config.json`). If `false`, skip refine stage. This avoids adding new config keys and reuses the existing settings workflow.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-01 | Phase worker chains discuss -> research -> plan -> execute -> refine via sequential Task() subagent calls | Architecture Pattern 2 (inline workflow execution for orchestrating stages) + Pattern 1 (disk-first context passing). Worker runs discuss/plan/execute inline, delegates research/execution/verification via Task(). Sequential chaining achieved by worker's lifecycle loop. |
| WORK-02 | Discuss-phase ALWAYS pauses for user input via `input_needed` message before continuing | Architecture Pattern 5 (dual-path notification). Discuss runs inline in worker terminal (not Task()). Worker sends `input_needed` to lead AND uses AskUserQuestion in its own session. Never bypassed by auto-advance config. |
| WORK-03 | Context between lifecycle stages passed via file paths, not file contents (prevent context bloat) | Architecture Pattern 1 (disk-first context passing). Subagents write to disk, return file paths + 1-2 line summaries. Worker stores paths only, passes them to next-stage subagents. Keeps subagent returns under 500 tokens. |
| WORK-04 | Worker detects existing stage artifacts (CONTEXT.md, PLANs, SUMMARYs) and resumes from correct point | Architecture Pattern 3 (artifact-based resume detection). `mow-tools.cjs init phase-op` already returns `has_context`, `has_research`, `has_plans`, `has_verification`, `plan_count`. Worker compares PLAN count vs SUMMARY count for execute stage completeness. CHECKPOINT.md checked first for crash recovery. |
| WORK-05 | Workers spawn specialized subagents (mow-phase-researcher, mow-planner, mow-executor, mow-verifier) via Task() | Standard Stack table confirms all agent definitions exist. Code Examples show exact Task() spawn patterns for each. 3-level hierarchy enforced: worker spawns subagents, subagents do NOT spawn further. |
| WORK-06 | Workers send `stage_transition` messages as they move between lifecycle stages | Existing message protocol in `mow-tools.cjs` already defines `stage_transition` event type with required fields `[phase, from_stage, to_stage]`. Worker sends at each stage boundary. Dashboard `event add` and `render` already support displaying these. |
| WORK-07 | Model routing per stage: Haiku for research, default for planning, executor_model for execution, verifier_model for refinement | Architecture Pattern 6 (model routing per stage). Existing `MODEL_PROFILES` table in `mow-tools.cjs` already maps per-agent models. Worker resolves once at init via `resolve-model` for each subagent type. No new routing system needed. |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- `agents/mow-phase-worker.md` — Current worker agent definition; base for rewrite
- `agents/mow-team-lead.md` — Lead orchestrator showing multi-phase flow and message handling
- `agents/mow-executor.md` — Executor agent showing Task() spawn pattern from worker
- `agents/mow-phase-researcher.md` — Researcher agent definition (spawned as Task() subagent)
- `agents/mow-planner.md` — Planner agent definition with goal-backward methodology
- `agents/mow-verifier.md` — Verifier agent definition (refine stage delegate)
- `agents/mow-plan-checker.md` — Plan checker agent (non-negotiable quality gate)
- `mowism/workflows/discuss-phase.md` — Full discuss workflow with gray areas, probing, CONTEXT.md creation
- `mowism/workflows/plan-phase.md` — Research + plan + verify loop orchestration
- `mowism/workflows/execute-phase.md` — Wave-based executor spawning, checkpoint handling
- `mowism/workflows/refine-phase.md` — Tiered quality check chain
- `mowism/workflows/pause-work.md` — Pause/resume with .continue-here.md
- `bin/mow-tools.cjs` — CLI utility (MODEL_PROFILES, message protocol, init commands, config)
- `.planning/research/v1.2-SUMMARY.md` — v1.2 milestone research with Phase 15 analysis
- `.planning/research/v1.2-NESTED-DELEGATION.md` — 3-level hierarchy constraints, OOM behavior
- `.planning/research/PITFALLS.md` — 14 pitfalls with detection signals and prevention strategies

### Secondary (MEDIUM confidence)
- `.claude/hooks/mow-worktree-create.sh` — WorktreeCreate hook showing phase naming convention
- `.claude/settings.json` — Hook registration pattern
- `.config/wt.toml` — Legacy WorkTrunk config (still present, may need cleanup)
- `mowism/references/model-profiles.md` — Model profile documentation
- `mowism/references/model-profile-resolution.md` — Resolution logic for orchestrators

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components are existing Mowism files read directly from the codebase
- Architecture: HIGH — patterns derived from existing working code (executor spawn pattern, message protocol, plan-phase inline orchestration) plus v1.2 research validation
- Pitfalls: HIGH — grounded in v1.2 PITFALLS.md research, nested delegation research, and codebase analysis of actual Task()/subagent behavior
- Resume detection: HIGH — `mow-tools.cjs init phase-op` already returns artifact detection fields; resume logic is straightforward conditional branching
- Stage gates: MEDIUM — new config key `worker.stage_gates` needs implementation in mow-tools.cjs; pattern is clear but not yet validated

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days — stable internal codebase, no external dependencies)
