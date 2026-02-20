# Phase 7: State Coherence Foundation - Research

**Researched:** 2026-02-20
**Domain:** Multi-agent shared state management -- single-writer protocol, per-phase status files, structured JSON messaging between workers and coordinator
**Confidence:** HIGH

## Summary

Phase 7 establishes the foundational state management layer that makes parallel multi-agent execution possible without merge conflicts or lost updates. The core insight is separation of write ownership: the coordinator exclusively owns STATE.md (the lightweight project index), each phase worker exclusively owns its own `phases/XX/STATUS.md` file, and structured JSON messages over Agent Teams' inbox are the communication channel between them. No entity ever writes to another entity's owned files.

The existing codebase has extensive infrastructure to build on: `mow-tools.cjs` already has state reading/writing functions (`cmdStateUpdate`, `cmdStatePatch`, `stateReplaceField`), markdown table parsing/writing utilities (`parseWorktreeTable`, `writeWorktreeTable`, `parseTeammateTable`, `writeTeammateTable`), and team management (`cmdTeamUpdate`). The work is primarily about: (1) creating a new STATUS.md file format and tooling for per-phase state, (2) restructuring STATE.md from a monolithic tracker to a lightweight index with an Active Phases table, (3) defining the JSON message schema for worker-to-coordinator communication, and (4) updating `execute-plan.md` so executors write STATUS.md instead of STATE.md directly.

**Primary recommendation:** Implement the "Hybrid Index + Lead-Writes-State" approach from ARCHITECTURE.md (Approach E). Workers write only per-phase STATUS.md files. The coordinator is the sole writer of STATE.md. Communication flows through structured JSON messages over the Agent Teams SendMessage tool. This eliminates merge conflicts entirely and aligns perfectly with Agent Teams' flat coordination model.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### Progress Granularity
- Two-tier model: workers track per-task internally in STATUS.md; coordinator sees per-plan aggregate only
- Coordinator receives plan state counts (N complete, M in progress, etc.) -- not individual task details
- Plan states are discrete: not started / in progress / complete / failed -- no percentages
- Strict ownership: one worker per phase, no worker executes another worker's plans
- Workers CAN message each other for coordination, but plan execution ownership is never shared

#### STATUS.md Content
- Primary audience is the coordinator agent -- optimized for machine parsing, not human readability
- Modeled after current STATE.md patterns but scoped to a single phase's lifecycle
- Includes commit SHAs at key milestones (plan complete, verification pass)
- Blockers logged in STATUS.md with full detail; condensed version sent to coordinator via message with pointer to STATUS.md section
- Phase-specific decisions and context live in STATUS.md; project-wide context stays in STATE.md (split by scope)

#### Message Events
- Default event set: milestones + state transitions (plan started, plan complete, phase complete, error/blocker, plus state changes like not started -> in progress)
- Ship with a commented-out milestones-only version ready to swap in if state transitions prove too chatty during live testing
- Acknowledged delivery model -- coordinator confirms receipt of messages
- Default blocker behavior: worker skips blocked task and continues with next available (higher throughput)
- Toggleable option for strict mode: worker pauses on blocker until coordinator responds
- Direct peer messaging between workers -- no coordinator relay required
- Persistent chat logs of peer messages so coordinator can audit worker-to-worker conversations

