# /mow:execute-phase

Execute all plans in a phase with wave-based parallelization.

## Usage

    /mow:execute-phase <phase-number> [--gaps-only]

## Arguments

    phase-number    The phase to execute (e.g., 1, 2, 03)

## Flags

    --gaps-only    Execute only gap closure plans (plans with gap_closure: true).
                   Use after /mow:verify-work creates fix plans.

## What Happens

1. Reads ROADMAP.md to find all plans for the given phase
2. Analyzes plan dependencies and groups them into execution waves
3. Spawns parallel subagents for independent plans within each wave
4. Each subagent executes its plan, commits per-task, creates SUMMARY.md
5. Collects results and updates STATE.md with progress
6. Routes to next action (verify, plan next phase, etc.)

## Examples

    /mow:execute-phase 2              Execute all Phase 2 plans
    /mow:execute-phase 3 --gaps-only  Execute only gap-fix plans in Phase 3

## Related

    /mow:plan-phase         Create plans before executing
    /mow:verify-work        Validate results after execution
    /mow:refine-phase       Run quality checks on completed phase
    /mow:progress           Check overall project progress
