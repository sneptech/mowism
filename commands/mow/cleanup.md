---
name: mow:cleanup
description: Archive accumulated phase directories from completed milestones
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:cleanup ???`):
1. Extract the command name: `cleanup`
2. Run `/mow:help-open cleanup` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Archive phase directories from completed milestones into `.planning/milestones/v{X.Y}-phases/`.

Use when `.planning/phases/` has accumulated directories from past milestones.
</objective>

<execution_context>
@/home/max/.claude/mowism/workflows/cleanup.md
</execution_context>

<process>
Follow the cleanup workflow at @/home/max/.claude/mowism/workflows/cleanup.md.
Identify completed milestones, show a dry-run summary, and archive on confirmation.
</process>
