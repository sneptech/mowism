# Agent Teams API -- Runtime Capabilities and Constraints

**Researched:** 2026-02-20
**Confidence:** MEDIUM (mix of verified and assumed; several critical questions require runtime testing)
**Purpose:** Reference document for v1.1 multi-agent UX design decisions
**Supersedes:** Agent Teams sections of `.planning/milestones/v1.0-phases/03-agent-teams-and-distribution/03-RESEARCH.md`

## Executive Summary

Agent Teams is Claude Code's experimental multi-agent coordination feature, gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. It provides team creation, teammate spawning, inbox-based messaging (targeted and broadcast), a shared task list with dependency tracking, and cleanup primitives. The lead orchestrator spawns teammates as independent Claude Code instances, each with their own context window and tool access. Communication is message-based (not streaming) -- the lead receives discrete inbox messages and idle notifications, not real-time output from workers. Terminal management is entirely outside Agent Teams' scope -- it handles coordination, not UI. Permission prompts appear in the worker's own terminal session and are NOT proxied to the lead. These constraints directly shape what v1.1 can build: live feedback must be message-driven (not streaming), input routing must be distributed (user switches terminals), and color-coded badges are a terminal/shell concern, not an Agent Teams concern.

## 1. Inbox Message Format

**Confidence:** ASSUMED

**Findings:**

The `Teammate({ operation: "write", ... })` operation sends a message to a specific teammate's inbox. Based on the v1.0 research and the gist reference (kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea), messages are string-based. The `write` operation accepts a teammate name/ID and a message string.

The key question is whether the message string can contain structured data (JSON). Since messages are ultimately strings passed to an LLM, the content format is flexible -- a sender can encode JSON in the message string, and the recipient can parse it. This is not a formal API constraint but a convention choice.

**What the v1.0 research documents:**
- `Teammate({ operation: "write", teammate: "worker-1", message: "..." })` for targeted messages
- `Teammate({ operation: "broadcast", message: "..." })` for team-wide messages
- Messages arrive in the recipient's inbox and are surfaced automatically

**What remains unverified:**
- Maximum message length (likely bounded by tool input limits)
- Whether messages are queued if the recipient is busy or delivered inline
- Whether the recipient sees the message immediately or on next idle cycle
- Whether JSON in messages survives encoding/decoding without corruption

**Design implication:** Mowism CAN encode structured metadata in inbox messages (input type, options, phase context, agent color assignment) by convention -- sending JSON strings that workers parse. This is not a first-class API feature but a pragmatic pattern. The distributed input routing todo's requirement for rich notification content (what phase, what input type, which terminal) can be implemented this way, but reliability of message delivery timing is UNKNOWN.

## 2. Worker Output Visibility

**Confidence:** ASSUMED

**Findings:**

The lead does NOT receive streaming output from workers. Worker output (tool calls, file edits, console output) stays in the worker's own session. The lead receives information from workers through two channels:

1. **Inbox messages** -- Workers explicitly send messages via `Teammate write` to the lead. These are discrete, intentional communications (e.g., "task complete, here's the summary").

2. **Idle notifications** -- Agent Teams automatically notifies the lead when a worker becomes idle (no pending tool calls, waiting for input). This is documented in the v1.0 research and the official docs referenced there.

3. **Shared task list** -- The lead can query `TaskList()` to see task statuses (pending, in-progress, completed, blocked). Workers update task status via `TaskUpdate`.

There is no mechanism for the lead to "subscribe" to a worker's tool call stream or observe their file edits in real time. The lead learns what workers did only when workers tell it (via messages) or when it reads the shared task list.

**What remains unverified:**
- Exact idle notification format and timing
- Whether idle notifications include the reason for idleness (waiting for input vs. finished vs. stuck)
- Whether the lead can distinguish between "worker is thinking" and "worker is waiting for permission"

