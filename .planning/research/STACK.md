# Technology Stack

**Project:** Mowism v1.1 -- Multi-Agent State Coherence and Parallel Execution
**Researched:** 2026-02-20
**Supersedes:** v1.0 STACK.md (2026-02-19) for NEW FEATURES ONLY. v1.0 stack decisions (zero-dependency CJS, Markdown workflows, WorkTrunk, Agent Teams) remain unchanged.

## Design Principle: Zero External Dependencies

Mowism v1.0 has zero npm dependencies. Every feature uses only Node.js built-in modules (`fs`, `path`, `child_process`, `os`, `crypto`). This is not a cost-cutting measure -- it is a load-bearing architectural decision:

1. No `npm install` step means instant plugin installation
2. No `node_modules` means no version conflicts with user projects
3. Single `.cjs` file means single-file deployment
4. Claude Code guarantees Node.js is available

**v1.1 maintains this constraint.** Every new capability below uses Node.js built-ins or hand-rolled implementations. The justifications show why each external library was considered and rejected.

## Recommended Stack Additions for v1.1

### 1. DAG Dependency Resolution (Phase-Level Parallelism)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Hand-rolled topological sort with generations | N/A (inline in mow-tools.cjs) | Parse `**Depends on:**` fields in ROADMAP.md into a DAG, compute execution waves (which phases can run in parallel) | ~25 lines of Kahn's algorithm with BFS-layered generation output. Cycle detection included. No library needed. |

**What it replaces:** The current linear assumption where `currentPhase` is the first incomplete phase (line 2828 of mow-tools.cjs). The new `roadmap dag` command returns generation arrays like `[["P1","P2"], ["P3"], ["P4","P5"]]` where each generation is a set of phases that can execute in parallel.

**Implementation:** Kahn's algorithm with BFS layering. Input: node list + edge list extracted from `**Depends on:**` fields. Output: array of arrays (generations). Throws on cycles.

```javascript
// ~25 lines, verified working (see /tmp/topo-test.js)
function topoGenerations(nodes, edges) {
  const inDeg = new Map();
  const adj = new Map();
  for (const n of nodes) { inDeg.set(n, 0); adj.set(n, []); }
  for (const [from, to] of edges) {
    adj.get(from).push(to);
    inDeg.set(to, (inDeg.get(to) || 0) + 1);
  }
  const generations = [];
  let queue = [...nodes].filter(n => inDeg.get(n) === 0);
  while (queue.length > 0) {
    generations.push([...queue]);
    const next = [];
    for (const n of queue) {
      for (const nb of adj.get(n)) {
        inDeg.set(nb, inDeg.get(nb) - 1);
        if (inDeg.get(nb) === 0) next.push(nb);
      }
    }
    queue = next;
  }
  if (generations.flat().length !== nodes.length) {
    throw new Error('Cycle detected in phase dependency graph');
  }
  return generations;
}
```

**Alternatives considered and rejected:**

| Library | Why Not |
|---------|---------|
| `graph-data-structure` (v4.5.0, 57 dependents) | Adds npm dependency for ~25 lines of code. Provides shortest path, serialization, and other features we do not need. |
| `toposort` (popular, zero deps) | Returns flat sorted array, not generation groups. We need parallel execution levels, not just ordering. Would need post-processing to reconstruct generations. |
| `topological-sort-group` | Closest match -- returns generation groups. But adds a dependency for trivially implementable logic. Weekly downloads too low to trust maintenance. |
| `graphology-dag` | Full graph library with `topologicalGenerations()`. Massive overkill -- brings in the entire graphology ecosystem for one function. |

**Confidence:** HIGH -- Algorithm is textbook Kahn's with BFS layering. Verified with 4 test cases (diamond, linear, independent, complex DAG). The existing `cmdRoadmapAnalyze` already parses `**Depends on:**` fields (line 2764), so edge extraction is a minor modification.

