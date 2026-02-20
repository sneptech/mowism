# Agent Teams API -- Runtime Test Results

**Tested:** 2026-02-20
**Environment:** Claude Code with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` set
**Tester:** Claude Code executor agent (spawned via `/mow:quick` plan execution)
**Purpose:** Answer the 8 open questions from `AGENT-TEAMS-API.md` through runtime testing

## Executive Summary

**Agent Teams tools were NOT available in this executor session.** The initial conclusion was that "only top-level interactive sessions get AT tools." This was an **over-generalization**. The actual constraint is:

**Tool availability is determined by agent type, not by session hierarchy.** Each `subagent_type` has a fixed tool list. The `gsd-executor` type (used for this test) has only: Read, Write, Edit, Bash, Grep, Glob. It was never going to have AT tools regardless of the env var.

Agent types that DO have AT tools:
- `mow-team-lead` — has TeamCreate, SendMessage, Task, TaskCreate, TaskUpdate, TaskList
- `general-purpose` — has ALL tools including AT tools
- Top-level interactive sessions — have ALL tools

Agent types that do NOT have AT tools:
- `gsd-executor` / `mow-executor` — Read, Write, Edit, Bash, Grep, Glob only
- `gsd-planner` / `mow-planner` — limited tool set, no AT tools

**This means nested agent hierarchies ARE possible:**
```
User's interactive session (all tools)
  └─ Phase Worker (general-purpose teammate — all tools, CAN spawn children)
      ├─ Wave Executor 1 (mow-executor — leaf node, does work)
      └─ Wave Executor 2 (mow-executor — leaf node, does work)
```

Each Phase Worker can spawn its own sub-executors because `general-purpose` includes the `Task` tool. The executors are leaf nodes that can't spawn further children.

**Corrected implications:**
1. The executor agent cannot use AT tools — **correct, but this is by design** (executors are leaf workers)
2. "Only top-level sessions get AT tools" — **WRONG**. Any agent type whose tool list includes AT tools gets them
3. Teammates spawned as `general-purpose` or `mow-team-lead` CAN orchestrate their own sub-hierarchies

**Consequence for testing:** None of the 8 questions could be runtime-tested in this session because the executor agent type lacks AT tools. The tests need to be run from a session with AT tools (interactive session, or a `general-purpose`/`mow-team-lead` agent).

## Architectural Risk: Coordinator Context Window Exhaustion

**Risk:** The coordinator (team lead) receives messages from every teammate — inbox messages, idle notifications (automatic after every turn), TaskList results. With N teammates, context fills proportionally:

| Teammates | Estimated coordinator context load |
|-----------|-----------------------------------|
| 2-3 | Manageable — fits in 200k window comfortably |
| 4-6 | Moderate — auto-compression may trigger, losing earlier phase context |
| 7+ | High — coordinator may lose track of phase states after compression |

**Why this matters:** Claude Code auto-compresses prior messages as context approaches limits. Compression is lossy — the coordinator may forget decisions, phase states, or dependency relationships from earlier in the session. For a multi-phase parallel run lasting 30+ minutes with many messages flowing in, the coordinator could:
1. Spend most of its context on idle notifications and status chatter rather than coordination logic
2. Lose track of which phases are at what state after compression
3. Make inconsistent decisions based on incomplete compressed history

**Mitigations (must be designed into v1.1):**
1. **Structured state on disk** — STATE.md, task list, phase status files. The coordinator can re-read these after compression to restore awareness
2. **Minimize message noise** — Workers should send milestone messages only (task claimed, task complete, error, blocked), not progress chatter. Idle notifications are automatic and unavoidable but are brief
3. **Compact message format** — Short structured messages, not verbose narratives. File paths as references, not inline content
4. **Periodic state sync** — The coordinator should periodically re-read STATE.md and TaskList to rebuild awareness rather than relying solely on message history
5. **Phase worker autonomy** — Phase workers (if `general-purpose`) can manage their own waves independently, only messaging the coordinator at phase-level transitions. This reduces coordinator message volume from O(tasks) to O(phases)

## Environment Verification

### Tool Availability Check

**Available tools in this session:**
- `Read` -- File reading
- `Write` -- File writing
- `Edit` -- File editing (string replacement)
- `Bash` -- Shell command execution
- `Grep` -- Content search (ripgrep)
- `Glob` -- File pattern matching

**NOT available:**
- `Teammate` (Agent Teams messaging/team management)
- `Task` with `team_name` parameter (teammate spawning)
- `TaskCreate` (shared task creation)
- `TaskUpdate` (task status/dependency management)
- `TaskList` (task querying)

### Environment Variable Check

```
$ echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
1
```

The env var IS set to `1`. The tools are not available despite this.

### Filesystem Check

```
$ ls ~/.claude/teams/
~/.claude/teams/ does not exist

