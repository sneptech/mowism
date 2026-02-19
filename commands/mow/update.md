---
name: mow:update
description: Update MOW to latest version
allowed-tools:
  - Bash
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:update ???`):
1. Extract the command name: `update`
2. Run `/mow:help-open update` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Check for MOW updates and install if available.

Routes to the update workflow which handles:
- Installation method detection (git clone vs install.sh)
- Update source resolution (remote URL or local path)
- Version comparison
- User confirmation before updating
- Update execution (git pull or re-run install.sh)
- Restart reminder
</objective>

<execution_context>
@~/.claude/mowism/workflows/update.md
</execution_context>

<process>
**Follow the update workflow** from `@~/.claude/mowism/workflows/update.md`.

The workflow handles all logic including:
1. Installation method detection (git clone vs install.sh)
2. Update source resolution
3. Version checking
4. Change display and user confirmation
5. Update execution
6. Post-update restart reminder
</process>