### Claude's Discretion
- STATE.md dashboard layout -- optimize for agent-readable, dense context (coordinator is the primary consumer)
- STATUS.md file discovery mechanism (explicit links in STATE.md vs convention-based path resolution)
- JSON message schema field names and structure
- Retry/timeout parameters for message acknowledgment
- Chat log storage format and location

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STATE-01 | Lead/coordinator is the sole writer of STATE.md -- workers never modify it directly | Workers communicate via structured JSON messages; coordinator updates STATE.md centrally. The `execute-plan.md` workflow's `update_current_position` step must be modified to send a message instead of calling `mow-tools.cjs state advance-plan` directly. |
| STATE-02 | Each phase worker writes to an isolated `phases/XX/STATUS.md` file with no cross-worker contention | New STATUS.md format defined below with machine-parseable sections. Workers write only to their own phase directory. Convention-based discovery: `phases/{padded_phase}-{name}/{padded_phase}-STATUS.md`. |
| STATE-03 | Workers communicate state changes to the lead via structured JSON inbox messages (<1KB, defined schema) | Message schema defined with 7 event types. All messages include version, type, phase, timestamp. Size budget: <500 bytes typical, <1KB hard limit. Uses Agent Teams SendMessage tool. |
| STATE-04 | STATE.md becomes a lightweight index that links to per-phase STATUS.md files for detail | STATE.md restructured with Active Phases table (~10-15 lines for 5 phases), replacing the single-value "Current Position" section. Per-phase detail accessible via `phases/XX/STATUS.md`. Target: STATE.md stays under 100 lines. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` (built-in) | N/A | Read/write STATUS.md, STATE.md, chat logs | Zero dependencies; mow-tools.cjs already uses `fs` extensively for all state operations |
| Node.js `path` (built-in) | N/A | Convention-based STATUS.md path resolution | Already used throughout mow-tools.cjs |
| Node.js `JSON` (built-in) | N/A | Parse/stringify structured messages, validate schema | Worker messages are JSON strings sent via SendMessage; coordinator parses with `JSON.parse` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mow-tools.cjs` state commands | Existing | State field replacement, section parsing, table read/write | Extended with new subcommands: `state active-phases`, `state update-phase-row`, `status read`, `status write`, `message format`, `message parse` |
| `mow-tools.cjs` commit helper | Existing | Git commits for STATUS.md and STATE.md changes | Workers commit STATUS.md after plan completion; coordinator commits STATE.md after index update |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown STATUS.md | JSON STATUS.json | JSON is more machine-parseable but less human-readable. Decision: use markdown to match existing patterns (STATE.md, SUMMARY.md are all markdown). Machine-readable sections use tables with consistent column formats. |
| Convention-based discovery (`phases/XX-name/XX-STATUS.md`) | Explicit links in STATE.md Active Phases table | Convention is simpler and self-maintaining. If a phase directory exists with a STATUS.md, it's discoverable without STATE.md listing it. Recommendation: use convention-based discovery with the Active Phases table as a cached view (not the source of truth for STATUS.md locations). |
| NDJSON event logs | Milestone-only messages | NDJSON was considered in STACK.md research but FEATURES.md analysis concluded event sourcing is anti-pattern for LLM agents (agents cannot efficiently replay logs). Structured messages + STATUS.md snapshots are simpler and more agent-friendly. |

**Installation:** No new dependencies. All additions are inline in `mow-tools.cjs`.

## Architecture Patterns

### Recommended Project Structure

```
.planning/
  STATE.md                              # Lightweight index (coordinator-owned)
  ROADMAP.md                            # Phase dependency graph (coordinator-owned)
  REQUIREMENTS.md                       # Requirement traceability (coordinator-owned)
  config.json                           # Project configuration
  phases/
    07-state-coherence-foundation/
      07-CONTEXT.md                     # Phase context (existing)
      07-RESEARCH.md                    # This file (existing)
      07-01-PLAN.md                     # Plan files (existing)
      07-01-SUMMARY.md                  # Plan deliverables (existing)
      07-STATUS.md                      # NEW: Per-phase live execution status (worker-owned)
    08-dag-based-phase-scheduling/
      08-STATUS.md                      # NEW: Worker-owned status for phase 8
    ...
  chat-logs/                            # NEW: Peer message audit logs
    phase-07-to-phase-08.ndjson         # Worker-to-worker conversation logs
```

### Pattern 1: Single-Writer Protocol

**What:** Only one entity writes to each file. The coordinator owns STATE.md, ROADMAP.md, REQUIREMENTS.md. Each worker owns its own `phases/XX/XX-STATUS.md`. No entity writes to another entity's files.

**When to use:** All state operations in multi-agent mode.

**Implementation in mow-tools.cjs:**

```javascript
// NEW: Write per-phase STATUS.md (worker calls this)
function cmdStatusWrite(cwd, phase, updates, raw) {
  const phaseDir = findPhaseDir(cwd, phase);
  const statusPath = path.join(phaseDir, `${padPhase(phase)}-STATUS.md`);
  // Worker writes ONLY to its own phase's status file
  // ...read existing, merge updates, write back...
}

// NEW: Read per-phase STATUS.md (coordinator or worker calls this)
function cmdStatusRead(cwd, phase, raw) {
  const phaseDir = findPhaseDir(cwd, phase);
  const statusPath = path.join(phaseDir, `${padPhase(phase)}-STATUS.md`);
  // Returns parsed status as JSON
}

// MODIFIED: Coordinator-only state update (updates Active Phases table)
function cmdStateUpdatePhaseRow(cwd, phase, fields, raw) {
  // Only coordinator calls this
  // Reads STATE.md, updates one row in Active Phases table, writes back
}
```

### Pattern 2: STATUS.md File Format (Machine-Parseable Markdown)

**What:** Per-phase status file optimized for coordinator parsing. Uses markdown tables and bold-field patterns that `mow-tools.cjs` already knows how to parse.

**Format:**

