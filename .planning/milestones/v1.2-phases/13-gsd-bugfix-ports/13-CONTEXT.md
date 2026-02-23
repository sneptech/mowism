# Phase 13: GSD Bugfix Ports - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 11 correctness bugs ported from GSD upstream plus add a context window monitor hook. All fixes target existing Mowism workflows and tools -- no new capabilities, just making what exists work reliably. Requirements: BUG-01 through BUG-11.

</domain>

<decisions>
## Implementation Decisions

### Context window monitoring (BUG-10)
- Thresholds: warn at 25% remaining, wrap-up at 15% remaining (tighter than GSD's 35%/25%)
- At 25%: print visible warning with remaining capacity
- At 15%: commit staged work, write handoff note to STATE.md, tell user to /clear and resume
- Scope: top-level sessions only -- do NOT monitor Task() subagents (they manage their own windows and are short-lived)
- Hook type: Claude's discretion (PostToolUse vs Notification)

### Todo lifecycle (BUG-09)
- Add in-progress/ state directory alongside pending/ and done/
- In-progress todos persist across sessions -- they do NOT auto-revert to pending on /clear
- /mow:check-todos shows in-progress items first in a separate "Currently working on" section, then pending below
- No limit on concurrent in-progress todos (worktree parallelism may have multiple active)
- Before starting a new todo, check for interference with currently in-progress todo(s) and warn if overlap detected

### Backup & safety (BUG-07)
- Backups live in `.planning/backups/` (dedicated directory)
- Backup scope: STATE.md, ROADMAP.md, and REQUIREMENTS.md together (full planning snapshot)
- Retention: keep all backups, never auto-delete
- When 5+ backups exist, suggest /mow:cleanup to the user
- --repair shows a diff of what changed between old STATE.md and regenerated version

### Guardrail strictness (BUG-05, BUG-06)
- Claude's discretion on warn-vs-block behavior for executor retry limits and workflow ordering guards

### Claude's Discretion
- Hook implementation type for context monitor (PostToolUse vs Notification)
- Guardrail strictness (warn vs hard-block for BUG-05 executor limits and BUG-06 workflow ordering guards)
- Todo file state implementation (move to in-progress/ directory vs inline marker)
- All pure-fix bugs (BUG-01 dollar sign, BUG-02 requirement IDs, BUG-03 branch timing, BUG-04 progress bar clamp, BUG-08 CLAUDE.md in subagents, BUG-11 discuss probing) -- these have clear-cut fixes from GSD upstream

</decisions>

<specifics>
## Specific Ideas

- Context monitor should feel like a natural part of the workflow, not an intrusive popup -- the wrap-up at 15% should commit progress and create a clean handoff, not just warn
- Todo interference check before starting a second todo is important for worktree parallelism -- two todos touching the same files shouldn't run concurrently
- Backup diff on --repair: user wants to see what was wrong, not just trust the regeneration

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 13-gsd-bugfix-ports*
*Context gathered: 2026-02-24*
