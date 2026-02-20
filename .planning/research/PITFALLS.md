# Domain Pitfalls: v1.1 Multi-Agent Coordination

**Domain:** Adding parallel phase execution, shared state coherence, live agent feedback, and distributed input routing to an existing sequential multi-agent orchestration system
**Researched:** 2026-02-20
**Supersedes:** v1.0 PITFALLS.md (2026-02-19) -- v1.0 pitfalls (fork drift, API fragility, token cost, etc.) remain valid but are not repeated here. This document covers NEW pitfalls specific to v1.1's parallel execution features.
**Overall confidence:** HIGH (grounded in existing codebase analysis, Agent Teams API research, and multi-agent failure literature)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or architectural dead ends. Each of these has caused real failures in multi-agent systems.

---

### Pitfall 1: Lost Updates in STATE.md During Parallel Phase Execution

**What goes wrong:**
Phase Worker A (in worktree-alpha) reads STATE.md, updates "Phase 3: Complete," and writes it back. Phase Worker B (in worktree-beta) read the SAME STATE.md before A's write, updates "Phase 4: In Progress," and writes it back. B's write overwrites A's update. Phase 3 completion is lost -- the orchestrator thinks Phase 3 is still running. This is the classic "lost update" concurrency problem, transplanted to file-based state.

In Mowism's current architecture, this is not theoretical. The `execute-phase` workflow calls `mow-tools.cjs phase complete` which modifies STATE.md's "Current Position" section, ROADMAP.md's progress table, and REQUIREMENTS.md's traceability. Two concurrent `phase complete` calls on different worktrees will corrupt all three files.

**Why it happens:**
The v1.0 system assumes sequential execution. STATE.md, ROADMAP.md, and REQUIREMENTS.md are designed as single-writer files with no concurrency control. The `mow-tools.cjs` commands are not atomic -- they read a file, modify it in memory, and write it back. The window between read and write (typically 50-200ms for file I/O plus string manipulation) is long enough for another process to interleave.

Git worktrees share a `.git` database but have separate working directories. Two worktrees can modify the same file path on different branches and not conflict until merge. But if both target the main branch (where `.planning/` lives), or if STATE.md is shared across worktrees via symlinks or periodic sync, the lost update is immediate.

**Consequences:**
- Orchestrator loses awareness of completed phases, potentially re-executing them
- ROADMAP.md progress table shows stale status, misleading both orchestrator and user
- REQUIREMENTS.md traceability goes out of sync, causing verification failures
- `worktree claim` may allow duplicate claims if the claim table was corrupted

**Prevention:**
1. **Single writer for shared state.** Only the orchestrator writes to STATE.md, ROADMAP.md, and REQUIREMENTS.md. Phase workers report completion via Agent Teams inbox messages. The orchestrator serializes these updates.
2. **File-level locking in mow-tools.cjs.** Add advisory locks (`flock` on Linux) around all STATE.md read-modify-write operations. This prevents concurrent `mow-tools.cjs` invocations from interleaving.
3. **Distributed state files.** Split per-phase status into `phases/XX/status.json` (one per phase). Each worker writes only its own status file. The orchestrator reads all status files to construct a unified view. No shared mutable file.
4. **Optimistic concurrency control.** Add a version counter to STATE.md. Before writing, check that the version hasn't changed since the read. If it has, re-read and retry. This is the file-based equivalent of `If-Match` headers.

**Detection:**
- `git log --all -- .planning/STATE.md` shows commits from multiple worktrees within seconds of each other
- STATE.md "Current Position" section disagrees with what phase workers actually completed
- `mow-tools.cjs roadmap get-phase` returns stale status for a phase that finished minutes ago
- `worktree-status` shows a phase as "active" when no worker is running it

**Phase to address:** First implementation phase (state coherence architecture). This MUST be solved before any parallel execution is enabled. Every other v1.1 feature depends on state being correct.

**Confidence:** HIGH -- this is a well-understood concurrency problem. The codebase has zero concurrency controls in mow-tools.cjs (verified by reading the source).

---

### Pitfall 2: Coordinator Context Window Exhaustion Under Message Flood

**What goes wrong:**
The orchestrator (team lead) receives messages from every phase worker: task claimed, task complete, error encountered, checkpoint hit. It also receives automatic idle notifications from Agent Teams after every worker turn. With N phase workers, each sending 5-10 milestone messages plus automatic idle notifications (estimated 1 per turn, 20-50 turns per phase), the orchestrator's 200k context fills with coordination traffic rather than coordination logic.

Claude Code's auto-compression triggers and lossily compresses earlier context. The orchestrator forgets which phases it already launched, which dependency edges it resolved, which decisions it made. It may re-launch an already-running phase, skip a dependency check it already performed, or send contradictory instructions to workers because it forgot its own earlier messages.

**Why it happens:**
The orchestrator's context window is finite (200k tokens). Every inbox message, idle notification, TaskList query result, and STATE.md read consumes tokens. With 4 parallel phase workers, conservative estimates:

| Source | Per-worker messages | Total (4 workers) | Estimated tokens |
|--------|--------------------|--------------------|------------------|
| Milestone messages (claimed, commit, complete) | 8-15 | 32-60 | 16k-30k |
| Idle notifications (automatic, per turn) | 20-50 | 80-200 | 8k-20k |
| TaskList queries (periodic) | 3-5 | 12-20 | 6k-10k |
| STATE.md re-reads (periodic) | 2-3 | 8-12 | 8k-12k |
| Orchestrator's own reasoning | -- | -- | 20k-40k |
| System prompt + loaded context | -- | -- | 30k-50k |

Total estimate: 88k-162k tokens for a 4-worker run. This leaves minimal headroom. At 6+ workers, compression is nearly guaranteed within the first 30 minutes.

