# Auto-Advance Pipeline Workflow

<!-- AUTO-06 (optional phase range arguments) deferred per locked discuss-phase decision:
     "/mow:auto takes no arguments -- always starts from first incomplete phase."
     Phase range support can be added as optional arguments in a future iteration
     without breaking the no-argument default. -->

<purpose>
Drive the entire milestone from first incomplete phase to completion. Sets workflow.auto_advance, delegates to team lead for DAG-driven multi-phase orchestration, handles resume on re-run, milestone boundary cleanup, and context window awareness.

The orchestrator stays lean -- minimal output, phase start/end banners, transition announcements. Workers handle per-phase lifecycle autonomously in their own terminals.
</purpose>

<process>

<step name="initialize">
## Step 1: Initialize

Run the auto-advance init command and parse the result:

```bash
INIT=$(node ~/.claude/mowism/bin/mow-tools.cjs init auto --raw)
```

Extract from the JSON:
- `auto_advance_active` -- whether the flag was already set (possible resume)
- `dag` -- full DAG with phases, waves, ready, blocked, completed
- `milestone_version`, `milestone_name` -- current milestone identity
- `milestone_phases` -- all phase numbers in the current milestone
- `completed_count`, `remaining_count`, `total_phase_count` -- milestone progress
- `first_ready_phase` -- next phase to execute
- `agent_teams_enabled` -- whether Agent Teams is available
- `commit_docs` -- whether to commit planning docs

**If `remaining_count` is 0:**
Display: "Milestone complete! All {total_phase_count} phases done."
Suggest: "Run `/mow:complete-milestone {milestone_version}` to archive."
**Exit -- nothing to do.**
</step>

<step name="resume_detection">
## Step 2: Resume Detection

Per locked decision: "On re-run, detect completed phases and show what's done/next, then confirm before proceeding."

**If `completed_count` > 0:**

Show completed phases with names:
```
Phases already complete:
  Phase {N}: {name}  (complete)
  Phase {N}: {name}  (complete)
  ...
```

Show next target:
```
Next: Phase {first_ready_phase} -- {name}
```

If `auto_advance_active` is true:
```
Note: Auto-advance was previously active (possibly from interrupted session).
```

Ask the user: "Continue from Phase {first_ready_phase}? (y/n)"

If the user says no:
```
Auto-advance cancelled. Flag left unchanged.
```
**Exit.**

**If `completed_count` is 0:**

Show fresh start overview:
```
Starting auto-advance from Phase {first_ready_phase} through milestone end.
{remaining_count} phases remaining.
DAG order: {wave summary from dag.waves}
Discuss gates will pause for your input at each phase.
```

Check which phases have existing CONTEXT.md (via `dag.phases[].disk_status` or file check):
- If any phases have CONTEXT.md: "Phases with existing context will skip discuss: {list}"
</step>

<step name="set_auto_advance">
## Step 3: Set Auto-Advance Flag

```bash
node ~/.claude/mowism/bin/mow-tools.cjs config-set workflow.auto_advance true
```

This persistent flag is read by individual workflows (discuss-phase, plan-phase, execute-phase, transition) to chain to the next step automatically.
</step>

<step name="check_agent_teams">
## Step 4: Check Agent Teams Availability

**If `agent_teams_enabled` is true:**
Proceed to `team_lead_delegation` (multi-phase DAG-parallel mode).

**If `agent_teams_enabled` is false:**
Proceed to `sequential_fallback` (single-session sequential mode using existing --auto chain).
</step>

<step name="team_lead_delegation">
## Step 5A: Team Lead Delegation (Agent Teams Mode)

Per research: "The team lead already has battle-tested DAG orchestration." Delegate ALL remaining phases.

Read and follow `agents/mow-team-lead.md` `multi_phase_flow` with ALL remaining phases from the DAG ready/blocked list.

The team lead handles:
- DAG analysis and phase selection (auto-select ALL remaining phases)
- Worktree creation for ready phases
- Worker spawning (each worker runs full lifecycle: discuss -> research -> plan -> execute -> refine)
- Phase completion, merging, downstream unblocking
- Worker discuss gates (workers send `input_needed`, user interacts in worker terminal)

**Key differences from manual team lead invocation:**
- Skip the "present phase selection to user" step -- auto-advance runs ALL remaining phases
- Skip user confirmation for phase selection -- already confirmed in `resume_detection`
- The team lead still presents DAG structure for visibility