$ ls ~/.claude/tasks/ | head -5
05752878-e9bc-4b9a-916c-869926ede72b
09ad7bc1-ca7a-4b2b-877a-9770e4041366
...
(31 UUID-named directories from regular Task/subagent usage)
```

No teams directory exists. Tasks directory contains only regular subagent task directories.

## Test Results

### Q1: Message Delivery Timing

**Question:** When the lead sends a message to a busy worker, is it queued and delivered on next idle, or does it interrupt the worker's current operation?

**Attempted test:**
- Create test team via `Teammate({ operation: "spawnTeam", team_name: "mow-runtime-test" })`
- Spawn worker, send message while worker is busy
- Observe delivery behavior

**Actual result:** COULD NOT TEST -- Teammate tool not available in subagent session.

**Conclusion:** INCONCLUSIVE

**Reason:** Agent Teams tools are not available in Task()-spawned subagent sessions. This test requires an interactive top-level Claude Code session where the user manually invokes Agent Teams operations, or a properly registered teammate session.

**Design implication:** The question remains open. For v1.1 design, ASSUME message queuing (conservative assumption) and design the notification system to be tolerant of delivery delays.

---

### Q2: Auto-Unblocking Behavior

**Question:** When a blocking task is marked complete, does the blocked task automatically become available for claiming?

**Attempted test:**
- Create Task A and Task B via TaskCreate
- Block B on A via TaskUpdate
- Complete A, check if B is automatically unblocked

**Actual result:** COULD NOT TEST -- TaskCreate/TaskUpdate/TaskList tools not available in subagent session.

**Conclusion:** INCONCLUSIVE

**Reason:** Same as Q1. These tools are only available in team-registered sessions.

**Design implication:** The question remains critical for wave execution. For v1.1 design, implement DEFENSIVE unblocking: after completing a blocking task, the lead should explicitly check blocked tasks and manually remove blockers if auto-unblocking is not confirmed. This adds ~1 extra tool call per wave transition but guarantees correctness regardless of auto-unblocking behavior.

---

### Q3: Idle Notification Content

**Question:** Does the idle notification include why the worker is idle (finished task, waiting for permission, error, no more tasks)?

**Attempted test:**
- Spawn worker, observe idle notification format after various states

**Actual result:** COULD NOT TEST -- Cannot spawn teammates from subagent session.

**Conclusion:** INCONCLUSIVE

**Reason:** Same as Q1. Idle notifications are received by the lead in the top-level session.

**Design implication:** Assume idle notifications are minimal (just "worker is idle" without reason). Design workers to ALWAYS send a structured message explaining their state change before going idle. This makes the idle notification a backup signal, not the primary status mechanism.

---

### Q4: Worker Spawn Environment

**Question:** Does a worker spawned via `Task({ team_name: ... })` inherit the lead's working directory? Can environment variables be passed at spawn time?

**Attempted test:**
- Spawn worker, have it report `pwd` and check for env vars

**Actual result:** COULD NOT TEST directly, but **PARTIAL ANSWER from this session's own behavior:**

This executor agent WAS spawned via `Task()` (by the GSD orchestrator). Observations about this session:
- **Working directory:** `/home/max/git/mowism` (matches the project root, same as the lead's cwd)
- **Environment variables:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` IS inherited from the parent environment
- **Tool access:** Standard Claude Code tools only (no Agent Teams tools)

**Conclusion:** PARTIALLY VERIFIED

**What's verified:**
- Workers spawned via `Task()` DO inherit the lead's working directory (confirmed by this session's cwd being `/home/max/git/mowism`)
- Environment variables from the parent process ARE inherited (confirmed by `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` being visible)

