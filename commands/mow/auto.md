---
name: mow:auto
description: Start full auto-advance pipeline from current phase through milestone end
argument-hint: ""
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - SendMessage
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - TeamCreate
  - TeamDelete
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:auto ???`):
1. Extract the command name: `auto`
2. Run `/mow:help-open auto` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<!-- AUTO-06 (optional phase range arguments) deferred per locked discuss-phase decision:
     "/mow:auto takes no arguments -- always starts from first incomplete phase."
     Phase range support can be added as optional arguments in a future iteration
     without breaking the no-argument default. -->

<objective>
Drive the entire milestone from the first incomplete phase to completion. Sets `workflow.auto_advance`, delegates to the team lead for DAG-driven multi-phase orchestration, handles resume on re-run, milestone boundary cleanup, and context window awareness.

This is the single entry point for full-milestone pipeline execution. One command, all phases.
</objective>

<execution_context>
@~/.claude/mowism/workflows/auto.md
@~/.claude/mowism/references/ui-brand.md
</execution_context>

<context>
No arguments -- always starts from the first incomplete phase in the current milestone.

@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>
Execute the auto-advance workflow from @~/.claude/mowism/workflows/auto.md end-to-end.
Preserve all workflow gates (resume detection, discuss pause enforcement, milestone boundary handling, context window awareness).
</process>