```markdown
# Phase 7: State Coherence Foundation -- Status

**Phase:** 7
**Status:** executing
**Worker:** worker-green
**Worktree:** /home/max/git/mowism.wt-phase-7
**Started:** 2026-02-20T10:00:00Z
**Last update:** 2026-02-20T10:15:00Z
**Blocker mode:** skip

## Plan Progress

| Plan | Status | Started | Duration | Commit | Tasks |
|------|--------|---------|----------|--------|-------|
| 07-01 | complete | 10:00 | 3min | a1b2c3d | 4/4 |
| 07-02 | executing | 10:05 | -- | -- | 2/5 |
| 07-03 | not started | -- | -- | -- | 0/3 |
| 07-04 | not started | -- | -- | -- | 0/4 |

## Aggregate

**Plans:** 1 complete, 1 in progress, 2 not started, 0 failed
**Commits:** a1b2c3d

## Blockers

None.

## Decisions

- Chose convention-based STATUS.md discovery over explicit links (07-01)

## Context

Phase-specific context that the coordinator should know:
- Using the hybrid index pattern from ARCHITECTURE.md
```

**Key design choices:**
- Bold-field patterns (`**Status:** executing`) match `stateExtractField()` already in mow-tools.cjs
- Plan Progress table uses the same `|`-delimited format as worktree and teammate tables
- Aggregate section gives coordinator the plan state counts it needs (locked decision: two-tier model)
- Status values are discrete strings: `not started`, `in progress`, `complete`, `failed` (locked decision: no percentages)

### Pattern 3: STATE.md Active Phases Table (Index Layout)

**What:** STATE.md's "Current Position" section is replaced with an "Active Phases" table showing all phases at a glance. The table is the coordinator's dashboard.

**Proposed STATE.md structure (under 100 lines):**

```markdown
# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** [from PROJECT.md]
**Current focus:** v1.1 parallel execution -- Phases 7+8 active

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|
| 7 | State Coherence Foundation | executing | worker-green | 1/4 | 2026-02-20T10:15 |
| 8 | DAG-Based Phase Scheduling | executing | worker-yellow | 0/3 | 2026-02-20T10:12 |
| 9 | Multi-Phase Execution Engine | blocked (7,8) | -- | 0/3 | -- |
| 10 | Live Feedback | blocked (7) | -- | 0/4 | -- |
| 11 | README Overhaul | blocked (7-10) | -- | 0/4 | -- |

**Next unblockable:** Phase 9 (waiting on: 7, 8)

## Performance Metrics

[Unchanged from v1.0 -- accumulated velocity data]

## Accumulated Context

### Decisions
[Unchanged -- project-wide decisions only]

### Blockers/Concerns
[Unchanged -- project-wide blockers only]

## Session Continuity

Last session: [date]
Stopped at: [description]
Resume: [instructions]
Context: [brief context]
```

**Size analysis:** Active Phases table = 7 lines (header + separator + 5 phase rows) + 1 metadata line = ~8 lines. Replaces Current Position's ~5 lines. Net change: +3 lines. Well within 100-line budget.

**Discovery recommendation:** Convention-based. The coordinator reads the Active Phases table for a quick summary. When it needs detail, it computes `phases/{padded}-{name}/{padded}-STATUS.md` from the phase number. No explicit links needed -- the convention is deterministic.

### Pattern 4: Structured JSON Message Schema

**What:** Workers send state change notifications as JSON strings via the Agent Teams SendMessage tool (type: "message"). The coordinator parses these to update STATE.md.

**Schema (v1):**

```json
{
  "v": 1,
  "type": "plan_started",
  "phase": 7,
  "plan": "07-02",
  "ts": "2026-02-20T10:05:00Z"
}
```

**Event types:**

| Type | When Sent | Required Fields | Optional Fields | Approx Size |
|------|-----------|-----------------|-----------------|-------------|
| `plan_started` | Worker begins executing a plan | `phase`, `plan` | -- | ~100 bytes |
| `plan_complete` | Plan finished, SUMMARY.md written | `phase`, `plan`, `commit`, `duration_min` | `decisions[]` | ~200 bytes |
| `phase_complete` | All plans in phase done | `phase`, `plans_completed`, `total_duration_min` | `summary` | ~300 bytes |
| `error` | Unrecoverable error | `phase`, `plan`, `error` | `detail` | ~300 bytes |
| `blocker` | Task blocked, worker skipping or pausing | `phase`, `plan`, `blocker`, `action` | `status_ref` | ~250 bytes |
| `state_change` | Plan status transition (e.g., not started -> in progress) | `phase`, `plan`, `from_state`, `to_state` | -- | ~150 bytes |
| `ack` | Coordinator confirms receipt | `ref_type`, `ref_plan` | -- | ~100 bytes |

All messages include `v` (schema version), `type`, `phase`, and `ts` (ISO timestamp).

**Verbose-to-lean toggle (locked decision):** Ship with state transitions enabled. The commented-out lean version would include only: `plan_complete`, `phase_complete`, `error`, `blocker` (dropping `plan_started` and `state_change`).

