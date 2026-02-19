---
name: mow:help
description: Show available MOW commands and usage guide
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:help ???`):
1. Extract the command name: `help`
2. Run `/mow:help-open help` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Display the complete MOW command reference.

Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<execution_context>
@/home/max/.claude/mowism/workflows/help.md
</execution_context>

<process>
Output the complete MOW command reference from @/home/max/.claude/mowism/workflows/help.md.
Display the reference content directly — no additions or modifications.
</process>