**Integration point:** New `roadmap dag` subcommand in mow-tools.cjs. Consumes output of `cmdRoadmapAnalyze` (which already extracts `depends_on` per phase). Returns `{ generations: [...], cycle_error: null }` as JSON.

---

### 2. ANSI Terminal Colors (Agent Badge System)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `util.styleText()` | Node.js built-in (stable since v22) | Color-coded agent badges, progress indicators, status messages | Zero dependencies. Respects `NO_COLOR`, `NODE_DISABLE_COLORS`, `FORCE_COLOR` env vars automatically. Supports 16 ANSI colors + bold/italic/underline modifiers. |
| Raw ANSI escape codes (fallback) | N/A | Background color badges for tmux pane identification | `util.styleText` covers most needs, but raw `\x1b[` sequences are needed for tmux-specific OSC codes (pane title, status bar color). |

**What it replaces:** Nothing. mow-tools.cjs currently has zero ANSI output -- all terminal formatting is done by Claude Code's own rendering. The new color system is additive, used only for agent identification in multi-agent sessions.

**Color assignment scheme:**

```javascript
// Orchestrator: always red (high visibility, "command center" association)
const ORCHESTRATOR_BADGE = { bg: 'bgRed', fg: 'white', label: 'LEAD' };

// Workers: rotating bright colors (deterministic by spawn order)
const WORKER_COLORS = [
  { bg: 'bgCyan',    fg: 'black', name: 'cyan'    },
  { bg: 'bgGreen',   fg: 'black', name: 'green'   },
  { bg: 'bgYellow',  fg: 'black', name: 'yellow'  },
  { bg: 'bgMagenta', fg: 'white', name: 'magenta' },
  { bg: 'bgBlue',    fg: 'white', name: 'blue'    },
  { bg: 'bgWhite',   fg: 'black', name: 'white'   },
];

function agentBadge(agentName, colorIndex) {
  const util = require('util');
  const color = WORKER_COLORS[colorIndex % WORKER_COLORS.length];
  return util.styleText(['bold', color.bg], ` ${agentName} `);
}
```

**Verified working on Node.js v25.4.0** (this machine). `util.styleText(['bold', 'bgRed'], ' ORCHESTRATOR ')` produces correct ANSI output.

**Alternatives considered and rejected:**

| Library | Why Not |
|---------|---------|
| `chalk` (v5, ESM-only) | ESM-only since v5. Mowism is CJS. Would require `chalk@4` (CJS) which is unmaintained. Also adds a dependency. |
| `ansi-colors` (no deps, CJS) | Good library, zero dependencies, CJS compatible. But `util.styleText` does the same thing with zero dependencies AND is built into Node.js. No reason to add an npm package when the built-in works. |
| `picocolors` (tiny, fast) | Same rationale as `ansi-colors`. Marginally smaller but still an unnecessary dependency when the built-in exists. |
| Raw ANSI only (no util.styleText) | Works but loses automatic `NO_COLOR`/`FORCE_COLOR` handling. `util.styleText` respects these env vars; raw codes do not. Use raw codes only for tmux-specific OSC sequences. |

**Confidence:** HIGH -- `util.styleText` verified on Node.js 25.4.0. Available since Node.js 20.10 (experimental), stable since Node.js 22. Mowism requires Node.js >= 18 but the color feature degrades gracefully: if `util.styleText` is undefined (Node 18-20.9), badges output plain text without color. This is cosmetic, not functional.

**Integration point:** New `format badge <name> <color-index>` and `format status <message> <level>` subcommands. Used by agent prompt templates to produce colored output. Also used in `progress` output when agent teams are active.

---

