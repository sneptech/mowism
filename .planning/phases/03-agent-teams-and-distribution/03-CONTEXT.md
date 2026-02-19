# Phase 3: Agent Teams and Distribution - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add opt-in Agent Teams coordination for parallel Claude Code sessions and package Mowism for one-command install. Agent Teams is an optional layer on top of existing worktree-aware execution. Distribution makes Mowism accessible to new users via a git clone + install script.

</domain>

<decisions>
## Implementation Decisions

### Teams orchestration model
- Lead + workers model: one lead orchestrator session spawns worker sessions per worktree
- Lead tracks overall state, workers execute plans
- Lead role (monitor vs route vs hybrid): Claude's discretion based on Agent Teams API capabilities
- Each worker session prints a status banner when the user switches to it (e.g., "Worker 2: Executing 03-02-PLAN.md (task 3/5)")
- Lead session has a /mow:team-status command showing all workers and their current tasks
- Resume-work behavior with teams: Claude's discretion on whether to offer team re-spawn

### Teams opt-in nudge
- Prominent nudge at key moments: /mow:new-project and /mow:execute-phase
- Lighter tooltips between phases highlighting productivity gains of Agent Teams
- Nudge detail level: Claude's discretion (more detail at key moments, lighter for tooltips)
- Nudge tone: Claude's discretion (benefit-driven vs feature-driven depending on context)
- Persistent per-project dismiss: user can say "don't remind me" and it's saved to project config
- Always nudge once at the start of a new project or first-time brownfield setup, regardless of dismiss state

### Install experience
- Mechanism: git clone + ./install.sh (two steps, no curl|bash)
- Scope: global only (~/.claude/) — Mowism is a personal tool
- Dependencies: check and report — show what's missing (WorkTrunk, Node.js) with install instructions, continue anyway
- Post-install: summary of what was installed + what deps are missing + suggest "/mow:new-project" as first command
- Reference: GSD's post-install pattern (clean summary, point to first command, verify with /mow:help)

### ??? help system
- Behavior: open dedicated help file in $EDITOR (not the raw workflow markdown)
- Content: user-friendly help files with usage examples and flag descriptions
- Scope: Claude's discretion on which commands get ??? files (all vs main workflows only)
- Fallback when $EDITOR not set: Claude's discretion

### Claude's Discretion
- Lead orchestrator coordination strategy (monitor vs route) based on Agent Teams API
- Whether to offer team re-spawn during /mow:resume-work
- Nudge detail level and tone (context-dependent)
- Which commands get ??? help files
- $EDITOR fallback chain for ??? system

</decisions>

<specifics>
## Specific Ideas

- GSD's post-install experience as reference: clean summary, suggest first command, verify with help command
- Tooltips between phases should convey "real productivity gains" of Agent Teams — not abstract features
- Per-project dismiss ensures new projects always get one fresh nudge about Agent Teams

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-agent-teams-and-distribution*
*Context gathered: 2026-02-19*
