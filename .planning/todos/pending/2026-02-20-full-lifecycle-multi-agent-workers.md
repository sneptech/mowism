---
created: 2026-02-20T10:23:32.112Z
title: Full-lifecycle multi-agent workers
area: planning
files:
  - agents/mow-team-lead.md
  - mowism/workflows/execute-phase.md
  - README.md:110-132
---

## Problem

Multi-agent parallel execution currently gates on `/mow:execute-phase` — the team lead only spawns workers for the execution step. This means discuss, research, and plan phases must be done sequentially in a single orchestrator window before parallelization kicks in. For phases that are truly independent (no shared dependencies in the DAG), this wastes time: each phase's discuss/research/plan cycle takes significant time puttering away doing work that could happen in parallel.

The README now documents the correct behavior ("workers handle the full lifecycle: discuss → research → plan → execute → refine"), but the orchestration logic doesn't implement it yet.

## Solution

1. **Team lead spawns workers earlier** — after `new-project` creates the roadmap (or after resuming from a checkpoint), the team lead should analyze the DAG and immediately spawn workers for independent phases
2. **Workers run full lifecycle** — each worker autonomously handles discuss → research → plan → execute → refine for its assigned phase, not just execution
3. **Entry point shift** — the multi-agent entry point should be between "roadmap exists" and "start working on phases", not at `execute-phase`
4. **Resume awareness** — workers should pick up wherever their phase left off (e.g., if discuss is done, start at research; if planned, start at execute)
5. **DAG-gated queuing** — phases with unmet dependencies stay queued until prerequisites complete, then new workers pick them up