### 3. File-Based State Synchronization (Multi-Agent State Coherence)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| NDJSON append-only event logs | N/A (pattern using `fs.appendFileSync`) | Per-phase event capture: task claims, completions, errors, decisions | Append-only eliminates write conflicts between concurrent agents. Each worker appends to their own phase log. No merge needed. `fs.appendFileSync` is atomic for small writes (< PIPE_BUF, typically 4096 bytes on Linux). |
| Atomic write via write-then-rename | N/A (pattern using `fs.writeFileSync` + `fs.renameSync`) | Safe updates to shared index files (STATE.md, phase status) | Only the orchestrator writes to shared state files. Temporary file + rename is atomic on POSIX filesystems. Prevents partial reads by concurrent readers. |
| Per-phase state files | N/A (directory structure convention) | Distributed state: each phase owns its own status file | `.planning/phases/XX-name/STATUS.json` per phase. Workers read/write only their own phase. Orchestrator reads all. No shared mutable file for workers. |

**What it replaces:** The current pattern where all state lives in a single `STATE.md` file that gets copied to each worktree and merged back via git. The new pattern splits state into:

```
.planning/
  STATE.md                         # Lightweight index (orchestrator-owned, ~50 lines)
  events/
    phase-01.ndjson                # Append-only event log for phase 1
    phase-02.ndjson                # Append-only event log for phase 2
    orchestrator.ndjson            # Orchestrator-level events (phase transitions, team management)
  phases/
    01-foundation/
      STATUS.json                  # Phase-level status { status, worker, started, plans_complete, ... }
    02-features/
      STATUS.json
```

**Event log format (NDJSON):**

```json
{"type":"phase_started","phase":1,"agent":"worker-1","ts":"2026-02-20T03:39:00.310Z"}
{"type":"task_claimed","phase":1,"plan":"01-01","agent":"worker-1","ts":"2026-02-20T03:39:01.000Z"}
{"type":"task_complete","phase":1,"plan":"01-01","agent":"worker-1","commit":"abc123","ts":"2026-02-20T03:39:30.000Z"}
{"type":"decision","phase":1,"agent":"worker-1","summary":"Used approach B for auth","ts":"2026-02-20T03:39:45.000Z"}
{"type":"phase_complete","phase":1,"agent":"worker-1","ts":"2026-02-20T03:40:00.000Z"}
```

**Why NDJSON over other formats:**
- Each line is independently parseable (no need to read entire file to parse)
- Append-only (no read-modify-write cycle, no merge conflicts)
- Human-readable (unlike binary formats)
- `fs.appendFileSync` writes are atomic for lines < 4096 bytes (PIPE_BUF on Linux)
- Parse with `content.trim().split('\n').map(JSON.parse)` -- zero dependencies
- Compatible with standard log tooling (`jq`, `grep`)

**Why NOT `proper-lockfile` (v4.1.2, 5 years old):**
The append-only pattern eliminates the need for file locking entirely. Workers never read-modify-write the same file. The orchestrator is the only writer to STATE.md (single-writer principle). `proper-lockfile` would add 3 transitive dependencies (`graceful-fs`, `retry`, `signal-exit`) for a problem that does not exist in this architecture.

**Why NOT SQLite (`node:sqlite` in Node 22+):**
SQLite is opaque to Claude agents. Agents read Markdown and JSON files directly. A SQLite database would require every agent prompt to include "query the database" instructions instead of "read the file." This breaks the "everything is readable text" principle that makes Mowism agent-friendly. Also, git cannot diff binary SQLite files.

**Confidence:** HIGH -- `fs.appendFileSync` and `fs.renameSync` are stable Node.js APIs. NDJSON is a well-understood pattern. Atomic rename is guaranteed on POSIX. The per-phase state split is the "Approach A: Distributed state with index" from the multi-agent state coherence todo, which was identified as the simplest approach with the best failure characteristics.

**Integration points:**
- New `event append <phase> <json>` subcommand: appends an NDJSON event line
- New `event read <phase> [--since <ts>] [--type <type>]` subcommand: reads and filters events
- New `state rebuild` subcommand: rebuilds STATE.md index from STATUS.json files and event logs
- Modified `team-update` commands: emit events in addition to updating the Agent Team Status section

---

