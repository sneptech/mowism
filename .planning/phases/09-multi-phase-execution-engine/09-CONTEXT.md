# Phase 9: Multi-Phase Execution Engine - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Multiple independent phases execute simultaneously across worktrees with coordinated orchestration. The team lead spawns workers for unblocked phases from the DAG, each worker autonomously runs the full plan/execute lifecycle in its own worktree, and the lead coordinates completion, merging, and error handling via structured event-driven messages.

</domain>

<decisions>
## Implementation Decisions

### Worker Lifecycle
- Workers have **full autonomy**: they run the complete /mow:discuss-phase -> /mow:plan-phase -> /mow:execute-phase cycle independently
- If a worker needs discuss-phase (user input), it **blocks and the lead notifies** the user which terminal to switch to for context gathering
- Monitoring is **event-driven only** — lead reacts to structured messages from workers (task claimed, commit made, phase complete, error), no polling
- On phase completion, workers **signal done and stay alive** — user runs a command (e.g., `/mow:close-shop`) that ensures context is saved, pending git operations are handled, and any new ideas/context are captured in planning docs (not lost)
- If new work surfaces during execution, it gets saved as context for future spawned workers (e.g., as a phase x.1 or todo), not acted on immediately
- Pause-work signal is supported: user can tell orchestrator or individual worker to pause, with state saved for future resumption

### Failure & Recovery
- On failure, **worker pauses and notifies lead** — no automatic retry. Worker stays alive for user intervention in its terminal
- Independent phases **keep executing** when one fails — only phases that depend on the failed phase get blocked
- Lead **proactively shows cascade impact**: "Phase 9 failed — this blocks Phases 10, 11. Phase 8 still running independently."
- **Circuit breaker**: configurable threshold (default 2) — if N+ workers fail, lead halts remaining workers and asks user to reassess
- Workers write **persistent checkpoint files** on failure — survives session boundaries so a new worker can pick up from exactly where the old one stopped
- On resume after fix, worker runs a **quick smoke test** on previously-completed plans before continuing from the failure point
- Lead can **gracefully cancel** a phase — worker finishes current atomic operation, stashes uncommitted changes, writes checkpoint, shuts down
- **User cancel vs timeout are distinguished**: user cancel = clean checkpoint; timeout = checkpoint + warning that work may be incomplete

### Merge Conflict Resolution
- Worker attempts auto-resolve first, then **delegates to a focused subagent** if conflicts are complex (avoids bloating the worker's context window)
- Subagent gets just the conflict diff + enough context to resolve, reports back to worker

### DAG-to-Tasks Mapping
- **Claude's Discretion**: whether to create all phase tasks upfront with DAG dependencies or incrementally by wave
- **Claude's Discretion**: whether to include already-completed phases as pre-done tasks for visibility or skip them
- User can **override the DAG** with a warning — force-start a phase even if dependencies aren't complete
- User **selects which phases to run** this session — lead presents unfinished phases, user picks subset
- If user selects phases with incomplete dependencies, show a **slightly intimidating warning** with "are you sure" confirmation dialog

### Worktree Management
- **One worktree per phase** — clean isolation, no sharing
- Merge timing: **batch at wave boundaries by default**, with toggleable option for immediate merge on completion
- Worktrees **persist until milestone is confirmed complete** — not cleaned up after merge, in case agents need to inspect them later
- Naming convention: **short numeric** — e.g., `mowism-p09`
- Worktree location: **subdirectory** — `.worktrees/p09`, `.worktrees/p10`, etc.
- **Reuse existing worktree** if one exists for a phase from a previous session (with stashed changes restored)
- Downstream phases **branch from merged main** after dependency phases merge — gets all prior work
- `.worktrees/` directory is **gitignored** — worktrees are local artifacts
- A **manifest file tracks worktree metadata** (which exist, their state) so context isn't lost if pushing/pulling across machines
- Toggle option to include worktree metadata when pushing to remote (for cross-machine continuity)

</decisions>

<specifics>
## Specific Ideas

- `/mow:close-shop` command concept: graceful shutdown that saves context, handles pending git ops, captures new ideas/context in planning docs before cleaning up — not a "wipe everything" action
- Checkpoint files should be detailed enough that a completely new worker agent in a fresh session can resume from exactly where work stopped
- The "intimidating warning" for DAG overrides should make it clear what dependencies are being skipped and what might break
- Worker-to-subagent delegation for merge conflicts: subagent is disposable, gets minimal context, reports resolution back

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-multi-phase-execution-engine*
*Context gathered: 2026-02-20*