**Consequences:**
- Orchestrator forgets which phases are running, potentially spawning duplicates
- Dependency resolution decisions are lost after compression, leading to incorrect phase ordering
- Worker status tracking drifts from reality -- orchestrator reports stale status to user
- Decision consistency degrades: orchestrator may approve contradictory approaches for different phases

**Prevention:**
1. **State on disk, not in context.** The orchestrator should NEVER rely on message history for current system state. After every significant action, update STATUS files on disk. Before every significant decision, re-read STATUS files from disk. This makes the orchestrator compression-resilient: even after aggressive compression, it can reconstruct awareness by reading files.
2. **Message budget per worker.** Workers send ONLY: (a) task claimed, (b) task complete with 1-line summary, (c) error with 1-line description, (d) checkpoint/blocked. No progress chatter, no verbose explanations, no inline file contents. Target: <5 messages per plan.
3. **Phase worker autonomy.** Phase workers (spawned as `general-purpose` type with AT tools) manage their own wave execution independently. They handle plan-level orchestration internally and message the coordinator only at phase-level transitions: phase started, phase complete, phase failed. This reduces coordinator message volume from O(plans) to O(phases).
4. **Idle notification tolerance.** The orchestrator should be instructed to not respond to idle notifications unless a worker has been idle for >30 seconds. Most idle notifications are transient (between tool calls). Responding to each one wastes context on "Worker X is idle" / "Worker X is active again" churn.
5. **Periodic context checkpointing.** Every 10-15 minutes, the orchestrator writes a structured status snapshot to disk and reads it back. This creates a "save point" that survives compression.

**Detection:**
- Orchestrator asks workers for information it already received
- Orchestrator re-launches a phase that is already running
- Orchestrator's status reports become increasingly inaccurate over time
- Orchestrator gives contradictory instructions to different workers
- Session length exceeds 30 minutes with 4+ workers

**Phase to address:** State coherence architecture phase AND live feedback phase. The message budget must be designed into the worker protocol, and the coordinator's state management must be disk-first, context-second.

**Confidence:** HIGH -- the AGENT-TEAMS-API-RUNTIME.md research explicitly identified this risk with the same token math. Claude Code's auto-compression is documented behavior.

---

### Pitfall 3: DAG Dependency Cycles and Phantom Dependencies

**What goes wrong:**
The v1.0 roadmap uses a linear chain: Phase N depends on Phase N-1. The v1.1 roadmap moves to a DAG (directed acyclic graph) of dependencies. Two failure modes:

1. **Cycles:** Phase 3 depends on Phase 4, Phase 4 depends on Phase 5, Phase 5 depends on Phase 3. No phase can start. The system deadlocks or crashes depending on the cycle detection strategy. If the roadmapper (an LLM) generates the dependency graph, cycles are plausible -- LLMs are not reliable graph reasoners.

2. **Phantom dependencies:** The roadmapper conservatively marks Phase 4 as depending on Phase 3 because "the API might use the auth system." But Phase 4 is the marketing website and Phase 3 is the authentication system -- they have no real dependency. The phantom dependency forces sequential execution of phases that could run in parallel, negating the entire benefit of DAG-based scheduling.

**Why it happens:**
LLMs generating dependency graphs reason by surface-level textual similarity, not structural analysis. If Phase 3 mentions "authentication" and Phase 4 mentions "login page," the LLM may infer a dependency even if the login page is a static mockup. The v1.0 linear chain avoids this by making every phase depend on the previous one -- over-constrained but safe. Moving to a DAG requires the roadmapper to make nuanced judgments about which phases are truly independent.

**Consequences:**
- Cycles cause deadlock: no phase can start because each waits on another
- Phantom dependencies force unnecessary serialization, making parallel execution slower than sequential (because of coordination overhead without parallelism benefit)
- Missing dependencies (the opposite of phantoms) cause phases to start before their prerequisites are ready, leading to runtime failures

**Prevention:**
1. **Validate DAG at generation time.** After the roadmapper produces the dependency graph, run a topological sort. If the sort fails, the graph has a cycle. Report the cycle to the user and ask for manual resolution. Implement this in `mow-tools.cjs` as a `roadmap validate-dag` command.
2. **Default to independent, not dependent.** The roadmapper should mark phases as independent unless there is a concrete, articulable dependency (shared database schema, shared API contract, shared file output). "They both deal with users" is NOT a dependency. "Phase 4 imports a module created in Phase 3" IS a dependency.
3. **Dependency evidence requirement.** Each dependency edge in the roadmap must include a 1-line justification: `Depends on: Phase 3 (imports auth middleware from Phase 3's output)`. If the roadmapper cannot articulate a specific dependency, the edge should not exist.
4. **User review of the DAG.** Before execution, display the dependency graph to the user and ask for confirmation. A simple ASCII visualization: `Phase 1 --> Phase 2, Phase 1 --> Phase 3, Phase 2 --> Phase 4`. The user can add or remove edges.
5. **Cycle-breaking heuristic.** If a cycle is detected and the user is not available, break the cycle by removing the edge with the weakest justification (or the newest edge if justifications are equal).