### 4. Structured Message Protocol (Live Agent Feedback)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| JSON-in-string convention over Agent Teams inbox | N/A (prompt engineering pattern) | Structured worker-to-orchestrator messages with type, phase, status, and optional payload | Agent Teams `Teammate write` accepts a string message. By convention, workers send JSON strings that the orchestrator parses. This is not an API feature but a coordination pattern. |

**What it replaces:** Freeform prose messages from workers to the orchestrator. The current mow-team-lead.md instructs workers to "send a summary message to the lead," which produces unstructured text that fills context. The structured protocol produces compact, parseable messages.

**Message schema (convention, not enforcement):**

```json
{
  "v": 1,
  "type": "status",
  "agent": "worker-1",
  "phase": 1,
  "plan": "01-02",
  "status": "complete",
  "commit": "abc1234",
  "detail": "Implemented auth middleware, 3 tests passing"
}
```

**Message types:**

| Type | When Sent | Required Fields | Optional Fields |
|------|-----------|-----------------|-----------------|
| `claimed` | Worker claims a task | `agent`, `phase`, `plan` | -- |
| `progress` | Meaningful milestone (commit, test pass) | `agent`, `phase`, `plan`, `status` | `commit`, `detail` |
| `complete` | Task finished | `agent`, `phase`, `plan`, `status: "complete"` | `commit`, `detail`, `duration_ms` |
| `error` | Unrecoverable error | `agent`, `phase`, `plan`, `status: "error"` | `error`, `detail` |
| `blocked` | Needs user input | `agent`, `phase`, `plan`, `status: "blocked"` | `reason`, `terminal_hint` |
| `phase_done` | All plans in phase complete | `agent`, `phase`, `status: "phase_complete"` | `summary` |

**Why JSON strings and not a formal RPC:**
Agent Teams messages are LLM-to-LLM communication. The sender is a Claude Code agent that constructs a JSON string in its `Teammate write` call. The receiver is a Claude Code agent that parses it. Both sides are LLMs that understand JSON natively. A formal RPC layer would add complexity without benefit -- there is no type checking at runtime, no schema validation by Agent Teams, and the "transport" is a string field in a tool call.

**Size constraint:** Messages MUST be under 1KB. Send file paths, not file contents. Send commit hashes, not diffs. The orchestrator reads files on demand if it needs detail.

**Confidence:** MEDIUM -- The message schema is a design recommendation, not a verified API capability. The AGENT-TEAMS-API.md research (Q7) notes that message size limits are INCONCLUSIVE. The 1KB guideline is conservative and should be safe based on tool input parameter limits. JSON encoding in string messages is ASSUMED to work (never corruption-tested).

**Integration point:** Updated agent prompt templates (mow-team-lead.md, worker prompt in spawn command). New `message format <type> [fields]` helper in mow-tools.cjs that generates conforming JSON. New `message parse <json>` helper that validates against the schema and returns structured data.

---

### 5. Roadmap Format Extension (DAG Metadata)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Extended `**Depends on:**` syntax in ROADMAP.md | N/A (Markdown convention) | Express multi-phase dependencies as a DAG instead of a linear chain | The existing `**Depends on:**` field already supports free text (line 2764 of mow-tools.cjs). Extending it to support comma-separated phase references (`Phase 1, Phase 2`) and `Nothing` (root node) enables DAG construction with zero format changes. |

**Current format (already parsed):**

```markdown
### Phase 3: Feature X
**Goal:** Build feature X
**Depends on:** Phase 2
```

**Extended format (backward compatible):**

```markdown
### Phase 3: Feature X
**Goal:** Build feature X
**Depends on:** Phase 1, Phase 2
```

```markdown
### Phase 4: Feature Y
**Goal:** Build feature Y
**Depends on:** Nothing
```

**Parse changes:** The existing regex at line 2764 (`/\*\*Depends on:\*\*\s*([^\n]+)/i`) already captures the full text. New parsing logic splits on commas/`and`, extracts phase numbers, and builds an edge list for the topological sort.

