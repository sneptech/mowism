# Phase 2: Worktree State and Quality Gates - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `.planning/` worktree-aware: track which worktree owns which phase, prevent conflicts between concurrent agents, and build `/mow:refine-phase` with tiered automated quality checks that replace manual skill chaining. WorkTrunk (`wt`) is a hard dependency.

</domain>

<decisions>
## Implementation Decisions

### WorkTrunk Dependency
- Hard requirement: Mowism refuses to init if `wt` CLI is not installed
- Check on every `/mow:*` command init, not just worktree-specific commands
- Error message shows exact install command + one-liner explaining why Mowism needs wt
- Auto-configure wt post-create hook on init if wt is installed but hook is missing
- Install script (Phase 3) should fetch and install WorkTrunk before Mowism setup

### State Tracking Design
- Phase-level lock granularity: one worktree claims an entire phase, not individual plans or waves
- Rich tracking per assignment: worktree path, phase, plan progress, timestamp, agent/session ID
- Copy+merge approach: each worktree gets its own `.planning/` copy, changes merge back to main
- Auto-release claims when phase execution completes successfully

### Conflict Behavior
- Worktree claim visibility: `/mow:progress` shows worktree summary, plus a dedicated detail command
- Both `/mow:progress` (summary) and dedicated command (detail) for worktree status

### Claude's Discretion
- Stale worktree entry handling (TTL, check-on-init, or manual release — research what's most logical for git worktree workflows)
- Conflict resolution when two agents try to claim the same phase (hard block vs warning+confirm)
- STATE.md merge strategy when copy+merge hits conflicts (auto-merge sections vs always ask)

### Refine-phase UX
- Tier selection: 4 options — Auto (recommended, Claude picks based on phase content), minimum, complex, algorithmic
- Resilient chain: quality checks flag findings and continue, don't hard-stop on failure
- Retry/continue on transient failures (API errors, etc.) — chain should recover gracefully
- Findings format: separate file per quality check, VERIFICATION-CHAIN is an index linking to each
- After `/mow:execute-phase` completes, offer to run `/mow:refine-phase` as next step (user confirms, not auto-chained)

</decisions>

<specifics>
## Specific Ideas

- User was introduced to worktrees today — keep the UX simple and obvious, don't assume worktree expertise
- The chain resilience is key: "sometimes there's something as boring as an API error that stops stuff" — graceful restart/continue on failed chain pieces

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-worktree-state-and-quality-gates*
*Context gathered: 2026-02-19*