```javascript
// LEAN VERSION (milestones only -- uncomment to switch)
// const ENABLED_EVENTS = ['plan_complete', 'phase_complete', 'error', 'blocker', 'ack'];

// VERBOSE VERSION (milestones + state transitions -- default)
const ENABLED_EVENTS = ['plan_started', 'plan_complete', 'phase_complete', 'error', 'blocker', 'state_change', 'ack'];
```

**Acknowledged delivery (locked decision):** Coordinator sends an `ack` message back to the worker after processing each milestone message. Workers do not block on ack receipt by default (skip-and-continue mode). In strict mode, the worker pauses after sending a `blocker` message until it receives an ack.

### Pattern 5: Peer Messaging and Chat Logs

**What:** Workers can message each other directly via SendMessage without going through the coordinator. Conversations are logged to NDJSON files for coordinator audit.

**Chat log format:**

```
.planning/chat-logs/
  phase-07-to-phase-08.ndjson
```

Each line:
```json
{"from":"phase-07","to":"phase-08","ts":"2026-02-20T10:20:00Z","msg":"Need the STATUS.md schema -- can you share your format?"}
```

**Storage location:** `.planning/chat-logs/` in the main worktree. Workers append via `mow-tools.cjs chat-log append`.

**Why NDJSON:** Append-only (no read-modify-write, no merge conflicts). One line per message. `fs.appendFileSync` is atomic for writes < 4096 bytes (PIPE_BUF on Linux). Coordinator reads with `content.trim().split('\n').map(JSON.parse)`.

**Cleanup:** Chat logs are ephemeral -- deleted after milestone completion or session end.

### Anti-Patterns to Avoid

- **Workers writing STATE.md directly:** The v1.0 `execute-plan.md` workflow calls `mow-tools.cjs state advance-plan` which writes STATE.md. In v1.1, workers must send a message instead. The executor's `update_current_position` step must be changed to call `mow-tools.cjs status write` (own STATUS.md) + send a message to the coordinator.

- **Fat messages with inline content:** Messages must be <1KB. Send file paths (`status_ref: "phases/07/07-STATUS.md#Blockers"`), not file contents. The coordinator reads files on demand.

- **Polling TaskList for status:** Agent Teams delivers messages automatically. Workers send updates at milestones. The coordinator reads STATUS.md files on demand when it needs detail. Polling wastes context tokens.

- **Monolithic STATE.md with all phase details:** STATE.md is an index (~100 lines). Per-phase detail lives in STATUS.md files. If STATE.md exceeds 100 lines, phase detail has leaked into it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown table parsing | Custom parser for STATUS.md tables | Extend existing `parseWorktreeTable()` / `parseTeammateTable()` patterns | mow-tools.cjs has battle-tested table parsing at lines 5199-5222 and 5487-5509. Same `\|`-split-and-trim pattern works for Plan Progress tables. |
| Bold-field extraction | Custom regex for `**Status:** value` | Use existing `stateExtractField()` at line 1394 | Already handles the exact pattern needed for STATUS.md metadata fields. |
| Section replacement | Custom logic for replacing "Active Phases" content | Extend existing section-pattern regex from `writeWorktreeTable()` / `writeTeammateTable()` | The `## Section\n...\n(?=\n## )` pattern is established and tested. |
| JSON message formatting | Manual string concatenation | `JSON.stringify()` + field validation helper | A `cmdMessageFormat(type, fields)` function that validates required fields and returns a compact JSON string. |
| File-path-based STATUS.md discovery | Manual path assembly | `findPhaseDir()` (existing, line ~2100 area) + convention: `${padded}-STATUS.md` | `findPhaseDir()` already resolves `phases/XX-name/` from a phase number. Append the status filename. |

**Key insight:** The majority of Phase 7's tooling work is extending existing patterns in `mow-tools.cjs`, not inventing new ones. The table parsing, field extraction, and section replacement utilities already handle the exact markdown patterns that STATUS.md will use.

## Common Pitfalls

### Pitfall 1: v1.0 Executors Still Writing STATE.md

**What goes wrong:** The `execute-plan.md` workflow has an explicit `update_current_position` step (line 337) that calls `mow-tools.cjs state advance-plan` -- which directly writes STATE.md. If executors are not updated, they will write STATE.md in their worktree, causing merge conflicts and violating the single-writer protocol.

**Why it happens:** Phase 7 builds the infrastructure (STATUS.md format, message schema, new CLI commands) but does not necessarily update all consumers. The execute-plan workflow is a downstream consumer that must be modified.

**How to avoid:** Phase 7 MUST include a plan that updates `execute-plan.md` to:
1. Write `STATUS.md` instead of STATE.md directly
2. Send a structured message to the coordinator instead of calling `state advance-plan`
3. Continue to write SUMMARY.md (this is the plan deliverable, not coordinator state)

