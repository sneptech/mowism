---
name: mow:progress
description: Check project progress, show context, and route to next action (execute or plan)
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:progress ???`):
1. Extract the command name: `progress`
2. Run `/mow:help-open progress` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Check project progress, summarize recent work and what's ahead, then intelligently route to the next action - either executing an existing plan or creating the next one.

Provides situational awareness before continuing work.
</objective>

<execution_context>
@~/.claude/mowism/workflows/progress.md
</execution_context>

<process>
Execute the progress workflow from @~/.claude/mowism/workflows/progress.md end-to-end.
Preserve all routing logic (Routes A through F) and edge case handling.
</process>
