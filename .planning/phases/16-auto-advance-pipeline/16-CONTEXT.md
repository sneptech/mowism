# Phase 16: Auto-Advance Pipeline - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

A single `/mow:auto` command drives the entire milestone from the current phase to completion. It sets a persistent auto-advance flag, respects DAG dependencies for parallel execution, and enforces discuss-phase gates as hard pauses for user input. The orchestrator is minimal — workers do the heavy lifting in their own terminals.

</domain>

<decisions>
## Implementation Decisions

### Pipeline scope & entry
- `/mow:auto` takes no arguments — always starts from the first incomplete phase in the current milestone
- Targets full milestone completion (all phases through milestone end)
- Uses persistent `workflow.auto_advance` config flag — individual workflows (plan-phase, execute-phase) read this flag and chain to the next step
- Context window awareness is critical: when the orchestrator's context gets low, save progress to STATE.md and instruct the user to `/clear` and re-run `/mow:auto`
- On re-run, detect completed phases and show what's done/next, then confirm "Continue from phase X?" before proceeding

### Failure & recovery
- When a phase fails verification: pause the pipeline and alert the user with what failed
- No automatic retry — user decides how to proceed
- Resume path: just re-run `/mow:auto` — same command detects state and picks up where it stopped
- No separate `--resume` flag needed

### Progress & feedback
- Orchestrator output is minimal: phase start/end banners, transition announcements
- Worker agents get full verbose output in their own terminal sessions
- STATE.md updated after each phase completes — safe resume point if anything crashes
- Concurrent-safe STATE.md writes since parallel DAG phases may finish at different times
- Milestone completion shows a summary report: phases completed, total plans executed, time elapsed, and suggests `/mow:complete-milestone`

### Discuss-phase gates
- Discuss-phase runs in the worker agent's terminal — user interacts with it directly, like a normal discuss-phase session
- Orchestrator shows a notification line (e.g., "Phase X worker waiting for discuss input") while the worker blocks
- If CONTEXT.md already exists for a phase, skip discuss and move straight to research/plan
- For DAG-parallel phases, discuss gates run concurrently in separate worker terminals — user switches between them
- Hard constraint is absolute: no flag, no override can bypass the discuss pause. User input is sacred.

### Claude's Discretion
- DAG dependency enforcement: strict DAG but allow user to manually mark phases complete to unblock downstream
- Progress indicator style during auto-advance (running counter vs phase announcements)

</decisions>

<specifics>
## Specific Ideas

- The existing `workflow.auto_advance` config flag already exists in the discuss-phase and plan-phase workflows — this phase wires it into a top-level `/mow:auto` command
- Context window exhaustion is the main practical limitation of single-session pipeline runs — the save-and-instruct pattern makes this transparent
- Worker agents in worktrees handle the actual lifecycle (discuss/research/plan/execute/refine) from Phase 15 — this phase just chains them

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-auto-advance-pipeline*
*Context gathered: 2026-02-24*
