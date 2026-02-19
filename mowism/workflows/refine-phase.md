<purpose>
Run tiered automated quality checks on a completed phase. Orchestrator stays lean -- delegates each check to a subagent with fresh context. Replaces manual quality skill chaining with a single command.
</purpose>

<core_principle>
Each quality check runs as a separate Task() with its own 200k context window. The orchestrator only tracks which checks to run, their results, and the output files. Chain NEVER stops on a single check failure -- failures are logged and the chain continues.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load phase context:

```bash
INIT=$(node ~/.claude/mowism/bin/mow-tools.cjs init execute-phase "${PHASE_ARG}")
```

Parse from JSON: `phase_dir`, `phase_number`, `phase_name`, `plans`, `summaries`.

**Verify phase has summaries:** Quality checks need completed work to review. If `summaries` is empty, report error and stop:
```
Phase {phase_number} has no completed plans (no SUMMARY.md files found).
Run /mow:execute-phase {phase_number} first to build the phase, then refine.
```

**Create findings directory:**
```bash
mkdir -p {phase_dir}/VERIFICATION-CHAIN-P{phase_number}
```

Record start time for duration tracking.
</step>

<step name="select_tier">
Use AskUserQuestion to present tier options:

```
## Quality Tier Selection

Choose a quality check tier for Phase {phase_number}: {phase_name}

1. **Auto** (recommended) -- Claude selects based on phase complexity
2. **Minimum** -- scope-check, change-summary, verify-work, update-claude-md
3. **Complex** -- adds simplify + dead-code-sweep + grill-me (parallel)
4. **Algorithmic** -- adds prove-it to complex tier (parallel)

Reply with: auto, minimum, complex, or algorithmic
```

**Parse user response:**
- Accept "1", "auto" → auto-select logic
- Accept "2", "minimum", "min" → minimum tier
- Accept "3", "complex" → complex tier
- Accept "4", "algorithmic", "algo" → algorithmic tier
- Case-insensitive matching

**Auto-tier selection logic (when user picks "auto"):**

1. Count plans in phase: `ls {phase_dir}/*-PLAN.md | wc -l`
2. Read SUMMARY.md files for change type indicators:
   - Search for keywords: "algorithm", "performance", "data structure", "proof", "mathematical", "complexity", "optimization"
3. Decision:
   - If any algorithmic indicators found in summaries → select "algorithmic"
   - If plan count >= 3 or summaries reference multiple subsystems → select "complex"
   - Default → select "complex" (when uncertain, default to complex per research decision)
4. Report auto-selected tier:
   ```
   Auto-selected: {tier} (based on {reason}). Proceeding...
   ```
</step>

<step name="execute_chain">
Execute quality checks based on the selected tier.

**For minimum tier:** Run 4 stages sequentially.
**For complex tier:** Run Stage 1, Stage 2 (parallel), then Stages 3-5 sequentially.
**For algorithmic tier:** Same as complex but Stage 2 includes prove-it.

**Resilience pattern for every Task() call:**

1. Record start time: `CHECK_START=$(date +%s)`
2. Spawn Task()
3. On success: read findings file, extract `result` from frontmatter, report, continue
4. On failure (agent error, timeout):
   - One retry on transient failures (API errors, connection issues)
   - If retry also fails:
     - Write error to the check's findings file:
       ```
       ---
       check: {check-name}
       phase: {phase_number}
       result: error
       date: {ISO timestamp}
       duration: {elapsed}
       ---

       ## CHECK FAILED

       Error: {error message}

       This check could not complete. The quality chain continued without it.
       ```
     - Set result to "error"
     - Continue to next stage
5. Record duration: `CHECK_DURATION=$(($(date +%s) - CHECK_START))`

---

**Stage 1 (Gate): scope-check**

```
Task(
  prompt="
    Run /scope-check on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Read the SUMMARY.md files in {phase_dir} to understand what was built.
    Then check all git commits for this phase using the commit messages
    that contain the phase prefix (e.g., 'feat({phase_number}-').

    Evaluate whether the changes stayed within scope of the original plan objectives.

    After running scope-check, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/scope-check.md

    Format the file with YAML frontmatter:
    ---
    check: scope-check
    phase: {phase_number}
    result: pass|fail
    date: {ISO timestamp}
    duration: (record how long this took)
    ---

    ## Scope Check Findings
    [full output following the scope-check format]
  ",
  description="Scope check: Phase {phase_number}"
)
```

