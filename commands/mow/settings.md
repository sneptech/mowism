---
name: mow:settings
description: Configure MOW workflow toggles and model profile
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:settings ???`):
1. Extract the command name: `settings`
2. Run `/mow:help-open settings` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Interactive configuration of MOW workflow agents and model profile via multi-question prompt.

Routes to the settings workflow which handles:
- Config existence ensuring
- Current settings reading and parsing
- Interactive 5-question prompt (model, research, plan_check, verifier, branching)
- Config merging and writing
- Confirmation display with quick command references
</objective>

<execution_context>
@~/.claude/mowism/workflows/settings.md
</execution_context>

<process>
**Follow the settings workflow** from `@~/.claude/mowism/workflows/settings.md`.

The workflow handles all logic including:
1. Config file creation with defaults if missing
2. Current config reading
3. Interactive settings presentation with pre-selection
4. Answer parsing and config merging
5. File writing
6. Confirmation display
</process>
