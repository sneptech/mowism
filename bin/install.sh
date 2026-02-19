#!/bin/bash
# Mowism installer -- copies all source files to ~/.claude/
# Origin: Mowism (fork of GSD)
set -euo pipefail

# Determine paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOWISM_SRC="$(dirname "$SCRIPT_DIR")"  # repo root (one level up from bin/)
CLAUDE_DIR="$HOME/.claude"
MOWISM_DEST="$CLAUDE_DIR/mowism"

echo "Installing Mowism..."
echo ""

# Create directories
mkdir -p "$CLAUDE_DIR/commands/mow"
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$MOWISM_DEST/bin"
mkdir -p "$MOWISM_DEST/workflows"
mkdir -p "$MOWISM_DEST/templates"
mkdir -p "$MOWISM_DEST/references"
mkdir -p "$MOWISM_DEST/help"

# Copy files (unconditional)
# Commands: /mow:* namespace
CMD_COUNT=0
for f in "$MOWISM_SRC/commands/mow/"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/commands/mow/" && CMD_COUNT=$((CMD_COUNT + 1))
done

# Commands: top-level quality skills (scope-check, simplify, etc.)
SKILL_COUNT=0
for f in "$MOWISM_SRC/commands/"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/commands/" && SKILL_COUNT=$((SKILL_COUNT + 1))
done

# Agent definitions
AGENT_COUNT=0
for f in "$MOWISM_SRC/agents/mow-"*.md; do
  [ -f "$f" ] && cp "$f" "$CLAUDE_DIR/agents/" && AGENT_COUNT=$((AGENT_COUNT + 1))
done

# Workflows
cp -r "$MOWISM_SRC/mowism/workflows" "$MOWISM_DEST/"
WORKFLOW_COUNT=$(find "$MOWISM_DEST/workflows" -name "*.md" | wc -l)

# Templates
cp -r "$MOWISM_SRC/mowism/templates" "$MOWISM_DEST/"

# References
cp -r "$MOWISM_SRC/mowism/references" "$MOWISM_DEST/"

# VERSION
cp "$MOWISM_SRC/mowism/VERSION" "$MOWISM_DEST/"
VERSION=$(cat "$MOWISM_DEST/VERSION")

# mow-tools.cjs
cp "$MOWISM_SRC/bin/mow-tools.cjs" "$MOWISM_DEST/bin/"

# Help files (guard for existence -- Plan 03-03 creates these)
HELP_COUNT=0
if [ -d "$MOWISM_SRC/help" ]; then
  cp -r "$MOWISM_SRC/help/" "$MOWISM_DEST/help/"
  HELP_COUNT=$(find "$MOWISM_DEST/help" -type f | wc -l)
fi

# Check dependencies (check and report, NEVER block)
echo "Checking dependencies..."
echo ""

NODE_STATUS="MISSING -- Required for mow-tools.cjs (https://nodejs.org)"
if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
  NODE_STATUS="$NODE_VERSION [OK]"
fi

WT_STATUS="MISSING -- Required for multi-worktree workflows"
if command -v wt &>/dev/null; then
  WT_VERSION=$(wt --version 2>&1 || echo "unknown")
  WT_STATUS="$WT_VERSION [OK]"
else
  WT_STATUS="MISSING -- Required for multi-worktree workflows
                     Install: yay -S worktrunk (Arch) | brew install worktrunk (macOS) | cargo install worktrunk"
fi

AT_STATUS="NOT ENABLED (optional but recommended)"
if [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" = "true" ] || [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" = "1" ]; then
  AT_STATUS="ENABLED [OK]"
else
  AT_STATUS="NOT ENABLED (optional but recommended)
                     Enable: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true
                     Or add to Claude Code settings.json:
                     { \"env\": { \"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\": \"true\" } }"
fi

# Post-install summary
echo "Mowism v$VERSION installed successfully!"
echo ""
echo "  Installed to: ~/.claude/"
echo "    Commands:  $CMD_COUNT files in commands/mow/"
echo "    Skills:    $SKILL_COUNT files in commands/"
echo "    Agents:    $AGENT_COUNT agent definitions"
echo "    Workflows: $WORKFLOW_COUNT files"
echo "    Bin:       mow-tools.cjs"
if [ "$HELP_COUNT" -gt 0 ]; then
  echo "    Help:      $HELP_COUNT files"
else
  echo "    Help:      (not yet available -- run install again after help files are created)"
fi
echo ""
echo "  Dependencies:"
echo "    Node.js:      $NODE_STATUS"
echo "    WorkTrunk:    $WT_STATUS"
echo "    Agent Teams:  $AT_STATUS"
echo ""
echo "  Get started:  /mow:new-project"
echo "  Need help:    /mow:help"
