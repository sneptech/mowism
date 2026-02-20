---
created: 2026-02-20T01:10:44.691Z
title: Phase-level parallelism in roadmap and execution
area: planning
files:
  - mowism/templates/roadmap.md
  - mowism/workflows/execute-phase.md
  - agents/mow-team-lead.md
  - agents/mow-roadmapper.md
---

## Problem

The roadmap currently forces all phases sequential (Phase N depends on Phase N-1). But many phases are truly independent — e.g., a marketing website (HTMX) doesn't need the core app (React Native) to be complete. This is the core differentiator of Mowism over GSD — without phase-level parallelism, worktree-aware state is just overhead on a sequential system.

Current state:
- Roadmap template has `**Depends on**: Phase N` hardwired as linear chain
- `execute-phase` only handles plan-level waves within a single phase
- `mow-team-lead` spawns workers per plan, not per phase
- No mechanism to declare phase independence or phase groups

## Solution

Need to architect:

1. **Dependency graph in roadmap** — Replace linear `Depends on: Phase N-1` with explicit dependency declarations. Phases with no shared dependencies can be marked independent. Roadmapper should analyze requirements and determine which phases genuinely depend on each other vs. which are parallel tracks.

2. **Phase groups / parallel tracks** — Allow the roadmapper to identify parallel tracks (e.g., "Core App" track: phases 1→2→3, "Website" track: phases 4→5, both starting from Phase 0: shared foundation). Visualize as a DAG, not a list.

3. **Multi-phase team coordination** — `mow-team-lead` needs to manage multiple phases executing simultaneously across worktrees, not just multiple plans within one phase. Each worktree handles its own phase (or plan), with state coherence via STATE.md.

4. **Partial dependencies** — Handle cases where Phase 5 depends on Phase 2 being complete but NOT Phase 3 or 4. The dependency graph must support arbitrary edges, not just "previous phase."

5. **STATE.md updates** — Track which phases are executing in which worktrees simultaneously. Current "Current Position" assumes one active phase.

6. **Merge coordination** — When parallel phases complete, their worktree changes need to merge cleanly. Consider: do parallel phases touch overlapping files? If so, they can't truly be parallel.
