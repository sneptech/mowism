#!/bin/bash
# SubagentStart hook: inject project CLAUDE.md into subagent context
# This ensures all subagents have access to project-level instructions

INPUT=$(cat)

# Get the working directory from hook input
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

# Look for CLAUDE.md in the project directory
# Claude Code's project CLAUDE.md lives at .claude/CLAUDE.md relative to project root
CLAUDE_MD=""

# Check project-level CLAUDE.md
if [ -f "$CWD/.claude/CLAUDE.md" ]; then
  CLAUDE_MD="$CWD/.claude/CLAUDE.md"
elif [ -f "$CWD/CLAUDE.md" ]; then
  CLAUDE_MD="$CWD/CLAUDE.md"
fi

if [ -z "$CLAUDE_MD" ]; then
  exit 0  # No CLAUDE.md found, nothing to inject
fi

# Read content and output as additionalContext
CONTENT=$(cat "$CLAUDE_MD")
if [ -n "$CONTENT" ]; then
  jq -n --arg ctx "$CONTENT" '{
    "additionalContext": ("Project CLAUDE.md:\n\n" + $ctx)
  }'
fi

exit 0
