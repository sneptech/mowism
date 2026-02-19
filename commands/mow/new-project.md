---
name: mow:new-project
description: Initialize a new project with deep context gathering and PROJECT.md
argument-hint: "[--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:new-project ???`):
1. Extract the command name: `new-project`
2. Run `/mow:help-open new-project` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<context>
**Flags:**
- `--auto` — Automatic mode. After config questions, runs research → requirements → roadmap without further interaction. Expects idea document via @ reference.
</context>

<objective>
Initialize a new project through unified flow: questioning → research (optional) → requirements → roadmap.

**Creates:**
- `.planning/PROJECT.md` — project context
- `.planning/config.json` — workflow preferences
- `.planning/research/` — domain research (optional)
- `.planning/REQUIREMENTS.md` — scoped requirements
- `.planning/ROADMAP.md` — phase structure
- `.planning/STATE.md` — project memory

**After this command:** Run `/mow:plan-phase 1` to start execution.
</objective>

<execution_context>
@/home/max/.claude/mowism/workflows/new-project.md
@/home/max/.claude/mowism/references/questioning.md
@/home/max/.claude/mowism/references/ui-brand.md
@/home/max/.claude/mowism/templates/project.md
@/home/max/.claude/mowism/templates/requirements.md
</execution_context>

<process>
Execute the new-project workflow from @/home/max/.claude/mowism/workflows/new-project.md end-to-end.
Preserve all workflow gates (validation, approvals, commits, routing).
</process>
