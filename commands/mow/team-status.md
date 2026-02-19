---
name: mow:team-status
description: Show agent team status and teammate assignments
allowed-tools:
  - Read
  - Bash
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:team-status ???`):
1. Extract the command name: `team-status`
2. Run `/mow:help-open team-status` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

---

<objective>
Display the current Agent Teams status from STATE.md and live team config.
</objective>

<process>

## 1. Get team status data

Run the mow-tools team-status command to get structured data:

```bash
TEAM_DATA=$(node ~/.claude/mowism/bin/mow-tools.cjs team-status --raw 2>/dev/null)
```

## 2. Check for live team config

Also check if a live Agent Teams config exists on disk:

```bash
ls ~/.claude/teams/mow-*/config.json 2>/dev/null
```

If a live config exists, note the team name from the directory path for cross-referencing.

## 3. Display team status

**If team is active** (the team-status output contains `"active": true` or the Agent Team Status section exists in STATE.md with team metadata):

Display a formatted status report:

```markdown
## Agent Team Status

**Team:** {team-name}
**Started:** {start-time}
**Status:** Active

### Teammates

| Teammate | Worktree | Current Task | Status | Last Update |
|----------|----------|--------------|--------|-------------|
| {name}   | {path}   | {task}       | {status} | {timestamp} |
| ...      | ...      | ...          | ...    | ...         |

### Task Summary

- **Pending:** {count}
- **In Progress:** {count}
- **Completed:** {count}
```

Cross-reference the STATE.md data with any live team config found in `~/.claude/teams/`. If there are discrepancies (e.g., STATE.md shows a teammate that the live config doesn't list), note it.

**If no team is active** (team-status returns empty or no Agent Team Status section in STATE.md):

Display:

```markdown
## Agent Team Status

No agent team is currently active.

To start a team:
- Use `/mow:execute-phase` with Agent Teams enabled
- Requires: `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

To check if Agent Teams is available:
- Run `/mow:health` to see dependency status
```

## 4. Additional context

If STATE.md has a "Worktree Assignments" section with entries, also show it as supplementary context (worktrees may be in use for solo execution, not team execution).

</process>
