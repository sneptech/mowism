# /mow:close-shop

Gracefully shut down a multi-phase execution session.

## Usage

    /mow:close-shop

No arguments needed. Operates on the current active multi-phase session.

## What Happens

1. Checks if any phase workers are still executing (offers to wait, pause, or cancel)
2. Merges completed phase branches into main
3. Captures deferred items and new context from worker STATUS.md files
4. Updates STATE.md with final phase statuses
5. Sends shutdown requests to all workers
6. Cleans up the Agent Teams team
7. Produces a final session report

Worktrees are NOT deleted -- they persist for inspection until manually removed.

## Examples

    # After all phases complete
    /mow:close-shop

    # Works even if some phases failed (failed phases get checkpoint files)
    /mow:close-shop

## Related

    /mow:progress           View execution status
    /mow:resume-work        Resume from a previous session
    /mow:team-status        View agent team activity