**Warning signs:** After Phase 7, run `grep -r "state advance-plan\|state update\|state patch\|state record-metric\|state add-decision" mowism/workflows/` to find any remaining direct STATE.md writers.

### Pitfall 2: STATUS.md Format Drift Between Phases

**What goes wrong:** Phase 7 defines STATUS.md format. Phase 8 (executing in parallel) creates its own STATUS.md but uses a slightly different table format or field names. The coordinator's parser breaks on Phase 8's STATUS.md.

**Why it happens:** Phase 8 runs in parallel with Phase 7. If the STATUS.md template is not committed and available before Phase 8's worker starts, the Phase 8 worker may invent its own format.

**How to avoid:** Phase 7's first plan should commit the STATUS.md template to `mowism/templates/status.md`. This template is copied to worktrees via `wt.toml`'s `cp -r .planning/` hook and is available to all subsequent phase workers.

**Warning signs:** `mow-tools.cjs status read` fails on a STATUS.md from a different phase.

### Pitfall 3: Message Schema Version Mismatch

**What goes wrong:** The coordinator expects `v: 1` messages but a worker sends `v: 2` format (or vice versa after a schema change). The coordinator's JSON parser extracts wrong fields or crashes.

**Why it happens:** Schema evolution during development. The `v` field exists for exactly this reason.

**How to avoid:** The `cmdMessageParse()` function should check `v` first. If unknown version, log a warning and attempt best-effort parsing. Never silently ignore version mismatches.

**Warning signs:** Coordinator reports "unknown message format" or extracts null/undefined values from a worker message.

### Pitfall 4: Chat Log Files Growing Without Bounds

**What goes wrong:** Workers in a long-running parallel session send hundreds of peer messages. Chat log NDJSON files grow to megabytes. The coordinator reads the entire file on audit, consuming context tokens.

**Why it happens:** Append-only files grow monotonically. No rotation or pruning mechanism.

**How to avoid:** Chat logs should be truncated or rotated after a configurable line count (default: 200 lines). The coordinator reads only the tail of the log for audit, not the full history. Add a `chat-log prune --keep 200` subcommand.

**Warning signs:** `.planning/chat-logs/` directory exceeds 1MB total.

### Pitfall 5: Acknowledged Delivery Creating Coordination Overhead

**What goes wrong:** The locked decision requires acknowledged delivery -- the coordinator sends an `ack` for every milestone message. With 4 phases x 4 plans x 2 messages per plan (started + complete), the coordinator sends 32 ack messages. Each ack consumes a coordinator turn, wasting context on "I got your message" instead of coordination logic.

**Why it happens:** The acknowledged delivery model is designed for reliability. But acks are only valuable when the sender needs confirmation to proceed (strict mode). In skip-and-continue mode, acks are informational only.

**How to avoid:** Batch acks. The coordinator should accumulate pending acks and send them in bulk at natural synchronization points (wave transitions, periodic state syncs). For skip-and-continue mode, acks can be deferred or optional. For strict mode (blocker-pause), acks are sent immediately for `blocker` messages only.

**Warning signs:** The coordinator's context is >25% ack messages. Workers re-send messages because they did not receive acks.

## Code Examples

Verified patterns from existing codebase (mow-tools.cjs source):

### Reading a Bold-Field from STATUS.md

```javascript
// Source: mow-tools.cjs line 1394 -- stateExtractField()
function stateExtractField(content, fieldName) {
  const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

// Usage for STATUS.md:
const statusContent = fs.readFileSync(statusPath, 'utf-8');
const phaseStatus = stateExtractField(statusContent, 'Status'); // "executing"
const worker = stateExtractField(statusContent, 'Worker'); // "worker-green"
```

### Parsing a Plan Progress Table from STATUS.md

```javascript
// Adapted from: mow-tools.cjs line 5199 -- parseWorktreeTable()
function parsePlanProgressTable(content) {
  const rows = [];
  const sectionMatch = content.match(
    /## Plan Progress\n[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n##|\n$|$)/
  );
  if (!sectionMatch) return rows;

  const tableBody = sectionMatch[1].trim();
  if (!tableBody) return rows;

  for (const line of tableBody.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 6) {
      rows.push({
        plan: cells[0],
        status: cells[1],
        started: cells[2],
        duration: cells[3],
        commit: cells[4],
        tasks: cells[5],
      });
    }
  }
  return rows;
}
```

### Writing the Active Phases Table in STATE.md

