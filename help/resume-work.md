# /mow:resume-work

Resume work from a previous session with full context restoration.

## Usage

    /mow:resume-work

## What Happens

1. Loads STATE.md to restore project context and position
2. Checks for `.continue-here.md` handoff files (from /mow:pause-work)
3. Detects incomplete work (PLANs without matching SUMMARYs)
4. Presents current status and progress
5. Offers context-aware next actions (execute, plan, discuss, etc.)
6. Routes to the appropriate command based on your choice

## Examples

    /mow:resume-work    Pick up where you left off

## Related

    /mow:pause-work     Create a handoff file before stopping
    /mow:progress       Check project progress without resuming
    /mow:execute-phase  Continue executing a phase