After Task() returns:
- Read `{phase_dir}/VERIFICATION-CHAIN-P{phase_number}/scope-check.md`
- Extract `result` from frontmatter
- If scope-check fails: LOG the failure, DO NOT stop the chain
- Report: "Stage 1 (scope-check): {result}"

**Stage 2 (Parallel): Quality Checks** -- runs only for complex and algorithmic tiers.

Skip this stage entirely for minimum tier.

For **complex tier**, spawn 3 parallel Task() calls in a single message block:

```
# All three spawn in one message = parallel execution
simplify_result = Task(
  prompt="
    Run /simplify on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Read the SUMMARY.md files in {phase_dir} to understand what was built.
    Then examine the code changes.

    After running simplify, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/simplify.md

    Format with YAML frontmatter:
    ---
    check: simplify
    phase: {phase_number}
    result: pass|request-changes
    date: {ISO timestamp}
    duration: (record how long this took)
    findings_count: (number of simplification opportunities found)
    ---

    ## Simplify Findings
    [full output]
  ",
  description="Simplify: Phase {phase_number}"
)

dead_code_result = Task(
  prompt="
    Run /dead-code-sweep on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Read the SUMMARY.md files in {phase_dir} to understand what was built.
    Then examine the code changes for dead code.

    After running dead-code-sweep, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/dead-code-sweep.md

    Format with YAML frontmatter:
    ---
    check: dead-code-sweep
    phase: {phase_number}
    result: pass|request-changes
    date: {ISO timestamp}
    duration: (record how long this took)
    findings_count: (number of dead code items found)
    ---

    ## Dead Code Sweep Findings
    [full output]
  ",
  description="Dead code sweep: Phase {phase_number}"
)

grill_result = Task(
  prompt="
    Run /grill-me on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Read the SUMMARY.md files in {phase_dir} to understand what was built.
    Then examine all code changes for this phase.

    After running grill-me, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/grill-me.md

    Format with YAML frontmatter:
    ---
    check: grill-me
    phase: {phase_number}
    result: pass|request-changes
    date: {ISO timestamp}
    duration: (record how long this took)
    findings_count: (number of issues found)
    ---

    ## Grill Me Findings
    [full output]
  ",
  description="Grill me: Phase {phase_number}"
)
```

For **algorithmic tier**, spawn 4 parallel Task() calls (same 3 as complex PLUS prove-it):

```
# All four spawn in one message = parallel execution
prove_result = Task(
  prompt="
    Run /prove-it on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Focus on algorithmic correctness, edge cases, and formal reasoning.
    Read the SUMMARY.md files in {phase_dir} to understand what was built.
    Then examine the code changes.

    After running prove-it, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/prove-it.md

    Format with YAML frontmatter:
    ---
    check: prove-it
    phase: {phase_number}
    result: pass|request-changes
    date: {ISO timestamp}
    duration: (record how long this took)
    findings_count: (number of claims verified)
    ---

    ## Prove It Findings
    [full output]
  ",
  description="Prove it: Phase {phase_number}"
)

# Plus the same 3 Task() calls from complex tier (simplify, dead-code-sweep, grill-me)
# All four in a single message block for parallel execution
```

Apply the same resilience wrapper to each Stage 2 Task() call: record start time, retry once on transient failure, continue on error, write error to findings file.

After all Stage 2 Task() calls return:
- Read each findings file in `{phase_dir}/VERIFICATION-CHAIN-P{phase_number}/`
- Extract `result` from frontmatter for each check
- Report: "Stage 2 (simplify): {result}, (dead-code-sweep): {result}, (grill-me): {result}" (and prove-it for algorithmic)
- Any check that errored: log it, continue to Stage 3

**Stage 3 (Sequential): change-summary**

```
Task(
  prompt="
    Run /change-summary on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Read the SUMMARY.md files in {phase_dir} to understand what was built.
    Then examine all git commits and file changes for this phase.

    Read findings from scope-check.md if it exists in the VERIFICATION-CHAIN
    directory at {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/scope-check.md.
    Note any scope issues in your summary.

    IMPORTANT: Before generating your summary, read ALL findings files in
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/ that exist from prior checks.

    If any checks have contradictory recommendations (e.g., simplify says
    "remove this abstraction" while grill-me says "add more error handling to
    this abstraction"), note the conflict explicitly and recommend which to
    follow based on Phase {phase_number}'s goals. Conflicts between quality
    checks are normal -- your job is to synthesize, not ignore.

    Include a "## Reconciliation" section at the end of your summary if any
    conflicts were found.

    Generate a comprehensive change summary following the /change-summary format.

    After completing, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/change-summary.md

    Format the file with YAML frontmatter:
    ---
    check: change-summary
    phase: {phase_number}
    result: complete
    date: {ISO timestamp}
    duration: (record how long this took)
    ---

    ## Change Summary Findings
    [full output following the change-summary format]
  ",
  description="Change summary: Phase {phase_number}"
)
```