**What's NOT verified:**
- Whether `Task({ team_name: ... })` grants additional tools beyond what regular `Task()` provides
- Whether the spawn prompt can override the working directory
- Whether there's a way to pass custom env vars at spawn time (beyond inheritance)

**Design implication:** Workers WILL have access to the project directory and inherited env vars. Color assignment can use inherited env vars if set before spawning. The spawn prompt can include `cd` instructions for worktree-based workers.

---

### Q5: Teammate Status Querying

**Question:** Is there a `listTeammates` or `getTeamStatus` operation?

**Attempted test:**
- Try `Teammate({ operation: "listTeammates" })` and similar operations
- Check TaskList for teammate information

**Actual result:** COULD NOT TEST -- Teammate tool not available.

**Conclusion:** INCONCLUSIVE

**Reason:** Same as Q1.

**Design implication:** Continue with the assumption that there is NO `listTeammates` operation. The lead should maintain its own teammate registry. Mowism already does this via STATE.md's "Agent Team Status" section -- this design is correct and should be retained as the primary source of truth for teammate status.

---

### Q6: In-Process vs Background vs Tmux

**Question:** What are the exact behavioral differences between these modes?

**Attempted test:**
- Observe behavior of background-mode spawning (this session was spawned with `run_in_background: true`)

**Actual result:** PARTIAL OBSERVATION from this session's own execution mode:

This session appears to be running as a background task (spawned by the GSD orchestrator via `Task()`). Observations:
- **Message delivery:** Not applicable -- this is not a team context, so no inbox messages
- **Terminal visibility:** This session has no visible terminal to the user. Output is captured and returned to the spawning agent
- **Permission handling:** All tools are pre-approved via `settings.json` `allow` rules (`Bash(*)` is allowed). No permission prompts observed
- **Idle detection:** Not observable from within the session

**Conclusion:** PARTIALLY VERIFIED (background mode only)

**What's verified:**
- Background tasks run without a visible terminal
- Background tasks inherit tool permissions from settings
- Background tasks communicate results back to the spawner, not via a separate terminal

**What's NOT verified:**
- In-process mode behavior (Shift+Down cycling)
- tmux mode behavior (pane creation, title setting)
- Permission prompt handling differences between modes
- Whether background teammates behave differently from background Task() subagents

**Design implication:** Background mode is confirmed as "invisible to user." This reinforces the distributed input routing design: if workers run in background mode, the user CANNOT interact with them directly. Permission prompts must either be pre-approved via allow rules or the worker must be spawned in tmux/in-process mode for user interaction. For v1.1, recommend tmux mode for workers that may need user input, and background mode only for fully autonomous workers.

---

### Q7: Message Size Limits

**Question:** Is there a maximum size for inbox messages?

**Attempted test:**
- Send small, medium (~1KB), and large (~10KB) JSON messages via Teammate write
- Check for truncation

**Actual result:** COULD NOT TEST -- Teammate tool not available.

**Conclusion:** INCONCLUSIVE

**Reason:** Same as Q1.

**Design implication:** Assume messages have a practical size limit (likely the tool input parameter limit, which is typically tens of KB for Claude Code tools). Design structured messages to be COMPACT: use short keys, avoid embedding full file contents, send references (file paths) instead of content. The structured notification format for input routing should be well under 1KB.

---

### Q8: Team Config Persistence

**Question:** Does `~/.claude/teams/{name}/config.json` persist across Claude Code restarts?

**Attempted test:**
- Check `~/.claude/teams/` filesystem after team creation

**Actual result:** COULD NOT TEST team creation. Filesystem observation:

```
$ ls ~/.claude/teams/
~/.claude/teams/ does not exist
```

No teams directory exists because no team has ever been created on this machine (Agent Teams tools were never available in a session that attempted to create one).

**Conclusion:** INCONCLUSIVE

**Reason:** Cannot create a team to observe persistence behavior.

**Design implication:** The absence of `~/.claude/teams/` confirms that Agent Teams has never been successfully used on this machine despite the env var being set. This suggests the env var alone is insufficient -- the tools must also be present in the session. For v1.1, team creation should be verified as a first step in the orchestrator before proceeding with multi-agent execution.

