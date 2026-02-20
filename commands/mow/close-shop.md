---
name: mow:close-shop
description: Gracefully shut down a multi-phase execution session. Saves context, handles pending merges, captures deferred items, and cleans up team.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - SendMessage
  - TaskList
  - TeamDelete
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:close-shop ???`):
1. Extract the command name: `close-shop`
2. Run `/mow:help-open close-shop` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Gracefully shut down a multi-phase execution session. Checks worker status, handles pending merges, captures deferred items and new context, updates STATE.md, sends shutdown requests to workers, and produces a final session report.

Can be triggered by the user directly or by telling the team lead to wrap up.
</objective>

<execution_context>
@.planning/STATE.md
@~/.claude/mowism/workflows/close-shop.md
</execution_context>

<process>
**Follow the close-shop workflow** from `@~/.claude/mowism/workflows/close-shop.md`.

The workflow handles all logic including:
1. Checking worker status (active, complete, failed)
2. Handling pending merges for completed phases
3. Capturing deferred items and context from worker STATUS.md files
4. Updating STATE.md with final statuses
5. Sending shutdown requests to all workers
6. Producing a final session report
</process>
