---
name: mow:quick
description: Execute a quick task with MOW guarantees (atomic commits, state tracking) but skip optional agents
argument-hint: "[--full]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:quick ???`):
1. Extract the command name: `quick`
2. Run `/mow:help-open quick` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Execute small, ad-hoc tasks with MOW guarantees (atomic commits, STATE.md tracking).

Quick mode is the same system with a shorter path:
- Spawns mow-planner (quick mode) + mow-executor(s)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md "Quick Tasks Completed" table (NOT ROADMAP.md)

**Default:** Skips research, plan-checker, verifier. Use when you know exactly what to do.

**`--full` flag:** Enables plan-checking (max 2 iterations) and post-execution verification. Use when you want quality guarantees without full milestone ceremony.
</objective>

<execution_context>
@/home/max/.claude/mowism/workflows/quick.md
</execution_context>

<context>
@.planning/STATE.md
$ARGUMENTS
</context>

<process>
Execute the quick workflow from @/home/max/.claude/mowism/workflows/quick.md end-to-end.
Preserve all workflow gates (validation, task description, planning, execution, state updates, commits).
</process>