**Detection:**
- `mow-tools.cjs roadmap validate-dag` reports a cycle
- Two or more phases are in "waiting for dependency" state indefinitely
- Phase execution takes longer with DAG scheduling than with linear scheduling (phantom dependencies)
- The roadmapper generates identical dependency graphs for projects with very different structures (it's using a template, not reasoning)

**Phase to address:** Phase-level parallelism implementation. The DAG validation must be built BEFORE any parallel phase execution is attempted. Executing an invalid DAG is worse than sequential execution.

**Confidence:** HIGH -- cycle detection is a well-understood CS problem (topological sort). The concern about LLM-generated graphs is based on documented limitations of LLMs in graph reasoning tasks.

---

### Pitfall 4: Worker Crash Leaving Orphaned State

**What goes wrong:**
Phase Worker 3 claims Phase 3 via `worktree claim`, begins executing plans, writes partial progress to its local `.planning/` files, and then crashes (Claude Code session timeout, rate limit exhaustion, `classifyHandoffIfNeeded` bug, or user closes the terminal). The worktree claim persists in STATE.md, but no worker is actively executing Phase 3. The orchestrator sends messages to the dead worker and receives no response. Other workers cannot claim Phase 3 because it's marked as taken. Phases dependent on Phase 3 wait indefinitely.

In the current v1.0 architecture, `worktree clean` handles stale claims by checking if the worktree still exists. But in v1.1, the worker is a Claude Code process in a worktree that STILL exists -- the worktree is fine, it's the agent that's dead. The existing stale detection does not cover this case.

**Why it happens:**
The claim system tracks worktree paths, not agent processes. A worktree can exist without an active agent. Agent Teams' idle notifications may help detect this (a permanently idle worker suggests a crash), but idle notification behavior for terminated agents is UNVERIFIED (Q3 from the API research). The orchestrator has no reliable way to distinguish "worker is thinking deeply" from "worker process is dead."

**Consequences:**
- Phase 3 is blocked indefinitely: claimed but not executing
- Dependent phases (4, 5, ...) wait for Phase 3 and never start
- Partial state files in the worktree may be inconsistent (half-committed changes)
- The orchestrator may exhaust its context window waiting for a worker that will never respond

**Prevention:**
1. **Heartbeat protocol.** Workers send a heartbeat message to the orchestrator every 2-3 minutes: `{"type": "heartbeat", "phase": 3, "status": "executing", "plan": "03-02"}`. If the orchestrator does not receive a heartbeat for 5 minutes, mark the worker as suspected dead.
2. **Timeout-based claim expiry.** Worktree claims include a `last_heartbeat` timestamp. A claim without a heartbeat for >10 minutes is automatically released. The `worktree clean` command checks heartbeat freshness in addition to worktree existence.
3. **Worker startup handshake.** When a worker starts, it writes a PID file or timestamp to its worktree: `.planning/phases/XX/.worker_alive`. The orchestrator can check file modification time to detect stale workers.
4. **Graceful degradation on timeout.** When the orchestrator detects a dead worker, it: (a) releases the worktree claim, (b) saves the partial state, (c) notifies the user, (d) optionally respawns a new worker to continue from the last checkpoint. The `execute-phase` resumption logic (re-run skips completed plans) already handles this for plan-level recovery.
5. **Crash-consistent state writes.** Workers should commit after every plan (already the v1.0 pattern) so that a crash between plans leaves a consistent checkpoint. The new risk is a crash MID-plan, which the v1.0 `SUMMARY.md` check already handles -- no SUMMARY means the plan didn't finish.

**Detection:**
- `worktree-status` shows an active claim with no recent heartbeat
- The orchestrator's message log shows "sent message to Worker X" with no response for >5 minutes
- `git log` in the claimed worktree shows no new commits for an unexpectedly long time
- Agent Teams TaskList shows a task "in_progress" with no updates

**Phase to address:** State coherence architecture phase. The heartbeat protocol must be part of the worker coordination design. Without it, any worker crash causes cascading deadlock.

**Confidence:** HIGH -- worker crashes are inevitable in long-running multi-agent systems. The v1.0 system handles this at the plan level; the v1.1 system must handle it at the phase level.

---

### Pitfall 5: .planning/ Copy Semantics Creating Divergent Realities

**What goes wrong:**
Mowism's worktree hook (`WT_PLANNING_COPY_HOOK` in mow-tools.cjs, line 247) copies `.planning/` from the main worktree to new worktrees on creation. This means each worktree starts with a SNAPSHOT of `.planning/` state. As workers modify their local `.planning/` copies independently, each worktree develops its own version of reality. Worker A's `STATE.md` says Phase 2 is complete. Worker B's `STATE.md` says Phase 2 is still running (because B was created before A finished Phase 2).

At merge time, git sees different versions of every `.planning/` file across every worktree branch. The merge produces textual conflicts on structured files (markdown tables, YAML frontmatter, JSON sections). Manual resolution of 10+ conflicting `.planning/` files is tedious and error-prone.

**Why it happens:**
The copy-on-create pattern treats `.planning/` as static project context, but v1.1 makes `.planning/` a live coordination surface. The v1.0 assumption was "one worktree executes one phase, then merges back." In v1.1, multiple worktrees execute multiple phases concurrently, and `.planning/` changes are happening in all of them simultaneously.

**Consequences:**
- Each worktree has a different view of project state, leading to inconsistent decisions
- Merge conflicts in `.planning/` after every parallel execution run
- Workers reading stale ROADMAP.md make decisions based on outdated phase status
- The "single source of truth" property of `.planning/` is lost

**Prevention:**
1. **Stop copying .planning/ to worktrees.** Instead, have workers read `.planning/` from the main worktree via absolute path or symlink. Workers write their own per-phase status files to their local worktree (which is isolated). The orchestrator reads from the main worktree's `.planning/` (single source of truth) and from per-worker status files.
2. **If copying is required**, copy ONLY read-only context files (PROJECT.md, config.json) and NOT mutable state files (STATE.md, ROADMAP.md). Mutable state is read from main worktree or received via messages.
3. **Symlink .planning/ to main worktree.** Instead of copying, create a symlink: `ln -s /path/to/main-worktree/.planning /path/to/new-worktree/.planning`. All worktrees read and write the same `.planning/` directory. This re-introduces concurrency concerns (see Pitfall 1) but eliminates divergent snapshots.
4. **Orchestrator-mediated state.** Workers never read `.planning/` directly. They receive their execution context via the Agent Teams spawn prompt (plan path, phase number, dependencies). They report results via messages. The orchestrator is the only entity that reads and writes `.planning/`.

**Detection:**
- `diff` between `.planning/STATE.md` in two worktrees shows different content
- Workers make decisions that conflict with the orchestrator's understanding of project state
- Merge of a worktree branch produces conflicts in `.planning/` files
- A worker reads ROADMAP.md and sees a phase as "Not Started" when it's already "Complete"

**Phase to address:** State coherence architecture phase. This is the same phase as Pitfall 1 -- they are two facets of the same problem (concurrent access to shared mutable state).

**Confidence:** HIGH -- verified by reading mow-tools.cjs source (line 247, `WT_PLANNING_COPY_HOOK`). The copy semantics are explicit in the code.

---

## Moderate Pitfalls

Mistakes that cause significant rework or degraded UX, but not full rewrites.

---

### Pitfall 6: Message Ordering Assumptions in Async Agent Communication

**What goes wrong:**
The orchestrator sends "start Phase 3" to Worker A, then "start Phase 4" to Worker B. Worker B starts faster than Worker A (Worker A is loading a larger plan). Worker B sends "Phase 4 started" before Worker A sends "Phase 3 started." The orchestrator, processing messages in arrival order, may update its internal state incorrectly or log events in the wrong order.

More dangerously: the orchestrator sends "stop Phase 3, dependency unmet" to Worker A. But Worker A already sent "Phase 3 complete" -- the messages crossed in flight. The orchestrator receives "Phase 3 complete" after sending the stop command and must decide: is this the completion from before the stop, or did the worker ignore the stop?

**Why it happens:**
Agent Teams inbox messaging is asynchronous. Messages are queued and delivered when the recipient processes its inbox. There is no guaranteed ordering, no sequence numbers, no acknowledgment protocol. The delivery timing question (Q1 from the API research) remains UNVERIFIED. The system behaves like UDP messages, not TCP streams.

**Prevention:**
1. **Include sequence numbers in messages.** Every message includes a monotonically increasing sequence number and a reference to the message it replies to (if applicable). The orchestrator can detect out-of-order messages and reorder them.
2. **Idempotent state transitions.** Phase status transitions should be idempotent: receiving "Phase 3 complete" twice is harmless. Receiving "Phase 3 complete" after "Phase 3 stopped" is resolved by last-write-wins on the status file, not message ordering.
3. **Timestamp all messages.** Include ISO timestamps in every message. When messages arrive out of order, the orchestrator uses timestamps, not arrival order, to determine sequence.
4. **Do not rely on stop/cancel semantics.** Agent Teams has no mechanism to interrupt a running worker (Q3, UNVERIFIED). Design around this: instead of "stop Phase 3," let the worker complete and discard the result if the dependency check fails post-completion.

**Detection:**
- Orchestrator's event log shows events in illogical order (Phase 4 started before Phase 3, when 4 depends on 3)
- Worker reports completing a task that the orchestrator thought was stopped
- Status display oscillates (showing "complete" then "in progress" then "complete" again)

**Phase to address:** Live feedback and worker protocol design.

**Confidence:** MEDIUM -- message ordering is a known concern in async systems, but Agent Teams' specific delivery guarantees are UNVERIFIED.

---

### Pitfall 7: Notification Fatigue in Orchestrator Terminal

**What goes wrong:**
The live feedback feature shows worker activity in the orchestrator terminal. With 4 phase workers, each sending milestone messages, plus idle notifications, plus periodic status polls, the orchestrator terminal becomes a wall of scrolling status updates. The user's eyes glaze over. When a genuinely important event happens (worker blocked, checkpoint needs approval, error occurred), it scrolls past unnoticed. The system designed to improve visibility actually reduces it through noise.

**Why it happens:**
The natural instinct when building "live feedback" is to show everything. Every task claimed, every commit made, every file created. This is useful for 1 worker. For 4+ workers, it's information overload. The human attention bottleneck means more information does not equal better awareness -- it often equals worse awareness.

Research on notification fatigue in monitoring systems shows that alert volumes exceeding 5-10 per minute cause operators to start ignoring all alerts. A 4-worker system easily generates 5+ events per minute during active execution.

**Consequences:**
- User misses critical notifications (blocked worker, error, checkpoint requiring approval)
- User disables or ignores the feedback system entirely, losing all visibility
- User develops "notification blindness" and only checks status manually, defeating the purpose

**Prevention:**
1. **Tiered notification severity.** Define 3 tiers:
   - **Critical** (always shown, with sound/flash): worker error, checkpoint requiring user input, phase dependency failure
   - **Important** (shown, no special emphasis): phase started, phase completed, worker spawned/terminated
   - **Info** (suppressed by default, available on demand): task claimed, task completed, commit made
2. **Aggregated status display.** Instead of streaming individual events, maintain a persistent status table that updates in place:
   ```
   Phase 3 [API]     ====>-------  Plan 03-02/05  Worker: green
   Phase 4 [Web]     ===========> Complete        Worker: yellow
   Phase 5 [Mobile]  BLOCKED      Waiting: Ph 3   Worker: blue
   ```
   This gives at-a-glance status without scrolling noise.
3. **Rate limiting on info-level messages.** Batch info-level events and display a summary every 30 seconds: "Worker green: 2 tasks completed, 1 commit" instead of 3 separate messages.
4. **Interrupt-only mode.** Allow users to suppress all output except critical notifications. Workers continue working silently; the orchestrator only speaks up when something needs human attention.

**Detection:**
- User says "can you make it quieter"
- User stops looking at the orchestrator terminal and only checks `/mow:progress` manually
- Critical notifications (errors, checkpoints) are missed and cause delays

**Phase to address:** Live feedback implementation phase. The tiered notification design must be part of the initial implementation, not added retroactively after users complain.

**Confidence:** HIGH -- notification fatigue is extensively documented in monitoring UX literature.

---

### Pitfall 8: Terminal Color Collisions and Escape Code Incompatibility

**What goes wrong:**
The color-coded terminal badges use ANSI background escape codes (`\033[41m` for red, `\033[42m` for green, etc.). Two failure modes:

1. **Color collision:** The user's terminal theme uses a dark green background. Worker badge green (`\033[42m`) is invisible against it. Or the user has a light terminal theme where bright yellow text on a yellow badge is unreadable. The "clearly differentiated" colors become indistinguishable.

2. **Escape code incompatibility:** The user runs Claude Code inside VS Code's integrated terminal, tmux, or a non-standard terminal emulator. Some terminals strip or misinterpret escape codes. tmux requires specific `TERM` configuration (`tmux-256color`) to pass through escape codes correctly. If `TERM` is wrong, badges appear as garbled text: `^[[42m[Phase 3]^[[0m` instead of a colored badge.

**Why it happens:**
ANSI escape codes are not fully standardized. While basic color codes (30-37 for foreground, 40-47 for background) are widely supported, behavior varies across terminal emulators, multiplexers, and SSH sessions. The color palette is terminal-theme-dependent: "green" in one theme is dark forest green; in another, it's neon lime. Mowism cannot know the user's terminal configuration at runtime.

CachyOS with KDE Plasma uses Konsole by default, which has excellent ANSI support. But Mowism's README says it supports Claude Code generally, not just on CachyOS. Users on macOS Terminal.app, Windows Terminal, VS Code terminal, and various Linux terminal emulators will have different rendering.

**Consequences:**
- Users cannot distinguish between workers visually, negating the purpose of color-coding
- Garbled escape codes clutter the terminal and look broken
- Users on unsupported terminals lose trust in the tool's quality

**Prevention:**
1. **Use 256-color or 24-bit RGB colors, not basic ANSI.** Basic ANSI colors (40-47) are theme-dependent. 24-bit RGB (`\033[48;2;R;G;Bm`) specifies exact colors that are independent of the theme. Most modern terminals (Konsole, iTerm2, Kitty, Windows Terminal, Ghostty) support 24-bit color. Fall back to basic ANSI only if `$COLORTERM` is not `truecolor` or `24bit`.
2. **Include text labels, not just colors.** Every badge should include a text identifier alongside the color: `[W1: Phase 3 API]` not just a colored block. If colors fail, the text label still provides identification.
3. **Test escape code support at startup.** Check `$TERM` and `$COLORTERM` environment variables. If the terminal does not support 256-color or 24-bit, disable color badges and use text-only labels. Print a warning: "Terminal does not support color badges. Using text labels."
4. **Avoid tmux escape code pitfalls.** If running inside tmux (`$TMUX` is set), ensure passthrough escape codes are wrapped in tmux's DCS passthrough sequence: `\033Ptmux;\033\033[....\033\\`. Without this wrapper, tmux intercepts and potentially mangles the escape codes. Alternatively, use tmux's native pane styling API (`select-pane -P 'bg=green'`) instead of inline escape codes.
5. **Provide a `--no-color` flag.** Allow users to disable all ANSI escape codes. Mowism should respect `NO_COLOR` environment variable (the de facto standard: https://no-color.org/).

**Detection:**
- Users report "weird characters" in terminal output
- Color badges are invisible or unreadable in screenshots from users
- Users on VS Code terminal see garbled output
- Bug reports from tmux users about broken formatting

**Phase to address:** Distributed input routing phase (color-coded terminals). Color support detection should be built into the first iteration.

**Confidence:** HIGH -- ANSI compatibility issues are well-documented. The jvns.ca article on escape code standards (2025) confirms ongoing cross-terminal inconsistencies.

---

### Pitfall 9: Over-Engineering Coordination That Adds Latency Without Value

**What goes wrong:**
The team builds: a heartbeat protocol, a message sequencing system, a DAG validator, a state reconciliation agent, a notification tier system, an escape code detection layer. Each addition is individually justified. Together, they add 5-10 seconds of overhead per phase transition, 20+ seconds to spawn a coordinated team, and the orchestrator spends more context tokens on coordination mechanics than on actual project coordination. The parallel execution is slower than v1.0's sequential execution because coordination overhead exceeds the parallelism benefit.

**Why it happens:**
Each pitfall in this document recommends a prevention mechanism. Implementing ALL of them simultaneously creates a coordination system that is more complex than the work it coordinates. This is the "second system effect" applied to multi-agent orchestration: the v1.0 system was simple and worked; the v1.1 system tries to solve every possible problem and becomes unusable.

The research paper "Why Do Multi-Agent LLM Systems Fail?" (MAST, 2025) found that 41.77% of failures were due to system design issues -- meaning the coordination architecture itself was the problem, not the individual agents.

**Consequences:**
- Parallel execution is slower than sequential because of coordination overhead
- The orchestrator's prompt becomes so laden with coordination instructions that it loses focus on the actual project
- Debugging coordination failures becomes harder than debugging the original sequential system
- Users disable parallelism because "it's slower and more complex"

**Prevention:**
1. **Start with the simplest coordination that could work.** Phase 1: single-writer state (orchestrator only writes STATE.md), workers report via messages, no heartbeat, no DAG, no color codes. Just parallel execution with message-based status. This alone delivers 70% of the value.
2. **Measure before adding coordination.** Before adding heartbeats, measure how often workers actually crash. If the answer is "rarely," heartbeats are overhead without value. Add mechanisms only when failure modes are observed, not when they are theoretically possible.
3. **Budget coordination tokens.** The orchestrator's prompt should spend <20% of its tokens on coordination mechanics. If the coordination instructions exceed the project-specific instructions, the system is over-engineered.
4. **Set a latency budget.** Team spawn should take <30 seconds. Phase transitions should take <10 seconds. If coordination adds more than 20% to wall-clock execution time vs. sequential, the overhead exceeds the value.
5. **Ship incrementally.** v1.1.0: parallel execution + single-writer state. v1.1.1: add DAG if users request it. v1.1.2: add color codes if users request them. Do not ship everything at once.

**Detection:**
- Parallel execution wall-clock time exceeds sequential execution time
- Orchestrator context is >50% coordination mechanics
- Users consistently choose sequential mode over parallel mode
- Coordination code is larger than the feature code it coordinates

**Phase to address:** All phases. This is a cross-cutting concern. Each phase should ask: "Does this coordination mechanism pay for itself in reduced failures?"

**Confidence:** HIGH -- over-engineering is the most common pitfall in multi-agent systems, per both the MAST research and Anthropic's own engineering blog on their multi-agent research system.

---

### Pitfall 10: Race Condition in Worktree Claim Table

**What goes wrong:**
Two orchestrator processes (or a restarted orchestrator plus an old worker) both try to claim Phase 3. The claim function in mow-tools.cjs (line 5246) reads the worktree assignment table from STATE.md, checks for conflicts, and writes the updated table back. Between the read and the write, another process can read the same table, see no conflict, and write its own claim. Both processes successfully claim Phase 3. Two workers begin executing the same phase in different worktrees.

**Why it happens:**
The `worktreeClaim` function in mow-tools.cjs is not atomic. It performs: (1) read STATE.md, (2) parse worktree table, (3) check for conflicts, (4) write updated table, (5) git commit. Steps 1-3 are the "check" and steps 4-5 are the "use" -- this is a classic TOCTOU (time-of-check-to-time-of-use) race condition.

In v1.0, this race was unlikely because only one orchestrator existed and it claimed phases sequentially. In v1.1, multiple orchestrators or a restarted orchestrator plus workers may invoke `worktree claim` concurrently.

**Consequences:**
- Two workers execute the same phase, producing duplicate commits and conflicting changes
- At merge time, both worktrees' branches conflict on every file the phase touched
- Wasted tokens and time (one worker's work is completely thrown away)

**Prevention:**
1. **File-based locking.** Before reading the claim table, acquire an advisory lock on a lock file (`.planning/.state.lock`). Release after the git commit. Use `flock` on Linux. This serializes all claim operations.
2. **Git-based locking.** Use `git lock` or a pre-commit check that verifies the worktree table hasn't changed since the claim function read it. If it has, abort and retry.
3. **Claim via orchestrator only.** Workers do not claim phases directly. They request a claim from the orchestrator (via message), and the orchestrator serializes claim operations. This centralizes the concurrency control.
4. **Atomic claim operation.** Rewrite `worktreeClaim` to use an atomic write pattern: write to a temp file, verify contents, then `mv` (which is atomic on POSIX filesystems) to replace STATE.md. Combined with `flock`, this prevents interleaving.

**Detection:**
- Two entries in the worktree table with the same phase number but different worktree paths
- `worktree-status` shows duplicate claims
- Two workers report progress on the same phase simultaneously

**Phase to address:** State coherence architecture phase. The claim function must be made concurrency-safe before parallel phase execution is enabled.

**Confidence:** HIGH -- verified by reading mow-tools.cjs source. The function has no locking mechanism.

---

## Minor Pitfalls

Issues that cause friction but are recoverable with low effort.

---

### Pitfall 11: Agent Teams Task List vs. Mowism Task List Confusion

**What goes wrong:**
Agent Teams has a built-in task list (TaskCreate, TaskUpdate, TaskList). Mowism has its own task tracking in `.planning/` files (plan files with SUMMARY.md completion markers). The orchestrator uses BOTH systems, and they drift apart. The Agent Teams task list shows 3 tasks complete; `.planning/` shows 2 tasks complete (because a worker completed a task but didn't create SUMMARY.md). Or vice versa: `.planning/` shows complete but the AT task wasn't updated.

**Prevention:**
1. **Designate one as canonical.** `.planning/` files are the source of truth (they persist across sessions). Agent Teams task list is a coordination convenience (it's ephemeral). Workers MUST create SUMMARY.md (the v1.0 contract) regardless of Agent Teams task status.
2. **Reconcile periodically.** The orchestrator cross-references AT task status with `.planning/` file status every wave transition. Discrepancies are logged and the `.planning/` state takes precedence.
3. **Do not query AT task list for completion decisions.** Use SUMMARY.md existence checks (already the v1.0 pattern) for determining plan completion. Use AT task list only for real-time coordination (which workers are active, what's blocked).

**Phase to address:** State coherence architecture.

**Confidence:** HIGH -- dual source-of-truth is a well-known anti-pattern.

---

### Pitfall 12: Worktree Disk Space Explosion Under Parallelism

**What goes wrong:**
Each git worktree creates a full working copy of the repository. With 4 parallel phase workers, each in its own worktree, a 2GB project becomes 8GB+. Add `node_modules` per worktree (not shared) and build artifacts, and disk usage can reach 20-30GB for a medium project. The user's development machine runs out of space mid-execution, causing cryptic failures.

**Prevention:**
1. **Warn before spawning.** Check available disk space before creating worktrees. Estimate: `repo_size * num_workers * 2` (for dependencies and artifacts). Warn if available space is below threshold.
2. **Clean up aggressively.** Release and prune worktrees immediately after phase completion, not at session end. The v1.0 `worktree release` command exists; v1.1 should auto-prune the worktree directory after release.
3. **Share node_modules.** Use `pnpm` or symlink `node_modules` from a shared location. Or instruct workers to skip dependency installation if the phase doesn't modify dependencies.
4. **Cap concurrent worktrees.** Enforce a maximum (3-4) regardless of how many phases could theoretically run in parallel.

**Phase to address:** Phase-level parallelism implementation.

**Confidence:** HIGH -- documented in multiple git worktree experience reports.

---

### Pitfall 13: Git Merge Conflicts in Non-.planning/ Files Across Parallel Phases

**What goes wrong:**
Phase 3 (API) and Phase 4 (Web frontend) both modify `package.json` to add their dependencies. Phase 3 adds `express`; Phase 4 adds `vite`. Both modifications are on different lines, but `package.json` is a structured file -- git's line-based merge may produce invalid JSON if both changes are in the `dependencies` object and the diff context overlaps.

Similarly, both phases may modify shared configuration files (`tsconfig.json`, `.env.example`, `docker-compose.yml`), shared entry points (`src/index.ts`), or shared test configuration.

**Prevention:**
1. **Identify shared files during roadmap creation.** The roadmapper should flag files that multiple phases will modify. These shared files should be modified in a single phase, with other phases adding their changes via a dependency.
2. **Use file ownership in the dependency graph.** Each phase declares which files it will create or modify. If two phases declare the same file, add a dependency edge between them (the second phase depends on the first).
3. **Merge frequently.** Instead of merging all worktrees at the end, merge completed phases back to main immediately. This ensures later phases start from an up-to-date base.
4. **Automated merge conflict detection.** Before starting parallel phases, do a dry-run: check if the phases' expected file modifications overlap. If they do, warn the user and suggest sequencing those phases.

**Phase to address:** Phase-level parallelism implementation. File ownership analysis should be part of the DAG construction, not an afterthought.

**Confidence:** MEDIUM -- the severity depends on project structure. Well-decomposed projects with clear module boundaries rarely have this problem. Monolithic projects with shared entry points always have it.

---

### Pitfall 14: Background Mode Workers Cannot Receive User Input

**What goes wrong:**
Workers spawned with `run_in_background: true` are invisible to the user (confirmed in AGENT-TEAMS-API-RUNTIME.md Q6). If such a worker hits a Claude Code permission prompt or a checkpoint requiring user input, it blocks silently. The orchestrator may receive an idle notification but cannot relay the specific prompt. The distributed input routing design (user switches to worker terminal) is impossible because there IS no terminal.

**Why it happens:**
The v1.1 design assumes workers run in tmux panes or in-process mode where the user can interact with them. But the `execute-phase` workflow currently spawns workers with `run_in_background: true` (line 202 in execute-phase.md). This is correct for v1.0 (workers are autonomous executors that don't need input). For v1.1 (distributed input routing), background mode is incompatible with the UX design.

**Prevention:**
1. **Spawn workers in tmux mode for interactive phases.** If the phase may require user input (checkpoints, permission prompts), spawn workers in tmux panes, not background mode. Use background mode only for fully autonomous workers with pre-approved tool permissions.
2. **Pre-approve common tools.** Configure `~/.claude/settings.json` with generous `allow` rules for workers: `Bash(*)`, `Read(*)`, `Write(*)`. This reduces the frequency of permission prompts. Workers should only hit prompts for genuinely unusual operations.
3. **If background mode is required,** workers must be instructed to skip operations requiring permission rather than blocking. They report "skipped: needs permission for X" via message, and the orchestrator queues these for the user to approve later (or re-runs them in an interactive session).
4. **Mode selection at spawn time.** The orchestrator chooses worker mode based on phase characteristics: autonomous phases (no checkpoints) use background mode, interactive phases (with checkpoints) use tmux or in-process mode.

**Phase to address:** Distributed input routing phase. Mode selection logic must be designed before the input routing UX.

**Confidence:** HIGH -- background mode invisibility is VERIFIED in the runtime test.

---

## Phase-Specific Warnings

Mapping pitfalls to the likely v1.1 implementation phases, with the most relevant pitfalls per phase.

| Phase Topic | Likely Pitfalls | Severity | Mitigation Strategy |
|-------------|----------------|----------|---------------------|
| State coherence architecture | Pitfall 1 (lost updates), 5 (.planning/ copies), 10 (claim races), 11 (dual task lists) | CRITICAL | Single-writer pattern, file locking, distributed state files |
| Phase-level parallelism (DAG) | Pitfall 3 (cycles/phantoms), 4 (orphaned workers), 12 (disk space), 13 (merge conflicts) | CRITICAL | DAG validation, heartbeats, file ownership analysis |
| Live agent feedback | Pitfall 2 (context exhaustion), 6 (message ordering), 7 (notification fatigue) | MODERATE | Message budget, disk-first state, tiered notifications |
| Distributed input routing | Pitfall 8 (color incompatibility), 14 (background mode), 7 (notification fatigue) | MODERATE | Color detection, mode selection, interrupt-only mode |
| All phases (cross-cutting) | Pitfall 9 (over-engineering) | MODERATE | Ship incrementally, measure before adding coordination |
| README overhaul | None specific to pitfalls | LOW | Document the pitfall mitigations as user-facing guidance |

## What Breaks When Moving From Sequential to Parallel

A synthesis of the pitfalls above, framed as "this worked fine in v1.0 but breaks in v1.1."

| v1.0 Assumption | Why It Worked | What Breaks in v1.1 |
|-----------------|---------------|---------------------|
| STATE.md is written by one agent at a time | Sequential execution: only one phase runs, only one agent modifies STATE.md | Multiple phase workers modify STATE.md concurrently -- lost updates (Pitfall 1) |
| `.planning/` is copied to worktrees on creation and is "close enough" | One worktree at a time: the copy is up-to-date when the phase starts | Multiple worktrees created concurrently, each gets a different snapshot (Pitfall 5) |
| `worktree claim` is safe because only one process calls it | Sequential: the orchestrator claims one phase, finishes it, claims the next | Multiple claim calls interleave without locking (Pitfall 10) |
| Workers complete within a single session | One phase finishes before the next starts; session timeout is unlikely during a single phase | Parallel phases may run for 30+ minutes total; worker crashes during long runs (Pitfall 4) |
| The orchestrator remembers everything | One phase at a time: the orchestrator's context window easily holds the state for one phase | N parallel phases flood the orchestrator's context with messages (Pitfall 2) |
| Plan-level dependencies are within one phase | Waves within a phase are well-defined and validated | Phase-level dependencies across the DAG can have cycles, phantoms, or missing edges (Pitfall 3) |
| Terminal output is from one agent | Readable output: one agent prints its progress | N agents printing simultaneously creates noise (Pitfall 7) |
| Workers are autonomous (no user input needed) | Background mode works fine for autonomous executors | Distributed input routing requires interactive mode, but workers are still spawned in background (Pitfall 14) |
| `SUMMARY.md` existence is the single completion signal | One source of truth: did the plan create its summary? | Two sources of truth: AT task list AND SUMMARY.md, and they can disagree (Pitfall 11) |
| Disk space for one worktree is manageable | One worktree = 1x repo size | N worktrees + dependencies = Nx repo size, potentially exhausting disk (Pitfall 12) |

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Lost updates in STATE.md | LOW | Re-read STATE.md, manually reconcile with `git log --all -- .planning/STATE.md`. Reconstruct correct state from individual phase completion evidence (SUMMARY.md files, git commits). |
| Context window exhaustion | LOW | The orchestrator can recover by re-reading STATE.md and disk-based status files. Context compression loses history but the disk state is current. |
| DAG cycle | LOW | Run `mow-tools.cjs roadmap validate-dag` to identify the cycle. Remove the weakest dependency edge. Re-run parallel execution. |
| Worker crash with orphaned claim | LOW | `mow-tools.cjs worktree clean` to release stale claims. Re-run `/mow:execute-phase` for the affected phase (resumption logic skips completed plans). |
| Divergent .planning/ copies | MEDIUM | After merge, run a state reconciliation script that cross-references all phase completion evidence and rebuilds a canonical STATE.md. |
| Message ordering confusion | LOW | Ignore message order; use timestamps and sequence numbers. Re-read disk state for current truth. |
| Notification fatigue | LOW | Switch to interrupt-only mode. Check `/mow:progress` manually. Adjust notification tiers in config. |
| Terminal color issues | LOW | Set `NO_COLOR=1` to disable colors. Use text labels for identification. |
| Over-engineering | HIGH | If coordination overhead exceeds value, strip back to the simplest version: single-writer state, message-based reporting, no DAG, no heartbeats. Rebuild incrementally. |
| Claim table race condition | LOW | Delete duplicate claim. Re-claim with locking enabled. Stop the duplicate worker. |
| Dual task list drift | LOW | Cross-reference AT task list with SUMMARY.md files. `.planning/` is canonical; update AT task list to match. |
| Disk space exhaustion | MEDIUM | Prune completed worktrees immediately. Delete `node_modules` in inactive worktrees. Move to `pnpm` for shared dependencies. |
| Non-.planning/ merge conflicts | MEDIUM | Resolve merge conflicts manually. For future runs, add file ownership to the DAG to prevent overlapping modifications. |
| Background mode input blocking | LOW | Kill the background worker. Re-spawn in tmux or in-process mode. Answer the pending prompt in the new interactive session. |

## Sources

**Research Papers:**
- [Why Do Multi-Agent LLM Systems Fail? (MAST)](https://arxiv.org/abs/2503.13657) -- 1642 traces across 7 frameworks, 14-18 failure modes, 41-87% failure rates. HIGH confidence.

**Official Documentation:**
- [Claude Code Agent Teams docs](https://code.claude.com/docs/en/agent-teams) -- Agent Teams architecture, limitations, best practices. HIGH confidence.

**Codebase Analysis:**
- `mow-tools.cjs` lines 5246-5296 (worktree claim, no locking) -- PRIMARY source for Pitfall 10. HIGH confidence.
- `mow-tools.cjs` lines 247-261 (WT_PLANNING_COPY_HOOK) -- PRIMARY source for Pitfall 5. HIGH confidence.
- `mowism/workflows/execute-phase.md` lines 160-210 (worker spawning, background mode) -- PRIMARY source for Pitfall 14. HIGH confidence.
- `.planning/research/AGENT-TEAMS-API.md` (context exhaustion analysis) -- PRIMARY source for Pitfall 2. HIGH confidence.
- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` (background mode verification) -- PRIMARY source for Pitfall 14. HIGH confidence.

**Industry Sources:**
- [Context Window Management Strategies (Maxim)](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) -- Compression strategies, hierarchical summarization. MEDIUM confidence.
- [Context Degradation Syndrome (James Howard)](https://jameshoward.us/2024/11/26/context-degradation-syndrome-when-large-language-models-lose-the-plot) -- Performance degradation as context fills. MEDIUM confidence.
- [Agent Context Optimization (Acon)](https://arxiv.org/html/2510.00615v1) -- 26-54% memory reduction while maintaining performance. MEDIUM confidence.
- [Git Worktrees for Parallel AI Coding (Upsun)](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/) -- Worktree disk space, merge conflicts. MEDIUM confidence.
- [Building a C Compiler with Parallel Claudes (Anthropic)](https://www.anthropic.com/engineering/building-c-compiler) -- Real-world 16-agent stress test. HIGH confidence.
- [ANSI Escape Code Standards (Julia Evans, 2025)](https://jvns.ca/blog/2025/03/07/escape-code-standards/) -- Terminal compatibility issues. MEDIUM confidence.
- [Design Guidelines for Better Notifications UX (Smashing Magazine)](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/) -- Notification fatigue research. MEDIUM confidence.
- [Multi-Agent System Reliability (Maxim)](https://www.getmaxim.ai/articles/multi-agent-system-reliability-failure-patterns-root-causes-and-production-validation-strategies/) -- Failure patterns and validation. MEDIUM confidence.
- [AI Agent Orchestration Patterns (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) -- Orchestration architecture patterns. MEDIUM confidence.
- [CrewAI vs LangGraph vs AutoGen (DataCamp)](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen) -- Framework comparison for state management patterns. MEDIUM confidence.

---
*Pitfalls research for: Mowism v1.1 multi-agent coordination features*
*Researched: 2026-02-20*
*Supersedes: v1.0 PITFALLS.md (2026-02-19)*
