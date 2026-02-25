#!/bin/bash
# Context window monitoring hook (Stop event)
# Warns at 25% remaining, wraps up at 15% remaining
# Per user decision: tighter thresholds than GSD (25%/15% vs 35%/25%)

INPUT=$(cat)

# Prevent infinite Stop hook loop
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

# Only run in MOW/GSD projects (must have .planning/ directory)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
if [ ! -d "$CWD/.planning" ]; then
  exit 0
fi

# Get transcript path from hook input
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# Skip monitoring for subagents (their transcripts are in subdirectories)
# Top-level transcripts are directly in the session directory
if echo "$TRANSCRIPT" | grep -q '/subagents/'; then
  exit 0
fi

# Estimate context usage from transcript file size
# NOTE: This is inherently approximate because Claude Code compresses old
# messages, so transcript size grows faster than actual token usage.
# Use a conservative estimate to avoid false positives.
# Can be tuned via MOW_MAX_TRANSCRIPT_KB env var.
MAX_SIZE=${MOW_MAX_TRANSCRIPT_KB:-3000}
MAX_SIZE=$((MAX_SIZE * 1024))
FILE_SIZE=$(stat -c%s "$TRANSCRIPT" 2>/dev/null || stat -f%z "$TRANSCRIPT" 2>/dev/null || echo 0)
USED_PERCENT=$(( (FILE_SIZE * 100) / MAX_SIZE ))
REMAINING=$((100 - USED_PERCENT))

# Clamp to valid range
if [ "$REMAINING" -lt 0 ]; then REMAINING=0; fi
if [ "$REMAINING" -gt 100 ]; then REMAINING=100; fi

if [ "$REMAINING" -le 15 ]; then
  # Critical: commit staged work, write handoff note, tell user to /clear
  # Attempt to commit any staged work
  cd "$CWD" 2>/dev/null && git add -A .planning/ 2>/dev/null && git commit -m "docs: context window handoff - auto-save before /clear" --no-verify 2>/dev/null || true

  # Write handoff note to STATE.md
  if [ -f "$CWD/.planning/STATE.md" ]; then
    DATE=$(date -u +"%Y-%m-%d")
    printf '\n### Context Window Handoff (%s)\nSession approaching context limit (~%d%% remaining). Work committed. Run /clear and resume.\n' "$DATE" "$REMAINING" >> "$CWD/.planning/STATE.md"
  fi

  # Output system message (do NOT block stopping -- let Claude stop gracefully)
  jq -n --arg remaining "$REMAINING" '{
    "systemMessage": ("CONTEXT WINDOW CRITICAL (~" + $remaining + "% remaining). Work has been committed. Handoff note written to STATE.md. Tell the user to /clear and resume."),
    "suppressOutput": false
  }'

elif [ "$REMAINING" -le 25 ]; then
  # Warning: print visible warning about remaining capacity
  jq -n --arg remaining "$REMAINING" '{
    "systemMessage": ("CONTEXT WINDOW WARNING: ~" + $remaining + "% remaining. Consider wrapping up the current task soon and running /clear to continue with fresh context."),
    "suppressOutput": false
  }'
fi

exit 0
