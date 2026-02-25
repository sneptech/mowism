---
created: 2026-02-25T00:11:16.660Z
title: Install script hook registration in settings.json
area: tooling
files:
  - bin/install.sh:67-75
  - .claude/hooks/mow-context-monitor.sh
  - .claude/hooks/mow-inject-claude-md.sh
---

## Problem

`bin/install.sh` copies hook scripts to `~/.claude/hooks/` (line 72) but never registers them in `~/.claude/settings.json`. New installs get the hook files but no active hooks — the Stop event (context monitor) and SubagentStart event (CLAUDE.md injection) won't fire until the user manually adds entries to their settings.json.

Currently required settings.json entries that install.sh should create/merge:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/mow-context-monitor.sh" }] }],
    "SubagentStart": [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/mow-inject-claude-md.sh" }] }]
  }
}
```

## Solution

Install script should merge hook entries into `~/.claude/settings.json` using `jq` (or node via mow-tools.cjs). Must handle:
- settings.json not existing yet (create it)
- settings.json existing but with no hooks key
- settings.json existing with other hooks already registered (merge, don't overwrite)
- Idempotency — running install twice shouldn't duplicate hook entries
