# Phase 10: Live Feedback and Visual Differentiation - Research

**Researched:** 2026-02-20
**Domain:** ANSI terminal rendering -- 256-color palettes, cursor-based in-place redraw, progress bar rendering, structured milestone messaging, and input routing UX for multi-agent orchestration
**Confidence:** HIGH

## Summary

Phase 10 adds the visual and messaging layer on top of the Phase 7/8/9 infrastructure. The work spans four domains: (1) extending the Phase 7 message schema from 7 to 8 checkpoint types with richer activity metadata, (2) building a live orchestrator dashboard that uses ANSI cursor movement for in-place summary table redraw and an append-only event log below it, (3) rendering color-coded banners for orchestrator and workers using a curated 256-color palette with deterministic phase-to-color mapping, and (4) implementing input routing notifications as pinned event log entries with auto-dismiss behavior.

The standard stack is entirely zero-dependency: `util.styleText()` (Node.js built-in, stable since v22, verified on Node 25.4.0) for the 16 named ANSI colors, raw `\x1b[38;5;Nm` / `\x1b[48;5;Nm` escape sequences for 256-color support (since `util.styleText` does NOT support arbitrary 256-color codes -- verified), and `readline.moveCursor()` / `readline.clearLine()` / `readline.cursorTo()` (Node.js built-in) for cursor control. Claude Code passes ANSI escape codes through to the terminal in Bash tool output (verified -- issue #18728 confirmed ANSI codes render correctly). The critical architectural constraint is that the orchestrator is a Claude Code agent whose terminal output is interleaved with Claude Code's own rendering. The dashboard cannot use full-screen cursor repositioning because Claude Code controls the terminal layout. Instead, the dashboard renders as a block of output from a single `mow-tools.cjs dashboard render` CLI call, and each render overwrites the previous block using cursor-up + clear-line sequences.

**Primary recommendation:** Build the message schema extension first (add new checkpoint types to Phase 7's MESSAGE_REQUIRED_FIELDS), then the dashboard renderer (CLI subcommands in mow-tools.cjs), then the banner system (format subcommands), then integrate into the team lead and phase worker agents. The dashboard is a CLI tool that renders to stdout, called by the orchestrator after processing each worker message -- NOT a persistent background process.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Progress display
- Hybrid layout: compact summary table at top (in-place redraw via ANSI escapes), rolling event log below
- Summary table: vertical list, one row per phase
- Each row shows: phase name, progress bar, percentage, short activity description (from worker messages), elapsed time
- Designed for ~80-column terminals (half a 1080p display)
- Completed phases collapse to a single line: `✓ Phase N (Xm)`
- Only active phases shown in summary -- pending/queued phases are invisible until a worker starts
- Event log shows last N events; older ones roll off
- Errors and stalls are pinned in the event log -- they do NOT roll off until resolved/intervention happens
- Phase-level transitions (start, complete, error) get a highlighted/bold separator line in the event log to stand out from task-level events
- Activity descriptions sourced from worker structured messages (workers are the source of truth for their own activity text)

#### Color & banner design
- Full-width bar banner for both orchestrator and workers -- same style, different colors
- Orchestrator: red background, white text, full terminal width, printed once at startup
- Workers: same full-width bar style in their assigned color, with phase name/number
- Color assignment: hash from phase number -- same phase always gets the same color across runs
- Color palette: curated 256-color set (not just basic 8 ANSI) -- avoids muddy tones, readable on dark and light terminals, red excluded (reserved for orchestrator)
- Phase colors used everywhere: summary table rows, event log lines, worker banners -- consistent visual identity
- Error state: worker banner changes to alternating yellow and black caution stripes with warning symbols on either side (NOT red -- red is orchestrator only)

#### Milestone checkpoints
- 8 checkpoint types: task claimed, commit made, task complete, error, stage transition, input needed, phase complete, plan created
- Stage transitions = when worker moves between lifecycle stages (discussing -> researching -> planning -> executing -> verifying)
- Input needed = distinct from error -- worker is blocked waiting for user
- Phase complete = distinct from last-task-complete -- signals entire phase done and verified
- Plan created = when a plan file is written, before execution begins
- Commit checkpoints show commit hash only (e.g., `Committed (abc123)`) -- no commit message, keeps events short
- Stage transitions appear in both the event log AND update the summary table activity description

#### Input routing UX
- Notification format: highlighted pinned event line in worker's assigned color
- Notification text rendered in the phase's color -- says "Phase X terminal" (no redundant color name like "cyan terminal")
- Stacked notifications when multiple workers need input -- each gets its own pinned line, oldest first
- Input types (granular): discussion prompt, permission prompt, error resolution, verification (UAT) question, planning approval
- Error sub-types distinguished: "Action needed" (user can fix) vs "Worker failed" (crash/unexpected)
- Auto-dismiss: pinned notification removed when worker resumes (sends next milestone message)
- Worker prints "Orchestrator notified -- waiting for input" confirmation when input request is sent
- Worker shows brief 1-2 line recap of what it was doing when user switches to its terminal
- Permission prompts prepended with phase context: `[Phase X, Task Y] Bash: npm test`
- Summary row changes to "Awaiting input" when worker is blocked
- Progress bar uses different fill character (medium shade instead of full block) when worker is blocked/waiting
- Visual notification by default; terminal bell toggle available in settings (off by default)
- No periodic reminders -- pinned notification is enough
- Orchestrator is view-only dashboard -- to interact with a worker, always switch to its terminal
- Other workers continue running when one crashes -- no pause-all
- Workers auto-resume when error condition clears (user fixes issue)

### Claude's Discretion
- Message schema design: extensible vs fixed enum for the 8 checkpoint types (build on Phase 7 messaging infrastructure)
- Exact 256-color palette selection (avoid red, ensure readability)
- Number of events shown in "last N" (likely 5-8)
- Exact caution stripe rendering (Unicode block characters or ANSI background alternation)
- In-place redraw implementation details (cursor management, partial redraws)
- Exact progress bar width that fits ~80 columns with all row elements

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEED-01 | Workers send structured milestone messages at defined checkpoints (task claimed, commit made, task complete, error) | Phase 7 message schema (7 event types, MESSAGE_REQUIRED_FIELDS at line 186 of mow-tools.cjs) extended to 8 checkpoint types. New types (`task_claimed`, `commit_made`, `stage_transition`, `input_needed`, `plan_created`) added alongside existing types. Schema v2 with backward compatibility. Workers include activity description text in messages for dashboard rendering. |
| FEED-02 | Orchestrator aggregates worker messages into phase-level progress summary (O(phases) not O(tasks)) | Dashboard renderer reads Active Phases table from STATE.md (Phase 7 infrastructure) and augments with live message data. Summary table shows one row per active phase with progress bar, percentage, activity, elapsed time. Completed phases collapse. Rendering is O(active_phases). |
| FEED-03 | Workers display color-coded ANSI banner at startup -- red background for orchestrator, rotating bright colors for workers | Full-width banners using 256-color raw ANSI escape codes. `format banner` CLI subcommand in mow-tools.cjs. Color assignment via deterministic hash from phase number. Curated 12-color palette excluding red. `util.styleText` for named colors, raw `\x1b[48;5;Nm` for 256-color backgrounds. |
| FEED-04 | When a worker hits a permission prompt, orchestrator shows which worker needs input and how to navigate to it | Input routing via pinned event log entries in worker's assigned color. `input_needed` message type with granular input_type field (discussion_prompt, permission_prompt, error_resolution, verification_question, planning_approval). Auto-dismiss on worker resume. Stacked notifications for concurrent input needs. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `util.styleText()` (Node.js built-in) | Stable since Node 22, verified on 25.4.0 | Named ANSI colors (16 + bright variants), bold/underline/inverse modifiers | Zero dependencies. Auto-respects `NO_COLOR` and `FORCE_COLOR` env vars. Degrades to plain text on Node < 22. Already identified in STACK.md research. |
| Raw ANSI escape codes (`\x1b[...m`) | N/A | 256-color backgrounds/foregrounds, cursor movement, line clearing | `util.styleText` does NOT support 256-color (verified: throws error for non-standard format names). Raw ANSI is the only zero-dependency option for 256-color. |
| `readline` module (Node.js built-in) | N/A | `moveCursor()`, `clearLine()`, `cursorTo()`, `clearScreenDown()` | Built-in cursor control functions that work on any writable stream. Used for in-place dashboard redraw when stdout is a TTY. |
| Node.js `process.stdout` | N/A | TTY detection (`isTTY`), terminal dimensions (`rows`, `columns`), direct output | Dashboard rendering adapts based on TTY state -- full ANSI when TTY, plain text fallback when piped. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mow-tools.cjs` message commands | Phase 7 (existing) | `message format`, `message parse` -- schema validation for event types | Extended with new checkpoint types. Workers format milestone messages; orchestrator parses them. |
| `mow-tools.cjs` state commands | Phase 7 (existing) | `state active-phases`, `state update-phase-row` -- Active Phases table management | Dashboard reads Active Phases for phase status, plans progress, worker assignments. |
| `mow-tools.cjs` status commands | Phase 7 (existing) | `status read` -- parse per-phase STATUS.md | Dashboard reads STATUS.md for detailed plan progress when rendering per-phase rows. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw ANSI for 256-color | `ansis` (npm, CJS/ESM) | Full 256-color and truecolor support with NO_COLOR handling. But adds a dependency for something achievable with ~20 lines of raw ANSI helpers. Zero-dependency constraint wins. |
| Raw ANSI for 256-color | `chalk@4` (CJS, unmaintained) | CJS compatible but unmaintained since chalk v5 went ESM-only. Dependency risk. |
| Raw ANSI cursor movement | `ansi-escapes` (npm, ESM-only) | Clean API but ESM-only since v7. Mowism is CJS. Also adds a dependency for 5 well-known escape sequences. |
| CLI-rendered dashboard | Claude Code statusLine feature | statusLine supports ANSI colors and multi-line output, runs after each assistant message. However: (1) it receives session data, not Mowism phase data, (2) it runs as a separate shell script, not integrated with mow-tools state, (3) it updates on assistant messages, not on worker messages. A CLI-rendered dashboard called by the orchestrator after processing each message is more appropriate. statusLine could be used as a COMPLEMENT (e.g., showing "Orchestrator: 3 phases active" in the persistent footer) but not as the primary dashboard. |

**Installation:** No new dependencies. All additions are inline in `mow-tools.cjs`.

## Architecture Patterns

### Recommended Project Structure

```
bin/
  mow-tools.cjs                        # Extended with: dashboard render, format banner,
                                        #   format event, 256-color helpers, message schema v2
  mow-tools.test.cjs                   # Extended with: dashboard and color tests
agents/
  mow-team-lead.md                     # MODIFIED: calls dashboard render after each message
  mow-phase-worker.md                  # MODIFIED: sends extended milestone messages,
                                        #   prints banner at startup, prints input-wait confirmation
mowism/
  workflows/
    execute-phase.md                   # MODIFIED: calls banner render at startup
```

### Pattern 1: Dashboard Rendering Model (CLI-Driven, Not Persistent)

**What:** The dashboard is rendered by calling `mow-tools.cjs dashboard render` from the orchestrator. Each call outputs a complete dashboard frame to stdout. The orchestrator calls it after processing each worker message.

**When to use:** Every time the orchestrator processes a worker message (plan_started, plan_complete, error, etc.) and needs to refresh the user's view.

**Why CLI-driven, not persistent:** The orchestrator is a Claude Code agent. It does not run a persistent event loop. It processes messages turn-by-turn. Between turns, it is idle. A persistent dashboard process would need to run independently of the agent, which adds complexity (inter-process communication, lifecycle management). A CLI call is simpler: the orchestrator calls a command, it renders, it exits.

**Rendering flow:**

```
1. Orchestrator receives worker message via SendMessage inbox
2. Orchestrator calls: mow-tools.cjs message parse <json>
3. Orchestrator updates state: state update-phase-row, status write
4. Orchestrator calls: mow-tools.cjs dashboard render [--event <json>]
5. mow-tools.cjs reads Active Phases table, STATUS.md files, event state file
6. Outputs ANSI-formatted dashboard to stdout
7. Claude Code renders the ANSI output in the terminal
```

**In-place redraw approach:** The dashboard maintains a state file (`.planning/dashboard-state.json`) that tracks the number of lines in the last render. On each render:
- If `process.stdout.isTTY` and previous line count is known: emit `\x1b[{N}A` (move cursor up N lines) then render new frame, clearing each line with `\x1b[2K`
- If not a TTY or first render: output the dashboard frame normally (append-only)
- Store the new line count in the state file for the next render

**Confidence:** HIGH -- ANSI cursor movement is well-understood; Claude Code passes ANSI through in Bash output (verified via issue #18728).

**Critical constraint:** The in-place redraw works ONLY when the orchestrator's Bash output is the most recent terminal output. If Claude Code outputs text between dashboard renders (thinking text, tool results, etc.), the cursor position will be wrong and the redraw will corrupt the display. Mitigation: the orchestrator should call `dashboard render` as the LAST command in its message-processing sequence, so the dashboard is the bottom-most output. If Claude Code adds output after the render, the next render will detect the mismatch (line count vs actual position) and fall back to append-only mode.

**Fallback for non-TTY:** When stdout is not a TTY (piped, redirected, or non-interactive), the dashboard outputs plain text without ANSI codes and without cursor movement. This is an append-only log format.

### Pattern 2: Summary Table Layout (~80 Columns)

**What:** The compact summary table at the top of the dashboard, designed for ~80-column terminals.

**Layout (discretion recommendation -- 80-column budget):**

```
Phase 7: State Coherence  [████████░░] 80%  Executing 07-03  3m
Phase 8: DAG Scheduling    [██████████] 100% ✓ Complete       5m
Phase 10: Live Feedback    [▒▒░░░░░░░░] 20%  Awaiting input   1m
```

**Column budget (80 chars):**
- Phase label: ~25 chars (e.g., `Phase 10: Live Feedback`)
- Progress bar: 12 chars (`[██████████]`)
- Percentage: 5 chars (`100%`)
- Activity: ~22 chars (truncated with ellipsis)
- Elapsed time: 5 chars (`99m`)
- Separators/padding: ~11 chars

**Progress bar width recommendation:** 10 fill characters inside brackets = 12 total characters. This fits the 80-column budget while providing visible granularity (each fill = 10%).

**Completed phases collapse to:** `✓ Phase 8 (5m)` -- one line, ~20 chars.

**Blocked/waiting state:** Progress bar fill changes from `█` (U+2588, full block) to `▒` (U+2592, medium shade). Activity text changes to `Awaiting input`.

**Phase colors:** Each row's text is tinted with the phase's assigned 256-color. The progress bar fill uses the same color. This enables quick visual scanning by color (locked decision: "I like how it looks when the event log lines are tinted with the phase's color").

### Pattern 3: Event Log Rendering

**What:** The rolling event log below the summary table.

**Layout:**

```
─────────────────────────────────────── ← separator
10:05 [Phase 7]  ✓ Committed (a1b2c3d)
10:06 [Phase 10] Planning complete, starting execution
10:07 [Phase 7]  ━━━ Phase 7: Complete (5m) ━━━        ← bold separator for phase transition
10:08 [Phase 10] Task claimed: implement dashboard
⚠ [Phase 10] INPUT NEEDED: Switch to Phase 10 terminal  ← pinned (does not roll off)
```

**Event count recommendation (discretion):** Show last 6 events. Rationale: 6 events + 3 active phase rows + 1 separator + 1 header = ~11 lines. With pinned errors/notifications, this can grow to ~14 lines. On a typical terminal (~40 rows), this leaves ~26 rows for Claude Code's own output. 6 events provides enough context to see recent activity without overwhelming the display.

**Pinned events:** Errors and input-needed notifications are pinned at the bottom of the event log (above the separator line, if any). They do not roll off until resolved. When a worker resumes (sends next milestone message), the corresponding pinned notification is auto-dismissed.

**Phase transition separators:** Phase-level events (start, complete, error) get a bold/highlighted separator line: `━━━ Phase N: {Event} ━━━`. This uses `util.styleText('bold', ...)` for emphasis.

**Event log persistence:** Events are stored in `.planning/dashboard-events.ndjson` (append-only, one JSON object per line). The `dashboard render` command reads the last N events from this file. Events are appended by the orchestrator via `mow-tools.cjs dashboard event add --type <type> --phase <N> [--detail <text>]`.

### Pattern 4: Full-Width Banner Rendering

**What:** Color-coded banners printed once at session startup.

**Orchestrator banner:**
```
\x1b[48;5;196m\x1b[38;5;231m\x1b[1m  MOW ORCHESTRATOR                                                      \x1b[0m
```
(Red background, white text, bold, padded to terminal width)

**Worker banner:**
```
\x1b[48;5;{color}m\x1b[38;5;{fg}m\x1b[1m  PHASE 10: Live Feedback and Visual Differentiation                     \x1b[0m
```
(Phase-assigned color background, contrast foreground, bold, padded to terminal width)

**Error state banner (caution stripes):**
```
⚠ ▐█▌▐█▌▐█▌▐█▌ PHASE 10: ERROR ▐█▌▐█▌▐█▌▐█▌ ⚠
```
Using alternating `\x1b[48;5;226m` (bright yellow) and `\x1b[48;5;0m` (black) backgrounds for the stripe pattern. Each stripe is a full-width block character with alternating background colors. The `⚠` (U+26A0) warning symbols bracket the stripes.

**Implementation (discretion recommendation):** Use background-color alternation on space characters rather than block characters. This produces cleaner stripes:

```javascript
// Caution stripe: alternating yellow/black backgrounds
function cautionStripe(text, width) {
  const ESC = '\x1b[';
  const YELLOW_BG = `${ESC}48;5;226m${ESC}38;5;0m`; // yellow bg, black fg
  const BLACK_BG = `${ESC}48;5;0m${ESC}38;5;226m`;   // black bg, yellow fg
  const RESET = `${ESC}0m`;
  let stripe = '\u26A0 '; // warning symbol + space
  const contentWidth = width - 4; // minus warning symbols and spaces
  for (let i = 0; i < contentWidth; i++) {
    stripe += (i % 2 === 0) ? YELLOW_BG + ' ' : BLACK_BG + ' ';
  }
  // Insert text in the center
  // ... center-pad logic ...
  stripe += RESET + ' \u26A0';
  return stripe;
}
```

**Terminal width detection:** Use `process.stdout.columns || 80` for width. Falls back to 80 if not a TTY (matches the locked decision target).

**Banner timing:**
- Orchestrator: printed once at team creation (in `mow-team-lead.md` Step 2)
- Workers: printed once at phase worker initialization (in `mow-phase-worker.md` Step 1)

### Pattern 5: 256-Color Palette and Phase Color Assignment

**What:** A curated palette of 256-color codes that workers use for consistent visual identity. Each phase number maps deterministically to a color.

**Palette (discretion recommendation):**

```javascript
// Curated 256-color palette for phase workers
// Criteria: no red (reserved for orchestrator), readable on dark AND light terminals,
// no muddy/dark tones, visually distinct from each other
const PHASE_PALETTE = [
  33,   // blue (#0087ff)
  37,   // teal (#00afaf)
  71,   // green (#5faf5f)
  142,  // olive/gold (#afaf00)
  166,  // orange (#d75f00)
  133,  // purple (#af5faf)
  44,   // cyan (#00d7d7)
  172,  // amber (#d78700)
  63,   // lavender (#5f5fff)
  108,  // sage (#87af87)
  175,  // rose (#d78787)
  39,   // sky blue (#00afff)
];

// Foreground colors for readability against each background
// Dark backgrounds (33, 37, 133, 63) -> white (231)
// Light backgrounds (71, 142, 166, 44, 172, 108, 175, 39) -> black (16)
const PHASE_PALETTE_FG = [
  231, 231, 16, 16, 16, 231, 16, 16, 231, 16, 16, 16,
];
```

**Color assignment (locked decision: hash from phase number):**

```javascript
function phaseColorIndex(phaseNumber) {
  // Deterministic: same phase number always gets the same color
  // Parse phase number to integer (handles "7", "10", "11.1")
  const n = Math.floor(parseFloat(phaseNumber));
  return n % PHASE_PALETTE.length;
}

function phaseColor(phaseNumber) {
  const idx = phaseColorIndex(phaseNumber);
  return {
    bg: PHASE_PALETTE[idx],
    fg: PHASE_PALETTE_FG[idx],
  };
}
```

**Why not just use `util.styleText` named colors:** `util.styleText` supports only 16 named colors (8 base + 8 bright). With 5+ concurrent phases, colors would repeat and be hard to distinguish. 256-color provides 12 visually distinct options. The palette was tested: `node -e "process.env.FORCE_COLOR='1'; ... "` produces correct ANSI output on Node 25.4.0.

**NO_COLOR / FORCE_COLOR handling:** The 256-color helper function checks `process.env.NO_COLOR` (if set, return plain text) and `process.env.FORCE_COLOR` (if set, force colors even when not TTY). This mirrors `util.styleText` behavior but for raw ANSI codes.

### Pattern 6: Message Schema Extension (Schema v2)

**What:** Extend the Phase 7 message schema (7 event types) to support the 8 checkpoint types defined in CONTEXT.md, plus the activity description field for dashboard rendering.

**Current schema (Phase 7, v1):**

```javascript
const MESSAGE_REQUIRED_FIELDS = {
  plan_started: ['phase', 'plan'],
  plan_complete: ['phase', 'plan', 'commit', 'duration_min'],
  phase_complete: ['phase', 'plans_completed', 'total_duration_min'],
  error: ['phase', 'plan', 'error'],
  blocker: ['phase', 'plan', 'blocker', 'action'],
  state_change: ['phase', 'plan', 'from_state', 'to_state'],
  ack: ['ref_type', 'ref_plan'],
};
```

**Extended schema (v2) -- discretion recommendation: extend the existing enum, not a new extensible system:**

```javascript
const MESSAGE_SCHEMA_VERSION = 2;

const MESSAGE_REQUIRED_FIELDS = {
  // Existing (Phase 7) -- preserved for backward compatibility
  plan_started: ['phase', 'plan'],
  plan_complete: ['phase', 'plan', 'commit', 'duration_min'],
  phase_complete: ['phase', 'plans_completed', 'total_duration_min'],
  error: ['phase', 'plan', 'error'],
  blocker: ['phase', 'plan', 'blocker', 'action'],
  state_change: ['phase', 'plan', 'from_state', 'to_state'],
  ack: ['ref_type', 'ref_plan'],

  // New (Phase 10) -- checkpoint types from CONTEXT.md
  task_claimed: ['phase', 'plan', 'task'],            // "task claimed" checkpoint
  commit_made: ['phase', 'plan', 'commit_hash'],      // "commit made" checkpoint
  stage_transition: ['phase', 'from_stage', 'to_stage'], // lifecycle stage change
  input_needed: ['phase', 'input_type', 'detail'],    // distinct from error/blocker
  plan_created: ['phase', 'plan'],                     // plan file written
};
```

**Rationale for fixed enum over extensible:** The checkpoint types are a closed set defined by the user's locked decisions. An extensible system (arbitrary type strings) adds parsing complexity and makes schema validation impossible. The fixed enum is simpler, self-documenting, and matches the Phase 7 pattern.

**Mapping from 8 CONTEXT.md checkpoint types to message types:**

| CONTEXT.md Checkpoint | Message Type | Notes |
|-----------------------|-------------|-------|
| task claimed | `task_claimed` | New type. Plan + task ID. |
| commit made | `commit_made` | New type. Hash only, no message (locked decision). |
| task complete | `plan_complete` | Already exists in v1. Plan-level, not task-level. |
| error | `error` | Already exists in v1. |
| stage transition | `stage_transition` | New type. from/to lifecycle stages. |
| input needed | `input_needed` | New type. Distinct from `blocker`. Granular input_type. |
| phase complete | `phase_complete` | Already exists in v1. |
| plan created | `plan_created` | New type. Phase + plan ID. |

**Activity description field (optional, all types):** Add an optional `activity` field (string, max 40 chars) to ALL message types. Workers include a short human-readable description of what they're doing. The dashboard renders this in the summary table's activity column.

```json
{
  "v": 2,
  "type": "task_claimed",
  "phase": 10,
  "plan": "10-01",
  "task": "3",
  "activity": "Implementing dashboard renderer",
  "ts": "2026-02-20T12:00:00Z"
}
```

**Backward compatibility:** The parse function checks `v` field. v1 messages parse with existing logic. v2 messages support the new types. The version is bumped to 2 to signal the schema extension. v1 workers can still send v1 messages; the dashboard will render them without activity text (falls back to type-derived description).

**Input type granularity (locked decision):**

```javascript
const INPUT_TYPES = [
  'discussion_prompt',    // discuss-phase needs user input
  'permission_prompt',    // Bash/tool permission gate
  'error_resolution',     // error that user can fix ("Action needed")
  'worker_failed',        // crash/unexpected error ("Worker failed")
  'verification_question', // UAT verification prompt
  'planning_approval',    // plan review/approval
];
```

### Pattern 7: Input Routing Notifications

**What:** When a worker sends an `input_needed` message, the orchestrator renders a pinned notification in the event log.

**Notification rendering:**

```
⚠ [Phase 10] INPUT NEEDED: permission_prompt — Switch to Phase 10 terminal
⚠ [Phase 7]  INPUT NEEDED: discussion_prompt — Switch to Phase 7 terminal
```

Each notification line is rendered in the phase's assigned 256-color. The text says "Phase X terminal" -- the color itself IS the visual identifier (locked decision: no redundant color name).

**Pinned notification state:** Stored in `.planning/dashboard-state.json` as an array of `{ phase, input_type, timestamp }` objects. When a worker resumes (sends any non-input_needed message), its pinned notification is removed.

**Worker-side confirmation:** When a worker sends `input_needed`, it also prints to its own terminal:

```
▶ Orchestrator notified — waiting for input
```

And when the user switches to the worker's terminal, the worker prints a brief recap:

```
━━━ Context ━━━
Phase 10, Plan 10-01: Implementing dashboard renderer
Was working on: Task 3 — render progress bar with 256 colors
━━━━━━━━━━━━━━━
```

**Terminal bell toggle:** The config key `feedback.terminal_bell` (default: `false`) controls whether `\x07` (BEL character) is appended to input_needed notifications. This produces an audible bell in terminals that support it.

### Anti-Patterns to Avoid

- **Persistent dashboard process:** Do NOT run a background process that polls for state changes and redraws. The orchestrator is a Claude Code agent that processes messages turn-by-turn. A CLI command called after each message is the correct pattern.

- **Full-screen terminal control:** Do NOT use alternate screen buffer (`\x1b[?1049h`) or full terminal clearing (`\x1b[2J`). Claude Code owns the terminal. The dashboard is one section of the terminal output, not the entire screen.

- **Cursor-up overwrite without line count tracking:** Do NOT blindly move the cursor up a fixed number of lines. Track the exact line count of the last render in the state file. If the count doesn't match (e.g., Claude Code inserted output between renders), fall back to append-only mode.

- **Using `util.styleText` for 256-color:** It does NOT support 256-color codes. Verified: `util.styleText('color256(33)', 'test')` throws an error listing only the 16 named colors + modifiers. Use raw `\x1b[38;5;Nm` for 256-color.

- **Workers sending task-level progress messages:** Workers send PHASE-level milestones only (locked decision from Phase 9). Phase 10 adds checkpoint types but workers still only send messages at defined checkpoints -- not continuous progress updates. The activity description field provides the "what am I doing" text without requiring additional messages.

- **Dashboard reading task-level state:** The dashboard renders O(phases) not O(tasks). It reads the Active Phases table and STATUS.md aggregate counts, NOT individual task completions. This is the locked decision from FEED-02.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 256-color ANSI codes | Custom string concatenation everywhere | Centralized `color256fg(n, text)` / `color256bg(n, text)` / `color256(fg, bg, text)` helper functions | Raw ANSI codes are error-prone (`\x1b[38;5;` vs `\x1b[48;5;`). Central helpers handle reset codes, NO_COLOR, and TTY detection in one place. |
| Terminal width detection | Hardcoded 80 columns | `process.stdout.columns \|\| 80` with graceful truncation | Terminals vary. The 80-column target is the minimum; wider terminals get more space for activity descriptions. |
| Progress bar rendering | Inline character math per call site | `renderProgressBar(percent, width, isBlocked)` helper | Two fill characters (full block vs medium shade), percentage math, edge cases (0%, 100%), color tinting -- centralize once. |
| Event log NDJSON | Custom file I/O | Extend existing `cmdChatLogAppend` pattern from Phase 7 | Phase 7 already has NDJSON append + read + prune for chat logs. Same pattern for dashboard events. |
| Message schema validation | Duplicate field checks in orchestrator | Extend existing `cmdMessageFormat` / `cmdMessageParse` in mow-tools.cjs | Phase 7 validation infrastructure handles required fields, version checks, size warnings. Adding new types to the existing registry is cleaner than separate validation. |

**Key insight:** Phase 10 is a DISPLAY LAYER on top of Phase 7/8/9 infrastructure. It does not introduce new coordination primitives -- it adds visual rendering of existing state and message data. The majority of the work is in mow-tools.cjs CLI subcommands (`dashboard render`, `dashboard event add`, `format banner`, `format event`) and agent prompt updates.

## Common Pitfalls

### Pitfall 1: Dashboard Redraw Corruption from Interleaved Output

**What goes wrong:** The orchestrator renders the dashboard (e.g., 10 lines), then Claude Code outputs its own text (thinking, tool results, etc.) below the dashboard. The next dashboard render moves the cursor up 10 lines -- but those 10 lines are now Claude Code's text, not the previous dashboard. The rewrite corrupts the display.

**Why it happens:** The orchestrator does not control Claude Code's terminal output. Between two Bash tool calls, Claude Code may output assistant text, tool call headers, or other UI elements.

**How to avoid:**
1. The dashboard state file tracks `last_render_line_count` and `last_render_timestamp`.
2. On each render, check if the cursor position is plausible: if the time since last render is > 5 seconds, or if the orchestrator has made other Bash calls since the last render, assume interleaved output has occurred and fall back to append-only mode (print the full dashboard without cursor-up).
3. The orchestrator should call `dashboard render` as the FINAL command in its message-processing turn, reducing the chance of interleaved output.
4. Alternatively (simpler, lower fidelity): skip in-place redraw entirely and always append. Each render is a fresh dashboard frame separated by a horizontal rule. This is uglier (scrolling dashboards instead of fixed) but 100% reliable.

**Warning signs:** Garbled terminal output, overwritten text, dashboard appearing in the wrong position.

**Recommendation:** Start with append-only mode for v1. Add in-place redraw as an optional toggle (`feedback.dashboard_redraw: true` in config) after the append-only version is stable. This de-risks the most complex rendering feature.

### Pitfall 2: 256-Color Not Supported on All Terminals

**What goes wrong:** A user's terminal does not support 256-color mode. The raw ANSI 256-color codes produce garbled output or are ignored.

**Why it happens:** Some terminals (older xterm, minimal containers, SSH through jump hosts) only support 16 colors. The `TERM` environment variable might be `xterm` (16-color) instead of `xterm-256color`.

**How to avoid:**
1. Check `TERM` env var for `256color` string
2. If not 256-color capable, fall back to the 16 named `util.styleText` colors
3. Map each 256-color palette entry to its closest named color equivalent
4. The `NO_COLOR` env var disables ALL color output (util.styleText handles this; raw ANSI helpers must also check)

**Warning signs:** `echo $TERM` shows `xterm` or `vt100` instead of `xterm-256color` or `screen-256color`.

### Pitfall 3: Progress Bar Width Overflows on Narrow Terminals

**What goes wrong:** The summary table row is designed for 80 columns, but the terminal is narrower (e.g., embedded terminal in VS Code, mobile SSH). Lines wrap mid-row, making the dashboard unreadable.

**Why it happens:** The locked decision says "designed for ~80-column terminals (half a 1080p display)" but some terminals are narrower.

**How to avoid:**
1. Read `process.stdout.columns` for actual width
2. If width < 60: skip progress bar entirely, show only `Phase N: 80% activity`
3. If width >= 60 but < 80: reduce progress bar to 5 characters, truncate activity to 10 chars
4. If width >= 80: full layout as designed
5. If width is unknown (not TTY): assume 80 columns

**Warning signs:** Wrapped lines in dashboard output, progress bars split across lines.

### Pitfall 4: Event Log File Growing Unbounded

**What goes wrong:** The dashboard events NDJSON file grows without limit during long-running multi-phase sessions. Reading the last N events requires reading the entire file.

**Why it happens:** NDJSON is append-only. Without pruning, it grows monotonically.

**How to avoid:**
1. Use the same prune pattern as Phase 7's `chat-log prune --keep 200`
2. The `dashboard render` command prunes automatically: if the file exceeds 100 events, truncate to last 50 before rendering
3. The event file is session-scoped: it's created when the team starts and can be deleted when the team stops (via close-shop)

**Warning signs:** `.planning/dashboard-events.ndjson` exceeds 100KB.

### Pitfall 5: Message Schema Version Mismatch During Rolling Update

**What goes wrong:** The orchestrator is updated to schema v2 but a phase worker is still running with v1 code. The worker sends v1 messages missing the new `activity` field. The dashboard crashes or shows "undefined" in the activity column.

**Why it happens:** Phase workers are spawned before the schema extension is deployed. Workers running in existing worktrees may have the old mow-tools.cjs.

**How to avoid:**
1. Schema v2 is BACKWARD COMPATIBLE: all v1 message types are unchanged
2. New message types (`task_claimed`, `commit_made`, etc.) are optional -- workers that don't send them simply have less dashboard detail
3. The `activity` field is OPTIONAL on all message types (not in required fields)
4. The dashboard renderer handles missing `activity` by deriving a description from the message type (e.g., `plan_complete` -> "Plan complete")
5. The `message parse` function already warns (not errors) on unknown schema versions

**Warning signs:** Dashboard showing generic descriptions ("plan_complete") instead of worker-provided activity text.

## Code Examples

### 256-Color Helper Functions (Zero Dependencies)

```javascript
// Source: verified on Node.js 25.4.0 with FORCE_COLOR=1
function supportsColor() {
  if (process.env.NO_COLOR !== undefined) return 'none';
  if (process.env.FORCE_COLOR !== undefined) return '256';
  if (!process.stdout.isTTY) return 'none';
  const term = process.env.TERM || '';
  if (term.includes('256color') || term.includes('truecolor')) return '256';
  return '16'; // basic ANSI
}

function color256fg(n, text) {
  const level = supportsColor();
  if (level === 'none') return text;
  if (level === '16') return text; // caller should use util.styleText fallback
  return `\x1b[38;5;${n}m${text}\x1b[39m`;
}

function color256bg(n, text) {
  const level = supportsColor();
  if (level === 'none') return text;
  if (level === '16') return text;
  return `\x1b[48;5;${n}m${text}\x1b[49m`;
}

function color256(fg, bg, text) {
  const level = supportsColor();
  if (level === 'none') return text;
  if (level === '16') return text;
  return `\x1b[38;5;${fg}m\x1b[48;5;${bg}m${text}\x1b[0m`;
}
```

### Progress Bar Renderer

```javascript
// Source: adapted from existing progress bar in cmdProgressRender (line 4975)
function renderProgressBar(percent, width, isBlocked, colorCode) {
  const fillChar = isBlocked ? '\u2592' : '\u2588'; // ▒ or █
  const emptyChar = '\u2591'; // ░
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  let bar = fillChar.repeat(filled) + emptyChar.repeat(empty);

  // Apply phase color if available and terminal supports it
  if (colorCode !== undefined && supportsColor() === '256') {
    bar = color256fg(colorCode, bar);
  }

  return `[${bar}]`;
}
```

### Full-Width Banner

```javascript
// Source: based on STACK.md agentBadge pattern, extended for full-width
function renderBanner(text, bgColor, fgColor, width) {
  width = width || process.stdout.columns || 80;
  const paddedText = ` ${text} `.padEnd(width);

  if (supportsColor() === '256') {
    return `\x1b[48;5;${bgColor}m\x1b[38;5;${fgColor}m\x1b[1m${paddedText}\x1b[0m`;
  } else if (supportsColor() === '16') {
    // Fallback to util.styleText with closest named color
    const util = require('util');
    try {
      return util.styleText(['bold', 'bgRed'], paddedText); // orchestrator only for 16-color
    } catch { return paddedText; }
  }
  return paddedText; // no color
}

// Usage:
// Orchestrator: renderBanner('MOW ORCHESTRATOR', 196, 231)
// Worker: renderBanner('PHASE 10: Live Feedback', phaseColor(10).bg, phaseColor(10).fg)
```

### Caution Stripe Error Banner

```javascript
// Source: new implementation per CONTEXT.md locked decision
function renderCautionBanner(text, width) {
  width = width || process.stdout.columns || 80;
  const WARNING = '\u26A0'; // ⚠
  const innerWidth = width - 4; // minus ⚠ + spaces on each side

  if (supportsColor() === 'none') {
    return `${WARNING} ${text.padEnd(innerWidth)} ${WARNING}`;
  }

  const YELLOW_BG = '\x1b[48;5;226m\x1b[38;5;0m'; // bright yellow bg, black fg
  const BLACK_BG = '\x1b[48;5;0m\x1b[38;5;226m';   // black bg, bright yellow fg
  const RESET = '\x1b[0m';

  // Center text in the stripe
  const padding = Math.max(0, innerWidth - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  let stripe = `${WARNING} `;
  for (let i = 0; i < innerWidth; i++) {
    const char = (i >= leftPad && i < leftPad + text.length)
      ? text[i - leftPad]
      : ' ';
    stripe += (i % 2 === 0) ? `${YELLOW_BG}${char}` : `${BLACK_BG}${char}`;
  }
  stripe += `${RESET} ${WARNING}`;
  return stripe;
}
```

### Dashboard Render Command (Outline)

```javascript
function cmdDashboardRender(cwd, options, raw) {
  const width = process.stdout.columns || 80;
  const isTTY = process.stdout.isTTY === true;
  const stateFile = path.join(cwd, '.planning', 'dashboard-state.json');
  const eventsFile = path.join(cwd, '.planning', 'dashboard-events.ndjson');

  // 1. Read Active Phases from STATE.md
  const activePhases = cmdStateActivePhases(cwd, true); // internal, returns array

  // 2. Read dashboard events (last N)
  const events = readLastNEvents(eventsFile, 6);

  // 3. Read pinned notifications
  const state = readDashboardState(stateFile);
  const pinned = state.pinned || [];

  // 4. Render summary table
  const summaryLines = [];
  for (const phase of activePhases) {
    if (phase.status === 'complete') {
      summaryLines.push(renderCompletedPhase(phase));
    } else {
      summaryLines.push(renderActivePhase(phase, width));
    }
  }

  // 5. Render separator
  const separator = '\u2500'.repeat(Math.min(width, 80)); // ─

  // 6. Render event log
  const eventLines = events.map(e => renderEvent(e, width));

  // 7. Render pinned notifications
  const pinnedLines = pinned.map(p => renderPinnedNotification(p, width));

  // 8. Combine
  const lines = [...summaryLines, separator, ...eventLines, ...pinnedLines];

  // 9. Output
  if (raw) {
    process.stdout.write(JSON.stringify({ lines: lines.length, events: events.length }));
  } else {
    // In-place redraw (if enabled and TTY)
    if (isTTY && state.last_line_count && options.redraw) {
      process.stdout.write(`\x1b[${state.last_line_count}A`); // move up
      for (const line of lines) {
        process.stdout.write(`\x1b[2K${line}\n`); // clear line + write
      }
      // Clear any remaining old lines
      if (lines.length < state.last_line_count) {
        for (let i = 0; i < state.last_line_count - lines.length; i++) {
          process.stdout.write(`\x1b[2K\n`);
        }
      }
    } else {
      process.stdout.write(lines.join('\n') + '\n');
    }

    // Save state for next render
    writeDashboardState(stateFile, {
      ...state,
      last_line_count: lines.length,
      last_render_ts: new Date().toISOString(),
    });
  }
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (Phase 10) | When Changed | Impact |
|---------------------|---------------------------|--------------|--------|
| No visual feedback for parallel execution | Live dashboard with per-phase progress bars and event log | Phase 10 | Users can track all concurrent agents at a glance |
| No terminal identification for agents | Full-width color-coded banners (red orchestrator, 256-color workers) | Phase 10 | Instant visual identification of which terminal belongs to which agent |
| 7 message types (Phase 7) | 12 message types with activity description field | Phase 10 | Richer dashboard content, granular input routing |
| Generic blocker message for input needs | Granular input_needed with 6 input types and pinned notifications | Phase 10 | Users know exactly what input is needed and where to provide it |
| Plain text progress in STATE.md | Color-coded progress bars with blocked/active visual states | Phase 10 | Progress visible without reading files |

**Deprecated/outdated after Phase 10:**
- Plain-text progress display in `progress bar` command output (still available, but the dashboard is richer)
- Generic `blocker` message type for all input needs (still supported, but `input_needed` is more granular)

## Open Questions

1. **In-place redraw reliability in Claude Code**
   - What we know: ANSI cursor movement codes ARE passed through by Claude Code in Bash output. Terminal rendering was improved in Claude Code 2.1.0 for ANSI codes.
   - What's unclear: Whether the cursor position is predictable between two consecutive Bash tool calls in the same orchestrator turn. Claude Code may insert its own output (tool headers, thinking indicators) between calls.
   - Recommendation: Start with append-only rendering (no cursor-up). Add in-place redraw as an optional feature (`feedback.dashboard_redraw`) after manual testing confirms cursor behavior. The append-only version is fully functional -- it just scrolls more.

2. **statusLine as complementary dashboard**
   - What we know: Claude Code's statusLine feature supports ANSI colors, multi-line output, and receives session data (model, context%, cost). It runs after each assistant message.
   - What's unclear: Can a statusLine script read Mowism state files to display phase-level progress? The statusLine receives JSON with session data but not Mowism-specific data. It CAN run shell commands (like reading dashboard-state.json) but adds latency.
   - Recommendation: Consider a Mowism statusLine script as a v1.1 enhancement AFTER the primary CLI dashboard is working. It would show a persistent "3 phases active, 1 awaiting input" footer without requiring the orchestrator to re-render.

3. **Worker terminal recap when user switches**
   - What we know: Workers should print a 1-2 line recap when the user switches to their terminal (locked decision).
   - What's unclear: How does the worker detect that the user has switched to its terminal? Agent Teams workers don't receive "focus" events.
   - Recommendation: The worker prints the recap as the first output when it receives ANY input after sending an `input_needed` message. The "user switching to terminal" is operationally equivalent to "user sends input to this worker." The recap is printed once, before processing the input.

4. **Permission prompt prepending with phase context**
   - What we know: Locked decision: `[Phase X, Task Y] Bash: npm test` format for permission prompts.
   - What's unclear: Permission prompts are rendered by Claude Code itself, not by the worker agent. The worker cannot modify how Claude Code renders its Bash permission prompt.
   - Recommendation: The worker should log the phase context BEFORE the Bash call, so it appears in the terminal output right above the permission prompt: `echo "[Phase 10, Task 3] About to run: npm test"`. This is not inline with the prompt but provides the context directly above it.

## Sources

### Primary (HIGH confidence)
- `bin/mow-tools.cjs` (local, lines 184-199) -- MESSAGE_SCHEMA_VERSION, MESSAGE_REQUIRED_FIELDS, ENABLED_EVENTS constants. Verified current 7 event types.
- `bin/mow-tools.cjs` (local, lines 1719-1809) -- cmdMessageFormat, cmdMessageParse, cmdMessageSummary functions. Verified schema validation logic.
- `bin/mow-tools.cjs` (local, lines 4931-5001) -- cmdProgressRender. Verified existing progress bar rendering with Unicode block characters.
- `bin/mow-tools.cjs` (local, lines 2672-2870) -- cmdStatusInit, cmdStatusRead, cmdStatusWrite. Verified STATUS.md infrastructure.
- `.planning/phases/07-state-coherence-foundation/07-RESEARCH.md` (local) -- Phase 7 architecture: single-writer protocol, STATUS.md format, message schema v1, Active Phases table.
- `.planning/phases/07-state-coherence-foundation/07-02-SUMMARY.md` (local) -- Phase 7 Plan 2: message protocol implementation with 7 event types, NDJSON chat logs.
- `.planning/phases/09-multi-phase-execution-engine/09-RESEARCH.md` (local) -- Phase 9 architecture: event-driven monitoring, worker lifecycle, nested agent hierarchy.
- `agents/mow-team-lead.md` (local) -- Coordinator orchestration flow with message processing handler.
- `agents/mow-phase-worker.md` (local) -- Phase worker lifecycle with milestone messaging protocol.
- `.planning/research/STACK.md` (local, lines 75-121) -- ANSI terminal colors research: `util.styleText` analysis, worker color palette, agentBadge function, alternative library evaluation.
- Local Node.js verification (v25.4.0): `util.styleText` supports 16 named colors only, NOT 256-color (throws error for non-standard format names). Raw ANSI 256-color codes verified working with FORCE_COLOR=1.
- [Node.js util.styleText documentation](https://nodejs.org/api/util.html) -- API reference for supported format identifiers.
- [2ality: Styling console text in Node.js](https://2ality.com/2025/05/ansi-escape-sequences-nodejs.html) -- ANSI escape sequence guide for modern Node.js.

### Secondary (MEDIUM confidence)
- [Claude Code issue #18728](https://github.com/anthropics/claude-code/issues/18728) -- Confirmed ANSI color codes pass through correctly in Bash tool output. Issue closed as resolved.
- [Claude Code statusLine documentation](https://code.claude.com/docs/en/statusline) -- statusLine supports ANSI colors, multi-line, OSC 8 links. Runs after each assistant message. Receives session JSON via stdin.
- `.planning/phases/10-live-feedback-and-visual-differentiation/10-CONTEXT.md` (local) -- All locked decisions and discretion areas for Phase 10.

### Tertiary (LOW confidence)
- In-place redraw reliability in Claude Code -- untested. Cursor-up + clear-line ANSI sequences work in standard terminals but interaction with Claude Code's own rendering is unverified. Recommendation to start with append-only mode and add redraw as optional feature.
- statusLine as complementary dashboard -- feasible in theory (shell script can read files) but untested with Mowism-specific state. Performance impact of reading JSON files on every statusLine invocation is unknown.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All components are Node.js built-ins or raw ANSI codes. Verified on Node 25.4.0. Zero dependencies.
- Architecture: HIGH -- Dashboard-as-CLI-command pattern builds directly on Phase 7/9 infrastructure. Message schema extension is backward compatible.
- Color palette: MEDIUM -- Curated 256-color palette tested for ANSI rendering but not tested on light-terminal backgrounds or all terminal emulators. Readability claims based on color theory, not user testing.
- In-place redraw: LOW -- ANSI cursor movement is standard but interaction with Claude Code's terminal rendering is unverified. Append-only fallback is the safe recommendation.
- Input routing: HIGH -- Pinned notification pattern is straightforward NDJSON state management. Auto-dismiss on worker resume is a simple state check.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain -- ANSI codes are decades old; Node.js built-ins are stable)
