<purpose>
Execute all plans in a phase using wave-based parallel execution. Orchestrator stays lean — delegates plan execution to subagents.
</purpose>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full execute-plan context. Orchestrator: discover plans → analyze deps → group waves → spawn agents → handle checkpoints → collect results.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load all context in one call:

```bash
INIT=$(node ~/.claude/mowism/bin/mow-tools.cjs init execute-phase "${PHASE_ARG}")
```

Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`, `agent_teams_enabled`, `agent_teams_nudge_dismissed`.

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found in phase.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.

**Claim this phase for the current worktree:**
```bash
# Claim phase — prevents other worktrees from executing the same phase
node ~/.claude/mowism/bin/mow-tools.cjs worktree claim "${PHASE_NUMBER}"
```
This happens AFTER phase validation (no point claiming a phase that does not exist). If the claim fails (phase already claimed by another worktree), the error message from mow-tools.cjs will halt execution with a clear message.
</step>

<step name="agent_teams_nudge">
**After worktree claim**, check Agent Teams status from the init JSON.

**If Agent Teams IS enabled (`agent_teams_enabled: true`):** No nudge needed. The lead orchestrator handles team setup separately when invoked via `/mow:new-project` or `/mow:resume-work`. Continue to handle_branching.

**If Agent Teams is NOT enabled (`agent_teams_enabled: false`):**

Count plans and waves from init JSON (`plan_count`, and derive wave count from plan frontmatter).

- **If not dismissed (`agent_teams_nudge_dismissed: false`):** Show prominent nudge:

  ```
  ---
  ## Agent Teams: Parallel Execution

  This phase has {N} plans across {M} waves. With Agent Teams,
  these plans could execute in parallel across worktrees.

  **To enable Agent Teams:**

  Option A (shell):
    export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

  Option B (settings.json):
    Add to ~/.claude/settings.json:
    { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }

  Then restart Claude Code.

  > Type "don't remind me" to dismiss for this project.
  ---
  ```

  - If user says "don't remind me":
    ```bash
    node ~/.claude/mowism/bin/mow-tools.cjs config nudge-dismiss
    ```
  - Otherwise: continue to handle_branching.

- **If dismissed (`agent_teams_nudge_dismissed: true`):** Show lighter tooltip only:

  ```
  Tip: Agent Teams can execute this phase's {N} plans in parallel.
  Enable: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  ```

  Continue to handle_branching.

**Per locked decisions:**
- Prominent nudge at /mow:execute-phase (key moment)
- Lighter tooltips between phases when nudge is dismissed
- Persistent per-project dismiss via mow-tools.cjs
</step>

<step name="multi_phase_check">
**Check for multi-phase invocation context:**

Multi-phase mode is triggered when:
1. The `$ARGUMENTS` contain `--multi-phase` flag, OR
2. The invocation comes from a phase worker (detected by STATUS.md existence AND the current worktree being in `.claude/worktrees/`)

**If multi-phase mode AND this is the main worktree (not a phase worker):**
- This means the user wants to execute multiple phases in parallel
- Delegate to the team lead orchestrator rather than running plans directly:
  ```
  Read and follow agents/mow-team-lead.md multi_phase_flow
  Present DAG analysis, let user select phases, spawn workers.
  ```
  After the team lead completes (all workers done + close-shop), return to offer_next.

**If this is a phase worker's worktree (.claude/worktrees/phase-NN):**
- This is a normal single-phase execution inside a worktree
- Continue with the standard execute_waves flow
- But use the multi-agent state protocol (STATUS.md writes, skip STATE.md)
- The `multi_agent_detection` in init_context already handles this via STATUS.md existence

**If neither multi-phase flag nor worker worktree:**
- Standard single-phase execution (existing behavior, unchanged)
- Continue to handle_branching
</step>

<step name="handle_branching">
Check `branching_strategy` from init:

**"none":** Skip, continue on current branch.

**"phase" or "milestone":** Use pre-computed `branch_name` from init:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

All subsequent commits go to this branch. User handles merging.
</step>

<step name="validate_phase">
From init JSON: `phase_dir`, `plan_count`, `incomplete_count`.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"
</step>

<step name="discover_and_group_plans">
Load plan inventory with wave grouping in one call:

```bash
PLAN_INDEX=$(node ~/.claude/mowism/bin/mow-tools.cjs phase-plan-index "${PHASE_NUMBER}")
```

Parse JSON for: `phase`, `plans[]` (each with `id`, `wave`, `autonomous`, `objective`, `files_modified`, `task_count`, `has_summary`), `waves` (map of wave number → plan IDs), `incomplete`, `has_checkpoints`.

**Filtering:** Skip plans where `has_summary: true`. If `--gaps-only`: also skip non-gap_closure plans. If all filtered: "No matching incomplete plans" → exit.

Report:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} plans across {wave_count} waves

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives, 3-8 words} |
| 2 | 01-03 | ... |
```
</step>