**After each `phase_complete` event,** the team lead:
1. Merges the phase branch
2. Checks if this was the last phase in the milestone (`is_last_phase` from `cmdPhaseComplete`)
3. If last phase: proceed to `milestone_boundary` step
4. If not last: unblock downstream phases, spawn workers (standard `multi_phase_flow` behavior)
</step>

<step name="sequential_fallback">
## Step 5B: Sequential Fallback (No Agent Teams)

If Agent Teams is not enabled, use single-session sequential auto-advance:

For each incomplete phase in DAG order:
1. Check if CONTEXT.md exists for this phase
2. If no CONTEXT.md: follow `discuss-phase.md` with `--auto` flag
   - This STILL pauses for user input per the hard constraint
3. Follow `plan-phase.md` with `--auto` flag (chains to execute)
4. Follow `execute-phase.md` with `--auto` flag (chains to transition)
5. Follow `transition.md` with `--auto` flag (chains to next phase)

This is the EXISTING auto-advance chain. `/mow:auto` just sets the flag and starts the chain from the first incomplete phase.

After each phase completes: check if this was the last phase. If so, proceed to `milestone_boundary`.
</step>

<step name="context_window_awareness">
## Context Window Awareness

Per locked decision: "When the orchestrator's context gets low, save progress to STATE.md and instruct the user to /clear and re-run /mow:auto."

**After each phase completion event,** assess context health:
- **Phase count heuristic:** If 4+ phases have completed in this session, warn proactively
- **Self-assessment:** If losing track of earlier phases or context feels constrained, save immediately

**When saving:**
1. Ensure STATE.md reflects latest completed phase (cmdPhaseComplete already handles this)
2. Display:
```
---
CONTEXT WINDOW LOW -- Save Point

Progress saved to STATE.md. Completed phases: {list}

Please run: /clear
Then re-run: /mow:auto

The pipeline will detect completed phases and resume from Phase {next}.
---
```
3. The `workflow.auto_advance` flag stays `true` intentionally for resume
</step>

<step name="verification_failure">
## Verification Failure Handling

Per locked decision: "When a phase fails verification: pause the pipeline and alert the user with what failed."

If a phase worker reports verification failure (`gaps_found`):
1. Show which phase failed and the gap summary
2. Display:
```
Pipeline paused. Phase {N} needs gap closure.

Options:
  1. Fix gaps: /mow:plan-phase {N} --gaps then /mow:execute-phase {N} --gaps-only
  2. Skip verification: Mark phase complete manually
  3. Abort pipeline: Run /mow:auto again after fixing
```
3. Do NOT auto-retry per locked decision
</step>

<step name="milestone_boundary">
## Milestone Boundary

Per locked decision: "Auto-advance stops at milestone boundary, clears workflow.auto_advance config, and shows summary report."

**1. Clear auto-advance flag:**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs config-set workflow.auto_advance false
```

**2. Show milestone summary report:**

Re-run init to get final state:
```bash
FINAL=$(node ~/.claude/mowism/bin/mow-tools.cjs init auto --raw)
```

Display:
```
---
AUTO-ADVANCE PIPELINE COMPLETE

Milestone: {milestone_version} {milestone_name}

Phases completed: {count} ({phase list with names})
Total plans executed: {sum of plan counts across phases}

Phase Summary:
  Phase {N}: {name}  -- {plan_count} plans
  Phase {N}: {name}  -- {plan_count} plans
  ...

Auto-advance flag cleared.

Next: /mow:complete-milestone {milestone_version}
---
```

**3. Suggest** `/mow:complete-milestone` for archival.
</step>

</process>

<stale_flag_detection>
## Stale Flag Detection

If `workflow.auto_advance` is true but this is NOT a `/mow:auto` invocation (e.g., user ran `/mow:execute-phase` directly):
- Other workflows already read this flag and act on it
- The `resume_detection` step in `/mow:auto` handles re-entry
- `transition.md` Route B already clears at milestone boundary

Per Pitfall 2 from research: the flag persists intentionally for resume. It is only stale if the user has moved to a different milestone without clearing it.
</stale_flag_detection>

<success_criteria>
## Success Criteria

- `/mow:auto` sets `workflow.auto_advance` and starts pipeline from first incomplete phase
- Re-run detects completed phases and resumes correctly
- Delegates to team lead for DAG-driven execution (or sequential fallback)
- Milestone boundary clears flag and shows summary
- Context window awareness saves state proactively
- Verification failure pauses pipeline without auto-retry
- Discuss-phase gates are NEVER bypassed (hard constraint)
</success_criteria>
