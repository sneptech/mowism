---
name: mow:add-todo
description: Capture idea or task as todo from current conversation context
argument-hint: [optional description]
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:add-todo ???`):
1. Extract the command name: `add-todo`
2. Run `/mow:help-open add-todo` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Capture an idea, task, or issue that surfaces during a MOW session as a structured todo for later work.

Routes to the add-todo workflow which handles:
- Directory structure creation
- Content extraction from arguments or conversation
- Area inference from file paths
- Duplicate detection and resolution
- Todo file creation with frontmatter
- STATE.md updates
- Git commits
</objective>

<execution_context>
@.planning/STATE.md
@/home/max/.claude/mowism/workflows/add-todo.md
</execution_context>

<process>
**Follow the add-todo workflow** from `@/home/max/.claude/mowism/workflows/add-todo.md`.

The workflow handles all logic including:
1. Directory ensuring
2. Existing area checking
3. Content extraction (arguments or conversation)
4. Area inference
5. Duplicate checking
6. File creation with slug generation
7. STATE.md updates
8. Git commits
</process>
