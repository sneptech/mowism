# /mow:team-status

Show agent team status and teammate assignments.

## Usage

    /mow:team-status

## What Happens

1. Queries mow-tools for structured team status data
2. Checks for live Agent Teams config in `~/.claude/teams/`
3. If a team is active: shows team name, start time, and teammate table
4. Displays task summary (pending, in progress, completed)
5. Cross-references STATE.md with live config for discrepancies
6. If no team active: shows how to start one

## Examples

    /mow:team-status    Check current agent team assignments

## Related

    /mow:worktree-status    Detailed worktree assignments
    /mow:execute-phase      Start phase execution (with or without teams)
    /mow:health             Check if Agent Teams is available
    /mow:progress           Full project status overview
