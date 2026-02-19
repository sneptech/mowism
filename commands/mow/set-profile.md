---
name: mow:set-profile
description: Switch model profile for MOW agents (quality/balanced/budget)
argument-hint: <profile>
allowed-tools:
  - Read
  - Write
  - Bash
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:set-profile ???`):
1. Extract the command name: `set-profile`
2. Run `/mow:help-open set-profile` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Switch the model profile used by MOW agents. Controls which Claude model each agent uses, balancing quality vs token spend.

Routes to the set-profile workflow which handles:
- Argument validation (quality/balanced/budget)
- Config file creation if missing
- Profile update in config.json
- Confirmation with model table display
</objective>

<execution_context>
@~/.claude/mowism/workflows/set-profile.md
</execution_context>

<process>
**Follow the set-profile workflow** from `@~/.claude/mowism/workflows/set-profile.md`.

The workflow handles all logic including:
1. Profile argument validation
2. Config file ensuring
3. Config reading and updating
4. Model table generation from MODEL_PROFILES
5. Confirmation display
</process>
