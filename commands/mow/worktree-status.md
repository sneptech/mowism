---
name: mow:worktree-status
description: Show detailed worktree assignment status
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:worktree-status ???`):
1. Extract the command name: `worktree-status`
2. Run `/mow:help-open worktree-status` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Show detailed worktree assignment information: which worktrees are claiming which phases, their plan progress, timestamps, and agent IDs. This is the detail view -- /mow:progress shows a summary.
</objective>

<process>
1. Run `node ~/.claude/mowism/bin/mow-tools.cjs worktree status` to get JSON array
2. If empty: "No active worktree assignments."
3. If non-empty: render a detailed table with ALL columns:
   ```
   ## Worktree Assignments (Detail)

   | Worktree | Branch | Phase | Plan | Status | Started | Agent |
   |----------|--------|-------|------|--------|---------|-------|
   | {full worktree path} | {branch} | {phase} | {plan} | {status} | {started} | {agent} |
   ```
4. For each entry, also show:
   - Time since started (e.g., "2h 15m ago")
   - Whether the worktree still exists on disk (cross-reference with `wt list --format=json`)
   - If worktree no longer exists: mark as "STALE" and suggest running any /mow:* command to auto-clean
5. After the detail table, show:
   ```
   **Quick actions:**
   - `/mow:execute-phase {phase}` -- resume or start execution in a worktree
   - `/mow:progress` -- full project status with worktree summary
   ```
</process>
