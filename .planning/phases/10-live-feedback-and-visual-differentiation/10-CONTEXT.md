# Phase 10: Live Feedback and Visual Differentiation - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Structured milestone messages from workers, a live orchestrator dashboard with color-coded progress, and input routing notifications so users can track parallel agents and know where to act. This phase does NOT add new lifecycle stages, modify execution logic, or change how workers do their work — it adds the visual and messaging layer on top of the Phase 7/8/9 infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Progress display
- Hybrid layout: compact summary table at top (in-place redraw via ANSI escapes), rolling event log below
- Summary table: vertical list, one row per phase
- Each row shows: phase name, progress bar, percentage, short activity description (from worker messages), elapsed time
- Designed for ~80-column terminals (half a 1080p display)
- Completed phases collapse to a single line: `✓ Phase N (Xm)`
- Only active phases shown in summary — pending/queued phases are invisible until a worker starts
- Event log shows last N events; older ones roll off
- Errors and stalls are pinned in the event log — they do NOT roll off until resolved/intervention happens
- Phase-level transitions (start, complete, error) get a highlighted/bold separator line in the event log to stand out from task-level events
- Activity descriptions sourced from worker structured messages (workers are the source of truth for their own activity text)

### Color & banner design
- Full-width bar banner for both orchestrator and workers — same style, different colors
- Orchestrator: red background, white text, full terminal width, printed once at startup
- Workers: same full-width bar style in their assigned color, with phase name/number
- Color assignment: hash from phase number — same phase always gets the same color across runs
- Color palette: curated 256-color set (not just basic 8 ANSI) — avoids muddy tones, readable on dark and light terminals, red excluded (reserved for orchestrator)
- Phase colors used everywhere: summary table rows, event log lines, worker banners — consistent visual identity
- Error state: worker banner changes to alternating yellow and black caution stripes with ⚠ warning symbols on either side (NOT red — red is orchestrator only)

### Milestone checkpoints
- 8 checkpoint types: task claimed, commit made, task complete, error, stage transition, input needed, phase complete, plan created
- Stage transitions = when worker moves between lifecycle stages (discussing → researching → planning → executing → verifying)
- Input needed = distinct from error — worker is blocked waiting for user
- Phase complete = distinct from last-task-complete — signals entire phase done and verified
- Plan created = when a plan file is written, before execution begins
- Commit checkpoints show commit hash only (e.g., `✓ Committed (abc123)`) — no commit message, keeps events short
- Stage transitions appear in both the event log AND update the summary table activity description

### Input routing UX
- Notification format: highlighted pinned event line in worker's assigned color
- Notification text rendered in the phase's color — says "Phase X terminal" (no redundant color name like "cyan terminal")
- Stacked notifications when multiple workers need input — each gets its own pinned line, oldest first
- Input types (granular): discussion prompt, permission prompt, error resolution, verification (UAT) question, planning approval
- Error sub-types distinguished: "Action needed" (user can fix) vs "Worker failed" (crash/unexpected)
- Auto-dismiss: pinned notification removed when worker resumes (sends next milestone message)
- Worker prints "▶ Orchestrator notified — waiting for input" confirmation when input request is sent
- Worker shows brief 1-2 line recap of what it was doing when user switches to its terminal
- Permission prompts prepended with phase context: `[Phase X, Task Y] Bash: npm test`
- Summary row changes to "Awaiting input" when worker is blocked
- Progress bar uses different fill character (▒ instead of █) when worker is blocked/waiting
- Visual notification by default; terminal bell toggle available in settings (off by default)
- No periodic reminders — pinned notification is enough
- Orchestrator is view-only dashboard — to interact with a worker, always switch to its terminal
- Other workers continue running when one crashes — no pause-all
- Workers auto-resume when error condition clears (user fixes issue)

### Claude's Discretion
- Message schema design: extensible vs fixed enum for the 8 checkpoint types (build on Phase 7 messaging infrastructure)
- Exact 256-color palette selection (avoid red, ensure readability)
- Number of events shown in "last N" (likely 5-8)
- Exact caution stripe rendering (Unicode block characters or ANSI background alternation)
- In-place redraw implementation details (cursor management, partial redraws)
- Exact progress bar width that fits ~80 columns with all row elements

</decisions>

<specifics>
## Specific Ideas

- Caution stripe error banner: alternating yellow and black like physical warning tape, with ⚠ on either side — not just a color change, a pattern change
- Progress bar blocked state uses ▒ (medium shade) instead of █ (full block) — visually distinct at a glance
- Completed phases collapse to `✓ Phase N (Xm)` — keeps dashboard focused on active work
- Phase color IS the terminal identifier — no need to say "cyan terminal", just render "Phase 8 terminal" in Phase 8's color
- Dashboard designed for someone with terminal snapped to half their display (~80 cols)
- "I like how it looks when the event log lines are tinted with the phase's color — quick scanning by color"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-live-feedback-and-visual-differentiation*
*Context gathered: 2026-02-20*
