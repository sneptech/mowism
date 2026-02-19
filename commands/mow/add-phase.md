---
name: mow:add-phase
description: Add phase to end of current milestone in roadmap
argument-hint: <description>
allowed-tools:
  - Read
  - Write
  - Bash
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:add-phase ???`):
1. Extract the command name: `add-phase`
2. Run `/mow:help-open add-phase` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Add a new integer phase to the end of the current milestone in the roadmap.

Routes to the add-phase workflow which handles:
- Phase number calculation (next sequential integer)
- Directory creation with slug generation
- Roadmap structure updates
- STATE.md roadmap evolution tracking
</objective>

<execution_context>
@.planning/ROADMAP.md
@.planning/STATE.md
@~/.claude/mowism/workflows/add-phase.md
</execution_context>

<process>
**Follow the add-phase workflow** from `@~/.claude/mowism/workflows/add-phase.md`.

The workflow handles all logic including:
1. Argument parsing and validation
2. Roadmap existence checking
3. Current milestone identification
4. Next phase number calculation (ignoring decimals)
5. Slug generation from description
6. Phase directory creation
7. Roadmap entry insertion
8. STATE.md updates
</process>