<step name="execute_waves">
Execute each wave in sequence. Within a wave: parallel if `PARALLELIZATION=true`, sequential if `false`.

**For each wave:**

1. **Describe what's being built (BEFORE spawning):**

   Read each plan's `<objective>`. Extract what's being built and why.

   ```
   ---
   ## Wave {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, technical approach, why it matters}

   Spawning {count} agent(s)...
   ---
   ```

   - Bad: "Executing terrain generation plan"
   - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

2. **Spawn executor agents:**

   Pass paths only — executors read files themselves with their fresh 200k context.
   This keeps orchestrator context lean (~10-15%).

   **Update worktree plan progress before spawning each plan's agent:**
   ```bash
   # Update worktree claim with current plan progress
   node ~/.claude/mowism/bin/mow-tools.cjs worktree update-plan "${PHASE_NUMBER}" "${PLAN_ID}"
   ```
   This updates the "Plan" column in the Worktree Assignments table as execution advances through plans, so `/mow:progress` and `/mow:worktree-status` show the current plan.

   ```
   Task(
     subagent_type="mow-executor",
     model="{executor_model}",
     prompt="
       <objective>
       Execute plan {plan_number} of phase {phase_number}-{phase_name}.
       Commit each task atomically. Create SUMMARY.md. Update STATE.md and ROADMAP.md.
       </objective>

       <execution_context>
       @~/.claude/mowism/workflows/execute-plan.md
       @~/.claude/mowism/templates/summary.md
       @~/.claude/mowism/references/checkpoints.md
       @~/.claude/mowism/references/tdd.md
       </execution_context>

       <files_to_read>
       Read these files at execution start using the Read tool:
       - Plan: {phase_dir}/{plan_file}
       - State: .planning/STATE.md
       - Config: .planning/config.json (if exists)
       </files_to_read>

       <success_criteria>
       - [ ] All tasks executed
       - [ ] Each task committed individually
       - [ ] SUMMARY.md created in plan directory
       - [ ] STATE.md updated with position and decisions
       - [ ] ROADMAP.md updated with plan progress (via `roadmap update-plan-progress`)
       </success_criteria>
     "
   )
   ```

3. **Wait for all agents in wave to complete.**

4. **Report completion — spot-check claims first:**

   For each SUMMARY.md:
   - Verify first 2 files from `key-files.created` exist on disk
   - Check `git log --oneline --all --grep="{phase}-{plan}"` returns ≥1 commit
   - Check for `## Self-Check: FAILED` marker

   If ANY spot-check fails: report which plan failed, route to failure handler — ask "Retry plan?" or "Continue with remaining waves?"

   If pass:
   ```
   ---
   ## Wave {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from SUMMARY.md}
   {Notable deviations, if any}

   {If more waves: what this enables for next wave}
   ---
   ```

   - Bad: "Wave 2 complete. Proceeding to Wave 3."
   - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Wave 3) can now reference ground surfaces."

5. **Handle failures:**

   **Known Claude Code bug (classifyHandoffIfNeeded):** If an agent reports "failed" with error containing `classifyHandoffIfNeeded is not defined`, this is a Claude Code runtime bug — not a MOW or agent issue. The error fires in the completion handler AFTER all tool calls finish. In this case: run the same spot-checks as step 4 (SUMMARY.md exists, git commits present, no Self-Check: FAILED). If spot-checks PASS → treat as **successful**. If spot-checks FAIL → treat as real failure below.

   For real failures: report which plan failed → ask "Continue?" or "Stop?" → if continue, dependent plans may also fail. If stop, partial completion report.

6. **Execute checkpoint plans between waves** — see `<checkpoint_handling>`.

7. **Proceed to next wave.**

**Pause-work signal support:**

