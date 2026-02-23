#!/bin/bash
set -euo pipefail

# WorktreeCreate hook for Mowism
# Reads JSON from stdin, creates phase worktrees with Mowism coordination
# or plain worktrees for non-phase names.
# Prints ONLY the absolute worktree path to stdout. All diagnostics go to stderr.

INPUT=$(cat)

# Parse JSON fields using jq, with Node.js fallback
if command -v jq &>/dev/null; then
  NAME=$(echo "$INPUT" | jq -r '.name // empty')
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
else
  NAME=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).name||'')}catch{}})")
  CWD=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).cwd||'')}catch{}})")
fi

if [ -z "$NAME" ] || [ -z "$CWD" ]; then
  echo "MOW: WorktreeCreate hook: missing name or cwd from stdin" >&2
  exit 1
fi

# Locate mow-tools.cjs
TOOLS_PATH="$CWD/bin/mow-tools.cjs"
if [ ! -f "$TOOLS_PATH" ]; then
  TOOLS_PATH="$HOME/.claude/mowism/bin/mow-tools.cjs"
fi

# Determine default branch for plain worktrees
get_default_branch() {
  local branch
  branch=$(git -C "$CWD" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||') || true
  if [ -z "$branch" ]; then
    branch="main"
  fi
  echo "$branch"
}

# Non-phase worktrees: plain git behavior
if ! echo "$NAME" | grep -qE '^phase-[0-9]+$'; then
  echo "MOW: Creating plain worktree for non-phase name: $NAME" >&2
  BASE=$(get_default_branch)
  WT_DIR="$CWD/.claude/worktrees/$NAME"
  mkdir -p "$(dirname "$WT_DIR")"
  git -C "$CWD" worktree add "$WT_DIR" -b "$NAME" "$BASE" >&2 2>&1 || true
  echo "$WT_DIR"
  exit 0
fi

# Phase worktrees: delegate to mow-tools.cjs
if [ ! -f "$TOOLS_PATH" ]; then
  echo "MOW: mow-tools.cjs not found at $CWD/bin/ or ~/.claude/mowism/bin/" >&2
  exit 1
fi

echo "MOW: Creating phase worktree via mow-tools.cjs: $NAME" >&2
RESULT=$(node "$TOOLS_PATH" worktree create-native --name "$NAME" --raw 2>/dev/null) || {
  echo "MOW: mow-tools.cjs worktree create-native failed" >&2
  exit 1
}

# Extract path from JSON result
if command -v jq &>/dev/null; then
  WT_PATH=$(echo "$RESULT" | jq -r '.path // empty')
else
  WT_PATH=$(echo "$RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).path||'')}catch{}})")
fi

if [ -z "$WT_PATH" ]; then
  echo "MOW: Could not extract path from create-native result" >&2
  exit 1
fi

echo "$WT_PATH"
