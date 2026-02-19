# /mow:worktree-status

Show detailed worktree assignment status for parallel agent execution.

## Usage

    /mow:worktree-status

## What Happens

1. Queries worktree assignment data from mow-tools
2. Shows a detailed table: worktree path, branch, phase, plan, status, started, agent
3. Calculates time since each worktree was started
4. Cross-references with actual disk state to detect stale entries
5. Marks stale worktrees and suggests cleanup
6. Shows quick action commands

## Examples

    /mow:worktree-status    See all active worktree assignments

## Related

    /mow:execute-phase    Resume execution in a worktree
    /mow:progress         Full project status with worktree summary
    /mow:cleanup          Archive completed milestone directories