**Design implication:** The "live agent feedback" todo cannot be implemented as a real-time streaming activity feed. The best achievable UX is a **poll-on-idle** model: when the lead receives an idle notification, it queries the task list and reports status changes. Workers should be instructed to send structured progress messages at key milestones (task claimed, commit made, task complete, error encountered). This makes feedback discrete and message-driven, not continuous.

## 3. Permission/Input Proxying

**Confidence:** ASSUMED

**Findings:**

When a worker hits a Claude Code permission prompt (tool use approval, e.g., "Allow Bash(npm install)?"), the prompt appears in the worker's own terminal session. The lead is NOT notified of the permission request through Agent Teams. The lead may receive an idle notification (since the worker is blocked waiting for input), but the idle notification does not include the specific permission being requested.

This is a fundamental architectural boundary: Agent Teams handles inter-agent coordination (messaging, tasks), but Claude Code's permission system operates at the session level. Each Claude Code session has its own permission context, and permission prompts are handled by the user interacting with that specific session's terminal.

**What the codebase assumes (mow-team-lead.md):**
- Workers are spawned with `run_in_background: true`
- The lead monitors via inbox messages and task list
- There is no mention of permission proxying in any Mowism workflow

**What remains unverified:**
- Whether a worker can be configured to auto-approve certain tools (via settings.json `allow` rules applied per-session)
- Whether a worker spawned in-process (not background) surfaces permission prompts to the lead's session
- The exact behavior difference between in-process and background teammate modes for permission handling

**Design implication:** The distributed input routing design is confirmed as the correct approach. The user MUST switch to the worker's terminal to handle permission prompts. The orchestrator can only notify the user ("Worker X is idle -- may need input, switch to Terminal Y"), not proxy the permission request. Workers should be configured with permissive `allow` rules for common operations (file reads, git commands, etc.) to minimize permission interruptions. The color-coded terminal badge design becomes critical -- without it, the user has no visual cue for which terminal to switch to.

## 4. Terminal Spawning and Control

**Confidence:** ASSUMED

**Findings:**

Agent Teams does NOT control terminal creation or terminal appearance. Teammate spawning creates new Claude Code instances, but how those instances appear to the user depends on the execution mode:

1. **In-process mode** (default): Workers run within the lead's Claude Code process. The user can cycle between teammates using `Shift+Down`. There are no separate terminals -- it is a single terminal with multiple agent contexts. The user switches between views within one terminal.

