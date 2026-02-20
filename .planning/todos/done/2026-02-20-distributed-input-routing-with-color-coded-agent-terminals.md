---
created: 2026-02-20T01:25:00.000Z
title: Distributed input routing with color-coded agent terminals
area: planning
files:
  - agents/mow-team-lead.md
  - mowism/workflows/execute-phase.md
---

## Problem

When multiple agents run in parallel across terminals, the user needs to:
1. Know which terminal belongs to which agent/phase at a glance
2. Know exactly what an agent needs when it's waiting for input — not just "waiting" but WHY
3. Switch to the right terminal efficiently

Currently there's no visual differentiation between terminals and no rich notification content.

## Solution

### Color-coded terminal badges

Each agent/terminal gets a distinct ANSI background color badge (the colored background behind text, like `\033[41m` for red background). Colors must be bright/vivid enough to not blend into dark terminal backgrounds.

**Color assignments:**
- **Orchestrator (lead):** Red background — always red, always identifiable
- **Worker agents:** Rotate through a palette of clearly differentiated bright colors:
  - Green, Yellow, Blue, Magenta, Cyan, Bright White
  - If more than 6 workers, cycle with bold/dim variants
  - Never use dark colors (dark blue, dark gray, etc.)

**Badge format:** Every output line from an agent's status/banner uses its assigned color:
```
[Phase 3: API]  ← green background badge
[Phase 4: Web]  ← yellow background badge
[ORCHESTRATOR]  ← red background badge
```

### Rich notification content in orchestrator

When a worker needs input, the orchestrator notification must include:

1. **What phase/mode the agent is in:** discuss-phase, plan-phase, execute-phase, verify, etc.
2. **What kind of input is needed:**
   - Tool use permission (e.g., "wants to run `npm install`")
   - Sudo/elevated permissions ("needs sudo for X — run manually")
   - Multiple choice question ("choose layout: Cards / List / Grid")
   - Free-text input ("describe the issue you're seeing")
   - Approval gate ("checkpoint: approve plan before execution?")
   - Error/blocker ("hit error X, needs guidance")
3. **The agent's color badge** so the user knows which terminal to switch to

**Example notification in orchestrator:**
```
[Phase 4: Web]  WAITING — discuss-phase mode
                Question: "Which layout style for the landing page?"
                Options: Cards / List / Grid / Other
                → Switch to Terminal 3 (yellow)
```

**Example for permission:**
```
[Phase 3: API]  WAITING — execute-phase mode
                Tool permission: wants to run `npm install express`
                → Switch to Terminal 2 (green)
```

### Implementation considerations

- ANSI escape codes for background colors: `\033[41m` (red), `\033[42m` (green), `\033[43m` (yellow), `\033[44m` (blue), `\033[45m` (magenta), `\033[46m` (cyan)
- Reset with `\033[0m`
- Agent Teams inbox messages need to carry structured metadata (input type, options, mode) not just free text
- Color assignment should be deterministic per worktree/phase so it's consistent across sessions
- Consider: can the orchestrator detect Claude Code's permission prompts from workers? Or do workers need to explicitly message the lead when they hit a gate?
