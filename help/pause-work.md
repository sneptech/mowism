# /mow:pause-work

Create a context handoff file when pausing work mid-phase.

## Usage

    /mow:pause-work

## What Happens

1. Detects the current phase from recent file activity
2. Gathers complete state: position, completed work, remaining work, decisions, blockers
3. Creates `.continue-here.md` with all context sections
4. Commits as WIP (work in progress)
5. Shows resume instructions

## Examples

    /mow:pause-work    Save current state before stopping

## Related

    /mow:resume-work      Resume from the handoff file
    /mow:progress         Check progress without creating a handoff
