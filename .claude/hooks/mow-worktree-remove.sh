#!/bin/bash
set -euo pipefail

# WorktreeRemove hook for Mowism
# Reads JSON from stdin, performs best-effort cleanup for phase worktrees.
# Always exits 0 (removal cannot be blocked).

INPUT=$(cat)

# Parse JSON fields using jq, with Node.js fallback
if command -v jq &>/dev/null; then
  WT_PATH=$(echo "$INPUT" | jq -r '.worktree_path // empty')
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
else
  WT_PATH=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).worktree_path||'')}catch{}})")
  CWD=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).cwd||'')}catch{}})")
fi

if [ -z "$WT_PATH" ] || [ -z "$CWD" ]; then
  echo "MOW: WorktreeRemove hook: missing worktree_path or cwd from stdin" >&2
  exit 0
fi

# Derive name from worktree path
WT_NAME=$(basename "$WT_PATH")

# Non-phase worktrees: no Mowism cleanup needed
if ! echo "$WT_NAME" | grep -qE '^phase-[0-9]+$'; then
  echo "MOW: Non-phase worktree removed, no cleanup needed: $WT_NAME" >&2
  exit 0
fi

# Extract phase number
PHASE=$(echo "$WT_NAME" | sed 's/^phase-//')

echo "MOW: Cleaning up phase worktree: $WT_NAME (phase $PHASE)" >&2

# Locate mow-tools.cjs
TOOLS_PATH="$CWD/bin/mow-tools.cjs"
if [ ! -f "$TOOLS_PATH" ]; then
  TOOLS_PATH="$HOME/.claude/mowism/bin/mow-tools.cjs"
fi

# Check for uncommitted changes (warning only)
if [ -d "$WT_PATH" ]; then
  git -C "$WT_PATH" diff --quiet 2>/dev/null || \
    echo "MOW: WARNING: Worktree $WT_NAME removed with uncommitted changes" >&2
fi

# Best-effort cleanup via mow-tools.cjs
if [ -f "$TOOLS_PATH" ]; then
  node "$TOOLS_PATH" worktree release "$PHASE" 2>/dev/null || true
  node "$TOOLS_PATH" worktree remove-manifest "$PHASE" 2>/dev/null || true
  node "$TOOLS_PATH" dashboard clear 2>/dev/null || true
else
  echo "MOW: mow-tools.cjs not found, skipping cleanup" >&2
fi

exit 0
