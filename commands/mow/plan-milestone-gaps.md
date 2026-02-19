---
name: mow:plan-milestone-gaps
description: Create phases to close all gaps identified by milestone audit
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:plan-milestone-gaps ???`):
1. Extract the command name: `plan-milestone-gaps`
2. Run `/mow:help-open plan-milestone-gaps` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Create all phases necessary to close gaps identified by `/mow:audit-milestone`.

Reads MILESTONE-AUDIT.md, groups gaps into logical phases, creates phase entries in ROADMAP.md, and offers to plan each phase.

One command creates all fix phases — no manual `/mow:add-phase` per gap.
</objective>

<execution_context>
@~/.claude/mowism/workflows/plan-milestone-gaps.md
</execution_context>

<context>
**Audit results:**
Glob: .planning/v*-MILESTONE-AUDIT.md (use most recent)

**Original intent (for prioritization):**
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md

**Current state:**
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
Execute the plan-milestone-gaps workflow from @~/.claude/mowism/workflows/plan-milestone-gaps.md end-to-end.
Preserve all workflow gates (audit loading, prioritization, phase grouping, user confirmation, roadmap updates).
</process>