After Task() returns:
- Read findings file, extract result
- Report: "Stage 3 (change-summary): {result}"

**Stage 4 (Sequential): verify-work**

```
Task(
  prompt="
    Run automated verification on the changes made during Phase {phase_number}.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    This is an automated code verification, NOT interactive UAT.

    For each plan in the phase:
    1. Read the PLAN.md file and extract must_haves (truths, artifacts, key_links)
    2. Read the corresponding SUMMARY.md
    3. Verify each must_have truth against the actual codebase:
       - Check that artifacts exist at specified paths
       - Verify artifacts contain expected content
       - Check that key_links are valid (@-references resolve)
       - Test that truth statements hold (run commands, read files)

    After completing, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/verify-work.md

    Format the file with YAML frontmatter:
    ---
    check: verify-work
    phase: {phase_number}
    result: pass|fail
    date: {ISO timestamp}
    duration: (record how long this took)
    truths_verified: N
    truths_total: M
    ---

    ## Verify Work Findings

    ### Must-Have Verification

    | # | Truth | Status | Evidence |
    |---|-------|--------|----------|
    | 1 | [truth statement] | pass/fail | [how verified] |

    ### Artifact Verification

    | Path | Expected | Status | Notes |
    |------|----------|--------|-------|
    | [path] | [what it should contain] | pass/fail | [details] |

    ### Key Link Verification

    | From | To | Via | Status |
    |------|----|-----|--------|
    | [source] | [target] | [mechanism] | pass/fail |

    ### Overall Assessment
    [Summary of verification results]
  ",
  description="Verify work: Phase {phase_number}"
)
```

After Task() returns:
- Read findings file, extract result
- Report: "Stage 4 (verify-work): {result}"

**Stage 5 (Sequential): update-claude-md**

```
Task(
  prompt="
    Review the quality chain findings for Phase {phase_number} and propose
    CLAUDE.md updates based on lessons learned.

    Context: Phase {phase_number}: {phase_name}
    Phase directory: {phase_dir}

    Review all findings from the VERIFICATION-CHAIN directory at:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/

    Read each findings file (scope-check.md, change-summary.md, verify-work.md)
    and any other check results present.

    Also read the SUMMARY.md files in {phase_dir} for decisions and patterns.

    Based on all findings, propose CLAUDE.md updates following the
    /update-claude-md skill format:
    - Corrections found during this phase
    - Project-specific patterns established
    - Tool/library gotchas discovered
    - Environment specifics that matter

    Write proposed updates to the findings file but DO NOT modify CLAUDE.md --
    the user will review.

    After completing, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/update-claude-md.md

    Format the file with YAML frontmatter:
    ---
    check: update-claude-md
    phase: {phase_number}
    result: complete
    date: {ISO timestamp}
    duration: (record how long this took)
    proposed_updates: N
    ---

    ## CLAUDE.md Update Proposals

    ### Proposed Additions
    [Each proposed rule with WHY, following update-claude-md format]

    ### Proposed Modifications
    [Any existing rules that should be updated]

    ### No Changes Needed
    [If no updates warranted, explain why]
  ",
  description="Update CLAUDE.md review: Phase {phase_number}"
)
```

After Task() returns:
- Read findings file, extract result
- Report: "Stage 5 (update-claude-md): {result}"
</step>

<step name="report_results">
Collect all check results (pass/fail/error/complete).

Determine overall result:
- "pass" if all checks pass or complete
- "fail" if any check has result "fail"
- "mixed" if some checks errored but others passed

Present summary:

```
## Refine Phase: {phase_number} Complete

**Tier:** {tier}
**Result:** {overall}

| # | Check | Result | Duration |
|---|-------|--------|----------|
| 1 | scope-check | {result} | {duration} |
{For complex/algorithmic tiers, include Stage 2 checks:}
| 2 | simplify | {result} | {duration} |
| 3 | dead-code-sweep | {result} | {duration} |
| 4 | grill-me | {result} | {duration} |
{For algorithmic tier only:}
| 5 | prove-it | {result} | {duration} |
{Then sequential stages (numbering continues from last Stage 2 check):}
| N | change-summary | {result} | {duration} |
| N+1 | verify-work | {result} | {duration} |
| N+2 | update-claude-md | {result} | {duration} |

For minimum tier, omit Stage 2 rows (table shows only scope-check, change-summary, verify-work, update-claude-md numbered 1-4).

Findings: {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/
```

If any checks failed:
```
### Failed Checks

{For each failed check: brief description of what failed and recommended action}
```

If update-claude-md proposed updates:
```
### Proposed CLAUDE.md Updates

Review proposed updates at:
{phase_dir}/VERIFICATION-CHAIN-P{phase_number}/update-claude-md.md
```
</step>

<step name="write_verification_chain_index">
After the chain completes, generate the VERIFICATION-CHAIN index file at `{phase_dir}/VERIFICATION-CHAIN-P{phase_number}.md`.

This is done by the orchestrator (not a subagent) -- it only reads frontmatter from each findings file, keeping context usage minimal.

**Read each findings file's frontmatter** in `{phase_dir}/VERIFICATION-CHAIN-P{phase_number}/`:
- Extract `check`, `result`, `duration`, and `findings_count` from YAML frontmatter
- For checks that didn't run (e.g., prove-it on minimum/complex tier): omit from the table
- For checks that errored: show "error" as result with a note

**Write the index file:**

```markdown
# Verification Chain: Phase {phase_number}

**Date:** {ISO date}
**Tier:** {selected tier}
**Result:** {overall result: pass if all pass, fail if any fail, mixed if some error}

## Chain Summary

| # | Check | Result | Duration | Findings |
|---|-------|--------|----------|----------|
| 1 | scope-check | {result} | {duration} | [scope-check.md](VERIFICATION-CHAIN-P{phase_number}/scope-check.md) |
| 2 | simplify | {result} | {duration} | [simplify.md](VERIFICATION-CHAIN-P{phase_number}/simplify.md) |
[...for each check that ran]

## Blockers
{List any checks with result "fail" or "request-changes" with severity, or "None" if all pass}

## Overall Verdict
{PASS / FAIL / MIXED with explanation}
```

Write the index file using the Write tool to `{phase_dir}/VERIFICATION-CHAIN-P{phase_number}.md`.
</step>

<step name="update_state">
After writing the index file, update STATE.md with verification results.

Call mow-tools.cjs to record the result:

```bash
node ~/.claude/mowism/bin/mow-tools.cjs worktree verify-result "${PHASE_NUMBER}" \
  --tier "${TIER}" \
  --result "${OVERALL_RESULT}" \
  --blockers "${BLOCKERS_OR_NONE}"
```

This writes to the "Verification Results" section in STATE.md (implemented in Plan 02-01).

**Update the final report** output to include index file reference:

```
Findings index: {phase_dir}/VERIFICATION-CHAIN-P{phase_number}.md
Findings detail: {phase_dir}/VERIFICATION-CHAIN-P{phase_number}/
STATE.md updated with verification results.
```
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context. Each subagent: fresh 200k context window.
No context bleed between checks. Task() blocks until complete.
</context_efficiency>

<failure_handling>
- **Single check fails:** Log failure, continue chain. Report in results.
- **Check agent errors/times out:** One retry on transient failures. If retry fails, write error to findings file, continue.
- **All checks fail:** Likely systemic issue (permissions, git). Report for investigation.
- **Phase has no summaries:** Stop before chain starts -- nothing to check.
</failure_handling>

<success_criteria>
- [ ] Tier selected (auto, minimum, complex, or algorithmic)
- [ ] All tier-appropriate checks spawned as separate Task() subagents
- [ ] Each check writes findings to VERIFICATION-CHAIN-P{N}/ directory
- [ ] Failed checks logged and chain continues (resilient)
- [ ] Transient failures get one retry before marking as error
- [ ] Results summary presented with per-check status and duration
- [ ] Findings directory contains all check output files
- [ ] VERIFICATION-CHAIN-P{N}.md index file generated with summary table and links
- [ ] STATE.md updated with verification results (tier, result, date, blockers)
</success_criteria>