If the worker receives a pause signal (from lead or user), it:
1. Finishes the current executor subagent (waits for it to complete or saves its state)
2. Updates STATUS.md with current progress
3. Stashes any uncommitted changes: `git stash push -m "mow-pause: phase {X} plan {Y}"`
4. Writes checkpoint file: `node ~/.claude/mowism/bin/mow-tools.cjs template fill checkpoint --phase {X} --plan {Y} --reason "pause-signal"`
5. Exits cleanly
</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Auto-mode checkpoint handling:**

Read auto-advance config:
```bash
AUTO_CFG=$(node ~/.claude/mowism/bin/mow-tools.cjs config-get workflow.auto_advance 2>/dev/null || echo "false")
```

When executor returns a checkpoint AND `AUTO_CFG` is `"true"`:
- **human-verify** → Auto-spawn continuation agent with `{user_response}` = `"approved"`. Log `⚡ Auto-approved checkpoint`.
- **decision** → Auto-spawn continuation agent with `{user_response}` = first option from checkpoint details. Log `⚡ Auto-selected: [option]`.
- **human-action** → Present to user (existing behavior below). Auth gates cannot be automated.

**Standard flow (not auto-mode, or human-action type):**

1. Spawn agent for checkpoint plan
2. Agent runs until checkpoint task or auth gate → returns structured state
3. Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
4. **Present to user:**
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details from agent return]
   [Awaiting section from agent return]
   ```
5. User responds: "approved"/"done" | issue description | decision selection
6. **Spawn continuation agent (NOT resume)** using continuation-prompt.md template:
   - `{completed_tasks_table}`: From checkpoint return
   - `{resume_task_number}` + `{resume_task_name}`: Current task
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type
7. Continuation agent verifies previous commits, continues from resume point
8. Repeat until plan completes or user stops

**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.

**Checkpoints in parallel waves:** Agent pauses and returns while other parallel agents may complete. Present checkpoint, spawn continuation, wait for all before next wave.
</step>

<step name="aggregate_results">
After all waves:

```markdown
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |

### Plan Details
1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]

### Issues Encountered
[Aggregate from SUMMARYs, or "None"]
```
</step>

<step name="close_parent_artifacts">
**For decimal/polish phases only (X.Y pattern):** Close the feedback loop by resolving parent UAT and debug artifacts.

**Skip if** phase number has no decimal (e.g., `3`, `04`) — only applies to gap-closure phases like `4.1`, `03.1`.

**1. Detect decimal phase and derive parent:**
```bash
# Check if phase_number contains a decimal
if [[ "$PHASE_NUMBER" == *.* ]]; then
  PARENT_PHASE="${PHASE_NUMBER%%.*}"
fi
```

**2. Find parent UAT file:**
```bash
PARENT_INFO=$(node ~/.claude/mowism/bin/mow-tools.cjs find-phase "${PARENT_PHASE}" --raw)
# Extract directory from PARENT_INFO JSON, then find UAT file in that directory
```

**If no parent UAT found:** Skip this step (gap-closure may have been triggered by VERIFICATION.md instead).

**3. Update UAT gap statuses:**

Read the parent UAT file's `## Gaps` section. For each gap entry with `status: failed`:
- Update to `status: resolved`

**4. Update UAT frontmatter:**

If all gaps now have `status: resolved`:
- Update frontmatter `status: diagnosed` → `status: resolved`
- Update frontmatter `updated:` timestamp

**5. Resolve referenced debug sessions:**

For each gap that has a `debug_session:` field:
- Read the debug session file
- Update frontmatter `status:` → `resolved`
- Update frontmatter `updated:` timestamp
- Move to resolved directory:
```bash
mkdir -p .planning/debug/resolved
mv .planning/debug/{slug}.md .planning/debug/resolved/
```

**6. Commit updated artifacts:**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs(phase-${PARENT_PHASE}): resolve UAT gaps and debug sessions after ${PHASE_NUMBER} gap closure" --files .planning/phases/*${PARENT_PHASE}*/*-UAT.md .planning/debug/resolved/*.md
```
</step>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.

```bash
PHASE_REQ_IDS=$(node ~/.claude/mowism/bin/mow-tools.cjs roadmap get-phase "${PHASE_NUMBER}" | jq -r '.section' | grep -i "Requirements:" | sed 's/.*Requirements:\*\*\s*//' | sed 's/[\[\]]//g')
```

```
Task(
  prompt="Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Phase requirement IDs: {phase_req_ids}
Check must_haves against actual codebase.
Cross-reference requirement IDs from PLAN frontmatter against REQUIREMENTS.md — every ID MUST be accounted for.
Create VERIFICATION.md.",
  subagent_type="mow-verifier",
  model="{verifier_model}"
)
```

Read status:
```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

