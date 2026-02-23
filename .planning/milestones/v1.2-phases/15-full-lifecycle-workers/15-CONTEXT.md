# Phase 15: Full-Lifecycle Workers - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase workers autonomously run the complete discuss-through-refine lifecycle with nested subagent delegation. Workers chain discuss, research, plan, execute, and refine stages sequentially per phase. Includes parallelizability validation for safe multi-worker execution. Auto-advance pipeline (`/mow:auto`) is Phase 16 — this phase builds the worker itself.

</domain>

<decisions>
## Implementation Decisions

### Discuss pause interaction
- Worker runs the full `/mow:discuss-phase` flow directly — gray area selection, deep-dive questions, the complete experience
- Worker uses AskUserQuestion directly in its own session (user sees questions from worker context)
- Worker ALSO sends a message to team lead so the orchestrator UI shows that input is needed (dual-path notification)
- CONTEXT.md creation signals "discuss done" — once CONTEXT.md exists, worker auto-continues to research
- No explicit "continue" confirmation needed after discuss

### Worker autonomy level
- Default: auto-advance all stages after discuss (research → plan → execute → refine without stopping)
- Configurable stage gates in settings:
  - `worker.stage_gates: "none"` (default) — fully autonomous after discuss
  - `worker.stage_gates: "before_execute"` — pause before execute for plan review
  - `worker.stage_gates: "every_stage"` — pause between each stage
- Subagents make best judgment on ambiguity, never escalate — decisions documented for review during refine
- Plan-checker always runs (non-negotiable quality gate)
- Refine stage (verification) configurable — runs by default, can be disabled in settings for speed
- Model routing uses existing profile system (`/mow:set-profile`) — no new per-stage model routing needed

### Progress visibility
- Workers send stage transition messages to team lead, updating the dashboard (`/mow:team-status` or `/mow:worktree-status`)
- Dashboard shows stage name + sub-progress where available (e.g., "Phase 15: executing (plan 2/5)")
- Intermediate artifact reporting and live artifact inspection: Claude's discretion on verbosity and timing

### Failure & recovery
- Failure handling strategy: Claude's discretion (retry-then-stop using existing executor retry limits is the likely approach)
- Resume uses artifact-based detection: CONTEXT.md → discuss done, RESEARCH.md → research done, PLANs → plan done, SUMMARYs → execute done — skips to first missing stage
- `/mow:pause-work` must integrate with artifact-based detection so pause state is consistent with what the worker sees on resume
- Stage fallback on plan failure: Claude's discretion (retry planning vs re-run research based on failure type)

### Parallel execution
- Workers can run in parallel across independent phases (DAG-driven)
- Phase 15 includes a parallelizability validation step — before spawning parallel workers, the system checks phase dependencies to confirm safe parallel execution
- This check should be a subagent validation that runs when phases are defined (at roadmap creation time or before worker spawn), ensuring no phase runs before its dependencies complete

### Claude's Discretion
- Whether to skip discuss for trivial/infrastructure phases (auto-generate minimal CONTEXT.md)
- Intermediate artifact reporting verbosity (stage transitions only vs stage + key artifacts)
- Live artifact inspection timing (available mid-stage vs only after stage completes)
- Failure handling strategy details (retry count, fallback to earlier stages)
- Stage fallback decisions (retry planning vs re-research based on failure type)

</decisions>

<specifics>
## Specific Ideas

- Existing model profile system (`MODEL_PROFILES` in mow-tools.cjs) already maps per-agent models — workers just pass through the profile, no new routing needed
- Existing executor retry limits from Phase 13 should be respected by worker failure handling
- DAG-based phase scheduling from Phase 8 already defines dependencies — parallel workers respect the existing DAG
- `/mow:pause-work` integration: pause state must produce artifacts consistent with what artifact-based resume detection expects

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-full-lifecycle-workers*
*Context gathered: 2026-02-24*