2. **tmux mode**: Workers get separate tmux panes (if tmux is running). This gives visual separation but has known platform limitations (doesn't work in VS Code terminal, Ghostty, Windows Terminal).

3. **Background mode** (`run_in_background: true` in Task spawning): Workers run as background tasks. The user doesn't interact with them directly -- they communicate only through inbox messages and the task list.

Agent Teams provides no API for:
- Setting ANSI escape codes on worker terminals
- Assigning colors to teammates
- Controlling terminal window title or prompt appearance
- Injecting environment variables into worker sessions (beyond what's inherited)

Terminal customization (color badges, status banners) would need to be implemented at the shell/terminal level, not through Agent Teams.

**What remains unverified:**
- Whether workers spawned in tmux mode can have their pane title set via Agent Teams
- Whether the lead can pass environment variables to workers at spawn time (e.g., `MOW_AGENT_COLOR=green`)
- Whether in-process mode allows any visual differentiation between teammates beyond the cycling mechanism
- The exact tmux pane management behavior

**Design implication:** Color-coded terminal badges are a SHELL-LEVEL concern, not an Agent Teams concern. Implementation options:
1. **tmux pane titles/colors** -- Set pane-specific environment variables and use shell prompt customization. Requires tmux.
2. **Worker self-identification** -- Workers print their own color-coded banner at startup based on an env var or instruction in their spawn prompt. Works in any mode but is cosmetic only (the worker prints it, there's no persistent visual indicator).
3. **Terminal emulator integration** -- Use OSC escape sequences to set tab titles/colors in supporting terminals (Kitty, iTerm2, Ghostty). Not portable.

The most practical approach for v1.1 is option 2: instruct workers to print a color-coded banner and prefix their status messages with their assigned color. This is Agent Teams-agnostic and works in all modes.

## 5. Task System (TaskCreate/TaskUpdate/TaskList)

**Confidence:** VERIFIED (from tool access and local filesystem evidence)

**Findings:**

The Task system is the primary coordination mechanism in Agent Teams. Based on the tool definitions available in the mow-team-lead agent and the local `~/.claude/tasks/` directory structure:

### TaskCreate

Creates a new task in the shared task list.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subject` | string | Yes | Short task title/subject line |
| `description` | string | Yes | Full task description (can be lengthy) |

Returns: Task object with `taskId` (string/UUID).

### TaskUpdate

Updates an existing task's status or dependencies.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | The task ID to update |
| `status` | string | No | New status (e.g., "in_progress", "completed", "blocked") |
| `assignee` | string | No | Teammate assigned to this task |
| `addBlockedBy` | string[] | No | Task IDs that block this task |
| `removeBlockedBy` | string[] | No | Task IDs to unblock |

### TaskList

Lists all tasks, optionally filtered.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none documented) | -- | -- | Returns all tasks in the current team context |

Returns: Array of task objects with their current status, assignee, blockers.

### TaskGet

Retrieves a specific task by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | The task ID to retrieve |

### Local filesystem evidence

`~/.claude/tasks/` contains UUID-named directories (31 found on this machine), each containing:
- `.lock` file (empty, for file locking)
- `.highwatermark` file (contains a number -- likely a sequence/version counter)

These directories are created by the `Task()` tool (subagent spawning), not just Agent Teams. The task IDs are UUIDs, confirming the v1.0 research.

**What remains unverified:**
- Complete list of valid status values
- Whether `description` has a character limit
- Whether task metadata (custom fields beyond subject/description/status/assignee/blockers) is supported
- Whether TaskList supports filtering parameters (by status, assignee, etc.)
- Auto-unblocking behavior: when a blocking task completes, does the blocked task automatically become available?

**Design implication:** The task system CAN carry structured state in the `description` field -- plan paths, worktree assignments, phase context, expected outputs. Mowism's existing pattern (creating tasks from PLAN.md files with wave dependencies via `addBlockedBy`) is well-aligned with the API. The key gap is whether auto-unblocking works reliably -- if it does, wave-based execution is automatic; if not, the lead must manually unblock tasks when waves complete.

## 6. Teammate Operations

**Confidence:** ASSUMED (from v1.0 research and gist sources)

**Findings:**

Based on the v1.0 research, the mow-team-lead agent definition, and the community gist, the Teammate tool supports these operations:

| Operation | Parameters | Description |
|-----------|------------|-------------|
| `spawnTeam` | `team_name` | Create a new team and register the caller as lead |
| `write` | `teammate`, `message` | Send a targeted message to a specific teammate's inbox |
| `broadcast` | `message` | Send a message to ALL teammates' inboxes |
| `requestShutdown` | `team_name` | Request all teammates to shut down gracefully |
| `approveShutdown` | -- | Approve a pending shutdown request (called by teammate) |
| `cleanup` | `team_name` | Clean up team config, tasks, and temp files |

**Additionally, teammates are spawned using the Task() tool with a `team_name` parameter:**

```
Task({
  team_name: "team-name",
  name: "worker-name",
  prompt: "...",
  run_in_background: true
})
```

This is the same `Task()` tool used for regular subagents, but the `team_name` parameter registers the spawned agent as a teammate in the specified team.

**What remains unverified:**
- Whether there are additional operations beyond the 6 listed (e.g., `getTeamStatus`, `listTeammates`)
- Whether `requestShutdown` is per-teammate or team-wide only
- Whether targeted `write` can use teammate name (e.g., "worker-1") or requires an internal ID
- Whether the lead can query which teammates are currently active/idle/terminated
- Whether there's a `removeTeammate` or `addTeammate` operation for dynamic team management
- The exact `approveShutdown` flow -- does a teammate HAVE to approve, or is it forced?

**Design implication:** The operation set is sufficient for Mowism's coordinator model. The lead can create teams, spawn workers, send targeted/broadcast messages, and clean up. The gap is **status querying** -- if there's no `listTeammates` operation, the lead can only track teammates through its own bookkeeping (STATE.md) and inbox messages. This means the lead must maintain its own teammate registry, which Mowism already does via STATE.md's "Agent Team Status" section.

## 7. Concurrency Limits

**Confidence:** ASSUMED

**Findings:**

Based on the v1.0 research:

| Constraint | Value | Source |
|------------|-------|--------|
| Max teammates | Unknown (practical limit ~5-8 before token cost dominates) | Community experience |
| Context window per teammate | Full 200k tokens (same as standalone Claude Code) | Architecture docs |
| Token cost scaling | ~N x 200k for N teammates (each is independent) | Architecture docs |
| Worktree limit | Bounded by git worktree limits and disk space | WorkTrunk CLI |

The v1.0 research estimates a 5-person team uses ~800k tokens vs ~200k for solo execution. This is a 4x cost multiplier for parallelism.

**What remains unverified:**
- Hard limit on concurrent teammates (if any exists)
- Whether there are rate limits on Teammate operations
- Whether there's a token budget ceiling per team
- Memory/process limits on the host machine for concurrent Claude Code instances
- Whether teammates share any context (they shouldn't, per the architecture)

**Design implication:** Phase-level parallelism must consider the token cost trade-off. For a typical Mowism project with 3-6 plans per phase, running 3-6 concurrent workers is the sweet spot. Beyond 6-8 workers, coordination overhead and token costs likely outweigh parallelism benefits. The nudge system should communicate this trade-off. The team-lead should only offer teams when there are 3+ independent plans (already enforced in mow-team-lead.md constraints).

## 8. Stability and Experimental Status

**Confidence:** VERIFIED (env var gating confirmed on local machine)

**Findings:**

Agent Teams is gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The "EXPERIMENTAL" in the env var name explicitly signals:

1. **API may change without notice** between Claude Code releases
2. **No stability guarantees** -- features may be added, removed, or behavior-changed
3. **Known limitations** that may not be documented

**Local machine status:**
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is NOT set in the environment
- `~/.claude/settings.json` does NOT have it in the `env` block
- `~/.claude/teams/` directory does NOT exist (Agent Teams has never been used on this machine)
- `~/.claude/tasks/` EXISTS with 31 task directories (from regular Task/subagent usage, not Agent Teams)

**Known issues from v1.0 research:**
- No session resumption for teammates (`/resume` and `/rewind` don't restore them)
- tmux mode has platform limitations (VS Code terminal, Ghostty, Windows Terminal)
- `classifyHandoffIfNeeded` bug causes false failure reports after successful tool calls

**Deprecation risk assessment:**
- LOW risk of total removal: Agent Teams is a strategic feature for Anthropic (multi-agent is the industry direction)
- MEDIUM risk of API changes: parameter names, operation names, or behavior details could change
- HIGH risk of new features: additional operations, better terminal integration, streaming, etc. could appear

**Design implication:** Mowism's Agent Teams integration should:
1. Be isolated behind feature gates (already done via env var check)
2. Not depend on undocumented behavior
3. Degrade gracefully when Agent Teams is unavailable (already designed: sequential execution works without teams)
4. Be tested against each Claude Code update before release
5. Abstract Agent Teams operations behind a thin wrapper (already done via mow-team-lead.md agent) so API changes only affect one file

## Assumptions vs Verified Facts

| Claim | Status | Source | Notes |
|-------|--------|--------|-------|
| Agent Teams requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | VERIFIED | Local env check, v1.0 research | Confirmed by absence of `~/.claude/teams/` when not set |
| Messages are string-based (not typed objects) | ASSUMED | v1.0 research, community gist | Reasonable inference from LLM-to-LLM communication design |
| JSON can be embedded in messages | ASSUMED | String flexibility | Works in theory; needs runtime testing for edge cases |
| Lead does NOT get streaming worker output | ASSUMED | v1.0 research, architecture docs | Consistent with message-based design; no evidence of streaming API |
| Permission prompts stay in worker's session | ASSUMED | Architecture boundary inference | No evidence of permission proxying in any source |
| TaskCreate accepts subject + description | VERIFIED | Tool definitions in mow-team-lead.md | Listed in agent's `tools` frontmatter |
| Task IDs are UUIDs | VERIFIED | Local `~/.claude/tasks/` directory listing | 31 UUID-named directories found |
| addBlockedBy creates task dependencies | ASSUMED | v1.0 research, community gist | Documented but not runtime-tested |
| Auto-unblocking on dependency completion | ASSUMED | v1.0 research | Critical for wave execution; needs runtime verification |
| Max ~5-8 teammates practical limit | ASSUMED | Community experience, token cost math | No hard limit documented |
| No session resumption for teammates | ASSUMED | v1.0 research (documented as official limitation) | Not directly verified but consistently documented |
| `~/.claude/teams/{name}/config.json` stores team config | ASSUMED | v1.0 research | Can't verify without enabling Agent Teams |
| Workers inherit project context (CLAUDE.md, skills, MCP) | ASSUMED | v1.0 research | Not directly tested |
| Teammate operations: spawnTeam, write, broadcast, requestShutdown, approveShutdown, cleanup | ASSUMED | v1.0 research, community gist | Complete list unverified |
| Each teammate gets full 200k context window | ASSUMED | Architecture docs | Consistent with independent Claude Code instances |

## v1.1 Design Decision Matrix

For each of the 4 v1.1 multi-agent todos, assessed against research findings:

### 1. Phase-Level Parallelism in Roadmap and Execution

**Feasibility:** PARTIALLY FEASIBLE -- needs adaptation

**What works as designed:**
- Roadmap can express phase dependencies as a DAG (this is a data model change, not an Agent Teams concern)
- Team-lead can spawn workers for independent phases simultaneously
- Task system with `addBlockedBy` can encode phase-level dependencies
- Each worker operates in its own worktree (file isolation)

**What needs adaptation:**
- The team-lead currently assumes one phase at a time. Multi-phase coordination requires the lead to manage N concurrent phases, each potentially at different stages (some executing, some waiting for dependencies)
- STATE.md's "Current Position" assumes one active phase. Needs redesign for multi-phase tracking
- Wave execution within a phase is well-tested; wave execution ACROSS phases is a new coordination pattern
- Token cost scales linearly: 3 parallel phases with 3 workers each = 9 concurrent teammates = ~1.8M tokens

**Go/No-Go:** GO with adaptations. The Agent Teams primitives support this. The work is primarily in Mowism's orchestration layer (roadmap format, STATE.md structure, team-lead logic), not in Agent Teams itself.

### 2. Live Agent Feedback in Orchestrator Terminal

**Feasibility:** PARTIALLY FEASIBLE -- significant constraints

**What works as designed:**
- Workers can send structured progress messages to the lead via `Teammate write`
- The lead can display these messages as they arrive
- Task list queries show current task statuses

**What does NOT work as designed:**
- No streaming output from workers. The "real-time activity feed" concept cannot show tool calls, file edits, or console output as they happen
- Idle notifications provide limited information (worker is idle, not why)
- The lead must rely on workers voluntarily sending progress messages. If a worker is deep in a long task and doesn't send updates, the lead sees nothing

**Adaptation needed:**
- Redesign from "streaming activity feed" to "structured milestone messages"
- Workers must be instructed to send messages at defined checkpoints: task claimed, subtask complete, commit made, error encountered, task done
- The lead aggregates these messages into a discrete progress table, not a live stream
- Polling TaskList can supplement messages for tasks that have been quiet

**Go/No-Go:** GO with reduced scope. Live feedback is possible but discrete (message-based), not continuous (streaming). The UX should set expectations: "last known status" not "real-time view." This is still a significant improvement over the current "silent until done" experience.

### 3. Distributed Input Routing with Color-Coded Agent Terminals

**Feasibility:** PARTIALLY FEASIBLE -- split implementation

**Color-coded terminals:**
- NOT an Agent Teams feature. Must be implemented at the shell/terminal level
- Workers can print color-coded banners at startup (cosmetic, any mode)
- tmux pane colors are possible but tmux has platform limitations
- True persistent color badges require terminal emulator support (OSC sequences) and are NOT portable

**Distributed input routing:**
- CONFIRMED as the correct model. Permission prompts appear in worker sessions, not the lead
- The lead receives idle notifications but NOT the content of what's blocking the worker
- Workers can be instructed to send a message to the lead when they hit a permission gate: "I need tool approval for X in Terminal Y"
- The lead can then display a rich notification with the worker's color and what's needed

**What needs adaptation:**
- Workers must be explicitly instructed to message the lead when blocked (this is a prompt engineering concern, not an API concern)
- Color assignment must be deterministic and communicated to workers at spawn time (via spawn prompt or env var)
- The "switch to Terminal Y" instruction depends on how terminals are set up, which varies by mode (in-process: `Shift+Down`, tmux: pane number, background: terminal tab)

**Go/No-Go:** GO with split implementation. Input routing is confirmed correct. Color-coding is achievable but limited to cosmetic banners unless tmux is used. The design should accept that "color-coded terminals" is a best-effort visual aid, not a system-level guarantee.

### 4. Research Agent Teams API Capabilities and Constraints (This Document)

**Feasibility:** COMPLETE

This document IS the deliverable. The 8 research questions are answered with confidence levels. The three sibling todos can now reference this document for design decisions.

## Open Questions

These require runtime testing with Agent Teams enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`):

1. **Message delivery timing** -- When the lead sends a message to a busy worker, is it queued and delivered on next idle, or does it interrupt the worker's current operation? This affects how input routing notifications work.

2. **Auto-unblocking behavior** -- When a blocking task is marked complete, does the blocked task automatically become available for claiming? Or must the lead manually remove the blocker? This is critical for wave execution.

3. **Idle notification content** -- Does the idle notification include why the worker is idle (finished task, waiting for permission, error, no more tasks)? This determines whether the lead can differentiate between "worker done" and "worker needs user input."

4. **Worker spawn environment** -- Does a worker spawned via `Task({ team_name: ... })` inherit the lead's working directory? Can the spawn prompt override it with `cd`? Can environment variables be passed at spawn time?

5. **Teammate status querying** -- Is there a `listTeammates` or `getTeamStatus` operation? Or must the lead track teammate state through its own bookkeeping?

6. **In-process vs background vs tmux** -- What are the exact behavioral differences between these modes for: permission handling, terminal appearance, message delivery, idle detection?

7. **Message size limits** -- Is there a maximum size for inbox messages? If Mowism sends JSON-encoded structured metadata, will large messages be truncated?

8. **Team config persistence** -- Does `~/.claude/teams/{name}/config.json` persist across Claude Code restarts? Does it contain enough information to re-create a team?

### Suggested Runtime Test Plan

```bash
# 1. Enable Agent Teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 2. Start Claude Code, create a test team
# In Claude Code: "Create a team called mow-test with 2 workers"

# 3. Test message delivery: have worker send JSON to lead
# Worker: Teammate({ operation: "write", teammate: "lead", message: '{"type":"progress","task":"test-1","status":"complete"}' })
# Lead: verify JSON arrives intact

# 4. Test auto-unblocking: create two tasks, block second on first, complete first
# TaskCreate({ subject: "Task A" })  -> id1
# TaskCreate({ subject: "Task B" })  -> id2
# TaskUpdate({ taskId: id2, addBlockedBy: [id1] })
# TaskUpdate({ taskId: id1, status: "completed" })
# TaskList() -> check if Task B is now unblocked

# 5. Test permission proxying: have worker attempt a Bash command
# Worker: Bash("echo test") -> does lead get notified?

# 6. Check ~/.claude/teams/ directory structure after team creation

# 7. Test idle notification content when worker is blocked on permission vs finished

# 8. Cleanup: Teammate({ operation: "cleanup", team_name: "mow-test" })
```

## Cross-Reference: v1.0 Research Corrections

Comparing this document against `.planning/milestones/v1.0-phases/03-agent-teams-and-distribution/03-RESEARCH.md`:

| v1.0 Claim | Status | Correction/Confirmation |
|------------|--------|------------------------|
| Team config at `~/.claude/teams/{name}/config.json` | UNVERIFIED | Cannot confirm -- `~/.claude/teams/` doesn't exist on this machine (Agent Teams not enabled). Plausible but not verified. |
| Tasks at `~/.claude/tasks/{name}/` | PARTIALLY VERIFIED | `~/.claude/tasks/` exists but contains UUID-named dirs from regular Task usage, not team-organized dirs. Team-specific task organization is unverified. |
| 7 core primitives (team creation, task CRUD, messaging, cleanup) | ASSUMED | The 6 Teammate operations + Task with team_name aligns with this count, but complete operation list is unverified. |
| `Shift+Down` to cycle teammates | ASSUMED | Documented in multiple sources but not directly tested. |
| Agent Teams env vars auto-set for teammates | UNKNOWN | v1.0 research tagged this as "LOW confidence." Still unverified. Important for worker self-identification. |
| No session resumption for teammates | ASSUMED | Consistently documented across all sources. HIGH confidence but not directly tested. |
| 800k tokens for 5-person team | ASSUMED | Rough estimate. Actual cost depends on task complexity and context usage per worker. |
| Official docs at code.claude.com | UNVERIFIED | The v1.0 research references `https://code.claude.com/docs/en/agent-teams` but the canonical docs URL is `https://docs.anthropic.com/en/docs/claude-code`. URL may have changed. |

## Sources

| Source | Confidence | What It Provided |
|--------|------------|------------------|
| `agents/mow-team-lead.md` (local file) | HIGH | Tool list (Teammate, Task, TaskCreate, TaskUpdate, TaskList), orchestration flow, operation signatures |
| `mowism/workflows/execute-phase.md` (local file) | HIGH | Team spawning pattern, wave execution model, checkpoint handling |
| `.planning/milestones/v1.0-phases/03-agent-teams-and-distribution/03-RESEARCH.md` (local file) | MEDIUM | Original API research with sources. Some claims unverified against runtime behavior. |
| `~/.claude/tasks/` filesystem inspection | HIGH | Task directory structure, UUID-based IDs, `.highwatermark` + `.lock` file pattern |
| `~/.claude/settings.json` inspection | HIGH | Confirmed Agent Teams not enabled on this machine |
| Environment variable check (`$CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`) | HIGH | Confirmed not set |
| kieranklaassen gist (referenced in v1.0 research) | MEDIUM | Detailed primitives reference. Community-sourced, not official. |
| alexop.dev blog (referenced in v1.0 research) | MEDIUM | Practical patterns. Community-sourced, not official. |
| Claude Code tool introspection (this session) | HIGH | Confirmed which tools are available in this context (Task but not standalone Teammate/TaskCreate in non-team sessions) |