| Status | Action |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/mow:plan-phase {phase} --gaps` |

**If human_needed:**
```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

"approved" → continue | Report issues → gap closure
```

**If gaps_found:**
```
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase_num}-VERIFICATION.md

### What's Missing
{Gap summaries from VERIFICATION.md}

---
## ▶ Next Up

`/mow:plan-phase {X} --gaps`

<sub>`/clear` first → fresh context window</sub>

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/mow:verify-work {X}` — manual testing first
```

Gap closure cycle: `/mow:plan-phase {X} --gaps` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/mow:execute-phase {X} --gaps-only` → verifier re-runs.
</step>

<step name="update_roadmap">
**If executing inside a phase worktree (.claude/worktrees/phase-NN):**
Skip ROADMAP.md and REQUIREMENTS.md updates. The lead handles these after merging
the phase branch. Only commit the VERIFICATION.md and phase-specific files:
```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs(phase-{X}): complete phase execution" --files .planning/phases/{phase_dir}/*-VERIFICATION.md .planning/phases/{phase_dir}/*-STATUS.md
```
Then skip to offer_next.

**Standard (main worktree) flow -- mark phase complete and update all tracking files:**

```bash
COMPLETION=$(node ~/.claude/mowism/bin/mow-tools.cjs phase complete "${PHASE_NUMBER}")
```

The CLI handles:
- Marking phase checkbox `[x]` with completion date
- Updating Progress table (Status → Complete, date)
- Updating plan count to final
- Advancing STATE.md to next phase
- Updating REQUIREMENTS.md traceability

Extract from result: `next_phase`, `next_phase_name`, `is_last_phase`.

**Release worktree claim after successful completion:**
```bash
# Release worktree claim — allows other worktrees to claim this phase if needed
node ~/.claude/mowism/bin/mow-tools.cjs worktree release "${PHASE_NUMBER}"
```
Per locked decision: auto-release claims when phase execution completes successfully.

```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/phases/{phase_dir}/*-VERIFICATION.md
```
</step>

<step name="offer_next">

**If executing inside a phase worktree (.claude/worktrees/phase-NN):**
Skip roadmap update, skip auto-advance, skip transition. The phase worker agent handles
phase-complete signaling. Return control to the phase worker.

**Exception:** If `gaps_found`, the `verify_phase_goal` step already presents the gap-closure path (`/mow:plan-phase {X} --gaps`). No additional routing needed — skip auto-advance.

**Quality gate suggestion (only when verification passed, not if gaps_found):**
```
---
**Quality gate available:**
`/mow:refine-phase {phase_number}` -- run automated quality checks before verify-work

<sub>`/clear` first -- fresh context window</sub>
---
```

**Auto-advance detection:**

1. Parse `--auto` flag from $ARGUMENTS
2. Read `workflow.auto_advance` from config:
   ```bash
   AUTO_CFG=$(node ~/.claude/mowism/bin/mow-tools.cjs config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CFG` is true (AND verification passed with no gaps):**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → TRANSITION             ║
║  Phase {X} verified, continuing chain    ║
╚══════════════════════════════════════════╝
```

Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context):

Read and follow `~/.claude/mowism/workflows/transition.md`, passing through the `--auto` flag so it propagates to the next phase invocation.

**If neither `--auto` nor `AUTO_CFG` is true:**

The workflow ends. The user runs `/mow:progress` or invokes the transition workflow manually.
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context. Subagents: fresh 200k each. No polling (Task blocks). No context bleed.
</context_efficiency>

<failure_handling>
- **classifyHandoffIfNeeded false failure:** Agent reports "failed" but error is `classifyHandoffIfNeeded is not defined` → Claude Code bug, not MOW. Spot-check (SUMMARY exists, commits present) → if pass, treat as success
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **Dependency chain breaks:** Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip
- **All agents in wave fail:** Systemic issue → stop, report for investigation
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
- **Phase claim on failure:** If execution stops mid-phase (user chooses "Stop"), the worktree claim is NOT auto-released. The user can re-run `/mow:execute-phase` to resume, and the existing claim will be preserved. To manually release: edit STATE.md or the stale cleanup will handle it if the worktree is removed.
</failure_handling>

<resumption>
Re-run `/mow:execute-phase {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>