---

## Meta-Finding: Agent Teams Tool Availability (CORRECTED)

The initial conclusion ("AT tools only available in top-level sessions") was an **over-generalization**. The actual model:

**Tool availability is per agent type, not per session hierarchy.** Each `subagent_type` passed to `Task()` determines which tools the spawned agent gets. The env var enables AT tools system-wide, but each agent only sees tools in its type's declared tool list.

| Agent Type | Has AT Tools | Has Task (can spawn children) | Evidence |
|---|---|---|---|
| Top-level interactive session | Yes | Yes | All tools available by default |
| `mow-team-lead` | Yes (TeamCreate, SendMessage, TaskCreate, etc.) | Yes | Declared in agent type definition |
| `general-purpose` | Yes (all tools) | Yes | Has access to all tools |
| `mow-executor` / `gsd-executor` | **No** | **No** | This session — only Read/Write/Edit/Bash/Grep/Glob |
| `mow-planner` / `gsd-planner` | **No** | **No** | Limited tool set per agent type |

**Corrected implications for Mowism's architecture:**

1. **Executors are leaf nodes by design.** They don't need AT tools — they execute plans, not coordinate agents. This is correct.

2. **Phase-level orchestrators CAN be subagents.** If spawned as `general-purpose` or `mow-team-lead`, a phase worker has full AT tools and `Task` — it can spawn its own wave executors. This enables nested hierarchies:
   ```
   User session or Team Lead
     ├─ Phase Worker 1 (general-purpose) — spawns wave executors
     ├─ Phase Worker 2 (general-purpose) — spawns wave executors
     └─ Phase Worker 3 (general-purpose) — spawns wave executors
   ```

3. **Testing AT tools requires an agent type with AT tools.** The `gsd-executor` type was the wrong choice. Using `general-purpose` or running from the interactive session would work.

**Context window exhaustion risk:** With nested hierarchies, the coordinator receives messages from N phase workers plus idle notifications. See "Architectural Risk: Coordinator Context Window Exhaustion" section above for analysis and mitigations.

## Cleanup

No test team was created, so no cleanup is needed. No orphaned resources.

## Recommendations for Completing Runtime Tests

To actually answer the 8 open questions, the following approach is needed:

1. **User opens an interactive Claude Code session** (not via `/mow:quick` or any spawned agent)
2. **User verifies Agent Teams tools are available** by checking tool list
3. **User manually executes the test sequence** from the "Suggested Runtime Test Plan" in `AGENT-TEAMS-API.md`
4. **User documents results** or has Claude document them in this file

Alternatively, a Mowism workflow modification could:
1. Add a pre-check to `/mow:quick` that detects if the current session has Agent Teams tools
2. If not, instruct the user to run the tests interactively instead of via a spawned executor
3. Provide a copy-paste test script for the user's interactive session

## Summary Table

| Question | Result | Confidence | Key Finding |
|---|---|---|---|
| Q1: Message delivery timing | INCONCLUSIVE | -- | Tools not available in subagent |
| Q2: Auto-unblocking behavior | INCONCLUSIVE | -- | Tools not available in subagent |
| Q3: Idle notification content | INCONCLUSIVE | -- | Tools not available in subagent |
| Q4: Worker spawn environment | PARTIALLY VERIFIED | HIGH | Subagents inherit cwd and env vars |
| Q5: Teammate status querying | INCONCLUSIVE | -- | Tools not available in subagent |
| Q6: In-process vs background vs tmux | PARTIALLY VERIFIED | MEDIUM | Background mode is invisible, no user interaction |
| Q7: Message size limits | INCONCLUSIVE | -- | Tools not available in subagent |
| Q8: Team config persistence | INCONCLUSIVE | -- | No teams directory exists |
| META: Tool availability | CORRECTED | HIGH | AT tools are per-agent-type, not per-session-level. Executors lack them by design; general-purpose and team-lead types have them. Nested hierarchies are possible. |

**Overall:** 0/8 questions fully answered, 2/8 partially answered, 6/8 inconclusive due to executor agent type lacking AT tools (not a fundamental session-level restriction). The corrected meta-finding about agent-type-based tool availability and the context window exhaustion risk analysis are the primary value from this test session.
