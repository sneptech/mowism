# /mow:plan-phase

Create detailed execution plans (PLAN.md files) for a roadmap phase.

## Usage

    /mow:plan-phase [phase] [--auto] [--research] [--skip-research] [--gaps] [--skip-verify]

## Arguments

    phase    Phase number to plan (auto-detects next unplanned phase if omitted)

## Flags

    --auto             Plan without interaction after initial setup
    --research         Force re-research even if RESEARCH.md exists
    --skip-research    Skip research, go straight to planning
    --gaps             Gap closure mode (reads VERIFICATION.md, skips research)
    --skip-verify      Skip the plan verification loop

## What Happens

1. Validates the phase exists in ROADMAP.md
2. Runs domain research if needed (spawns researcher subagent)
3. Spawns planner subagent to create PLAN.md files with tasks
4. Spawns plan-checker subagent to verify plan quality
5. Iterates planner/checker until plans pass or max iterations reached
6. Presents results and offers next steps

## Examples

    /mow:plan-phase                   Plan the next unplanned phase
    /mow:plan-phase 3                 Plan Phase 3 specifically
    /mow:plan-phase --skip-research   Plan without running research first
    /mow:plan-phase --gaps            Create fix plans from verification gaps

## Related

    /mow:discuss-phase        Gather context before planning
    /mow:research-phase       Run standalone research
    /mow:execute-phase        Execute the created plans
    /mow:list-phase-assumptions   See Claude's assumptions before planning