```javascript
function parseDependsOn(raw) {
  if (!raw || /nothing|none|n\/a|first phase/i.test(raw)) return [];
  return raw.match(/Phase\s+(\d+(?:\.\d+)?)/gi)
    ?.map(m => m.match(/\d+(?:\.\d+)?/)[0]) || [];
}
```

**Confidence:** HIGH -- The format is backward compatible. Existing `Depends on: Phase 2` parses as `["2"]`. New `Depends on: Phase 1, Phase 2` parses as `["1", "2"]`. `Depends on: Nothing` parses as `[]`. No breaking changes to existing roadmaps.

**Integration point:** Modified `cmdRoadmapAnalyze` to include parsed dependency arrays (not just raw text). New `roadmap dag` command that combines the parsed dependencies with `topoGenerations()`.

---

## What NOT to Add

| Temptation | Why Avoid | Use Instead |
|------------|-----------|-------------|
| **npm package for DAG** (`graph-data-structure`, `toposort`) | Breaks zero-dependency constraint for 25 lines of trivially implementable code. These libraries also include features we do not need (shortest path, serialization, graph mutation). | Hand-rolled `topoGenerations()` function. |
| **npm package for colors** (`chalk`, `ansi-colors`, `picocolors`) | `util.styleText` is built into Node.js 22+. Adding a package for color output is unnecessary when the built-in exists and handles `NO_COLOR` automatically. | `util.styleText()` with raw ANSI fallback for Node < 22. |
| **npm package for file locking** (`proper-lockfile`, `lockfile`) | The append-only event log pattern eliminates write conflicts. The single-writer principle for STATE.md eliminates concurrent writes. File locking solves a problem that does not exist in the recommended architecture. | Append-only NDJSON logs + single-writer STATE.md. |
| **Database** (SQLite, LevelDB, Redis) | Opaque to LLM agents. Not git-diffable. Requires infrastructure. Breaks "everything is readable text." | JSON/NDJSON files in `.planning/`. |
| **Message queue** (Redis pub/sub, NATS, RabbitMQ) | Agent Teams inbox IS the message queue. Adding another message transport creates two sources of truth for inter-agent communication. | Agent Teams `Teammate write` with structured JSON strings. |
| **Event sourcing framework** (EventStoreDB, custom CQRS) | Over-engineered for the use case. We need append-only logs and materialized views, not full event sourcing with projections, snapshots, and replay. The NDJSON pattern gives 80% of the benefit with 5% of the complexity. | Simple NDJSON append + `state rebuild` command. |
| **WebSocket/SSE for live feedback** | There is no HTTP server. Agents communicate via Agent Teams inbox, not network protocols. | Structured inbox messages with defined checkpoints. |
| **tmux library/wrapper** | tmux integration is shell-level scripting, not a Node.js concern. Workers can set tmux pane titles via `printf '\033]2;%s\033\\' "title"`. No library needed. | Raw escape sequences in worker spawn prompts. |
| **JSON Schema validation** (ajv, zod) | Message schema is a convention between LLM agents, not a type boundary. Agents that cannot produce valid JSON have bigger problems than schema validation. Keep it simple: `JSON.parse()` + field presence checks. | Manual field validation in `message parse`. |

## Version Compatibility

| Component | Minimum for v1.1 | System Version | Notes |
|-----------|-------------------|----------------|-------|
| Node.js | 22.x (for `util.styleText` stable) | 25.4.0 | `util.styleText` experimental in 20.10, stable in 22. Color badges degrade to plain text on Node < 22. Core functionality (DAG, events, state) works on Node >= 18. |
| Claude Code | 2.1.x | Latest | Agent Teams experimental feature required for multi-agent. |
| WorkTrunk | 0.25.0 | 0.25.0 | No new requirements from v1.1. |
| Git | 2.20 | System | No new requirements from v1.1. |

## Integration Summary

