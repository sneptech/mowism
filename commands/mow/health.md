---
name: mow:health
description: Diagnose planning directory health and optionally repair issues
argument-hint: [--repair]
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:health ???`):
1. Extract the command name: `health`
2. Run `/mow:help-open health` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Validate `.planning/` directory integrity and report actionable issues. Checks for missing files, invalid configurations, inconsistent state, and orphaned plans.
</objective>

<execution_context>
@/home/max/.claude/mowism/workflows/health.md
</execution_context>

<process>
Execute the health workflow from @/home/max/.claude/mowism/workflows/health.md end-to-end.
Parse --repair flag from arguments and pass to workflow.
</process>
