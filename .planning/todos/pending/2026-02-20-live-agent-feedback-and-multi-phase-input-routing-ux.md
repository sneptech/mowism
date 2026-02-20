---
created: 2026-02-20T01:18:00.000Z
title: Live agent feedback and multi-phase input routing UX
area: planning
files:
  - agents/mow-team-lead.md
  - commands/mow/team-status.md
  - commands/mow/progress.md
  - mowism/workflows/execute-phase.md
---

## Problem

The orchestrator terminal has no live visibility into what parallel agents are doing. Currently all status commands (`team-status`, `worktree-status`, `progress`) are pull-based — user has to manually run them. For a system whose core pitch is parallel multi-agent coordination, the user is mostly blind to what's happening.

Three interrelated UX gaps:

### 1. Live feedback in orchestrator terminal

The team-lead prints "Spawning 3 workers..." then goes silent until workers report back. No streaming updates, no progress indicators, no "worker-2 just finished plan 03-02" notifications. The user stares at a waiting cursor.

Need: Real-time activity feed in the orchestrator terminal showing worker starts, task claims, commits, completions, errors — as they happen.

### 2. Multi-phase parallel execution initiation

With phase-level parallelism (see sibling todo), how do independent phases actually start? Current flow is single-phase: user runs `/mow:execute-phase 3`. If phases 3, 4, and 5 are independent, does the user run three commands? Does the orchestrator detect independence and spawn all three? Does `/mow:execute-phase` accept multiple phase numbers?

Need: A way to kick off parallel-compatible phases simultaneously, either automatically (orchestrator detects from dependency graph) or explicitly (user specifies).

### 3. Input routing when parallel agents need user attention

When an agent in Phase 4 hits a checkpoint requiring user input, how does the user know and how do they respond? Options to consider:
- Orchestrator terminal flashes a notification: "Phase 4 agent is waiting for input"
- User switches to that phase's terminal to respond
- Orchestrator proxies the question and relays the answer
- All checkpoint questions surface in the orchestrator terminal with phase context

Need: Clear UX for input routing that doesn't require the user to monitor N terminals simultaneously.

## Solution

Design questions to resolve:

1. **Live feed format** — What does the activity stream look like? Timestamped log? Updating table? Split-pane view?

2. **Phase kickoff** — Single command (`/mow:execute-phases 3,4,5`)? Auto-detection from dependency graph? Or orchestrator-driven where it reads the roadmap and launches everything that can run?

3. **Input routing model** — Central (all questions come to orchestrator) vs. distributed (user switches terminals) vs. hybrid (notifications in orchestrator, interaction in worker terminal)?

4. **Agent Teams API constraints** — What does the Anthropic Agent Teams experimental API actually support? Can a lead receive streamed output from workers? Can it proxy input? These constraints shape what's possible.

5. **Terminal multiplexing** — Does this need tmux/terminal splitting? Or can Claude Code's native Agent Teams UI handle the multi-pane view?
