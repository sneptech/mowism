# /mow:progress

Check project progress, recent work, and route to the next action.

## Usage

    /mow:progress

## What Happens

1. Reads STATE.md and ROADMAP.md for current position
2. Summarizes recent completed work and remaining phases
3. Shows progress bar and velocity metrics
4. Detects what should happen next (execute, plan, verify, etc.)
5. Routes to the appropriate command based on project state

## Examples

    /mow:progress    See where the project stands and what to do next

## Related

    /mow:resume-work        Resume with full context restoration
    /mow:execute-phase      Continue executing plans
    /mow:plan-phase         Create plans for the next phase
    /mow:worktree-status    See detailed worktree assignments