All v1.1 additions integrate into the existing `mow-tools.cjs` file as new command groups:

| New Command Group | Lines (est.) | Dependencies | Tests Needed |
|-------------------|--------------|--------------|--------------|
| `roadmap dag` | ~50 | `topoGenerations()` inline | Cycle detection, linear chain, diamond, independent, complex DAG |
| `event append/read` | ~60 | `fs.appendFileSync`, `JSON.parse` | Append atomicity, filter by type/time, empty log, malformed lines |
| `state rebuild` | ~80 | Reads STATUS.json + events, writes STATE.md | Empty state, partial data, stale events |
| `format badge/status` | ~40 | `util.styleText` | Color output, NO_COLOR respect, Node < 22 fallback |
| `message format/parse` | ~30 | `JSON.stringify/parse` | All message types, oversized message warning, malformed input |
| Extended `roadmap analyze` | ~20 (modification) | `parseDependsOn()` inline | Comma-separated deps, "Nothing", backward compat with single dep |

**Total estimated additions:** ~280 lines of new code in mow-tools.cjs, plus ~200 lines of tests.

**Zero new files outside mow-tools.cjs** for the tooling layer. The state architecture creates new directories (`.planning/events/`, STATUS.json files) at runtime, not at install time.

## Sources

- [Node.js util.styleText documentation](https://nodejs.org/api/util.html) -- `util.styleText` API reference. Stable since Node.js 22. Supports modifiers, foreground colors, background colors. Respects NO_COLOR.
- [Node.js fs documentation](https://nodejs.org/api/fs.html) -- `appendFileSync`, `writeFileSync`, `renameSync` atomicity guarantees on POSIX.
- [2ality: Styling console text in Node.js](https://2ality.com/2025/05/ansi-escape-sequences-nodejs.html) -- Comprehensive guide to ANSI escape sequences and `util.styleText` in modern Node.js.
- [NDJSON specification](https://ndjson.com/definition/) -- Newline Delimited JSON format definition. One JSON value per line, separated by `\n`.
- [graph-data-structure npm](https://www.npmjs.com/package/graph-data-structure) -- v4.5.0, 57 dependents. Evaluated and rejected (unnecessary dependency).
- [toposort npm](https://www.npmjs.com/package/toposort) -- Popular topological sort. Evaluated and rejected (returns flat array, not generations).
- [topological-sort-group npm](https://www.npmjs.com/package/topological-sort-group) -- Returns generation groups. Evaluated and rejected (unnecessary dependency for ~25 lines of code).
- [proper-lockfile npm](https://www.npmjs.com/package/proper-lockfile) -- v4.1.2, last published 5 years ago. Evaluated and rejected (append-only pattern eliminates need for locking).
- [write-file-atomic npm](https://github.com/npm/write-file-atomic) -- Atomic file writes. Evaluated and rejected (write-then-rename pattern achieves same result with zero deps).
- [Mowism Agent Teams API research](file:///home/max/git/mowism/.planning/research/AGENT-TEAMS-API.md) -- Message format, worker output visibility, task system, concurrency limits.
- [Mowism Agent Teams API runtime tests](file:///home/max/git/mowism/.planning/research/AGENT-TEAMS-API-RUNTIME.md) -- Tool availability per agent type, context window exhaustion risk.
- [Mowism multi-agent state coherence todo](file:///home/max/git/mowism/.planning/todos/pending/2026-02-20-multi-agent-state-coherence-architecture.md) -- Problem statement, candidate approaches, research questions.
- Local verification: `/tmp/topo-test.js` (topological sort with generations), `/tmp/ansi-test.js` (util.styleText colors), `/tmp/ndjson-test.js` (NDJSON append + atomic write).

---
*Stack research for: Mowism v1.1 -- Multi-Agent State Coherence and Parallel Execution*
*Researched: 2026-02-20*
*Overall confidence: HIGH (all recommendations use Node.js built-ins or trivially implementable patterns, verified on this machine)*
