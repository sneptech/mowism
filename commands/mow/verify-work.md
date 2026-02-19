---
name: mow:verify-work
description: Validate built features through conversational UAT
argument-hint: "[phase number, e.g., '4']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Edit
  - Write
  - Task
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:verify-work ???`):
1. Extract the command name: `verify-work`
2. Run `/mow:help-open verify-work` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Validate built features through conversational testing with persistent state.

Purpose: Confirm what Claude built actually works from user's perspective. One test at a time, plain text responses, no interrogation. When issues are found, automatically diagnose, plan fixes, and prepare for execution.

Output: {phase_num}-UAT.md tracking all test results. If issues found: diagnosed gaps, verified fix plans ready for /mow:execute-phase
</objective>

<execution_context>
@~/.claude/mowism/workflows/verify-work.md
@~/.claude/mowism/templates/UAT.md
</execution_context>

<context>
Phase: $ARGUMENTS (optional)
- If provided: Test specific phase (e.g., "4")
- If not provided: Check for active sessions or prompt for phase

@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>
Execute the verify-work workflow from @~/.claude/mowism/workflows/verify-work.md end-to-end.
Preserve all workflow gates (session management, test presentation, diagnosis, fix planning, routing).
</process>
