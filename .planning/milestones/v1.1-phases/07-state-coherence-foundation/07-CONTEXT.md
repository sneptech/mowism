# Phase 7: State Coherence Foundation - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Single-writer protocol for shared project state across parallel workers. Coordinator owns STATE.md; each phase worker owns its own STATUS.md. Workers communicate state changes via structured JSON messages. This is the state management layer — DAG scheduling, execution engine, and visual feedback are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Progress Granularity
- Two-tier model: workers track per-task internally in STATUS.md; coordinator sees per-plan aggregate only
- Coordinator receives plan state counts (N complete, M in progress, etc.) — not individual task details
- Plan states are discrete: not started / in progress / complete / failed — no percentages
- Strict ownership: one worker per phase, no worker executes another worker's plans
- Workers CAN message each other for coordination, but plan execution ownership is never shared

### STATUS.md Content
- Primary audience is the coordinator agent — optimized for machine parsing, not human readability
- Modeled after current STATE.md patterns but scoped to a single phase's lifecycle
- Includes commit SHAs at key milestones (plan complete, verification pass)
- Blockers logged in STATUS.md with full detail; condensed version sent to coordinator via message with pointer to STATUS.md section
- Phase-specific decisions and context live in STATUS.md; project-wide context stays in STATE.md (split by scope)

### Message Events
- Default event set: milestones + state transitions (plan started, plan complete, phase complete, error/blocker, plus state changes like not started → in progress)
- Ship with a commented-out milestones-only version ready to swap in if state transitions prove too chatty during live testing
- Acknowledged delivery model — coordinator confirms receipt of messages
- Default blocker behavior: worker skips blocked task and continues with next available (higher throughput)
- Toggleable option for strict mode: worker pauses on blocker until coordinator responds
- Direct peer messaging between workers — no coordinator relay required
- Persistent chat logs of peer messages so coordinator can audit worker-to-worker conversations

### Claude's Discretion
- STATE.md dashboard layout — optimize for agent-readable, dense context (coordinator is the primary consumer)
- STATUS.md file discovery mechanism (explicit links in STATE.md vs convention-based path resolution)
- JSON message schema field names and structure
- Retry/timeout parameters for message acknowledgment
- Chat log storage format and location

</decisions>

<specifics>
## Specific Ideas

- "Look at how Get Shit Done handles/writes/reads STATE.md and get inspired from that — this is largely an extension/evolution of that tool for multi-agent/parallel"
- STATE.md should show all phases (completed, active, future) — full milestone view like current STATE.md
- The verbose-to-lean toggle pattern: ship the richer version, keep the lean version commented out for easy switching
- Worker isolation is about preventing merge conflicts — agents coordinate via messages but never cross worktree boundaries for writes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-state-coherence-foundation*
*Context gathered: 2026-02-20*