```javascript
// Adapted from: mow-tools.cjs line 5511 -- writeTeammateTable()
function writeActivePhasesTable(content, rows) {
  const header = `## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|`;

  const tableRows = rows.map(r =>
    `| ${r.phase} | ${r.name} | ${r.status} | ${r.worker} | ${r.plans} | ${r.last_update} |`
  ).join('\n');

  const metadata = rows.find(r => r.status.startsWith('blocked'))
    ? `\n**Next unblockable:** ${findNextUnblockable(rows)}`
    : '';

  const newSection = header + '\n' + tableRows + metadata;

  // Replace existing section
  const sectionPattern = /## Active Phases\n[\s\S]*?(?=\n## |\n$|$)/;
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, newSection);
  }

  // Insert before Performance Metrics
  const metricsPattern = /\n## Performance Metrics/;
  if (metricsPattern.test(content)) {
    return content.replace(metricsPattern, '\n' + newSection + '\n\n## Performance Metrics');
  }

  return content.trimEnd() + '\n\n' + newSection + '\n';
}
```

### Formatting a Structured Message

```javascript
// NEW: Message format helper
function cmdMessageFormat(type, fields) {
  const REQUIRED = {
    plan_started: ['phase', 'plan'],
    plan_complete: ['phase', 'plan', 'commit', 'duration_min'],
    phase_complete: ['phase', 'plans_completed', 'total_duration_min'],
    error: ['phase', 'plan', 'error'],
    blocker: ['phase', 'plan', 'blocker', 'action'],
    state_change: ['phase', 'plan', 'from_state', 'to_state'],
    ack: ['ref_type', 'ref_plan'],
  };

  const required = REQUIRED[type];
  if (!required) throw new Error(`Unknown message type: ${type}`);

  for (const field of required) {
    if (!(field in fields)) throw new Error(`Missing required field: ${field}`);
  }

  const msg = {
    v: 1,
    type,
    ts: new Date().toISOString(),
    ...fields,
  };

  const json = JSON.stringify(msg);
  if (json.length > 1024) {
    console.error(`Warning: message exceeds 1KB (${json.length} bytes)`);
  }

  return json;
}
```

### Appending to a Chat Log

```javascript
// NEW: Append peer message to NDJSON chat log
function cmdChatLogAppend(cwd, from, to, message) {
  const logDir = path.join(cwd, '.planning', 'chat-logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  // Deterministic filename: lower phase first
  const phases = [from, to].sort();
  const logPath = path.join(logDir, `${phases[0]}-to-${phases[1]}.ndjson`);

  const entry = JSON.stringify({
    from,
    to,
    ts: new Date().toISOString(),
    msg: message.slice(0, 500), // Truncate at 500 chars
  });

  fs.appendFileSync(logPath, entry + '\n', 'utf-8');
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v1.1 Phase 7) | What Changes | Impact |
|---------------------|----------------------------------|--------------|--------|
| Workers write STATE.md directly via `state advance-plan` | Workers write own STATUS.md; send messages to coordinator; coordinator writes STATE.md | Eliminates merge conflicts; enables parallel phase execution | HIGH -- foundational change |
| STATE.md has "Current Position" (single active phase) | STATE.md has "Active Phases" table (N simultaneous phases) | Tracks multiple concurrent phases | HIGH -- enables DAG execution |
| No per-phase status files | `phases/XX/XX-STATUS.md` per phase | Each phase has isolated live state | MEDIUM -- new file format |
| Workers update ROADMAP.md progress directly | Workers message coordinator; coordinator updates ROADMAP.md | Single-writer for shared files | MEDIUM -- behavior change |
| No structured messaging convention | JSON message schema v1 with 7 event types | Coordinator gets machine-parseable updates | MEDIUM -- new protocol |
| No peer messaging | Direct worker-to-worker messaging with NDJSON audit logs | Workers can coordinate without routing through coordinator | LOW -- additive feature |

**Deprecated/outdated after Phase 7:**
- `mow-tools.cjs state advance-plan` called from workers (still exists for coordinator use, but workers must not call it)
- Direct STATE.md writes from `execute-plan.md` workflow
- "Current Position" section format in STATE.md (replaced by "Active Phases")

## Agent Teams API Update

**Critical finding:** The Agent Teams API has evolved since the v1.0 research. Based on the tools available in the current Claude Code environment, the API now uses:

| v1.0 Research Reference | Current API | Notes |
|------------------------|-------------|-------|
| `Teammate({ operation: "spawnTeam", team_name: "..." })` | `TeamCreate({ team_name: "..." })` | Separate tool for team creation |
| `Teammate({ operation: "write", teammate: "...", message: "..." })` | `SendMessage({ type: "message", recipient: "...", content: "...", summary: "..." })` | Richer API with message types, summary field |
| `Teammate({ operation: "broadcast", message: "..." })` | `SendMessage({ type: "broadcast", content: "...", summary: "..." })` | Same broadcast concept, new tool name |
| `Teammate({ operation: "requestShutdown" })` | `SendMessage({ type: "shutdown_request", recipient: "..." })` | Per-teammate shutdown via SendMessage |
| `Teammate({ operation: "cleanup" })` | `TeamDelete()` | Separate cleanup tool |

**Impact on Phase 7:** The `mow-team-lead.md` agent references the old `Teammate` API. Phase 7's message protocol must use the current `SendMessage` tool. The message schema (JSON-in-string) approach still works -- `SendMessage.content` accepts a string, which can contain JSON. The `summary` field is new and useful -- it provides a 5-10 word preview without the coordinator needing to parse JSON for every message.

**Recommendation for structured messages:** Workers use `SendMessage({ type: "message", recipient: "coordinator", content: JSON.stringify(structuredMsg), summary: "Phase 7: plan 07-01 complete" })`. The `summary` field gives the coordinator a quick preview; the `content` field has the full structured JSON.

## Implementation Details by Requirement

### STATE-01: Single-Writer Protocol for STATE.md

**What changes:**
1. `execute-plan.md` workflow: Replace `state advance-plan`, `state update-progress`, `state add-decision`, and `state record-metric` calls with:
   - `status write` (update own STATUS.md)
   - SendMessage to coordinator with structured JSON
2. `mow-team-lead.md` agent: Add a "message received" handler that parses worker messages and calls `state update-phase-row` to update STATE.md
3. No changes to `cmdStateUpdate`, `cmdStatePatch`, etc. -- they still work, but only the coordinator calls them

**Backward compatibility:** In single-agent mode (no teams), the execute-plan workflow can still write STATE.md directly. The single-writer protocol is enforced by convention (workflow instructions), not by file system locks.

### STATE-02: Per-Phase STATUS.md Isolation

**New commands in mow-tools.cjs:**
- `status init <phase>` -- Create STATUS.md from template in the phase directory
- `status read <phase>` -- Parse STATUS.md and return JSON (plan progress table, metadata fields, aggregate counts)
- `status write <phase> --plan <id> --status <state> [--commit <sha>] [--duration <min>]` -- Update one plan row in STATUS.md
- `status aggregate <phase>` -- Recalculate the Aggregate section from Plan Progress table

**Template:** New file at `mowism/templates/status.md` with the format defined in Pattern 2 above.

**File discovery convention:** `phases/{padded_phase}-{slug}/{padded_phase}-STATUS.md`. The `findPhaseDir()` function (existing) resolves the directory; append `{padded}-STATUS.md` for the status file path.

### STATE-03: Structured JSON Messaging

**New commands in mow-tools.cjs:**
- `message format <type> [--field value ...]` -- Generate a valid JSON message string with schema validation
- `message parse <json>` -- Validate and extract fields from a JSON message string

**Message delivery:** Workers call `SendMessage` (Agent Teams tool) with the formatted JSON as the `content` field. The coordinator receives it via its inbox and calls `message parse` to extract structured data.

**Acknowledged delivery implementation:** After processing a milestone message, the coordinator calls `message format ack --ref-type plan_complete --ref-plan 07-01` and sends it back to the worker. Workers in skip-and-continue mode (default) do not wait for acks. Workers in strict mode (blocker scenario) wait for an ack before resuming.

### STATE-04: Lightweight STATE.md Index

**STATE.md restructuring:**
- Remove "Current Position" section (Phase/Plan/Status/Last Activity as single values)
- Add "Active Phases" table (all phases with summary status)
- Keep "Project Reference", "Performance Metrics", "Accumulated Context", "Session Continuity" sections unchanged
- Move "Worktree Assignments" to a secondary section (still useful, but Active Phases is the primary view)

**New commands in mow-tools.cjs:**
- `state active-phases` -- Parse Active Phases table, return JSON array of phase rows
- `state update-phase-row <phase> [--status <s>] [--worker <w>] [--plans <progress>] [--last-update <ts>]` -- Update one row

**Size target:** STATE.md under 100 lines. Active Phases table adds ~10 lines for 5 phases. Total STATE.md: ~60-80 lines (currently ~75 lines).

## Retry/Timeout Parameters (Discretion Area)

**Message acknowledgment:**
- Timeout: 30 seconds for ack receipt before worker marks as "unacknowledged" and continues (skip-and-continue mode)
- Retry: No automatic retry. If a worker sends a message and does not get an ack within 30s, it logs the event in STATUS.md and continues. The coordinator can detect unacknowledged messages on its next STATUS.md read.
- Strict mode timeout: 120 seconds for blocker ack. After 120s, the worker logs "coordinator unresponsive" and continues with next available task.

**Rationale:** Agent Teams message delivery is asynchronous and unverified (Q1 from API research is still INCONCLUSIVE). Conservative timeouts prevent worker deadlock while giving the coordinator enough time to process messages during high-load periods.

## Open Questions

1. **Agent Teams `SendMessage.summary` field behavior**
   - What we know: The field accepts a 5-10 word string shown as a preview in the UI
   - What's unclear: Does the coordinator receive `summary` separately from `content`? Can it use `summary` without parsing the full JSON `content`?
   - Recommendation: Include `summary` for all messages. Use it as a human-readable preview. Parse `content` for structured data. If `summary` turns out to be only cosmetic (UI preview), no harm done.

2. **Chat log write contention across worktrees**
   - What we know: Workers in separate worktrees have separate `.planning/` copies. Chat logs need to be in a shared location.
   - What's unclear: Can workers append to a chat log file in the main worktree from their own worktree? (They would need the absolute path.)
   - Recommendation: Workers include their own worktree path and the main worktree path in their context. Chat log operations use the main worktree's `.planning/chat-logs/` path. If cross-worktree writes prove problematic, workers can send chat log entries as messages to the coordinator, which appends them centrally.

3. **STATUS.md initialization timing**
   - What we know: STATUS.md needs to exist before a worker starts writing to it. The `wt.toml` hook copies `.planning/` which would include STATUS.md if it was already created.
   - What's unclear: Who creates STATUS.md for a phase? The coordinator (before assigning the phase)? The worker (on first write)? The plan-phase workflow?
   - Recommendation: `status init <phase>` creates STATUS.md from template. This is called by the coordinator when it assigns a phase to a worker (before spawning the worker). The `wt.toml` copy then brings the initialized STATUS.md to the worktree. If the worker starts before STATUS.md exists, `status write` should auto-initialize from template.

## Sources

### Primary (HIGH confidence)
- `bin/mow-tools.cjs` (6142 lines) -- State management functions (lines 1262-1610), worktree functions (lines 5142-5450), team functions (lines 5487-5664), CLI router (lines 5668+). All code patterns verified by reading source.
- `.planning/research/ARCHITECTURE.md` -- Approach E (Hybrid Index + Lead-Writes-State) is the recommended architecture. Component designs for STATE.md restructuring, per-phase STATUS.md, message protocol, and data flow.
- `.planning/phases/07-state-coherence-foundation/07-CONTEXT.md` -- All locked decisions and discretion areas.
- `.planning/research/AGENT-TEAMS-API.md` -- Message format capabilities, task system, concurrency limits. Key constraints: messages are string-based, <1KB recommended, acknowledged delivery unverified.
- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` -- Agent type tool availability (executors lack AT tools), worker environment inheritance, background mode behavior.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- NDJSON pattern for chat logs, zero-dependency constraint, `util.styleText` for future color features. Confirmed NDJSON `appendFileSync` is atomic for writes < PIPE_BUF.
- `.planning/research/PITFALLS.md` -- Pitfalls 1 (lost updates), 5 (.planning/ copies), 10 (claim races), 11 (dual task lists) directly affect Phase 7 implementation.
- `.planning/research/v1.1-FEATURES.md` -- Feature categorization (table stakes vs differentiators vs anti-features) for state coherence domain.
- `mowism/workflows/execute-plan.md` -- Current state writing patterns that must be modified (lines 337-375).
- `mowism/workflows/execute-phase.md` -- Current orchestrator flow that must be modified for multi-phase coordination.
- `agents/mow-team-lead.md` -- Current team lead agent with Teammate API references that need updating to SendMessage.
- `mowism/templates/state.md` -- Current STATE.md template that needs Active Phases table.
- `.config/wt.toml` -- WorkTrunk post-create hook that copies `.planning/`.
- Agent Teams tools available in current session (TeamCreate, SendMessage, TaskCreate, TaskUpdate, TaskList, TaskGet, TeamDelete) -- confirmed current API surface.

### Tertiary (LOW confidence)
- Chat log write contention across worktrees -- untested. Recommendation based on POSIX `appendFileSync` behavior, which is atomic for small writes but not guaranteed across NFS or other network filesystems. Local filesystem (ext4, btrfs) on this machine should be fine.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; all patterns use existing mow-tools.cjs utilities
- Architecture: HIGH -- Approach E validated in ARCHITECTURE.md with evaluation against 5 criteria; aligns with locked decisions
- Pitfalls: HIGH -- 5 pitfalls identified with specific prevention strategies; all grounded in codebase analysis
- Message schema: MEDIUM -- JSON-in-string approach is assumed to work but message delivery timing and size limits remain unverified in Agent Teams
- Agent Teams API update: MEDIUM -- Current tools (SendMessage, TeamCreate) observed in session but not yet tested with actual team operations

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- stable domain, no external dependencies changing)
