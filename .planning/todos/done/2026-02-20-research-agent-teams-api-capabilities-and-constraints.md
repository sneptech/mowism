---
created: 2026-02-20T01:30:00.000Z
title: Research Agent Teams API capabilities and constraints
area: planning
files:
  - agents/mow-team-lead.md
---

## Problem

The entire multi-agent UX design (live feedback, distributed input routing, color-coded terminals, multi-phase parallel execution) depends on what the Agent Teams experimental API actually supports. This is load-bearing — if the API can't carry structured metadata in inbox messages, or if the lead can't detect worker permission prompts, or if there's no streaming output from workers, then the UX designs need to adapt to those constraints.

Currently Mowism uses Agent Teams based on assumptions about the API, not verified capabilities.

## Solution

Research and document:

1. **Inbox message format** — Can messages carry structured data (JSON)? Or free-text only? Can we encode input type, options, current mode, phase context in messages?

2. **Worker output visibility** — Can the lead agent receive streaming output from workers? Or only discrete messages? Can it detect when a worker is idle/waiting?

3. **Permission/input proxying** — When a worker hits a Claude Code permission prompt (tool use approval), does the lead know? Can it proxy the question? Or is this entirely handled by the terminal the worker runs in?

4. **Terminal spawning** — Does Agent Teams control which terminals workers spawn in? Can we assign ANSI color badges to those terminals? Or is terminal management outside Agent Teams' scope?

5. **Task system** — TaskCreate/TaskUpdate/TaskList — what's the full API? Can tasks carry metadata? Can we use task descriptions to encode structured state?

6. **Teammate operations** — Full list of Teammate operations beyond spawnTeam, requestShutdown, cleanup. Is there a way to query teammate status programmatically? Send targeted messages?

7. **Concurrency limits** — How many concurrent teammates/workers are supported? Token budget implications? Does each worker use a full context window?

8. **Stability** — This is experimental. What's the deprecation/change risk? Are there known bugs? What's the fallback if it breaks?

**Output:** A reference document at `.planning/research/AGENT-TEAMS-API.md` that all multi-agent design decisions can reference.

**This blocks:** All three sibling todos (phase-level parallelism, live feedback, distributed input routing).
