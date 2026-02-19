---
name: mow:update
description: Update MOW to latest version with changelog display
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
Check for MOW updates, install if available, and display what changed.

Routes to the update workflow which handles:
- Version detection (local vs global installation)
- npm version checking
- Changelog fetching and display
- User confirmation with clean install warning
- Update execution and cache clearing
- Restart reminder
</objective>

<execution_context>
@~/.claude/mowism/workflows/update.md
</execution_context>

<process>
**Follow the update workflow** from `@~/.claude/mowism/workflows/update.md`.

The workflow handles all logic including:
1. Installed version detection (local/global)
2. Latest version checking via npm
3. Version comparison
4. Changelog fetching and extraction
5. Clean install warning display
6. User confirmation
7. Update execution
8. Cache clearing
</process>
